import { applyPeriod } from '@/app/dashboard/actions'
import { halfMonths, type Period } from '@/lib/period'

/**
 * Filtro de período. As datas são livres — a quinzena é só o ponto de
 * partida de quem nunca escolheu nada, e o período escolhido fica guardado.
 */
export function PeriodFilter({ period, today }: { period: Period; today: string }) {
  const { first, second, whole } = halfMonths(today)

  const atalhos: { label: string; target: Period }[] = [
    { label: '1ª quinzena', target: first },
    { label: '2ª quinzena', target: second },
    { label: 'Mês todo', target: whole },
  ]

  const campo =
    'dados w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-barca focus:ring-2 focus:ring-barca/15'

  return (
    <div className="no-print rounded-xl border border-line bg-surface p-4 sm:p-5">
      <form action={applyPeriod} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="de" className="letreiro text-xs text-muted">
            De
          </label>
          <input id="de" name="de" type="date" defaultValue={period.from} required className={campo} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ate" className="letreiro text-xs text-muted">
            Até
          </label>
          <input id="ate" name="ate" type="date" defaultValue={period.to} required className={campo} />
        </div>

        <button
          type="submit"
          className="letreiro rounded-lg bg-ink px-5 py-2.5 text-sm text-paper transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Aplicar
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <span className="letreiro text-[0.7rem] text-muted">Atalhos</span>
        {atalhos.map(({ label, target }) => {
          const ativo = period.from === target.from && period.to === target.to

          return (
            // Cada atalho é um formulário para o período também ficar guardado.
            <form key={label} action={applyPeriod}>
              <input type="hidden" name="de" value={target.from} />
              <input type="hidden" name="ate" value={target.to} />
              <button
                type="submit"
                className={`rounded-full border px-3 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  ativo
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-ink-soft hover:border-ink/30 hover:bg-paper'
                }`}
              >
                {label}
              </button>
            </form>
          )
        })}
      </div>
    </div>
  )
}
