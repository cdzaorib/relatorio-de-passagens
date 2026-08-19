'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'

import { createTrip, updateTrip } from '@/app/dashboard/trips/actions'
import { Alert } from '@/components/ui/Alert'
import { RouteLine } from '@/components/ui/RouteLine'
import { SelectField } from '@/components/ui/SelectField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { fareToLegValues } from '@/lib/fares'
import { formatAmountInput } from '@/lib/format'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { mirrorLegs } from '@/lib/trips'
import type { Suggestions } from '@/lib/suggestions'
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
  type Trip,
} from '@/types'

const TRANSPORT_SELECT = TRANSPORT_OPTIONS.map((value) => ({
  value,
  label: TRANSPORT_LABELS[value],
}))
const CARD_SELECT = CARD_OPTIONS.map((value) => ({ value, label: CARD_LABELS[value] }))

/** Um trecho da ida enquanto está sendo preenchido. */
type Trecho = {
  origin: string
  destination: string
  client: string
  transport: TransportType
  card: CardType
  line: string
  value: string
  fareId: string
}

function trechoVazio(anterior?: Trecho): Trecho {
  return {
    // Emenda no anterior: quem desce da barca embarca no ônibus ali mesmo.
    origin: anterior?.destination ?? '',
    destination: '',
    client: anterior?.client ?? '',
    transport: 'onibus',
    card: DEFAULT_CARD_BY_TRANSPORT.onibus,
    line: '',
    value: '',
    fareId: '',
  }
}

function trechoDoTrip(trip: Trip): Trecho {
  return {
    origin: trip.origin,
    destination: trip.destination,
    client: trip.client,
    transport: trip.transport,
    card: trip.card,
    line: trip.line ?? '',
    value: formatAmountInput(Number(trip.value)),
    fareId: '',
  }
}

type TripFormProps = {
  fares: FarePrice[]
  suggestions: Suggestions
  today: string
  /** Sem trecho = lançar o dia. Com trecho = editar um trecho existente. */
  trip?: Trip
  onDone?: () => void
  onCancel?: () => void
}

