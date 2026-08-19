/** Esqueleto enquanto a tela carrega. */
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-line" />
        <div className="h-4 w-80 rounded bg-line/60" />
      </div>
      <div className="h-64 rounded-xl border border-line bg-surface" />
      <div className="h-48 rounded-xl border border-line bg-surface" />
    </div>
  )
}
