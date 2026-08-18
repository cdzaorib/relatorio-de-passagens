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
      <h1 className="text-2xl font-bold text-slate-900">Algo deu errado</h1>

      <Alert variant="error">
        Não conseguimos carregar esta tela agora. Seus lançamentos estão a
        salvo — o problema foi ao buscar os dados.
      </Alert>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          Tentar de novo
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Voltar ao início
        </a>
      </div>

      {error.digest ? (
        <p className="text-xs text-slate-400">Código do erro: {error.digest}</p>
      ) : null}
    </div>
  )
}
