import { formatBRL } from '@/lib/format'
import type { ReportTotals } from '@/lib/report'

/**
 * Os números do rodapé do relatório. Os dois cartões usam a cor do seu
 * modal; o total geral fica em azul-petróleo, que no app significa sistema.
 */
export function SummaryCards({ totals }: { totals: ReportTotals }) {
  const cartoes = [
    {
      label: 'Rio Card',
      valor: formatBRL(totals.riocard),
      classe: 'border-barca/25 bg-barca-soft',
      cor: 'text-barca',
    },
    {
      label: 'Jaé',
      valor: formatBRL(totals.jae),
      classe: 'border-onibus/30 bg-onibus-soft',
      cor: 'text-onibus-ink',
    },
    {
      label: 'Total geral',
      valor: formatBRL(totals.total),
      classe: 'border-ink bg-ink',
      cor: 'text-paper',
    },
    {
      label: 'Trechos',
      valor: String(totals.tripCount),
      nota:
        totals.dayCount > 0
          ? `em ${totals.dayCount} ${totals.dayCount === 1 ? 'dia' : 'dias'}`
          : undefined,
      classe: 'border-line bg-surface',
      cor: 'text-ink',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cartoes.map((cartao) => (
        <div key={cartao.label} className={`rounded-xl border p-4 ${cartao.classe}`}>
          <p className={`letreiro text-[0.7rem] ${cartao.cor} opacity-70`}>{cartao.label}</p>
          <p className={`dados mt-1 text-2xl leading-none font-medium ${cartao.cor}`}>
            {cartao.valor}
          </p>
          {cartao.nota ? (
            <p className={`mt-1 text-xs ${cartao.cor} opacity-60`}>{cartao.nota}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
