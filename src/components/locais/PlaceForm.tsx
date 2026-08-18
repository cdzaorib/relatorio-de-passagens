'use client'

import { useActionState, useEffect, useState } from 'react'

import { createPlace, updatePlace } from '@/app/dashboard/locais/actions'
import { Alert } from '@/components/ui/Alert'
import { SelectField } from '@/components/ui/SelectField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { fareToLegValues } from '@/lib/fares'
import { formatAmountInput } from '@/lib/format'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { MAX_LENGTHS } from '@/lib/validation'
import type { Suggestions } from '@/lib/suggestions'
import {
  CARD_LABELS,
  CARD_OPTIONS,
  DEFAULT_CARD_BY_TRANSPORT,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  type CardType,
  type FarePrice,
  type PlaceWithLegs,
  type TransportType,
} from '@/types'

const TRANSPORT_SELECT = TRANSPORT_OPTIONS.map((value) => ({
  value,
  label: TRANSPORT_LABELS[value],
}))
const CARD_SELECT = CARD_OPTIONS.map((value) => ({ value, label: CARD_LABELS[value] }))

/** Um trecho da ida enquanto está sendo editado na tela. */
type LegRow = {
  origin: string
  destination: string
  transport: TransportType
  card: CardType
  line: string
  value: string
  fareGroupId: string | null
}

function emptyLeg(): LegRow {
  return {
    origin: '',
    destination: '',
    transport: 'onibus',
    card: DEFAULT_CARD_BY_TRANSPORT.onibus,
    line: '',
    value: '',
    fareGroupId: null,
  }
}

function legsFromPlace(place: PlaceWithLegs): LegRow[] {
  return place.legs.map((leg) => ({
    origin: leg.origin,
    destination: leg.destination,
    transport: leg.transport,
    card: leg.card,
    line: leg.line ?? '',
    value: formatAmountInput(Number(leg.value)),
    fareGroupId: leg.fare_group_id,
  }))
}

type PlaceFormProps = {
  fares: FarePrice[]
  suggestions: Suggestions
  place?: PlaceWithLegs
  onDone?: () => void
  onCancel?: () => void
}

export function PlaceForm({ fares, suggestions, place, onDone, onCancel }: PlaceFormProps) {
  const isEditing = Boolean(place)
  const [state, formAction] = useActionState(
    isEditing ? updatePlace : createPlace,
    EMPTY_FORM_STATE,
  )

  const [name, setName] = useState(place?.name ?? '')
  const [legs, setLegs] = useState<LegRow[]>(place ? legsFromPlace(place) : [emptyLeg()])

  function updateLeg(index: number, changes: Partial<LegRow>) {
    setLegs((current) =>
      current.map((leg, position) => (position === index ? { ...leg, ...changes } : leg)),
    )
  }

  /** Escolher uma passagem preenche transporte, cartão, linha e valor do trecho. */
  function applyFare(index: number, fareId: string) {
    const fare = fares.find((item) => item.id === fareId)
    if (!fare) {
      updateLeg(index, { fareGroupId: null })
      return
    }

    const applied = fareToLegValues(fare)
    updateLeg(index, {
      transport: applied.transport,
      card: applied.card,
      value: formatAmountInput(applied.value),
      line: applied.line || '',
      fareGroupId: applied.fareGroupId,
    })
  }

  useEffect(() => {
    if (!state.success) return

    if (isEditing) {
      onDone?.()
    } else {
      setName('')
      setLegs([emptyLeg()])
    }
  }, [state, isEditing, onDone])

  // O servidor recebe os trechos como JSON: o número de linhas é dinâmico.
  const serializedLegs = JSON.stringify(legs)

  return (
    <form action={formAction} className="space-y-5">
      {place ? <input type="hidden" name="id" value={place.id} /> : null}
      <input type="hidden" name="legs" value={serializedLegs} />

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success && !isEditing ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="sm:max-w-sm">
        <TextField
          label="Nome do local"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="HCNI"
          maxLength={MAX_LENGTHS.local}
          hint="Vira o cliente dos trechos de ida no relatório."
          error={state.fieldErrors?.name}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-slate-900">Trechos da ida</h3>
          <p className="text-sm text-slate-600">
            Na ordem em que você pega. A volta é gerada espelhada na hora do
            lançamento — não precisa cadastrar.
          </p>
        </div>

        {legs.map((leg, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {index + 1}º trecho
              </span>
              {legs.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setLegs((current) => current.filter((_item, position) => position !== index))
                  }
                  className="text-sm font-medium text-slate-500 transition hover:text-red-700"
                >
                  Remover
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Origem"
                name={`origin-${index}`}
                value={leg.origin}
                onChange={(event) => updateLeg(index, { origin: event.target.value })}
                suggestions={suggestions.neighborhoods}
                placeholder="Bananal"
                maxLength={MAX_LENGTHS.bairro}
              />

              <TextField
                label="Destino"
                name={`destination-${index}`}
                value={leg.destination}
                onChange={(event) => updateLeg(index, { destination: event.target.value })}
                suggestions={suggestions.neighborhoods}
                placeholder="Cocotá"
                maxLength={MAX_LENGTHS.bairro}
              />

              {fares.length > 0 ? (
                <SelectField
                  label="Passagem cadastrada"
                  name={`fare-${index}`}
                  value={fares.find((fare) => fare.group_id === leg.fareGroupId)?.id ?? ''}
                  onChange={(event) => applyFare(index, event.target.value)}
                  options={[
                    { value: '', label: 'Preencher na mão' },
                    ...fares.map((fare) => ({ value: fare.id, label: fare.label })),
                  ]}
                  hint="O valor acompanha o reajuste."
                />
              ) : null}

              <SelectField
                label="Transporte"
                name={`transport-${index}`}
                value={leg.transport}
                onChange={(event) => {
                  const transport = event.target.value as TransportType
                  updateLeg(index, {
                    transport,
                    card: DEFAULT_CARD_BY_TRANSPORT[transport],
                  })
                }}
                options={TRANSPORT_SELECT}
              />

              <TextField
                label="Linha"
                name={`line-${index}`}
                value={leg.line}
                onChange={(event) => updateLeg(index, { line: event.target.value })}
                placeholder="323"
                maxLength={MAX_LENGTHS.linha}
              />

              <SelectField
                label="Cartão"
                name={`card-${index}`}
                value={leg.card}
                onChange={(event) => updateLeg(index, { card: event.target.value as CardType })}
                options={CARD_SELECT}
              />

              <TextField
                label="Valor"
                name={`value-${index}`}
                inputMode="decimal"
                value={leg.value}
                onChange={(event) => updateLeg(index, { value: event.target.value })}
                placeholder="4,70"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setLegs((current) => [...current, emptyLeg()])}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
        >
          + Adicionar trecho
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Salvando...">
          {isEditing ? 'Salvar alterações' : 'Cadastrar local'}
        </SubmitButton>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
