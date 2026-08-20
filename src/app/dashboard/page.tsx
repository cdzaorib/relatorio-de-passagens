import type { Metadata } from 'next'
import Link from 'next/link'

import { PeriodFilter } from '@/components/dashboard/PeriodFilter'
import { Alert } from '@/components/ui/Alert'
import { ReportPreview } from '@/components/dashboard/ReportPreview'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { todayISO } from '@/lib/format'
import { periodQuery, resolvePeriod } from '@/lib/period'
import { primeiraFalha } from '@/lib/query'
import { readStoredPeriod } from '@/lib/period-cookie'
import { summarize } from '@/lib/report'
import { ordenaTrechos } from '@/lib/trips'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Início' }

type PageProps = {
  searchParams: Promise<{ de?: string; ate?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const today = todayISO()
  // URL primeiro; depois o último período escolhido; por último, a quinzena.
  const period = resolvePeriod(params, await readStoredPeriod(), today)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profileResult, tripsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
    supabase
      .from('trips')
      .select('*')
      .eq('user_id', user!.id)
      .gte('date', period.from)
      .lte('date', period.to)
      // A ordem final sai de ordenaTrechos: pedir leg_order ao banco faria a
      // consulta inteira falhar num banco que ainda não migrou.
      .order('date', { ascending: true }),
  ])

  const falha = primeiraFalha(['perfil', profileResult], ['trechos', tripsResult])
  const profile = profileResult.data
  const trips = ordenaTrechos(tripsResult.data ?? [])
  const totals = summarize(trips)

  return (
    <div className="space-y-8">
      {falha ? (
        <div className="no-print">
          <Alert variant="error">{falha.mensagem}</Alert>
        </div>
      ) : null}

      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="letreiro text-3xl leading-none text-ink sm:text-4xl">Relatório</h1>
          <p className="mt-2 text-muted">Confira o período e baixe o PDF.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/trips"
            className="letreiro rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink transition hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Lançar trechos
          </Link>

          {trips.length > 0 ? (
            <a
              href={`/dashboard/relatorio/pdf${periodQuery(period)}`}
              className="letreiro rounded-lg bg-ink px-4 py-2.5 text-sm text-paper transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Baixar PDF
            </a>
          ) : (
            <span
              className="letreiro cursor-not-allowed rounded-lg border border-line bg-paper px-4 py-2.5 text-sm text-muted"
              title="Lance ao menos um trecho no período para gerar o PDF."
            >
              Baixar PDF
            </span>
          )}
        </div>
      </div>

      <PeriodFilter period={period} today={today} />

      <SummaryCards totals={totals} />

      <ReportPreview profile={profile} period={period} trips={trips} totals={totals} />
    </div>
  )
}
