import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnimeGrid } from '../components/AnimeGrid'
import { ErrorMessage } from '../components/ErrorMessage'
import { HideWatchedToggle } from '../components/HideWatchedToggle'
import { useWatchedFilter } from '../lib/stamps'
import { Pagination } from '../components/Pagination'
import { SeasonChart } from '../components/SeasonChart'
import { useSeason } from '../hooks/useAnime'
import { SEASONS, getCurrentSeason, lastPageOf, seasonLabel, shiftSeason } from '../lib/utils'
import type { Season } from '../types/anime'

export function SeasonPage() {
  const navigate = useNavigate()
  const routeParams = useParams()
  const [params, setParams] = useSearchParams()
  const now = getCurrentSeason()

  // /season → current season; /season/2024/spring → that season
  const year = Number(routeParams.year) || now.year
  const fromUrl = routeParams.season?.toUpperCase() as Season | undefined
  const season = fromUrl && SEASONS.includes(fromUrl) ? fromUrl : now.season
  const page = Number(params.get('page')) || 1
  const view = params.get('view') === 'chart' ? 'chart' : 'grid'

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useSeason(year, season, page)
  const hideWatched = useWatchedFilter()

  const prev = shiftSeason(year, season, -1)
  const next = shiftSeason(year, season, 1)
  const path = (y: number, s: Season) => `/season/${y}/${s.toLowerCase()}`
  const years = Array.from({ length: now.year + 2 - 1970 }, (_, i) => now.year + 1 - i)

  const linkClass = 'rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-accent hover:text-accent'

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {seasonLabel(season)} {year}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={path(prev.year, prev.season)} className={linkClass}>
            ← {seasonLabel(prev.season)} {prev.year}
          </Link>
          <select className="field" value={season} onChange={(e) => navigate(path(year, e.target.value as Season))}>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
          <select className="field" value={year} onChange={(e) => navigate(path(Number(e.target.value), season))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Link to={path(next.year, next.season)} className={linkClass}>
            {seasonLabel(next.season)} {next.year} →
          </Link>
        </div>
      </div>

      {/* Grid = most popular first, page by page. Chart = the whole season, split by format. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border border-line bg-surface p-0.5 text-sm" role="group" aria-label="View">
          {(['grid', 'chart'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setParams(v === 'chart' ? { view: 'chart' } : {})}
              aria-pressed={view === v}
              className={`rounded px-3 py-1.5 font-medium transition ${view === v ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
            >
              {v === 'grid' ? 'Most popular' : 'Season chart'}
            </button>
          ))}
        </div>
        <HideWatchedToggle />
      </div>

      {view === 'chart' ? (
        <div className="mt-8">
          <SeasonChart year={year} season={season} />
        </div>
      ) : (
      <div className="mt-8">
        {isError ? (
          <ErrorMessage error={error} onRetry={() => refetch()} />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60' : ''}>
            <AnimeGrid anime={data && hideWatched(data.media)} isLoading={isPending} skeletonCount={24} />
          </div>
        )}
        {data && (
          <Pagination
            page={page}
            lastPage={lastPageOf(data.pageInfo)}
            onChange={(p) => setParams({ page: String(p) })}
          />
        )}
      </div>
      )}
    </>
  )
}
