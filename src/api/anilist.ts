// All communication with the AniList API lives in this file.
// AniList uses GraphQL: every request is a POST to one URL, and the "query"
// text says exactly which fields we want back. Docs: https://docs.anilist.co
import type {
  AiringEntry,
  Anime,
  AnimeDetail,
  AnimePage,
  AnimeWithStudios,
  BirthdayCharacter,
  Character,
  SearchParams,
  Season,
  Staff,
  Studio,
  Tag,
  TopFilter,
} from '../types/anime'

const API_URL = 'https://graphql.anilist.co'

// AniList allows roughly 30–90 requests per minute. We space requests out a little
// and, if we still get "429 Too Many Requests", wait as long as AniList tells us to.
const MIN_GAP_MS = 250
let lastRequestAt = 0
let queue: Promise<void> = Promise.resolve()

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function waitForTurn(): Promise<void> {
  queue = queue.then(async () => {
    const delay = lastRequestAt + MIN_GAP_MS - Date.now()
    if (delay > 0) await wait(delay)
    lastRequestAt = Date.now()
  })
  return queue
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Variables = Record<string, unknown>

async function gql<T>(query: string, variables: Variables = {}, signal?: AbortSignal, attempt = 0): Promise<T> {
  await waitForTurn()
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  // GraphQL ignores variables that are undefined, which is exactly what we want for "no filter".
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  })

  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get('Retry-After')) || 2 * (attempt + 1)
    await wait(retryAfter * 1000)
    return gql<T>(query, variables, signal, attempt + 1)
  }

  const json = await res.json().catch(() => null)
  if (!res.ok || !json || json.errors) {
    const status = json?.errors?.[0]?.status ?? res.status
    throw new ApiError(status, json?.errors?.[0]?.message ?? `Request failed (${res.status})`)
  }
  return json.data as T
}

// ---------- Reusable pieces of query text ----------

// The fields every card needs. "fragment" lets us reuse this list in several queries.
const CARD_FIELDS = `
  fragment card on Media {
    id
    title { romaji english native }
    coverImage { extraLarge large color }
    format episodes status season seasonYear
    startDate { year month day }
    averageScore popularity genres type isAdult duration
  }
`

// One query that can do search, top lists and seasons, depending on which variables we pass.
const LIST_QUERY = `
  query (
    $page: Int, $perPage: Int, $sort: [MediaSort], $search: String,
    $genre: String, $tag: String, $format: MediaFormat, $status: MediaStatus,
    $season: MediaSeason, $seasonYear: Int, $startAfter: FuzzyDateInt, $startBefore: FuzzyDateInt
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage lastPage hasNextPage }
      media(
        type: ANIME, isAdult: false, sort: $sort, search: $search,
        genre: $genre, tag: $tag, format: $format, status: $status,
        season: $season, seasonYear: $seasonYear,
        startDate_greater: $startAfter, startDate_lesser: $startBefore
      ) { ...card }
    }
  }
  ${CARD_FIELDS}
`

async function getList(variables: Variables, signal?: AbortSignal): Promise<AnimePage> {
  const data = await gql<{ Page: AnimePage }>(LIST_QUERY, variables, signal)
  return data.Page
}

// ---------- Endpoints used by the app ----------

export function getTrending(perPage: number, signal?: AbortSignal) {
  return getList({ sort: ['TRENDING_DESC', 'POPULARITY_DESC'], perPage }, signal)
}

const TOP_VARIABLES: Record<TopFilter | 'all', Variables> = {
  all: { sort: ['SCORE_DESC'] },
  airing: { sort: ['SCORE_DESC'], status: 'RELEASING' },
  upcoming: { sort: ['POPULARITY_DESC'], status: 'NOT_YET_RELEASED' },
  popular: { sort: ['POPULARITY_DESC'] },
  favorites: { sort: ['FAVOURITES_DESC'] },
}

export function getTopAnime(filter: TopFilter | undefined, page: number, perPage: number, signal?: AbortSignal) {
  return getList({ ...TOP_VARIABLES[filter ?? 'all'], page, perPage }, signal)
}

export function getSeason(year: number, season: Season, page: number, perPage: number, signal?: AbortSignal) {
  return getList({ season, seasonYear: year, sort: ['POPULARITY_DESC'], page, perPage }, signal)
}

