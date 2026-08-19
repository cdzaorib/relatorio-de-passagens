'use client'

import { useActionState } from 'react'

import { login } from '@/app/auth/actions'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(login, EMPTY_FORM_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        required
        defaultValue={state.values?.email ?? ''}
        placeholder="voce@empresa.com"
      />

      <TextField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <SubmitButton className="w-full" pendingLabel="Entrando...">Entrar</SubmitButton>
    </form>
  )
}
