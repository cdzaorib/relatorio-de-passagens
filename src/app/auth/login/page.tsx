import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/auth/LoginForm'
import { Alert } from '@/components/ui/Alert'
import { safeRedirectPath } from '@/lib/validation'

export const metadata: Metadata = { title: 'Entrar' }

type PageProps = {
  searchParams: Promise<{ redirect?: string; erro?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const redirectTo = safeRedirectPath(params.redirect)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="letreiro text-2xl text-ink">Entrar</h1>
        <p className="text-sm leading-relaxed text-muted">Acesse para lançar seus trechos do período.</p>
      </div>

      {params.erro === 'link-invalido' ? (
        <Alert variant="error">
          Esse link expirou ou já foi usado. Peça um novo em &quot;Esqueci minha senha&quot;.
        </Alert>
      ) : null}

      <LoginForm redirectTo={redirectTo} />

      <div className="space-y-2 text-sm text-muted">
        <p>
          <Link href="/auth/forgot" className="font-medium text-marca-texto hover:text-marca">
            Esqueci minha senha
          </Link>
        </p>
        <p>
          Ainda não tem conta?{' '}
          <Link href="/auth/signup" className="font-medium text-marca-texto hover:text-marca">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
