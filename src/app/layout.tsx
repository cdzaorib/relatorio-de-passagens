import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google'

import './globals.css'

/** Corpo do texto. */
const corpo = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fonte-corpo',
  display: 'swap',
})

/** Títulos e rótulos: a condensada lembra letreiro de ônibus. */
const condensada = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--fonte-condensada',
  display: 'swap',
})

/** Valores, datas e linhas: monoespaçada alinha número embaixo de número. */
const dados = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fonte-dados',
  display: 'swap',
})

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
  themeColor: '#10222e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${corpo.variable} ${condensada.variable} ${dados.variable}`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  )
}
