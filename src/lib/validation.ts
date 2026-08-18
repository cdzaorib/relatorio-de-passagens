/** Validações dos formulários, com mensagens já em português. */

export const MIN_PASSWORD_LENGTH = 8

export function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim()
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Informe seu e-mail.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe uma senha.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return null
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (password !== confirmation) return 'As senhas não são iguais.'
  return null
}

/**
 * Só aceita caminho interno como destino pós-login.
 * Bloqueia '//host' e URL absoluta, que dariam redirect para fora do app.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

/** Traduz os erros do Supabase Auth, que vêm em inglês. */
export function translateAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada.'
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Já existe uma conta com esse e-mail.'
  }
  if (normalized.includes('password should be at least')) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (normalized.includes('should be different from the old password')) {
    return 'A nova senha precisa ser diferente da anterior.'
  }
  if (normalized.includes('email rate limit') || normalized.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  }
  if (normalized.includes('token has expired') || normalized.includes('invalid token')) {
    return 'Esse link expirou ou já foi usado. Peça um novo.'
  }

  return 'Não foi possível concluir. Tente de novo em instantes.'
}
