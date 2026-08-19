import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { Alert } from '@/components/ui/Alert'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Nova senha' }

/**
 * Só chega aqui quem veio do link do e-mail — o /auth/confirm já trocou o
 * token por uma sessão. Sem sessão, o link expirou ou já foi usado.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="letreiro text-2xl text-ink">Link expirado</h1>

        <Alert variant="error">
          Esse link de redefinição não vale mais. Cada link funciona uma vez só e
          expira em uma hora.
        </Alert>

        <Link
          href="/auth/forgot"
          className="letreiro inline-block rounded-lg bg-ink px-4 py-2.5 text-sm text-paper transition hover:bg-ink-soft"
        >
          Pedir um novo link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="letreiro text-2xl text-ink">Nova senha</h1>
        <p className="text-sm leading-relaxed text-muted">
          Escolha a senha da conta <strong className="text-ink">{user.email}</strong>.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  )
}
