import type { NextRequest } from 'next/server'

import { montaCSP, novoNonce } from '@/lib/csp'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const nonce = novoNonce()
  const csp = montaCSP(nonce, process.env.NODE_ENV === 'production')

  // O nonce vai no cabeçalho da requisição porque é de lá que o Next o lê
  // para carimbar os scripts que ele mesmo injeta na página.
  const headersDaRequisicao = new Headers(request.headers)
  headersDaRequisicao.set('x-nonce', nonce)
  headersDaRequisicao.set('Content-Security-Policy', csp)

  const response = await updateSession(request, headersDaRequisicao)
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos arquivos estáticos e imagens — que não têm sessão
     * para renovar e só gastariam requisição.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
