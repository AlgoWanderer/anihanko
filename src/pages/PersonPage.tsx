import { Link, useParams, useSearchParams } from 'react-router'
import type { PeopleSort } from '../api/anilist'
import { AnimeCardSkeleton } from '../components/AnimeCard'
import { AnimeLink } from '../components/AnimeLink'
import { Bio } from '../components/Bio'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { LoadMore } from '../components/LoadMore'
import { SortTabs } from '../components/SortTabs'
import { useStaff } from '../hooks/useAnime'
import { compactNumber, displayTitle, enumLabel, formatDate, posterUrl, yearOf } from '../lib/utils'
import type { Staff, VoiceRole } from '../types/anime'

/** /person/:id: a voice actor's profile and every anime role they've voiced. */
export function PersonPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const sort: PeopleSort = params.get('sort') === 'newest' ? 'newest' : 'popularity'
  const staff = useStaff(id, sort)

  if (!Number.isFinite(id)) return <ErrorMessage error={new Error('Invalid id')} />
  if (staff.isError) return <ErrorMessage error={staff.error} onRetry={() => staff.refetch()} />

  const person = staff.data?.pages[0]
  const seen = new Set<number>()
  const roles = (staff.data?.pages ?? [])
    .flatMap((p) => p.characterMedia.edges)
    .filter((r) => r.node.type === 'ANIME' && !r.node.isAdult && !seen.has(r.node.id) && seen.add(r.node.id))

  return (
    <>
      {person ? <Profile person={person} /> : <ProfileSkeleton />}

      <h2 className="mt-12 font-display text-xl font-semibold">Voice roles</h2>
      <SortTabs value={sort} onChange={(s) => setParams(s === 'popularity' ? {} : { sort: s })} />

      <div
        className={`mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
          staff.isPlaceholderData ? 'opacity-60' : ''
        }`}
      >
        {staff.isPending
          ? Array.from({ length: 12 }, (_, i) => <AnimeCardSkeleton key={i} />)
          : roles.map((r) => <RoleCard key={r.node.id} role={r} />)}
      </div>
      {!staff.isPending && roles.length === 0 && <p className="py-12 text-center text-muted">No anime voice roles.</p>}
      {roles.length > 0 && !staff.isPlaceholderData && (
        <LoadMore
          hasNextPage={staff.hasNextPage}
          isFetchingNextPage={staff.isFetchingNextPage}
          fetchNextPage={staff.fetchNextPage}
          endText="That's every role."
        />
      )}
    </>
  )
}

function Profile({ person }: { person: Staff }) {
  const years = person.yearsActive
  const facts: [string, string | null][] = [
    ['Occupation', person.primaryOccupations.join(', ') || null],
    ['Born', formatDate(person.dateOfBirth)],
    ['Age', person.age ? String(person.age) : null],
    ['Hometown', person.homeTown],
    ['Active', years.length ? `${years[0]}${years[1] ? `–${years[1]}` : ' – now'}` : null],
    ['Language', person.languageV2],
    ['Favorites', compactNumber(person.favourites)],
  ]

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <FadeImage
        src={person.image.large ?? ''}
        alt={person.name.full}
        loading="eager"
        className="w-40 shrink-0 self-center rounded-md bg-line object-cover shadow-lg sm:w-52 sm:self-start"
      />
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{person.name.full}</h1>
        {person.name.native && <p className="mt-1 text-muted">{person.name.native}</p>}

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

        <Bio text={person.description} />

        <a href={person.siteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-muted hover:text-accent">
          View on AniList ↗
        </a>
      </div>
    </div>
  )
}

/** An anime poster with the character they voiced in the corner. */
function RoleCard({ role }: { role: VoiceRole }) {
  const { node: anime, characters } = role
  const character = characters[0]
  return (
    <div>
      <AnimeLink animeId={anime.id} className="group block">
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-md bg-line ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md"
          style={{ backgroundColor: anime.coverImage.color ?? undefined }}
        >
          <FadeImage src={posterUrl(anime)} alt={displayTitle(anime)} className="h-full w-full object-cover" />
          {character?.image.medium && (
            <FadeImage
              src={character.image.medium}
              alt=""
              className="absolute right-1.5 bottom-1.5 h-14 w-11 rounded object-cover ring-2 ring-paper"
            />
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent">{displayTitle(anime)}</h3>
      </AnimeLink>
      {character && (
        <p className="mt-0.5 truncate text-xs text-muted">
          as{' '}
          {characters.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <Link to={`/character/${c.id}`} className="text-ink hover:text-accent">
                {c.name.full}
              </Link>
            </span>
          ))}
          {role.characterRole ? ` · ${enumLabel(role.characterRole)}` : ''}
          {yearOf(anime) ? ` · ${yearOf(anime)}` : ''}
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
