import type { Metadata } from 'next'
import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Esqueci minha senha</h1>
        <p className="text-sm text-slate-600">
          Informe seu e-mail e enviamos um link para você criar uma senha nova.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-slate-600">
        <Link href="/auth/login" className="font-medium text-brand-600 hover:text-brand-700">
          Voltar para o login
        </Link>
      </p>
    </div>
  )
}