const SORTS: Record<string, string[]> = {
  popularity: ['POPULARITY_DESC'],
  score: ['SCORE_DESC'],
  trending: ['TRENDING_DESC'],
  newest: ['START_DATE_DESC'],
  title: ['TITLE_ROMAJI'],
}

export function searchAnime(params: SearchParams, page = 1, signal?: AbortSignal) {
  const { q, genre, tag, format, status, year, sort } = params
  const yearNum = Number(year)

  // With search text and no chosen sort, use "best match". Otherwise default to most popular.
  const sortValue = (sort && SORTS[sort]) || (q ? ['SEARCH_MATCH'] : SORTS.popularity)

  return getList(
    {
      page,
      perPage: 24,
      search: q || undefined,
      genre: genre || undefined,
      tag: tag || undefined,
      format: format || undefined,
      status: status || undefined,
      // Dates are written as YYYYMMDD numbers, so "during 2024" = after 20231231 and before 20250000.
      startAfter: yearNum ? (yearNum - 1) * 10000 + 1231 : undefined,
      startBefore: yearNum ? (yearNum + 1) * 10000 : undefined,
      sort: sortValue,
    },
    signal,
  )
}

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...card
      idMal siteUrl bannerImage
      description(asHtml: false)
      endDate { year month day }
      duration source favourites
      trailer { id site }
      studios(isMain: true) { nodes { id name } }
      tags { id name rank isMediaSpoiler }
      rankings { rank type allTime }
      nextAiringEpisode { episode airingAt }
      characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
        edges {
          role
          node { id name { full } image { medium } }
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full } image { medium } }
        }
      }
      relations { edges { relationType node {
        ...card
        relations { edges { relationType node { ...card } } }
      } } }
      recommendations(sort: [RATING_DESC, ID], perPage: 12) { nodes { mediaRecommendation { ...card } } }
    }
  }
  ${CARD_FIELDS}
`

export async function getAnimeById(id: number, signal?: AbortSignal) {
  const data = await gql<{ Media: AnimeDetail }>(DETAIL_QUERY, { id }, signal)
  return data.Media
}

export async function getGenres(signal?: AbortSignal) {
  const data = await gql<{ GenreCollection: string[] }>('{ GenreCollection }', {}, signal)
  // "Hentai" is an adult-only genre; we hide adult content everywhere.
  return data.GenreCollection.filter((g) => g !== 'Hentai')
}

export async function getTags(signal?: AbortSignal) {
  const data = await gql<{ MediaTagCollection: Tag[] }>('{ MediaTagCollection { name category isAdult } }', {}, signal)
  return data.MediaTagCollection.filter((t) => !t.isAdult)
}

// AniList only lets us page 5,000 entries deep, so "random" means: one of the
// 5,000 most popular anime. We ask for page N of a 1-per-page list, where N is random.
const RANDOM_POOL = 5000

export async function getRandomAnimeId(signal?: AbortSignal): Promise<number> {
  const page = Math.floor(Math.random() * RANDOM_POOL) + 1
  const data = await gql<{ Page: { media: { id: number }[] } }>(
    `query ($page: Int) {
      Page(page: $page, perPage: 1) {
        media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) { id }
      }
    }`,
    { page },
    signal,
  )
  const id = data.Page.media[0]?.id
  if (!id) throw new ApiError(404, 'No anime found')
  return id
}

/** A few best-matching anime for the "suggestions while you type" dropdown. */
export function getSuggestions(q: string, signal?: AbortSignal) {
  return getList({ search: q, perPage: 6, sort: ['SEARCH_MATCH'] }, signal)
}

// ---------- Airing schedule ----------

const SCHEDULE_QUERY = `
  query ($page: Int, $from: Int, $to: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        id airingAt episode
        media { ...card countryOfOrigin }
      }
    }
  }
  ${CARD_FIELDS}
