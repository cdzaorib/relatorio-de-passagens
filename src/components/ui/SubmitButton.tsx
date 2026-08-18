'use client'

import { useFormStatus } from 'react-dom'

type SubmitButtonProps = {
  children: React.ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'secondary'
  className?: string
}

/** Roda de carregamento em SVG — evita depender de uma biblioteca de ícones. */
function Spinner() {
  return (
    <svg className="size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  )
}

/**
 * Botão de envio que se desabilita e mostra progresso enquanto a action roda.
 * Usa useFormStatus, então precisa estar dentro do <form>.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Enviando...',
  variant = 'primary',
  className = '',
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-100',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-200',
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {pending ? <Spinner /> : null}
      {pending ? pendingLabel : children}
    </button>
  )
}
