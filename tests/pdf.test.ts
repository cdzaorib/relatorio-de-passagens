import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'

import { buildReportPdf } from '@/lib/pdf'
import { summarize } from '@/lib/report'
import type { Profile, Trip } from '@/types'

const perfil: Profile = {
  id: 'u1',
  name: 'Carlos Eduardo Dias',
  supervisor_name: 'Marcelo Ribeiro',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

let contador = 0
function trip(date: string, parcial: Partial<Trip> = {}): Trip {
  contador += 1
  return {
    id: `t${contador}`,
    user_id: 'u1',
    date,
    origin: 'Bananal',
    destination: 'Cocotá',
    client: 'Tecnoarte',
    transport: 'onibus',
    line: '323',
    card: 'jae',
    value: 4.7,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    ...parcial,
  }
}

function dias(quantidade: number): Trip[] {
  const trips: Trip[] = []
  for (let d = 1; d <= quantidade; d++) {
    const date = `2026-09-${String(d).padStart(2, '0')}`
    trips.push(
      trip(date),
      trip(date, { transport: 'barca', line: null, card: 'riocard', value: 5 }),
      trip(date, { transport: 'barca', line: null, card: 'riocard', value: 5 }),
      trip(date),
    )
  }
  return trips
}

async function gerar(trips: Trip[], perfilUsado: Profile | null = perfil) {
  const period = { from: '2026-09-01', to: '2026-09-30' }
  const bytes = await buildReportPdf({
    profile: perfilUsado,
    period,
    trips,
    totals: summarize(trips),
  })
  return { bytes, doc: await PDFDocument.load(bytes) }
}

describe('geração do PDF', () => {
  test('produz um arquivo PDF válido', async () => {
    const { bytes, doc } = await gerar(dias(2))

    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-')
    assert.ok(doc.getPageCount() >= 1)
  })

  test('relatório curto cabe em uma página', async () => {
    const { doc } = await gerar(dias(5))
    assert.equal(doc.getPageCount(), 1)
  })

  test('relatório longo quebra em várias páginas', async () => {
    const { doc } = await gerar(dias(30))
    assert.ok(doc.getPageCount() >= 3, `saíram ${doc.getPageCount()} páginas`)
  })

  test('período sem trecho ainda gera o relatório', async () => {
    const { doc } = await gerar([])
    assert.equal(doc.getPageCount(), 1)
  })

  test('acento no nome e no cabeçalho não derruba a geração', async () => {
    // As fontes padrão do PDF usam WinAnsi; um caractere de fora quebraria tudo.
    const { doc } = await gerar([
      trip('2026-09-01', {
        origin: 'Praça XV',
        destination: 'Cocotá',
        client: 'Hospital São João — unidade Niterói',
      }),
    ])
    assert.equal(doc.getPageCount(), 1)
  })

  test('caractere fora do Latin-1 é trocado em vez de quebrar', async () => {
    const { doc } = await gerar([
      trip('2026-09-01', { client: '医院 ★ Тест', origin: '→ Bananal' }),
    ])
    assert.equal(doc.getPageCount(), 1)
  })

  test('perfil sem nome não impede o relatório', async () => {
    const { doc } = await gerar(dias(1), null)
    assert.equal(doc.getPageCount(), 1)
  })

  test('o título do arquivo traz o período', async () => {
    const { doc } = await gerar(dias(1))
    assert.match(doc.getTitle() ?? '', /01\/09 a 30\/09/)
  })
})
