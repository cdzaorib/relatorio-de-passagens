import { NextResponse, type NextRequest } from 'next/server'

import { todayISO } from '@/lib/format'
import { buildReportPdf } from '@/lib/pdf'
import { resolvePeriod } from '@/lib/period'
import { readStoredPeriod } from '@/lib/period-cookie'
import { primeiraFalha } from '@/lib/query'
import { ordenaTrechos } from '@/lib/trips'
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
      .order('date', { ascending: true }),
  ])

  // PDF com zero trecho por causa de erro de banco seria pior do que nenhum
  // PDF: a pessoa entregaria ao financeiro um relatório que diz que ela não
  // se deslocou no mês.
  const falha = primeiraFalha(['perfil (pdf)', profileResult], ['trechos (pdf)', tripsResult])
  if (falha) {
    return new NextResponse(falha.mensagem, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  const trips = ordenaTrechos(tripsResult.data ?? [])
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
