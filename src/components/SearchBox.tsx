import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useDebounced } from '../hooks/useDebounced'
import { useSearchIndex, useSuggestions } from '../hooks/useAnime'
import { searchLocal } from '../lib/localSearch'
import type { Anime } from '../types/anime'
import { displayTitle, metaLine } from '../lib/utils'

/**
 * The navbar search bar. As you type, a dropdown shows matching anime, starting from the first letter.
 * - Instant matches come from the local list of the 5,000 most popular anime.
 * - If that finds fewer than 6, we also ask AniList (whole words only) to fill the gaps.
 * - Click a suggestion (or pick one with ↑ ↓ and Enter) to open that anime.
 * - Press Enter without picking one to see the full search results page.
 */
export function SearchBox({
  className = '',
  onNavigate,
  large = false,
}: {
  className?: string
  onNavigate?: () => void
  /** Bigger text box (used on the home page on phones) */
  large?: boolean
}) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1) // which suggestion is highlighted (-1 = none)
  const [focusedOnce, setFocusedOnce] = useState(false)

  const trimmed = query.trim()
  const debounced = useDebounced(trimmed, 300)

  // Only download the title list once someone actually clicks into the search bar.
  const index = useSearchIndex(focusedOnce)
  const local = useMemo(() => (index.data ? searchLocal(index.data, trimmed) : []), [index.data, trimmed])

  // Ask AniList only when the local list doesn't have enough matches.
  const needLive = useMemo(
    () => index.isFetched && searchLocal(index.data ?? [], debounced).length < 6,
    [index.isFetched, index.data, debounced],
  )
  const live = useSuggestions(debounced, needLive)

  const suggestions = useMemo(() => {
    const seen = new Set(local.map((a) => a.id))
    const extra: Anime[] =
      needLive && live.data && debounced === trimmed ? live.data.media.filter((a) => !seen.has(a.id)) : []
    return [...local, ...extra].slice(0, 6)
  }, [local, live.data, needLive, debounced, trimmed])

  const stillLooking = index.isLoading || live.isFetching || debounced !== trimmed
  const showDropdown = open && trimmed.length >= 1

  function finish(path: string) {
    navigate(path)
    setQuery('')
    setOpen(false)
    setActive(-1)
    onNavigate?.()
  }

  const openAnime = (id: number) => finish(`/anime/${id}`)
  const seeAll = () => finish(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (showDropdown && active >= 0 && suggestions[active]) openAnime(suggestions[active].id)
    else seeAll()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return
    if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      return
    }
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    }
  }

  return (
    <form onSubmit={onSubmit} className={`relative ${className}`} role="search">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => {
          setOpen(true)
          setFocusedOnce(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Search anime…"
        className={`field w-full ${large ? 'px-4 py-3 text-base' : ''}`}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />

      {showDropdown && (
        // onMouseDown + preventDefault stops the input from losing focus (and closing
        // the dropdown) before the click on a suggestion has a chance to register.
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full right-0 left-0 z-40 mt-1 min-w-72 overflow-hidden rounded-md border border-line bg-surface shadow-lg"
        >
          <ul id={listId} role="listbox">
            {suggestions.map((a, i) => (
              <li
                key={a.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => openAnime(a.id)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-accent-soft' : ''}`}
              >
                <img
                  src={a.coverImage.large || a.coverImage.extraLarge || ''}
                  alt=""
                  loading="lazy"
                  className="h-14 w-10 shrink-0 rounded object-cover"
                  style={{ backgroundColor: a.coverImage.color ?? 'var(--line)' }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{displayTitle(a)}</p>
                  <p className="truncate text-xs text-muted">{metaLine(a)}</p>
                </div>
              </li>
            ))}
          </ul>

          {suggestions.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted">{stillLooking ? 'Searching…' : 'No matches'}</p>
          )}

          <button
            type="button"
            onClick={seeAll}
            className="block w-full border-t border-line px-3 py-2 text-left text-sm text-accent hover:bg-accent-soft"
          >
            See all results for “{trimmed}”
          </button>
        </div>
      )}
    </form>
  )
}
