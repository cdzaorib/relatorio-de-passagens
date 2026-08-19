import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { summarize } from '@/lib/report'
import type { Trip } from '@/types'

function trip(date: string, card: Trip['card'], value: number): Trip {
  return {
    id: `${date}-${card}-${value}-${Math.random()}`,
    user_id: 'u1',
    date,
    origin: 'Bananal',
    destination: 'Cocotá',
    client: 'Tecnoarte',
    transport: card === 'riocard' ? 'barca' : 'onibus',
    line: null,
    card,
    value,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
  }
}

describe('totais do relatório', () => {
  test('separa por cartão e soma o geral', () => {
    const t = summarize([
      trip('2026-08-03', 'jae', 4.7),
      trip('2026-08-03', 'riocard', 5),
      trip('2026-08-03', 'riocard', 5),
      trip('2026-08-03', 'jae', 4.7),
    ])

    assert.equal(t.riocard, 10)
    assert.equal(t.jae, 9.4)
    assert.equal(t.total, 19.4)
  })

  test('arredonda a sujeira do ponto flutuante', () => {
    // Sem arredondar, uma quinzena real fecha em 211.09999999999994.
    const trips: Trip[] = []
    for (let d = 1; d <= 10; d++) {
      const date = `2026-07-${String(d).padStart(2, '0')}`
      trips.push(trip(date, 'jae', 4.7), trip(date, 'riocard', 5))
      trips.push(trip(date, 'riocard', 5), trip(date, 'jae', 4.7))
    }
    trips.push(trip('2026-07-13', 'riocard', 17.1))

    const t = summarize(trips)

    assert.equal(t.riocard, 117.1)
    assert.equal(t.jae, 94)
    assert.equal(t.total, 211.1)
    // O total tem no máximo dois decimais.
    assert.equal(Math.round(t.total * 100) / 100, t.total)
  })

  test('conta trechos e dias distintos', () => {
    const t = summarize([
      trip('2026-08-03', 'jae', 4.7),
      trip('2026-08-03', 'jae', 4.7),
      trip('2026-08-04', 'jae', 4.7),
    ])

    assert.equal(t.tripCount, 3)
    assert.equal(t.dayCount, 2)
  })

  test('período sem trecho fecha em zero, não em erro', () => {
    assert.deepEqual(summarize([]), {
      riocard: 0,
      jae: 0,
      total: 0,
      tripCount: 0,
      dayCount: 0,
    })
  })

  test('um cartão só não contamina o outro', () => {
    const t = summarize([trip('2026-08-03', 'riocard', 17.1)])

    assert.equal(t.jae, 0)
    assert.equal(t.riocard, 17.1)
    assert.equal(t.total, 17.1)
  })
})
