import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/validation'

const VALID_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && VALID_TYPES.includes(value as EmailOtpType)
}

/**
 * Ponto de entrada dos links de e-mail (confirmação de cadastro e
 * redefinição de senha). Troca o token por uma sessão em cookie e manda o
 * usuário para o destino. Aceita os dois formatos:
 *   - token_hash + type  → links gerados por nós (Resend) e templates novos
 *   - code               → fluxo PKCE do próprio Supabase
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeRedirectPath(searchParams.get('next'))
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  const supabase = await createClient()

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Link inválido, expirado ou já usado.
  const failureUrl = new URL('/auth/login', origin)
  failureUrl.searchParams.set('erro', 'link-invalido')
  return NextResponse.redirect(failureUrl)
}
