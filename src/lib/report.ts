import type { CardType, Trip } from '@/types'

/** Números do rodapé do relatório. */
export type ReportTotals = {
  riocard: number
  jae: number
  total: number
  tripCount: number
  dayCount: number
}

/** Soma os trechos separando por cartão, como o rodapé da planilha. */
export function summarize(trips: Trip[]): ReportTotals {
  const totals: Record<CardType, number> = { riocard: 0, jae: 0 }
  const days = new Set<string>()

  for (const trip of trips) {
    totals[trip.card] += Number(trip.value)
    days.add(trip.date)
  }

  // Centavos somados como float acumulam sujeira; arredonda no fim.
  const round = (value: number) => Math.round(value * 100) / 100

  return {
    riocard: round(totals.riocard),
    jae: round(totals.jae),
    total: round(totals.riocard + totals.jae),
    tripCount: trips.length,
    dayCount: days.size,
  }
}
