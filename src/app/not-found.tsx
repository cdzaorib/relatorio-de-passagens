import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Erro 404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="mt-3 text-slate-600">
        O endereço que você abriu não existe ou foi movido.
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          Ir para o relatório
        </Link>
      </div>
    </main>
  )
}
