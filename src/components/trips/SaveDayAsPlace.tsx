'use client'

import { useActionState, useEffect, useState } from 'react'

import { savePlaceFromDay } from '@/app/dashboard/locais/actions'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { outboundOf } from '@/lib/trips'
import type { Trip } from '@/types'

/**
 * Transforma um dia já lançado em local salvo.
 *
 * É o caminho mais curto entre digitar a rota uma vez e nunca mais digitar:
 * quem acabou de lançar o dia certo tem a rota pronta na tela, e cadastrá-la
 * de novo na mão seria trabalho repetido com chance de errar.
 */
export function SaveDayAsPlace({ date, trips }: { date: string; trips: Trip[] }) {
  const [state, formAction] = useActionState(savePlaceFromDay, EMPTY_FORM_STATE)
  const [aberto, setAberto] = useState(false)

  // Só a ida vira local; a volta é derivada de novo a cada lançamento.
  const ida = outboundOf(trips)
  const bairros = [ida[0]?.origin, ...ida.map((trecho) => trecho.destination)].filter(Boolean)

  useEffect(() => {
    if (state.success) setAberto(false)
  }, [state.success])

  if (state.success) {
    return (
      <Alert variant="success">{state.success}</Alert>
    )
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-muted transition hover:text-marca-texto"
      >
        Salvar como local
      </button>
    )
  }

  return (
    <form
      action={formAction}
      className="w-full rounded-lg border border-line bg-paper p-4 sm:w-auto sm:min-w-[22rem]"
    >
      <input type="hidden" name="date" value={date} />

      {state.error ? (
        <div className="mb-3">
          <Alert variant="error">{state.error}</Alert>
        </div>
      ) : null}

      <TextField
        label="Nome do local"
        name="name"
        placeholder="Tecnoarte"
        autoComplete="off"
        autoFocus
        error={state.fieldErrors?.name}
        hint={
          ida.length === trips.length
            ? `Guarda os ${ida.length} trechos deste dia.`
            : `Guarda só a ida (${ida.length} de ${trips.length}); a volta é montada no lançamento.`
        }
      />

      <p className="dados mt-3 text-xs leading-relaxed text-muted">
        {bairros.join(' → ')}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Salvando...">Salvar local</SubmitButton>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="letreiro rounded-lg border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
