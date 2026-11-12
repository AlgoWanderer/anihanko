import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimeGrid } from '../components/AnimeGrid'
import { ErrorMessage } from '../components/ErrorMessage'
import { HideWatchedToggle } from '../components/HideWatchedToggle'
import { useWatchedFilter } from '../lib/stamps'
import { LoadMore } from '../components/LoadMore'
import { useGenres, useSearchAnimeInfinite } from '../hooks/useAnime'
import { FORMAT_LABELS, uniqueById } from '../lib/utils'

const FORMATS = Object.entries(FORMAT_LABELS)
const STATUSES = [
  ['RELEASING', 'Airing'],
  ['FINISHED', 'Finished'],
  ['NOT_YET_RELEASED', 'Upcoming'],
]
const SORTS = [
  ['', 'Best match'],
  ['popularity', 'Popularity'],
  ['score', 'Score'],
  ['trending', 'Trending'],
  ['newest', 'Newest'],
  ['title', 'Title (A–Z)'],
]
const thisYear = new Date().getFullYear()
const YEARS = Array.from({ length: thisYear + 2 - 1960 }, (_, i) => String(thisYear + 1 - i))

export function SearchPage() {
  // All filters live in the URL (e.g. /search?q=naruto&format=TV), so results can be shared or bookmarked.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const filters = {
    genre: params.get('genre') ?? '',
    tag: params.get('tag') ?? '',
    format: params.get('format') ?? '',
    status: params.get('status') ?? '',
    year: params.get('year') ?? '',
    sort: params.get('sort') ?? '',
  }

  function update(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page') // old links may still have ?page=; results now scroll instead
      return next
    })
  }

  // The text box updates instantly, but we only search 500ms after the user stops typing.
  const [text, setText] = useState(q)

  // If the URL's ?q= changes from outside (e.g. the navbar search), copy it into the text box.
  const [lastQ, setLastQ] = useState(q)
  if (q !== lastQ) {
    setLastQ(q)
    setText(q)
  }

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === q) return
    const timer = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('q', trimmed)
        else next.delete('q')
        next.delete('page')
        return next
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [text, q, setParams])

  const genres = useGenres()
  const search = useSearchAnimeInfinite({ q, ...filters })
  // Infinite scroll gives us a list of pages; join them into one list of anime.
  const hideWatched = useWatchedFilter()
  const results = search.data ? hideWatched(uniqueById(search.data.pages.flatMap((p) => p.media))) : undefined
  const hasFilters = q || Object.values(filters).some(Boolean)

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Search</h1>

      <div className="mt-6 space-y-3">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by title, e.g. Frieren"
          autoFocus
          className="field w-full px-4 py-3 text-base"
        />

        <div className="flex flex-wrap gap-2">
          <select className="field" value={filters.genre} onChange={(e) => update('genre', e.target.value)}>
            <option value="">All genres</option>
            {genres.data?.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select className="field" value={filters.format} onChange={(e) => update('format', e.target.value)}>
            <option value="">All formats</option>
            {FORMATS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <select className="field" value={filters.status} onChange={(e) => update('status', e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <select className="field" value={filters.year} onChange={(e) => update('year', e.target.value)}>
            <option value="">Any year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select className="field" value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>
                Sort: {label}
              </option>
            ))}
          </select>

          {/* Tags come from links (detail page, genres page), so show them as a removable chip. */}
          {filters.tag && (
            <button
              onClick={() => update('tag', '')}
              className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent"
              aria-label={`Remove tag ${filters.tag}`}
            >
              Tag: {filters.tag} ✕
            </button>
          )}
          <HideWatchedToggle className="ml-auto" />
          {hasFilters && (
            <button
              onClick={() => {
                setText('')
                setParams({})
              }}
              className="px-3 py-2 text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {search.isPlaceholderData && <p className="mb-4 text-sm text-muted">Updating…</p>}
        {search.isError ? (
          <ErrorMessage error={search.error} onRetry={() => search.refetch()} />
        ) : (
          <div className={search.isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
            <AnimeGrid anime={results} isLoading={search.isPending} skeletonCount={24} />
          </div>
        )}
        {results && results.length > 0 && !search.isPlaceholderData && (
          <LoadMore
            hasNextPage={search.hasNextPage}
            isFetchingNextPage={search.isFetchingNextPage}
            fetchNextPage={search.fetchNextPage}
            endText="That's everything."
          />
        )}
      </div>
    </>
  )
}
