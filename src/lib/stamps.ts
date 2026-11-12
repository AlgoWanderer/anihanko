// The Stamp Book: your anime list, saved in this browser (localStorage).
// Each anime gets a stamp: 済 watched, 中 watching, 予 plan to watch or 止 dropped,
// plus your own score and (while watching) how many episodes you've seen.
// There's no backend, so stamps live only on this device. The Stamp Book page can
// download them as a backup file and load them back in.
import { useSyncExternalStore } from 'react'
import type { Anime, AnimeDetail } from '../types/anime'

const KEY = 'anihanko-stamps'

export type StampStatus = 'watched' | 'watching' | 'plan' | 'dropped'

/** How each kind of stamp looks. Kanji are the ones used on real Japanese stamps. */
export const STAMP_TYPES: Record<StampStatus, { kanji: string; label: string; word: string; color: string }> = {
  watched: { kanji: '済', label: 'Watched', word: 'WATCHED', color: '#c2410c' }, // sumi, "done"
  watching: { kanji: '中', label: 'Watching', word: 'WATCHING', color: '#0f766e' }, // chū, "in progress"
  plan: { kanji: '予', label: 'Plan to watch', word: 'PLANNED', color: '#a16207' }, // yo, "planned"
  dropped: { kanji: '止', label: 'Dropped', word: 'DROPPED', color: '#57534e' }, // yame, "stopped"
}
export const STATUS_ORDER: StampStatus[] = ['watching', 'plan', 'watched', 'dropped']

/** What we save per stamp: enough to draw a card, add up watch time, and track progress. */
export interface Stamp {
  id: number
  title: string
  cover: string | null
  color: string | null
  format: Anime['format']
  episodes: number | null
  duration: number | null // minutes per episode
  year: number | null
  genres: string[]
  stampedAt: number // when you last changed the stamp (milliseconds, like Date.now())
  status: StampStatus
  progress: number // episodes watched (used while "watching")
  score: number | null // your score, 1–10
}

type StampMap = Record<number, Stamp>

/** Older stamps (before stamp types existed) had no status: they were all "watched". */
function upgrade(s: Partial<Stamp> & { id: number; title: string }): Stamp {
  const status = s.status && s.status in STAMP_TYPES ? s.status : 'watched'
  return {
    cover: null,
    color: null,
    format: null,
    episodes: null,
    duration: null,
    year: null,
    stampedAt: Date.now(),
    ...s,
    genres: Array.isArray(s.genres) ? s.genres : [],
    status,
    progress: typeof s.progress === 'number' ? s.progress : status === 'watched' ? (s.episodes ?? 0) : 0,
    score: typeof s.score === 'number' && s.score >= 1 && s.score <= 10 ? s.score : null,
  }
}

function read(): StampMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Stamp>
    return Object.fromEntries(Object.values(parsed).map((s) => [s.id, upgrade(s)]))
  } catch {
    return {} // storage blocked or the saved data is broken: start empty
  }
}

// Keep one copy in memory so every component sees the same object (React needs that).
let stamps: StampMap = read()
const listeners = new Set<() => void>()

function save(next: StampMap) {
  stamps = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked (e.g. private mode): stamps still work until the tab is closed.
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  // If you stamp something in another tab, update this tab too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      stamps = read()
      notify()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', onStorage)
  }
}

/** All stamps. Components using this re-render whenever a stamp changes. */
export function useStamps(): StampMap {
  return useSyncExternalStore(subscribe, () => stamps)
}

/** This one anime's stamp, if it has one. */
export function useStamp(id: number): Stamp | undefined {
  return useStamps()[id]
}

/**
 * Where the episode counter should be after changing the stamp:
 * - Watched: all episodes.
 * - Plan to watch: 0.
 * - Watching / Dropped: keep your place (e.g. dropped at ep 7 → watching again from ep 7), BUT if you'd
 *   already finished it (e.g. Watched → Watching, a rewatch), start again from 0 instead of 170/170.
 */
function startingProgress(status: StampStatus, oldProgress: number, episodes: number | null) {
  if (status === 'watched') return episodes ?? oldProgress
  if (status === 'plan') return 0
  const finished = episodes !== null && oldProgress >= episodes
  return finished ? 0 : oldProgress
}

