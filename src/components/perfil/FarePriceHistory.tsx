import { formatBRL, formatDate } from '@/lib/format'
import { CARD_LABELS, TRANSPORT_LABELS, type FarePrice } from '@/types'

/**
 * Versões antigas de preço. Não some com elas: é o que explica por que um
 * trecho de março saiu por um valor diferente do de hoje.
 */
export function FarePriceHistory({ farePrices }: { farePrices: FarePrice[] }) {
  if (farePrices.length === 0) return null

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-6">
      <summary className="cursor-pointer font-semibold text-slate-900">
        Histórico de valores ({farePrices.length})
      </summary>

      <ul className="mt-4 divide-y divide-slate-200">
        {farePrices.map((farePrice) => (
          <li key={farePrice.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">{farePrice.label}</p>
              <p className="text-xs text-slate-500">
                {TRANSPORT_LABELS[farePrice.transport]} · {CARD_LABELS[farePrice.card]} · valeu de{' '}
                {formatDate(farePrice.created_at)} a {formatDate(farePrice.updated_at)}
              </p>
            </div>
            <span className="text-sm text-slate-500 tabular-nums line-through">
              {formatBRL(Number(farePrice.value))}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
