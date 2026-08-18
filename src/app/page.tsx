import Link from 'next/link'

/** Página pública de entrada. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">
        Reembolso de passagem
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Chega de planilha manual
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
        Lance os trechos de ônibus e barca conforme o dia acontece, escolha o
        período e baixe o relatório de reembolso pronto em PDF — no mesmo
        formato que o financeiro já recebe hoje.
      </p>

      <ul className="mt-8 space-y-3 text-slate-700">
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            •
          </span>
          Valores de passagem cadastrados uma vez e reaproveitados, com
          histórico de reajustes.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            •
          </span>
          Volta espelhada gerada automaticamente quando você retorna para o
          mesmo lugar de onde saiu.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            •
          </span>
          Totais separados por RIO CARD e JAÉ, do jeito que a planilha antiga
          fazia.
        </li>
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/auth/login"
          className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          Entrar
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Criar conta
        </Link>
      </div>
    </main>
  )
}
