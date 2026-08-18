import { redirect } from 'next/navigation'
import Link from 'next/link'

import { logout } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="font-semibold text-slate-900">
              Reembolso de passagem
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-600 transition hover:text-slate-900">
                Início
              </Link>
              <Link
                href="/dashboard/trips"
                className="text-slate-600 transition hover:text-slate-900"
              >
                Trechos
              </Link>
              <Link
                href="/dashboard/locais"
                className="text-slate-600 transition hover:text-slate-900"
              >
                Locais
              </Link>
              <Link
                href="/dashboard/perfil"
                className="text-slate-600 transition hover:text-slate-900"
              >
                Perfil
              </Link>
            </nav>
          </div>

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
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
