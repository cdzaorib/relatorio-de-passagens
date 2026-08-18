import type { Metadata } from 'next'
import Link from 'next/link'

import { PlaceLauncher } from '@/components/trips/PlaceLauncher'
import { TripForm } from '@/components/trips/TripForm'
import { TripsTable } from '@/components/trips/TripsTable'
import { daysAgoISO, todayISO } from '@/lib/format'
import { getSuggestions } from '@/lib/suggestions'
import { createClient } from '@/lib/supabase/server'
import type { PlaceWithLegs } from '@/types'

export const metadata: Metadata = { title: 'Trechos' }

const DAYS_SHOWN = 30

export default async function TripsPage() {
  const supabase = await createClient()
  const today = todayISO()
  const since = daysAgoISO(DAYS_SHOWN)

  const [faresResult, tripsResult, placesResult, legsResult, suggestions] = await Promise.all([
    supabase.from('fare_prices').select('*').eq('active', true).order('label'),
    supabase
      .from('trips')
      .select('*')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase.from('places').select('*').eq('active', true).order('name'),
    supabase.from('place_legs').select('*').order('position', { ascending: true }),
    getSuggestions(supabase),
  ])

  const fares = faresResult.data ?? []
  const trips = tripsResult.data ?? []
  const legs = legsResult.data ?? []

  const places: PlaceWithLegs[] = (placesResult.data ?? []).map((place) => ({
    ...place,
    legs: legs.filter((leg) => leg.place_id === place.id),
  }))

  const placesWithLegs = places.filter((place) => place.legs.length > 0)

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Trechos</h1>
        <p className="text-slate-600">
          Cada linha do relatório é um trecho. Um dia normal tem quatro: duas
          idas e duas voltas.
        </p>
      </div>

      {placesWithLegs.length > 0 ? (
        <section className="rounded-xl border border-brand-100 bg-brand-50/40 p-6">
          <h2 className="font-semibold text-slate-900">Lançar por local</h2>
          <p className="mt-1 mb-5 text-sm text-slate-600">
            O jeito rápido: escolha para onde você foi e a data, e o dia inteiro
            entra de uma vez.
          </p>
          <PlaceLauncher places={placesWithLegs} today={today} />
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Lançar por local</h2>
          <p className="mt-1 text-sm text-slate-600">
            Se você repete o mesmo caminho toda semana, cadastre um local uma vez
            e depois lance o dia com dois cliques.{' '}
            <Link
              href="/dashboard/locais"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Cadastrar um local
            </Link>
            .
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Lançar trecho</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Para o dia fora do comum. Se você voltou para o mesmo lugar de onde
          saiu, deixe a caixa marcada e a volta é lançada junto.
        </p>
        <TripForm fares={fares} suggestions={suggestions} today={today} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Últimos {DAYS_SHOWN} dias</h2>
          <p className="text-sm text-slate-600">
            Para escolher um período e gerar o PDF, use o início.
          </p>
        </div>

        <TripsTable trips={trips} fares={fares} suggestions={suggestions} today={today} />
      </section>
    </div>
  )
}
