/**
 * Blocos de conteúdo do app. Antes cada página repetia as mesmas classes de
 * borda e espaçamento na mão; agora o cartão é uma peça só.
 */

type CardProps = React.ComponentProps<'section'> & {
  /** Destaca o cartão principal da tela. */
  tone?: 'default' | 'accent'
}

export function Card({ tone = 'default', className = '', ...props }: CardProps) {
  const tones = {
    default: 'border-slate-200 bg-white',
    accent: 'border-brand-100 bg-brand-50/40',
  }

  return (
    <section className={`rounded-xl border p-6 ${tones[tone]} ${className}`} {...props} />
  )
}

export function CardHeader({ className = '', ...props }: React.ComponentProps<'div'>) {
  return <div className={`mb-5 flex flex-col gap-1 ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={`font-semibold text-slate-900 ${className}`} {...props} />
}

export function CardDescription({ className = '', ...props }: React.ComponentProps<'p'>) {
  return <p className={`text-sm leading-relaxed text-slate-600 ${className}`} {...props} />
}
