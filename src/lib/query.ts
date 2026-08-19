import type { PostgrestError } from '@supabase/supabase-js'

/**
 * "Essa coluna não existe", nos dois dialetos que aparecem: 42703 é o Postgres
 * recusando a leitura, PGRST204 é o PostgREST recusando a escrita porque o
 * cache de schema dele não conhece a coluna.
 */
const COLUNA_AUSENTE = new Set(['42703', 'PGRST204'])

export type FalhaDeLeitura = {
  /** Banco atrás do código: a correção é rodar a migração, não recarregar. */
  schemaDesatualizado: boolean
  mensagem: string
}

const AVISO_SCHEMA =
  'O banco de dados está atrás do app: falta uma coluna que o código já usa. ' +
  'Abra o SQL Editor do Supabase e rode os arquivos de supabase/migrations. ' +
  'Nada foi perdido — o que já está gravado continua lá.'

// Serve para leitura e para escrita: as duas falham pelo mesmo motivo e a
// pessoa não precisa saber de qual lado deu errado.
const AVISO_GENERICO =
  'Não foi possível falar com o banco agora. Tente de novo em alguns instantes; ' +
  'se continuar assim, ele pode estar fora do ar.'

/**
 * Só o código do erro importa aqui. Pedir o `PostgrestError` inteiro obrigaria
 * quem chama a construir um objeto de classe para nada — inclusive o teste.
 */
type ErroComCodigo = Pick<PostgrestError, 'code'>

export function descreveFalha(error: ErroComCodigo): FalhaDeLeitura {
  const schemaDesatualizado = COLUNA_AUSENTE.has(error.code)

  return {
    schemaDesatualizado,
    mensagem: schemaDesatualizado ? AVISO_SCHEMA : AVISO_GENERICO,
  }
}

/**
 * A primeira consulta que falhou, para a tela poder dizer isso em voz alta.
 *
 * Sem isto, `data ?? []` transforma erro do banco em lista vazia: a pessoa vê
 * "nenhum trecho lançado" e conclui que o app perdeu o trabalho dela, quando
 * na verdade o banco recusou a pergunta. Silêncio é a pior resposta possível
 * para quem depende do relatório para receber.
 */
export function primeiraFalha(
  ...resultados: { error: ErroComCodigo | null }[]
): FalhaDeLeitura | null {
  for (const resultado of resultados) {
    if (resultado.error) return descreveFalha(resultado.error)
  }
  return null
}
