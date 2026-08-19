import { NextResponse, type NextRequest } from 'next/server'

import { todayISO } from '@/lib/format'
import { buildReportPdf } from '@/lib/pdf'
import { resolvePeriod } from '@/lib/period'
import { readStoredPeriod } from '@/lib/period-cookie'
import { summarize } from '@/lib/report'
import { createClient } from '@/lib/supabase/server'

// pdf-lib precisa do runtime Node; no edge não roda.
export const runtime = 'nodejs'

/** Nome do arquivo baixado: reembolso-2026-08-01-a-2026-08-15.pdf */
function nomeDoArquivo(from: string, to: string): string {
  return `reembolso-${from}-a-${to}.pdf`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // O middleware já barra, mas a rota devolve o arquivo: confere de novo.
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const period = resolvePeriod(
    { de: searchParams.get('de') ?? undefined, ate: searchParams.get('ate') ?? undefined },
    await readStoredPeriod(),
    todayISO(),
  )

  const [profileResult, tripsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('trips')
      .select('*')
      .gte('date', period.from)
      .lte('date', period.to)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      // Desempata os trechos do mesmo lançamento: created_at é igual nos quatro.
      .order('leg_order', { ascending: true }),
  ])

  const trips = tripsResult.data ?? []
  const pdf = await buildReportPdf({
    profile: profileResult.data,
    period,
    trips,
    totals: summarize(trips),
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      // attachment: o navegador baixa em vez de abrir numa aba.
      'Content-Disposition': `attachment; filename="${nomeDoArquivo(period.from, period.to)}"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'no-store',
    },
  })
}
