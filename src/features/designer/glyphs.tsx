/* ============================================================
   Tiny inline SVG glyphs — 1.4px ink strokes, drafting-crisp.
   Wrap in a ds-* span when a hover/rotate treatment is needed.
   ============================================================ */

interface GlyphProps {
  size?: number
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function ChevronUpGlyph({ size = 8 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M1.2 5.4 4 2.6l2.8 2.8" {...stroke} />
    </svg>
  )
}

export function ChevronDownGlyph({ size = 8 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M1.2 2.6 4 5.4l2.8-2.8" {...stroke} />
    </svg>
  )
}

export function ChevronRightGlyph({ size = 8 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M2.6 1.2 5.4 4 2.6 6.8" {...stroke} />
    </svg>
  )
}

export function XGlyph({ size = 8 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M1.6 1.6l4.8 4.8M6.4 1.6 1.6 6.4" {...stroke} />
    </svg>
  )
}

export function PlusGlyph({ size = 9 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" focusable="false">
      <path d="M4.5 1.2v6.6M1.2 4.5h6.6" {...stroke} />
    </svg>
  )
}

export function CheckGlyph({ size = 9 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" focusable="false">
      <path d="M1.6 4.9l2.1 2.1 3.7-4.7" {...stroke} />
    </svg>
  )
}

/** The double caret a reviewer leaves in the margin beside a line. */
export function MarkGlyph({ size = 10 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="M1.5 1.6 4.7 5 1.5 8.4" {...stroke} strokeWidth={1.6} />
      <path d="M6.6 1.6 9 5 6.6 8.4" {...stroke} strokeWidth={1.2} opacity={0.45} />
    </svg>
  )
}

export function PencilGlyph({ size = 11 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M8.6 1.7l1.7 1.7-6.1 6.1-2.3.6.6-2.3z" {...stroke} strokeWidth={1.2} />
    </svg>
  )
}
