import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { getSupabaseUrl } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Cliente com service role: ignora RLS e pode gerar links de recuperação.
 * Só existe no servidor — a chave nunca pode ir para o browser.
 */
function getSecretKey(): string | undefined {
  // Projetos novos chamam de "secret key" (sb_secret_...), os antigos de
  // "service_role". As duas dão acesso total, ignorando a RLS.
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
}

export function createAdminClient() {
  const serviceRoleKey = getSecretKey()

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) não definida.')
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Diz se dá para usar o fluxo de e-mail próprio (Resend + link gerado aqui). */
export function isAdminConfigured(): boolean {
  return Boolean(getSecretKey())
}
