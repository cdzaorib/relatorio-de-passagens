import { todayISO } from '@/lib/format'

/** Intervalo de datas do relatório, em ISO (yyyy-mm-dd). */
export type Period = { from: string; to: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Último dia do mês da data informada. */
export function lastDayOfMonth(iso: string): string {
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
export function currentHalfMonth(iso: string = todayISO()): Period {
  const day = Number(iso.split('-')[2])
  const { first, second } = halfMonths(iso)
  return day <= 15 ? first : second
}

/**
 * Lê o período da URL.
 * Só aceita quando as duas datas vieram e são válidas — completar só uma
 * metade produziria intervalo atravessando meses sem o usuário pedir. Fora
 * isso, vale o padrão inteiro. Intervalo invertido é endireitado, em vez de
 * devolver relatório vazio.
 */
export function parsePeriod(
  params: { de?: string; ate?: string },
  today: string = todayISO(),
): Period {
  const from = params.de ?? ''
  const to = params.ate ?? ''

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return currentHalfMonth(today)
  }

  return from <= to ? { from, to } : { from: to, to: from }
}

/** '2026-07-01' + '2026-07-15' → '01/07 a 15/07'. */
export function formatPeriodLabel({ from, to }: Period): string {
  const short = (iso: string) => {
    const [, month, day] = iso.split('-')
    return `${day}/${month}`
  }
  return `${short(from)} a ${short(to)}`
}

/** Monta a URL do dashboard para um período. */
export function periodHref({ from, to }: Period): string {
  return `/dashboard?de=${from}&ate=${to}`
}
