import { useState } from 'react'
import { useSeasonChart } from '../hooks/useAnime'
import type { Season } from '../types/anime'
import { AnimeGrid } from './AnimeGrid'
import { ErrorMessage } from './ErrorMessage'
import { useWatchedFilter } from '../lib/stamps'

// The chart's sections, in order. OVAs and specials share one section.
const GROUPS = [
  { title: 'TV', formats: ['TV'] },
  { title: 'TV shorts', formats: ['TV_SHORT'] },
  { title: 'Movies', formats: ['MOVIE'] },
  { title: 'Web series (ONA)', formats: ['ONA'] },
  { title: 'OVAs & specials', formats: ['OVA', 'SPECIAL'] },
]

type Show = 'all' | 'new' | 'sequels'
const SHOW_OPTIONS: { value: Show; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'new', label: 'New series' },
  { value: 'sequels', label: 'Sequels' },
]

/** The whole season, split into TV / movies / ONA / OVAs, with "new series" and "sequels" filters. */
export function SeasonChart({ year, season }: { year: number; season: Season }) {
  const [show, setShow] = useState<Show>('all')
  const chart = useSeasonChart(year, season, true)
  const hideWatched = useWatchedFilter()

  if (chart.isError) return <ErrorMessage error={chart.error} onRetry={() => chart.refetch()} />

  const list = hideWatched(chart.data ?? []).filter((a) =>
    show === 'all' ? true : show === 'sequels' ? a.isSequel : !a.isSequel,
  )
  const sequelCount = (chart.data ?? []).filter((a) => a.isSequel).length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {SHOW_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setShow(o.value)}
            aria-pressed={show === o.value}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              show === o.value ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:border-accent'
            }`}
          >
            {o.label}
          </button>
        ))}
        {chart.data && (
          <span className="ml-1 text-sm text-muted">
            {chart.data.length} anime · {chart.data.length - sequelCount} new · {sequelCount} sequels
          </span>
        )}
      </div>

      {chart.isPending ? (
        <div className="mt-8">
          <AnimeGrid isLoading skeletonCount={12} />
        </div>
      ) : (
        GROUPS.map((g) => {
          const items = list.filter((a) => a.format && g.formats.includes(a.format))
          if (items.length === 0) return null
          return (
            <section key={g.title} className="mt-10">
              <h2 className="mb-5 flex items-baseline gap-2 border-b border-line pb-2 font-display text-xl font-semibold">
                {g.title} <span className="text-sm font-normal text-muted tabular-nums">{items.length}</span>
              </h2>
              <AnimeGrid anime={items} />
            </section>
          )
        })
      )}
      {chart.data && list.length === 0 && <p className="py-12 text-center text-muted">Nothing to show with these filters.</p>}
    </div>
  )
}
