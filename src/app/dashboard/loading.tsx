/** Esqueleto enquanto os dados do dashboard carregam. */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-line" />
        <div className="h-4 w-72 rounded bg-paper" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-line bg-surface" />
        ))}
      </div>

      <div className="h-72 rounded-xl border border-line bg-surface" />
    </div>
  )
}
