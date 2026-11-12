// Opening and ending songs come from AnimeThemes (https://api-docs.animethemes.moe),
// a free, fan-run database. AniList doesn't have this information.
// If AnimeThemes is down or blocked, the anime page shows YouTube/Spotify search links instead.

export interface ThemeSong {
  id: number
  type: 'OP' | 'ED' // opening or ending
  sequence: number | null // the 1 in OP1
  slug: string // e.g. "OP1"
  song: { title: string | null; artists?: { name: string }[] } | null
  animethemeentries: {
    episodes: string | null // e.g. "1-12"
    spoiler: boolean
    nsfw: boolean
    videos?: { link: string; resolution: number | null }[]
  }[]
}

const API = 'https://api.animethemes.moe/anime'

/** All openings and endings for an anime, found by its AniList id. Empty if AnimeThemes doesn't have it. */
export async function getThemes(anilistId: number, signal?: AbortSignal): Promise<ThemeSong[]> {
  const params = new URLSearchParams({
    'filter[has]': 'resources',
    'filter[site]': 'AniList',
    'filter[external_id]': String(anilistId),
    include: 'animethemes.song.artists,animethemes.animethemeentries.videos',
  })
  const res = await fetch(`${API}?${params}`, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`AnimeThemes request failed (${res.status})`)
  const json = await res.json()
  const themes: ThemeSong[] = json?.anime?.[0]?.animethemes ?? []
  // Openings first, then endings, each in order: OP1, OP2, ..., ED1, ED2, ...
  return [...themes].sort((a, b) =>
    a.type === b.type ? (a.sequence ?? 1) - (b.sequence ?? 1) : a.type === 'OP' ? -1 : 1,
  )
}
