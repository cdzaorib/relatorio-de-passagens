'use client'

import { useFormStatus } from 'react-dom'

type SubmitButtonProps = {
  children: React.ReactNode
  pendingLabel?: string
}

/**
 * Botão de envio que se desabilita sozinho enquanto a action roda.
 * Usa useFormStatus, então precisa estar dentro do <form>.
 */
export function SubmitButton({ children, pendingLabel = 'Enviando...' }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
