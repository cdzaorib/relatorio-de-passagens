'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FieldErrors, FormState } from '@/lib/form-state'
import { descreveFalha, primeiraFalha } from '@/lib/query'
import { createClient } from '@/lib/supabase/server'
import { buildDayLegs, legsToTrips, mirrorLegs, type LegDraft } from '@/lib/trips'
import { MAX_LENGTHS, normalizeText, tooLong } from '@/lib/validation'
import { isCardType, isTransportType } from '@/types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type TripFields = LegDraft & { date: string }

/**
 * Lê e valida os campos do formulário de trecho.
 * Junta todos os problemas de uma vez: corrigir um campo por envio, como era
 * antes, é irritante em formulário deste tamanho.
 */
function readTripFields(formData: FormData): TripFields | FieldErrors {
  const date = String(formData.get('date') ?? '')
  const origin = normalizeText(formData.get('origin'))
  const destination = normalizeText(formData.get('destination'))
  const client = normalizeText(formData.get('client'))
  const transport = String(formData.get('transport') ?? '')
  const card = String(formData.get('card') ?? '')
  const line = normalizeText(formData.get('line'))
  const value = parseAmount(String(formData.get('value') ?? ''))

  const errors: FieldErrors = {}

  if (!DATE_PATTERN.test(date)) errors.date = 'Escolha a data do trecho.'

  if (!origin) errors.origin = 'Informe o bairro de origem.'
  else {
    const limite = tooLong(origin, MAX_LENGTHS.bairro, 'O bairro')
    if (limite) errors.origin = limite
  }

  if (!destination) errors.destination = 'Informe o bairro de destino.'
  else {
    const limite = tooLong(destination, MAX_LENGTHS.bairro, 'O bairro')
    if (limite) errors.destination = limite
  }

  if (!client) errors.client = 'Informe o cliente, a empresa ou "Residência".'
  else {
    const limite = tooLong(client, MAX_LENGTHS.cliente, 'O cliente')
    if (limite) errors.client = limite
  }

  const limiteLinha = tooLong(line, MAX_LENGTHS.linha, 'A linha')
  if (limiteLinha) errors.line = limiteLinha
  if (!isTransportType(transport)) errors.transport = 'Escolha o meio de transporte.'
  if (!isCardType(card)) errors.card = 'Escolha o cartão.'
  if (value === null) errors.value = 'Valor inválido. Use vírgula nos centavos: 4,70.'
  else if (value === 0) errors.value = 'O valor precisa ser maior que zero.'

  if (Object.keys(errors).length > 0) return errors

  return {
    date,
    origin,
    destination,
    client,
    transport: transport as TripFields['transport'],
    card: card as TripFields['card'],
    line: line || null,
    value: value as number,
  }
}

/** Distingue o retorno de erro do retorno com os campos prontos. */
function isFieldErrors(result: TripFields | FieldErrors): result is FieldErrors {
  return !('date' in result)
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// Lançar trecho (com volta opcional)
// ---------------------------------------------------------------------------

/** Um trecho como o formulário manda, antes de validar. */
type TrechoBruto = {
  origin?: unknown
  destination?: unknown
  client?: unknown
  transport?: unknown
  card?: unknown
  line?: unknown
  value?: unknown
}

/**
 * Lê a ida inteira de uma vez.
 *
 * Antes o formulário mandava um trecho só, e marcar "voltou" nele gerava uma
 * ida e volta fechada em si. Quem pega ônibus e depois barca lançava duas
 * vezes e o dia saía como duas viagens separadas — ia e voltava, ia e voltava
 * — em vez de uma ida com duas conduções e o espelho no fim.
 */
function readLegs(raw: string): LegDraft[] | FieldErrors {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return { legs: 'Não foi possível ler os trechos. Recarregue a página.' }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { legs: 'Informe ao menos um trecho.' }
  }

  const errors: FieldErrors = {}
  const legs: LegDraft[] = []

  ;(parsed as TrechoBruto[]).forEach((item, indice) => {
    const origin = normalizeText(String(item.origin ?? ''))
    const destination = normalizeText(String(item.destination ?? ''))
    const client = normalizeText(String(item.client ?? ''))
    const line = normalizeText(String(item.line ?? ''))
    const transport = String(item.transport ?? '')
    const card = String(item.card ?? '')
    const value = parseAmount(String(item.value ?? ''))

    const campo = (nome: string) => `${indice}.${nome}`

    if (!origin) errors[campo('origin')] = 'Informe o bairro de origem.'
    else {
      const limite = tooLong(origin, MAX_LENGTHS.bairro, 'O bairro')
      if (limite) errors[campo('origin')] = limite
    }

    if (!destination) errors[campo('destination')] = 'Informe o bairro de destino.'
    else {
      const limite = tooLong(destination, MAX_LENGTHS.bairro, 'O bairro')
      if (limite) errors[campo('destination')] = limite
    }

    if (!client) errors[campo('client')] = 'Informe o cliente, a empresa ou "Residência".'
    else {
      const limite = tooLong(client, MAX_LENGTHS.cliente, 'O cliente')
      if (limite) errors[campo('client')] = limite
    }

    if (!isTransportType(transport)) errors[campo('transport')] = 'Escolha o transporte.'
    if (!isCardType(card)) errors[campo('card')] = 'Escolha o cartão.'

    const limiteLinha = tooLong(line, MAX_LENGTHS.linha, 'A linha')
    if (limiteLinha) errors[campo('line')] = limiteLinha

    if (value === null) errors[campo('value')] = 'Valor inválido. Use vírgula: 4,70.'
    else if (value === 0) errors[campo('value')] = 'O valor precisa ser maior que zero.'

    if (isTransportType(transport) && isCardType(card) && value) {
      legs.push({ origin, destination, client, transport, card, line: line || null, value })
    }
  })

  return Object.keys(errors).length > 0 ? errors : legs
}

