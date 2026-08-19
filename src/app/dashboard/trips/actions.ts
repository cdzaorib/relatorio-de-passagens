'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FieldErrors, FormState } from '@/lib/form-state'
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
  if (value === null) errors.value = 'Valor inválido. Escreva assim: 4,70.'
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

export async function createTrip(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = readTripFields(formData)
  if (isFieldErrors(fields)) return { fieldErrors: fields }

  const includeReturn = formData.get('round_trip') === 'on'
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { date, ...leg } = fields
  const legs = buildDayLegs([leg], includeReturn)

  const { error } = await supabase.from('trips').insert(legsToTrips(legs, user.id, date))

  if (error) {
    return { error: 'Não foi possível salvar o trecho. Tente de novo.' }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')

  return {
    success: includeReturn
      ? 'Ida e volta lançadas: 2 trechos.'
      : 'Trecho lançado.',
  }
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
    return { error: 'Não foi possível salvar a alteração.' }
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

  const { error } = await supabase.from('trips').insert(legsToTrips(dayLegs, user.id, date))

  if (error) {
    return { error: 'Não foi possível lançar o dia. Tente de novo.' }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')

  return {
    success: `${place.name}: ${dayLegs.length} ${dayLegs.length === 1 ? 'trecho lançado' : 'trechos lançados'}.`,
  }
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
