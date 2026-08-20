import { todayISO } from '@/lib/format'

/** Intervalo de datas do relatório, em ISO (yyyy-mm-dd). */
export type Period = { from: string; to: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Data que existe de verdade, não só bem formada.
 *
 * O formato sozinho aceita 2026-13-45, e o período vem da URL, que qualquer
 * um edita. Uma data impossível seguia para a consulta e o Postgres recusava:
 * a tela do relatório inteira quebrava por causa de um endereço mal digitado,
 * quando o certo é cair no período padrão.
 *
 * A volta pelo Date confere: 2026-02-31 vira 3 de março e o texto não bate
 * mais com o original.
 */
function dataExiste(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false

  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  )
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Último dia do mês da data informada. */
function lastDayOfMonth(iso: string): string {
  const [year, month] = iso.split('-').map(Number)
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${pad(month)}-${pad(day)}`
}

/**
 * As duas quinzenas do mês da data informada.
 * O fechamento costuma ser assim: dia 1 ao 15, e 16 até o fim do mês.
 */
export function halfMonths(iso: string): { first: Period; second: Period; whole: Period } {
  const [year, month] = iso.split('-').map(Number)
  const prefix = `${year}-${pad(month)}`
  const last = lastDayOfMonth(iso)

  return {
    first: { from: `${prefix}-01`, to: `${prefix}-15` },
    second: { from: `${prefix}-16`, to: last },
    whole: { from: `${prefix}-01`, to: last },
  }
}

/** A quinzena em que a data cai — o padrão de quem abre o app hoje. */
function currentHalfMonth(iso: string = todayISO()): Period {
  const day = Number(iso.split('-')[2])
  const { first, second } = halfMonths(iso)
  return day <= 15 ? first : second
}

/** Endireita o intervalo: escolher de 15/07 até 01/07 vale como 01/07 a 15/07. */
function normalize(from: string, to: string): Period {
  return from <= to ? { from, to } : { from: to, to: from }
}

/**
 * Período vindo da URL.
 * Só vale com as duas datas presentes e válidas — completar só uma metade
 * produziria intervalo atravessando meses sem ninguém ter pedido.
 */
export function parsePeriodParams(params: { de?: string; ate?: string }): Period | null {
  const from = params.de ?? ''
  const to = params.ate ?? ''

  if (!dataExiste(from) || !dataExiste(to)) return null

  return normalize(from, to)
}

/** Período guardado no cookie, no formato 'yyyy-mm-dd..yyyy-mm-dd'. */
function parseStoredPeriod(raw: string | undefined): Period | null {
  if (!raw) return null

  const [from, to] = raw.split('..')
  if (!dataExiste(from ?? '') || !dataExiste(to ?? '')) return null

  return normalize(from, to)
}

export function serializePeriod({ from, to }: Period): string {
  return `${from}..${to}`
}

/**
 * Qual período mostrar, em ordem de prioridade:
 * o que está na URL, o último que a pessoa escolheu, e só então a quinzena
 * de hoje. Assim quem fecha de 20 a 04 não reescolhe as datas toda vez.
 */
export function resolvePeriod(
  params: { de?: string; ate?: string },
  stored: string | undefined,
  today: string = todayISO(),
): Period {
  return parsePeriodParams(params) ?? parseStoredPeriod(stored) ?? currentHalfMonth(today)
}

/** '2026-07-01' + '2026-07-15' → '01/07 a 15/07'. */
export function formatPeriodLabel({ from, to }: Period): string {
  const short = (iso: string) => {
    const [, month, day] = iso.split('-')
    return `${day}/${month}`
  }
  return `${short(from)} a ${short(to)}`
}

/** Query string do período: '?de=2026-08-01&ate=2026-08-15'. */
export function periodQuery({ from, to }: Period): string {
  return `?de=${from}&ate=${to}`
}

/** Monta a URL do dashboard para um período. */
export function periodHref(period: Period): string {
  return `/dashboard${periodQuery(period)}`
}
