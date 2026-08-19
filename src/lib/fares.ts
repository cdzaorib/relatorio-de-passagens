import type { FarePrice } from '@/types'

/**
 * Tenta achar o número da linha dentro do nome da passagem:
 * 'Ônibus 323' → '323', '143C' → '143C', 'Barca Cocotá' → ''.
 * É só um palpite para adiantar o preenchimento — o campo continua editável.
 */
function guessLineFromLabel(label: string): string {
  const match = label.match(/\b\d+[A-Za-z]?\b/)
  return match ? match[0] : ''
}

/** O que uma passagem escolhida preenche no trecho. */
export function fareToLegValues(fare: FarePrice) {
  return {
    transport: fare.transport,
    card: fare.card,
    value: Number(fare.value),
    line: fare.transport === 'onibus' ? guessLineFromLabel(fare.label) : '',
    fareGroupId: fare.group_id,
  }
}
