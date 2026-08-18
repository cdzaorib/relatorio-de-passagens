'use client'

import { useId } from 'react'

type TextFieldProps = React.ComponentProps<'input'> & {
  label: string
  name: string
  hint?: string
  /** Mensagem do campo vinda da validação do servidor. */
  error?: string | null
  /** Liga o autocomplete nativo do navegador com valores já usados. */
  suggestions?: string[]
}

/**
 * Campo de texto com rótulo, dica, autocomplete e estado de erro.
 * O erro marca o input com aria-invalid e substitui a dica, para o leitor de
 * tela e a pessoa que enxerga receberem a mesma informação no mesmo lugar.
 */
export function TextField({
  label,
  name,
  hint,
  error,
  suggestions,
  className = '',
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = props.id ?? `${name}-${generatedId}`
  const listId = suggestions?.length ? `${inputId}-options` : undefined
  const messageId = error || hint ? `${inputId}-message` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        name={name}
        list={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 disabled:bg-slate-100 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
        } ${className}`}
      />

      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}

      {error || hint ? (
        <p id={messageId} className={`text-xs ${error ? 'text-red-700' : 'text-slate-500'}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
