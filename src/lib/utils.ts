import type { Anime, AnimeDetail, FuzzyDate, MediaFormat, MediaStatus, PageInfo, Season } from '../types/anime'

export const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL']

/** Which anime season is it right now? (Jan–Mar winter, Apr–Jun spring, ...) */
export function getCurrentSeason(date = new Date()): { year: number; season: Season } {
  return { year: date.getFullYear(), season: SEASONS[Math.floor(date.getMonth() / 3)] }
}

/** Move forward (+1) or back (-1) one season, rolling over years. */
export function shiftSeason(year: number, season: Season, step: 1 | -1) {
  const index = SEASONS.indexOf(season) + step
  if (index < 0) return { year: year - 1, season: SEASONS[3] }
  if (index > 3) return { year: year + 1, season: SEASONS[0] }
  return { year, season: SEASONS[index] }
}

/** "FALL" → "Fall" */
export const seasonLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** Prefer the English title when there is one. */
export const displayTitle = (a: Anime) => a.title.english || a.title.romaji || a.title.native || 'Untitled'

export const posterUrl = (a: Anime) => a.coverImage.extraLarge || a.coverImage.large || ''

export const FORMAT_LABELS: Record<MediaFormat, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
}

export const STATUS_LABELS: Record<MediaStatus, string> = {
  FINISHED: 'Finished',
  RELEASING: 'Airing',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus',
}

export const formatLabel = (f: MediaFormat | null) => (f ? FORMAT_LABELS[f] : null)

/** AniList scores are 0–100. We show them out of 10, e.g. 87 → "8.7". */
export const scoreLabel = (score: number | null) => (score ? (score / 10).toFixed(1) : null)

/** Year shown on cards: the season year, or the start year for movies etc. */
export const yearOf = (a: Anime) => a.seasonYear ?? a.startDate.year

/** Short "TV · 12 eps · 2024" line used under cards. */
export function metaLine(a: Anime) {
  return [formatLabel(a.format), a.episodes ? `${a.episodes} eps` : null, yearOf(a)].filter(Boolean).join(' · ')
}

/** 1234567 → "1.2M" */
export function compactNumber(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** { year: 2024, month: 4, day: 6 } → "Apr 6, 2024" (handles missing parts). */
export function formatDate(d: FuzzyDate) {
  if (!d.year) return null
  if (!d.month) return String(d.year)
  const date = new Date(d.year, d.month - 1, d.day ?? 1)
  return date.toLocaleDateString('en', { month: 'short', day: d.day ? 'numeric' : undefined, year: 'numeric' })
}

export function airedRange(a: AnimeDetail) {
  const start = formatDate(a.startDate)
  const end = formatDate(a.endDate)
  if (!start) return null
  if (a.status === 'RELEASING') return `${start} – now`
  return end && end !== start ? `${start} – ${end}` : start
}

/** AniList descriptions contain bits of HTML like <br> and <i>. Turn them into plain text. */
export function plainText(html: string | null) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** "SOURCE_MATERIAL" → "Source material" */
export const enumLabel = (s: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : null)

export function trailerEmbedUrl(a: AnimeDetail) {
  if (a.trailer?.site === 'youtube') return `https://www.youtube-nocookie.com/embed/${a.trailer.id}`
  return null
}

/** How far away a unix timestamp is, e.g. "in 3 days". */
export function timeUntil(unixSeconds: number) {
  const hours = Math.round((unixSeconds * 1000 - Date.now()) / 36e5)
  const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return Math.abs(hours) < 24 ? fmt.format(hours, 'hour') : fmt.format(Math.round(hours / 24), 'day')
}

/**
 * AniList's "lastPage" number isn't always accurate, so we trust "hasNextPage" instead:
 * if there's a next page, there are at least page + 1 pages.
 */
export function lastPageOf(info: PageInfo) {
  return info.hasNextPage ? Math.max(info.lastPage, info.currentPage + 1) : info.currentPage
}

/**
 * Infinite scroll joins pages together. AniList sometimes repeats an anime across two pages
 * when they're sorted by something that changes (like popularity), so drop repeats.
 */
export function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>()
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

/** Countdown to a unix time: "in 2d 4h", "in 3h 15m", "in 12m", or "aired". */
export function countdown(unixSeconds: number, nowMs = Date.now()) {
  const mins = Math.floor((unixSeconds * 1000 - nowMs) / 60000)
  if (mins <= 0) return 'aired'
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `in ${d}d ${h}h`
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

/** Local clock time, e.g. "9:30 PM". */
export const clockTime = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })

/**
 * AniList people/character bios use a bit of Markdown: __bold__, _italic_, [links](url) and ~!spoilers!~.
 * Turn that into plain text (spoilers are removed).
 */
export function plainMarkdown(text: string | null) {
  if (!text) return ''
  return plainText(
    text
      .replace(/~!([\s\S]*?)!~/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(^|[\s(])[_*]([^_*\n]+)[_*](?=[\s.,;:!?)]|$)/gm, '$1$2'), // _italic_ and *italic*
  )
}

/** 1150 → "19h 10m", 27600 → "19d 4h", 45 → "45m" */
export function formatMinutes(total: number) {
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = Math.round(total % 60)
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}
