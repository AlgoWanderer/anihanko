import { ApiError } from '../api/anilist'

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : null
  const message =
    status === 429
      ? 'Too many requests to AniList. Wait a few seconds and try again.'
      : status === 404
        ? "We couldn't find that."
        : 'Something went wrong while loading anime data.'

  return (
    <div className="rounded-md border border-line bg-surface p-6 text-center">
      <p className="text-ink">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          Try again
        </button>
      )}
    </div>
  )
}
