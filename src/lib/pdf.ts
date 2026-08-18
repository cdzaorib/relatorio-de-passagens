import 'server-only'

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

import { formatBRL, formatDate } from '@/lib/format'
import { formatPeriodLabel, type Period } from '@/lib/period'
import type { ReportTotals } from '@/lib/report'
import { CARD_LABELS, TRANSPORT_LABELS, type Profile, type Trip } from '@/types'

// --- Medidas da página (A4 retrato, em pontos) -------------------------------
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 36

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const ROW_HEIGHT = 16
const HEADER_ROW_HEIGHT = 18
const FONT_SIZE = 8.5
const TITLE_SIZE = 13

const INK = rgb(0.06, 0.09, 0.16)
const MUTED = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.85, 0.87, 0.9)
const STRIPE = rgb(0.97, 0.98, 0.99)

type Column = {
  titulo: string
  largura: number
  /** Alinhamento do conteúdo; o cabeçalho segue o mesmo. */
  alinhamento?: 'esquerda' | 'direita'
  valor: (trip: Trip) => string
}

const COLUNAS: Column[] = [
  { titulo: 'DATA', largura: 42, valor: (t) => formatDate(t.date).slice(0, 5) },
  { titulo: 'BAIRRO ORIGEM', largura: 78, valor: (t) => t.origin },
  { titulo: 'BAIRRO DESTINO', largura: 78, valor: (t) => t.destination },
  { titulo: 'CLIENTE / EMPRESA', largura: 105, valor: (t) => t.client },
  { titulo: 'TRANSPORTE', largura: 62, valor: (t) => TRANSPORT_LABELS[t.transport] },
  { titulo: 'LINHA', largura: 38, valor: (t) => t.line ?? '' },
  { titulo: 'CARTÃO', largura: 58, valor: (t) => CARD_LABELS[t.card] },
  {
    titulo: 'VALOR',
    largura: 62,
    alinhamento: 'direita',
    valor: (t) => formatBRL(Number(t.value)),
  },
]

/**
 * As fontes padrão do PDF usam WinAnsi, que cobre o português mas não tudo.
 * Um caractere de fora derruba a geração inteira, então trocamos antes.
 */
function sanitize(texto: string): string {
  return texto
    .replace(/ /g, ' ') // espaço fixo que o Intl usa em 'R$ 4,70'
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    // Qualquer coisa fora do Latin-1 vira '?' em vez de quebrar o relatório.
    .replace(/[^\x20-\xFF]/g, '?')
}

/** Corta o texto para caber na coluna, com reticências. */
function fit(texto: string, font: PDFFont, size: number, largura: number): string {
  const limpo = sanitize(texto)
  if (font.widthOfTextAtSize(limpo, size) <= largura) return limpo

  let corte = limpo
  while (corte.length > 1 && font.widthOfTextAtSize(`${corte}...`, size) > largura) {
    corte = corte.slice(0, -1)
  }
  return `${corte}...`
}

type Contexto = {
  regular: PDFFont
  negrito: PDFFont
}

/** Desenha o cabeçalho da tabela e devolve o Y da primeira linha de dados. */
function desenhaCabecalhoTabela(page: PDFPage, ctx: Contexto, topo: number): number {
  const base = topo - HEADER_ROW_HEIGHT

  page.drawRectangle({
    x: MARGIN,
    y: base,
    width: CONTENT_WIDTH,
    height: HEADER_ROW_HEIGHT,
    color: rgb(0.94, 0.96, 0.99),
  })

  let x = MARGIN
  for (const coluna of COLUNAS) {
    const texto = fit(coluna.titulo, ctx.negrito, 7, coluna.largura - 8)
    const largura = ctx.negrito.widthOfTextAtSize(texto, 7)

    page.drawText(texto, {
      x: coluna.alinhamento === 'direita' ? x + coluna.largura - 4 - largura : x + 4,
      y: base + 6,
      size: 7,
      font: ctx.negrito,
      color: MUTED,
    })
    x += coluna.largura
  }

  page.drawLine({
    start: { x: MARGIN, y: base },
    end: { x: MARGIN + CONTENT_WIDTH, y: base },
    thickness: 0.7,
    color: LINE,
  })

  return base
}

