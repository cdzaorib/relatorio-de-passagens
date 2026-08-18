'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { createTrip, updateTrip } from '@/app/dashboard/trips/actions'
import { Alert } from '@/components/ui/Alert'
import { SelectField } from '@/components/ui/SelectField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { fareToLegValues } from '@/lib/fares'
import { formatAmountInput } from '@/lib/format'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import type { Suggestions } from '@/lib/suggestions'
import {
  CARD_LABELS,
  CARD_OPTIONS,
  DEFAULT_CARD_BY_TRANSPORT,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  type CardType,
  type FarePrice,
  type TransportType,
  type Trip,
} from '@/types'

const TRANSPORT_SELECT = TRANSPORT_OPTIONS.map((value) => ({
  value,
  label: TRANSPORT_LABELS[value],
}))
const CARD_SELECT = CARD_OPTIONS.map((value) => ({ value, label: CARD_LABELS[value] }))

type TripFormProps = {
  fares: FarePrice[]
  suggestions: Suggestions
  today: string
  /** Sem trecho = lançamento novo. Com trecho = edição. */
  trip?: Trip
  onDone?: () => void
  onCancel?: () => void
}

export function TripForm({
  fares,
  suggestions,
  today,
  trip,
  onDone,
  onCancel,
}: TripFormProps) {
  const isEditing = Boolean(trip)
  const [state, formAction] = useActionState(
    isEditing ? updateTrip : createTrip,
    EMPTY_FORM_STATE,
  )

  const formRef = useRef<HTMLFormElement>(null)
  const [date, setDate] = useState(trip?.date ?? today)
  const [transport, setTransport] = useState<TransportType>(trip?.transport ?? 'onibus')
  const [card, setCard] = useState<CardType>(
    trip?.card ?? DEFAULT_CARD_BY_TRANSPORT[trip?.transport ?? 'onibus'],
  )
  const [line, setLine] = useState(trip?.line ?? '')
  const [value, setValue] = useState(trip ? formatAmountInput(Number(trip.value)) : '')
  const [fareId, setFareId] = useState('')

  /** Escolher uma passagem cadastrada preenche transporte, cartão e valor. */
  function handleFareChange(nextFareId: string) {
    setFareId(nextFareId)

    const fare = fares.find((item) => item.id === nextFareId)
    if (!fare) return

    const applied = fareToLegValues(fare)
    setTransport(applied.transport)
    setCard(applied.card)
    setValue(formatAmountInput(applied.value))
    if (applied.line) setLine(applied.line)
  }

  // Regra 2: o transporte sugere o cartão, sem travar a escolha.
  function handleTransportChange(next: TransportType) {
    setTransport(next)
    setCard(DEFAULT_CARD_BY_TRANSPORT[next])
  }

  useEffect(() => {
    if (!state.success) return

    if (isEditing) {
      onDone?.()
      return
    }

    // A data fica como está: quem lança na mão costuma lançar vários
    // trechos do mesmo dia em sequência.
    formRef.current?.reset()
    setTransport('onibus')
    setCard(DEFAULT_CARD_BY_TRANSPORT.onibus)
    setLine('')
    setValue('')
    setFareId('')
  }, [state, isEditing, onDone])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success && !isEditing ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Data"
          name="date"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <TextField
          label="Bairro de origem"
          name="origin"
          required
          defaultValue={trip?.origin ?? ''}
          suggestions={suggestions.neighborhoods}
          placeholder="Bananal"
        />

        <TextField
          label="Bairro de destino"
          name="destination"
          required
          defaultValue={trip?.destination ?? ''}
          suggestions={suggestions.neighborhoods}
          placeholder="Cocotá"
        />

        <TextField
          label="Cliente, empresa ou residência"
          name="client"
          required
          defaultValue={trip?.client ?? ''}
          suggestions={suggestions.clients}
          placeholder="Tecnoarte"
        />

        {fares.length > 0 ? (
          <SelectField
            label="Passagem cadastrada"
            name="fare_id"
            value={fareId}
            onChange={(event) => handleFareChange(event.target.value)}
            options={[
              { value: '', label: 'Preencher na mão' },
              ...fares.map((fare) => ({ value: fare.id, label: fare.label })),
            ]}
            hint="Preenche transporte, cartão e valor."
          />
        ) : null}

        <SelectField
          label="Meio de transporte"
          name="transport"
          options={TRANSPORT_SELECT}
          value={transport}
          onChange={(event) => handleTransportChange(event.target.value as TransportType)}
        />

        <TextField
          label="Linha"
          name="line"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          placeholder="323"
          hint="Deixe vazio na barca."
        />

        <SelectField
          label="Cartão"
          name="card"
          options={CARD_SELECT}
          value={card}
          onChange={(event) => setCard(event.target.value as CardType)}
        />

        <TextField
          label="Valor"
          name="value"
          required
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="4,70"
        />
      </div>

      {!isEditing ? (
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            name="round_trip"
            defaultChecked
            className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-700">
            <strong className="font-medium text-slate-900">
              Voltou para o mesmo local de início?
            </strong>
            <br />
            Lança também o trecho de volta, com origem e destino trocados e
            cliente &quot;Residência&quot;.
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="sm:w-48">
          <SubmitButton pendingLabel="Salvando...">
            {isEditing ? 'Salvar alteração' : 'Lançar trecho'}
          </SubmitButton>
        </div>

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
