import type { Metadata } from 'next'
import Link from 'next/link'

import { PlaceLauncher } from '@/components/trips/PlaceLauncher'
import { TripForm } from '@/components/trips/TripForm'
import { TripsTable } from '@/components/trips/TripsTable'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { daysAgoISO, todayISO } from '@/lib/format'
import { formatPeriodLabel, resolvePeriod } from '@/lib/period'
import { readStoredPeriod } from '@/lib/period-cookie'
import { getSuggestions } from '@/lib/suggestions'
import { createClient } from '@/lib/supabase/server'
import type { PlaceWithLegs } from '@/types'

export const metadata: Metadata = { title: 'Trechos' }

const DAYS_SHOWN = 30

export default async function TripsPage() {
  const supabase = await createClient()
  const today = todayISO()

  /*
   * A lista precisa alcançar o período que está sendo fechado, senão uma linha
   * errada de 40 dias atrás aparece no relatório e não há onde corrigir. Então
   * o começo é o que vier primeiro: o início do período escolhido ou 30 dias
   * atrás, o que garante que o lançamento de hoje também apareça.
   */
  const period = resolvePeriod({}, await readStoredPeriod(), today)
  const recente = daysAgoISO(DAYS_SHOWN)
  const since = period.from < recente ? period.from : recente

  const [faresResult, tripsResult, placesResult, legsResult, suggestions] = await Promise.all([
    supabase.from('fare_prices').select('*').eq('active', true).order('label'),
    supabase
      .from('trips')
      .select('*')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: true })
      // Desempata os trechos do mesmo lançamento: created_at é igual nos quatro.
      .order('leg_order', { ascending: true }),
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
        <h1 className="letreiro text-3xl leading-none text-ink">Trechos</h1>
        <p className="text-muted">
          Cada linha do relatório é um trecho. Um dia normal tem quatro: duas
          idas e duas voltas.
        </p>
      </div>

      {placesWithLegs.length > 0 ? (
        <Card tone="accent">
          <CardHeader>
            <CardTitle>Lançar por local</CardTitle>
            <CardDescription>
              O jeito rápido: escolha para onde você foi e a data, e o dia
              inteiro entra de uma vez.
            </CardDescription>
          </CardHeader>
          <PlaceLauncher places={placesWithLegs} today={today} />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lançar por local</CardTitle>
          </CardHeader>
          <p className="text-sm text-muted">
            Se você repete o mesmo caminho toda semana, cadastre um local uma vez
            e depois lance o dia com dois cliques.{' '}
            <Link
              href="/dashboard/locais"
              className="font-medium text-marca-texto hover:text-marca"
            >
              Cadastrar um local
            </Link>
            .
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lançar trecho</CardTitle>
          <CardDescription>
            Para o dia fora do comum. Se você voltou para o mesmo lugar de onde
            saiu, deixe a caixa marcada e a volta é lançada junto.
          </CardDescription>
        </CardHeader>
        <TripForm fares={fares} suggestions={suggestions} today={today} />
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="letreiro text-lg text-ink">Lançamentos</h2>
          <p className="text-sm text-muted">
            Últimos {DAYS_SHOWN} dias e todo o período em fechamento (
            <span className="dados">{formatPeriodLabel(period)}</span>), para
            nada do relatório ficar fora de alcance.
          </p>
        </div>

        <TripsTable trips={trips} fares={fares} suggestions={suggestions} today={today} />
      </section>
    </div>
  )
}
