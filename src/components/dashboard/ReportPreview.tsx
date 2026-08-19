import { CardTag } from '@/components/ui/CardTag'
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
 * O relatório no formato em que ele sai. Uma coluna de valor, com o cartão
 * dito em cada linha; os totais por cartão ficam no rodapé, que é o que o
 * financeiro usa. Os números vão na monoespaçada para alinharem em coluna.
 */
export function ReportPreview({ profile, period, trips, totals }: ReportPreviewProps) {
  const cabecalho = [
    { rotulo: 'Funcionário', valor: profile?.name },
    { rotulo: 'Superior imediato', valor: profile?.supervisor_name },
    { rotulo: 'Período', valor: formatPeriodLabel(period), dados: true },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid gap-4 border-b border-line px-5 py-4 sm:grid-cols-3">
        {cabecalho.map((campo) => (
          <div key={campo.rotulo}>
            <p className="letreiro text-[0.7rem] text-muted">{campo.rotulo}</p>
            <p className={`mt-0.5 font-medium text-ink ${campo.dados ? 'dados' : ''}`}>
              {campo.valor || <span className="font-normal text-muted/60">não preenchido</span>}
            </p>
          </div>
        ))}
      </div>

      {trips.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          Nenhum trecho neste período. Ajuste as datas ou lance seus trechos.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Data', 'Origem', 'Destino', 'Cliente', 'Transporte', 'Linha', 'Cartão'].map(
                    (titulo) => (
                      <th key={titulo} className="letreiro px-4 py-2.5 text-[0.7rem] text-muted">
                        {titulo}
                      </th>
                    ),
                  )}
                  <th className="letreiro px-4 py-2.5 text-right text-[0.7rem] text-muted">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody>
                {trips.map((trip, indice) => (
                  <tr
                    key={trip.id}
                    className={indice % 2 === 1 ? 'bg-paper/60' : undefined}
                  >
                    <td className="dados px-4 py-2 whitespace-nowrap text-muted">
                      {shortDate(trip.date)}
                    </td>
                    <td className="px-4 py-2 text-ink">{trip.origin}</td>
                    <td className="px-4 py-2 text-ink">{trip.destination}</td>
                    <td className="px-4 py-2 text-ink">{trip.client}</td>
                    <td className="px-4 py-2 text-ink-soft">
                      {TRANSPORT_LABELS[trip.transport]}
                    </td>
                    <td className="dados px-4 py-2 text-ink-soft">{trip.line || ''}</td>
                    <td className="px-4 py-2">
                      <CardTag card={trip.card} />
                    </td>
                    <td className="dados px-4 py-2 text-right font-medium text-ink">
                      {formatBRL(Number(trip.value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé fora da tabela: não rola junto e continua legível no celular. */}
          <dl className="border-t-2 border-ink">
            <div className="flex items-center justify-between border-b border-line px-5 py-2">
              <dt className="letreiro text-xs text-marca-texto">Total Rio Card</dt>
              <dd className="dados text-ink">{formatBRL(totals.riocard)}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-line px-5 py-2">
              <dt className="letreiro text-xs text-onibus-ink">Total Jaé</dt>
              <dd className="dados text-ink">{formatBRL(totals.jae)}</dd>
            </div>
            <div className="flex items-center justify-between bg-ink px-5 py-3">
              <dt className="letreiro text-sm text-paper">Total geral</dt>
              <dd className="dados text-lg font-medium text-paper">{formatBRL(totals.total)}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  )
}
