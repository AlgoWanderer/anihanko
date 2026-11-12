import { useState, type ImgHTMLAttributes } from 'react'

/**
 * An <img> that fades in once it has loaded, instead of popping in line by line.
 * Lazy-loads by default (only downloads when it's about to scroll into view).
 */
export function FadeImage({ className = '', src, loading = 'lazy', onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  // Remember WHICH picture finished loading, so a new src fades in again.
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>()
  const loaded = loadedSrc === src

  return (
    <img
      {...props}
      src={src}
      loading={loading}
      // Images already in the browser cache may finish before React attaches onLoad, so check right away too.
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0 && loadedSrc !== src) setLoadedSrc(src)
      }}
      onLoad={(e) => {
        setLoadedSrc(src)
        onLoad?.(e)
      }}
      onError={(e) => {
        setLoadedSrc(src) // show the broken image / alt text rather than an invisible box
        onError?.(e)
      }}
      className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}
