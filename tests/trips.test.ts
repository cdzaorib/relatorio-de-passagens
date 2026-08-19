import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { buildDayLegs, legsToTrips, mirrorLegs, type LegDraft } from '@/lib/trips'

const ida: LegDraft[] = [
  {
    origin: 'Bananal',
    destination: 'Cocotá',
    client: 'Tecnoarte',
    transport: 'onibus',
    line: '323',
    card: 'jae',
    value: 4.7,
  },
  {
    origin: 'Cocotá',
    destination: 'Praça XV',
    client: 'Tecnoarte',
    transport: 'barca',
    line: null,
    card: 'riocard',
    value: 5,
  },
]

describe('espelho da volta', () => {
  test('inverte a ordem dos trechos', () => {
    const volta = mirrorLegs(ida)

    // O último trecho da ida é o primeiro da volta: quem chegou de barca
    // volta de barca antes de pegar o ônibus.
    assert.equal(volta[0].transport, 'barca')
    assert.equal(volta[1].transport, 'onibus')
  })

  test('troca origem com destino em cada trecho', () => {
    const volta = mirrorLegs(ida)

    assert.deepEqual(
      volta.map((l) => [l.origin, l.destination]),
      [
        ['Praça XV', 'Cocotá'],
        ['Cocotá', 'Bananal'],
      ],
    )
  })

  test('o cliente da volta é sempre Residência', () => {
    const volta = mirrorLegs(ida)
    assert.deepEqual(new Set(volta.map((l) => l.client)), new Set(['Residência']))
  })

  test('mantém transporte, linha, cartão e valor', () => {
    const volta = mirrorLegs(ida)

    assert.equal(volta[1].line, '323')
    assert.equal(volta[1].card, 'jae')
    assert.equal(volta[1].value, 4.7)
    assert.equal(volta[0].card, 'riocard')
  })

  test('não altera a lista recebida', () => {
    const copia = structuredClone(ida)
    mirrorLegs(ida)
    assert.deepEqual(ida, copia)
  })

  test('um trecho só vira a volta dele mesmo', () => {
    const volta = mirrorLegs([ida[0]])

    assert.equal(volta.length, 1)
    assert.equal(volta[0].origin, 'Cocotá')
    assert.equal(volta[0].destination, 'Bananal')
  })

  test('lista vazia devolve lista vazia', () => {
    assert.deepEqual(mirrorLegs([]), [])
  })
})

describe('montagem do dia', () => {
  test('com volta, o dia tem o dobro de trechos', () => {
    assert.equal(buildDayLegs(ida, true).length, 4)
  })

  test('sem volta, só a ida', () => {
    assert.equal(buildDayLegs(ida, false).length, 2)
  })

  test('reproduz o dia da planilha, linha por linha', () => {
    const trips = legsToTrips(buildDayLegs(ida, true), 'u1', '2026-07-01')

    assert.deepEqual(
      trips.map((t) => [t.origin, t.destination, t.client, t.transport, t.card, t.value]),
      [
        ['Bananal', 'Cocotá', 'Tecnoarte', 'onibus', 'jae', 4.7],
        ['Cocotá', 'Praça XV', 'Tecnoarte', 'barca', 'riocard', 5],
        ['Praça XV', 'Cocotá', 'Residência', 'barca', 'riocard', 5],
        ['Cocotá', 'Bananal', 'Residência', 'onibus', 'jae', 4.7],
      ],
    )
  })
})

describe('conversão para registro do banco', () => {
  test('carimba usuário e data em todos os trechos', () => {
    const trips = legsToTrips(ida, 'usuario-1', '2026-07-01')

    assert.ok(trips.every((t) => t.user_id === 'usuario-1'))
    assert.ok(trips.every((t) => t.date === '2026-07-01'))
  })

  test('linha vazia vira nulo, para a coluna do relatório sair em branco', () => {
    const trips = legsToTrips(
      [{ ...ida[0], line: '   ' }, { ...ida[1], line: '' }],
      'u1',
      '2026-07-01',
    )

    assert.equal(trips[0].line, null)
    assert.equal(trips[1].line, null)
  })

  test('linha preenchida é preservada sem espaços nas pontas', () => {
    const trips = legsToTrips([{ ...ida[0], line: ' 143C ' }], 'u1', '2026-07-01')
    assert.equal(trips[0].line, '143C')
  })
})
