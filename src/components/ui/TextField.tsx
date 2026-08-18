'use client'

import { useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  hint?: string
  /** Liga o autocomplete nativo do navegador com valores já usados. */
  suggestions?: string[]
}

/** Campo de texto com rótulo, dica e autocomplete opcional. */
export function TextField({
  label,
  name,
  hint,
  suggestions,
  className = '',
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = props.id ?? `${name}-${generatedId}`
  const listId = suggestions?.length ? `${inputId}-options` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        name={name}
        list={listId}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 ${className}`}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
