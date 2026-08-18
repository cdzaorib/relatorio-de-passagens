'use client'

import { useActionState, useState } from 'react'

import { applyPlace } from '@/app/dashboard/trips/actions'
import { Alert } from '@/components/ui/Alert'
import { SelectField } from '@/components/ui/SelectField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { TRANSPORT_LABELS, type PlaceWithLegs } from '@/types'

/**
 * Atalho do dia a dia: escolher o local e a data lança a ida inteira e,
 * marcando a volta, também os trechos espelhados.
 */
export function PlaceLauncher({ places, today }: { places: PlaceWithLegs[]; today: string }) {
  const [state, formAction] = useActionState(applyPlace, EMPTY_FORM_STATE)
  const [placeId, setPlaceId] = useState(places[0]?.id ?? '')
  const [includeReturn, setIncludeReturn] = useState(true)

  const selected = places.find((place) => place.id === placeId)
  const legCount = selected?.legs.length ?? 0
  const totalLegs = includeReturn ? legCount * 2 : legCount

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Local"
          name="place_id"
          value={placeId}
          onChange={(event) => setPlaceId(event.target.value)}
          options={places.map((place) => ({ value: place.id, label: place.name }))}
        />

        <TextField label="Data" name="date" type="date" required defaultValue={today} />
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="round_trip"
          checked={includeReturn}
          onChange={(event) => setIncludeReturn(event.target.checked)}
          className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-700">Lançar também a volta para casa</span>
      </label>

      {selected && legCount > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Vai lançar {totalLegs} {totalLegs === 1 ? 'trecho' : 'trechos'}:
          </p>
          <ol className="mt-2 space-y-1 text-sm text-slate-600">
            {selected.legs.map((leg) => (
              <li key={leg.id}>
                {leg.origin} → {leg.destination} · {TRANSPORT_LABELS[leg.transport]}
                {leg.line ? ` ${leg.line}` : ''}
              </li>
            ))}
            {includeReturn
              ? [...selected.legs].reverse().map((leg) => (
                  <li key={`volta-${leg.id}`} className="text-slate-500">
                    {leg.destination} → {leg.origin} · {TRANSPORT_LABELS[leg.transport]}
                    {leg.line ? ` ${leg.line}` : ''} (volta)
                  </li>
                ))
              : null}
          </ol>
        </div>
      ) : null}

      <div className="sm:w-48">
        <SubmitButton pendingLabel="Lançando...">Lançar dia</SubmitButton>
      </div>
    </form>
  )
}
