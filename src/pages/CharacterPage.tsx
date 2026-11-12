import { Link, useParams, useSearchParams } from 'react-router'
import type { PeopleSort } from '../api/anilist'
import { AnimeCardSkeleton } from '../components/AnimeCard'
import { AnimeLink } from '../components/AnimeLink'
import { Bio } from '../components/Bio'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { LoadMore } from '../components/LoadMore'
import { SortTabs } from '../components/SortTabs'
import { useCharacter } from '../hooks/useAnime'
import { compactNumber, displayTitle, enumLabel, posterUrl, yearOf } from '../lib/utils'
import type { Character, CharacterAppearance, FuzzyDate } from '../types/anime'

/** /character/:id: a character's profile and every anime they appear in. */
export function CharacterPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const sort: PeopleSort = params.get('sort') === 'newest' ? 'newest' : 'popularity'
  const character = useCharacter(id, sort)

  if (!Number.isFinite(id)) return <ErrorMessage error={new Error('Invalid id')} />
  if (character.isError) return <ErrorMessage error={character.error} onRetry={() => character.refetch()} />

  const info = character.data?.pages[0]
  const seen = new Set<number>()
  const appearances = (character.data?.pages ?? [])
    .flatMap((p) => p.media.edges)
    .filter((a) => !a.node.isAdult && !seen.has(a.node.id) && seen.add(a.node.id))

  return (
    <>
      {info ? <Profile character={info} /> : <ProfileSkeleton />}

      <h2 className="mt-12 font-display text-xl font-semibold">Appears in</h2>
      <SortTabs value={sort} onChange={(s) => setParams(s === 'popularity' ? {} : { sort: s })} />

      <div
        className={`mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
          character.isPlaceholderData ? 'opacity-60' : ''
        }`}
      >
        {character.isPending
          ? Array.from({ length: 6 }, (_, i) => <AnimeCardSkeleton key={i} />)
          : appearances.map((a) => <AppearanceCard key={a.node.id} appearance={a} />)}
      </div>
      {!character.isPending && appearances.length === 0 && <p className="py-12 text-center text-muted">No anime found.</p>}
      {appearances.length > 0 && !character.isPlaceholderData && (
        <LoadMore
          hasNextPage={character.hasNextPage}
          isFetchingNextPage={character.isFetchingNextPage}
          fetchNextPage={character.fetchNextPage}
        />
      )}
    </>
  )
}

/** Characters' birthdays usually have no year: { month: 12, day: 25 } → "December 25". */
function birthday(d: FuzzyDate) {
  if (!d.month || !d.day) return null
  const date = new Date(2000, d.month - 1, d.day).toLocaleDateString('en', { month: 'long', day: 'numeric' })
  return d.year ? `${date}, ${d.year}` : date
}

function Profile({ character }: { character: Character }) {
  const facts: [string, string | null][] = [
    ['Gender', character.gender],
    ['Age', character.age],
    ['Birthday', birthday(character.dateOfBirth)],
    ['Blood type', character.bloodType],
    ['Favorites', compactNumber(character.favourites)],
  ]
  const otherNames = character.name.alternative.filter(Boolean)

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <FadeImage
        src={character.image.large ?? ''}
        alt={character.name.full}
        loading="eager"
        className="w-40 shrink-0 self-center rounded-md bg-line object-cover shadow-lg sm:w-52 sm:self-start"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">Character</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{character.name.full}</h1>
        {character.name.native && <p className="mt-1 text-muted">{character.name.native}</p>}
        {otherNames.length > 0 && <p className="mt-1 text-sm text-muted">Also known as {otherNames.join(', ')}</p>}

        <dl className="mt-5 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
        </dl>

        <Bio text={character.description} />

        <a
          href={character.siteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-muted hover:text-accent"
        >
          View on AniList ↗
        </a>
      </div>
    </div>
  )
}

/** An anime the character is in, with the voice actor who played them there. */
function AppearanceCard({ appearance }: { appearance: CharacterAppearance }) {
  const { node: anime, voiceActors, characterRole } = appearance
  const va = voiceActors[0]
  return (
    <div>
      <AnimeLink animeId={anime.id} className="group block">
        <div
          className="aspect-[2/3] overflow-hidden rounded-md bg-line ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md"
          style={{ backgroundColor: anime.coverImage.color ?? undefined }}
        >
          <FadeImage src={posterUrl(anime)} alt={displayTitle(anime)} className="h-full w-full object-cover" />
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent">{displayTitle(anime)}</h3>
      </AnimeLink>
      <p className="mt-0.5 text-xs text-muted">
        {[enumLabel(characterRole), yearOf(anime)].filter(Boolean).join(' · ')}
      </p>
      {va && (
        <p className="mt-0.5 truncate text-xs text-muted">
          Voiced by{' '}
          <Link to={`/person/${va.id}`} className="text-ink hover:text-accent">
            {va.name.full}
          </Link>
        </p>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8 sm:flex-row">
      <div className="aspect-[2/3] w-40 self-center rounded-md bg-line sm:w-52 sm:self-start" />
      <div className="flex-1 space-y-3 pt-4">
        <div className="h-8 w-1/2 rounded bg-line" />
        <div className="h-4 w-1/4 rounded bg-line" />
        <div className="mt-6 h-24 max-w-lg rounded bg-line" />
      </div>
    </div>
  )
}
