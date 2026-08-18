import { formatBRL } from '@/lib/format'
import type { ReportTotals } from '@/lib/report'

/** Os números do rodapé do relatório, em destaque. */
export function SummaryCards({ totals }: { totals: ReportTotals }) {
  const cards = [
    { label: 'Total RIO CARD', value: formatBRL(totals.riocard) },
    { label: 'Total JAÉ', value: formatBRL(totals.jae) },
    { label: 'Total geral', value: formatBRL(totals.total), highlight: true },
    {
      label: 'Trechos',
      value: String(totals.tripCount),
      note:
        totals.dayCount > 0
          ? `em ${totals.dayCount} ${totals.dayCount === 1 ? 'dia' : 'dias'}`
          : undefined,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-5 ${
            card.highlight ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-sm text-slate-500">{card.label}</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              card.highlight ? 'text-brand-700' : 'text-slate-900'
            }`}
          >
            {card.value}
          </p>
          {card.note ? <p className="mt-0.5 text-xs text-slate-500">{card.note}</p> : null}
        </div>
      ))}
    </div>
  )
}
