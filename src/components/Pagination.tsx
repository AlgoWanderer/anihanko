interface Props {
  page: number
  lastPage: number
  onChange: (page: number) => void
}

export function Pagination({ page, lastPage, onChange }: Props) {
  if (lastPage <= 1) return null

  // Show up to 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, lastPage - 4))
  const pages = Array.from({ length: Math.min(5, lastPage) }, (_, i) => start + i)

  const base = 'min-w-9 rounded-md px-3 py-2 text-sm font-medium tabular-nums transition disabled:opacity-40'
  const idle = 'border border-line bg-surface hover:border-accent hover:text-accent disabled:hover:border-line disabled:hover:text-ink'

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button className={`${base} ${idle}`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${base} ${p === page ? 'border border-ink bg-ink text-paper' : idle}`}
        >
          {p}
        </button>
      ))}
      <button className={`${base} ${idle}`} disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  )
}
