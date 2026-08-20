'use server'

import { revalidatePath } from 'next/cache'

import { parseAmount } from '@/lib/format'
import type { FieldErrors, FormState } from '@/lib/form-state'
import { createClient } from '@/lib/supabase/server'
import { MAX_LENGTHS, normalizeText, tooLong } from '@/lib/validation'
import { isCardType, isTransportType } from '@/types'

/** Dados do formulário de preço, já validados. */
type FarePriceFields = {
  label: string
  transport: 'onibus' | 'barca'
  card: 'riocard' | 'jae'
  value: number
}

function readFarePriceFields(formData: FormData): FarePriceFields | FieldErrors {
  const label = normalizeText(formData.get('label'))
  const transport = String(formData.get('transport') ?? '')
  const card = String(formData.get('card') ?? '')
  const value = parseAmount(String(formData.get('value') ?? ''))

  const errors: FieldErrors = {}

  if (!label) errors.label = 'Dê um nome para a passagem (ex: Ônibus 323).'
  else {
    const limite = tooLong(label, MAX_LENGTHS.passagem, 'O nome da passagem')
    if (limite) errors.label = limite
  }
  if (!isTransportType(transport)) errors.transport = 'Escolha o meio de transporte.'
  if (!isCardType(card)) errors.card = 'Escolha o cartão.'
  if (value === null) errors.value = 'Valor inválido. Use vírgula nos centavos: 4,70.'
  else if (value === 0) errors.value = 'O valor precisa ser maior que zero.'

  if (Object.keys(errors).length > 0) return errors

  return {
    label,
    transport: transport as FarePriceFields['transport'],
    card: card as FarePriceFields['card'],
    value: value as number,
  }
}

function isFieldErrors(result: FarePriceFields | FieldErrors): result is FieldErrors {
  return !('label' in result)
}

// ---------------------------------------------------------------------------
// Dados do funcionário
// ---------------------------------------------------------------------------

export async function updateProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeText(formData.get('name'))
  const supervisorName = normalizeText(formData.get('supervisor_name'))
  const values = { name, supervisor_name: supervisorName }

  const errors: FieldErrors = {}

  if (!name) errors.name = 'Informe seu nome completo.'
  else {
    const limite = tooLong(name, MAX_LENGTHS.nome, 'O nome')
    if (limite) errors.name = limite
  }

  if (!supervisorName) errors.supervisor_name = 'Informe o nome do superior imediato.'
  else {
    const limite = tooLong(supervisorName, MAX_LENGTHS.nome, 'O nome')
    if (limite) errors.supervisor_name = limite
  }
  if (Object.keys(errors).length > 0) return { fieldErrors: errors, values }

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
  if (isFieldErrors(fields)) return { fieldErrors: fields }

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
  if (isFieldErrors(fields)) return { fieldErrors: fields }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { data: current, error: loadError } = await supabase
    .from('fare_prices')
    .select('id, group_id, value')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadError || !current) {
    return { error: 'Passagem não encontrada.' }
  }

  if (Number(current.value) === fields.value) {
    const { error } = await supabase
      .from('fare_prices')
      .update({ label: fields.label, transport: fields.transport, card: fields.card })
      .eq('id', id)
      .eq('user_id', user.id)

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
    .eq('user_id', user.id)

  if (deactivateError) {
    // Desfaz para não sobrar dois preços ativos do mesmo grupo.
    await supabase.from('fare_prices').delete().eq('id', inserted.id).eq('user_id', user.id)
    return { error: 'Não foi possível concluir o reajuste. Nada foi alterado.' }
  }

  revalidatePath('/dashboard/perfil')
  return { success: `${fields.label} reajustada. O valor anterior ficou no histórico.` }
}

/** Tira a passagem da lista sem apagar o histórico dela. */
export async function archiveFarePrice(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = String(formData.get('group_id') ?? '')
  if (!groupId) return { error: 'Passagem não encontrada.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Entre de novo.' }

  const { error } = await supabase
    .from('fare_prices')
    .update({ active: false })
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { error: 'Não foi possível arquivar. Tente de novo.' }

  revalidatePath('/dashboard/perfil')
  return {}
}
