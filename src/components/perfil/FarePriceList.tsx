'use client'

import { useState } from 'react'

import { archiveFarePrice } from '@/app/dashboard/perfil/actions'
import { FarePriceForm } from '@/components/perfil/FarePriceForm'
import { formatBRL } from '@/lib/format'
import { CARD_LABELS, TRANSPORT_LABELS, type FarePrice } from '@/types'

export function FarePriceList({ farePrices }: { farePrices: FarePrice[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (farePrices.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhuma passagem cadastrada ainda. Cadastre uma abaixo e ela fica
        disponível toda vez que você lançar um trecho.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line">
      {farePrices.map((farePrice) => (
        <li key={farePrice.id} className="py-4 first:pt-0 last:pb-0">
          {editingId === farePrice.id ? (
            <div className="rounded-lg border border-marca/35 bg-barca-soft p-4">
              <p className="mb-4 text-sm font-medium text-ink-soft">
                Editando {farePrice.label}
              </p>
              <FarePriceForm
                farePrice={farePrice}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{farePrice.label}</p>
                <p className="text-sm text-muted">
                  {TRANSPORT_LABELS[farePrice.transport]} · {CARD_LABELS[farePrice.card]}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-ink dados">
                  {formatBRL(Number(farePrice.value))}
                </span>

                <button
                  type="button"
                  onClick={() => setEditingId(farePrice.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-paper"
                >
                  Editar
                </button>

                <form
                  action={archiveFarePrice}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Arquivar ${farePrice.label}? Ela some da lista, mas os trechos já lançados e o histórico continuam intactos.`,
                      )
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="group_id" value={farePrice.group_id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-alerta-soft hover:text-alerta"
                  >
                    Arquivar
                  </button>
                </form>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
