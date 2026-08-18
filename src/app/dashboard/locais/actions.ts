'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FormState } from '@/lib/form-state'
import { createClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/validation'
import { isCardType, isTransportType, type PlaceLegInsert } from '@/types'

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
    if (!isTransportType(transport)) return `Trecho ${position}: escolha o transporte.`
    if (!isCardType(card)) return `Trecho ${position}: escolha o cartão.`

    const value = parseAmount(String(item.value ?? ''))
    if (value === null) return `Trecho ${position}: valor inválido. Escreva assim: 4,70.`
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
  if (!name) return { error: 'Dê um nome ao local (ex: HCNI).' }

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
    return {
      error: duplicated
        ? `Você já tem um local chamado ${name}.`
        : 'Não foi possível salvar o local. Tente de novo.',
    }
  }

  const { error: legsError } = await supabase
    .from('place_legs')
    .insert(legs.map((leg) => ({ ...leg, place_id: place.id, user_id: user.id })))

  if (legsError) {
    // Local sem trecho não serve para nada; desfaz para não deixar lixo.
    await supabase.from('places').delete().eq('id', place.id)
    return { error: 'Não foi possível salvar os trechos. Nada foi criado.' }
  }

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')
  return { success: `${name} cadastrado.` }
}

export async function updatePlace(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  const name = normalizeText(formData.get('name'))

  if (!id) return { error: 'Local não encontrado.' }
  if (!name) return { error: 'Dê um nome ao local.' }

  const legs = parseLegs(String(formData.get('legs') ?? ''))
  if (typeof legs === 'string') return { error: legs }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error: nameError } = await supabase.from('places').update({ name }).eq('id', id)

  if (nameError) {
    const duplicated = nameError.code === '23505'
    return {
      error: duplicated
        ? `Você já tem um local chamado ${name}.`
        : 'Não foi possível salvar o local.',
    }
  }

  // Trocar os trechos por inteiro é mais simples e seguro do que casar um a um
  // — os trechos do local não são histórico, são um modelo.
  await supabase.from('place_legs').delete().eq('place_id', id)

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
export async function deletePlace(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { supabase, user } = await requireUser()
  if (!user) return

  await supabase.from('places').delete().eq('id', id)

  revalidatePath('/dashboard/locais')
  revalidatePath('/dashboard/trips')
}