export function TripForm({ fares, suggestions, today, trip, onDone, onCancel }: TripFormProps) {
  const isEditing = Boolean(trip)
  const [state, formAction] = useActionState(
    isEditing ? updateTrip : createTrip,
    EMPTY_FORM_STATE,
  )

  const [date, setDate] = useState(trip?.date ?? today)
  const [voltou, setVoltou] = useState(true)
  const [trechos, setTrechos] = useState<Trecho[]>(
    trip ? [trechoDoTrip(trip)] : [trechoVazio()],
  )

  /**
   * Na edição a action lê um trecho só, pelos nomes secos ('origin'). No
   * lançamento o índice separa os campos — e os erros chegam com ele na chave.
   */
  const nomeDoCampo = (indice: number, campo: string) =>
    isEditing ? campo : `${campo}-${indice}`

  const erroDoCampo = (indice: number, campo: string) =>
    isEditing ? state.fieldErrors?.[campo] : state.fieldErrors?.[`${indice}.${campo}`]

  function alterar(indice: number, mudancas: Partial<Trecho>) {
    setTrechos((atual) =>
      atual.map((trecho, posicao) => (posicao === indice ? { ...trecho, ...mudancas } : trecho)),
    )
  }

  /** Escolher uma passagem cadastrada preenche transporte, cartão e valor. */
  function aplicarPassagem(indice: number, fareId: string) {
    const fare = fares.find((item) => item.id === fareId)
    if (!fare) {
      alterar(indice, { fareId: '' })
      return
    }

    const aplicado = fareToLegValues(fare)
    alterar(indice, {
      fareId,
      transport: aplicado.transport,
      card: aplicado.card,
      value: formatAmountInput(aplicado.value),
      line: aplicado.line || '',
    })
  }

  useEffect(() => {
    if (!state.success) return

    if (isEditing) {
      onDone?.()
      return
    }

    // A data fica: quem lança atrasado costuma lançar vários dias seguidos.
    setTrechos([trechoVazio()])
    setVoltou(true)
  }, [state, isEditing, onDone])

  // Prévia do que será gravado, para conferir antes de confirmar. Passa pelo
  // mesmo mirrorLegs do servidor: se a volta sair errada aqui, sai errada lá.
  const ida = trechos
    .filter((trecho) => trecho.origin && trecho.destination)
    .map((trecho) => ({
      origin: trecho.origin,
      destination: trecho.destination,
      client: trecho.client,
      transport: trecho.transport,
      card: trecho.card,
      line: trecho.line || null,
      value: 0,
    }))
  const previa = voltou ? [...ida, ...mirrorLegs(ida)] : ida

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}
      {!isEditing ? (
        <input
          type="hidden"
          name="legs"
          value={JSON.stringify(trechos.map(({ fareId: _fareId, ...trecho }) => trecho))}
        />
      ) : null}

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success && !isEditing ? <Alert variant="success">{state.success}</Alert> : null}
      {state.fieldErrors?.legs ? <Alert variant="error">{state.fieldErrors.legs}</Alert> : null}

      {fares.length === 0 && !isEditing ? (
        <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-muted">
          Você ainda não cadastrou nenhuma passagem, então o valor precisa ser
          digitado a cada trecho.{' '}
          <Link href="/dashboard/perfil" className="font-medium text-marca-texto hover:text-marca">
            Cadastre as suas no perfil
          </Link>{' '}
          e o formulário passa a preencher transporte, cartão e valor sozinho.
        </p>
      ) : null}

      <div className="sm:max-w-[12rem]">
        <TextField
          label="Data"
          name="date"
          type="date"
          required
          value={date}
          onChange={(evento) => setDate(evento.target.value)}
          error={state.fieldErrors?.date}
        />
      </div>

      {trechos.map((trecho, indice) => (
        <div
          key={indice}
          className={isEditing ? '' : 'rounded-lg border border-line bg-paper/60 p-4'}
        >
          {!isEditing ? (
            <div className="mb-3 flex items-center justify-between">
              <span className="letreiro text-xs text-muted">
                {indice + 1}ª condução da ida
              </span>
              {trechos.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setTrechos((atual) => atual.filter((_item, posicao) => posicao !== indice))
                  }
                  className="text-sm text-muted transition-colors hover:text-alerta"
                >
                  Remover
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Bairro de origem"
              name={nomeDoCampo(indice, 'origin')}
              value={trecho.origin}
              onChange={(evento) => alterar(indice, { origin: evento.target.value })}
              suggestions={suggestions.neighborhoods}
              placeholder="Bananal"
              maxLength={MAX_LENGTHS.bairro}
              autoComplete="off"
              error={erroDoCampo(indice, 'origin')}
            />

            <TextField
              label="Bairro de destino"
              name={nomeDoCampo(indice, 'destination')}
              value={trecho.destination}
              onChange={(evento) => alterar(indice, { destination: evento.target.value })}
              suggestions={suggestions.neighborhoods}
              placeholder="Cocotá"
              maxLength={MAX_LENGTHS.bairro}
              autoComplete="off"
              error={erroDoCampo(indice, 'destination')}
            />

            <TextField
              label="Cliente, empresa ou residência"
              name={nomeDoCampo(indice, 'client')}
              value={trecho.client}
              onChange={(evento) => alterar(indice, { client: evento.target.value })}
              suggestions={suggestions.clients}
              placeholder="Tecnoarte"
              maxLength={MAX_LENGTHS.cliente}
              autoComplete="off"
              error={erroDoCampo(indice, 'client')}
            />

            {fares.length > 0 ? (
              <SelectField
                label="Passagem cadastrada"
                name={nomeDoCampo(indice, 'fare')}
                value={trecho.fareId}
                onChange={(evento) => aplicarPassagem(indice, evento.target.value)}
                options={[
                  { value: '', label: 'Preencher na mão' },
                  ...fares.map((fare) => ({ value: fare.id, label: fare.label })),
                ]}
                hint="Preenche transporte, cartão e valor."
              />
            ) : null}

            <SelectField
              label="Meio de transporte"
              name={nomeDoCampo(indice, 'transport')}
              value={trecho.transport}
              onChange={(evento) => {
                const transport = evento.target.value as TransportType
                alterar(indice, { transport, card: DEFAULT_CARD_BY_TRANSPORT[transport] })
              }}
              options={TRANSPORT_SELECT}
              error={erroDoCampo(indice, 'transport')}
            />

            <TextField
              label="Linha"
              name={nomeDoCampo(indice, 'line')}
              value={trecho.line}
              onChange={(evento) => alterar(indice, { line: evento.target.value })}
              placeholder="323"
              maxLength={MAX_LENGTHS.linha}
              autoComplete="off"
              hint="Deixe vazio na barca."
              error={erroDoCampo(indice, 'line')}
            />

            <SelectField
              label="Cartão usado"
              name={nomeDoCampo(indice, 'card')}
              value={trecho.card}
              onChange={(evento) => alterar(indice, { card: evento.target.value as CardType })}
              options={CARD_SELECT}
              hint="Sugerido pelo transporte, mas dá para trocar."
              error={erroDoCampo(indice, 'card')}
            />

            <TextField
              label="Valor"
              name={nomeDoCampo(indice, 'value')}
              inputMode="decimal"
              value={trecho.value}
              onChange={(evento) => alterar(indice, { value: evento.target.value })}
              placeholder="4,70"
              data
              error={erroDoCampo(indice, 'value')}
            />
          </div>
        </div>
      ))}

      {!isEditing ? (
        <>
          <button
            type="button"
            onClick={() =>
              setTrechos((atual) => [...atual, trechoVazio(atual[atual.length - 1])])
            }
            className="self-start rounded-lg border border-dashed border-line px-4 py-2.5 text-sm text-muted transition-colors hover:border-marca hover:text-marca-texto"
          >
            + Peguei outra condução nesta ida
          </button>

          <label className="flex items-start gap-3 rounded-lg border border-line bg-paper p-4">
            <input
              type="checkbox"
              name="round_trip"
              checked={voltou}
              onChange={(evento) => setVoltou(evento.target.checked)}
              className="mt-0.5 size-4 rounded border-line text-ink focus:ring-marca"
            />
            <span className="text-sm leading-relaxed text-ink-soft">
              <strong className="font-medium text-ink">
                Voltou para casa pelo mesmo caminho?
              </strong>
              <br />
              A volta é lançada espelhando a ida inteira: as conduções na ordem
              inversa, origem e destino trocados, cliente &quot;Residência&quot;.
            </span>
          </label>

          {previa.length > 0 ? (
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="letreiro mb-3 text-[0.7rem] text-muted">
                Vai gravar {previa.length}{' '}
                {previa.length === 1 ? 'trecho' : 'trechos'}
              </p>
              <RouteLine steps={previa} showFares={false} />
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Salvando...">
          {isEditing ? 'Salvar alteração' : 'Lançar dia'}
        </SubmitButton>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="letreiro rounded-lg border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:bg-paper"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
