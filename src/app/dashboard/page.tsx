import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Início' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, supervisor_name')
    .eq('id', user!.id)
    .maybeSingle()

  const firstName = profile?.name?.split(' ')[0]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          {firstName ? `Olá, ${firstName}` : 'Olá'}
        </h1>
        <p className="text-slate-600">Sua conta está pronta.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Cabeçalho do relatório</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Funcionário</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {profile?.name || <span className="text-slate-400">não preenchido</span>}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Superior imediato</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {profile?.supervisor_name || <span className="text-slate-400">não preenchido</span>}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Próximos passos</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          O lançamento de trechos, os locais salvos, o resumo do período e a
          geração do PDF entram nas próximas etapas. Por enquanto, o que existe
          aqui é a sua conta e o cabeçalho acima.
        </p>
      </section>
    </div>
  )
}
