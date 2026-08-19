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

  // Nunca cair no e-mail: ele iria para o HTML de toda página do painel e
  // ficaria visível no código-fonte e no console. Só o nome do perfil.
  const displayName = profile?.name?.trim() || 'Minha conta'

  return (
    <div className="min-h-screen">
      {/* Primeiro item do teclado: pula o menu e vai direto ao conteúdo. */}
      <a
        href="#conteudo"
        className="pular-para-conteudo letreiro rounded-lg bg-ink px-4 py-2 text-sm text-paper"
      >
        Pular para o conteúdo
      </a>

      <header className="no-print border-b-2 border-marca bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/dashboard" className="letreiro text-base tracking-[0.14em]">
              <span className="sm:hidden">Passagens</span>
              <span className="hidden sm:inline">Reembolso de passagem</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-paper/70 sm:inline">{displayName}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="letreiro rounded border border-paper/25 px-2.5 py-1 text-xs text-paper/90 transition hover:bg-paper/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-1 text-sm">
            {[
              { href: '/dashboard', label: 'Relatório' },
              { href: '/dashboard/trips', label: 'Trechos' },
              { href: '/dashboard/locais', label: 'Locais' },
              { href: '/dashboard/perfil', label: 'Perfil' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="letreiro rounded px-2.5 py-1.5 text-xs whitespace-nowrap text-paper/70 transition hover:bg-paper/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
