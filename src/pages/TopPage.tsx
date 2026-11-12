import { useSearchParams } from 'react-router'
import { AnimeLink } from '../components/AnimeLink'
import { ErrorMessage } from '../components/ErrorMessage'
import { HideWatchedToggle } from '../components/HideWatchedToggle'
import { useWatchedFilter } from '../lib/stamps'
import { FadeImage } from '../components/FadeImage'
import { LoadMore } from '../components/LoadMore'
import { useTopAnimeInfinite } from '../hooks/useAnime'
import { compactNumber, displayTitle, metaLine, posterUrl, scoreLabel, uniqueById } from '../lib/utils'
import type { TopFilter } from '../types/anime'

const TABS: { value: TopFilter | ''; label: string }[] = [
  { value: '', label: 'Highest rated' },
  { value: 'airing', label: 'Airing now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'popular', label: 'Most popular' },
  { value: 'favorites', label: 'Most favorited' },
]

export function TopPage() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') || undefined) as TopFilter | undefined
  // Loads 25 at a time as you scroll, up to 100 (see useTopAnimeInfinite).
  const top = useTopAnimeInfinite(filter)
  const { isPending, isError, error, refetch, isPlaceholderData } = top
  const all = top.data ? uniqueById(top.data.pages.flatMap((p) => p.media)).slice(0, 100) : []
  // Remember each anime's real rank before hiding watched ones, so #12 stays #12.
  const hideWatched = useWatchedFilter()
  const list = hideWatched(all.map((anime, i) => ({ ...anime, rank: i + 1 })))

  const setTab = (value: string) => setParams(value ? { filter: value } : {})

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Top 100</h1>
        <HideWatchedToggle />
      </div>

      {/* Tabs: underlined text, like the navbar. */}
      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition ${
              (filter ?? '') === t.value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {isError ? (
          <div className="mt-6">
            <ErrorMessage error={error} onRetry={() => refetch()} />
          </div>
        ) : isPending ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 py-3">
                <div className="h-6 w-10 rounded bg-line" />
                <div className="h-24 w-16 rounded bg-line" />
                <div className="h-4 flex-1 rounded bg-line" />
              </div>
            ))}
          </div>
        ) : (
          <ol className={`divide-y divide-line ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {list.map((anime) => (
              <li key={anime.id}>
                <AnimeLink animeId={anime.id} className="group flex items-center gap-4 py-3">
                  <span className="w-10 shrink-0 text-center font-display text-2xl font-semibold text-muted tabular-nums">
                    {anime.rank}
                  </span>
                  <div
                    className="h-24 w-16 shrink-0 overflow-hidden rounded bg-line"
                    style={{ backgroundColor: anime.coverImage.color ?? undefined }}
                  >
                    <FadeImage src={posterUrl(anime)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium group-hover:text-accent">{displayTitle(anime)}</h3>
                    <p className="mt-1 text-sm text-muted">{metaLine(anime)}</p>
                    <p className="mt-1 hidden truncate text-sm text-muted sm:block">{anime.genres.join(', ')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums">{scoreLabel(anime.averageScore) ?? '—'}</div>
                    <div className="text-xs text-muted">{compactNumber(anime.popularity)} users</div>
                  </div>
                </AnimeLink>
              </li>
            ))}
          </ol>
        )}
        {all.length > 0 && !isPlaceholderData && (
          <LoadMore
            hasNextPage={top.hasNextPage}
            isFetchingNextPage={top.isFetchingNextPage}
            fetchNextPage={top.fetchNextPage}
            endText={all.length >= 100 ? "That's the whole Top 100." : "That's everything."}
          />
        )}
      </div>
    </>
  )
}