`

/** Every episode airing between two unix times (seconds). A week is ~120 episodes = 3 requests. */
export async function getSchedule(from: number, to: number, signal?: AbortSignal): Promise<AiringEntry[]> {
  const all: AiringEntry[] = []
  for (let page = 1; page <= 10; page++) {
    const data = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: AiringEntry[] } }>(
      SCHEDULE_QUERY,
      { page, from, to },
      signal,
    )
    all.push(...data.Page.airingSchedules)
    if (!data.Page.pageInfo.hasNextPage) break
  }
  return all.filter((e) => e.media && !e.media.isAdult)
}

// ---------- Studios and people ----------

export const PEOPLE_SORTS = {
  popularity: ['POPULARITY_DESC'],
  newest: ['START_DATE_DESC'],
}
export type PeopleSort = keyof typeof PEOPLE_SORTS

const STUDIO_QUERY = `
  query ($id: Int, $page: Int, $sort: [MediaSort]) {
    Studio(id: $id) {
      id name isAnimationStudio favourites siteUrl
      media(sort: $sort, isMain: true, page: $page, perPage: 24) {
        pageInfo { currentPage lastPage hasNextPage }
        nodes { ...card }
      }
    }
  }
  ${CARD_FIELDS}
`

export async function getStudio(id: number, page: number, sort: PeopleSort, signal?: AbortSignal) {
  const data = await gql<{ Studio: Studio }>(STUDIO_QUERY, { id, page, sort: PEOPLE_SORTS[sort] }, signal)
  return data.Studio
}

const STAFF_QUERY = `
  query ($id: Int, $page: Int, $sort: [MediaSort]) {
    Staff(id: $id) {
      id name { full native } image { large }
      description(asHtml: false)
      primaryOccupations dateOfBirth { year month day } age homeTown yearsActive languageV2 favourites siteUrl
      characterMedia(page: $page, perPage: 24, sort: $sort) {
        pageInfo { currentPage lastPage hasNextPage }
        edges {
          characterRole
          node { ...card }
          characters { id name { full } image { medium } }
        }
      }
    }
  }
  ${CARD_FIELDS}
`

export async function getStaff(id: number, page: number, sort: PeopleSort, signal?: AbortSignal) {
  const data = await gql<{ Staff: Staff }>(STAFF_QUERY, { id, page, sort: PEOPLE_SORTS[sort] }, signal)
  return data.Staff
}

const CHARACTER_QUERY = `
  query ($id: Int, $page: Int, $sort: [MediaSort]) {
    Character(id: $id) {
      id name { full native alternative } image { large }
      description(asHtml: false)
      gender age dateOfBirth { year month day } bloodType favourites siteUrl
      media(type: ANIME, page: $page, perPage: 24, sort: $sort) {
        pageInfo { currentPage lastPage hasNextPage }
        edges {
          characterRole
          node { ...card }
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full } image { medium } }
        }
      }
    }
  }
  ${CARD_FIELDS}
`

export async function getCharacter(id: number, page: number, sort: PeopleSort, signal?: AbortSignal) {
  const data = await gql<{ Character: Character }>(CHARACTER_QUERY, { id, page, sort: PEOPLE_SORTS[sort] }, signal)
  return data.Character
}

// ---------- Watch order (franchise timeline) ----------

// Which links count as "the same story": prequels, sequels, side stories and parent stories.
const STORY_LINKS = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY']
// "Alternative" links are followed only to short extras (OVA, ONA, special), like Steins;Gate's
// alternate episode 23β, which leads on to Steins;Gate 0. Alternative full TV series or movies
// (Fullmetal Alchemist 2003 vs Brotherhood) are separate versions, so those stay out.
const ALTERNATIVE_EXTRAS = ['OVA', 'ONA', 'SPECIAL', 'TV_SHORT']

/** Is this link part of the same story? Used by the watch order and by "Related anime". */
export function isStoryLink(relationType: string, node: Anime) {
  if (node.type !== 'ANIME' || node.isAdult) return false
  if (STORY_LINKS.includes(relationType)) return true
  return relationType === 'ALTERNATIVE' && node.format !== null && ALTERNATIVE_EXTRAS.includes(node.format)
}
const MAX_FRANCHISE = 60

type LinkedAnime = Anime & { relations?: { edges: { relationType: string; node: LinkedAnime }[] } }

// Asks for some anime, their linked anime, and THOSE anime's links, all in one request (2 steps deep).
const FRANCHISE_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ...card
        relations { edges { relationType node {
          ...card
          relations { edges { relationType node { ...card } } }
        } } }
      }
    }
  }
  ${CARD_FIELDS}
`

/**
 * Every season, movie, OVA and special in an anime's story, oldest first.
 * Long series need a few requests: each one walks 2 more steps along the chain.
 */
