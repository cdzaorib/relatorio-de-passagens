type AlertProps = {
  variant: 'error' | 'success' | 'info'
  children: React.ReactNode
}

const STYLES: Record<AlertProps['variant'], string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${STYLES[variant]}`}
    >
      {children}
    </div>
  )
}
