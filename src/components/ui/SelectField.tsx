import type { SelectHTMLAttributes } from 'react'

type Option = { value: string; label: string }

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  name: string
  options: Option[]
  hint?: string
}

export function SelectField({
  label,
  name,
  options,
  hint,
  className = '',
  ...props
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
