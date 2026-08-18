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
