import { HOME_CLIENT_LABEL, type CardType, type TransportType, type TripInsert } from '@/types'

/** Um trecho antes de virar registro no banco. */
export type LegDraft = {
  origin: string
  destination: string
  client: string
  transport: TransportType
  line: string | null
  card: CardType
  value: number
}

/**
 * Espelha os trechos da ida para produzir a volta (regra 4).
 *
 * A ordem é invertida — o último trecho da ida é o primeiro da volta — e em
 * cada um a origem troca com o destino. Transporte, linha, cartão e valor
 * seguem iguais; o cliente vira 'Residência', porque a volta é para casa.
 *
 *   ida:   Bananal→Cocotá (323) | Cocotá→Praça XV (barca)
 *   volta: Praça XV→Cocotá (barca) | Cocotá→Bananal (323)
 */
export function mirrorLegs(legs: LegDraft[]): LegDraft[] {
  return [...legs].reverse().map((leg) => ({
    ...leg,
    origin: leg.destination,
    destination: leg.origin,
    client: HOME_CLIENT_LABEL,
  }))
}

/** Monta a ida (e a volta, se pedida) de uma vez. */
export function buildDayLegs(legs: LegDraft[], includeReturn: boolean): LegDraft[] {
  return includeReturn ? [...legs, ...mirrorLegs(legs)] : [...legs]
}

/**
 * Converte os trechos em registros prontos para o insert.
 *
 * `leg_order` grava a posição de cada trecho. Sem ela a ordem se perderia:
 * `now()` no Postgres é o horário da transação, então os quatro trechos de um
 * dia nascem com `created_at` idêntico e o banco devolve em ordem arbitrária —
 * a volta aparecia embaralhada com a ida.
 */
export function legsToTrips(legs: LegDraft[], userId: string, date: string): TripInsert[] {
  return legs.map((leg, ordem) => ({
    leg_order: ordem,
    user_id: userId,
    date,
    origin: leg.origin,
    destination: leg.destination,
    client: leg.client,
    transport: leg.transport,
    line: leg.line?.trim() || null,
    card: leg.card,
    value: leg.value,
  }))
}

/**
 * Descobre qual parte do dia é a ida, para poder virar um local salvo.
 *
 * Um dia lançado com volta é a ida seguida do seu espelho. Reconhecer o
 * espelho é mais honesto do que cortar o dia ao meio ou confiar no cliente
 * 'Residência': quem lançou dois clientes num dia sem voltar para casa
 * escreveria 'Residência' na ida e o corte sairia errado.
 *
 * Sem espelho, o dia inteiro é a ida — é o caso de quem foi e não voltou.
 */
export function outboundOf<T extends Pick<LegDraft, 'origin' | 'destination' | 'transport'>>(
  legs: T[],
): T[] {
  if (legs.length < 2 || legs.length % 2 !== 0) return legs

  const meio = legs.length / 2
  const ida = legs.slice(0, meio)
  const volta = legs.slice(meio)

  const espelhado = ida.every((leg, indice) => {
    const par = volta[volta.length - 1 - indice]
    return (
      par.origin === leg.destination &&
      par.destination === leg.origin &&
      par.transport === leg.transport
    )
  })

  return espelhado ? ida : legs
}