/** Stamp an anime (or change its stamp type). Keeps your score, and your place where it makes sense. */
export function setStamp(anime: AnimeDetail, status: StampStatus) {
  const old = stamps[anime.id]
  const episodes = anime.episodes
  save({
    ...stamps,
    [anime.id]: {
      id: anime.id,
      title: anime.title.english || anime.title.romaji || anime.title.native || 'Untitled',
      cover: anime.coverImage.extraLarge || anime.coverImage.large,
      color: anime.coverImage.color,
      format: anime.format,
      episodes,
      duration: anime.duration,
      year: anime.seasonYear ?? anime.startDate.year,
      genres: anime.genres,
      stampedAt: Date.now(),
      status,
      progress: startingProgress(status, old?.progress ?? 0, episodes),
      score: old?.score ?? null,
    },
  })
}

function update(id: number, changes: Partial<Stamp>) {
  const old = stamps[id]
  if (old) save({ ...stamps, [id]: { ...old, ...changes } })
}

/** Episodes watched so far. Reaching the last episode turns "watching" into "watched". */
export function setProgress(id: number, progress: number) {
  const old = stamps[id]
  if (!old) return
  const max = old.episodes ?? Infinity
  const value = Math.max(0, Math.min(progress, max))
  const finished = old.status === 'watching' && old.episodes !== null && value >= old.episodes
  update(id, { progress: value, ...(finished ? { status: 'watched' as const, stampedAt: Date.now() } : {}) })
}

/** Your own score, 1–10, or null to clear it. */
export function setScore(id: number, score: number | null) {
  update(id, { score })
}

export function removeStamp(id: number) {
  const next = { ...stamps }
  delete next[id]
  save(next)
}

/** Minutes you've actually watched: all of it if watched, otherwise your progress. Null if unknown. */
export function stampMinutes(s: Stamp) {
  if (!s.duration) return null
  if (s.status === 'watched') return s.episodes ? s.episodes * s.duration : null
  return s.progress * s.duration
}

/** Is this anime "done with" (watched or dropped)? Used by "Hide what I've watched" and Tonight. */
export const isFinished = (s: Stamp | undefined) => s?.status === 'watched' || s?.status === 'dropped'

/** Download all stamps as a .json file (a backup, or to move them to another device). */
export function exportStamps() {
  const blob = new Blob([JSON.stringify(Object.values(stamps), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `anihanko-stamps-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Load stamps from a backup file, merged with the ones you already have. Returns how many were added. */
export async function importStamps(file: File): Promise<number> {
  const list = JSON.parse(await file.text()) as Stamp[]
  if (!Array.isArray(list)) throw new Error('Not a stamp backup file')
  const valid = list.filter((s) => typeof s?.id === 'number' && typeof s.title === 'string')
  const next = { ...stamps }
  let added = 0
  for (const s of valid) {
    if (!next[s.id]) added++
    next[s.id] = upgrade(s)
  }
  save(next)
  return added
}

// ---------- "Hide what I've watched" setting ----------

const HIDE_KEY = 'anihanko-hide-watched'
let hideWatched = (() => {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
})()
const hideListeners = new Set<() => void>()

/** Whether lists should hide anime you've watched or dropped. One setting for the whole site. */
export function useHideWatched(): [boolean, (on: boolean) => void] {
  const value = useSyncExternalStore(
    (notify) => {
      hideListeners.add(notify)
      return () => hideListeners.delete(notify)
    },
    () => hideWatched,
  )
  const set = (on: boolean) => {
    hideWatched = on
    try {
      localStorage.setItem(HIDE_KEY, on ? '1' : '0')
    } catch {
      // ignore: the setting still works for this visit
    }
    hideListeners.forEach((notify) => notify())
  }
  return [value, set]
}

/** Returns a function that removes watched/dropped anime from a list, when the switch is on. */
export function useWatchedFilter() {
  const [hide] = useHideWatched()
  const stamps = useStamps()
  return <T extends Pick<Anime, 'id'>>(list: T[]) => (hide ? list.filter((a) => !isFinished(stamps[a.id])) : list)
}
