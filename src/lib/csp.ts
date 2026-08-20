/**
 * Content-Security-Policy com nonce por requisição.
 *
 * O app não tem superfície óbvia de XSS: nada de innerHTML, nenhum script de
 * terceiro, e todo texto sai pelo React, que escapa sozinho. O CSP é a rede
 * embaixo disso — se um dia algum texto do usuário escapar para o HTML, ele
 * limita o estrago a quase nada.
 *
 * O que cada regra evita, em concreto:
 *
 * - `script-src` com nonce: script injetado no HTML não roda, porque não tem
 *   como adivinhar o nonce, que muda a cada resposta.
 * - `connect-src 'self'`: nada de mandar dado para fora. Este app pode ser
 *   assim restrito porque nenhum componente de cliente fala com o Supabase —
 *   o browser só conversa com a própria origem.
 * - `form-action 'self'`: formulário injetado não consegue postar a senha
 *   digitada para outro servidor.
 * - `base-uri 'self'`: sem `<base>` injetado reescrevendo todo caminho
 *   relativo da página para um domínio alheio.
 * - `frame-ancestors 'none'`: a versão moderna do X-Frame-Options.
 */
export function montaCSP(nonce: string, producao: boolean): string {
  const regras = [
    "default-src 'self'",
    /*
     * 'strict-dynamic' faz o navegador confiar no que os scripts com nonce
     * carregarem depois — é o que permite ao Next puxar os próprios chunks
     * sem precisar listar cada arquivo. Em desenvolvimento o HMR precisa de
     * eval; em produção, não.
     */
    producao
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    /*
     * Estilo continua com unsafe-inline: o next/font injeta @font-face inline
     * e nem todo <style> do framework recebe nonce. Estilo injetado dá para
     * desfigurar a página, não para roubar sessão — troca aceitável enquanto
     * o script, que é o que importa, está trancado.
     */
    "style-src 'self' 'unsafe-inline'",
    // A seta do <select> é um SVG embutido como data: no CSS.
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ]

  if (producao) regras.push('upgrade-insecure-requests')

  return regras.join('; ')
}

/** Nonce novo a cada resposta; repetir um nonce é o mesmo que não ter nenhum. */
export function novoNonce(): string {
  return btoa(crypto.randomUUID())
}
