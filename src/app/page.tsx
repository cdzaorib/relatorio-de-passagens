import Link from 'next/link'

import { RouteLine } from '@/components/ui/RouteLine'

/** Um dia comum, desenhado: é o que o app faz em uma olhada. */
const DIA_EXEMPLO = [
  { origin: 'Bananal', destination: 'Cocotá', transport: 'onibus' as const, line: '323', value: 4.7 },
  { origin: 'Cocotá', destination: 'Praça XV', transport: 'barca' as const, value: 5 },
  { origin: 'Praça XV', destination: 'Cocotá', transport: 'barca' as const, value: 5 },
  { origin: 'Cocotá', destination: 'Bananal', transport: 'onibus' as const, line: '323', value: 4.7 },
]

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-16 sm:px-6">
      <p className="letreiro text-xs text-marca-texto">Reembolso de passagem</p>

      <h1 className="letreiro mt-3 text-5xl leading-[0.95] text-ink sm:text-6xl">
        Quatro trechos,
        <br />
        dois cliques
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        Um dia de trabalho são quatro conduções e quatro linhas na planilha. Aqui
        você salva o caminho uma vez e, no dia, escolhe o local e a data — a ida
        entra e a volta vem espelhada.
      </p>

      {/* O dia como linha de percurso: mostra o produto em vez de descrevê-lo. */}
      <div className="mt-10 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <p className="letreiro text-[0.7rem] text-muted">Terça, 3 de agosto</p>
          <p className="dados text-sm text-ink">R$ 19,40</p>
        </div>
        <RouteLine steps={DIA_EXEMPLO} />
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { titulo: 'Preço uma vez só', texto: 'Cadastre a tarifa e reaproveite. No reajuste, o valor antigo vira histórico.' },
          { titulo: 'Cartão certo', texto: 'Ônibus no Jaé, barca no Rio Card — e dá para trocar quando a linha fugir da regra.' },
          { titulo: 'PDF no fim', texto: 'Escolha o período, confira na tela e baixe pronto para o financeiro.' },
        ].map((item) => (
          <li key={item.titulo} className="border-t-2 border-ink pt-3">
            <p className="letreiro text-xs text-ink">{item.titulo}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.texto}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/auth/login"
          className="letreiro rounded-lg bg-ink px-6 py-3 text-paper transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Entrar
        </Link>
        <Link
          href="/auth/signup"
          className="letreiro rounded-lg border border-line bg-surface px-6 py-3 text-ink transition hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Criar conta
        </Link>
      </div>
    </main>
  )
}
