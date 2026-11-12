import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, getRandomAnimeId, getRandomFilteredId, hasRandomFilters, type RandomFilters } from '../api/anilist'
import { useGenres } from '../hooks/useAnime'
import { FORMAT_LABELS } from '../lib/utils'

// ---------- Remembered filters (saved in this browser) ----------

const KEY = 'anihanko-random-filters'
let filters: RandomFilters = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as RandomFilters
  } catch {
    return {}
  }
})()
const listeners = new Set<() => void>()
function setFilters(next: RandomFilters) {
  filters = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore: filters still work for this visit
  }
  listeners.forEach((l) => l())
}
function useRandomFilters() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => filters,
  )
}

// ---------- The button ----------

/**
 * Picks a random anime and opens its page. The ▾ next to it opens filters
 * (genre, format, era, airing now). With no filters it picks from the 5,000 most popular.
 */
export function RandomButton({
  className = '',
  onDone,
  menuAlign = 'right',
}: {
  className?: string
  onDone?: () => void
  menuAlign?: 'left' | 'right'
}) {
  const navigate = useNavigate()
  const current = useRandomFilters()
  const active = hasRandomFilters(current)
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  async function goRandom() {
    if (loading) return
    setLoading(true)
    setProblem(null)
    try {
      const id = active ? await getRandomFilteredId(current) : await getRandomAnimeId()
      navigate(`/anime/${id}`)
      setOpen(false)
      onDone?.()
    } catch (e) {
      setProblem(e instanceof ApiError && e.status === 404 ? 'No anime match these filters.' : 'Could not reach AniList. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Close the filter panel when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapper} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={goRandom}
        disabled={loading}
        title={problem ?? (active ? 'Open a random anime (with your filters)' : 'Open a random anime')}
        className={`inline-flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-60 ${
          problem ? 'text-accent' : 'text-muted hover:text-ink'
        }`}
      >
        {/* Dice icon; spins while we're fetching */}
        <svg
          className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
          <circle cx="15" cy="15" r="1" fill="currentColor" />
          <circle cx="15" cy="9" r="1" fill="currentColor" />
          <circle cx="9" cy="15" r="1" fill="currentColor" />
        </svg>
        {problem ? 'Retry' : 'Random'}
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Random filters"
        aria-expanded={open}
        className="relative ml-0.5 rounded px-1 py-1 text-xs text-muted hover:text-ink"
      >
        ▾
        {active && <span className="absolute top-0.5 right-0 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
      </button>

      {open && (
        <FilterPanel
          value={current}
          onChange={setFilters}
          onGo={goRandom}
          loading={loading}
          problem={problem}
          align={menuAlign}
        />
      )}
    </div>
  )
}

function FilterPanel({
  value,
  onChange,
  onGo,
  loading,
  problem,
  align,
}: {
  value: RandomFilters
  onChange: (f: RandomFilters) => void
  onGo: () => void
  loading: boolean
  problem: string | null
  align: 'left' | 'right'
}) {
  const genres = useGenres()
  const set = (patch: Partial<RandomFilters>) => onChange({ ...value, ...patch })

  return (
    <div
      className={`absolute top-full z-40 mt-2 w-64 space-y-3 rounded-md border border-line bg-surface p-4 text-sm shadow-lg ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      <p className="font-medium">Random from…</p>
      <select className="field w-full" value={value.genre ?? ''} onChange={(e) => set({ genre: e.target.value || undefined })}>
        <option value="">Any genre</option>
        {genres.data?.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select className="field w-full" value={value.format ?? ''} onChange={(e) => set({ format: e.target.value || undefined })}>
        <option value="">Any format</option>
        {Object.entries(FORMAT_LABELS)
          .filter(([v]) => v !== 'MUSIC')
          .map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
      </select>
      <select
        className="field w-full"
        value={value.era ?? ''}
        onChange={(e) => set({ era: (e.target.value || undefined) as RandomFilters['era'] })}
      >
        <option value="">Any year</option>
        <option value="new">Last 5 years</option>
        <option value="classic">Before 2015</option>
      </select>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!value.airing} onChange={(e) => set({ airing: e.target.checked || undefined })} />
        Airing right now
      </label>
      {problem && <p className="text-accent">{problem}</p>}
      <div className="flex items-center justify-between pt-1">
        <button onClick={() => onChange({})} className="text-muted hover:text-accent">
          Clear
        </button>
        <button
          onClick={onGo}
          disabled={loading}
          className="rounded-md bg-accent px-3 py-1.5 font-semibold text-on-accent hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Picking…' : 'Surprise me'}
        </button>
      </div>
    </div>
  )
}
