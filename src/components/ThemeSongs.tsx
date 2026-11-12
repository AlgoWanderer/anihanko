import { useState } from 'react'
import type { ThemeSong } from '../api/animethemes'
import { useThemes } from '../hooks/useAnime'
import { displayTitle } from '../lib/utils'
import type { AnimeDetail } from '../types/anime'

const searchLinks = (query: string) => ({
  youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  spotify: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
})

const linkClass =
  'rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-accent hover:text-accent'

/**
 * Opening and ending songs (from AnimeThemes), each with a play button for the video.
 * If AnimeThemes can't be reached or doesn't know this anime, show search links instead.
 */
export function ThemeSongs({ anime }: { anime: AnimeDetail }) {
  const themes = useThemes(anime.id)
  const title = anime.title.romaji || displayTitle(anime)

  if (themes.isPending) {
    return (
      <Shell>
        <p className="text-sm text-muted">Loading songs…</p>
      </Shell>
    )
  }

  if (themes.isError || !themes.data || themes.data.length === 0) {
    const op = searchLinks(`${title} opening`)
    return (
      <Shell>
        <p className="mb-3 text-sm text-muted">
          {themes.isError ? "The song list isn't available right now." : 'No song list for this one yet.'} Find the
          opening and ending here:
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={op.youtube} target="_blank" rel="noreferrer" className={linkClass}>
            Find on YouTube ↗
          </a>
          <a href={op.spotify} target="_blank" rel="noreferrer" className={linkClass}>
            Find on Spotify ↗
          </a>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <ul className="divide-y divide-line">
        {themes.data.map((theme) => (
          <SongRow key={theme.id} theme={theme} animeTitle={title} />
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Song data and videos from{' '}
        <a href="https://animethemes.moe" target="_blank" rel="noreferrer" className="hover:text-accent">
          AnimeThemes
        </a>
        .
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold">Opening & ending songs</h2>
      {children}
    </section>
  )
}

function SongRow({ theme, animeTitle }: { theme: ThemeSong; animeTitle: string }) {
  const [playing, setPlaying] = useState(false)
  const entry = theme.animethemeentries[0]
  // Pick the sharpest video, but skip ones marked NSFW.
  const video = theme.animethemeentries
    .filter((e) => !e.nsfw)
    .flatMap((e) => e.videos ?? [])
    .sort((a, b) => (b.resolution ?? 0) - (a.resolution ?? 0))[0]
  const songTitle = theme.song?.title ?? 'Untitled'
  const artists = theme.song?.artists?.map((a) => a.name).join(', ')
  const links = searchLinks(`${songTitle} ${artists ?? animeTitle}`)

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-12 shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-center text-xs font-semibold text-accent">
          {theme.slug}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">“{songTitle}”</p>
          <p className="truncate text-xs text-muted">
            {[artists, entry?.episodes ? `episodes ${entry.episodes}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {video && (
            <button onClick={() => setPlaying((p) => !p)} className="font-medium text-accent hover:underline">
              {playing ? 'Close' : '▶ Play'}
            </button>
          )}
          <a href={links.youtube} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
            YouTube
          </a>
          <a href={links.spotify} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
            Spotify
          </a>
        </div>
      </div>
      {playing && video && (
        <video src={video.link} controls autoPlay className="mt-3 aspect-video w-full rounded-md bg-black" />
      )}
    </li>
  )
}
