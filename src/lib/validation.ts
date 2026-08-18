/** Validações dos formulários, com mensagens já em português. */

export const MIN_PASSWORD_LENGTH = 8

/**
 * Tamanho máximo dos campos de texto.
 * As colunas do banco são `text` sem limite: sem isto, uma colagem acidental
 * entraria inteira e estouraria a coluna do relatório.
 */
export const MAX_LENGTHS = {
  nome: 120,
  bairro: 60,
  cliente: 80,
  linha: 20,
  passagem: 60,
  local: 60,
} as const

/** Devolve a mensagem se passar do limite, ou null. */
export function tooLong(valor: string, limite: number, rotulo: string): string | null {
  return valor.length > limite ? `${rotulo} pode ter no máximo ${limite} caracteres.` : null
}

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
 *
 * Exige uma única barra no início, sem contrabarra e sem caractere de
 * controle. A contrabarra importa: '/\evil.com' parece caminho interno, mas
 * o navegador e o parser de URL tratam '\' como '/', então viraria
 * '//evil.com' e levaria a pessoa para fora do app depois do login — um
 * convite pronto para phishing. Caractere de controle é barrado para não
 * abrir espaço a injeção no cabeçalho Location.
 */
const INTERNAL_PATH = /^\/(?![/\\])[^\x00-\x20\\]*$/

export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  return INTERNAL_PATH.test(value) ? value : fallback
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
