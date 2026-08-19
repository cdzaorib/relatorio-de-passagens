'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { EMPTY_FORM_STATE, type FormState } from '@/lib/form-state'

/** Botão que muda de rótulo enquanto a exclusão acontece. */
function BotaoExcluir({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? 'Excluindo...' : children}
    </button>
  )
}

type DeleteFormProps = {
  action: (estado: FormState, dados: FormData) => Promise<FormState>
  /** Campos escondidos que identificam o que será excluído. */
  fields: Record<string, string>
  /** Pergunta feita antes de executar. */
  confirmar: string
  children: React.ReactNode
  className?: string
}

/**
 * Exclusão com confirmação e, principalmente, com resposta quando dá errado.
 * Antes a action engolia a falha: a pessoa clicava, nada acontecia e não havia
 * como saber por quê.
 */
export function DeleteForm({
  action,
  fields,
  confirmar,
  children,
  className = '',
}: DeleteFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE)

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        action={formAction}
        onSubmit={(evento) => {
          if (!window.confirm(confirmar)) evento.preventDefault()
        }}
      >
        {Object.entries(fields).map(([nome, valor]) => (
          <input key={nome} type="hidden" name={nome} value={valor} />
        ))}
        <BotaoExcluir className={className}>{children}</BotaoExcluir>
      </form>

      {state.error ? (
        <p role="alert" className="text-right text-xs text-alerta">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}
