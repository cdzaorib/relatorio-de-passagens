import type { Metadata } from 'next'
import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

/*
 * Renderizada a cada requisição, não no build. O CSP usa um nonce novo por
 * resposta, e página pré-renderizada carrega o nonce de quando o build rodou —
 * que já não vale. O navegador então recusa os scripts do próprio Next e a
 * página chega morta. Servir na hora custa quase nada aqui e mantém o CSP
 * inteiro; sem isso, a alternativa seria afrouxar o CSP para todo mundo.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="letreiro text-2xl text-ink">Esqueci minha senha</h1>
        <p className="text-sm leading-relaxed text-muted">
          Informe seu e-mail e enviamos um link para você criar uma senha nova.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm leading-relaxed text-muted">
        <Link href="/auth/login" className="font-medium text-marca-texto hover:text-marca">
          Voltar para o login
        </Link>
      </p>
    </div>
  )
}
