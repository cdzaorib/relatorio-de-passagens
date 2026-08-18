'use client'

import { useActionState } from 'react'

import { signup } from '@/app/auth/actions'
import { EMPTY_FORM_STATE } from '@/lib/form-state'
import { Alert } from '@/components/ui/Alert'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TextField } from '@/components/ui/TextField'
import { MIN_PASSWORD_LENGTH } from '@/lib/validation'

export function SignupForm() {
  const [state, formAction] = useActionState(signup, EMPTY_FORM_STATE)

  // Deu certo e o e-mail precisa ser confirmado: o formulário sai de cena.
  if (state.success) {
    return <Alert variant="success">{state.success}</Alert>
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <TextField
        label="Seu nome completo"
        name="name"
        autoComplete="name"
        required
        defaultValue={state.values?.name ?? ''}
        hint="Aparece no cabeçalho do relatório."
      />

      <TextField
        label="Nome do superior imediato"
        name="supervisor_name"
        required
        defaultValue={state.values?.supervisor_name ?? ''}
        hint="Também vai no cabeçalho. Dá para mudar depois no perfil."
      />

      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? ''}
        placeholder="voce@empresa.com"
      />

      <TextField
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={`No mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
      />

      <TextField
        label="Repita a senha"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
      />

      <SubmitButton pendingLabel="Criando conta...">Criar conta</SubmitButton>
    </form>
  )
}
