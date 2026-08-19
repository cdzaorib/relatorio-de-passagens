/** Formatação e leitura de valores em reais e datas, tudo em pt-BR. */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** 4.7 → 'R$ 4,70' */
export function formatBRL(value: number): string {
  return BRL.format(value)
}

/** 4.7 → '4,70' — para preencher campo de digitação. */
export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/**
 * Ponto seguido de exatamente três dígitos, sem vírgula na frente: '1.234'.
 * Em português isso é milhar (mil duzentos e trinta e quatro); em inglês é
 * decimal (um vírgula duzentos e trinta e quatro). Não dá para saber qual.
 */
const PONTO_AMBIGUO = /^\d{1,3}(\.\d{3})+$/

/**
 * Lê o valor digitado aceitando os jeitos que a pessoa realmente digita:
 * '4,70', 'R$ 4,70', '4.70', '1.234,56'. Devolve null se não der para ler.
 *
 * Recusa o que for ambíguo em vez de chutar: '1.234' pode ser mil e duzentos
 * ou um e vinte e três, e errar isso em dinheiro é pior do que pedir para a
 * pessoa escrever de novo com vírgula.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .replace(/r\$/gi, '')
    .replace(/\s/g, '')
    .trim()

  if (!cleaned) return null

  let normalized: string

  if (cleaned.includes(',')) {
    // Vírgula é o separador decimal; ponto vira separador de milhar.
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    if (PONTO_AMBIGUO.test(cleaned)) return null
    normalized = cleaned
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null

  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null

  // O banco guarda numeric(10,2).
  return Math.round(value * 100) / 100
}

/** Data ISO ('2026-07-01' ou timestamp) → '01/07/2026'. */
export function formatDate(value: string): string {
  // Data pura não pode passar pelo fuso, senão volta um dia.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value)

  return DATE.format(date)
}

/**
 * Data de hoje no fuso do Rio, em ISO (yyyy-mm-dd).
 * Fixar o fuso evita o servidor em UTC achar que já é amanhã depois das 21h.
 */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/** Data de N dias atrás, no mesmo formato. */
export function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}
