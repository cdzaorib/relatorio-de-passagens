'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FormState } from '@/lib/form-state'
import { createClient } from '@/lib/supabase/server'
import { buildDayLegs, legsToTrips, mirrorLegs, type LegDraft } from '@/lib/trips'
import { normalizeText } from '@/lib/validation'
import { isCardType, isTransportType } from '@/types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type TripFields = LegDraft & { date: string }

/** Lê e valida os campos do formulário de trecho. */
function readTripFields(formData: FormData): TripFields | string {
  const date = String(formData.get('date') ?? '')
  const origin = normalizeText(formData.get('origin'))
  const destination = normalizeText(formData.get('destination'))
  const client = normalizeText(formData.get('client'))
  const transport = String(formData.get('transport') ?? '')
  const card = String(formData.get('card') ?? '')
  const line = normalizeText(formData.get('line'))
  const rawValue = String(formData.get('value') ?? '')

  if (!DATE_PATTERN.test(date)) return 'Escolha a data do trecho.'
  if (!origin) return 'Informe o bairro de origem.'
  if (!destination) return 'Informe o bairro de destino.'
  if (!client) return 'Informe o cliente, a empresa ou "Residência".'
  if (!isTransportType(transport)) return 'Escolha o meio de transporte.'
  if (!isCardType(card)) return 'Escolha o cartão.'

  const value = parseAmount(rawValue)
  if (value === null) return 'Valor inválido. Escreva assim: 4,70.'
  if (value === 0) return 'O valor precisa ser maior que zero.'

  return { date, origin, destination, client, transport, card, line: line || null, value }
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
  if (typeof fields === 'string') return { error: fields }

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
  if (typeof fields === 'string') return { error: fields }

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

export async function deleteTrip(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { supabase, user } = await requireUser()
  if (!user) return

  await supabase.from('trips').delete().eq('id', id)

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')
}

// ---------------------------------------------------------------------------
// Lançar um dia inteiro a partir de um local salvo
// ---------------------------------------------------------------------------

export async function applyPlace(_prevState: FormState, formData: FormData): Promise<FormState> {
  const placeId = String(formData.get('place_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const includeReturn = formData.get('round_trip') === 'on'

  if (!placeId) return { error: 'Escolha um local.' }
  if (!DATE_PATTERN.test(date)) return { error: 'Escolha a data.' }

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
export async function deleteTripsOfDay(formData: FormData): Promise<void> {
  const date = String(formData.get('date') ?? '')
  if (!DATE_PATTERN.test(date)) return

  const { supabase, user } = await requireUser()
  if (!user) return

  await supabase.from('trips').delete().eq('date', date)

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard')
}