/** Cabeçalho do documento: título e dados do funcionário. */
function desenhaCabecalhoDocumento(
  page: PDFPage,
  ctx: Contexto,
  profile: Profile | null,
  period: Period,
): number {
  let y = PAGE_HEIGHT - MARGIN

  page.drawText(sanitize('RELATÓRIO DE REEMBOLSO DE PASSAGEM'), {
    x: MARGIN,
    y: y - TITLE_SIZE,
    size: TITLE_SIZE,
    font: ctx.negrito,
    color: INK,
  })

  y -= TITLE_SIZE + 18

  const campos = [
    { rotulo: 'NOME DO FUNCIONÁRIO', valor: profile?.name || '—' },
    { rotulo: 'NOME DO SUPERIOR IMEDIATO', valor: profile?.supervisor_name || '—' },
    { rotulo: 'PERÍODO', valor: formatPeriodLabel(period) },
  ]

  const largura = CONTENT_WIDTH / 3

  campos.forEach((campo, indice) => {
    const x = MARGIN + largura * indice

    page.drawText(sanitize(campo.rotulo), {
      x,
      y: y - 7,
      size: 6.5,
      font: ctx.negrito,
      color: MUTED,
    })

    page.drawText(fit(campo.valor, ctx.regular, 10, largura - 10), {
      x,
      y: y - 21,
      size: 10,
      font: ctx.regular,
      color: INK,
    })
  })

  y -= 32

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 1,
    color: rgb(0.55, 0.58, 0.62),
  })

  return y - 14
}

/** Rodapé com os totais por cartão e o total geral. */
function desenhaTotais(page: PDFPage, ctx: Contexto, topo: number, totals: ReportTotals): number {
  let y = topo

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 1,
    color: rgb(0.55, 0.58, 0.62),
  })

  const linhas = [
    { rotulo: 'TOTAL RIO CARD', valor: totals.riocard, destaque: false },
    { rotulo: 'TOTAL JAÉ', valor: totals.jae, destaque: false },
    { rotulo: 'TOTAL GERAL', valor: totals.total, destaque: true },
  ]

  for (const linha of linhas) {
    y -= ROW_HEIGHT + 2
    const font = linha.destaque ? ctx.negrito : ctx.regular
    const size = linha.destaque ? 10 : 9

    if (linha.destaque) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 4,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT + 4,
        color: rgb(0.94, 0.96, 0.99),
      })
    }

    page.drawText(sanitize(linha.rotulo), {
      x: MARGIN + 6,
      y: y + 2,
      size,
      font,
      color: INK,
    })

    const valor = sanitize(formatBRL(linha.valor))
    const largura = font.widthOfTextAtSize(valor, size)

    page.drawText(valor, {
      x: MARGIN + CONTENT_WIDTH - 6 - largura,
      y: y + 2,
      size,
      font,
      color: INK,
    })
  }

  return y
}

export type ReportPdfInput = {
  profile: Profile | null
  period: Period
  trips: Trip[]
  totals: ReportTotals
}

/** Monta o PDF do relatório e devolve os bytes. */
export async function buildReportPdf({
  profile,
  period,
  trips,
  totals,
}: ReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  doc.setTitle(`Relatório de reembolso — ${formatPeriodLabel(period)}`)
  doc.setAuthor(profile?.name ?? '')
  doc.setCreator('Relatório de Reembolso de Passagem')

  const ctx: Contexto = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    negrito: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = desenhaCabecalhoDocumento(page, ctx, profile, period)
  y = desenhaCabecalhoTabela(page, ctx, y)

  // As linhas param acima da numeração de página.
  const limiteLinhas = MARGIN + 24
  // O bloco de totais pode ir até a margem: 8 de respiro + três linhas.
  const alturaTotais = 8 + (ROW_HEIGHT + 2) * 3 + 4

  trips.forEach((trip, indice) => {
    if (y - ROW_HEIGHT < limiteLinhas) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
      y = desenhaCabecalhoTabela(page, ctx, y)
    }

    y -= ROW_HEIGHT

    // Zebra: ajuda a seguir a linha até a coluna do valor.
    if (indice % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: STRIPE,
      })
    }

    let x = MARGIN
    for (const coluna of COLUNAS) {
      const texto = fit(coluna.valor(trip), ctx.regular, FONT_SIZE, coluna.largura - 8)
      const largura = ctx.regular.widthOfTextAtSize(texto, FONT_SIZE)

      page.drawText(texto, {
        x: coluna.alinhamento === 'direita' ? x + coluna.largura - 4 - largura : x + 4,
        y: y + 5,
        size: FONT_SIZE,
        font: ctx.regular,
        color: INK,
      })
      x += coluna.largura
    }
  })

  if (trips.length === 0) {
    y -= ROW_HEIGHT + 6
    page.drawText(sanitize('Nenhum trecho lançado neste período.'), {
      x: MARGIN + 4,
      y,
      size: FONT_SIZE,
      font: ctx.regular,
      color: MUTED,
    })
  }

  // Totais sempre inteiros: se não couberem, vão para uma página nova.
  if (y - alturaTotais < MARGIN) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN
  }

  desenhaTotais(page, ctx, y - 8, totals)

  // Numeração, depois de saber quantas páginas saíram.
  const paginas = doc.getPages()
  paginas.forEach((pagina, indice) => {
    const texto = sanitize(`Página ${indice + 1} de ${paginas.length}`)
    const largura = ctx.regular.widthOfTextAtSize(texto, 7)

    pagina.drawText(texto, {
      x: PAGE_WIDTH - MARGIN - largura,
      y: MARGIN - 14,
      size: 7,
      font: ctx.regular,
      color: MUTED,
    })
  })

  return doc.save()
}
