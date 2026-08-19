import type { Metadata } from 'next'

import { FarePriceForm } from '@/components/perfil/FarePriceForm'
import { FarePriceHistory } from '@/components/perfil/FarePriceHistory'
import { FarePriceList } from '@/components/perfil/FarePriceList'
import { ProfileForm } from '@/components/perfil/ProfileForm'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
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
        <h1 className="letreiro text-3xl leading-none text-ink">Perfil</h1>
        <p className="text-muted">
          Seus dados do cabeçalho e os valores das passagens que você usa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do relatório</CardTitle>
          <CardDescription>É o que aparece no cabeçalho de todo relatório gerado.</CardDescription>
        </CardHeader>
        <ProfileForm profile={profile} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passagens</CardTitle>
          <CardDescription>
            Cadastre o valor uma vez e reaproveite em cada lançamento. Quando
            houver reajuste, use <strong>Editar</strong>: o valor antigo vai para
            o histórico em vez de sumir.
          </CardDescription>
        </CardHeader>
        <FarePriceList farePrices={activeFares} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova passagem</CardTitle>
          <CardDescription>
            Ônibus costuma ser pago no JAÉ e barca no RIO CARD — o cartão vem
            sugerido, mas você troca quando for o caso.
          </CardDescription>
        </CardHeader>
        <FarePriceForm />
      </Card>

      <FarePriceHistory farePrices={history} />
    </div>
  )
}
