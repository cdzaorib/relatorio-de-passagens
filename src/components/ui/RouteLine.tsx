import { formatBRL } from '@/lib/format'
import { TRANSPORT_LABELS, type CardType, type TransportType } from '@/types'

export type RouteStep = {
  origin: string
  destination: string
  transport: TransportType
  line?: string | null
  card?: CardType
  value?: number
}

/**
 * O dia desenhado como uma linha de percurso: pontos são bairros, segmentos
 * são as conduções. Um dia de trabalho é uma sequência ordenada — a ordem é
 * o que faz a volta ser o espelho da ida —, então o diagrama de linha diz
 * algo verdadeiro sobre o conteúdo em vez de enfeitá-lo.
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
  if (steps.length === 0) return null

  // Bairros na ordem, sem repetir o ponto de baldeação.
  const paradas = [steps[0].origin, ...steps.map((step) => step.destination)]

  const traco = (transport: TransportType) =>
    transport === 'barca' ? 'bg-barca' : 'bg-onibus'

  const texto = (transport: TransportType) =>
    transport === 'barca' ? 'text-marca-texto' : 'text-onibus-ink'

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start">
      {paradas.map((parada, indice) => {
        const trecho = steps[indice]

        return (
          <li
            key={`${parada}-${indice}`}
            className="flex gap-3 sm:flex-1 sm:flex-col sm:gap-0 sm:last:flex-none"
          >
            {/* Trilho: ponto e o segmento até a próxima parada. */}
            <div className="flex flex-col items-center sm:h-3 sm:w-full sm:flex-row">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full bg-ink ring-2 ring-surface"
              />
              {trecho ? (
                <span
                  aria-hidden
                  className={`w-0.5 flex-1 sm:h-0.5 sm:w-auto ${traco(trecho.transport)}`}
                />
              ) : null}
            </div>

            <div className="pb-4 sm:pt-2 sm:pb-0 sm:pr-4">
              <p className="text-sm leading-tight font-medium text-ink">{parada}</p>

              {trecho ? (
                <p className={`mt-0.5 text-xs leading-tight ${texto(trecho.transport)}`}>
                  <span className="letreiro text-[0.7rem]">
                    {TRANSPORT_LABELS[trecho.transport]}
                  </span>
                  {trecho.line ? <span className="dados"> {trecho.line}</span> : null}
                  {showFares && typeof trecho.value === 'number' ? (
                    <span className="dados text-muted"> · {formatBRL(trecho.value)}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
