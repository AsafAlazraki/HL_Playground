/* ============================================================
   Drafting glyphs for the table chrome — hairline strokes, square
   caps, drawn on a 12×12 or 10×10 pen grid.
   ============================================================ */
import type { JSX } from 'react'

export function SortChevron({ dir }: { dir: 'asc' | 'desc' | null }): JSX.Element {
  return (
    <svg
      className={'tb-glyph tb-sortglyph' + (dir ? ' tb-sortglyph-on' : '')}
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      {/* up wedge */}
      <path
        d="M5 1.4 L8.4 5 L1.6 5 Z"
        fill={dir === 'asc' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="miter"
        opacity={dir === 'desc' ? 0.3 : 1}
      />
      {/* down wedge */}
      <path
        d="M5 8.6 L1.6 5.6 L8.4 5.6 Z"
        fill={dir === 'desc' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="miter"
        opacity={dir === 'asc' ? 0.3 : 1}
      />
    </svg>
  )
}

export function FilterGlyph({ on }: { on: boolean }): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M1 1.6 H9 L6 5.2 V8.6 L4 7.4 V5.2 Z"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function CrossGlyph(): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 2 L8 8 M8 2 L2 8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  )
}

export function SearchGlyph(): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.6 7.6 L10.6 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  )
}

/** System-column mark — a drafting padlock. Signals "the app owns this
 *  column", never a disabled control. */
export function LockGlyph(): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M3 4.6 V3.2 A2 2 0 0 1 7 3.2 V4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        x="1.9"
        y="4.6"
        width="6.2"
        height="4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}

/** Disclosure wedge on a grouping line — points down when the drawer
 *  is open, right when it is shut. Filled, because it is the one mark
 *  on that line the reader is meant to aim at. */
export function DisclosureGlyph({ open }: { open: boolean }): JSX.Element {
  return (
    <svg
      className="tb-glyph tb-discglyph"
      viewBox="0 0 10 10"
      aria-hidden="true"
      style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
    >
      <path d="M1.8 3.4 H8.2 L5 7.4 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** The one mark that means "add". */
export function PlusGlyph(): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 1.4 V8.6 M1.4 5 H8.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  )
}

/** Column-menu handle — a small downward wedge, outlined so it never
 *  competes with the sort state drawn beside it. */
export function MenuGlyph(): JSX.Element {
  return (
    <svg className="tb-glyph" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 3.8 L5 6.8 L8 3.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  )
}

export function TickGlyph(): JSX.Element {
  return (
    <svg className="tb-tickglyph" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.1 6.9 L4.7 9.4 L10.7 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="square"
      />
    </svg>
  )
}

/** Drafting plate motif for the empty states — a sheet with a ruled
 *  header, a dashed guide and a gutter rule. */
export function PlateGlyph(): JSX.Element {
  return (
    <svg className="tb-plate-glyph" viewBox="0 0 64 40" aria-hidden="true">
      <rect x="1" y="1" width="62" height="38" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="12" x2="63" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="26" x2="63" y2="26" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="15" y1="1" x2="15" y2="39" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/** Corner registration ticks — the drafting-plate frame. */
export function PlateTicks(): JSX.Element {
  return (
    <>
      <span className="tb-tick tb-tick-tl" aria-hidden="true" />
      <span className="tb-tick tb-tick-tr" aria-hidden="true" />
      <span className="tb-tick tb-tick-bl" aria-hidden="true" />
      <span className="tb-tick tb-tick-br" aria-hidden="true" />
    </>
  )
}
