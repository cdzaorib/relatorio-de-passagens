import { connection } from 'next/server'
import Link from 'next/link'

export default async function NotFound() {
  /*
   * Espera a requisição existir antes de renderizar, o que tira esta página do
   * pré-render do build. Sem isso ela sairia com o nonce de build — que não
   * vale para nenhuma resposta — e o navegador recusaria os scripts do Next.
   * A página até apareceria, mas cuspindo erro de CSP no console a cada 404.
   */
  await connection()

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <p className="letreiro text-xs text-marca-texto">Erro 404</p>
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
