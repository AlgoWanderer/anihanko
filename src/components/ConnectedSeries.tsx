import { useState } from 'react'
import { isMainEntry } from '../api/anilist'
import { useConnectedSeries } from '../hooks/useAnime'
import { useStamps } from '../lib/stamps'
import { displayTitle, formatLabel, posterUrl } from '../lib/utils'
import type { AnimeDetail } from '../types/anime'
import { AnimeLink } from './AnimeLink'
import { FadeImage } from './FadeImage'
import { HankoStamp } from './HankoStamp'

/**
 * "Connected series": other series AniList links to this story (same universe, shared world),
 * like Chaos;Head, Robotics;Notes and Occultic;Nine for Steins;Gate. Each is its own story.
 * Only offered when this anime has such a link, and only loads when you press the button.
 */
export function ConnectedSeries({ anime }: { anime: AnimeDetail }) {
  const [show, setShow] = useState(false)
  const connected = useConnectedSeries(anime.id, show)
  const stamps = useStamps()

  // Only offer this when there's a real series behind the link (not just a promo video or chibi short).
  const hasLinks = anime.relations.edges.some((e) => e.relationType === 'OTHER' && isMainEntry(e.node))
  if (!hasLinks) return null

  return (
    <section>
      <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold">Connected series</h2>

      {!show ? (
        <div>
          <p className="mb-3 text-sm text-muted">
            {displayTitle(anime)} is linked to other series, often ones set in the same world.
          </p>
          <button
            onClick={() => setShow(true)}
            className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
          >
            Show connected series
          </button>
        </div>
      ) : connected.isPending ? (
        <p className="text-sm text-muted">Looking for connected series…</p>
      ) : connected.isError ? (
        <p className="text-sm text-muted">
          Couldn't load connected series.{' '}
          <button onClick={() => connected.refetch()} className="text-accent">
            Try again
          </button>
        </p>
      ) : connected.data.length === 0 ? (
        <p className="text-sm text-muted">No connected series found.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            Each is its own story and can be watched on its own.
          </p>
          <ul className="space-y-4">
            {connected.data.map((series) => (
              <li key={series.entries[0].id} className="rounded-md border border-line bg-surface p-3">
                {/* One series: its main entries in order, joined by arrows */}
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
                  {series.entries.map((a, i) => (
                    <li key={a.id} className="flex items-center gap-2">
                      {i > 0 && (
                        <span className="text-muted" aria-hidden="true">
                          →
                        </span>
                      )}
                      <AnimeLink animeId={a.id} className="group flex items-center gap-3">
                        <div
                          className="relative h-16 w-11 shrink-0 overflow-hidden rounded"
                          style={{ backgroundColor: a.coverImage.color ?? 'var(--line)' }}
                        >
                          <FadeImage src={posterUrl(a)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 max-w-48">
                          <p className="line-clamp-2 text-sm font-medium group-hover:text-accent">{displayTitle(a)}</p>
                          <p className="text-xs text-muted">
                            {[a.startDate.year, formatLabel(a.format)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {stamps[a.id] && <HankoStamp status={stamps[a.id].status} className="h-7 w-7 shrink-0" />}
                      </AnimeLink>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
