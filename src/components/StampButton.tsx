import { Link } from 'react-router'
import { removeStamp, setProgress, setScore, setStamp, STAMP_TYPES, useStamp, type StampStatus } from '../lib/stamps'
import type { AnimeDetail } from '../types/anime'

const CHOICES: StampStatus[] = ['watched', 'watching', 'plan', 'dropped']

/**
 * Stamp controls on the anime page: pick a stamp (watched / watching / plan / dropped),
 * count episodes while watching, and give your own score.
 */
export function StampButton({ anime, onStamp }: { anime: AnimeDetail; onStamp: () => void }) {
  const stamp = useStamp(anime.id)

  function choose(status: StampStatus) {
    if (stamp?.status === status) return
    setStamp(anime, status)
    onStamp()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Stamp this anime">
        {CHOICES.map((status) => {
          const type = STAMP_TYPES[status]
          const active = stamp?.status === status
          return (
            <button
              key={status}
              onClick={() => choose(status)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                active ? 'text-white' : 'border-line bg-surface hover:border-current'
              }`}
              style={active ? { backgroundColor: type.color, borderColor: type.color } : { color: type.color }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-current text-[11px] leading-none"
                aria-hidden="true"
              >
                {type.kanji}
              </span>
              <span className={active ? '' : 'text-ink'}>{type.label}</span>
            </button>
          )
        })}
      </div>

      {stamp && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {/* Episode counter: only while watching (or dropped part way) */}
          {(stamp.status === 'watching' || stamp.status === 'dropped') && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Episode</span>
              <button
                onClick={() => setProgress(anime.id, stamp.progress - 1)}
                className="h-7 w-7 rounded border border-line bg-surface hover:border-accent hover:text-accent"
                aria-label="One episode less"
              >
                −
              </button>
              <span className="min-w-12 text-center font-semibold tabular-nums">
                {stamp.progress}
                {anime.episodes ? ` / ${anime.episodes}` : ''}
              </span>
              <button
                onClick={() => setProgress(anime.id, stamp.progress + 1)}
                className="h-7 w-7 rounded border border-line bg-surface hover:border-accent hover:text-accent"
                aria-label="One more episode"
              >
                +
              </button>
            </div>
          )}

          {/* Your score: 1–10 */}
          {stamp.status !== 'plan' && (
            <label className="flex items-center gap-1.5">
              <span className="text-muted">Your score</span>
              <select
                className="field py-1"
                value={stamp.score ?? ''}
                onChange={(e) => setScore(anime.id, e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">—</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}

          <span className="text-muted">
            <Link to={`/stamps?tab=${stamp.status}`} className="hover:text-accent">
              Stamp book
            </Link>{' '}
            ·{' '}
            <button onClick={() => removeStamp(anime.id)} className="hover:text-accent">
              Remove stamp
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
