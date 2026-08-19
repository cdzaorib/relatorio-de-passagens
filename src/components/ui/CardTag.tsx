import { CARD_LABELS, type CardType } from '@/types'

/**
 * Etiqueta do cartão que pagou. A cor é a mesma do modal na linha de
 * percurso, então dá para varrer o relatório sem ler palavra por palavra.
 */
export function CardTag({ card }: { card: CardType }) {
  const styles =
    card === 'riocard'
      ? 'border-barca/30 bg-barca-soft text-barca'
      : 'border-onibus/40 bg-onibus-soft text-onibus-ink'

  return (
    <span
      className={`letreiro inline-block rounded border px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap ${styles}`}
    >
      {CARD_LABELS[card]}
    </span>
  )
}
