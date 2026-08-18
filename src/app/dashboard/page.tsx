import type { Metadata } from 'next'
import Link from 'next/link'

import { PeriodFilter } from '@/components/dashboard/PeriodFilter'
import { ReportPreview } from '@/components/dashboard/ReportPreview'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { todayISO } from '@/lib/format'
import { resolvePeriod } from '@/lib/period'
import { readStoredPeriod } from '@/lib/period-cookie'
import { summarize } from '@/lib/report'
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
      .gte('date', period.from)
      .lte('date', period.to)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const profile = profileResult.data
  const trips = tripsResult.data ?? []
  const totals = summarize(trips)

  return (
    <div className="space-y-8">
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Relatório</h1>
          <p className="text-slate-600">
            Escolha o período e confira antes de gerar o PDF.
          </p>
        </div>

        <Link
          href="/dashboard/trips"
          className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          Lançar trechos
        </Link>
      </div>

      <PeriodFilter period={period} today={today} />

      <SummaryCards totals={totals} />

      <ReportPreview profile={profile} period={period} trips={trips} totals={totals} />
    </div>
  )
}
