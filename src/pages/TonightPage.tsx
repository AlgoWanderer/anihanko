import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { TonightEra, TonightMood, TonightTime } from '../api/anilist'
import { AnimeLink } from '../components/AnimeLink'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { useTonightCandidates } from '../hooks/useAnime'
import { useStamps } from '../lib/stamps'
import { displayTitle, metaLine, posterUrl, scoreLabel } from '../lib/utils'
import type { Anime } from '../types/anime'

const TIMES: { value: TonightTime; label: string; hint: string }[] = [
  { value: 'movie', label: 'One evening', hint: 'A movie' },
  { value: 'short', label: 'A few evenings', hint: 'Up to 13 episodes' },
  { value: 'long', label: 'A whole weekend+', hint: '20 to 60 episodes' },
]
const MOODS: { value: TonightMood; label: string }[] = [
  { value: 'laugh', label: 'Make me laugh' },
  { value: 'cry', label: 'Make me cry' },
  { value: 'hyped', label: 'Get me hyped' },
  { value: 'chill', label: 'Something chill' },
  { value: 'spooked', label: 'Spook me' },
  { value: 'think', label: 'Make me think' },
]
const ERAS: { value: TonightEra; label: string; hint: string }[] = [
  { value: 'new', label: 'Something new', hint: 'Last 5 years' },
  { value: 'classic', label: 'A classic', hint: 'Before 2015' },
  { value: 'any', label: "Don't care", hint: 'Any year' },
]

/**
 * Picks `count` items using a "seed" number. The same seed always gives the same picks,
 * so the page doesn't reshuffle every time React re-draws it; "Shuffle" just changes the seed.
 */
function pick<T>(items: T[], count: number, seed: number): T[] {
  let state = seed
  const random = () => {
    // A tiny random number generator (mulberry32): good enough for shuffling a list.
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

/** /tonight: answer 3 questions, get 3 anime. Answers live in the URL, so picks can be shared. */
export function TonightPage() {
  const [params, setParams] = useSearchParams()
  const time = params.get('time') as TonightTime | null
  const mood = params.get('mood') as TonightMood | null
  const era = params.get('era') as TonightEra | null
  const seed = Number(params.get('seed')) || 1
  const ready = !!(time && mood && era)

  // The choices you're making before pressing "Pick for me"
  const [draft, setDraft] = useState({ time, mood, era })
  const complete = draft.time && draft.mood && draft.era

  const candidates = useTonightCandidates(ready ? { time, mood, era } : null)
  const stamps = useStamps()
  // Skip anything you've watched, are watching or dropped. "Plan to watch" ones stay: they're great picks.
  const unwatched = (candidates.data ?? []).filter((a) => !stamps[a.id] || stamps[a.id].status === 'plan')
  const picks = pick(unwatched, 3, seed)

  const newSeed = () => String(Math.floor(Math.random() * 1_000_000) + 1)
  const go = () => complete && setParams({ time: draft.time!, mood: draft.mood!, era: draft.era!, seed: newSeed() })
  const shuffle = () => setParams((prev) => ({ ...Object.fromEntries(prev), seed: newSeed() }))

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">What should I watch tonight?</h1>
      <p className="mt-1 text-sm text-muted">Three quick questions, three picks. Anything you've watched, are watching or dropped is skipped.</p>

      <div className="mt-8 space-y-7">
        <Question title="How much time do you have?">
          {TIMES.map((o) => (
            <Choice key={o.value} active={draft.time === o.value} onClick={() => setDraft({ ...draft, time: o.value })} label={o.label} hint={o.hint} />
          ))}
        </Question>
        <Question title="What's the mood?">
          {MOODS.map((o) => (
            <Choice key={o.value} active={draft.mood === o.value} onClick={() => setDraft({ ...draft, mood: o.value })} label={o.label} />
          ))}
        </Question>
        <Question title="New or classic?">
          {ERAS.map((o) => (
            <Choice key={o.value} active={draft.era === o.value} onClick={() => setDraft({ ...draft, era: o.value })} label={o.label} hint={o.hint} />
          ))}
        </Question>

        <button
          onClick={go}
          disabled={!complete}
          className="rounded-md bg-accent px-6 py-3 font-semibold text-on-accent transition hover:opacity-90 active:scale-95 disabled:opacity-40"
        >
          Pick for me
        </button>
      </div>

      {ready && (
        <section className="mt-12" aria-live="polite">
          <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Tonight's picks</h2>
            {unwatched.length > 3 && (
              <button onClick={shuffle} className="text-sm font-medium text-accent hover:underline">
                Shuffle ↻
              </button>
            )}
          </div>

          {candidates.isError ? (
            <ErrorMessage error={candidates.error} onRetry={() => candidates.refetch()} />
          ) : candidates.isPending ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-md bg-line" />
              ))}
            </div>
          ) : picks.length === 0 ? (
            <p className="py-8 text-center text-muted">
              Nothing matches all three. Try a different mood or "Don't care" for the year.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {picks.map((anime) => (
                <PickCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Choice({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-4 py-2 text-left text-sm transition ${
        active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:border-accent'
      }`}
    >
      <span className="block font-medium">{label}</span>
      {hint && <span className={`block text-xs ${active ? 'text-accent' : 'text-muted'}`}>{hint}</span>}
    </button>
  )
}

function PickCard({ anime }: { anime: Anime }) {
  return (
    <AnimeLink animeId={anime.id} className="group flex gap-4 rounded-md border border-line bg-surface p-3 transition hover:border-accent">
      <div
        className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded"
        style={{ backgroundColor: anime.coverImage.color ?? 'var(--line)' }}
      >
        <FadeImage src={posterUrl(anime)} alt={displayTitle(anime)} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 py-1">
        <h3 className="font-display text-lg leading-snug font-semibold group-hover:text-accent">{displayTitle(anime)}</h3>
        <p className="mt-1 text-sm text-muted">{metaLine(anime)}</p>
        {scoreLabel(anime.averageScore) && (
          <p className="mt-2 text-sm">
            <span className="font-semibold text-accent">{scoreLabel(anime.averageScore)}</span>
            <span className="text-muted"> / 10</span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">{anime.genres.slice(0, 4).join(' · ')}</p>
      </div>
    </AnimeLink>
  )
}
