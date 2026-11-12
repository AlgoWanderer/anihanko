import { NavLink } from 'react-router'
import { useStamps } from '../lib/stamps'

/** The little stamp icon in the navbar that opens your Stamp book, with how many stamps you have. */
export function StampBookLink() {
  const count = Object.keys(useStamps()).length
  return (
    <NavLink
      to="/stamps"
      aria-label={`Stamp book: ${count} stamped`}
      title="Stamp book"
      className={({ isActive }) =>
        `relative rounded-md p-2 hover:text-ink ${isActive ? 'text-accent' : 'text-muted'}`
      }
    >
      {/* A hanko stamp seen from the side: handle on top, base below */}
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6v4.5c0 1.5 2 2 2 4.5H7c0-2.5 2-3 2-4.5z" />
        <path d="M5 12h14v3H5z" />
        <path d="M6 19h12" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-semibold text-on-accent tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  )
}
