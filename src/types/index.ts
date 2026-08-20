import type { CardType, TransportType } from './database'

export * from './database'

/** Rótulos exibidos na interface e no PDF. */
export const TRANSPORT_LABELS: Record<TransportType, string> = {
  onibus: 'Ônibus',
  barca: 'Barca',
  metro: 'Metrô',
  trem: 'Trem',
  vlt: 'VLT',
}

export const CARD_LABELS: Record<CardType, string> = {
  riocard: 'RIO CARD',
  jae: 'JAÉ',
}

export const TRANSPORT_OPTIONS: TransportType[] = ['onibus', 'barca', 'metro', 'trem', 'vlt']
export const CARD_OPTIONS: CardType[] = ['riocard', 'jae']

/**
 * Cartão sugerido por transporte. O ônibus municipal é o único que sai no JAÉ;
 * barca, metrô, trem e VLT saem no RIO CARD.
 *
 * Continua sendo só um pré-preenchimento, e continua valendo a regra: cartão é
 * escolha, não consequência. A linha 143C é ônibus paga no RIO CARD, e nada
 * impede que outra combinação apareça amanhã.
 */
export const DEFAULT_CARD_BY_TRANSPORT: Record<TransportType, CardType> = {
  onibus: 'jae',
  barca: 'riocard',
  metro: 'riocard',
  trem: 'riocard',
  vlt: 'riocard',
}

/**
 * Onde faz sentido escrever a linha. A barca não tem: o trajeto é o próprio
 * par de estações. Metrô, trem e VLT têm — Linha 1, ramal Santa Cruz, VLT 2.
 */
export const TRANSPORTS_WITHOUT_LINE: TransportType[] = ['barca']

export function hasLine(transport: TransportType): boolean {
  return !TRANSPORTS_WITHOUT_LINE.includes(transport)
}

/** Texto usado no campo CLIENTE quando o trecho é a volta para casa (regra 4). */
export const HOME_CLIENT_LABEL = 'Residência'

export function isTransportType(value: unknown): value is TransportType {
  return TRANSPORT_OPTIONS.includes(value as TransportType)
}

export function isCardType(value: unknown): value is CardType {
  return value === 'riocard' || value === 'jae'
}
