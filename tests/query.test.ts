import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { descreveFalha, primeiraFalha } from '@/lib/query'

function erro(code: string) {
  return { code }
}

describe('leitura de falha do banco', () => {
  test('coluna que o Postgres não conhece é schema atrasado', () => {
    const falha = descreveFalha(erro('42703'))

    assert.equal(falha.schemaDesatualizado, true)
    assert.match(falha.mensagem, /migrations/)
  })

  test('coluna fora do cache do PostgREST também é schema atrasado', () => {
    // A escrita falha por este código; a leitura, pelo 42703. Mesmo problema,
    // mesma correção.
    assert.equal(descreveFalha(erro('PGRST204')).schemaDesatualizado, true)
  })

  test('outro erro não manda ninguém mexer no banco', () => {
    const falha = descreveFalha(erro('08006'))

    assert.equal(falha.schemaDesatualizado, false)
    assert.doesNotMatch(falha.mensagem, /migrations|SQL Editor/)
  })

  test('nenhuma mensagem vaza o texto cru do banco', () => {
    // O erro do Postgres nomeia tabela e coluna; isso é detalhe interno e não
    // ajuda quem está tentando lançar o trecho.
    const falha = descreveFalha(erro('42703'))

    assert.doesNotMatch(falha.mensagem, /column|trips\./)
  })

  test('sem erro nenhum não há falha', () => {
    assert.equal(primeiraFalha({ error: null }, { error: null }), null)
  })

  test('devolve a primeira falha, não a última', () => {
    const falha = primeiraFalha(
      { error: null },
      { error: erro('42703') },
      { error: erro('08006') },
    )

    assert.equal(falha?.schemaDesatualizado, true)
  })
})
