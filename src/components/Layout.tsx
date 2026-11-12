import { useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { RandomButton } from './RandomButton'
import { StampBookLink } from './StampBookLink'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'

// Worked out once when the site loads (not on every render).
const YEAR = new Date().getFullYear()

// `desktop: false` = only in the phone menu (the desktop navbar has no room, and has other ways in).
const links = [
  { to: '/top', label: 'Top', desktop: true },
  { to: '/season', label: 'Seasonal', desktop: true },
  { to: '/schedule', label: 'Schedule', desktop: true },
  { to: '/tonight', label: 'Tonight', desktop: true },
  { to: '/genres', label: 'Genres', desktop: true },
  { to: '/search', label: 'Search', desktop: false },
  { to: `/year/${YEAR - 1}`, label: 'Year in anime', desktop: false },
  { to: '/stamps', label: 'Stamp book', desktop: false },
  { to: '/guess', label: 'Guess the anime', desktop: false },
]

/** The shell around every page: navbar on top, footer at the bottom. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Active link gets a red underline instead of a filled pill.
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 py-5 text-sm font-medium transition ${
      isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
    }`
  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`

  return (
    // "isolate" lets the sun rays sit behind the page content but in front of the page background.
    <div className="relative isolate flex min-h-screen flex-col">
      {/* Sun rays, only shown in the Sea theme (see .sun-layer in index.css). */}
      <div className="sun-layer pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="sun-rays" />
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            AniHanko
          </Link>

          <nav className="hidden gap-6 lg:flex">
            {links.filter((l) => l.desktop).map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-4 sm:flex">
            <SearchBox className="w-56 xl:w-72" />
            <RandomButton />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <StampBookLink />
            <ThemeToggle />
            <button
              className="rounded-md p-2 text-muted hover:text-ink lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-line px-4 py-3 lg:hidden">
            <SearchBox className="mb-3 sm:hidden" onNavigate={() => setMenuOpen(false)} />
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={mobileNavClass} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </NavLink>
              ))}
              {/* On small phones the search bar lives in this menu, so Random does too */}
              <div className="sm:hidden">
                <RandomButton className="rounded-md px-3 py-2" menuAlign="left" onDone={() => setMenuOpen(false)} />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        <p>© {YEAR} AlgoWanderer. Anime data and images belong to their respective owners.</p>
        <p className="mt-2 space-x-4">
          <Link to={`/year/${YEAR - 1}`} className="hover:text-accent">
            Year in anime
          </Link>
          <Link to="/stamps" className="hover:text-accent">
            Stamp book
          </Link>
          <Link to="/guess" className="hover:text-accent">
            Guess the anime
          </Link>
          <Link to="/terms" className="hover:text-accent">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-accent">
            Privacy
          </Link>
        </p>
      </footer>

      <ScrollRestoration />
    </div>
  )
}
