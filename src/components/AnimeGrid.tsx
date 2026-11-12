import type { Anime } from '../types/anime'
import { AnimeCard, AnimeCardSkeleton } from './AnimeCard'

interface Props {
  anime?: Anime[]
  isLoading?: boolean
  skeletonCount?: number
}

/** A responsive grid of anime cards, with skeletons while loading. */
export function AnimeGrid({ anime, isLoading, skeletonCount = 12 }: Props) {
  const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!anime || anime.length === 0) {
    return <p className="py-12 text-center text-muted">No anime found.</p>
  }

  return (
    <div className={gridClass}>
      {anime.map((a) => (
        <AnimeCard key={a.id} anime={a} />
      ))}
    </div>
  )
}
