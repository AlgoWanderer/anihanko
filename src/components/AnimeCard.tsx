import { AnimeLink } from './AnimeLink'
import { FadeImage } from './FadeImage'
import { HankoStamp } from './HankoStamp'
import { useStamp } from '../lib/stamps'
import type { Anime } from '../types/anime'
import { displayTitle, metaLine, posterUrl, scoreLabel } from '../lib/utils'

export function AnimeCard({ anime }: { anime: Anime }) {
  const score = scoreLabel(anime.averageScore)
  const stamped = useStamp(anime.id)

  return (
    <AnimeLink animeId={anime.id} className="group block">
      {/* The poster's own main color (from AniList) fills the box while the image loads. */}
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-md bg-line ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ backgroundColor: anime.coverImage.color ?? undefined }}
      >
        <FadeImage src={posterUrl(anime)} alt={displayTitle(anime)} className="h-full w-full object-cover" />
        {stamped && <HankoStamp status={stamped.status} className="absolute top-1.5 right-1.5 h-12 w-12 drop-shadow" />}
        {score && (
          <span className="absolute bottom-0 left-0 rounded-tr-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-paper tabular-nums">
            {score}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent">{displayTitle(anime)}</h3>
      <p className="mt-0.5 text-xs text-muted">{metaLine(anime)}</p>
    </AnimeLink>
  )
}

export function AnimeCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-md bg-line" />
      <div className="mt-2 h-4 w-4/5 rounded bg-line" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-line" />
    </div>
  )
}
