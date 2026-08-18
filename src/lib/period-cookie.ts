import 'server-only'

import { cookies } from 'next/headers'

export const PERIOD_COOKIE = 'periodo'

/** Último período escolhido, se houver. */
export async function readStoredPeriod(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(PERIOD_COOKIE)?.value
}
