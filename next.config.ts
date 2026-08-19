import type { NextConfig } from 'next'

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * Não substituem a RLS nem a validação no servidor — são a camada que reduz
 * o estrago caso algo passe.
 */
const CABECALHOS_DE_SEGURANCA = [
  // Impede o navegador de adivinhar o tipo do conteúdo e executar o que não deve.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // O app não é feito para rodar dentro de iframe; barrar evita clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Nenhum endereço interno vaza no Referer ao clicar para fora.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Não usamos câmera, microfone nem localização; negar é mais barato que explicar.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Força HTTPS nas próximas visitas.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  // Erros de tipo e de lint quebram o build de propósito.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Esconde a versão do framework, que só serve para quem procura alvo.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: CABECALHOS_DE_SEGURANCA }]
  },
}

export default nextConfig
