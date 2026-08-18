import Link from 'next/link'

import { halfMonths, periodHref, type Period } from '@/lib/period'

/**
 * Filtro de período. É um <form method="get">, então funciona sem
 * JavaScript e deixa o período na URL — dá para salvar o link do
 * fechamento de julho nos favoritos.
 */
export function PeriodFilter({ period, today }: { period: Period; today: string }) {
  const { first, second, whole } = halfMonths(today)

  const shortcuts: { label: string; target: Period }[] = [
    { label: '1ª quinzena', target: first },
    { label: '2ª quinzena', target: second },
    { label: 'Mês todo', target: whole },
  ]

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

  return (
    <div className="no-print space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="de" className="block text-sm font-medium text-slate-700">
            De
          </label>
          <input
            id="de"
            name="de"
            type="date"
            defaultValue={period.from}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ate" className="block text-sm font-medium text-slate-700">
            Até
          </label>
          <input
            id="ate"
            name="ate"
            type="date"
            defaultValue={period.to}
            required
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          Aplicar
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Atalhos:</span>
        {shortcuts.map(({ label, target }) => {
          const isActive = period.from === target.from && period.to === target.to

          return (
            <Link
              key={label}
              href={periodHref(target)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                isActive
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
