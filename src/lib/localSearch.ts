// Instant "as you type" matching against public/search-index.json
// (the 5,000 most popular anime, made by scripts/build-search-index.mjs).
// AniList's own search only matches whole words, so this is what lets
// "f" → Frieren, Fullmetal Alchemist… work from the very first letter.
import type { Anime, MediaFormat } from '../types/anime'

const COVER_PREFIX = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/'

// One row of the file: [id, english, romaji, cover, format, episodes, year]
type Row = [number, string, string, string, string, number, number]

export interface IndexEntry {
  anime: Anime
  names: string[] // normalized titles to match against
}

/** "Shingeki no Kyojin: The Final Season" → "shingeki no kyojin the final season" */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // remove accents: "é" → "e"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Downloads the index file once. Returns an empty list if it's missing. */
export async function loadSearchIndex(): Promise<IndexEntry[]> {
  try {
    const res = await fetch('/search-index.json')
    const rows: Row[] = await res.json()
    return rows.map(([id, english, romaji, cover, format, episodes, year]) => ({
      names: [normalize(english), normalize(romaji)].filter(Boolean),
      anime: {
        id,
        title: { english: english || null, romaji: romaji || null, native: null },
        coverImage: {
          large: cover ? (cover.startsWith('http') ? cover : COVER_PREFIX + cover) : null,
          extraLarge: null,
          color: null,
        },
        format: (format || null) as MediaFormat | null,
        episodes: episodes || null,
        seasonYear: year || null,
        startDate: { year: year || null, month: null, day: null },
        status: null,
        season: null,
        averageScore: null,
        popularity: null,
        genres: [],
      },
    }))
  } catch {
    return [] // no index yet → the search box falls back to AniList's live search only
  }
}

/**
 * Best matches first:
 *   0 = a title starts with what you typed   ("fri"  → "Frieren")
 *   1 = a word in a title starts with it     ("fin"  → "… The Final Season")
 *   2 = it appears anywhere inside a title    ("ieren" → "Frieren"; 3+ letters only)
 * Ties keep the file's order, which is most popular first.
 */
export function searchLocal(index: IndexEntry[], query: string, limit = 6): Anime[] {
  const q = normalize(query)
  if (!q) return []

  const hits: { rank: number; order: number; anime: Anime }[] = []
  index.forEach((entry, order) => {
    let rank = 3
    for (const name of entry.names) {
      if (name.startsWith(q)) rank = 0
      else if (rank > 1 && ` ${name}`.includes(` ${q}`)) rank = 1
      else if (rank > 2 && q.length >= 3 && name.includes(q)) rank = 2
      if (rank === 0) break
    }
    if (rank < 3) hits.push({ rank, order, anime: entry.anime })
  })

  hits.sort((a, b) => a.rank - b.rank || a.order - b.order)
  return hits.slice(0, limit).map((h) => h.anime)
}
