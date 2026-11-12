import { useState } from 'react'
import { Link } from 'react-router'
import { AnimeGrid } from '../components/AnimeGrid'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { SearchBox } from '../components/SearchBox'
import { Section } from '../components/Section'
import { useBirthdays, useSeason, useTopAnime, useTrending } from '../hooks/useAnime'
import { displayTitle, getCurrentSeason, seasonLabel } from '../lib/utils'
import type { Anime } from '../types/anime'

// Worked out once when the site loads.
const LAST_YEAR = new Date().getFullYear() - 1
const TODAY_LABEL = () => new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' })

export function HomePage() {
  const now = getCurrentSeason()
  const trending = useTrending(12)
  const season = useSeason(now.year, now.season, 1, 12)
  const popular = useTopAnime('popular', 1, 12)
  const upcoming = useTopAnime('upcoming', 1, 12)

  const sections = [
    { title: 'Trending now', query: trending, to: '/search?sort=trending' },
    { title: `${seasonLabel(now.season)} ${now.year}`, query: season, to: '/season' },
    { title: 'All-time popular', query: popular, to: '/top?filter=popular' },
    { title: 'Coming soon', query: upcoming, to: '/top?filter=upcoming' },
  ]

  return (
    <>
      {/* Phones only: on bigger screens the navbar search is always visible, so one is enough. */}
      <SearchBox large className="mb-6 sm:hidden" />
      <DiscoverLinks />
      {sections.map(({ title, query, to }, i) => (
        <div key={title}>
          <Section title={title} viewAllTo={to}>
            {query.isError ? (
              <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
            ) : (
              <AnimeGrid anime={query.data?.media} isLoading={query.isPending} />
            )}
          </Section>
          {/* Today's birthdays go right after "Trending now" */}
          {i === 0 && <Birthdays />}
        </div>
      ))}
    </>
  )
}

/** Two small doorways into the discovery pages. Plain cards, no hype. */
function DiscoverLinks() {
  const card = 'group rounded-md border border-line bg-surface px-5 py-4 transition hover:border-accent'
  return (
    <div className="mb-12 grid gap-3 sm:grid-cols-3">
      <Link to="/tonight" className={card}>
        <p className="font-display text-lg font-semibold group-hover:text-accent">What should I watch tonight? →</p>
        <p className="mt-0.5 text-sm text-muted">Answer 3 quick questions, get 3 picks.</p>
      </Link>
      <Link to={`/year/${LAST_YEAR}`} className={card}>
        <p className="font-display text-lg font-semibold group-hover:text-accent">Year in anime →</p>
        <p className="mt-0.5 text-sm text-muted">The biggest shows, genres and studios of any year since 1970.</p>
      </Link>
      <Link to="/guess" className={card}>
        <p className="font-display text-lg font-semibold group-hover:text-accent">Guess the anime →</p>
        <p className="mt-0.5 text-sm text-muted">A new blurry poster every day. Keep your streak going.</p>
      </Link>
    </div>
  )
}

/** "Birthdays today": popular characters whose birthday is today. Hidden if there are none. */
function Birthdays() {
  const { data } = useBirthdays()
  const [today] = useState(TODAY_LABEL)
  if (!data || data.length === 0) return null

  return (
    <Section title={`Birthdays today · ${today}`}>
      <ul className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2">
        {data.map((c) => (
          <li key={c.id} className="w-24 shrink-0 text-center">
            <Link to={`/character/${c.id}`} className="group block">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-line ring-2 ring-line transition group-hover:ring-accent">
                <FadeImage src={c.image.medium ?? ''} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent">{c.name.full}</p>
            </Link>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{displayTitle(c.media.nodes[0] as Anime)}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
