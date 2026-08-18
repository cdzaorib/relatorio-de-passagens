import type { CardType, TransportType } from './database'

export * from './database'

/** Rótulos exibidos na interface e no PDF. */
export const TRANSPORT_LABELS: Record<TransportType, string> = {
  onibus: 'Ônibus',
  barca: 'Barca',
}

export const CARD_LABELS: Record<CardType, string> = {
  riocard: 'RIO CARD',
  jae: 'JAÉ',
}

export const TRANSPORT_OPTIONS: TransportType[] = ['onibus', 'barca']
export const CARD_OPTIONS: CardType[] = ['riocard', 'jae']

/**
 * Cartão padrão por transporte (regra 2): ônibus paga no JAÉ e barca no
 * RIO CARD. É só um pré-preenchimento — o usuário pode trocar no formulário.
 */
export const DEFAULT_CARD_BY_TRANSPORT: Record<TransportType, CardType> = {
  onibus: 'jae',
  barca: 'riocard',
}

/** Texto usado no campo CLIENTE quando o trecho é a volta para casa (regra 4). */
export const HOME_CLIENT_LABEL = 'Residência'

export function isTransportType(value: unknown): value is TransportType {
  return value === 'onibus' || value === 'barca'
}

export function isCardType(value: unknown): value is CardType {
  return value === 'riocard' || value === 'jae'
}
