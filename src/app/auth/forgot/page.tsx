import type { Metadata } from 'next'
import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

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
        <Link href="/auth/login" className="font-medium text-barca hover:text-barca/80">
          Voltar para o login
        </Link>
      </p>
    </div>
  )
}
