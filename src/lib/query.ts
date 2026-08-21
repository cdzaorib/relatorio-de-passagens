import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Por que uma consulta falhou, no nível em que a resposta muda o que fazer.
 * Não interessa se foi leitura ou escrita: interessa se a saída é rodar SQL,
 * mexer na RLS ou simplesmente esperar.
 */
export type MotivoDaFalha =
  | 'tabela'
  | 'coluna'
  | 'valor'
  | 'permissao'
  | 'sessao'
  | 'relogio'
  | 'desconhecido'

export type FalhaDeLeitura = {
  motivo: MotivoDaFalha
  /** Verdadeiro quando a correção é rodar SQL, não recarregar a página. */
  schemaDesatualizado: boolean
  /** Código cru, para diagnóstico. Não é segredo e encurta o socorro. */
  codigo: string
  mensagem: string
}

/*
 * Cada problema aparece em dois dialetos: o do Postgres, quando ele mesmo
 * recusa, e o do PostgREST, quando o cache de schema dele nem chega a
 * perguntar. São o mesmo problema e pedem a mesma correção.
 */
const TABELA_AUSENTE = new Set([
  '42P01', // undefined_table
  'PGRST205', // tabela fora do cache de schema
])

const COLUNA_AUSENTE = new Set([
  '42703', // undefined_column
  'PGRST204', // coluna fora do cache de schema
  'PGRST118', // não deu para ordenar por essa coluna
])

/*
 * O Postgres recusou o texto que mandamos para uma coluna tipada. Na prática,
 * aqui, é sempre o mesmo caso: um meio de transporte que o enum ainda não
 * conhece porque a migração não rodou.
 */
const VALOR_RECUSADO = new Set([
  '22P02', // invalid_text_representation
  '22023', // invalid_parameter_value
])

/*
 * A família PGRST3xx é de JWT: o PostgREST recusou o token antes de chegar ao
 * banco. Nada a ver com o schema nem com o banco estar fora do ar — e mandar a
 * pessoa esperar o banco voltar, como a mensagem genérica fazia, é conselho
 * que nunca resolve.
 */
const SESSAO_RECUSADA = new Set([
  'PGRST300', // segredo do JWT ausente no servidor
  'PGRST301', // JWT inválido
  'PGRST302', // não autenticado
])

/*
 * PGRST303 é "JWT issued at future": o relógio de quem valida está atrasado
 * em relação ao de quem emitiu o token. Passa sozinho quando os relógios se
 * reencontram, então o conselho aqui é esperar — ao contrário dos outros.
 */
const RELOGIO_DESENCONTRADO = new Set(['PGRST303'])

const SEM_PERMISSAO = new Set([
  '42501', // insufficient_privilege
  '.42501', // o mesmo, como o PostgREST às vezes o repassa
])

const MENSAGENS: Record<MotivoDaFalha, string> = {
  tabela:
    'O banco ainda não tem as tabelas do app. Abra o SQL Editor do Supabase e ' +
    'rode supabase/schema.sql inteiro — ele pode ser rodado mais de uma vez sem ' +
    'estragar o que já existe.',
  coluna:
    'O banco está atrás do app: falta uma coluna que o código já usa. Abra o SQL ' +
    'Editor do Supabase e rode os arquivos de supabase/migrations. Nada foi ' +
    'perdido — o que já está gravado continua lá.',
  valor:
    'O banco recusou um dos valores enviados. Se você escolheu metrô, trem ou ' +
    'VLT, é porque falta rodar supabase/migrations/003-metro-trem-vlt.sql no ' +
    'SQL Editor do Supabase — o banco ainda só conhece ônibus e barca.',
  permissao:
    'O banco recusou o acesso aos seus dados. Normalmente é a RLS: rode ' +
    'supabase/schema.sql de novo, que ele recria as políticas.',
  sessao:
    'Sua sessão não foi aceita. Saia e entre de novo — não é problema no seu ' +
    'lançamento, e nada do que você já gravou foi afetado.',
  relogio:
    'Sua sessão foi recusada por desencontro de relógio entre os servidores do ' +
    'Supabase, não por erro seu. Espere alguns segundos e tente de novo; costuma ' +
    'passar sozinho. Se insistir, saia e entre de novo para pegar uma sessão nova.',
  // Serve para leitura e para escrita: a pessoa não precisa saber de qual lado
  // deu errado, só que não adianta mexer no banco por causa disso.
  desconhecido:
    'Não foi possível falar com o banco agora. Tente de novo em alguns instantes; ' +
    'se continuar assim, ele pode estar fora do ar.',
}

/**
 * Só o código do erro importa aqui. Pedir o `PostgrestError` inteiro obrigaria
 * quem chama a construir um objeto de classe para nada — inclusive o teste.
 */
type ErroComCodigo = Pick<PostgrestError, 'code'>

function classifica(code: string): MotivoDaFalha {
  if (TABELA_AUSENTE.has(code)) return 'tabela'
  if (COLUNA_AUSENTE.has(code)) return 'coluna'
  if (VALOR_RECUSADO.has(code)) return 'valor'
  if (RELOGIO_DESENCONTRADO.has(code)) return 'relogio'
  if (SESSAO_RECUSADA.has(code)) return 'sessao'
  if (SEM_PERMISSAO.has(code)) return 'permissao'
  return 'desconhecido'
}

export function descreveFalha(error: ErroComCodigo): FalhaDeLeitura {
  const codigo = error.code || 'sem-codigo'
  const motivo = classifica(codigo)

  /*
   * O código vai junto da mensagem. Ele não é segredo — não nomeia tabela,
   * coluna nem dado de ninguém — e é a diferença entre a pessoa conseguir
   * dizer o que houve e ter que descrever a tela por telefone. Sem ele, a
   * mensagem genérica esconde justamente a informação que resolveria o caso.
   */
  return {
    motivo,
    schemaDesatualizado: motivo === 'tabela' || motivo === 'coluna',
    codigo,
    mensagem: `${MENSAGENS[motivo]} (código ${codigo})`,
  }
}

/**
 * A primeira consulta que falhou, para a tela poder dizer isso em voz alta.
 *
 * Sem isto, `data ?? []` transforma erro do banco em lista vazia: a pessoa vê
 * "nenhum trecho lançado" e conclui que o app perdeu o trabalho dela, quando
 * na verdade o banco recusou a pergunta. Silêncio é a pior resposta possível
 * para quem depende do relatório para receber.
 *
 * `onde` nomeia a consulta que falhou e vai só para o log do servidor: ajuda a
 * achar o problema sem pôr nome de tabela na tela de ninguém.
 */
export function primeiraFalha(
  ...resultados: ({ error: ErroComCodigo | null } | [string, { error: ErroComCodigo | null }])[]
): FalhaDeLeitura | null {
  for (const item of resultados) {
    const [onde, resultado] = Array.isArray(item) ? item : ['consulta', item]
    if (!resultado.error) continue

    const falha = descreveFalha(resultado.error)

    // Só o rótulo e o código: a mensagem do provedor pode carregar o trecho da
    // consulta, e log de servidor não é lugar para o dado de ninguém.
    console.error(`Falha de banco em ${onde}: código ${falha.codigo} (${falha.motivo})`)

    return falha
  }

  return null
}
