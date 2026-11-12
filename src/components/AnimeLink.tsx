import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { Link, type LinkProps } from 'react-router'
import { animeQueryOptions } from '../hooks/useAnime'

const HOVER_DELAY_MS = 150 // only prefetch if the pointer rests here, not when it just passes over

/**
 * A link to an anime's page that starts loading that page's data when you hover
 * (or touch / tab to it), so the page usually opens instantly when you click.
 * Already-loaded anime aren't fetched again, so this doesn't waste AniList's rate limit.
 */
export function AnimeLink({ animeId, ...props }: Omit<LinkProps, 'to'> & { animeId: number }) {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const prefetch = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => queryClient.prefetchQuery(animeQueryOptions(animeId)), HOVER_DELAY_MS)
  }
  const cancel = () => clearTimeout(timer.current)

  return (
    <Link
      to={`/anime/${animeId}`}
      onMouseEnter={prefetch}
      onMouseLeave={cancel}
      onFocus={prefetch}
      onBlur={cancel}
      onTouchStart={prefetch}
      {...props}
    />
  )
}
