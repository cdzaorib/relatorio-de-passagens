import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { descreveFalha, primeiraFalha } from '@/lib/query'

const erro = (code: string) => ({ code })

describe('leitura de falha do banco', () => {
  test('tabela que não existe manda rodar o schema', () => {
    for (const code of ['42P01', 'PGRST205']) {
      const falha = descreveFalha(erro(code))

      assert.equal(falha.motivo, 'tabela', code)
      assert.match(falha.mensagem, /schema\.sql/, code)
    }
  })

  test('coluna que não existe manda rodar a migração', () => {
    // 42703 é o Postgres recusando a leitura; PGRST204 é o PostgREST recusando
    // a escrita porque o cache dele não conhece a coluna; PGRST118 é o
    // "não deu para ordenar por isso". Mesmo problema, mesma correção.
    for (const code of ['42703', 'PGRST204', 'PGRST118']) {
      const falha = descreveFalha(erro(code))

      assert.equal(falha.motivo, 'coluna', code)
      assert.match(falha.mensagem, /migrations/, code)
    }
  })

  test('acesso negado aponta para a RLS, não para o app', () => {
    const falha = descreveFalha(erro('42501'))

    assert.equal(falha.motivo, 'permissao')
    assert.match(falha.mensagem, /RLS/)
  })

  test('erro de rede não manda ninguém mexer no banco', () => {
    const falha = descreveFalha(erro('08006'))

    assert.equal(falha.motivo, 'desconhecido')
    assert.equal(falha.schemaDesatualizado, false)
    assert.doesNotMatch(falha.mensagem, /schema\.sql|migrations|RLS/)
  })

  test('só tabela e coluna contam como schema atrasado', () => {
    assert.equal(descreveFalha(erro('42P01')).schemaDesatualizado, true)
    assert.equal(descreveFalha(erro('42703')).schemaDesatualizado, true)
    assert.equal(descreveFalha(erro('42501')).schemaDesatualizado, false)
    assert.equal(descreveFalha(erro('08006')).schemaDesatualizado, false)
  })

  test('toda mensagem carrega o código, inclusive a genérica', () => {
    // Sem o código, a mensagem genérica esconde justamente a informação que
    // resolveria o caso, e a pessoa não tem o que dizer ao pedir socorro.
    assert.match(descreveFalha(erro('08006')).mensagem, /\(código 08006\)/)
    assert.match(descreveFalha(erro('42P01')).mensagem, /\(código 42P01\)/)
  })

  test('erro sem código não fica sem mensagem', () => {
    const falha = descreveFalha(erro(''))

    assert.equal(falha.motivo, 'desconhecido')
    assert.equal(falha.codigo, 'sem-codigo')
  })

  test('nenhuma mensagem repete o texto cru do banco', () => {
    // O erro do Postgres nomeia tabela e coluna; é detalhe interno e não ajuda
    // quem está tentando lançar o trecho.
    for (const code of ['42P01', '42703', '42501', '08006']) {
      assert.doesNotMatch(descreveFalha(erro(code)).mensagem, /column|relation|trips\./, code)
    }
  })

  test('sem erro nenhum não há falha', () => {
    assert.equal(primeiraFalha({ error: null }, ['trechos', { error: null }]), null)
  })

  test('devolve a primeira falha, não a última', () => {
    const falha = primeiraFalha(
      { error: null },
      ['trechos', { error: erro('42703') }],
      ['locais', { error: erro('08006') }],
    )

    assert.equal(falha?.motivo, 'coluna')
  })
})
