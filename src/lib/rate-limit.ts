import 'server-only'

/**
 * Limitador simples em memória, para não virar máquina de disparar e-mail.
 * Vale por instância do servidor — em serverless não é garantia absoluta,
 * mas segura o abuso óbvio sem precisar de infra extra.
 */
const hits = new Map<string, number[]>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs)

  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }

  recent.push(now)
  hits.set(key, recent)

  // Limpeza preguiçosa para o Map não crescer sem parar.
  if (hits.size > 500) {
    for (const [entryKey, timestamps] of hits) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
        hits.delete(entryKey)
      }
    }
  }

  return true
}

/**
 * A origem da requisição, para servir de chave do limitador.
 *
 * A ordem importa. `x-forwarded-for` é uma lista, e o primeiro item dela é o
 * que o cliente escreveu: quem quiser furar o limite manda um valor novo a
 * cada tentativa e ganha uma cota nova de graça. Por isso ele é o último
 * recurso, e o valor lido é o **último** da lista — o que o proxy mais
 * próximo acrescentou, e não o que veio de fora.
 *
 * `x-vercel-forwarded-for` e `x-real-ip` são escritos pela borda da Vercel e o
 * cliente não tem como forjá-los, então vêm antes.
 *
 * Sem nenhum deles, todo mundo cai na mesma chave. É rígido demais de
 * propósito: um limitador que não sabe de onde veio a requisição deve errar
 * para o lado de segurar, não de liberar.
 */
export function origemDaRequisicao(headers: Headers): string {
  const confiavel = headers.get('x-vercel-forwarded-for') ?? headers.get('x-real-ip')
  if (confiavel?.trim()) return confiavel.trim()

  const cadeia = headers.get('x-forwarded-for')?.split(',') ?? []
  const ultimo = cadeia[cadeia.length - 1]?.trim()

  return ultimo || 'origem-desconhecida'
}
