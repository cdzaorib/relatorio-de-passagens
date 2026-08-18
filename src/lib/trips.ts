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

/** Converte os trechos em registros prontos para o insert. */
export function legsToTrips(legs: LegDraft[], userId: string, date: string): TripInsert[] {
  return legs.map((leg) => ({
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
