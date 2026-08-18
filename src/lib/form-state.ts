/**
 * Estado devolvido pelas actions de formulário.
 * Fica fora do arquivo 'use server' porque lá só pode haver função async.
 */
export type FormState = {
  error?: string | null
  success?: string | null
  /** Devolve o que foi digitado para o formulário não esvaziar no erro. */
  values?: Record<string, string>
}

export const EMPTY_FORM_STATE: FormState = {}
