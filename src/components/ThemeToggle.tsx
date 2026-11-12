import { useEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'sea'

const ICONS: Record<Theme, ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  // A sun setting over two waves
  sea: (
    <>
      <path d="M8 12a4 4 0 0 1 8 0" />
      <path d="M12 4v2M5.6 6.6l1.4 1.4M18.4 6.6L17 8M3 12h2M19 12h2" />
      <path d="M2 16c1.7 0 1.7-1 3.3-1s1.7 1 3.4 1 1.6-1 3.3-1 1.7 1 3.3 1 1.7-1 3.4-1 1.6 1 2.3 1" />
      <path d="M2 20c1.7 0 1.7-1 3.3-1s1.7 1 3.4 1 1.6-1 3.3-1 1.7 1 3.3 1 1.7-1 3.4-1 1.6 1 2.3 1" />
    </>
  ),
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sea', label: 'Sea' },
]

function Icon({ theme }: { theme: Theme }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {ICONS[theme]}
    </svg>
  )
}

/** Which theme is on right now? (index.html sets it before the page loads.) */
function currentTheme(): Theme {
  const classes = document.documentElement.classList
  return classes.contains('dark') ? 'dark' : classes.contains('sea') ? 'sea' : 'light'
}

/** A small menu to pick Light, Dark or Sea. The choice is remembered. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function choose(next: Theme) {
    setTheme(next)
    setOpen(false)
    const classes = document.documentElement.classList
    classes.toggle('dark', next === 'dark')
    classes.toggle('sea', next === 'sea')
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be blocked (e.g. private mode). The theme still works for this visit.
    }
  }

  // Close the menu when you click somewhere else or press Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Theme: ${theme}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md p-2 text-muted hover:text-ink"
      >
        <Icon theme={theme} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-36 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {THEMES.map((t) => (
            <button
              key={t.value}
              role="menuitemradio"
              aria-checked={theme === t.value}
              onClick={() => choose(t.value)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent-soft ${
                theme === t.value ? 'font-medium text-accent' : 'text-ink'
              }`}
            >
              <Icon theme={t.value} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
