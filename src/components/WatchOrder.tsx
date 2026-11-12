import { useState } from 'react'
import { isStoryLink } from '../api/anilist'
import { useFranchise } from '../hooks/useAnime'
import { useStamps } from '../lib/stamps'
import { displayTitle, formatLabel } from '../lib/utils'
import type { AnimeDetail } from '../types/anime'
import { AnimeLink } from './AnimeLink'
import { HankoStamp } from './HankoStamp'

/**
 * The whole story in release order: every season, movie, OVA and special.
 * It can take a few requests for long series, so it only loads when you press the button.
 */
export function WatchOrder({ anime }: { anime: AnimeDetail }) {
  const [show, setShow] = useState(false)
  const franchise = useFranchise(anime.id, show)
  const stamps = useStamps()

  // Only offer this if the anime is actually part of a bigger story.
  const hasStory = anime.relations.edges.some((e) => isStoryLink(e.relationType, e.node))
  if (!hasStory) return null

  const list = franchise.data ?? []
  const watched = list.filter((a) => stamps[a.id]?.status === 'watched').length

  return (
    <section>
      <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold">Watch order</h2>

      {!show ? (
        <button
          onClick={() => setShow(true)}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          Show the full watch order
        </button>
      ) : franchise.isPending ? (
        <p className="text-sm text-muted">Following the story through every season…</p>
      ) : franchise.isError ? (
        <p className="text-sm text-muted">
          Couldn't load the watch order.{' '}
          <button onClick={() => franchise.refetch()} className="text-accent">
            Try again
          </button>
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {list.length} entries in release order
            {watched > 0 && (
              <>
                {' '}
                · <span className="font-medium text-accent">{watched} watched</span>
              </>
            )}
          </p>
          <ol className="relative border-l-2 border-line pl-5">
            {list.map((a, i) => {
              const current = a.id === anime.id
              const date = a.startDate.year
                ? new Date(a.startDate.year, (a.startDate.month ?? 1) - 1).toLocaleDateString('en', {
                    month: a.startDate.month ? 'short' : undefined,
                    year: 'numeric',
                  })
                : 'TBA'
              return (
                <li key={a.id} className="relative pb-4 last:pb-0">
                  {/* the dot on the timeline */}
                  <span
                    className={`absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 ${
                      current ? 'border-accent bg-accent' : 'border-line bg-paper'
                    }`}
                  />
                  <AnimeLink animeId={a.id} className="group flex items-start gap-3">
                    <span className="w-6 shrink-0 pt-0.5 text-right text-sm text-muted tabular-nums">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium group-hover:text-accent ${current ? 'text-accent' : ''}`}>
                        {displayTitle(a)}
                        {current && <span className="ml-2 text-xs font-normal text-muted">(this one)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {[date, formatLabel(a.format), a.episodes ? `${a.episodes} eps` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {stamps[a.id] && <HankoStamp status={stamps[a.id].status} className="h-8 w-8 shrink-0" />}
                  </AnimeLink>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
