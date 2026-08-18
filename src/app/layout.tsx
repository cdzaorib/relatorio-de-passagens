import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Relatório de Reembolso de Passagem',
    template: '%s · Reembolso de passagem',
  },
  description:
    'Registre os deslocamentos do dia a dia e gere o relatório de reembolso em PDF.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
