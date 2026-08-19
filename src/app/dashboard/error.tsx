'use client'

import { useEffect } from 'react'

import { Alert } from '@/components/ui/Alert'

/**
 * Rede caiu, banco fora do ar, consulta que falhou: em vez de tela branca,
 * a pessoa vê o que houve e consegue tentar de novo sem perder o login.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro no dashboard:', error)
  }, [error])

  return (
    <div className="space-y-6">
      <h1 className="letreiro text-2xl text-ink">Algo deu errado</h1>

      <Alert variant="error">
        Não conseguimos carregar esta tela agora. Seus lançamentos estão a
        salvo — o problema foi ao buscar os dados.
      </Alert>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink letreiro px-4 py-2.5 text-sm text-paper transition hover:bg-ink-soft"
        >
          Tentar de novo
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-line letreiro px-4 py-2.5 text-sm text-ink transition hover:bg-paper"
        >
          Voltar ao início
        </a>
      </div>

      {error.digest ? (
        <p className="text-xs text-muted/60">Código do erro: {error.digest}</p>
      ) : null}
    </div>
  )
}