export async function getFranchise(startId: number, signal?: AbortSignal): Promise<Anime[]> {
  const found = new Map<number, Anime>() // every anime in the story we've found so far
  const expanded = new Set<number>() // anime whose links we've already looked at
  let frontier = [startId] // anime whose links we still need to look at

  for (let round = 0; round < 8 && frontier.length > 0 && found.size < MAX_FRANCHISE; round++) {
    const data = await gql<{ Page: { media: LinkedAnime[] } }>(FRANCHISE_QUERY, { ids: frontier.slice(0, 50) }, signal)
    const next = new Set<number>()

    const visit = (anime: LinkedAnime) => {
      const { relations, ...card } = anime
      if (!found.has(anime.id)) found.set(anime.id, card)
      if (!relations) {
        // We know this anime is in the story, but haven't seen its links yet: look next round.
        if (!expanded.has(anime.id)) next.add(anime.id)
        return
      }
      if (expanded.has(anime.id)) return
      expanded.add(anime.id)
      for (const { relationType, node } of relations.edges) {
        if (isStoryLink(relationType, node)) visit(node)
      }
    }
    data.Page.media.forEach(visit)
    frontier = [...next].filter((id) => !expanded.has(id))
  }

  // Oldest first. Unknown dates go last.
  const date = (a: Anime) => (a.startDate.year ?? 9999) * 10000 + (a.startDate.month ?? 12) * 100 + (a.startDate.day ?? 31)
  return [...found.values()].filter((a) => a.format !== 'MUSIC').sort((a, b) => date(a) - date(b))
}

// ---------- "What should I watch tonight?" ----------

export type TonightTime = 'movie' | 'short' | 'long'
export type TonightMood = 'laugh' | 'cry' | 'hyped' | 'chill' | 'spooked' | 'think'
export type TonightEra = 'new' | 'classic' | 'any'

const TIME_FILTERS: Record<TonightTime, Variables> = {
  movie: { formats: ['MOVIE'] },
  short: { formats: ['TV', 'ONA'], epMin: 0, epMax: 14 }, // up to 13 episodes
  long: { formats: ['TV'], epMin: 19, epMax: 64 }, // about 20 to 60 episodes
}
const MOOD_GENRES: Record<TonightMood, string[]> = {
  laugh: ['Comedy'],
  cry: ['Drama'],
  hyped: ['Action', 'Sports'],
  chill: ['Slice of Life'],
  spooked: ['Horror', 'Thriller'],
  think: ['Psychological', 'Mystery', 'Sci-Fi'],
}

const TONIGHT_QUERY = `
  query ($genres: [String], $formats: [MediaFormat], $epMin: Int, $epMax: Int, $after: FuzzyDateInt, $before: FuzzyDateInt) {
    Page(perPage: 50) {
      media(
        type: ANIME, isAdult: false, genre_in: $genres, format_in: $formats,
        episodes_greater: $epMin, episodes_lesser: $epMax,
        startDate_greater: $after, startDate_lesser: $before,
        averageScore_greater: 70, popularity_greater: 2000, sort: POPULARITY_DESC
      ) { ...card }
    }
  }
  ${CARD_FIELDS}
`

/** Up to 50 well-liked anime that match your answers. The page picks 3 of them at random. */
export async function getTonightCandidates(time: TonightTime, mood: TonightMood, era: TonightEra, signal?: AbortSignal) {
  const thisYear = new Date().getFullYear()
  const data = await gql<{ Page: { media: Anime[] } }>(
    TONIGHT_QUERY,
    {
      ...TIME_FILTERS[time],
      genres: MOOD_GENRES[mood],
      after: era === 'new' ? (thisYear - 5) * 10000 : undefined,
      before: era === 'classic' ? 20150000 : undefined,
    },
    signal,
  )
  return data.Page.media
}

// ---------- Year in anime ----------

// Two lists in one request, using GraphQL "aliases" (popular: and rated:).
const YEAR_QUERY = `
  query ($after: FuzzyDateInt, $before: FuzzyDateInt) {
    popular: Page(perPage: 50) {
      media(type: ANIME, isAdult: false, startDate_greater: $after, startDate_lesser: $before, sort: POPULARITY_DESC) {
        ...card
        studios(isMain: true) { nodes { id name } }
      }
    }
    rated: Page(perPage: 12) {
      media(
        type: ANIME, isAdult: false, startDate_greater: $after, startDate_lesser: $before,
        popularity_greater: 10000, sort: SCORE_DESC
      ) { ...card }
    }
  }
  ${CARD_FIELDS}
`

