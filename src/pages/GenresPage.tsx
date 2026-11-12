import { Link } from 'react-router'
import { ErrorMessage } from '../components/ErrorMessage'
import { Section } from '../components/Section'
import { useGenres, useTags } from '../hooks/useAnime'
import type { Tag } from '../types/anime'

// AniList tag categories look like "Theme-Fantasy" or "Setting-Scene".
// We show these groups and skip the rest (cast traits, technical, adult).
const TAG_GROUPS = [
  { title: 'Demographics', prefix: 'Demographic' },
  { title: 'Themes', prefix: 'Theme' },
  { title: 'Settings', prefix: 'Setting' },
]

export function GenresPage() {
  const genres = useGenres()
  const tags = useTags()

  return (
    <>
      <h1 className="mb-10 font-display text-3xl font-bold tracking-tight">Genres & tags</h1>

      <Section title="Genres">
        {genres.isError ? (
          <ErrorMessage error={genres.error} onRetry={() => genres.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {genres.isPending
              ? Array.from({ length: 10 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-line" />)
              : genres.data.map((g) => (
                  <Link
                    key={g}
                    to={`/search?genre=${encodeURIComponent(g)}`}
                    className="rounded-md border border-line bg-surface px-4 py-3 font-medium transition hover:border-accent hover:text-accent"
                  >
                    {g}
                  </Link>
                ))}
          </div>
        )}
      </Section>

      {tags.isError ? (
        <div className="mt-14">
          <ErrorMessage error={tags.error} onRetry={() => tags.refetch()} />
        </div>
      ) : (
        tags.data &&
        TAG_GROUPS.map(({ title, prefix }) => (
          <Section key={title} title={title}>
            <TagGroup tags={tags.data.filter((t) => t.category.split('-')[0] === prefix)} />
          </Section>
        ))
      )}
    </>
  )
}

/** Tags sorted into sub-groups, e.g. Themes → Fantasy, Romance, Sport... */
function TagGroup({ tags }: { tags: Tag[] }) {
  const groups = new Map<string, Tag[]>()
  for (const tag of tags) {
    // "Theme-Game-Sport" → "Game · Sport"; "Demographic" → ""
    const sub = tag.category.split('-').slice(1).join(' · ')
    groups.set(sub, [...(groups.get(sub) ?? []), tag])
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-5">
      {sorted.map(([sub, list]) => (
        <div key={sub} className="grid gap-2 sm:grid-cols-[160px_1fr]">
          {sub && <h3 className="pt-1 text-sm text-muted">{sub}</h3>}
          <div className="flex flex-wrap gap-1.5">
            {list.map((t) => (
              <Link
                key={t.name}
                to={`/search?tag=${encodeURIComponent(t.name)}`}
                className="rounded border border-line px-2 py-1 text-sm hover:border-accent hover:text-accent"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
