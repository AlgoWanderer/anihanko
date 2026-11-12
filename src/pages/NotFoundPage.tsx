import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">This page wandered off to another isekai.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 font-medium text-on-accent hover:opacity-90">
        Back home
      </Link>
    </div>
  )
}