// ---------------------------------------------------------------------------
// Lançar o dia (a ida inteira, com a volta espelhada opcional)
// ---------------------------------------------------------------------------

/**
 * Grava os trechos do dia, sobrevivendo a um banco que ainda não migrou.
 *
 * O caminho normal é um insert só, com leg_order dizendo a posição de cada
 * trecho. Num banco sem essa coluna o PostgREST recusa o lote inteiro, e a
 * pessoa fica sem conseguir lançar nada — perder o dia de trabalho por causa
 * de um desempate é caro demais.
 *
 * Então a segunda tentativa grava um trecho de cada vez, sem a coluna. Cada
 * insert é uma transação própria, e now() devolve o horário da transação: os
 * created_at saem distintos e crescentes, que é exatamente a ordem do
 * lançamento. É mais lento e mais frágil, mas o dia entra certo enquanto a
 * migração não roda.
 */
async function gravaTrechos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trips: ReturnType<typeof legsToTrips>,
): Promise<{ error: { code: string } | null; semColuna: boolean }> {
  const { error } = await supabase.from('trips').insert(trips)
  if (!error) return { error: null, semColuna: false }

  if (!descreveFalha(error).schemaDesatualizado) return { error, semColuna: false }

  /*
   * Um insert por vez não é atômico: falhar no terceiro trecho deixaria meio
   * dia gravado, e meio dia é pior do que nenhum — a pessoa relançaria por
   * cima e pediria reembolso duplicado sem perceber. Guardamos os ids para
   * poder desfazer.
   */
  const gravados: string[] = []

  for (const trip of trips) {
    const { leg_order: _posicao, ...semLegOrder } = trip

    const { data, error: falha } = await supabase
      .from('trips')
      .insert(semLegOrder)
      .select('id')
      .single()

    if (falha) {
      if (gravados.length > 0) await supabase.from('trips').delete().in('id', gravados)
      return { error: falha, semColuna: false }
    }

    if (data) gravados.push(data.id)
  }

  return { error: null, semColuna: true }
}

const AVISO_SEM_COLUNA =
  ' O banco ainda não tem a coluna de ordem: rode supabase/migrations, senão a ' +
  'ida e a volta podem trocar de lugar no relatório.'

export async function createTrip(_prevState: FormState, formData: FormData): Promise<FormState> {
  const date = String(formData.get('date') ?? '')
  if (!DATE_PATTERN.test(date)) return { fieldErrors: { date: 'Escolha a data.' } }

  const legs = readLegs(String(formData.get('legs') ?? ''))
  if (!Array.isArray(legs)) return { fieldErrors: legs }

  const includeReturn = formData.get('round_trip') === 'on'
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const dayLegs = buildDayLegs(legs, includeReturn)

  const { count: jaExistiam } = await supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)

  const { error, semColuna } = await gravaTrechos(supabase, legsToTrips(dayLegs, user.id, date))

  if (error) {
    // "Tente de novo" só ajuda quando tentar de novo pode dar certo.
    return { error: primeiraFalha(['gravar trechos do dia', { error }])!.mensagem }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')

  const lancados = `${dayLegs.length} ${dayLegs.length === 1 ? 'trecho lançado' : 'trechos lançados'}.`

  const duplicidade = jaExistiam
    ? ` Atenção: este dia já tinha ${jaExistiam} ${
        jaExistiam === 1 ? 'trecho' : 'trechos'
      } antes — confira se não duplicou.`
    : ''

  return { success: `${lancados}${duplicidade}${semColuna ? AVISO_SEM_COLUNA : ''}` }
}

