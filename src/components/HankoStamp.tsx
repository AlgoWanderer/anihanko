import { STAMP_TYPES, type StampStatus } from '../lib/stamps'

/**
 * A round Japanese-style stamp: 済 watched, 中 watching, 予 plan to watch or 止 dropped.
 * `animate` plays the "pressed onto paper" animation (used right after you stamp).
 */
export function HankoStamp({
  status = 'watched',
  className = '',
  animate = false,
}: {
  status?: StampStatus
  className?: string
  animate?: boolean
}) {
  const { kanji, word, label, color } = STAMP_TYPES[status]
  return (
    <svg
      viewBox="0 0 100 100"
      aria-label={label}
      role="img"
      className={`hanko-stamp ${animate ? 'hanko-stamp-press' : ''} ${className}`}
    >
      <circle cx="50" cy="50" r="45" fill="var(--paper)" fillOpacity="0.85" stroke={color} strokeWidth="5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke={color} strokeWidth="1.8" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="40"
        fontWeight="700"
        fill={color}
        fontFamily="'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'MS Mincho', serif"
      >
        {kanji}
      </text>
      <text
        x="50"
        y="78"
        textAnchor="middle"
        fontSize={word.length > 7 ? 7.5 : 8.5}
        fontWeight="700"
        letterSpacing="1.2"
        fill={color}
        fontFamily="Inter, sans-serif"
      >
        {word}
      </text>
    </svg>
  )
}
