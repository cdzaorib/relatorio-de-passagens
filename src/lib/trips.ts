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

/** O que basta saber de um trecho para pô-lo em ordem. */
type Ordenavel = {
  id?: string
  date: string
  created_at: string
  leg_order?: number | null
}

/**
 * Põe os trechos na ordem do lançamento, em JavaScript.
 *
 * Fazer isso no SQL exigiria que a coluna leg_order existisse, e um banco que
 * ainda não migrou recusa a consulta inteira — o app inteiro fica sem ler nada
 * por causa de um desempate. Aqui a coluna é opcional: sem ela a ordem só cai
 * para created_at, que é o comportamento antigo, em vez de quebrar.
 *
 * Nenhuma consulta do app é paginada — a tela busca o período inteiro —, então
 * ordenar depois de buscar dá exatamente o mesmo resultado que ordenar no
 * banco.
 */
export function ordenaTrechos<T extends Ordenavel>(trips: T[], recentesPrimeiro = false): T[] {
  const sinal = recentesPrimeiro ? -1 : 1

  return [...trips].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -sinal : sinal

    // Dentro do dia a ordem é sempre a do lançamento: a ida antes da volta,
    // mesmo quando a lista mostra os dias do mais novo para o mais velho.
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1

    const posicao = (a.leg_order ?? 0) - (b.leg_order ?? 0)
    if (posicao !== 0) return posicao

    /*
     * Último desempate, pelo id. Sem ele, dois trechos com created_at igual e
     * sem leg_order ficam na ordem em que o banco devolveu — que não é
     * garantida e pode mudar de um carregamento para o outro. O relatório
     * trocaria de ordem sozinho entre dois downloads do mesmo período, e um
     * documento que muda sozinho é um documento em que ninguém confia.
     *
     * A ordem que sai daqui é arbitrária, mas é sempre a mesma.
     */
    return (a.id ?? '') < (b.id ?? '') ? -1 : (a.id ?? '') > (b.id ?? '') ? 1 : 0
  })
}

/**
 * Diz se o banco ainda não tem a coluna de ordem, sem custar consulta.
 *
 * Agora que a leitura não pede mais leg_order ao banco, nada falha — e o que
 * não falha não avisa. Sem isto a migração ficaria esquecida para sempre, com
 * a ida e a volta trocando de lugar de vez em quando e ninguém sabendo por
 * quê.
 *
 * `select('*')` traz todas as colunas: se a coluna existisse, viria em toda
 * linha, nem que fosse com o zero do default. Indefinida em todas quer dizer
 * que ela não está lá.
 */
export function faltaLegOrder(trips: { leg_order?: number | null }[]): boolean {
  return trips.length > 0 && trips.every((trip) => trip.leg_order === undefined)
}

/**
 * Diz se a ordem de um dia é realmente ambígua.
 *
 * Sem `leg_order`, a ordem sai de `created_at` — e isso só é insuficiente
 * quando dois trechos do dia nasceram no mesmo instante, o que acontece
 * quando eles entraram no banco num insert único: `now()` é o horário da
 * transação, não do comando.
 *
 * Um dia gravado um trecho de cada vez — o caminho de contingência de hoje —
 * tem `created_at` distintos e crescentes, então a ordem está certa mesmo sem
 * a coluna. Avisar sobre ele seria assustar à toa, e aviso que assusta à toa
 * é aviso que se aprende a ignorar.
 */
export function ordemAmbigua(trips: { created_at: string; leg_order?: number | null }[]): boolean {
  if (trips.length < 2) return false

  // Com a coluna presente não há ambiguidade: ela é o desempate.
  if (trips.some((trip) => trip.leg_order !== undefined)) return false

  return new Set(trips.map((trip) => trip.created_at)).size < trips.length
}
