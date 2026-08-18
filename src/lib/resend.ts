import 'server-only'

import { Resend } from 'resend'

/** Diz se o Resend está configurado; se não estiver, o app cai no e-mail do Supabase. */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

function buildPasswordResetHtml(link: string): string {
  // HTML simples com estilo inline: cliente de e-mail não entende Tailwind.
  return `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">Redefinir sua senha</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Recebemos um pedido para redefinir a senha da sua conta no Relatório de
        Reembolso de Passagem. Clique no botão abaixo para escolher uma senha nova.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">
          Criar nova senha
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b;">
        O link vale por uma hora e só pode ser usado uma vez. Se você não pediu
        a troca, é só ignorar este e-mail — sua senha continua a mesma.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br />${link}
      </p>
    </div>
  </body>
</html>`
}

/** Envia o e-mail de redefinição. Lança erro se o Resend recusar. */
export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    throw new Error('Resend não configurado (RESEND_API_KEY e RESEND_FROM_EMAIL).')
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Redefinir sua senha',
    html: buildPasswordResetHtml(link),
    text: `Para redefinir sua senha, acesse: ${link}\n\nO link vale por uma hora. Se você não pediu a troca, ignore este e-mail.`,
  })

  if (error) {
    throw new Error(error.message)
  }
}
