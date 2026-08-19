/** Blocos de conteúdo: superfície branca sobre o papel, borda fina, sem sombra pesada. */

type CardProps = React.ComponentProps<'section'> & {
  tone?: 'default' | 'accent'
}

export function Card({ tone = 'default', className = '', ...props }: CardProps) {
  const tones = {
    default: 'border-line bg-surface',
    accent: 'border-barca/25 bg-barca-soft',
  }

  return <section className={`rounded-xl border p-5 sm:p-6 ${tones[tone]} ${className}`} {...props} />
}

export function CardHeader({ className = '', ...props }: React.ComponentProps<'div'>) {
  return <div className={`mb-5 flex flex-col gap-1.5 ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={`letreiro text-lg text-ink ${className}`} {...props} />
}

export function CardDescription({ className = '', ...props }: React.ComponentProps<'p'>) {
  return <p className={`text-sm leading-relaxed text-muted ${className}`} {...props} />
}
