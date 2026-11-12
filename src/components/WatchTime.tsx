import { useState } from 'react'
import { formatMinutes } from '../lib/utils'
import type { AnimeDetail } from '../types/anime'

/**
 * How long it takes to watch, and when you'd finish at your own pace:
 * "Total 9h 36m · At 3 episodes a day you'll finish in 10 days (Nov 18)".
 */
export function WatchTime({ anime }: { anime: AnimeDetail }) {
  const [perDay, setPerDay] = useState(3)
  const [today] = useState(() => Date.now()) // read the clock once, not on every re-draw

  // Still airing with no final count: use the episodes out so far.
  const airedSoFar = anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : null
  const episodes = anime.episodes ?? airedSoFar
  const minutes = anime.duration
  if (!episodes || !minutes) return null

  const total = episodes * minutes
  const isMovie = anime.format === 'MOVIE' || episodes === 1
  const days = Math.ceil(episodes / perDay)
  const finish = new Date(today + (days - 1) * 24 * 60 * 60 * 1000)

  return (
    <div>
      <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold">Watch time</h2>
      <p className="text-2xl font-semibold tabular-nums">{formatMinutes(total)}</p>
      <p className="mt-1 text-sm text-muted">
        {isMovie
          ? 'One sitting.'
          : `${episodes} episodes × ${minutes} min${!anime.episodes && airedSoFar ? ' (aired so far)' : ''}`}
      </p>

      {!isMovie && (
        <div className="mt-4 rounded-md border border-line bg-surface p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Episodes a day</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPerDay((n) => Math.max(1, n - 1))}
                className="h-7 w-7 rounded border border-line hover:border-accent hover:text-accent"
                aria-label="Fewer episodes a day"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{perDay}</span>
              <button
                onClick={() => setPerDay((n) => Math.min(episodes, n + 1))}
                className="h-7 w-7 rounded border border-line hover:border-accent hover:text-accent"
                aria-label="More episodes a day"
              >
                +
              </button>
            </div>
          </div>
          <p className="mt-2">
            {days === 1 ? (
              <>You can finish it <span className="font-semibold text-accent">today</span>.</>
            ) : (
              <>
                Done in <span className="font-semibold">{days} days</span>, on{' '}
                <span className="font-semibold text-accent">
                  {finish.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                .
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
