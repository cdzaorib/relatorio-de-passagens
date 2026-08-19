'use client'

import { useActionState } from 'react'

import { requestPasswordReset } from '@/app/auth/actions'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, EMPTY_FORM_STATE)

  if (state.success) {
    return <Alert variant="success">{state.success}</Alert>
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <TextField
        label="E-mail da conta"
        name="email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        required
        defaultValue={state.values?.email ?? ''}
        placeholder="voce@empresa.com"
      />

      <SubmitButton className="w-full">Enviar link de redefinição</SubmitButton>
    </form>
  )
}
