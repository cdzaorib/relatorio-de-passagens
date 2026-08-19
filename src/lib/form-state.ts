/**
 * Estado devolvido pelas actions de formulário.
 * Fica fora do arquivo 'use server' porque lá só pode haver função async.
 */

/** Erros presos a um campo, na chave do `name` do input. */
export type FieldErrors = Record<string, string>

export type FormState = {
  /** Erro geral: falha de gravação, sessão expirada. */
  error?: string | null
  success?: string | null
  /** Erro campo a campo, para marcar o input em vez de só um aviso no topo. */
  fieldErrors?: FieldErrors | null
  /** Devolve o que foi digitado para o formulário não esvaziar no erro. */
  values?: Record<string, string>
}

export const EMPTY_FORM_STATE: FormState = {}
