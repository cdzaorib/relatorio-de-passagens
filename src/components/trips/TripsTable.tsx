'use client'

import { useState } from 'react'

import { deleteTrip, deleteTripsOfDay } from '@/app/dashboard/trips/actions'
import { SaveDayAsPlace } from '@/components/trips/SaveDayAsPlace'
import { TripForm } from '@/components/trips/TripForm'
import { CardTag } from '@/components/ui/CardTag'
import { DeleteForm } from '@/components/ui/DeleteForm'
import { RouteLine } from '@/components/ui/RouteLine'
import { contaSaidas } from '@/lib/route'
import { ordemAmbigua } from '@/lib/trips'
import { formatBRL, formatDate } from '@/lib/format'
import type { Suggestions } from '@/lib/suggestions'
import { TRANSPORT_LABELS, type FarePrice, type Trip } from '@/types'

type TripsTableProps = {
  trips: Trip[]
  fares: FarePrice[]
  suggestions: Suggestions
  today: string
}

/** Agrupa por data mantendo a ordem em que os trechos foram lançados. */
function groupByDate(trips: Trip[]): [string, Trip[]][] {
  const groups = new Map<string, Trip[]>()

  for (const trip of trips) {
    const list = groups.get(trip.date) ?? []
    list.push(trip)
    groups.set(trip.date, list)
  }

  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

export function TripsTable({ trips, fares, suggestions, today }: TripsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (trips.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhum trecho lançado ainda neste intervalo.
      </p>
    )
  }

  const days = groupByDate(trips)

  return (
    <div className="space-y-8">
      {days.map(([date, dayTrips]) => {
        const dayTotal = dayTrips.reduce((sum, trip) => sum + Number(trip.value), 0)
        const passos = dayTrips.map((trip) => ({
          origin: trip.origin,
          destination: trip.destination,
          transport: trip.transport,
          line: trip.line,
        }))
        const saidas = contaSaidas(passos)
        const ordemDuvidosa = ordemAmbigua(dayTrips)

        return (
          <div key={date}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="letreiro dados text-base text-ink">{formatDate(date)}</h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted dados">
                  {dayTrips.length} {dayTrips.length === 1 ? 'trecho' : 'trechos'} ·{' '}
                  {formatBRL(dayTotal)}
                </span>
                <SaveDayAsPlace date={date} trips={dayTrips} />
                <DeleteForm
                  action={deleteTripsOfDay}
                  fields={{ date }}
                  confirmar={`Excluir os ${dayTrips.length} trechos de ${formatDate(date)}?`}
                  className="text-sm text-muted transition hover:text-alerta disabled:opacity-60"
                >
                  Excluir o dia
                </DeleteForm>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-line bg-surface px-4 py-3">
              <RouteLine showFares={false} steps={passos} />

              {/*
                Duas saídas num dia podem ser verdade — foi ao cliente, voltou,
                saiu de novo — ou o sinal de que um trecho está com origem e
                destino trocados, que foi o que aconteceu no primeiro uso real.
                O app conta e mostra; quem lançou é quem sabe qual dos dois é.
              */}
              {/*
                Só este dia é que tem ordem duvidosa: os trechos entraram num
                insert único, com created_at idêntico, e sem leg_order não há
                como desempatar. Dias gravados um a um não caem aqui — avisar
                sobre eles seria assustar quem já está certo.
              */}
              {ordemDuvidosa ? (
                <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-onibus-ink">
                  <strong className="font-medium">A ordem deste dia pode estar trocada.</strong>{' '}
                  Os trechos foram gravados no mesmo instante, antes de o app passar
                  a numerá-los, então o banco não tem como saber qual veio primeiro.
                  Confira a sequência acima; se estiver errada, apague o dia e lance
                  de novo.
                </p>
              ) : null}

              {saidas > 1 ? (
                <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
                  Este dia tem <strong className="font-medium text-ink">{saidas} saídas</strong>{' '}
                  separadas: em algum ponto o trecho seguinte não parte de onde o
                  anterior chegou. Se foi um percurso só, algum trecho está com a
                  origem ou o destino trocados.
                </p>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Transporte</th>
                    <th className="px-4 py-3 font-medium">Linha</th>
                    <th className="px-4 py-3 font-medium">Cartão</th>
                    <th className="px-4 py-3 text-right font-medium">Valor</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dayTrips.map((trip) =>
                    editingId === trip.id ? (
                      <tr key={trip.id}>
                        <td colSpan={8} className="bg-barca-soft px-4 py-5">
                          <TripForm
                            trip={trip}
                            fares={fares}
                            suggestions={suggestions}
                            today={today}
                            onDone={() => setEditingId(null)}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={trip.id} className="text-ink-soft">
                        <td className="px-4 py-3">{trip.origin}</td>
                        <td className="px-4 py-3">{trip.destination}</td>
                        <td className="px-4 py-3">{trip.client}</td>
                        <td className="px-4 py-3">{TRANSPORT_LABELS[trip.transport]}</td>
                        <td className="px-4 py-3">{trip.line || '—'}</td>
                        <td className="px-4 py-3">
                          <CardTag card={trip.card} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium dados">
                          {formatBRL(Number(trip.value))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(trip.id)}
                              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-paper"
                            >
                              Editar
                            </button>
                            <DeleteForm
                              action={deleteTrip}
                              fields={{ id: trip.id }}
                              confirmar="Excluir este trecho?"
                              className="rounded-lg px-2.5 py-1 text-xs text-muted transition hover:bg-alerta-soft hover:text-alerta disabled:opacity-60"
                            >
                              Excluir
                            </DeleteForm>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
