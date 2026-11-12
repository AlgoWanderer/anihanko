import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { useSearchIndex } from '../hooks/useAnime'
import { searchLocal, type IndexEntry } from '../lib/localSearch'
import { displayTitle, formatLabel } from '../lib/utils'
import type { Anime } from '../types/anime'

// ---------- Puzzle rules ----------

const MAX_TRIES = 3
// Blur for 0, 1 and 2 wrong guesses. Starts blurry enough to hide text and faces,
// but you can still make out colors, shapes and the art style.
const BLUR_PX = [10, 6, 3]
const POOL_SIZE = 500 // puzzles come from the 500 most popular anime
const DAY_ONE = new Date(2026, 10, 8) // puzzle #1 was on Nov 8, 2026
const DAY_MS = 24 * 60 * 60 * 1000

/** Puzzle number for a date: #1 on day one, #2 the day after... */
function puzzleNumber(date = new Date()) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((midnight.getTime() - DAY_ONE.getTime()) / DAY_MS) + 1
}

/** The same "random" number for everyone on the same day (so it's one shared daily puzzle). */
function seededIndex(seed: number, length: number) {
  let t = (seed * 0x9e3779b9) | 0
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b)
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35)
  return ((t ^ (t >>> 16)) >>> 0) % length
}

/** The search index stores small covers; swap in the large version for the puzzle. */
const largeCover = (url: string | null) => url?.replace('/cover/small/', '/cover/large/') ?? ''

// ---------- Saved progress (this browser only) ----------

interface DayResult {
  guesses: number[] // anime ids guessed (-1 = skipped)
  solved: boolean
}
type History = Record<number, DayResult>

const KEY = 'anihanko-guess'
let history: History = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as History
  } catch {
    return {}
  }
})()
const listeners = new Set<() => void>()
function saveDay(day: number, result: DayResult) {
  history = { ...history, [day]: result }
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {
    // ignore: still works for this visit
  }
  listeners.forEach((l) => l())
}
function useHistory() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => history,
  )
}

/** Days in a row solved, counting back from today (or yesterday, if today isn't played yet). */
function streakOf(h: History, today: number) {
  let day = h[today] ? today : today - 1
  let streak = 0
  while (h[day]?.solved) {
    streak++
    day--
  }
  return streak
}

// ---------- Page ----------

/** /guess: a daily "guess the anime from a blurry poster" game. */
export function GuessPage() {
  const index = useSearchIndex(true)
  const h = useHistory()
  const [today] = useState(() => puzzleNumber())
  // Practice mode: a random extra puzzle that isn't saved.
  const [practice, setPractice] = useState<{ seed: number; result: DayResult } | null>(null)

  if (index.isPending) return <p className="text-muted">Loading today's puzzle…</p>
  const pool = (index.data ?? []).slice(0, POOL_SIZE)
  if (pool.length === 0) return <p className="text-muted">The puzzle list isn't available right now.</p>

  const daily = { answer: pool[seededIndex(today, pool.length)], result: h[today] ?? { guesses: [], solved: false } }
  const active = practice
    ? { answer: pool[seededIndex(practice.seed, pool.length)], result: practice.result }
    : daily

  function guess(id: number) {
    const result = active.result
    const done = result.solved || result.guesses.length >= MAX_TRIES
    if (done || result.guesses.includes(id)) return
    const next = { guesses: [...result.guesses, id], solved: id === active.answer.anime.id }
    if (practice) setPractice({ ...practice, result: next })
    else saveDay(today, next)
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-accent uppercase">
            {practice ? 'Practice round' : `Daily puzzle #${today}`}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Guess the anime</h1>
          <p className="mt-1 text-sm text-muted">
            Name the anime from its poster. Every wrong guess makes it sharper. {MAX_TRIES} tries.
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted">Streak</dt>
            <dd className="text-xl font-semibold tabular-nums">{streakOf(h, today)}</dd>
          </div>
          <div>
            <dt className="text-muted">Solved</dt>
            <dd className="text-xl font-semibold tabular-nums">{Object.values(h).filter((r) => r.solved).length}</dd>
          </div>
        </dl>
      </div>

      <Puzzle
        key={practice ? `p${practice.seed}` : `d${today}`}
        answer={active.answer}
        result={active.result}
        index={index.data ?? []}
        onGuess={guess}
        shareLabel={practice ? null : `AniHanko Guess #${today}`}
      />

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <button
          onClick={() => setPractice({ seed: Math.floor(Math.random() * 1e9), result: { guesses: [], solved: false } })}
          className="rounded-md border border-line bg-surface px-4 py-2 hover:border-accent hover:text-accent"
        >
          {practice ? 'Another practice round' : 'Practice with a random one'}
        </button>
        {practice && (
          <button onClick={() => setPractice(null)} className="px-2 py-2 text-muted hover:text-accent">
            Back to today's puzzle
          </button>
        )}
      </div>
    </>
  )
}

