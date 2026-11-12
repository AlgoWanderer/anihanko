// TypeScript types for the anime data our app works with.
// AniList sends data in its own shape; api/anilist.ts asks only for the fields listed here.
// Docs: https://docs.anilist.co

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'
export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC'
export type MediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
export type TopFilter = 'airing' | 'upcoming' | 'popular' | 'favorites'

/** AniList dates can be partial, e.g. only a year is known. */
export interface FuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

/** The fields shown on cards and lists. */
export interface Anime {
  id: number
  title: { romaji: string | null; english: string | null; native: string | null }
  coverImage: { extraLarge: string | null; large: string | null; color: string | null }
  format: MediaFormat | null
  episodes: number | null
  status: MediaStatus | null
  season: Season | null
  seasonYear: number | null
  startDate: FuzzyDate
  averageScore: number | null // 0–100
  popularity: number | null // how many users have it on their list
  genres: string[]
  type?: 'ANIME' | 'MANGA' // only filled in where we ask for it (related entries)
  duration?: number | null // minutes per episode
  isAdult?: boolean
}

export interface CharacterEdge {
  role: 'MAIN' | 'SUPPORTING' | 'BACKGROUND'
  node: { id: number; name: { full: string }; image: { medium: string | null } }
  voiceActors: { id: number; name: { full: string }; image: { medium: string | null } }[]
}

/** Everything the detail page needs, in one request. */
export interface AnimeDetail extends Anime {
  idMal: number | null
  siteUrl: string
  bannerImage: string | null
  description: string | null
  endDate: FuzzyDate
  duration: number | null // minutes per episode
  source: string | null
  favourites: number | null
  trailer: { id: string; site: string } | null
  studios: { nodes: { id: number; name: string }[] }
  tags: { id: number; name: string; rank: number; isMediaSpoiler: boolean }[]
  rankings: { rank: number; type: 'RATED' | 'POPULAR'; allTime: boolean }[]
  nextAiringEpisode: { episode: number; airingAt: number } | null
  characters: { edges: CharacterEdge[] }
  // Related anime, plus THEIR related anime (one step further), to find e.g. a sequel of an alternate episode
  relations: { edges: { relationType: string; node: Anime & { relations?: { edges: { relationType: string; node: Anime }[] } } }[] }
  recommendations: { nodes: { mediaRecommendation: Anime | null }[] }
}

/** One episode in the airing schedule. */
export interface AiringEntry {
  id: number
  airingAt: number // unix time in seconds
  episode: number
  media: Anime & { countryOfOrigin: string | null }
}

export interface Studio {
  id: number
  name: string
  isAnimationStudio: boolean
  favourites: number | null
  siteUrl: string
  media: { pageInfo: PageInfo; nodes: Anime[] }
}

/** One anime a voice actor was in, with the character(s) they voiced. */
export interface VoiceRole {
  characterRole: 'MAIN' | 'SUPPORTING' | 'BACKGROUND' | null
  node: Anime
  characters: { id: number; name: { full: string }; image: { medium: string | null } }[]
}

export interface Staff {
  id: number
  name: { full: string; native: string | null }
  image: { large: string | null }
  description: string | null
  primaryOccupations: string[]
  dateOfBirth: FuzzyDate
  age: number | null
  homeTown: string | null
  yearsActive: number[]
  languageV2: string | null
  favourites: number | null
  siteUrl: string
  characterMedia: { pageInfo: PageInfo; edges: VoiceRole[] }
}

export interface PageInfo {
  currentPage: number
  lastPage: number
  hasNextPage: boolean
}

export interface AnimePage {
  pageInfo: PageInfo
  media: Anime[]
}

export interface Tag {
  name: string
  category: string
  isAdult: boolean
}

export interface SearchParams {
  q?: string
  genre?: string
  tag?: string
  format?: string
  status?: string
  year?: string
  sort?: string
  page?: number
}

/** One anime a character appears in, with who voiced them there. */
export interface CharacterAppearance {
  characterRole: 'MAIN' | 'SUPPORTING' | 'BACKGROUND' | null
  node: Anime
  voiceActors: { id: number; name: { full: string }; image: { medium: string | null } }[]
}

export interface Character {
  id: number
  name: { full: string; native: string | null; alternative: string[] }
  image: { large: string | null }
  description: string | null
  gender: string | null
  age: string | null
  dateOfBirth: FuzzyDate
  bloodType: string | null
  favourites: number | null
  siteUrl: string
  media: { pageInfo: PageInfo; edges: CharacterAppearance[] }
}

export interface BirthdayCharacter {
  id: number
  name: { full: string }
  image: { medium: string | null }
  media: { nodes: { id: number; title: Anime['title']; isAdult: boolean }[] }
}

/** An anime with the studio(s) that made it (used by the Year in anime page). */
export interface AnimeWithStudios extends Anime {
  studios: { nodes: { id: number; name: string }[] }
}
