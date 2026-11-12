import { useParams, useSearchParams } from 'react-router'
import type { PeopleSort } from '../api/anilist'
import { AnimeGrid } from '../components/AnimeGrid'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadMore } from '../components/LoadMore'
import { SortTabs } from '../components/SortTabs'
import { useStudio } from '../hooks/useAnime'
import { compactNumber, uniqueById } from '../lib/utils'

/** /studio/:id: everything an animation studio has made. */
export function StudioPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const sort: PeopleSort = params.get('sort') === 'newest' ? 'newest' : 'popularity'
  const studio = useStudio(id, sort)

  if (!Number.isFinite(id)) return <ErrorMessage error={new Error('Invalid id')} />
  if (studio.isError) return <ErrorMessage error={studio.error} onRetry={() => studio.refetch()} />

  const info = studio.data?.pages[0]
  const anime = studio.data ? uniqueById(studio.data.pages.flatMap((p) => p.media.nodes)).filter((a) => !a.isAdult) : undefined

  return (
    <>
      {info ? (
        <div>
          <p className="text-sm font-medium tracking-wide text-accent uppercase">
            {info.isAnimationStudio ? 'Animation studio' : 'Studio'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{info.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {compactNumber(info.favourites)} favorites ·{' '}
            <a href={info.siteUrl} target="_blank" rel="noreferrer" className="hover:text-accent">
              View on AniList ↗
            </a>
          </p>
        </div>
      ) : (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 rounded bg-line" />
          <div className="h-9 w-64 rounded bg-line" />
        </div>
      )}

      <SortTabs value={sort} onChange={(s) => setParams(s === 'popularity' ? {} : { sort: s })} />

      <div className={`mt-6 ${studio.isPlaceholderData ? 'opacity-60' : ''}`}>
        <AnimeGrid anime={anime} isLoading={studio.isPending} skeletonCount={12} />
      </div>
      {anime && anime.length > 0 && !studio.isPlaceholderData && (
        <LoadMore
          hasNextPage={studio.hasNextPage}
          isFetchingNextPage={studio.isFetchingNextPage}
          fetchNextPage={studio.fetchNextPage}
          endText="That's everything."
        />
      )}
    </>
  )
}
