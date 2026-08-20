import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export type Suggestions = {
  /** Bairros já usados como origem ou destino. */
  neighborhoods: string[]
  /** Clientes, empresas e 'Residência' já digitados. */
  clients: string[]
}

/**
 * Monta as listas de autocomplete a partir do que o usuário já lançou.
 * O PostgREST não tem DISTINCT, então trazemos os últimos lançamentos e
 * removemos as repetições aqui — é a base de um usuário só, cabe fácil.
 *
 * `userId` é obrigatório de propósito. Destas duas consultas sai texto que vai
 * direto para o autocomplete de todo formulário: sem o filtro, uma política de
 * RLS removida por engano ofereceria a bairros e clientes de outra pessoa a
 * cada tecla digitada, e ninguém perceberia — sugestão não parece dado alheio.
 * Pedir o id na assinatura torna a chamada insegura impossível de escrever.
 */
export async function getSuggestions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Suggestions> {
  const [tripsResult, legsResult] = await Promise.all([
    supabase
      .from('trips')
      .select('origin, destination, client')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('place_legs')
      .select('origin, destination, client')
      .eq('user_id', userId)
      .limit(200),
  ])

  const neighborhoods = new Set<string>()
  const clients = new Set<string>()

  for (const row of tripsResult.data ?? []) {
    if (row.origin) neighborhoods.add(row.origin)
    if (row.destination) neighborhoods.add(row.destination)
    if (row.client) clients.add(row.client)
  }

  for (const row of legsResult.data ?? []) {
    if (row.origin) neighborhoods.add(row.origin)
    if (row.destination) neighborhoods.add(row.destination)
    if (row.client) clients.add(row.client)
  }

  const collator = new Intl.Collator('pt-BR')

  return {
    neighborhoods: [...neighborhoods].sort(collator.compare),
    clients: [...clients].sort(collator.compare),
  }
}
