'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { parsePeriodParams, periodHref, serializePeriod } from '@/lib/period'

const PERIOD_COOKIE = 'periodo'
const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Guarda o período escolhido e leva para ele.
 * Sem isso, quem fecha de 20 a 04 teria que reescolher as datas toda vez que
 * abrisse o app — o mês nem sempre cabe em quinzenas certinhas.
 */
export async function applyPeriod(formData: FormData): Promise<void> {
  const period = parsePeriodParams({
    de: String(formData.get('de') ?? ''),
    ate: String(formData.get('ate') ?? ''),
  })

  if (!period) {
    redirect('/dashboard')
  }

  const cookieStore = await cookies()
  cookieStore.set(PERIOD_COOKIE, serializePeriod(period), {
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    path: '/',
  })

  redirect(periodHref(period))
}