/** The 50 most popular and the 12 highest-rated anime that started in a year. */
export async function getYear(year: number, signal?: AbortSignal) {
  const data = await gql<{ popular: { media: AnimeWithStudios[] }; rated: { media: Anime[] } }>(
    YEAR_QUERY,
    { after: (year - 1) * 10000 + 1231, before: (year + 1) * 10000 },
    signal,
  )
  return { popular: data.popular.media, rated: data.rated.media }
}

// ---------- Character birthdays ----------

const BIRTHDAY_QUERY = `
  {
    Page(perPage: 16) {
      characters(isBirthday: true, sort: FAVOURITES_DESC) {
        id name { full } image { medium }
        media(type: ANIME, perPage: 1, sort: POPULARITY_DESC) { nodes { id title { romaji english native } isAdult } }
      }
    }
  }
`

/** The most popular anime characters whose birthday is today (only ones who appear in an anime). */
export async function getBirthdays(signal?: AbortSignal) {
  const data = await gql<{ Page: { characters: BirthdayCharacter[] } }>(BIRTHDAY_QUERY, {}, signal)
  return data.Page.characters.filter((c) => c.media.nodes[0] && !c.media.nodes[0].isAdult).slice(0, 8)
}

// ---------- Connected series (same universe, separate stories) ----------

/**
 * Is this a "main entry" worth showing as a connected series? TV series, movies and web series (ONA)
 * with episodes of at least 10 minutes. That leaves out promo videos (PVs), chibi shorts and one-off
 * specials, which AniList also links with "Other" (e.g. Jujutsu Kaisen → "Jujutsu Kaisen PV": 3 × 2 min).
 */
export function isMainEntry(a: Anime) {
  if (a.type !== 'ANIME' || a.isAdult) return false
  if (a.duration !== null && a.duration !== undefined && a.duration < 10) return false
  if (a.format === 'TV' || a.format === 'MOVIE') return true
  return a.format === 'ONA' && a.episodes !== 1
}

const LINKS_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ...card
        relations { edges { relationType node { ...card } } }
      }
    }
  }
  ${CARD_FIELDS}
`

type WithLinks = Anime & { relations: { edges: { relationType: string; node: Anime }[] } }

/** One connected series: its main entries in release order, e.g. [Chaos;Head, Chaos;Child]. */
export interface ConnectedSeries {
  entries: Anime[]
}

const startDateNum = (a: Anime) =>
  (a.startDate.year ?? 9999) * 10000 + (a.startDate.month ?? 12) * 100 + (a.startDate.day ?? 31)

/**
 * Series that AniList links to this story with an "Other" link (same universe, shared world...),
 * but that are their own stories. We only look ONE step out, so it doesn't wander off.
 * `storyIds` = every entry in the anime's own watch order.
 */
export async function getConnectedSeries(storyIds: number[], signal?: AbortSignal): Promise<ConnectedSeries[]> {
  const inStory = new Set(storyIds)

  // 1. Every "Other" link coming off any entry of the story.
  const own = await gql<{ Page: { media: WithLinks[] } }>(LINKS_QUERY, { ids: storyIds.slice(0, 50) }, signal)
  const targets = new Set<number>()
  for (const m of own.Page.media)
    for (const { relationType, node } of m.relations.edges)
      if (relationType === 'OTHER' && isMainEntry(node) && !inStory.has(node.id)) targets.add(node.id)
  if (targets.size === 0) return []

  // 2. Each connected anime, plus its own prequels/sequels, so we can show the whole series.
  const linked = await gql<{ Page: { media: WithLinks[] } }>(LINKS_QUERY, { ids: [...targets].slice(0, 50) }, signal)

  // Group anime that belong together (e.g. Chaos;Head and its sequel Chaos;Child) into one series.
  const groupOf = new Map<number, Set<number>>()
  const all = new Map<number, Anime>()
  const join = (a: number, b: number) => {
    const ga = groupOf.get(a) ?? new Set([a])
    const gb = groupOf.get(b) ?? new Set([b])
    const merged = ga === gb ? ga : new Set([...ga, ...gb])
    merged.forEach((id) => groupOf.set(id, merged))
  }
  for (const m of linked.Page.media) {
    const { relations, ...card } = m
    all.set(m.id, card)
    join(m.id, m.id)
    for (const { relationType, node } of relations.edges) {
      if ((relationType === 'SEQUEL' || relationType === 'PREQUEL') && node.type === 'ANIME' && !node.isAdult && !inStory.has(node.id)) {
        all.set(node.id, node)
        join(m.id, node.id)
      }
    }
  }

  // Turn each group into a series: main entries only, oldest first. Series are ordered by their first entry.
  const groups = new Set(groupOf.values())
  return [...groups]
    .map((ids) => ({
      entries: [...ids]
        .map((id) => all.get(id)!)
        .filter(isMainEntry)
        .sort((a, b) => startDateNum(a) - startDateNum(b)),
    }))
    .filter((s) => s.entries.length > 0)
    .sort((a, b) => startDateNum(a.entries[0]) - startDateNum(b.entries[0]))
}

// ---------- Seasonal chart ----------

const SEASON_CHART_QUERY = `
  query ($page: Int, $season: MediaSeason, $year: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
        ...card
        relations { edges { relationType node { type } } }
      }
    }
  }
  ${CARD_FIELDS}
