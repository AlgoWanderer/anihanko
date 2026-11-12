import { useState } from 'react'
import { plainMarkdown } from '../lib/utils'

/** A biography from AniList, cut to 4 lines with a "Read more" button. Spoilers are removed. */
export function Bio({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const bio = plainMarkdown(text)
  if (!bio) return null

  return (
    <div className="mt-5 max-w-prose">
      <p className={`leading-relaxed whitespace-pre-line text-ink/85 ${expanded ? '' : 'line-clamp-4'}`}>{bio}</p>
      {bio.length > 300 && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-1 text-sm text-muted hover:text-accent">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
