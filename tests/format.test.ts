import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { daysAgoISO, formatAmountInput, formatBRL, formatDate, parseAmount, todayISO } from '@/lib/format'

describe('leitura do valor digitado', () => {
  test('aceita os jeitos que a pessoa realmente digita', () => {
    const casos: [string, number][] = [
      ['4,70', 4.7],
      ['R$ 4,70', 4.7],
      ['R$4,70', 4.7],
      ['  4,70  ', 4.7],
      ['4.70', 4.7],
      ['4,7', 4.7],
      ['17,10', 17.1],
      ['5', 5],
      ['1.234,56', 1234.56],
      ['0', 0],
    ]

    for (const [entrada, esperado] of casos) {
      assert.equal(parseAmount(entrada), esperado, `falhou em ${entrada}`)
    }
  })

  test('recusa o que não é valor', () => {
    for (const entrada of ['', '   ', 'abc', '-3', 'R$', '4,7,0', '1e3', '4..70']) {
      assert.equal(parseAmount(entrada), null, `aceitou ${entrada}`)
    }
  })

  test('recusa o ponto ambíguo em vez de chutar o valor', () => {
    // '1.234' é mil duzentos e trinta e quatro em português e um vírgula
    // duzentos e trinta e quatro em inglês. Errar isso em dinheiro é pior do
    // que pedir para escrever de novo.
    for (const entrada of ['1.234', '12.500', '1.234.567']) {
      assert.equal(parseAmount(entrada), null, `chutou o valor de ${entrada}`)
    }
  })

  test('ponto com uma ou duas casas continua sendo decimal', () => {
    assert.equal(parseAmount('4.7'), 4.7)
    assert.equal(parseAmount('12.50'), 12.5)
  })

  test('arredonda para os centavos que o banco guarda', () => {
    assert.equal(parseAmount('4,709'), 4.71)
    assert.equal(parseAmount('4,704'), 4.7)
  })
})

describe('exibição de dinheiro', () => {
  test('sai no formato brasileiro', () => {
    assert.match(formatBRL(4.7), /R\$\s?4,70/)
    assert.match(formatBRL(1234.5), /R\$\s?1\.234,50/)
    assert.match(formatBRL(0), /R\$\s?0,00/)
  })

  test('o campo de digitação recebe sempre duas casas', () => {
    assert.equal(formatAmountInput(4.7), '4,70')
    assert.equal(formatAmountInput(5), '5,00')
    assert.equal(formatAmountInput(17.1), '17,10')
  })

  test('ida e volta pelo formulário não perde centavo', () => {
    for (const valor of [4.7, 5, 17.1, 1234.56, 0.05]) {
      assert.equal(parseAmount(formatAmountInput(valor)), valor)
    }
  })
})

describe('datas', () => {
  test('data pura não anda um dia por causa de fuso', () => {
    assert.equal(formatDate('2026-07-01'), '01/07/2026')
    assert.equal(formatDate('2026-01-01'), '01/01/2026')
    assert.equal(formatDate('2026-12-31'), '31/12/2026')
  })

  test('hoje sai no formato que o banco espera', () => {
    assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/)
  })

  test('dias atrás é sempre anterior a hoje', () => {
    assert.ok(daysAgoISO(30) < todayISO())
    assert.match(daysAgoISO(30), /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('contagem de dias para trás', () => {
  test('anda para trás no calendário do Rio, não no do servidor', () => {
    const hoje = todayISO()
    const [ano, mes, dia] = hoje.split('-').map(Number)

    const esperado = new Date(Date.UTC(ano, mes - 1, dia - 30)).toISOString().slice(0, 10)
    assert.equal(daysAgoISO(30), esperado)
  })

  test('zero dias é hoje', () => {
    assert.equal(daysAgoISO(0), todayISO())
  })

  test('atravessa a virada do mês e do ano sem inventar dia', () => {
    // A conta passa por Date.UTC, que normaliza sozinho: dia 0 de março é o
    // último de fevereiro, e isso tem de valer em ano bissexto também.
    for (const n of [1, 28, 29, 30, 31, 60, 365]) {
      assert.match(daysAgoISO(n), /^\d{4}-\d{2}-\d{2}$/, `formato quebrou em ${n}`)
      assert.ok(daysAgoISO(n) < todayISO(), `${n} dias atrás não ficou no passado`)
    }
  })
})