`

/** An anime in the seasonal chart, marked as a sequel if it has a prequel. */
export type ChartAnime = Anime & { isSequel: boolean }

/** Every anime of a season (usually 100–200, so 2–4 requests), with sequels marked. */
export async function getSeasonChart(year: number, season: Season, signal?: AbortSignal): Promise<ChartAnime[]> {
  type Row = Anime & { relations: { edges: { relationType: string; node: { type: string } }[] } }
  const all: ChartAnime[] = []
  for (let page = 1; page <= 8; page++) {
    const data = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; media: Row[] } }>(
      SEASON_CHART_QUERY,
      { page, season, year },
      signal,
    )
    for (const { relations, ...anime } of data.Page.media) {
      const isSequel = relations.edges.some(
        (e) => (e.relationType === 'PREQUEL' || e.relationType === 'PARENT') && e.node.type === 'ANIME',
      )
      all.push({ ...anime, isSequel })
    }
    if (!data.Page.pageInfo.hasNextPage) break
  }
  return all.filter((a) => a.format !== 'MUSIC')
}

// ---------- Random with filters ----------

export interface RandomFilters {
  genre?: string
  format?: string // TV, MOVIE, ONA...
  airing?: boolean // only anime airing right now
  era?: 'new' | 'classic' // last 5 years / before 2015
}

const RANDOM_FILTERED_QUERY = `
  query ($page: Int, $genre: String, $format: MediaFormat, $status: MediaStatus, $after: FuzzyDateInt, $before: FuzzyDateInt) {
    Page(page: $page, perPage: 50) {
      media(
        type: ANIME, isAdult: false, genre: $genre, format: $format, status: $status,
        startDate_greater: $after, startDate_lesser: $before,
        popularity_greater: 1000, sort: POPULARITY_DESC
      ) { id }
    }
  }
`

export const hasRandomFilters = (f: RandomFilters) => !!(f.genre || f.format || f.airing || f.era)

/**
 * A random anime matching the filters, from the 200 most popular matches.
 * (AniList doesn't say how many anime match, so we try a random page of 4 and fall back to page 1.)
 */
export async function getRandomFilteredId(f: RandomFilters, signal?: AbortSignal): Promise<number> {
  const thisYear = new Date().getFullYear()
  const variables = {
    genre: f.genre || undefined,
    format: f.format || undefined,
    status: f.airing ? 'RELEASING' : undefined,
    after: f.era === 'new' ? (thisYear - 5) * 10000 : undefined,
    before: f.era === 'classic' ? 20150000 : undefined,
  }
  const tryPage = async (page: number) =>
    (await gql<{ Page: { media: { id: number }[] } }>(RANDOM_FILTERED_QUERY, { ...variables, page }, signal)).Page.media
  let list = await tryPage(Math.floor(Math.random() * 4) + 1)
  if (list.length === 0) list = await tryPage(1)
  if (list.length === 0) throw new ApiError(404, 'No anime match these filters')
  return list[Math.floor(Math.random() * list.length)].id
}
