import Link from 'next/link'

type EmptyStateProps = {
  titulo: string
  descricao: string
  acao?: { href: string; label: string }
}

/**
 * Tela vazia é convite para agir, não aviso de ausência: diz o que fazer e
 * leva para o lugar certo, em vez de só informar que não há nada.
 */
export function EmptyState({ titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="letreiro text-sm text-ink">{titulo}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{descricao}</p>

      {acao ? (
        <Link
          href={acao.href}
          className="letreiro mt-1 rounded-lg bg-ink px-4 py-2 text-sm text-paper transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {acao.label}
        </Link>
      ) : null}
    </div>
  )
}