// ---------------------------------------------------------------------------
// Editar e excluir
// ---------------------------------------------------------------------------

export async function updateTrip(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Trecho não encontrado.' }

  const fields = readTripFields(formData)
  if (isFieldErrors(fields)) return { fieldErrors: fields }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase
    .from('trips')
    .update({
      date: fields.date,
      origin: fields.origin,
      destination: fields.destination,
      client: fields.client,
      transport: fields.transport,
      line: fields.line,
      card: fields.card,
      value: fields.value,
    })
    .eq('id', id)

  if (error) {
    return { error: primeiraFalha(['editar trecho', { error }])!.mensagem }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')
  return { success: 'Trecho atualizado.' }
}

export async function deleteTrip(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Trecho não encontrado.' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase.from('trips').delete().eq('id', id)

  if (error) return { error: 'Não foi possível excluir. Tente de novo.' }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')
  return {}
}

// ---------------------------------------------------------------------------
// Lançar um dia inteiro a partir de um local salvo
// ---------------------------------------------------------------------------

export async function applyPlace(_prevState: FormState, formData: FormData): Promise<FormState> {
  const placeId = String(formData.get('place_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const includeReturn = formData.get('round_trip') === 'on'

  if (!placeId) return { fieldErrors: { place_id: 'Escolha um local.' } }
  if (!DATE_PATTERN.test(date)) return { fieldErrors: { date: 'Escolha a data.' } }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { data: place } = await supabase
    .from('places')
    .select('id, name')
    .eq('id', placeId)
    .maybeSingle()

  if (!place) return { error: 'Local não encontrado.' }

  const { data: legs } = await supabase
    .from('place_legs')
    .select('*')
    .eq('place_id', placeId)
    .order('position', { ascending: true })

  if (!legs || legs.length === 0) {
    return { error: 'Esse local ainda não tem trechos cadastrados.' }
  }

  // O valor vem sempre do preço que está valendo hoje; o guardado no trecho
  // do local é só reserva, para o caso de a passagem ter sido arquivada.
  const groupIds = legs.map((leg) => leg.fare_group_id).filter((id): id is string => Boolean(id))

  const currentValueByGroup = new Map<string, number>()

  if (groupIds.length > 0) {
    const { data: fares } = await supabase
      .from('fare_prices')
      .select('group_id, value')
      .eq('active', true)
      .in('group_id', groupIds)

    for (const fare of fares ?? []) {
      currentValueByGroup.set(fare.group_id, Number(fare.value))
    }
  }

  const outbound: LegDraft[] = legs.map((leg) => ({
    origin: leg.origin,
    destination: leg.destination,
    client: leg.client?.trim() || place.name,
    transport: leg.transport,
    line: leg.line,
    card: leg.card,
    value:
      (leg.fare_group_id ? currentValueByGroup.get(leg.fare_group_id) : undefined) ??
      Number(leg.value),
  }))

  const dayLegs = includeReturn ? [...outbound, ...mirrorLegs(outbound)] : outbound

  // Quantos já existiam nesse dia: duplicar trecho vira reembolso a mais, e a
  // pessoa merece saber na hora, não no fechamento.
  const { count: jaExistiam } = await supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)

  const { error, semColuna } = await gravaTrechos(supabase, legsToTrips(dayLegs, user.id, date))

  if (error) {
    return { error: primeiraFalha(['lançar por local', { error }])!.mensagem }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')

  const lancados = `${place.name}: ${dayLegs.length} ${
    dayLegs.length === 1 ? 'trecho lançado' : 'trechos lançados'
  }.`

  const duplicidade = jaExistiam
    ? ` Atenção: este dia já tinha ${jaExistiam} ${
        jaExistiam === 1 ? 'trecho' : 'trechos'
      } antes — confira se não duplicou.`
    : ''

  return { success: `${lancados}${duplicidade}${semColuna ? AVISO_SEM_COLUNA : ''}` }
}

/** Apaga todos os trechos de um dia de uma vez. */
export async function deleteTripsOfDay(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const date = String(formData.get('date') ?? '')
  if (!DATE_PATTERN.test(date)) return { error: 'Data inválida.' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase.from('trips').delete().eq('date', date)

  if (error) return { error: 'Não foi possível excluir o dia. Tente de novo.' }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')
  return {}
}
