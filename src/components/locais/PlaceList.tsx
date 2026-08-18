'use client'

import { useState } from 'react'

import { deletePlace } from '@/app/dashboard/locais/actions'
import { PlaceForm } from '@/components/locais/PlaceForm'
import { formatBRL } from '@/lib/format'
import type { Suggestions } from '@/lib/suggestions'
import { TRANSPORT_LABELS, type FarePrice, type PlaceWithLegs } from '@/types'

type PlaceListProps = {
  places: PlaceWithLegs[]
  fares: FarePrice[]
  suggestions: Suggestions
}

export function PlaceList({ places, fares, suggestions }: PlaceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (places.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Nenhum local cadastrado ainda. Cadastre o primeiro abaixo.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {places.map((place) => {
        const total = place.legs.reduce((sum, leg) => sum + Number(leg.value), 0)

        if (editingId === place.id) {
          return (
            <li key={place.id} className="rounded-xl border border-brand-100 bg-brand-50/40 p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Editando {place.name}</p>
              <PlaceForm
                place={place}
                fares={fares}
                suggestions={suggestions}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          )
        }

        return (
          <li key={place.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{place.name}</h3>
                <p className="text-sm text-slate-500">
                  {place.legs.length} {place.legs.length === 1 ? 'trecho' : 'trechos'} de ida ·
                  ida e volta sai por {formatBRL(total * 2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(place.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Editar
                </button>
                <form
                  action={deletePlace}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Excluir o local ${place.name}? Os trechos já lançados continuam no relatório.`,
                      )
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="id" value={place.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </div>

            <ol className="mt-4 space-y-1.5 text-sm text-slate-600">
              {place.legs.map((leg, index) => (
                <li key={leg.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs text-slate-400 tabular-nums">{index + 1}.</span>
                  <span className="text-slate-800">
                    {leg.origin} → {leg.destination}
                  </span>
                  <span className="text-slate-500">
                    {TRANSPORT_LABELS[leg.transport]}
                    {leg.line ? ` ${leg.line}` : ''} · {formatBRL(Number(leg.value))}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        )
      })}
    </ul>
  )
}
