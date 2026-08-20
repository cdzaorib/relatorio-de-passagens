import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_CARD_BY_TRANSPORT,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  hasLine,
  isTransportType,
} from '@/types'
import { mirrorLegs, type LegDraft } from '@/lib/trips'

describe('meios de transporte', () => {
  test('os cinco meios existem e têm rótulo', () => {
    assert.deepEqual(TRANSPORT_OPTIONS, ['onibus', 'barca', 'metro', 'trem', 'vlt'])

    for (const meio of TRANSPORT_OPTIONS) {
      assert.ok(TRANSPORT_LABELS[meio], `${meio} está sem rótulo`)
    }
  })

  test('todo meio tem cartão sugerido', () => {
    // Faltar um aqui devolveria undefined no formulário, e o trecho iria para
    // o banco sem cartão.
    for (const meio of TRANSPORT_OPTIONS) {
      assert.ok(DEFAULT_CARD_BY_TRANSPORT[meio], `${meio} está sem cartão padrão`)
    }
  })

  test('só o ônibus municipal sai no JAÉ', () => {
    assert.equal(DEFAULT_CARD_BY_TRANSPORT.onibus, 'jae')

    for (const meio of ['barca', 'metro', 'trem', 'vlt'] as const) {
      assert.equal(DEFAULT_CARD_BY_TRANSPORT[meio], 'riocard', meio)
    }
  })

  test('a barca é a única sem linha', () => {
    assert.equal(hasLine('barca'), false)

    for (const meio of ['onibus', 'metro', 'trem', 'vlt'] as const) {
      assert.equal(hasLine(meio), true, `${meio} deveria aceitar linha`)
    }
  })

  test('isTransportType aceita os cinco e recusa o resto', () => {
    for (const meio of TRANSPORT_OPTIONS) {
      assert.equal(isTransportType(meio), true, meio)
    }

    for (const lixo of ['aviao', 'ONIBUS', '', null, undefined, 0, {}]) {
      assert.equal(isTransportType(lixo), false, String(lixo))
    }
  })
})

describe('espelho com os meios novos', () => {
  test('a volta preserva o transporte de cada trecho', () => {
    // Quem vai de metrô volta de metrô: o espelho troca origem e destino, não
    // o meio nem a linha.
    const ida: LegDraft[] = [
      {
        origin: 'Bananal',
        destination: 'Pavuna',
        client: 'Tecnoarte',
        transport: 'onibus',
        line: '323',
        card: 'jae',
        value: 4.7,
      },
      {
        origin: 'Pavuna',
        destination: 'Carioca',
        client: 'Tecnoarte',
        transport: 'metro',
        line: '2',
        card: 'riocard',
        value: 7.5,
      },
      {
        origin: 'Carioca',
        destination: 'Praça XV',
        client: 'Tecnoarte',
        transport: 'vlt',
        line: '1',
        card: 'riocard',
        value: 4.3,
      },
    ]

    const volta = mirrorLegs(ida)

    assert.deepEqual(
      volta.map((leg) => [leg.origin, leg.destination, leg.transport, leg.line]),
      [
        ['Praça XV', 'Carioca', 'vlt', '1'],
        ['Carioca', 'Pavuna', 'metro', '2'],
        ['Pavuna', 'Bananal', 'onibus', '323'],
      ],
    )
  })
})
