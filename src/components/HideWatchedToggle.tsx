import { useHideWatched } from '../lib/stamps'

/** A switch that hides anime you've stamped as watched or dropped. Remembered across the site. */
export function HideWatchedToggle({ className = '' }: { className?: string }) {
  const [hide, setHide] = useHideWatched()
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm select-none ${className}`}>
      <span className="text-muted">Hide watched</span>
      <button
        type="button"
        role="switch"
        aria-checked={hide}
        onClick={() => setHide(!hide)}
        className={`relative h-5 w-9 rounded-full transition ${hide ? 'bg-accent' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform ${
            hide ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </label>
  )
}
