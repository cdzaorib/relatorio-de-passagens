/**
 * Opções aplicadas ao cookie de sessão.
 *
 * httpOnly é o ponto principal: o token da sessão carrega o e-mail e o id do
 * usuário, e sem isto qualquer script na página — inclusive um injetado — leria
 * tudo com document.cookie. Só dá para fazer isso porque o app inteiro fala com
 * o Supabase pelo servidor; se um dia algum componente de cliente precisar da
 * sessão, ele vai falhar aqui, e a decisão terá de ser revista de propósito.
 */
export const COOKIE_SEGURO = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const
