import type { CardType, TransportType } from '@/types'

/** Um trecho como a linha de percurso precisa dele. */
export type RouteStep = {
  origin: string
  destination: string
  transport: TransportType
  line?: string | null
  card?: CardType
  value?: number
}

/**
 * Uma parada do diagrama: o bairro e o trecho que sai dele.
 * `quebra` marca a parada que começa um percurso novo — quando o trecho
 * seguinte não parte de onde o anterior chegou.
 */
export type RouteStop = {
  bairro: string
  trecho: RouteStep | null
  quebra: boolean
}

/**
 * Transforma trechos em paradas do diagrama.
 *
 * O caso comum é uma corrente: chega em Cocotá, sai de Cocotá. Mas um dia
 * pode ter duas saídas separadas, e aí ligar um ponto ao outro seria desenhar
 * um caminho que não existiu. Quando a origem do trecho não é o destino do
 * anterior, abrimos uma parada nova marcada como quebra.
 */
export function buildRouteStops(steps: RouteStep[]): RouteStop[] {
  if (steps.length === 0) return []

  const paradas: RouteStop[] = []

  steps.forEach((trecho, indice) => {
    const anterior = steps[indice - 1]
    const emendaComAnterior = anterior?.destination === trecho.origin

    if (!emendaComAnterior) {
      // Começo do dia ou de um percurso solto: o ponto de partida aparece.
      paradas.push({ bairro: trecho.origin, trecho, quebra: indice > 0 })
    } else {
      // A parada de chegada do trecho anterior vira a saída deste.
      paradas[paradas.length - 1].trecho = trecho
    }

    paradas.push({ bairro: trecho.destination, trecho: null, quebra: false })
  })

  return paradas
}

/**
 * Quantas saídas separadas o dia tem. Uma é o normal: sai de casa, encadeia as
 * conduções, volta. Duas ou mais podem ser legítimas — foi a um cliente,
 * voltou, saiu de novo — ou podem ser o sinal de que um trecho está com origem
 * ou destino trocado.
 *
 * O app não decide qual dos dois é: ele conta e mostra, e quem lançou sabe.
 */
export function contaSaidas(steps: RouteStep[]): number {
  if (steps.length === 0) return 0

  return buildRouteStops(steps).filter((parada) => parada.quebra).length + 1
}
