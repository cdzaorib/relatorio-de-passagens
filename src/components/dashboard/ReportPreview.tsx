import { Card } from '@/components/ui/Card'
import { formatBRL, formatDate } from '@/lib/format'
import { formatPeriodLabel, type Period } from '@/lib/period'
import type { ReportTotals } from '@/lib/report'
import { CARD_LABELS, TRANSPORT_LABELS, type Profile, type Trip } from '@/types'

type ReportPreviewProps = {
  profile: Profile | null
  period: Period
  trips: Trip[]
  totals: ReportTotals
}

/** Data curta como na planilha: '01/07'. */
function shortDate(iso: string): string {
  return formatDate(iso).slice(0, 5)
}

/** Etiqueta do cartão que pagou o trecho. */
function CardTag({ card }: { card: Trip['card'] }) {
  const styles =
    card === 'riocard'
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      {CARD_LABELS[card]}
    </span>
  )
}

/**
 * O relatório no formato em que ele sai. Uma coluna de valor só, com o cartão
 * dito em cada linha — os totais por cartão continuam no rodapé, que é o que
 * o financeiro usa para o reembolso.
 */
export function ReportPreview({ profile, period, trips, totals }: ReportPreviewProps) {
  return (
    <Card className="p-0">
      <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">Nome do funcionário</p>
          <p className="mt-0.5 font-medium text-slate-900">
            {profile?.name || <span className="text-slate-400">não preenchido</span>}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">
            Nome do superior imediato
          </p>
          <p className="mt-0.5 font-medium text-slate-900">
            {profile?.supervisor_name || <span className="text-slate-400">não preenchido</span>}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">Período</p>
          <p className="mt-0.5 font-medium text-slate-900">{formatPeriodLabel(period)}</p>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">
          Nenhum trecho neste período. Ajuste as datas acima ou lance os trechos
          em Trechos.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Bairro origem</th>
                  <th className="px-4 py-3 font-medium">Bairro destino</th>
                  <th className="px-4 py-3 font-medium">Cliente, empresa ou residência</th>
                  <th className="px-4 py-3 font-medium">Transporte</th>
                  <th className="px-4 py-3 font-medium">Linha</th>
                  <th className="px-4 py-3 font-medium">Cartão</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                      {shortDate(trip.date)}
                    </td>
                    <td className="px-4 py-2.5">{trip.origin}</td>
                    <td className="px-4 py-2.5">{trip.destination}</td>
                    <td className="px-4 py-2.5">{trip.client}</td>
                    <td className="px-4 py-2.5">{TRANSPORT_LABELS[trip.transport]}</td>
                    <td className="px-4 py-2.5">{trip.line || ''}</td>
                    <td className="px-4 py-2.5">
                      <CardTag card={trip.card} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatBRL(Number(trip.value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé fora da tabela: não rola junto e fica legível no celular. */}
          <dl className="divide-y divide-slate-100 border-t-2 border-slate-300">
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-sm text-slate-600">Total RIO CARD</dt>
              <dd className="font-medium text-slate-900 tabular-nums">
                {formatBRL(totals.riocard)}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-sm text-slate-600">Total JAÉ</dt>
              <dd className="font-medium text-slate-900 tabular-nums">{formatBRL(totals.jae)}</dd>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <dt className="font-semibold text-slate-900">Total geral</dt>
              <dd className="text-lg font-bold text-slate-900 tabular-nums">
                {formatBRL(totals.total)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  )
}
