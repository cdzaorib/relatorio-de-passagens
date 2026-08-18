'use client'

import { useActionState } from 'react'

import { updatePassword } from '@/app/auth/actions'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { MIN_PASSWORD_LENGTH } from '@/lib/validation'

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, EMPTY_FORM_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <TextField
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={`No mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
      />

      <TextField
        label="Repita a nova senha"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
      />

      <SubmitButton className="w-full" pendingLabel="Salvando...">Salvar nova senha</SubmitButton>
    </form>
  )
}
