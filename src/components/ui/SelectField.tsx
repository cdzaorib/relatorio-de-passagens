'use client'

import { useId } from 'react'

type Option = { value: string; label: string }

type SelectFieldProps = React.ComponentProps<'select'> & {
  label: string
  name: string
  options: Option[]
  hint?: string
  error?: string | null
}

/** Select nativo: funciona sem JavaScript e abre o seletor do sistema no celular. */
export function SelectField({
  label,
  name,
  options,
  hint,
  error,
  className = '',
  ...props
}: SelectFieldProps) {
  const generatedId = useId()
  const selectId = props.id ?? `${name}-${generatedId}`
  const messageId = error || hint ? `${selectId}-message` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="letreiro text-xs text-muted">
        {label}
      </label>

      <select
        {...props}
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`w-full appearance-none rounded-lg border bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="%235b6b72" stroke-width="1.5"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>')] bg-[length:12px] bg-[position:right_0.85rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-ink outline-none transition ${
          error
            ? 'border-alerta focus:ring-2 focus:ring-alerta/20'
            : 'border-line focus:border-barca focus:ring-2 focus:ring-barca/15'
        } ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error || hint ? (
        <p id={messageId} className={`text-xs ${error ? 'text-alerta' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
