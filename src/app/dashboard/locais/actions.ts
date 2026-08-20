'use server'

import { revalidatePath } from 'next/cache'

import { matchFareGroup } from '@/lib/fares'
import { parseAmount } from '@/lib/format'
import type { FormState } from '@/lib/form-state'
import { createClient } from '@/lib/supabase/server'
import { ordenaTrechos, outboundOf } from '@/lib/trips'
import { MAX_LENGTHS, normalizeText, tooLong } from '@/lib/validation'
import { HOME_CLIENT_LABEL, isCardType, isTransportType, type PlaceLegInsert } from '@/types'

/** Trecho como o formulário manda (JSON num campo escondido). */
type RawLeg = {
  origin?: unknown
  destination?: unknown
  client?: unknown
  transport?: unknown
  card?: unknown
  line?: unknown
  value?: unknown
  fareGroupId?: unknown
}

type ParsedLeg = Omit<PlaceLegInsert, 'place_id' | 'user_id'>

/** Lê e valida os trechos da ida. Devolve string com a mensagem se algo estiver errado. */
function parseLegs(raw: string): ParsedLeg[] | string {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return 'Não foi possível ler os trechos. Recarregue a página e tente de novo.'
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return 'Cadastre pelo menos um trecho de ida.'
  }

  const legs: ParsedLeg[] = []

  for (const [index, item] of (parsed as RawLeg[]).entries()) {
    const position = index + 1
    const origin = normalizeText(String(item.origin ?? ''))
    const destination = normalizeText(String(item.destination ?? ''))
    const client = normalizeText(String(item.client ?? ''))
    const line = normalizeText(String(item.line ?? ''))
    const transport = String(item.transport ?? '')
    const card = String(item.card ?? '')

    if (!origin) return `Trecho ${position}: informe o bairro de origem.`
    if (!destination) return `Trecho ${position}: informe o bairro de destino.`

    const limiteOrigem = tooLong(origin, MAX_LENGTHS.bairro, `Trecho ${position}: o bairro`)
    if (limiteOrigem) return limiteOrigem

    const limiteDestino = tooLong(destination, MAX_LENGTHS.bairro, `Trecho ${position}: o bairro`)
    if (limiteDestino) return limiteDestino
    if (!isTransportType(transport)) return `Trecho ${position}: escolha o transporte.`
    if (!isCardType(card)) return `Trecho ${position}: escolha o cartão.`

    const value = parseAmount(String(item.value ?? ''))
    if (value === null) return `Trecho ${position}: valor inválido. Use vírgula nos centavos: 4,70.`
    if (value === 0) return `Trecho ${position}: o valor precisa ser maior que zero.`

    const fareGroupId = item.fareGroupId ? String(item.fareGroupId) : null

    legs.push({
      position,
      origin,
      destination,
      client: client || null,
      transport,
      card,
      line: line || null,
      value,
      fare_group_id: fareGroupId,
    })
  }

  return legs
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function createPlace(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeText(formData.get('name'))
  if (!name) return { fieldErrors: { name: 'Dê um nome ao local (ex: HCNI).' } }

  const limiteNome = tooLong(name, MAX_LENGTHS.local, 'O nome do local')
  if (limiteNome) return { fieldErrors: { name: limiteNome } }

  const legs = parseLegs(String(formData.get('legs') ?? ''))
  if (typeof legs === 'string') return { error: legs }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert({ user_id: user.id, name })
    .select('id')
    .single()

  if (placeError || !place) {
    const duplicated = placeError?.code === '23505'
    return duplicated
      ? { fieldErrors: { name: `Você já tem um local chamado ${name}.` } }
      : { error: 'Não foi possível salvar o local. Tente de novo.' }
  }

  const { error: legsError } = await supabase
    .from('place_legs')
    .insert(legs.map((leg) => ({ ...leg, place_id: place.id, user_id: user.id })))

  if (legsError) {
    // Local sem trecho não serve para nada; desfaz para não deixar lixo.
    await supabase.from('places').delete().eq('id', place.id).eq('user_id', user.id)
    return { error: 'Não foi possível salvar os trechos. Nada foi criado.' }
  }

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')
  return { success: `${name} cadastrado.` }
}

/**
 * Salva como local um dia que já foi lançado.
 *
 * O caminho mais curto entre "digitei meu dia" e "lanço em dois cliques": em
 * vez de redigitar a rota no cadastro, aponta-se para um dia que já está
 * certo. Só a ida é guardada — a volta continua sendo derivada no lançamento,
 * que é a regra do espelho.
 *
 * Os trechos são lidos do banco, não do formulário: o que vale é o que está
 * gravado, e assim a tela não tem como mandar um trecho que não existe.
 */
