/* ============================================================
   Review marks — every one `currentColor`, so severity is set by
   CSS alone and no glyph carries a colour of its own.

   A TICK NO LONGER MEANS "THERE IS A PROBLEM". It used to: an
   advisory drew `PencilTick`, a checkmark, which is the universal
   sign for a thing that is FINISHED — so the quieter half of every
   finding was marked with the symbol for its own absence. The tick
   now appears in exactly one place, on a mark that has just been
   cleared, and an advisory takes `AdvisoryMark`.
   ============================================================ */

import type { JSX } from 'react'

/** The reviewer's tick — a short check stroke with a slight overshoot. */
export function PencilTick(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
      <path
        d="M1.6 6.3 4.4 9.4 10.6 1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Advisory — worth looking at, and nothing is stopped by it. */
export function AdvisoryMark(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
      <path
        d="M6 1.9v4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="6" cy="9.4" r="0.95" fill="currentColor" />
    </svg>
  )
}

/** Blocker mark — a crossed-out stroke pair. */
export function PencilCross(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
      <path
        d="M2.2 2.4 9.8 9.6 M9.7 2.3 2.3 9.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CloseGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false">
      <path
        d="M1.5 1.5 8.5 8.5 M8.5 1.5 1.5 8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Points at the drawing the mark refers to. */
export function TargetArrow(): JSX.Element {
  return (
    <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true" focusable="false">
      <path
        d="M0.8 4h9.4 M7.3 1.2 10.4 4 7.3 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Disclosure caret for the inline field mark. */
export function Caret({ open }: { open: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 8 8"
      width="8"
      height="8"
      aria-hidden="true"
      focusable="false"
      style={{
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform var(--t-fast) var(--ease-draft)',
      }}
    >
      <path
        d="M2.6 1.2 5.8 4 2.6 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
