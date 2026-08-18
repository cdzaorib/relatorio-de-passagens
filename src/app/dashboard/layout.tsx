import { redirect } from 'next/navigation'
import Link from 'next/link'

import { logout } from '@/app/auth/actions'
import { SetupPendente } from '@/components/SetupPendente'
import { isSupabaseConfigured } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupPendente />

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // O middleware já barra quem não está logado; aqui é a segunda tranca.
  if (!user) {
    redirect('/auth/login?redirect=/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.name || user.email || 'Você'

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* No celular o nome curto cabe; a partir de sm aparece inteiro. */}
            <Link href="/dashboard" className="font-semibold text-slate-900">
              <span className="sm:hidden">Passagens</span>
              <span className="hidden sm:inline">Reembolso de passagem</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-600 sm:inline">{displayName}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          <nav className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto text-sm sm:mt-1">
            {[
              { href: '/dashboard', label: 'Início' },
              { href: '/dashboard/trips', label: 'Trechos' },
              { href: '/dashboard/locais', label: 'Locais' },
              { href: '/dashboard/perfil', label: 'Perfil' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-1 whitespace-nowrap text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
