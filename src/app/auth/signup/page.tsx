import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/SignupForm'

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
