import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimeLink } from '../components/AnimeLink'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { useSchedule } from '../hooks/useAnime'
import { clockTime, countdown, displayTitle, formatLabel, posterUrl } from '../lib/utils'
import type { AiringEntry } from '../types/anime'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_WEEKS = 4 // how far forward/back you can browse

/** Midnight on Monday of this week, moved by `offset` weeks. Uses your own time zone. */
function weekStart(offset: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const daysSinceMonday = (d.getDay() + 6) % 7 // getDay(): Sunday = 0, so shift to Monday = 0
  d.setDate(d.getDate() - daysSinceMonday + offset * 7)
  return d
}

/** Day of the week for a unix time, Monday = 0 … Sunday = 6. */
const dayIndex = (unixSeconds: number) => (new Date(unixSeconds * 1000).getDay() + 6) % 7

/** The current time, updated every minute, so countdowns tick down on their own. */
function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

export function SchedulePage() {
  const [params, setParams] = useSearchParams()
  const week = Math.max(-MAX_WEEKS, Math.min(MAX_WEEKS, Number(params.get('week')) || 0))
  const now = useNow()

  const start = useMemo(() => weekStart(week), [week])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
    [start],
  )
  const from = Math.floor(start.getTime() / 1000) - 1
  const to = Math.floor(days[6].getTime() / 1000) + DAY_MS / 1000

  // Today's tab is picked by default on this week; Monday on other weeks.
  const todayIndex = dayIndex(now / 1000)
  const day = params.has('day') ? Math.max(0, Math.min(6, Number(params.get('day')))) : week === 0 ? todayIndex : 0

  const { data, isPending, isError, error, refetch } = useSchedule(from, to)

  // Split the week's episodes into the 7 days.
  const byDay = useMemo(() => {
    const groups: AiringEntry[][] = Array.from({ length: 7 }, () => [])
    for (const entry of data ?? []) groups[dayIndex(entry.airingAt)].push(entry)
    return groups
  }, [data])

  const setWeek = (w: number) => setParams(w ? { week: String(w) } : {})
  const setDay = (d: number) => setParams({ ...(week ? { week: String(week) } : {}), day: String(d) })

  const rangeLabel = `${days[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en', { month: 'short', day: 'numeric' })}`

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Airing schedule</h1>
          <p className="mt-1 text-sm text-muted">
            {rangeLabel} · times are in your time zone
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setWeek(week - 1)}
            disabled={week <= -MAX_WEEKS}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            ← Prev week
          </button>
          {week !== 0 && (
            <button onClick={() => setWeek(0)} className="px-2 py-2 text-muted hover:text-accent">
              This week
            </button>
          )}
          <button
            onClick={() => setWeek(week + 1)}
            disabled={week >= MAX_WEEKS}
            className="rounded-md border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Next week →
          </button>
        </div>
      </div>

      {/* Day tabs, underlined like the navbar and the Top page. */}
      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-line">
        {days.map((d, i) => {
          const isToday = week === 0 && i === todayIndex
          return (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition ${
                day === i ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {d.toLocaleDateString('en', { weekday: 'short' })}{' '}
              <span className="tabular-nums">{d.getDate()}</span>
              {isToday && <span className="ml-1 text-accent">•</span>}
              {data && <span className="ml-1.5 text-xs text-muted tabular-nums">{byDay[i].length}</span>}
            </button>
          )
        })}
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
                <div className="h-4 w-16 rounded bg-line" />
                <div className="h-20 w-14 rounded bg-line" />
                <div className="h-4 flex-1 rounded bg-line" />
              </div>
            ))}
          </div>
        ) : byDay[day].length === 0 ? (
          <p className="py-12 text-center text-muted">Nothing airing this day.</p>
        ) : (
          <ol className="divide-y divide-line">
            {byDay[day].map((entry) => (
              <ScheduleRow key={entry.id} entry={entry} now={now} />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}

function ScheduleRow({ entry, now }: { entry: AiringEntry; now: number }) {
  const { media } = entry
  const aired = entry.airingAt * 1000 <= now
  const soon = !aired && entry.airingAt * 1000 - now < DAY_MS

  return (
    <li>
      <AnimeLink animeId={media.id} className={`group flex items-center gap-4 py-3 ${aired ? 'opacity-60' : ''}`}>
        <span className="w-16 shrink-0 text-sm font-medium tabular-nums">{clockTime(entry.airingAt)}</span>
        <div
          className="h-20 w-14 shrink-0 overflow-hidden rounded"
          style={{ backgroundColor: media.coverImage.color ?? 'var(--line)' }}
        >
          <FadeImage src={posterUrl(media)} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium group-hover:text-accent">{displayTitle(media)}</h3>
          <p className="mt-1 text-sm text-muted">
            Episode {entry.episode}
            {media.episodes ? ` of ${media.episodes}` : ''}
            {formatLabel(media.format) ? ` · ${formatLabel(media.format)}` : ''}
          </p>
        </div>
        <span className={`shrink-0 text-sm tabular-nums ${soon ? 'font-medium text-accent' : 'text-muted'}`}>
          {countdown(entry.airingAt, now)}
        </span>
      </AnimeLink>
    </li>
  )
}
