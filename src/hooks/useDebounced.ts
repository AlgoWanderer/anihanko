import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it has stopped changing for `ms` milliseconds.
 * Used so we search when you pause typing, not on every single key press.
 */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer) // a new key press cancels the old timer
  }, [value, ms])
  return debounced
}
