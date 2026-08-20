import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  formatPeriodLabel,
  halfMonths,
  parsePeriodParams,
  periodQuery,
  resolvePeriod,
  serializePeriod,
} from '@/lib/period'

describe('quinzenas do mês', () => {
  test('a primeira vai do dia 1 ao 15', () => {
    const { first } = halfMonths('2026-08-18')
    assert.deepEqual(first, { from: '2026-08-01', to: '2026-08-15' })
  })

  test('a segunda vai do 16 ao último dia', () => {
    const { second } = halfMonths('2026-08-18')
    assert.deepEqual(second, { from: '2026-08-16', to: '2026-08-31' })
  })

  test('fevereiro comum termina no 28', () => {
    assert.equal(halfMonths('2026-02-10').second.to, '2026-02-28')
  })

  test('fevereiro bissexto termina no 29', () => {
    assert.equal(halfMonths('2024-02-10').second.to, '2024-02-29')
  })

  test('mês de 30 dias termina no 30', () => {
    assert.equal(halfMonths('2026-04-05').whole.to, '2026-04-30')
  })

  test('dezembro não vira o ano', () => {
    assert.equal(halfMonths('2026-12-31').whole.to, '2026-12-31')
  })
})

describe('período vindo da URL', () => {
  test('aceita as duas datas válidas', () => {
    assert.deepEqual(parsePeriodParams({ de: '2026-07-01', ate: '2026-07-15' }), {
      from: '2026-07-01',
      to: '2026-07-15',
    })
  })

  test('endireita intervalo invertido em vez de devolver relatório vazio', () => {
    assert.deepEqual(parsePeriodParams({ de: '2026-07-15', ate: '2026-07-01' }), {
      from: '2026-07-01',
      to: '2026-07-15',
    })
  })

  test('recusa quando só uma data vem', () => {
    assert.equal(parsePeriodParams({ de: '2026-07-01' }), null)
    assert.equal(parsePeriodParams({ ate: '2026-07-01' }), null)
  })

  test('recusa data malformada', () => {
    for (const de of ['lixo', '2026-7-1', '01/07/2026', '', '2026-07-01T00:00']) {
      assert.equal(parsePeriodParams({ de, ate: '2026-07-15' }), null, `aceitou ${de}`)
    }
  })
})

describe('qual período mostrar', () => {
  const hoje = '2026-08-18'

  test('a URL tem prioridade sobre tudo', () => {
    const p = resolvePeriod({ de: '2026-03-01', ate: '2026-03-10' }, '2026-07-01..2026-07-15', hoje)
    assert.deepEqual(p, { from: '2026-03-01', to: '2026-03-10' })
  })

  test('sem URL, vale o último período escolhido', () => {
    const p = resolvePeriod({}, '2026-07-20..2026-08-04', hoje)
    assert.deepEqual(p, { from: '2026-07-20', to: '2026-08-04' })
  })

  test('sem URL e sem histórico, cai na quinzena de hoje', () => {
    assert.deepEqual(resolvePeriod({}, undefined, hoje), {
      from: '2026-08-16',
      to: '2026-08-31',
    })
  })

  test('dia 15 ainda é primeira quinzena; dia 16 já é a segunda', () => {
    assert.equal(resolvePeriod({}, undefined, '2026-08-15').from, '2026-08-01')
    assert.equal(resolvePeriod({}, undefined, '2026-08-16').from, '2026-08-16')
  })

  test('cookie corrompido é ignorado sem quebrar a tela', () => {
    for (const guardado of ['lixo', '2026-07-01', '..', '2026-07-01..lixo', '']) {
      const p = resolvePeriod({}, guardado, hoje)
      assert.deepEqual(p, { from: '2026-08-16', to: '2026-08-31' }, `aceitou ${guardado}`)
    }
  })

  test('o que é guardado volta igual', () => {
    const original = { from: '2026-07-20', to: '2026-08-04' }
    assert.deepEqual(resolvePeriod({}, serializePeriod(original), hoje), original)
  })
})

describe('formatação do período', () => {
  test('sai como dia e mês, igual ao cabeçalho da planilha', () => {
    assert.equal(formatPeriodLabel({ from: '2026-07-01', to: '2026-07-15' }), '01/07 a 15/07')
  })

  test('a query preserva as duas datas', () => {
    assert.equal(
      periodQuery({ from: '2026-07-01', to: '2026-07-15' }),
      '?de=2026-07-01&ate=2026-07-15',
    )
  })
})

describe('data que não existe não vira período', () => {
  test('mês 13 e dia 45 caem no padrão em vez de ir para o banco', () => {
    // O período vem da URL, que qualquer um edita. Antes, a data impossível
    // seguia para a consulta e o Postgres recusava: a tela do relatório
    // quebrava inteira por causa de um endereço mal digitado.
    assert.equal(parsePeriodParams({ de: '2026-13-01', ate: '2026-13-15' }), null)
    assert.equal(parsePeriodParams({ de: '2026-08-45', ate: '2026-08-46' }), null)
  })

  test('31 de fevereiro é recusado', () => {
    assert.equal(parsePeriodParams({ de: '2026-02-31', ate: '2026-03-01' }), null)
  })

  test('29 de fevereiro vale em ano bissexto e não em ano comum', () => {
    assert.notEqual(parsePeriodParams({ de: '2028-02-29', ate: '2028-03-01' }), null)
    assert.equal(parsePeriodParams({ de: '2027-02-29', ate: '2027-03-01' }), null)
  })

  test('data real continua passando', () => {
    assert.deepEqual(parsePeriodParams({ de: '2026-08-01', ate: '2026-08-15' }), {
      from: '2026-08-01',
      to: '2026-08-15',
    })
  })
})
