import type { Metadata } from 'next'

import { FarePriceForm } from '@/components/perfil/FarePriceForm'
import { FarePriceHistory } from '@/components/perfil/FarePriceHistory'
import { FarePriceList } from '@/components/perfil/FarePriceList'
import { ProfileForm } from '@/components/perfil/ProfileForm'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user!.id

  const [profileResult, activeResult, historyResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('fare_prices')
      .select('*')
      .eq('active', true)
      .order('label', { ascending: true }),
    supabase
      .from('fare_prices')
      .select('*')
      .eq('active', false)
      .order('updated_at', { ascending: false }),
  ])

  const profile = profileResult.data
  const activeFares = activeResult.data ?? []
  const history = historyResult.data ?? []

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Perfil</h1>
        <p className="text-slate-600">
          Seus dados do cabeçalho e os valores das passagens que você usa.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Dados do relatório</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          É o que aparece no cabeçalho de todo relatório gerado.
        </p>
        <ProfileForm profile={profile} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Passagens</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Cadastre o valor uma vez e reaproveite em cada lançamento. Quando
          houver reajuste, use <strong>Editar</strong>: o valor antigo vai para o
          histórico em vez de sumir.
        </p>

        <FarePriceList farePrices={activeFares} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Nova passagem</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Ônibus costuma ser pago no JAÉ e barca no RIO CARD — o cartão vem
          sugerido, mas você troca quando for o caso.
        </p>
        <FarePriceForm />
      </section>

      <FarePriceHistory farePrices={history} />
    </div>
  )
}
