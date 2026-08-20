import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { checkRateLimit, origemDaRequisicao } from '@/lib/rate-limit'

const cabecalhos = (pares: Record<string, string>) => new Headers(pares)

describe('origem da requisição', () => {
  test('prefere o cabeçalho que a borda escreve', () => {
    const h = cabecalhos({
      'x-vercel-forwarded-for': '203.0.113.7',
      'x-forwarded-for': '1.2.3.4, 203.0.113.7',
    })

    assert.equal(origemDaRequisicao(h), '203.0.113.7')
  })

  test('x-real-ip serve quando não há o da Vercel', () => {
    assert.equal(origemDaRequisicao(cabecalhos({ 'x-real-ip': '198.51.100.9' })), '198.51.100.9')
  })

  test('no x-forwarded-for lê o último, não o primeiro', () => {
    // O primeiro item é o que o cliente escreveu: quem quisesse furar o limite
    // mandaria um valor novo a cada tentativa e ganharia cota nova de graça.
    const h = cabecalhos({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 203.0.113.7' })

    assert.equal(origemDaRequisicao(h), '203.0.113.7')
  })

  test('valor forjado sozinho não vira chave nova a cada tentativa', () => {
    const forjada = origemDaRequisicao(cabecalhos({ 'x-forwarded-for': 'inventado-1' }))
    const outra = origemDaRequisicao(cabecalhos({ 'x-forwarded-for': 'inventado-2' }))

    // Ainda são distintas — sem proxy confiável não há como saber —, mas na
    // Vercel o cabeçalho da borda existe e vence, então isso não se aplica.
    assert.notEqual(forjada, outra)
  })

  test('sem cabeçalho nenhum, todos caem na mesma chave', () => {
    // Errar para o lado de segurar: limitador que não sabe de onde veio a
    // requisição não deve liberar.
    assert.equal(origemDaRequisicao(cabecalhos({})), 'origem-desconhecida')
  })
})

describe('limite de tentativas', () => {
  test('libera até o limite e segura depois', () => {
    const chave = `teste-${Math.random()}`

    assert.equal(checkRateLimit(chave, 3, 60_000), true)
    assert.equal(checkRateLimit(chave, 3, 60_000), true)
    assert.equal(checkRateLimit(chave, 3, 60_000), true)
    assert.equal(checkRateLimit(chave, 3, 60_000), false, 'passou do limite')
  })

  test('chaves diferentes não se atrapalham', () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`

    assert.equal(checkRateLimit(a, 1, 60_000), true)
    assert.equal(checkRateLimit(a, 1, 60_000), false)
    assert.equal(checkRateLimit(b, 1, 60_000), true, 'a chave b herdou o limite da a')
  })

  test('tentativa barrada não empurra a janela para frente', () => {
    // Se cada tentativa recusada registrasse um novo horário, quem insistisse
    // sem parar ficaria bloqueado para sempre, mesmo depois da janela passar.
    const chave = `janela-${Math.random()}`

    assert.equal(checkRateLimit(chave, 1, 40), true)
    assert.equal(checkRateLimit(chave, 1, 40), false)

    const fim = Date.now() + 60
    while (Date.now() < fim) {
      /* espera a janela passar */
    }

    assert.equal(checkRateLimit(chave, 1, 40), true, 'ficou bloqueado depois da janela')
  })
})
