'use client'

import { useState } from 'react'

import { deleteTrip, deleteTripsOfDay } from '@/app/dashboard/trips/actions'
import { TripForm } from '@/components/trips/TripForm'
import { formatBRL, formatDate } from '@/lib/format'
import type { Suggestions } from '@/lib/suggestions'
import { CARD_LABELS, TRANSPORT_LABELS, type FarePrice, type Trip } from '@/types'

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
      <p className="text-sm text-slate-600">
        Nenhum trecho lançado ainda neste intervalo.
      </p>
    )
  }

  const days = groupByDate(trips)

  return (
    <div className="space-y-8">
      {days.map(([date, dayTrips]) => {
        const dayTotal = dayTrips.reduce((sum, trip) => sum + Number(trip.value), 0)

        return (
          <div key={date}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{formatDate(date)}</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 tabular-nums">
                  {dayTrips.length} {dayTrips.length === 1 ? 'trecho' : 'trechos'} ·{' '}
                  {formatBRL(dayTotal)}
                </span>
                <form
                  action={deleteTripsOfDay}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Excluir os ${dayTrips.length} trechos de ${formatDate(date)}?`,
                      )
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="date" value={date} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-500 transition hover:text-red-700"
                  >
                    Excluir o dia
                  </button>
                </form>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
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
                <tbody className="divide-y divide-slate-100">
                  {dayTrips.map((trip) =>
                    editingId === trip.id ? (
                      <tr key={trip.id}>
                        <td colSpan={8} className="bg-brand-50/40 px-4 py-5">
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
                      <tr key={trip.id} className="text-slate-700">
                        <td className="px-4 py-3">{trip.origin}</td>
                        <td className="px-4 py-3">{trip.destination}</td>
                        <td className="px-4 py-3">{trip.client}</td>
                        <td className="px-4 py-3">{TRANSPORT_LABELS[trip.transport]}</td>
                        <td className="px-4 py-3">{trip.line || '—'}</td>
                        <td className="px-4 py-3">{CARD_LABELS[trip.card]}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatBRL(Number(trip.value))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(trip.id)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Editar
                            </button>
                            <form
                              action={deleteTrip}
                              onSubmit={(event) => {
                                if (!window.confirm('Excluir este trecho?')) {
                                  event.preventDefault()
                                }
                              }}
                            >
                              <input type="hidden" name="id" value={trip.id} />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                              >
                                Excluir
                              </button>
                            </form>
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
