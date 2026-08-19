'use client'

import { useState } from 'react'

import { deletePlace } from '@/app/dashboard/locais/actions'
import { PlaceForm } from '@/components/locais/PlaceForm'
import { DeleteForm } from '@/components/ui/DeleteForm'
import { RouteLine } from '@/components/ui/RouteLine'
import { formatBRL } from '@/lib/format'
import type { Suggestions } from '@/lib/suggestions'
import { type FarePrice, type PlaceWithLegs } from '@/types'

type PlaceListProps = {
  places: PlaceWithLegs[]
  fares: FarePrice[]
  suggestions: Suggestions
}

export function PlaceList({ places, fares, suggestions }: PlaceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (places.length === 0) {
    return (
      <p className="text-sm text-muted">
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
            <li key={place.id} className="rounded-xl border border-marca/35 bg-barca-soft p-5">
              <p className="mb-4 text-sm font-medium text-ink-soft">Editando {place.name}</p>
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
          <li key={place.id} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="letreiro text-lg text-ink">{place.name}</h3>
                <p className="text-sm text-muted">
                  {place.legs.length} {place.legs.length === 1 ? 'trecho' : 'trechos'} de ida ·
                  ida e volta sai por <span className="dados">{formatBRL(total * 2)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(place.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-paper"
                >
                  Editar
                </button>
                <DeleteForm
                  action={deletePlace}
                  fields={{ id: place.id }}
                  confirmar={`Excluir o local ${place.name}? Os trechos já lançados continuam no relatório.`}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-alerta-soft hover:text-alerta disabled:opacity-60"
                >
                  Excluir
                </DeleteForm>
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <RouteLine
                steps={place.legs.map((leg) => ({
                  origin: leg.origin,
                  destination: leg.destination,
                  transport: leg.transport,
                  line: leg.line,
                  value: Number(leg.value),
                }))}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
