'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { createFarePrice, updateFarePrice } from '@/app/dashboard/perfil/actions'
import { Alert } from '@/components/ui/Alert'
import { SelectField } from '@/components/ui/SelectField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { formatAmountInput } from '@/lib/format'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { MAX_LENGTHS } from '@/lib/validation'
import {
  CARD_LABELS,
  CARD_OPTIONS,
  DEFAULT_CARD_BY_TRANSPORT,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  type CardType,
  type FarePrice,
  type TransportType,
} from '@/types'

const TRANSPORT_SELECT = TRANSPORT_OPTIONS.map((value) => ({
  value,
  label: TRANSPORT_LABELS[value],
}))

const CARD_SELECT = CARD_OPTIONS.map((value) => ({ value, label: CARD_LABELS[value] }))

type FarePriceFormProps = {
  /** Sem passagem = cadastro novo. Com passagem = edição. */
  farePrice?: FarePrice
  onDone?: () => void
  onCancel?: () => void
}

export function FarePriceForm({ farePrice, onDone, onCancel }: FarePriceFormProps) {
  const isEditing = Boolean(farePrice)
  const [state, formAction] = useActionState(
    isEditing ? updateFarePrice : createFarePrice,
    EMPTY_FORM_STATE,
  )

  const formRef = useRef<HTMLFormElement>(null)
  const [transport, setTransport] = useState<TransportType>(farePrice?.transport ?? 'onibus')
  const [card, setCard] = useState<CardType>(
    farePrice?.card ?? DEFAULT_CARD_BY_TRANSPORT[farePrice?.transport ?? 'onibus'],
  )

  // Trocar o transporte já sugere o cartão de sempre, mas segue editável:
  // tem ônibus que é pago no RIO CARD.
  function handleTransportChange(next: TransportType) {
    setTransport(next)
    setCard(DEFAULT_CARD_BY_TRANSPORT[next])
  }

  useEffect(() => {
    if (!state.success) return

    if (isEditing) {
      onDone?.()
    } else {
      // Cadastro novo: limpa para lançar a próxima passagem.
      formRef.current?.reset()
      setTransport('onibus')
      setCard(DEFAULT_CARD_BY_TRANSPORT.onibus)
    }
  }, [state, isEditing, onDone])

  const fieldError = (field: string) => state.fieldErrors?.[field]

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {farePrice ? <input type="hidden" name="id" value={farePrice.id} /> : null}

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success && !isEditing ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nome da passagem"
          name="label"
          required
          defaultValue={farePrice?.label ?? ''}
          placeholder="Ônibus 323"
          maxLength={MAX_LENGTHS.passagem}
          hint="Costuma ser a linha, para você reconhecer depois."
          error={fieldError('label')}
        />

        <TextField
          label="Valor"
          name="value"
          required
          inputMode="decimal"
          defaultValue={farePrice ? formatAmountInput(Number(farePrice.value)) : ''}
          placeholder="4,70"
          error={fieldError('value')}
        />

        <SelectField
          label="Meio de transporte"
          name="transport"
          options={TRANSPORT_SELECT}
          value={transport}
          onChange={(event) => handleTransportChange(event.target.value as TransportType)}
          error={fieldError('transport')}
        />

        <SelectField
          label="Cartão"
          name="card"
          options={CARD_SELECT}
          value={card}
          onChange={(event) => setCard(event.target.value as CardType)}
          hint="Sugerido pelo transporte, mas dá para trocar."
          error={fieldError('card')}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Salvando...">
          {isEditing ? 'Salvar alteração' : 'Cadastrar passagem'}
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
