'use client'

import { useEffect, useRef } from 'react'

import type { FormState } from '@/lib/form-state'

/**
 * Leva o foco ao primeiro campo com erro depois de um envio recusado.
 * Num formulário de nove campos, a mensagem sozinha obriga a pessoa a caçar
 * qual deles está errado — ainda mais no celular, onde o erro pode estar fora
 * da tela. O leitor de tela também anuncia o campo ao receber o foco.
 */
export function useFocusFirstError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) return

    const primeiro = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    primeiro?.focus()
    primeiro?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [state])

  return formRef
}
