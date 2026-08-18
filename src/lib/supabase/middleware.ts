import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env'
import type { Database } from '@/types/database'

/** Rotas que exigem login. */
const PROTECTED_PREFIXES = ['/dashboard']

/**
 * Rotas de auth que continuam acessíveis mesmo logado:
 * - /auth/reset: o link de recuperação já cria uma sessão, então quem chega
 *   aqui está "logado" e precisa ver o formulário de nova senha;
 * - /auth/confirm: é a rota que troca o token pela sessão.
 */
const AUTH_ROUTES_ALLOWED_WHEN_LOGGED_IN = ['/auth/reset', '/auth/confirm']

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Renova a sessão a cada requisição e faz o controle de acesso.
 * Precisa devolver a resposta que carrega os cookies atualizados — criar uma
 * NextResponse nova depois daqui perderia a sessão renovada.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() valida o token no servidor. Não troque por getSession(), que
  // confia no cookie sem checar.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Sem login em rota protegida: manda para o login guardando o destino.
  if (!user && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Já logado tentando ver login/cadastro: vai direto para o dashboard.
  if (
    user &&
    pathname.startsWith('/auth') &&
    !startsWithAny(pathname, AUTH_ROUTES_ALLOWED_WHEN_LOGGED_IN)
  ) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}
