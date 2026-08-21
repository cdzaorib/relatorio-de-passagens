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

  test('valor que o enum não conhece aponta para a migração do transporte', () => {
    // O app manda 'metro' e o banco ainda só conhece ônibus e barca. Sem esta
    // classificação, a mensagem seria a genérica e ninguém saberia o que fazer.
    for (const code of ['22P02', '22023']) {
      const falha = descreveFalha(erro(code))

      assert.equal(falha.motivo, 'valor', code)
      assert.match(falha.mensagem, /003-metro-trem-vlt/, code)
    }
  })

  test('valor recusado não dispara o contorno do leg_order', () => {
    // schemaDesatualizado liga o insert um-a-um, que não resolve enum faltando
    // e só gastaria viagem ao banco antes de falhar igual.
    assert.equal(descreveFalha(erro('22P02')).schemaDesatualizado, false)
  })

  test('acesso negado aponta para a RLS, não para o app', () => {
    const falha = descreveFalha(erro('42501'))

    assert.equal(falha.motivo, 'permissao')
    assert.match(falha.mensagem, /RLS/)
  })

  test('PGRST303 é relógio dessincronizado, não banco fora do ar', () => {
    // Apareceu em uso real. A mensagem genérica mandava esperar o banco voltar
    // — conselho que nunca resolveria, porque o banco está de pé: quem recusou
    // foi o PostgREST, ao validar o token, antes de chegar lá.
    const falha = descreveFalha(erro('PGRST303'))

    assert.equal(falha.motivo, 'relogio')
    assert.match(falha.mensagem, /rel[óo]gio/i)
    assert.doesNotMatch(falha.mensagem, /fora do ar/)
  })

  test('os outros PGRST3xx mandam entrar de novo', () => {
    for (const code of ['PGRST300', 'PGRST301', 'PGRST302']) {
      const falha = descreveFalha(erro(code))

      assert.equal(falha.motivo, 'sessao', code)
      assert.match(falha.mensagem, /Saia e entre de novo/, code)
    }
  })

  test('erro de sessão não manda mexer no banco', () => {
    // Rodar migração não conserta token recusado, e sugerir isso levaria a
    // pessoa a mexer no schema por nada.
    for (const code of ['PGRST300', 'PGRST301', 'PGRST302', 'PGRST303']) {
      const falha = descreveFalha(erro(code))

      assert.equal(falha.schemaDesatualizado, false, code)
      assert.doesNotMatch(falha.mensagem, /schema\.sql|migrations/, code)
    }
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
