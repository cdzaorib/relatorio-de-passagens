'use client'

import { useId } from 'react'

type TextFieldProps = React.ComponentProps<'input'> & {
  label: string
  name: string
  hint?: string
  error?: string | null
  /** Liga o autocomplete nativo do navegador com valores já usados. */
  suggestions?: string[]
  /** Valores numéricos ficam na monoespaçada. */
  data?: boolean
}

export function TextField({
  label,
  name,
  hint,
  error,
  suggestions,
  data = false,
  className = '',
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = props.id ?? `${name}-${generatedId}`
  const listId = suggestions?.length ? `${inputId}-options` : undefined
  const messageId = error || hint ? `${inputId}-message` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="letreiro text-xs text-muted">
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        name={name}
        list={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-ink outline-none transition placeholder:text-muted/50 disabled:bg-paper ${
          data ? 'dados' : ''
        } ${
          error
            ? 'border-alerta focus:ring-2 focus:ring-alerta/20'
            : 'border-line focus:border-marca focus:ring-2 focus:ring-marca/20'
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
        <p id={messageId} className={`text-xs ${error ? 'text-alerta' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
