import { useEffect, useRef } from 'react'

interface Props {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  /** Shown once there's nothing left to load, e.g. "That's the whole Top 100". */
  endText?: string
}

/**
 * Infinite scroll. Put this under a list: when it scrolls into view
 * (or comes within 600px of it), the next page loads automatically.
 * The button is a backup in case automatic loading doesn't kick in.
 */
export function LoadMore({ hasNextPage, isFetchingNextPage, fetchNextPage, endText }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasNextPage) return
    // IntersectionObserver is the browser's built-in "tell me when this element is on screen".
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div ref={ref} className="mt-10 flex justify-center">
      {isFetchingNextPage ? (
        <p className="text-sm text-muted">Loading more…</p>
      ) : hasNextPage ? (
        <button
          onClick={() => fetchNextPage()}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          Load more
        </button>
      ) : (
        endText && <p className="text-sm text-muted">{endText}</p>
      )}
    </div>
  )
}