function Puzzle({
  answer,
  result,
  index,
  onGuess,
  shareLabel,
}: {
  answer: IndexEntry
  result: DayResult
  index: IndexEntry[]
  onGuess: (id: number) => void
  shareLabel: string | null
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0) // which suggestion is highlighted
  const [listOpen, setListOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const wrong = result.guesses.filter((id) => id !== answer.anime.id).length
  const done = result.solved || result.guesses.length >= MAX_TRIES
  const a = answer.anime
  const byId = new Map(index.map((e) => [e.anime.id, e.anime]))
  const suggestions = query.trim() && listOpen ? searchLocal(index, query, 6) : []

  // ↑ ↓ move through the suggestions, Enter picks the highlighted one, Esc closes the list.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(suggestions[Math.min(active, suggestions.length - 1)])
    } else if (e.key === 'Escape') {
      setListOpen(false)
    }
  }

  // Hints unlock as you get things wrong.
  // (1 wrong: year and format. 2 wrong: first letter too.)
  const hints: [string, string | null][] = [
    ['Year', wrong >= 1 ? String(a.seasonYear ?? '?') : null],
    ['Format', wrong >= 1 ? [formatLabel(a.format), a.episodes ? `${a.episodes} eps` : null].filter(Boolean).join(' · ') : null],
    ['Starts with', wrong >= 2 ? displayTitle(a).charAt(0).toUpperCase() : null],
  ]

  function pick(anime: Anime) {
    onGuess(anime.id)
    setQuery('')
    setActive(0)
  }

  async function share() {
    const squares = result.guesses.map((id) => (id === a.id ? '🟩' : '🟥')).join('')
    const text = `${shareLabel} ${result.solved ? result.guesses.length : 'X'}/${MAX_TRIES}\n${squares}\n${window.location.origin}/guess`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // clipboard blocked: nothing else to do
    }
  }

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
      {/* The poster: blurred until you're done */}
      <div className="mx-auto w-56 md:w-full">
        <div className="aspect-[2/3] overflow-hidden rounded-md bg-line shadow-lg">
          <img
            src={largeCover(a.coverImage.large)}
            alt={done ? displayTitle(a) : 'Mystery anime poster'}
            className="h-full w-full scale-110 object-cover transition-[filter] duration-700"
            style={{ filter: done ? 'none' : `blur(${BLUR_PX[Math.min(wrong, BLUR_PX.length - 1)]}px)` }}
            draggable={false}
          />
        </div>
      </div>

      <div className="min-w-0">
        {done ? (
          <div>
            <p className={`text-sm font-semibold uppercase ${result.solved ? 'text-accent' : 'text-muted'}`}>
              {result.solved ? `Got it in ${result.guesses.length}!` : 'Out of tries'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">
              <Link to={`/anime/${a.id}`} className="hover:text-accent">
                {displayTitle(a)} →
              </Link>
            </h2>
            {shareLabel && (
              <button
                onClick={share}
                className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90"
              >
                {copied ? 'Copied!' : 'Share result'}
              </button>
            )}
            {shareLabel && <p className="mt-3 text-sm text-muted">A new puzzle comes out at midnight.</p>}
          </div>
        ) : (
          <div className="relative">
            <label htmlFor="guess-input" className="font-medium">
              Your guess <span className="text-sm font-normal text-muted">({MAX_TRIES - result.guesses.length} tries left)</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="guess-input"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                  setListOpen(true)
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="guess-suggestions"
                aria-activedescendant={suggestions.length > 0 ? `guess-option-${active}` : undefined}
                placeholder="Start typing a title…"
                autoComplete="off"
                className="field w-full px-4 py-3 text-base"
              />
              <button
                onClick={() => onGuess(-1 - result.guesses.length)}
                className="shrink-0 rounded-md border border-line bg-surface px-4 text-sm hover:border-accent hover:text-accent"
                title="Skip: counts as a wrong guess and sharpens the poster"
              >
                Skip
              </button>
            </div>
            {suggestions.length > 0 && (
              <ul
                id="guess-suggestions"
                role="listbox"
                className="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg"
              >
                {suggestions.map((s, i) => (
                  <li key={s.id} id={`guess-option-${i}`} role="option" aria-selected={i === active}>
                    <button
                      onClick={() => pick(s)}
                      onMouseEnter={() => setActive(i)}
                      tabIndex={-1}
                      className={`block w-full px-4 py-2 text-left text-sm ${
                        i === active ? 'bg-accent-soft text-accent' : ''
                      }`}
                    >
                      {displayTitle(s)}
                      {s.title.romaji && s.title.romaji !== displayTitle(s) && (
                        <span className="ml-2 text-xs text-muted">{s.title.romaji}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Hints */}
        <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
          {hints.map(([label, value]) => (
            <div key={label} className="bg-surface px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-semibold">{value ?? (done ? '—' : '🔒')}</dd>
            </div>
          ))}
        </dl>

        {/* Guesses so far */}
        {result.guesses.length > 0 && (
          <ol className="mt-6 space-y-1.5 text-sm">
            {result.guesses.map((id, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white ${
                    id === a.id ? 'bg-teal-700' : 'bg-accent'
                  }`}
                  aria-label={id === a.id ? 'Correct' : 'Wrong'}
                >
                  {id === a.id ? '✓' : '✗'}
                </span>
                {id < 0 ? <span className="text-muted">Skipped</span> : displayTitle(byId.get(id) ?? a)}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
