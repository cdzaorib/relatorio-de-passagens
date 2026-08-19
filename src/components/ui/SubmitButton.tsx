'use client'

import { useFormStatus } from 'react-dom'

type SubmitButtonProps = {
  children: React.ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'secondary'
  className?: string
}

function Spinner() {
  return (
    <svg className="size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

/** Botão de envio que se desabilita e mostra progresso enquanto a action roda. */
export function SubmitButton({
  children,
  pendingLabel = 'Enviando...',
  variant = 'primary',
  className = '',
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft focus-visible:outline-ink',
    secondary: 'border border-line bg-surface text-ink hover:bg-paper focus-visible:outline-ink',
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`letreiro inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {pending ? <Spinner /> : null}
      {pending ? pendingLabel : children}
    </button>
  )
}
