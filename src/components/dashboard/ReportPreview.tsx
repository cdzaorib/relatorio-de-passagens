import { formatBRL, formatDate } from '@/lib/format'
import { formatPeriodLabel, type Period } from '@/lib/period'
import type { ReportTotals } from '@/lib/report'
import { TRANSPORT_LABELS, type Profile, type Trip } from '@/types'

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

/**
 * O relatório no formato em que ele sai — mesmas colunas, mesma ordem,
 * mesmo rodapé. É o que a F6 vai transformar em PDF.
 */
export function ReportPreview({ profile, period, trips, totals }: ReportPreviewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">
            Nome do funcionário
          </p>
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
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Bairro origem</th>
              <th className="px-4 py-3 font-medium">Bairro destino</th>
              <th className="px-4 py-3 font-medium">Cliente, empresa ou residência</th>
              <th className="px-4 py-3 font-medium">Transporte</th>
              <th className="px-4 py-3 font-medium">Linha</th>
              <th className="px-4 py-3 text-right font-medium">Rio Card</th>
              <th className="px-4 py-3 text-right font-medium">Jaé</th>
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
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {trip.card === 'riocard' ? formatBRL(Number(trip.value)) : ''}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {trip.card === 'jae' ? formatBRL(Number(trip.value)) : ''}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
              <td className="px-4 py-3" colSpan={6}>
                Totais
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatBRL(totals.riocard)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatBRL(totals.jae)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-bold text-slate-900">
              <td className="px-4 py-3" colSpan={6}>
                Total geral
              </td>
              <td className="px-4 py-3 text-right tabular-nums" colSpan={2}>
                {formatBRL(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
