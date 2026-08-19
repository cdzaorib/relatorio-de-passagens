type AlertProps = {
  variant: 'error' | 'success' | 'info'
  children: React.ReactNode
}

const STYLES: Record<AlertProps['variant'], string> = {
  error: 'border-alerta/30 bg-alerta-soft text-alerta',
  success: 'border-ok/30 bg-ok-soft text-ok',
  info: 'border-line bg-paper text-ink-soft',
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border-l-4 px-4 py-3 text-sm leading-relaxed ${STYLES[variant]}`}
    >
      {children}
    </div>
  )
}
