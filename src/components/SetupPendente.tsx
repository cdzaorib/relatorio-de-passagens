/**
 * Mostrada quando o app subiu sem as variáveis do Supabase — típico do
 * primeiro deploy. Sem isto, toda página quebraria com erro de servidor e
 * ninguém saberia o motivo olhando a tela.
 */
export function SetupPendente() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="letreiro text-xs text-onibus-ink">
        Configuração pendente
      </p>

      <h1 className="letreiro mt-3 text-3xl text-ink">Falta conectar o Supabase</h1>

      <p className="mt-4 leading-relaxed text-muted">
        O aplicativo subiu, mas ainda não sabe onde fica o banco. Defina as
        variáveis abaixo e publique de novo — em variável que começa com
        <code className="mx-1 rounded bg-paper px-1.5 py-0.5 text-sm">NEXT_PUBLIC_</code>
        o valor entra no momento do build, então um novo deploy é necessário.
      </p>

      <ul className="mt-6 space-y-2 dados text-sm text-ink-soft">
        <li className="rounded-lg border border-line bg-surface px-3 py-2">
          NEXT_PUBLIC_SUPABASE_URL
        </li>
        <li className="rounded-lg border border-line bg-surface px-3 py-2">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </li>
        <li className="rounded-lg border border-line bg-surface px-3 py-2">
          NEXT_PUBLIC_SITE_URL
        </li>
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        Os valores estão no Supabase em <strong>Project Settings &rsaquo; API</strong>. O
        arquivo <code className="rounded bg-paper px-1 py-0.5">.env.example</code> do
        repositório lista todas as variáveis, inclusive as opcionais do envio
        de e-mail.
      </p>
    </main>
  )
}
