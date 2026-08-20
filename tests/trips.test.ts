import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDayLegs,
  faltaLegOrder,
  legsToTrips,
  mirrorLegs,
  ordenaTrechos,
  outboundOf,
  type LegDraft,
} from '@/lib/trips'

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

  test('lançar trecho a trecho com volta não é o mesmo que lançar a ida inteira', () => {
    // O bug que apareceu em produção: quem pegava ônibus e depois barca
    // lançava duas vezes marcando "voltou" nas duas, e o dia saía como duas
    // viagens fechadas em si — ia e voltava do ônibus, ia e voltava da barca —
    // em vez de uma ida com duas conduções e o espelho no fim.
    const trechoAtrecho = [...buildDayLegs([ida[0]], true), ...buildDayLegs([ida[1]], true)]
    const idaInteira = buildDayLegs(ida, true)

    assert.equal(trechoAtrecho.length, idaInteira.length, 'os dois têm 4 trechos')
    assert.deepEqual(
      trechoAtrecho.map((leg) => [leg.origin, leg.destination]),
      [
        ['Bananal', 'Cocotá'],
        ['Cocotá', 'Bananal'],
        ['Cocotá', 'Praça XV'],
        ['Praça XV', 'Cocotá'],
      ],
      'volta para casa no meio do dia e reaparece na Cocotá do nada',
    )
    assert.deepEqual(
      idaInteira.map((leg) => [leg.origin, leg.destination]),
      [
        ['Bananal', 'Cocotá'],
        ['Cocotá', 'Praça XV'],
        ['Praça XV', 'Cocotá'],
        ['Cocotá', 'Bananal'],
      ],
      'percurso contínuo: a volta desfaz a ida na ordem inversa',
    )
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

describe('ordem gravada no lançamento', () => {
  test('cada trecho recebe sua posição, começando em zero', () => {
    const trips = legsToTrips(buildDayLegs(ida, true), 'u1', '2026-07-01')

    assert.deepEqual(
      trips.map((t) => t.leg_order),
      [0, 1, 2, 3],
    )
  })

  test('a ordem gravada reconstrói ida e volta na sequência certa', () => {
    const trips = legsToTrips(buildDayLegs(ida, true), 'u1', '2026-07-01')

    // O banco devolve em ordem arbitrária quando created_at empata; ordenar
    // por leg_order tem de trazer de volta a sequência do lançamento.
    const embaralhado = [trips[3], trips[1], trips[0], trips[2]]
    const reordenado = [...embaralhado].sort((a, b) => a.leg_order! - b.leg_order!)

    assert.deepEqual(
      reordenado.map((t) => [t.origin, t.destination, t.transport]),
      [
        ['Bananal', 'Cocotá', 'onibus'],
        ['Cocotá', 'Praça XV', 'barca'],
        ['Praça XV', 'Cocotá', 'barca'],
        ['Cocotá', 'Bananal', 'onibus'],
      ],
    )
  })

  test('a volta nunca vem antes da ida depois de reordenar', () => {
    const trips = legsToTrips(buildDayLegs(ida, true), 'u1', '2026-07-01')
    const ordenado = [...trips].sort((a, b) => a.leg_order! - b.leg_order!)

    const primeiraVolta = ordenado.findIndex((t) => t.client === 'Residência')
    const ultimaIda = ordenado.map((t) => t.client !== 'Residência').lastIndexOf(true)

    assert.ok(ultimaIda < primeiraVolta, 'a volta apareceu no meio da ida')
  })

  test('trecho avulso sem volta recebe posição zero', () => {
    const trips = legsToTrips([ida[0]], 'u1', '2026-07-01')
    assert.deepEqual(trips.map((t) => t.leg_order), [0])
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

describe('reconhecer a ida dentro de um dia lançado', () => {
  test('dia com volta devolve só a ida', () => {
    const dia = buildDayLegs(ida, true)

    assert.deepEqual(
      outboundOf(dia).map((leg) => [leg.origin, leg.destination]),
      [
        ['Bananal', 'Cocotá'],
        ['Cocotá', 'Praça XV'],
      ],
    )
  })

  test('dia sem volta é ida inteira', () => {
    assert.equal(outboundOf(buildDayLegs(ida, false)).length, 2)
  })

  test('número ímpar de trechos não tem espelho', () => {
    assert.equal(outboundOf([...ida, ida[0]]).length, 3)
  })

  test('dia com duas saídas separadas não é espelho', () => {
    // Foi ao cliente A e voltou, depois foi ao cliente B e voltou: quatro
    // trechos, mas a segunda metade não desfaz a primeira.
    const duasSaidas = [
      ...buildDayLegs([ida[0]], true),
      ...buildDayLegs([ida[1]], true),
    ]

    assert.equal(outboundOf(duasSaidas).length, 4, 'cortou ao meio um dia que não é espelho')
  })

  test('mesmo caminho em transporte diferente não conta como volta', () => {
    // Ida de barca, volta de ônibus pela ponte: os bairros batem, o meio não.
    const dia: LegDraft[] = [
      { ...ida[1] },
      { ...ida[1], origin: ida[1].destination, destination: ida[1].origin, transport: 'onibus' },
    ]

    assert.equal(outboundOf(dia).length, 2)
  })

  test('um trecho só é a ida', () => {
    assert.equal(outboundOf([ida[0]]).length, 1)
  })
})

describe('ordem dos trechos fora do banco', () => {
  const t = (date: string, created_at: string, leg_order: number | null, marca: string) => ({
    date,
    created_at,
    leg_order,
    marca,
  })

  // O caso real: os quatro trechos de um dia nascem com created_at idêntico,
  // porque now() é o horário da transação.
  const empatados = [
    t('2026-08-04', '12:43:15.083617', 2, 'volta-barca'),
    t('2026-08-04', '12:43:15.083617', 0, 'ida-onibus'),
    t('2026-08-04', '12:43:15.083617', 3, 'volta-onibus'),
    t('2026-08-04', '12:43:15.083617', 1, 'ida-barca'),
  ]

  test('leg_order desempata quando created_at é igual', () => {
    assert.deepEqual(
      ordenaTrechos(empatados).map((x) => x.marca),
      ['ida-onibus', 'ida-barca', 'volta-barca', 'volta-onibus'],
    )
  })

  test('sem leg_order a ordem cai para created_at, sem quebrar', () => {
    // É o banco que ainda não migrou: a coluna vem indefinida e o app precisa
    // continuar lendo, mesmo que a ordem fique só aproximada.
    const semColuna = [
      t('2026-08-04', '12:43:38.790707', null, 'segundo'),
      t('2026-08-04', '12:43:15.083617', null, 'primeiro'),
    ]

    assert.deepEqual(
      ordenaTrechos(semColuna).map((x) => x.marca),
      ['primeiro', 'segundo'],
    )
  })

  test('dias recentes primeiro sem inverter a ida e a volta', () => {
    // A lista de lançamentos mostra o dia mais novo em cima, mas dentro do dia
    // a ida tem de continuar vindo antes da volta.
    const dois = [
      ...empatados,
      t('2026-08-05', '09:10:00.000000', 1, 'novo-volta'),
      t('2026-08-05', '09:10:00.000000', 0, 'novo-ida'),
    ]

    assert.deepEqual(
      ordenaTrechos(dois, true).map((x) => x.marca),
      ['novo-ida', 'novo-volta', 'ida-onibus', 'ida-barca', 'volta-barca', 'volta-onibus'],
    )
  })

  test('não altera a lista recebida', () => {
    const copia = structuredClone(empatados)
    ordenaTrechos(empatados)
    assert.deepEqual(empatados, copia)
  })

  test('reproduz o que o banco fazia: mesma ordem do lançamento', () => {
    const trips = legsToTrips(buildDayLegs(ida, true), 'u1', '2026-07-01').map((trip) => ({
      ...trip,
      date: '2026-07-01',
      created_at: '12:00:00.000000',
    }))

    const embaralhado = [trips[3], trips[1], trips[0], trips[2]]

    assert.deepEqual(
      ordenaTrechos(embaralhado).map((t) => [t.origin, t.destination]),
      [
        ['Bananal', 'Cocotá'],
        ['Cocotá', 'Praça XV'],
        ['Praça XV', 'Cocotá'],
        ['Cocotá', 'Bananal'],
      ],
    )
  })
})

describe('banco sem a coluna de ordem', () => {
  test('reconhece pela ausência do campo em todas as linhas', () => {
    assert.equal(faltaLegOrder([{}, {}]), true)
  })

  test('coluna presente com zero não é ausência', () => {
    // O default é 0, então zero é um valor de verdade — não pode ser
    // confundido com "não existe".
    assert.equal(faltaLegOrder([{ leg_order: 0 }, { leg_order: 0 }]), false)
  })

  test('uma linha com a coluna já basta para não avisar', () => {
    assert.equal(faltaLegOrder([{}, { leg_order: 3 }]), false)
  })

  test('sem trecho nenhum não dá para saber, então não avisa', () => {
    assert.equal(faltaLegOrder([]), false)
  })
})
