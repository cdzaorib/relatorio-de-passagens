import type { Metadata } from 'next'

import { PlaceForm } from '@/components/locais/PlaceForm'
import { PlaceList } from '@/components/locais/PlaceList'
import { Alert } from '@/components/ui/Alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { primeiraFalha } from '@/lib/query'
import { getSuggestions } from '@/lib/suggestions'
import { createClient } from '@/lib/supabase/server'
import type { PlaceWithLegs } from '@/types'

export const metadata: Metadata = { title: 'Locais' }

export default async function LocaisPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // O id do usuário entra em toda consulta. A RLS já garante o isolamento,
  // mas ela é uma camada só: uma política removida por engano transformaria
  // cada consulta destas em vazamento silencioso. Com o filtro explícito, o
  // pior caso vira lista vazia em vez de dado de outra pessoa.
  const userId = user!.id

  const [faresResult, placesResult, legsResult, suggestions] = await Promise.all([
    supabase.from('fare_prices').select('*').eq('user_id', userId).eq('active', true).order('label'),
    supabase.from('places').select('*').eq('user_id', userId).eq('active', true).order('name'),
    supabase.from('place_legs').select('*').eq('user_id', userId).order('position', { ascending: true }),
    getSuggestions(supabase, userId),
  ])

  const falha = primeiraFalha(
    ['passagens', faresResult],
    ['locais', placesResult],
    ['trechos dos locais', legsResult],
  )
  const fares = faresResult.data ?? []
  const legs = legsResult.data ?? []

  const places: PlaceWithLegs[] = (placesResult.data ?? []).map((place) => ({
    ...place,
    legs: legs.filter((leg) => leg.place_id === place.id),
  }))

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="letreiro text-3xl leading-none text-ink">Locais</h1>
        <p className="text-muted">
          Um local guarda para onde você vai e como chega lá. Depois, é só
          escolher o local e a data para lançar o dia inteiro.
        </p>
      </div>

      {falha ? <Alert variant="error">{falha.mensagem}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Seus locais</CardTitle>
        </CardHeader>
        <PlaceList places={places} fares={fares} suggestions={suggestions} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo local</CardTitle>
          <CardDescription>
            Cadastre só a ida. Se você pega dois ônibus, são dois trechos — a
            volta o app monta sozinho, na ordem inversa.
          </CardDescription>
        </CardHeader>
        <PlaceForm fares={fares} suggestions={suggestions} />
      </Card>
    </div>
  )
}
