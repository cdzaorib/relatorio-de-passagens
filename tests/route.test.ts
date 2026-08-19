import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { buildRouteStops, type RouteStep } from '@/lib/route'

function trecho(origin: string, destination: string, transport: RouteStep['transport'] = 'onibus'): RouteStep {
  return { origin, destination, transport }
}

describe('paradas da linha de percurso', () => {
  test('um dia comum vira uma corrente sem repetir a baldeação', () => {
    const paradas = buildRouteStops([
      trecho('Bananal', 'Cocotá'),
      trecho('Cocotá', 'Praça XV', 'barca'),
      trecho('Praça XV', 'Cocotá', 'barca'),
      trecho('Cocotá', 'Bananal'),
    ])

    assert.deepEqual(
      paradas.map((p) => p.bairro),
      ['Bananal', 'Cocotá', 'Praça XV', 'Cocotá', 'Bananal'],
    )
  })

  test('a última parada não tem trecho saindo dela', () => {
    const paradas = buildRouteStops([trecho('Bananal', 'Cocotá')])

    assert.equal(paradas.length, 2)
    assert.ok(paradas[0].trecho)
    assert.equal(paradas[1].trecho, null)
  })

  test('cada parada aponta o trecho que sai dela', () => {
    const paradas = buildRouteStops([
      trecho('Bananal', 'Cocotá'),
      trecho('Cocotá', 'Praça XV', 'barca'),
    ])

    assert.equal(paradas[0].trecho?.transport, 'onibus')
    assert.equal(paradas[1].trecho?.transport, 'barca')
  })

  test('dia com duas saídas separadas não inventa ligação', () => {
    // Foi ao HCNI de manhã e voltou; à tarde saiu de casa para o Centro.
    const paradas = buildRouteStops([
      trecho('Bananal', 'Cocotá'),
      trecho('Cocotá', 'Bananal'),
      trecho('Bananal', 'Centro'),
    ])

    // Sem tratamento, o terceiro trecho seria emendado como se fosse
    // continuação — aqui ele emenda de verdade, porque volta do mesmo bairro.
    assert.deepEqual(
      paradas.map((p) => p.bairro),
      ['Bananal', 'Cocotá', 'Bananal', 'Centro'],
    )
    assert.ok(paradas.every((p) => !p.quebra))
  })

  test('trecho que começa longe de onde o anterior parou abre parada nova', () => {
    const paradas = buildRouteStops([
      trecho('Bananal', 'Cocotá'),
      trecho('Centro', 'Praça XV'),
    ])

    assert.deepEqual(
      paradas.map((p) => p.bairro),
      ['Bananal', 'Cocotá', 'Centro', 'Praça XV'],
    )

    const nova = paradas.find((p) => p.quebra)
    assert.equal(nova?.bairro, 'Centro')
  })

  test('a primeira parada nunca é marcada como quebra', () => {
    const paradas = buildRouteStops([trecho('Bananal', 'Cocotá')])
    assert.equal(paradas[0].quebra, false)
  })

  test('sem trecho, sem parada', () => {
    assert.deepEqual(buildRouteStops([]), [])
  })
})
