import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/SignupForm'

/*
 * Renderizada a cada requisição, não no build. O CSP usa um nonce novo por
 * resposta, e página pré-renderizada carrega o nonce de quando o build rodou —
 * que já não vale. O navegador então recusa os scripts do próprio Next e a
 * página chega morta. Servir na hora custa quase nada aqui e mantém o CSP
 * inteiro; sem isso, a alternativa seria afrouxar o CSP para todo mundo.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Criar conta' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="letreiro text-2xl text-ink">Criar conta</h1>
        <p className="text-sm leading-relaxed text-muted">
          Leva um minuto. Seus dados ficam só com você.
        </p>
      </div>

      <SignupForm />

      <p className="text-sm leading-relaxed text-muted">
        Já tem conta?{' '}
        <Link href="/auth/login" className="font-medium text-marca-texto hover:text-marca">
          Entrar
        </Link>
      </p>
    </div>
  )
}
