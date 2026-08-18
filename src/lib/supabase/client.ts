import { createBrowserClient } from '@supabase/ssr'

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase para Client Components ('use client').
 * A sessão fica em cookies, então o servidor consegue ler a mesma sessão.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
}
