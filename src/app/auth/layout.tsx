import Link from 'next/link'

import { SetupPendente } from '@/components/SetupPendente'
import { isSupabaseConfigured } from '@/lib/env'

/** Moldura das telas de autenticação: cartão centralizado. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupPendente />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 text-center text-sm font-semibold tracking-wide text-brand-600 uppercase"
      >
        Reembolso de passagem
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  )
}
