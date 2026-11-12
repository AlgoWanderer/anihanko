import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** A titled block on a page, with an optional "View all" link. */
export function Section({ title, viewAllTo, children }: { title: string; viewAllTo?: string; children: ReactNode }) {
  return (
    <section className="mt-14 first:mt-0">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="shrink-0 text-sm text-muted hover:text-accent">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
