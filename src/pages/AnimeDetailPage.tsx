import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnimeGrid } from '../components/AnimeGrid'
import { AnimeLink } from '../components/AnimeLink'
import { ConnectedSeries } from '../components/ConnectedSeries'
import { ErrorMessage } from '../components/ErrorMessage'
import { FadeImage } from '../components/FadeImage'
import { HankoStamp } from '../components/HankoStamp'
import { StampButton } from '../components/StampButton'
import { ThemeSongs } from '../components/ThemeSongs'
import { WatchOrder } from '../components/WatchOrder'
import { WatchTime } from '../components/WatchTime'
import { isStoryLink } from '../api/anilist'
import { useAnime } from '../hooks/useAnime'
import { useStamp } from '../lib/stamps'
import {
  airedRange,
  compactNumber,
  displayTitle,
  enumLabel,
  formatLabel,
  metaLine,
  plainText,
  posterUrl,
  scoreLabel,
  seasonLabel,
  STATUS_LABELS,
  timeUntil,
  trailerEmbedUrl,
  uniqueById,
} from '../lib/utils'
import type { Anime, AnimeDetail, CharacterEdge } from '../types/anime'

export function AnimeDetailPage() {
  const id = Number(useParams().id)
  const { data: anime, isPending, isError, error, refetch } = useAnime(id)
  const stamp = useStamp(id)
  // Which anime was stamped just now (plays the stamp animation once, only for that anime).
  const [justStampedId, setJustStampedId] = useState<number | null>(null)

  if (!Number.isFinite(id)) return <ErrorMessage error={new Error('Invalid id')} />
  if (isError) return <ErrorMessage error={error} onRetry={() => refetch()} />
  if (isPending) return <DetailSkeleton />

  const trailer = trailerEmbedUrl(anime)
  const rank = anime.rankings.find((r) => r.type === 'RATED' && r.allTime)?.rank
  const popRank = anime.rankings.find((r) => r.type === 'POPULAR' && r.allTime)?.rank
  const altTitles = [anime.title.romaji, anime.title.native].filter((t) => t && t !== displayTitle(anime))

  return (
    <article>
      {/* Banner image (when AniList has one). The poster overlaps its bottom edge. */}
      {anime.bannerImage && (
        <div className="-mx-4 -mt-8 h-40 overflow-hidden sm:h-64">
          <img src={anime.bannerImage} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        {/* The poster. Stamped anime get the red 済 stamp in the corner. */}
        <div
          className={`relative w-40 shrink-0 self-center sm:w-52 sm:self-start ${
            anime.bannerImage ? '-mt-16 sm:-mt-24' : ''
          } ${justStampedId === anime.id ? 'hanko-thud' : ''}`}
        >
          <FadeImage
            src={posterUrl(anime)}
            alt={displayTitle(anime)}
            loading="eager"
            className="w-full rounded-md shadow-lg ring-4 ring-paper"
            style={{ backgroundColor: anime.coverImage.color ?? undefined }}
          />
          {stamp && (
            <HankoStamp status={stamp.status} animate={justStampedId === anime.id} className="absolute -right-4 -bottom-4 h-24 w-24 drop-shadow" />
          )}
        </div>

        <div className="min-w-0 pt-2 sm:pt-4">
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {displayTitle(anime)}
          </h1>
          {altTitles.map((t) => (
            <p key={t} className="mt-1 text-muted">
              {t}
            </p>
          ))}

          {/* Key stats in a plain row, separated by thin lines. */}
          <dl className="mt-6 flex flex-wrap divide-x divide-line rounded-md border border-line bg-surface">
            <Stat label="Score" value={scoreLabel(anime.averageScore) ?? '—'} accent />
            {stamp?.score && <Stat label="Your score" value={`${stamp.score}.0`} />}
            <Stat label="Ranked" value={rank ? `#${rank}` : '—'} />
            <Stat label="Popularity" value={popRank ? `#${popRank}` : '—'} />
            <Stat label="Users" value={compactNumber(anime.popularity)} />
            <Stat label="Favorites" value={compactNumber(anime.favourites)} />
          </dl>

          {anime.nextAiringEpisode && (
            <p className="mt-4 text-sm">
              <span className="font-medium text-accent">Episode {anime.nextAiringEpisode.episode}</span>{' '}
              <span className="text-muted">airs {timeUntil(anime.nextAiringEpisode.airingAt)}</span>
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {anime.genres.map((g) => (
              <Link
                key={g}
                to={`/search?genre=${encodeURIComponent(g)}`}
                className="rounded-md border border-line px-2.5 py-1 text-sm hover:border-accent hover:text-accent"
              >
                {g}
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <StampButton anime={anime} onStamp={() => setJustStampedId(anime.id)} />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-12">
          <section>
            <SectionTitle>Synopsis</SectionTitle>
            <p className="max-w-prose leading-relaxed whitespace-pre-line text-ink/85">
              {plainText(anime.description) || 'No synopsis available yet.'}
            </p>
          </section>

          {trailer && (
            <section>
              <SectionTitle>Trailer</SectionTitle>
              <div className="aspect-video overflow-hidden rounded-md bg-black">
                <iframe
                  src={trailer}
                  title={`${displayTitle(anime)} trailer`}
                  className="h-full w-full"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          <WatchOrder anime={anime} />
          <ConnectedSeries anime={anime} />
          <Characters edges={anime.characters.edges} />
          <ThemeSongs anime={anime} />
        </div>

        <InfoSidebar anime={anime} />
      </div>

      <Related edges={anime.relations.edges} selfId={anime.id} />
      <Recommendations nodes={anime.recommendations.nodes} />
    </article>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold">{children}</h2>
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</dd>
    </div>
  )
}

function InfoSidebar({ anime }: { anime: AnimeDetail }) {
  const rows: [string, string | null][] = [
    ['Format', formatLabel(anime.format)],
    ['Episodes', anime.episodes ? String(anime.episodes) : 'Unknown'],
    ['Episode length', anime.duration ? `${anime.duration} min` : null],
    ['Status', anime.status ? STATUS_LABELS[anime.status] : null],
    ['Aired', airedRange(anime)],
    ['Season', anime.season && anime.seasonYear ? `${seasonLabel(anime.season)} ${anime.seasonYear}` : null],
    ['Source', enumLabel(anime.source)],
  ]
  const studios = anime.studios.nodes

  return (
    <aside className="h-fit space-y-8">
      <div>
        <SectionTitle>Details</SectionTitle>
        <dl className="space-y-3 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          {studios.length > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Studio</dt>
              <dd className="text-right font-medium">
                {studios.map((st, i) => (
                  <span key={st.id}>
                    {i > 0 && ', '}
                    <Link to={`/studio/${st.id}`} className="hover:text-accent">
                      {st.name}
                    </Link>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <WatchTime anime={anime} />

      <Tags tags={anime.tags} />

      <div className="flex flex-col gap-2 text-sm">
        <a href={anime.siteUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
          View on AniList ↗
        </a>
        {anime.idMal && (
          <a
            href={`https://myanimelist.net/anime/${anime.idMal}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-accent"
          >
            View on MyAnimeList ↗
          </a>
        )}
      </div>
    </aside>
  )
}

/** Tags like "Isekai" or "Time Skip". Spoiler tags stay hidden until you click. */
function Tags({ tags }: { tags: AnimeDetail['tags'] }) {
  const [showSpoilers, setShowSpoilers] = useState(false)
  const visible = tags.filter((t) => showSpoilers || !t.isMediaSpoiler).slice(0, 15)
  const spoilerCount = tags.filter((t) => t.isMediaSpoiler).length
  if (tags.length === 0) return null

  return (
    <div>
      <SectionTitle>Tags</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((t) => (
          <Link
            key={t.id}
            to={`/search?tag=${encodeURIComponent(t.name)}`}
            className={`rounded px-2 py-0.5 text-xs hover:text-accent ${
              t.isMediaSpoiler ? 'bg-accent-soft text-accent' : 'bg-line/60'
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>
      {spoilerCount > 0 && (
        <button onClick={() => setShowSpoilers((s) => !s)} className="mt-2 text-xs text-muted hover:text-accent">
          {showSpoilers ? 'Hide spoiler tags' : `Show ${spoilerCount} spoiler tag${spoilerCount > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

function Characters({ edges }: { edges: CharacterEdge[] }) {
  if (edges.length === 0) return null
  return (
    <section>
      <SectionTitle>Characters</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {edges.map((c) => (
          <CharacterCard key={c.node.id} entry={c} />
        ))}
      </div>
    </section>
  )
}

function CharacterCard({ entry }: { entry: CharacterEdge }) {
  const va = entry.voiceActors[0]
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-md border border-line bg-surface">
      <Link to={`/character/${entry.node.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
        <FadeImage src={entry.node.image.medium ?? ''} alt="" className="h-20 w-14 bg-line object-cover" />
        <div className="min-w-0 flex-1 py-2">
          <p className="truncate text-sm font-medium group-hover:text-accent">{entry.node.name.full}</p>
          <p className="text-xs text-muted">{enumLabel(entry.role)}</p>
        </div>
      </Link>
      {va && (
        <Link to={`/person/${va.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1 py-2 text-right">
            <p className="truncate text-sm group-hover:text-accent">{va.name.full}</p>
            <p className="text-xs text-muted">Japanese</p>
          </div>
          <FadeImage src={va.image.medium ?? ''} alt="" className="h-20 w-14 bg-line object-cover" />
        </Link>
      )}
    </div>
  )
}

// Order related entries so the most useful ones (prequel, sequel...) come first.
const RELATION_ORDER = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'SUMMARY', 'COMPILATION', 'CONTAINS', 'OTHER', 'CHARACTER']
const relationRank = (type: string) => {
  const i = RELATION_ORDER.indexOf(type)
  return i === -1 ? RELATION_ORDER.length : i
}

/** Prequels, sequels, side stories... (anime only; manga adaptations are skipped). */
// Links that mean "connected, but a separate story": shown in their own group, not mixed with sequels.
const CONNECTED_LINKS: Record<string, string> = { OTHER: 'Connected', CHARACTER: 'Shares characters' }

type RelatedItem = { id: number; label: string; node: Anime }

function Related({ edges, selfId }: { edges: AnimeDetail['relations']['edges']; selfId: number }) {
  const visible = edges
    .filter((e) => e.node.type === 'ANIME' && !e.node.isAdult)
    .sort((a, b) => relationRank(a.relationType) - relationRank(b.relationType))
  const story: RelatedItem[] = visible
    .filter((e) => !(e.relationType in CONNECTED_LINKS))
    .map((e) => ({ id: e.node.id, label: enumLabel(e.relationType) ?? '', node: e.node }))
  const connected: RelatedItem[] = visible
    .filter((e) => e.relationType in CONNECTED_LINKS)
    .map((e) => ({ id: e.node.id, label: CONNECTED_LINKS[e.relationType], node: e.node }))

  // One step further: sequels of related entries that are part of the same story.
  // Example: Steins;Gate → (alternative) episode 23β OVA → (sequel) Steins;Gate 0.
  const seen = new Set([selfId, ...visible.map((e) => e.node.id)])
  for (const e of edges) {
    if (!isStoryLink(e.relationType, e.node)) continue
    for (const f of e.node.relations?.edges ?? []) {
      if (f.relationType === 'SEQUEL' && isStoryLink(f.relationType, f.node) && !seen.has(f.node.id)) {
        seen.add(f.node.id)
        story.push({ id: f.node.id, label: `Sequel (via ${displayTitle(e.node)})`, node: f.node })
      }
    }
  }

  if (story.length === 0 && connected.length === 0) return null

  return (
    <section className="mt-12">
      <SectionTitle>Related anime</SectionTitle>
      {story.length > 0 && <RelatedGrid items={story} />}
      {connected.length > 0 && (
        <>
          <h3 className={`mb-1 font-medium ${story.length > 0 ? 'mt-8' : ''}`}>Connected</h3>
          <p className="mb-3 text-sm text-muted">Linked on AniList, but separate stories.</p>
          <RelatedGrid items={connected} />
        </>
      )}
    </section>
  )
}

function RelatedGrid({ items }: { items: RelatedItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ id, label, node }) => (
        <AnimeLink
          key={id}
          animeId={id}
          className="group flex items-center gap-3 overflow-hidden rounded-md border border-line bg-surface hover:border-accent"
        >
          <div className="h-24 w-16 shrink-0" style={{ backgroundColor: node.coverImage.color ?? 'var(--line)' }}>
            <FadeImage src={node.coverImage.large ?? node.coverImage.extraLarge ?? ''} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 py-2 pr-3">
            <p className="line-clamp-1 text-xs font-semibold tracking-wide text-accent uppercase">{label}</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-medium group-hover:text-accent">{displayTitle(node)}</p>
            <p className="mt-0.5 text-xs text-muted">{metaLine(node)}</p>
          </div>
        </AnimeLink>
      ))}
    </div>
  )
}

/** "If you liked this…": what AniList users recommend alongside this anime. */
function Recommendations({ nodes }: { nodes: AnimeDetail['recommendations']['nodes'] }) {
  const anime = uniqueById(nodes.map((n) => n.mediaRecommendation).filter((a): a is Anime => !!a && !a.isAdult))
  if (anime.length === 0) return null

  return (
    <section className="mt-12">
      <SectionTitle>If you liked this…</SectionTitle>
      <AnimeGrid anime={anime} />
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="aspect-[2/3] w-40 self-center rounded-md bg-line sm:w-52 sm:self-start" />
        <div className="flex-1 space-y-3 pt-4">
          <div className="h-8 w-2/3 rounded bg-line" />
          <div className="h-4 w-1/3 rounded bg-line" />
          <div className="mt-6 h-16 max-w-lg rounded bg-line" />
        </div>
      </div>
      <div className="mt-12 space-y-3">
        <div className="h-4 rounded bg-line" />
        <div className="h-4 rounded bg-line" />
        <div className="h-4 w-2/3 rounded bg-line" />
      </div>
    </div>
  )
}
