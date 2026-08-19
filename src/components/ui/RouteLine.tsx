import { buildRouteStops, type RouteStep } from '@/lib/route'
import { formatBRL } from '@/lib/format'
import { TRANSPORT_LABELS } from '@/types'

export type { RouteStep }

/**
 * O dia desenhado como uma linha de percurso: pontos são bairros, segmentos
 * são as conduções. Um dia de trabalho é uma sequência ordenada — a ordem é
 * o que faz a volta ser o espelho da ida —, então o diagrama diz algo
 * verdadeiro sobre o conteúdo em vez de enfeitá-lo.
 *
 * Empilha na vertical no celular e deita na horizontal a partir de sm.
 */
export function RouteLine({
  steps,
  showFares = true,
}: {
  steps: RouteStep[]
  showFares?: boolean
}) {
  const paradas = buildRouteStops(steps)
  if (paradas.length === 0) return null

  const traco = (transport: RouteStep['transport']) =>
    transport === 'barca' ? 'bg-marca' : 'bg-onibus'

  const texto = (transport: RouteStep['transport']) =>
    transport === 'barca' ? 'text-marca-texto' : 'text-onibus-ink'

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start">
      {paradas.map((parada, indice) => (
        <li
          key={`${parada.bairro}-${indice}`}
          className={`flex gap-3 sm:flex-col sm:gap-0 ${
            parada.trecho ? 'sm:flex-1' : 'sm:flex-none'
          }`}
        >
          <div className="flex flex-col items-center sm:h-3 sm:w-full sm:flex-row">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full bg-ink ring-2 ring-surface"
            />
            {parada.trecho ? (
              <span
                aria-hidden
                className={`w-0.5 flex-1 sm:h-0.5 sm:w-auto ${traco(parada.trecho.transport)}`}
              />
            ) : null}
          </div>

          <div className="pb-4 sm:pt-2 sm:pr-4 sm:pb-0">
            <p className="text-sm leading-tight font-medium text-ink">
              {parada.quebra ? (
                <span className="letreiro mr-1.5 text-[0.65rem] text-muted">nova saída</span>
              ) : null}
              {parada.bairro}
            </p>

            {parada.trecho ? (
              <p className={`mt-0.5 text-xs leading-tight ${texto(parada.trecho.transport)}`}>
                <span className="letreiro text-[0.7rem]">
                  {TRANSPORT_LABELS[parada.trecho.transport]}
                </span>
                {parada.trecho.line ? <span className="dados"> {parada.trecho.line}</span> : null}
                {showFares && typeof parada.trecho.value === 'number' ? (
                  <span className="dados text-muted"> · {formatBRL(parada.trecho.value)}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
