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

/**
 * Acha a passagem cadastrada que corresponde a um trecho já lançado, para o
 * local salvo a partir dele acompanhar reajuste em vez de congelar o valor.
 *
 * O trecho guarda uma cópia do valor da época, então transporte, cartão e
 * valor idênticos são um sinal forte. Ainda assim só liga quando a resposta é
 * única: com duas passagens do mesmo preço não dá para saber qual foi, e
 * chutar aqui faria o valor de um local mudar sozinho no reajuste da outra.
 */
export function matchFareGroup(
  fares: Pick<FarePrice, 'group_id' | 'transport' | 'card' | 'value'>[],
  leg: { transport: string; card: string; value: number },
): string | null {
  const candidatos = fares.filter(
    (fare) =>
      fare.transport === leg.transport &&
      fare.card === leg.card &&
      Number(fare.value) === leg.value,
  )

  return candidatos.length === 1 ? candidatos[0].group_id : null
}
