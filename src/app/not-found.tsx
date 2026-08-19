import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <p className="letreiro text-xs text-barca">Erro 404</p>
      <h1 className="letreiro mt-3 text-3xl text-ink">Página não encontrada</h1>
      <p className="mt-3 text-muted">
        O endereço que você abriu não existe ou foi movido.
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-ink letreiro px-5 py-3 text-paper transition hover:bg-ink-soft"
        >
          Ir para o relatório
        </Link>
      </div>
    </main>
  )
}
