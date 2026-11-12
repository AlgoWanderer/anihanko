import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimeLink } from '../components/AnimeLink'
import { FadeImage } from '../components/FadeImage'
import { HankoStamp } from '../components/HankoStamp'
import {
  exportStamps,
  importStamps,
  STAMP_TYPES,
  STATUS_ORDER,
  stampMinutes,
  useStamps,
  type Stamp,
  type StampStatus,
} from '../lib/stamps'
import { formatLabel, formatMinutes } from '../lib/utils'

const SORTS = {
  recent: { label: 'Recently stamped', compare: (a: Stamp, b: Stamp) => b.stampedAt - a.stampedAt },
  score: { label: 'Your score', compare: (a: Stamp, b: Stamp) => (b.score ?? 0) - (a.score ?? 0) || b.stampedAt - a.stampedAt },
  title: { label: 'Title (A–Z)', compare: (a: Stamp, b: Stamp) => a.title.localeCompare(b.title) },
  year: { label: 'Release year', compare: (a: Stamp, b: Stamp) => (b.year ?? 0) - (a.year ?? 0) },
}
type SortKey = keyof typeof SORTS
type Tab = StampStatus | 'all'

/** /stamps: your anime list, one tab per stamp type, plus a few totals. Saved in this browser only. */
export function StampBookPage() {
  const all = Object.values(useStamps())
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Tab = tabParam && (tabParam === 'all' || tabParam in STAMP_TYPES) ? (tabParam as Tab) : 'all'
  const [sort, setSort] = useState<SortKey>('recent')
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const shown = all.filter((s) => tab === 'all' || s.status === tab).sort(SORTS[sort].compare)
  const count = (status: StampStatus) => all.filter((s) => s.status === status).length

  // Totals
  const totalMinutes = all.reduce((sum, s) => sum + (stampMinutes(s) ?? 0), 0)
  const scored = all.filter((s) => s.score !== null)
  const meanScore = scored.length ? scored.reduce((sum, s) => sum + s.score!, 0) / scored.length : null
  const genreCounts = new Map<string, number>()
  all
    .filter((s) => s.status === 'watched')
    .forEach((s) => s.genres.forEach((g) => genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)))
  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again still works
    if (!file) return
    try {
      const added = await importStamps(file)
      setMessage(added ? `Added ${added} stamp${added > 1 ? 's' : ''} from the backup.` : 'Nothing new in that backup.')
    } catch {
      setMessage("That file isn't a stamp book backup.")
    }
  }

  const tabs: { value: Tab; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: all.length },
    ...STATUS_ORDER.map((s) => ({ value: s, label: STAMP_TYPES[s].label, n: count(s) })),
  ]

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Stamp book</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Your anime list. Stamps are saved in this browser only, so download a backup to keep them safe or move
            them to another device.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            onClick={exportStamps}
            disabled={all.length === 0}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Download backup
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent"
          >
            Load backup
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={onImport} className="hidden" />
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-accent">{message}</p>}

      {all.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <HankoStamp className="h-28 w-28 opacity-40" />
          <p className="mt-6 font-medium">No stamps yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Open any anime and stamp it as <span className="text-ink">Watched</span>,{' '}
            <span className="text-ink">Watching</span>, <span className="text-ink">Plan to watch</span> or{' '}
            <span className="text-ink">Dropped</span>. Need ideas?
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <Link to="/tonight" className="rounded-md bg-accent px-4 py-2 font-semibold text-on-accent hover:opacity-90">
              What should I watch?
            </Link>
            <Link to="/top" className="rounded-md border border-line bg-surface px-4 py-2 hover:border-accent hover:text-accent">
              Top 100
            </Link>
          </div>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            <Stat label="Watched" value={String(count('watched'))} note={`${all.length} stamps in total`} />
            <Stat label="Time watched" value={formatMinutes(totalMinutes)} />
            <Stat label="Your average score" value={meanScore ? meanScore.toFixed(1) : '—'} note={scored.length ? `${scored.length} scored` : 'Score anime on their page'} />
            <Stat label="Favorite genre" value={topGenre ? topGenre[0] : '—'} note={topGenre ? `${topGenre[1]} watched` : undefined} />
          </dl>

          {/* One tab per stamp type */}
          <div className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setParams(t.value === 'all' ? {} : { tab: t.value })}
                className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition ${
                  tab === t.value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {t.label} <span className="text-xs text-muted tabular-nums">{t.n}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <label htmlFor="stamp-sort" className="text-muted">
              Sort
            </label>
            <select id="stamp-sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {shown.length === 0 ? (
            <p className="py-12 text-center text-muted">Nothing stamped as "{STAMP_TYPES[tab as StampStatus]?.label}" yet.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.map((s) => (
                <StampCard key={s.id} stamp={s} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function StampCard({ stamp: s }: { stamp: Stamp }) {
  const progress = s.status === 'watching' || s.status === 'dropped'
  return (
    <AnimeLink animeId={s.id} className="group block">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-md bg-line ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ backgroundColor: s.color ?? undefined }}
      >
        {s.cover && <FadeImage src={s.cover} alt={s.title} className="h-full w-full object-cover" />}
        <HankoStamp status={s.status} className="absolute top-1.5 right-1.5 h-12 w-12 drop-shadow" />
        {s.score && (
          <span className="absolute bottom-0 left-0 rounded-tr-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-paper tabular-nums">
            You: {s.score}
          </span>
        )}
        {/* Progress bar while watching */}
        {progress && s.episodes ? (
          <span className="absolute right-0 bottom-0 left-0 h-1 bg-black/30">
            <span className="block h-full" style={{ width: `${(s.progress / s.episodes) * 100}%`, backgroundColor: STAMP_TYPES[s.status].color }} />
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent">{s.title}</h3>
      <p className="mt-0.5 text-xs text-muted">
        {progress
          ? `Episode ${s.progress}${s.episodes ? ` of ${s.episodes}` : ''}`
          : [formatLabel(s.format), new Date(s.stampedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })]
              .filter(Boolean)
              .join(' · ')}
      </p>
    </AnimeLink>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate text-xl font-semibold tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  )
}
