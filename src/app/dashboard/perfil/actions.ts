'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FormState } from '@/lib/form-state'
import { createClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/validation'
import { isCardType, isTransportType } from '@/types'

/** Dados do formulário de preço, já validados. */
type FarePriceFields = {
  label: string
  transport: 'onibus' | 'barca'
  card: 'riocard' | 'jae'
  value: number
}

function readFarePriceFields(formData: FormData): FarePriceFields | string {
  const label = normalizeText(formData.get('label'))
  const transport = String(formData.get('transport') ?? '')
  const card = String(formData.get('card') ?? '')
  const rawValue = String(formData.get('value') ?? '')

  if (!label) return 'Dê um nome para a passagem (ex: Ônibus 323).'
  if (!isTransportType(transport)) return 'Escolha o meio de transporte.'
  if (!isCardType(card)) return 'Escolha o cartão.'

  const value = parseAmount(rawValue)
  if (value === null) return 'Valor inválido. Escreva assim: 4,70.'
  if (value === 0) return 'O valor precisa ser maior que zero.'

  return { label, transport, card, value }
}

// ---------------------------------------------------------------------------
// Dados do funcionário
// ---------------------------------------------------------------------------

export async function updateProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeText(formData.get('name'))
  const supervisorName = normalizeText(formData.get('supervisor_name'))
  const values = { name, supervisor_name: supervisorName }

  if (!name) return { error: 'Informe seu nome completo.', values }
  if (!supervisorName) return { error: 'Informe o nome do superior imediato.', values }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Entre de novo.', values }

  // upsert em vez de update: cobre a conta criada antes do trigger existir.
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, name, supervisor_name: supervisorName })

  if (error) {
    return { error: 'Não foi possível salvar. Tente de novo.', values }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: 'Dados salvos.' }
}

// ---------------------------------------------------------------------------
// Preços das passagens
// ---------------------------------------------------------------------------

export async function createFarePrice(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const fields = readFarePriceFields(formData)
  if (typeof fields === 'string') return { error: fields }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase.from('fare_prices').insert({ user_id: user.id, ...fields })

  if (error) {
    return { error: 'Não foi possível cadastrar a passagem. Tente de novo.' }
  }

  revalidatePath('/dashboard/perfil')
  return { success: `${fields.label} cadastrada.` }
}

/**
 * Edição de preço.
 * Mudou o valor  → o registro atual é desativado e nasce um novo no mesmo
 *                  grupo, preservando o histórico (regra do reajuste).
 * Mudou só o resto → altera no lugar, porque não é reajuste nenhum.
 */
export async function updateFarePrice(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Passagem não encontrada.' }

  const fields = readFarePriceFields(formData)
  if (typeof fields === 'string') return { error: fields }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { data: current, error: loadError } = await supabase
    .from('fare_prices')
    .select('id, group_id, value')
    .eq('id', id)
    .maybeSingle()

  if (loadError || !current) {
    return { error: 'Passagem não encontrada.' }
  }

  if (Number(current.value) === fields.value) {
    const { error } = await supabase
      .from('fare_prices')
      .update({ label: fields.label, transport: fields.transport, card: fields.card })
      .eq('id', id)

    if (error) return { error: 'Não foi possível salvar a alteração.' }

    revalidatePath('/dashboard/perfil')
    return { success: `${fields.label} atualizada.` }
  }

  // Reajuste: o novo entra antes de o antigo sair, para nunca ficar sem preço.
  const { data: inserted, error: insertError } = await supabase
    .from('fare_prices')
    .insert({ user_id: user.id, group_id: current.group_id, ...fields })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { error: 'Não foi possível registrar o novo valor.' }
  }

  const { error: deactivateError } = await supabase
    .from('fare_prices')
    .update({ active: false })
    .eq('id', current.id)

  if (deactivateError) {
    // Desfaz para não sobrar dois preços ativos do mesmo grupo.
    await supabase.from('fare_prices').delete().eq('id', inserted.id)
    return { error: 'Não foi possível concluir o reajuste. Nada foi alterado.' }
  }

  revalidatePath('/dashboard/perfil')
  return { success: `${fields.label} reajustada. O valor anterior ficou no histórico.` }
}

/** Tira a passagem da lista sem apagar o histórico dela. */
export async function archiveFarePrice(formData: FormData): Promise<void> {
  const groupId = String(formData.get('group_id') ?? '')
  if (!groupId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('fare_prices').update({ active: false }).eq('group_id', groupId)

  revalidatePath('/dashboard/perfil')
}
