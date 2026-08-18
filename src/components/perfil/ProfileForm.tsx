'use client'

import { useActionState } from 'react'

import { updateProfile } from '@/app/dashboard/perfil/actions'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import type { Profile } from '@/types'

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState(updateProfile, EMPTY_FORM_STATE)

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Seu nome completo"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name ?? profile?.name ?? ''}
        />
        <TextField
          label="Superior imediato"
          name="supervisor_name"
          required
          defaultValue={state.values?.supervisor_name ?? profile?.supervisor_name ?? ''}
        />
      </div>

      <div className="sm:w-48">
        <SubmitButton pendingLabel="Salvando...">Salvar</SubmitButton>
      </div>
    </form>
  )
}
