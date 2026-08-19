import Link from 'next/link'

import { SetupPendente } from '@/components/SetupPendente'
import { isSupabaseConfigured } from '@/lib/env'

/** Moldura das telas de autenticação: cartão centralizado. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupPendente />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="letreiro mb-6 text-center text-xs text-barca">
        Reembolso de passagem
      </Link>

      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
        {children}
      </div>
    </div>
  )
}
