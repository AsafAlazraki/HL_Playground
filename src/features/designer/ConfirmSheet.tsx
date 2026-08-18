/* ============================================================
   THE MOMENT BEFORE SOMETHING IS DESTROYED.

   Four acts in the column setup destroy something in one press —
   remove a column, retype one, re-point a link, delete the table — and
   all of them used to be gated by `window.confirm`. Two failures came
   out of that:

   1. The one moment the drawing office handed off to OS chrome. A
      sheet of white paper, hairlines and 10px mono labels stopped
      mid-sentence and the browser finished it in Segoe UI.

   2. `confirm` has exactly two answers, so the dialog could only ever
      ask "destroy it or don't". It could not offer the third one that
      matters — KEEP WHAT CONVERTS — and it could not show a single
      value of the data it was about to take.

   So this is the same question with room in it: an eyebrow, one
   sentence in the reader's words, whatever evidence the caller wants
   to show, and as many named choices as the decision honestly has.

   AND WHY THESE SHEETS SURVIVED RULE 9, when the register's row
   confirm did not. This header used to open "three acts cannot be
   undone — this app has no undo", and every sheet drawn through here
   repeated it in the body. It was false in all four: the store's
   history stack takes each of these acts back whole, measured act by
   act in the running app and written down beside each sentence.

   Rule 9 retires a dialog whose only job is the way back. That is not
   this dialog's only job. DESIGN_CONTRACT §7: "a confirm states its
   blast radius, computed." A column leaves one value out of every row
   in the table, most of them not on screen; a retype clears a column
   the person may not have looked at; a re-point empties every link at
   once; a table takes its rows, its rooted rules and the link columns
   aimed at it. Undo repairs every one of those and TELLS you about
   none of them in advance. So the sheets stay, they count what they
   are about to take, they show a few of the actual values — and their
   last line now says the true thing, which is Ctrl+Z. ColumnMenu.tsx
   makes the same argument for the same act on the register side; the
   two surfaces must never answer one question two ways.

   CANCEL TAKES THE FOCUS, not the confirming button. Every path
   through here ends in a lot of data moving at once, and a person who
   presses Enter out of habit must land on the one answer that costs
   nothing. Escape does the same thing, and the sheet owns the
   keyboard while it is up — Backspace must never reach the
   whiteboard's window handler, which is aimed at the very table
   being edited.
   ============================================================ */

import { useEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export interface ConfirmChoice {
  /** what the button says — a verb phrase naming the outcome */
  label: string
  /** one line under it, when the outcome needs a consequence spelled out */
  note?: string
  /** draws it in the red pencil: this choice loses data */
  destructive?: boolean
  onPick: () => void
}

export interface ConfirmSheetProps {
  /** 10px mono eyebrow — the act, not the subject */
  eyebrow: string
  /** the question, in the reader's words */
  question: string
  /** evidence: counts, samples, what else is holding on */
  children?: ReactNode
  /** in order; the last one is nearest Cancel */
  choices: ConfirmChoice[]
  /** what the word on the safe button is, when "Cancel" is not it */
  cancelLabel?: string
  onCancel: () => void
}

export function ConfirmSheet({
  eyebrow,
  question,
  children,
  choices,
  cancelLabel = 'Cancel',
  onCancel,
}: ConfirmSheetProps): ReactElement | null {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  /* the handler is registered once; a re-render must not detach it
     mid-decision, so the escape hatch is read through a ref */
  const cancelFn = useRef(onCancel)
  cancelFn.current = onCancel

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current
      if (!root) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        cancelFn.current()
        return
      }

      if (event.key === 'Tab') {
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!active || !root.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        event.stopPropagation()
        return
      }

      /* the whiteboard's window-level handler deletes the SELECTED
         table on either of these, and this sheet is all buttons */
      if (event.key === 'Delete' || event.key === 'Backspace') event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="ds-cs-overlay"
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onCancel()
      }}
    >
      <div className="ds-cs-scrim" aria-hidden="true" />
      <div
        className="ds-cs-sheet"
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-cs-question"
      >
        <header className="ds-cs-head">
          <span className="mono-label ds-cs-eyebrow">{eyebrow}</span>
          <h2 className="ds-cs-question" id="ds-cs-question">
            {question}
          </h2>
        </header>

        {children ? <div className="ds-cs-body">{children}</div> : null}

        <footer className="ds-cs-foot">
          {choices.map((c) => (
            <button
              key={c.label}
              type="button"
              className={c.destructive ? 'ds-cs-choice ds-cs-choice-danger' : 'ds-cs-choice'}
              onClick={c.onPick}
            >
              <span className="ds-cs-choice-label">{c.label}</span>
              {c.note ? <span className="ds-cs-choice-note">{c.note}</span> : null}
            </button>
          ))}
          <button
            type="button"
            className="ds-cs-cancel"
            ref={cancelRef}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------ */
/* Evidence blocks — the parts a caller shows inside the sheet   */
/* ------------------------------------------------------------ */

/** A row of counts: `33 of 40 rows hold a value · 5 distinct`. */
export function ConfirmFacts({ items }: { items: string[] }): ReactElement | null {
  if (items.length === 0) return null
  return (
    <p className="ds-cs-facts mono-label">
      {items.map((t, i) => (
        <span key={t}>
          {i > 0 ? <span className="ds-cs-dot" aria-hidden="true"> · </span> : null}
          {t}
        </span>
      ))}
    </p>
  )
}

/**
 * Values read out of the user's own rows, shown as themselves.
 * NEVER an example, never a placeholder — `label` says whose they are
 * so a reader can never take them for something the app made up.
 */
export function ConfirmSamples({
  label,
  values,
  more,
}: {
  label: string
  values: string[]
  more?: number
}): ReactElement | null {
  if (values.length === 0) return null
  return (
    <div className="ds-cs-samples">
      <span className="mono-label ds-cs-samples-lab">{label}</span>
      <span className="ds-cs-samples-row">
        {values.map((v, i) => (
          <span className="ds-cs-sample" key={`${i}:${v}`}>
            {v}
          </span>
        ))}
        {more && more > 0 ? (
          <span className="ds-cs-sample-more mono-label">+{more} more</span>
        ) : null}
      </span>
    </div>
  )
}
