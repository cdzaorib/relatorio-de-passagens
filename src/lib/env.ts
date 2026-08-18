/**
 * Leitura das variáveis de ambiente com erro claro quando faltar alguma.
 * As NEXT_PUBLIC_* precisam ser lidas literalmente para o Next conseguir
 * embutir o valor no bundle do browser — por isso nada de acesso dinâmico.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Copie o .env.example para .env.local e preencha.`,
    )
  }
  return value
}

export function getSupabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
}

/**
 * Chave pública. Aceita os dois nomes porque o Supabase renomeou:
 * projetos novos entregam uma "publishable key" (sb_publishable_...),
 * os antigos, uma "anon key" (JWT). As duas funcionam do mesmo jeito.
 */
export function getSupabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
  )
}

/** URL pública do app, usada para montar links de e-mail. */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
