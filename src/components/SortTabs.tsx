import type { PeopleSort } from '../api/anilist'

const OPTIONS: { value: PeopleSort; label: string }[] = [
  { value: 'popularity', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
]

/** "Most popular / Newest" tabs used on studio and voice actor pages. */
export function SortTabs({ value, onChange }: { value: PeopleSort; onChange: (sort: PeopleSort) => void }) {
  return (
    <div className="mt-8 flex gap-6 border-b border-line">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
            value === o.value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
