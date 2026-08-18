import type { Metadata } from 'next'

import { PlaceForm } from '@/components/locais/PlaceForm'
import { PlaceList } from '@/components/locais/PlaceList'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { getSuggestions } from '@/lib/suggestions'
import { createClient } from '@/lib/supabase/server'
import type { PlaceWithLegs } from '@/types'

export const metadata: Metadata = { title: 'Locais' }

export default async function LocaisPage() {
  const supabase = await createClient()

  const [faresResult, placesResult, legsResult, suggestions] = await Promise.all([
    supabase.from('fare_prices').select('*').eq('active', true).order('label'),
    supabase.from('places').select('*').eq('active', true).order('name'),
    supabase.from('place_legs').select('*').order('position', { ascending: true }),
    getSuggestions(supabase),
  ])

  const fares = faresResult.data ?? []
  const legs = legsResult.data ?? []

  const places: PlaceWithLegs[] = (placesResult.data ?? []).map((place) => ({
    ...place,
    legs: legs.filter((leg) => leg.place_id === place.id),
  }))

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Locais</h1>
        <p className="text-slate-600">
          Um local guarda para onde você vai e como chega lá. Depois, é só
          escolher o local e a data para lançar o dia inteiro.
        </p>
      </div>

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
