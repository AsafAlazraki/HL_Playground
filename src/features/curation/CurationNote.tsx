/* ============================================================
   THE CURATION NOTE — the four properties, drawn.

   One component, used by every curated surface, for the reason
   `docs/plan/hl-journeys.md` §4 gives: HelmLogic has these four
   properties on exactly one screen out of thirteen, and the other
   twelve narrow silently. A shared drawing is how "silently" stops
   being reachable — a surface either mounts this and gets all four,
   or it does not narrow at all.

   WHAT IS ON IT, top to bottom:

     THE CHIP   "12 of 434 trailers · the series banner names this
                brand · holds on 581 of 581 pairings". The count is
                mono and tabular because it is a figure; the reason
                is Inter because it is a sentence.
     THE SEARCH the box that reaches PAST the narrowing. It is drawn
                in READ mode, not behind a configure handle — the
                person who needs to find a row by name is the
                salesperson, and on the view page this box used to
                exist only for whoever was building the page.
     THE REACH  "3 more trailers match “redco” outside this
                narrowing." Printed the moment a search finds
                something on the other side, so the next press is
                obvious rather than discovered.
     THE SWITCH "Show everything" / "Show what fits" — the narrowing
                off entirely, labelled with its ACT and announcing
                its state through `aria-pressed`.
     THE NOTE   the count of what was hidden, in words, merged with
                the discontinued contract's own sentence.

   ONE ACCENT, AND IT IS NOT HERE. DESIGN_CONTRACT §1 allows the
   accent about four times a screen and names them: the primary
   action, the current dock item, the focused control, a computed
   column. A note explaining a list is none of those, so everything
   here is ink and hairline — except the focus ring, which is the
   contract's own third case.
   ============================================================ */

import type { ReactElement } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import type { CurationReading } from './curation'
import './curation.css'

export interface CurationSearch {
  value: string
  onChange: (next: string) => void
  /** the accessible name. A placeholder is not one. */
  label: string
  placeholder?: string
  /** the view page holds its list still while somebody types */
  onTypingStart?: () => void
  onTypingEnd?: () => void
}

export interface CurationNoteProps {
  reading: CurationReading
  /** property 2 — a search that ignores the narrowing */
  search?: CurationSearch
  /** property 3 — switching the narrowing off entirely */
  showingAll: boolean
  onShowAll?: (next: boolean) => void
  /**
   * WHY THE SWITCH CANNOT BE PRESSED, when it cannot — rule 10,
   * "anything that cannot be done says why, where it is". A retired
   * table has nothing to show past the narrowing, and a control that
   * simply greyed out would take its own explanation with it.
   */
  refusal?: string
  /** `block` sits inside a card; `page` spans a stage's content column. */
  tone?: 'block' | 'page'
}

export function CurationNote({
  reading,
  search,
  showingAll,
  onShowAll,
  refusal,
  tone = 'block',
}: CurationNoteProps): ReactElement | null {
  const hasSwitch = onShowAll !== undefined
  /* NOTHING TO EXPLAIN AND NOTHING TO OFFER draws nothing at all. A
     mechanism that printed an empty frame on every list in the app
     would be furniture, and furniture is what the redesign spent
     three bars getting rid of. */
  if (reading.quiet && !hasSwitch && !search) return null

  const inert = refusal !== undefined && refusal !== ''

  return (
    /* THE VARIANT IS WRITTEN OUT, not interpolated. `check-styles`
       only trusts string literals inside a className, and a class it
       cannot read is a class nobody notices going unstyled — the
       exact failure that guard exists for. Two literals cost nothing. */
    <div
      className={tone === 'page' ? 'cur cur--page' : 'cur cur--block'}
      role="group"
      aria-label="What narrowed this list"
    >
      <div className="cur-controls">
        {search ? (
          <span className="cur-find">
            <MagnifyingGlass size={ICON_SIZE.small} weight="light" aria-hidden="true" />
            <input
              className="cur-find-input"
              type="text"
              value={search.value}
              placeholder={search.placeholder ?? 'Find one by name…'}
              aria-label={search.label}
              spellCheck={false}
              onFocus={search.onTypingStart}
              onBlur={search.onTypingEnd}
              onChange={(e) => search.onChange(e.target.value)}
            />
            {search.value !== '' ? (
              <button
                type="button"
                className="cur-clear"
                aria-label="Clear the search"
                title="Clear"
                onClick={() => search.onChange('')}
              >
                <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        ) : null}

        {hasSwitch ? (
          <button
            type="button"
            className="cur-switch"
            aria-pressed={showingAll}
            /* NOT `disabled`. A disabled control drops out of the tab
               order and takes the sentence with it — the precedent
               `ActionButton.refusal` and `BandStrip` already set. */
            aria-disabled={inert || undefined}
            title={inert ? refusal : reading.toggleSay}
            onClick={() => {
              if (inert) return
              onShowAll(!showingAll)
            }}
          >
            {reading.toggleLabel}
          </button>
        ) : null}

        {/* ── THE CHIP, IN THE TWO TYPEFACES IT ALWAYS CLAIMED ─────
            This header has said since it was written that "the count
            is mono and tabular because it is a figure; the reason is
            Inter because it is a sentence". It was one span and the
            whole line was 11px tabular mono at the faint tier — so
            "the series banner names this brand" was set in the face
            reserved for figures, at the smallest size in the system,
            in the lightest ink a person is allowed to read. That is
            the costume this design system was written to remove, and
            it was on every curated surface in the app.

            The count is handed over as its own segment now
            (`curationChipParts`) rather than being recovered by
            splitting a joined string, so nothing here is parsing
            anything. The middots are drawn by the markup and are
            aria-hidden: a screen reader is given the full sentence
            through the group's own label and does not need the
            punctuation read to it. */}
        <span className="cur-chip">
          {reading.chipParts.map((part, i) => (
            <span
              className={i === 0 ? 'cur-chip-n' : 'cur-chip-why'}
              key={`${i}-${part}`}
            >
              {i > 0 ? (
                <span className="cur-chip-dot" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {part}
            </span>
          ))}
        </span>
      </div>

      {/* ── THE REACH LINE IS THE DOOR, NOT A REPORT ────────────────
          "3 more Trailers match “redco” outside this narrowing" is a
          true sentence and, on its own, a cruel one: it tells a person
          the row they are looking for exists and leaves them to work
          out that the switch two inches to the left is what fetches
          it. Where the switch exists, the sentence IS the switch, and
          the search survives the press — so finding a row the rule
          removed is one press, with the count said out loud first. */}
      {reading.reach !== '' ? (
        hasSwitch && !showingAll && !inert ? (
          <button
            type="button"
            className="cur-reach cur-reach-btn"
            onClick={() => onShowAll(true)}
          >
            {reading.reach} Show them.
          </button>
        ) : (
          <p className="cur-reach" role="status">
            {reading.reach}
          </p>
        )
      ) : null}

      {reading.note !== '' ? <p className="cur-note">{reading.note}</p> : null}

      {inert ? <p className="cur-why">{refusal}</p> : null}
    </div>
  )
}
