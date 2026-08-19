'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { getSiteUrl } from '@/lib/env'
import type { FormState } from '@/lib/form-state'
import { checkRateLimit } from '@/lib/rate-limit'
import { isResendConfigured, sendPasswordResetEmail } from '@/lib/resend'
import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeEmail,
  normalizeText,
  safeRedirectPath,
  translateAuthError,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/lib/validation'

// ---------------------------------------------------------------------------
// Entrar
// ---------------------------------------------------------------------------

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  const destination = safeRedirectPath(String(formData.get('redirect') ?? ''))
  const values = { email }

  const emailError = validateEmail(email)
  if (emailError) return { error: emailError, values }
  if (!password) return { error: 'Informe sua senha.', values }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: translateAuthError(error.message), values }
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}

// ---------------------------------------------------------------------------
// Criar conta
// ---------------------------------------------------------------------------

export async function signup(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeText(formData.get('name'))
  const supervisorName = normalizeText(formData.get('supervisor_name'))
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  const passwordConfirmation = String(formData.get('password_confirmation') ?? '')
  const values = { name, supervisor_name: supervisorName, email }

  if (!name) return { error: 'Informe seu nome completo.', values }
  if (!supervisorName) return { error: 'Informe o nome do seu superior imediato.', values }

  const emailError = validateEmail(email)
  if (emailError) return { error: emailError, values }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError, values }

  const confirmationError = validatePasswordConfirmation(password, passwordConfirmation)
  if (confirmationError) return { error: confirmationError, values }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Vira raw_user_meta_data; o trigger handle_new_user copia para profiles.
      data: { name, supervisor_name: supervisorName },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/dashboard`,
    },
  })

  if (error) {
    return { error: translateAuthError(error.message), values }
  }

  // Projeto com confirmação de e-mail desligada já devolve sessão pronta.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return {
    success:
      'Conta criada. Enviamos um e-mail de confirmação para você — abra o link de lá para entrar.',
  }
}

// ---------------------------------------------------------------------------
// Esqueci minha senha
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = normalizeEmail(formData.get('email'))
  const values = { email }

  const emailError = validateEmail(email)
  if (emailError) return { error: emailError, values }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido'

  // 3 pedidos a cada 15 minutos por e-mail e por origem.
  const allowed =
    checkRateLimit(`reset:email:${email}`, 3, 15 * 60 * 1000) &&
    checkRateLimit(`reset:ip:${ip}`, 10, 15 * 60 * 1000)

  if (!allowed) {
    return { error: 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.', values }
  }

  // Resposta sempre igual, exista o e-mail ou não: não entregamos para
  // ninguém a informação de quem tem conta aqui.
  const genericSuccess: FormState = {
    success:
      'Se existir uma conta com esse e-mail, o link para criar uma nova senha chega em instantes.',
  }

  const resetUrl = `${getSiteUrl()}/auth/confirm?next=/auth/reset`

  try {
    if (isResendConfigured() && isAdminConfigured()) {
      // Caminho principal: geramos o link aqui e mandamos pelo Resend.
      const admin = createAdminClient()
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${getSiteUrl()}/auth/reset` },
      })

      if (error || !data?.properties?.hashed_token) {
        // E-mail não cadastrado cai aqui — segue com a mensagem genérica.
        return genericSuccess
      }

      const link = `${resetUrl}&token_hash=${data.properties.hashed_token}&type=recovery`
      await sendPasswordResetEmail(email, link)
      return genericSuccess
    }

    // Sem Resend configurado, usa o e-mail padrão do próprio Supabase.
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl })
    return genericSuccess
  } catch (cause) {
    // Só a mensagem: o objeto de erro do provedor costuma trazer o endereço
    // de destino, e log de servidor não é lugar para guardar e-mail de ninguém.
    console.error(
      'Falha ao enviar e-mail de redefinição:',
      cause instanceof Error ? cause.message : 'erro desconhecido',
    )
    return {
      error: 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.',
      values,
    }
  }
}

// ---------------------------------------------------------------------------
// Definir nova senha (já dentro da sessão criada pelo link)
// ---------------------------------------------------------------------------

export async function updatePassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get('password') ?? '')
  const passwordConfirmation = String(formData.get('password_confirmation') ?? '')

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const confirmationError = validatePasswordConfirmation(password, passwordConfirmation)
  if (confirmationError) return { error: confirmationError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sua sessão expirou. Peça um novo link de redefinição.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// Sair
// ---------------------------------------------------------------------------

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
