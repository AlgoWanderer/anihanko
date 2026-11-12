// Downloads the 5,000 most popular anime from AniList into public/search-index.json.
// The search bar uses this file to suggest anime from the very first letter you type
// (AniList's own search only matches whole words).
//
// Run it with:  npm run search-index     (takes about 4 minutes; AniList allows 30 requests/minute)
// Re-run it every month or so to pick up new shows.
import { writeFile } from 'node:fs/promises'

const API_URL = 'https://graphql.anilist.co'
const PAGES = 100 // 100 pages × 50 = 5,000 anime (AniList won't page deeper than that)
const GAP_MS = 2100 // just over 2 seconds between requests keeps us under 30/minute
const COVER_PREFIX = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/'

const QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { medium } format episodes seasonYear startDate { year }
      }
    }
  }
`

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { page } }),
    })
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After')) || 30
      console.log(`  rate limited, waiting ${retryAfter}s…`)
      await wait(retryAfter * 1000)
      continue
    }
    const json = await res.json()
    if (!res.ok || json.errors) throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`)
    return json.data.Page
  }
  throw new Error(`Page ${page} kept failing`)
}

const rows = []
for (let page = 1; page <= PAGES; page++) {
  const { media, pageInfo } = await fetchPage(page)
  for (const m of media) {
    const cover = m.coverImage.medium ?? ''
    // Each row is a small array instead of an object, to keep the file small:
    // [id, english title, romaji title, cover, format, episodes, year]
    rows.push([
      m.id,
      m.title.english ?? '',
      m.title.romaji ?? '',
      cover.startsWith(COVER_PREFIX) ? cover.slice(COVER_PREFIX.length) : cover,
      m.format ?? '',
      m.episodes ?? 0,
      m.seasonYear ?? m.startDate.year ?? 0,
    ])
  }
  if (page % 10 === 0) console.log(`${rows.length} anime downloaded…`)
  if (!pageInfo.hasNextPage) break
  await wait(GAP_MS)
}

await writeFile(new URL('../public/search-index.json', import.meta.url), JSON.stringify(rows))
console.log(`Done: saved ${rows.length} anime to public/search-index.json`)
