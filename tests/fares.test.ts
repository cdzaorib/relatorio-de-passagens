import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { fareToLegValues } from '@/lib/fares'
import { DEFAULT_CARD_BY_TRANSPORT } from '@/types'
import type { FarePrice } from '@/types'

function fare(parcial: Partial<FarePrice>): FarePrice {
  return {
    id: 'f1',
    user_id: 'u1',
    group_id: 'g1',
    label: 'Ônibus 323',
    transport: 'onibus',
    card: 'jae',
    value: 4.7,
    active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...parcial,
  }
}

describe('passagem escolhida preenchendo o trecho', () => {
  test('traz transporte, cartão, valor e o grupo do preço', () => {
    const aplicado = fareToLegValues(fare({}))

    assert.equal(aplicado.transport, 'onibus')
    assert.equal(aplicado.card, 'jae')
    assert.equal(aplicado.value, 4.7)
    assert.equal(aplicado.fareGroupId, 'g1')
  })

  test('deduz a linha a partir do nome da passagem', () => {
    assert.equal(fareToLegValues(fare({ label: 'Ônibus 323' })).line, '323')
    assert.equal(fareToLegValues(fare({ label: '323' })).line, '323')
    assert.equal(fareToLegValues(fare({ label: '143C' })).line, '143C')
    assert.equal(fareToLegValues(fare({ label: 'Ônibus 474 Executivo' })).line, '474')
  })

  test('barca não recebe linha, mesmo com número no nome', () => {
    const aplicado = fareToLegValues(
      fare({ label: 'Barca 2 Cocotá', transport: 'barca', card: 'riocard' }),
    )
    assert.equal(aplicado.line, '')
  })

  test('nome sem número não inventa linha', () => {
    assert.equal(fareToLegValues(fare({ label: 'Van da empresa' })).line, '')
  })

  test('o cartão da passagem vence o padrão do transporte', () => {
    // A 143C é ônibus mas é paga no RIO CARD: o cadastro manda, não a regra.
    const aplicado = fareToLegValues(fare({ label: 'Ônibus 143C', card: 'riocard', value: 17.1 }))

    assert.equal(aplicado.card, 'riocard')
    assert.notEqual(aplicado.card, DEFAULT_CARD_BY_TRANSPORT.onibus)
  })
})

describe('cartão sugerido por transporte', () => {
  test('ônibus sugere JAÉ e barca sugere RIO CARD', () => {
    assert.equal(DEFAULT_CARD_BY_TRANSPORT.onibus, 'jae')
    assert.equal(DEFAULT_CARD_BY_TRANSPORT.barca, 'riocard')
  })
})