export async function savePlaceFromDay(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = normalizeText(formData.get('name'))
  if (!name) return { fieldErrors: { name: 'Dê um nome ao local (ex: Tecnoarte).' } }

  const limiteNome = tooLong(name, MAX_LENGTHS.local, 'O nome do local')
  if (limiteNome) return { fieldErrors: { name: limiteNome } }

  const date = String(formData.get('date') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Dia inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)

  if (!trips || trips.length === 0) return { error: 'Esse dia não tem trechos.' }

  const ida = outboundOf(ordenaTrechos(trips))

  // Passagens ativas para o local acompanhar reajuste em vez de congelar o
  // valor que o trecho copiou no dia do lançamento.
  const { data: fares } = await supabase
    .from('fare_prices')
    .select('group_id, transport, card, value')
    .eq('active', true)
    .eq('user_id', user.id)

  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert({ user_id: user.id, name })
    .select('id')
    .single()

  if (placeError || !place) {
    const duplicated = placeError?.code === '23505'
    return duplicated
      ? { fieldErrors: { name: `Você já tem um local chamado ${name}.` } }
      : { error: 'Não foi possível salvar o local. Tente de novo.' }
  }

  const legs: PlaceLegInsert[] = ida.map((trip, position) => ({
    place_id: place.id,
    user_id: user.id,
    position,
    origin: trip.origin,
    destination: trip.destination,
    // 'Residência' é o cliente da volta; num local ele não diz nada, e vazio
    // faz o lançamento cair no nome do próprio local.
    client: trip.client === HOME_CLIENT_LABEL ? null : trip.client,
    transport: trip.transport,
    line: trip.line,
    card: trip.card,
    fare_group_id: matchFareGroup(fares ?? [], {
      transport: trip.transport,
      card: trip.card,
      value: Number(trip.value),
    }),
    value: Number(trip.value),
  }))

  const { error: legsError } = await supabase.from('place_legs').insert(legs)

  if (legsError) {
    await supabase.from('places').delete().eq('id', place.id).eq('user_id', user.id)
    return { error: 'Não foi possível salvar os trechos. Nada foi criado.' }
  }

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')

  return {
    success: `${name} salvo com ${legs.length} ${
      legs.length === 1 ? 'trecho de ida' : 'trechos de ida'
    }. A volta continua sendo montada na hora do lançamento.`,
  }
}

export async function updatePlace(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  const name = normalizeText(formData.get('name'))

  if (!id) return { error: 'Local não encontrado.' }
  if (!name) return { fieldErrors: { name: 'Dê um nome ao local.' } }

  const legs = parseLegs(String(formData.get('legs') ?? ''))
  if (typeof legs === 'string') return { error: legs }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  // Confere a posse antes de mexer. A RLS já impede alterar local alheio, mas
  // sem esta checagem um id de outra pessoa passaria batido pelo update (zero
  // linhas, sem erro) e os trechos novos seriam inseridos apontando para lá.
  const { data: existente } = await supabase
    .from('places')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existente) return { error: 'Local não encontrado.' }

  const { error: nameError } = await supabase
    .from('places')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id)

  if (nameError) {
    const duplicated = nameError.code === '23505'
    return duplicated
      ? { fieldErrors: { name: `Você já tem um local chamado ${name}.` } }
      : { error: 'Não foi possível salvar o local.' }
  }

  // Trocar os trechos por inteiro é mais simples e seguro do que casar um a um
  // — os trechos do local não são histórico, são um modelo.
  await supabase.from('place_legs').delete().eq('place_id', id).eq('user_id', user.id)

  const { error: legsError } = await supabase
    .from('place_legs')
    .insert(legs.map((leg) => ({ ...leg, place_id: id, user_id: user.id })))

  if (legsError) {
    return { error: 'O nome foi salvo, mas os trechos não. Revise e salve de novo.' }
  }

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')
  return { success: `${name} atualizado.` }
}

/** Exclui o local e seus trechos. Não mexe no que já foi lançado. */
export async function deletePlace(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Local não encontrado.' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase.from('places').delete().eq('id', id).eq('user_id', user.id)

  if (error) return { error: 'Não foi possível excluir o local. Tente de novo.' }

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')
  return {}
}
