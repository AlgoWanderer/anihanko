import { Link, useNavigate, useParams } from 'react-router'
import { AnimeGrid } from '../components/AnimeGrid'
import { ErrorMessage } from '../components/ErrorMessage'
import { HideWatchedToggle } from '../components/HideWatchedToggle'
import { useWatchedFilter } from '../lib/stamps'
import { Section } from '../components/Section'
import { useYear } from '../hooks/useAnime'
import { displayTitle } from '../lib/utils'
import type { AnimeWithStudios } from '../types/anime'

const FIRST_YEAR = 1970
const thisYear = new Date().getFullYear()
const YEARS = Array.from({ length: thisYear - FIRST_YEAR + 2 }, (_, i) => thisYear + 1 - i)

/** Count how often each name appears, most common first: [["Action", 21], ["Comedy", 17], ...] */
function countTop(names: string[], limit: number): [string, number][] {
  const counts = new Map<string, number>()
  names.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
}

function studioCounts(anime: AnimeWithStudios[]) {
  const ids = new Map<string, number>()
  anime.forEach((a) => a.studios.nodes.forEach((s) => ids.set(s.name, s.id)))
  return countTop(
    anime.flatMap((a) => a.studios.nodes.map((s) => s.name)),
    8,
  ).map(([name, count]) => ({ name, count, id: ids.get(name)! }))
}

/** /year/:year: a time capsule of one year's anime. */
export function YearPage() {
  const navigate = useNavigate()
  const param = Number(useParams().year)
  const year = param >= FIRST_YEAR && param <= thisYear + 1 ? param : thisYear
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useYear(year)

  const go = (y: number) => navigate(`/year/${y}`)
  const hideWatched = useWatchedFilter()
  const genres = data ? countTop(data.popular.flatMap((a) => a.genres), 8) : []
  const studios = data ? studioCounts(data.popular) : []

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-accent uppercase">Year in anime</p>
          <h1 className="font-display text-5xl font-bold tracking-tight tabular-nums">{year}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => go(year - 1)}
            disabled={year <= FIRST_YEAR}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            ← {year - 1}
          </button>
          <select aria-label="Pick a year" className="field" value={year} onChange={(e) => go(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => go(year + 1)}
            disabled={year >= thisYear + 1}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {year + 1} →
          </button>
        </div>
      </div>

      {isError ? (
        <div className="mt-8">
          <ErrorMessage error={error} onRetry={() => refetch()} />
        </div>
      ) : (
        <div className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
          {/* Headline facts */}
          {data && data.popular.length > 0 && (
            <dl className="mt-8 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
              <Headline label="Most popular" value={displayTitle(data.popular[0])} to={`/anime/${data.popular[0].id}`} />
              {data.rated[0] && (
                <Headline label="Highest rated" value={displayTitle(data.rated[0])} to={`/anime/${data.rated[0].id}`} />
              )}
              {genres[0] && <Headline label="Genre of the year" value={genres[0][0]} to={`/search?genre=${encodeURIComponent(genres[0][0])}&year=${year}`} />}
            </dl>
          )}

          <div className="mt-10 flex justify-end">
            <HideWatchedToggle />
          </div>
          <div className="mt-4">
            <Section title={`Most popular of ${year}`} viewAllTo={`/search?year=${year}&sort=popularity`}>
              <AnimeGrid anime={data && hideWatched(data.popular).slice(0, 12)} isLoading={isPending} />
            </Section>
            <Section title={`Highest rated of ${year}`} viewAllTo={`/search?year=${year}&sort=score`}>
              <AnimeGrid anime={data && hideWatched(data.rated)} isLoading={isPending} />
            </Section>

            {data && data.popular.length > 0 && (
              <div className="mt-14 grid gap-12 md:grid-cols-2">
                <BarList
                  title="Top genres"
                  caption={`Among the ${data.popular.length} most popular anime of ${year}`}
                  rows={genres.map(([name, count]) => ({ name, count, to: `/search?genre=${encodeURIComponent(name)}&year=${year}` }))}
                  total={data.popular.length}
                />
                <BarList
                  title="Busiest studios"
                  caption={`Anime made among the ${data.popular.length} most popular of ${year}`}
                  rows={studios.map((s) => ({ name: s.name, count: s.count, to: `/studio/${s.id}` }))}
                  total={data.popular.length}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Headline({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-lg font-semibold">
        <Link to={to} className="hover:text-accent">
          {value}
        </Link>
      </dd>
    </div>
  )
}

/**
 * A ranked horizontal bar chart, one bar per row. Bars are all one color (it's one measure);
 * every bar has its number written next to it, so nothing depends on reading the color.
 */
function BarList({
  title,
  caption,
  rows,
  total,
}: {
  title: string
  caption: string
  rows: { name: string; count: number; to: string }[]
  total: number
}) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <section>
      <h2 className="border-b border-line pb-2 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 mb-4 text-xs text-muted">{caption}</p>
      <ol className="space-y-1">
        {rows.map((r) => (
          <li key={r.name}>
            <Link
              to={r.to}
              title={`${r.name}: ${r.count} of ${total} anime (${Math.round((r.count / total) * 100)}%)`}
              className="group grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 rounded px-1 py-1.5 hover:bg-accent-soft"
            >
              <span className="truncate text-sm group-hover:text-accent">{r.name}</span>
              <span className="h-2.5 rounded-r bg-line/60">
                <span
                  className="block h-full rounded-r bg-accent opacity-80 transition-opacity group-hover:opacity-100"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">{r.count}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
