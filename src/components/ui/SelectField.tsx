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
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        {...props}
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 shadow-xs outline-none transition ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
        } ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error || hint ? (
        <p id={messageId} className={`text-xs ${error ? 'text-red-700' : 'text-slate-500'}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
