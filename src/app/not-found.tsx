import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-wide text-barca uppercase">Erro 404</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Página não encontrada</h1>
      <p className="mt-3 text-muted">
        O endereço que você abriu não existe ou foi movido.
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-ink px-5 py-3 font-medium text-white transition hover:bg-ink-soft"
        >
          Ir para o relatório
        </Link>
      </div>
    </main>
  )
}
