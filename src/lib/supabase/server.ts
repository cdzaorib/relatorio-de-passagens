import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Precisa ser criado a cada requisição (os cookies mudam a cada uma).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component não pode escrever cookie. O middleware (F2)
          // renova a sessão, então dá para ignorar com segurança.
        }
      },
    },
  })
}
