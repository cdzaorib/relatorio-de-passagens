import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Criar conta' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="text-sm text-slate-600">
          Leva um minuto. Seus dados ficam só com você.
        </p>
      </div>

      <SignupForm />

      <p className="text-sm text-slate-600">
        Já tem conta?{' '}
        <Link href="/auth/login" className="font-medium text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </div>
  )
}
