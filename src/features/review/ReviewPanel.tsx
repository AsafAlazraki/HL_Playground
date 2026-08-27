/* ============================================================
   ReviewPanel — the rail that reads the sheet back to you.

   WHAT IT IS. Fifteen data-quality rules run over the whole
   project; this is where their findings stand. A summary at the
   top, then every mark grouped by the table it belongs to. Each
   mark teaches — the `why` sentence gets the typographic care —
   and, where the engine can derive one, offers a correction that
   is one press.

   SEVERITY IS THE FIRST THING YOU READ, and until this pass it
   was not readable at all. Every card was drawn in the same red
   with the same 11px uppercase mono title, so a rail of ten
   advisories looked exactly like a rail of ten blockers, and the
   order was alphabetical by table — which is to say, arbitrary
   with respect to the only question a person opens this to ask.
   Three things fix it and none of them is a filter control:

     · ORDER. Tables carrying a blocker come first; inside a table
       blockers come before advisories. The worst thing on the
       sheet is the first thing on the rail.
     · COLOUR. A blocker is `--danger`, an advisory is `--warning`.
       Two hues instead of one, both measured over the card they
       sit on, so the split is legible before a word is read.
     · SHAPE. A blocker's margin rule is solid, an advisory's is
       dashed — which survives being colour-blind, and survives
       `prefers-contrast: more` where the washes go.

   AND EVERY CARD SAYS WHAT TO DO. A finding with a derived fix
   offers it. A finding WITHOUT one used to offer nothing at all
   and simply stop, which reads as a complaint rather than as
   work — so it now names the one thing that is available, which
   is the card's own head: press it and the sheet goes there.

   Applying a fix mutates the store, which re-derives the list —
   so the card is gone on the very next render. We hold a short
   "mark cleared" ghost in its place so the correction is legible
   instead of a silent disappearance.

   TWO THINGS APPLYING A FIX DID NOT DO, and both were holes rather
   than choices. They are the reason this file was opened again.

     · IT WAS NOT UNDOABLE FROM ANYWHERE ON SCREEN. "Apply fix"
       renames a column or rewrites a link on a dealer's real price
       file, in one press, with nothing asked and nothing said.
       Rule 9 asks for a toast with UNDO on it for exactly this,
       and the ghost card is not one — it is a confirmation that
       fades. `sayUndoable` now pins the step and offers the way
       back, and the rail's own duplicate live region went with it
       so a screen reader hears the act once, not twice.
     · A FIX THAT DID NOT CLEAR ITS MARK SAID NOTHING. Renaming one
       of three columns that share a name leaves two. The card
       flashed for a second and a half and then looked exactly like
       a card nobody had pressed, which leaves "the button is
       broken" as the reasonable reading. It now says what
       happened, on itself, while it is flashing.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { accentVar } from '@/types/model'
import type { AccentKey, EntityDef } from '@/types/model'
import { applyLintFix } from '@/lib/lint'
import type { FindingSeverity, LintFinding } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import { useLintFindings } from './useLintFindings'
import { marksLabel, pluralize, ruleTitle, severityWord, targetLine } from './describe'
import { AdvisoryMark, CloseGlyph, PencilCross, PencilTick, TargetArrow } from './glyphs'
import './review.css'

const FLASH_MS = 1500

interface Flash {
  key: number
  findingId: string
  entityId: string
  entityName: string
  accent: AccentKey
  title: string
  severity: FindingSeverity
  fixLabel: string
  /** position the mark held inside its group when the fix was applied */
  index: number
}

interface Group {
  entityId: string
  name: string
  accent: AccentKey
  entity: EntityDef | undefined
  findings: LintFinding[]
  ghosts: Flash[]
  /** does anything in here stop work? decides where the group sits */
  blockers: number
}

let flashSeq = 0

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Blockers before advisories, and nothing else reordered — inside a
 *  severity the lint engine's own order is already the schema's. */
const bySeverity = (a: LintFinding, b: LintFinding): number =>
  (a.severity === 'blocker' ? 0 : 1) - (b.severity === 'blocker' ? 0 : 1)

/* ---------------------------------------------------------- */
/* Cards                                                      */
/* ---------------------------------------------------------- */

function FindingCard({
  finding,
  entity,
  flashing,
  onSelect,
  onApply,
}: {
  finding: LintFinding
  entity: EntityDef | undefined
  flashing: boolean
  onSelect: () => void
  onApply: () => void
}): JSX.Element {
  const blocker = finding.severity === 'blocker'
  const where = entity ? entity.name : 'the sheet'
  return (
    <article
      className={`rv-card${flashing ? ' is-flashing' : ''}`}
      data-severity={finding.severity}
    >
      <button
        type="button"
        className="rv-card-head"
        onClick={onSelect}
        title={`Find ${where} on the sheet`}
      >
        <span className="rv-card-titlerow">
          <span className="rv-card-mark" aria-hidden="true">
            {blocker ? <PencilCross /> : <AdvisoryMark />}
          </span>
          <span className="rv-card-title">{ruleTitle(finding.title)}</span>
          <span className="rv-card-sev">{severityWord(finding.severity)}</span>
        </span>
        <span className="rv-card-target">
          <span className="rv-card-arrow" aria-hidden="true">
            <TargetArrow />
          </span>
          <span className="rv-card-address">{targetLine(finding, entity)}</span>
        </span>
      </button>

      <p className="rv-why">{finding.why}</p>

      {/* ── THE FIX RAN AND THE MARK IS STILL HERE ────────────────
          A card that survives its own correction is the one outcome
          this rail had no words for. It flashed — a 1.5s pulse — and
          then sat there looking exactly like a card nobody had
          pressed, so the honest readings available to a person were
          "the button is broken" and "I mis-clicked", neither of which
          is what happened.

          What happened is that the fix was legal, was applied, and
          did not satisfy the rule: renaming one of three columns that
          share a name leaves two, and a link repaired to a table that
          is itself unlinked trades one mark for another. Rule 10 —
          anything that cannot be done says why, where it is — and
          this is the same obligation one step later: something that
          did not finish says so, on the card it did not finish. */}
      {flashing ? (
        <p className="rv-still" role="status">
          Applied — and this mark is still here. The correction was legal but did not
          satisfy the rule on its own; read the reason above for what is left.
        </p>
      ) : null}

      {finding.fix ? (
        <div className="rv-fix">
          <span className="rv-fix-label">{finding.fix.label}</span>
          <button
            type="button"
            className="rv-apply"
            onClick={onApply}
            title={finding.fix.label}
          >
            Apply fix
          </button>
        </div>
      ) : (
        /* RULE 10, KEPT: what cannot be done says why, where it is.
           There is no correction this engine can derive for this one,
           and the honest next step is the door already on the card. */
        <p className="rv-nofix">
          No one-click fix for this one — press the mark above to find{' '}
          {entity ? entity.name : 'it'} on the sheet.
        </p>
      )}
    </article>
  )
}

function GhostCard({ flash }: { flash: Flash }): JSX.Element {
  return (
    <article className="rv-card rv-ghost" data-severity={flash.severity} aria-hidden="true">
      <span className="rv-ghost-row">
        <span className="rv-ghost-mark">
          <PencilTick />
        </span>
        <span className="rv-ghost-title">{ruleTitle(flash.title)}</span>
      </span>
      <span className="rv-ghost-note">Cleared · {flash.fixLabel}</span>
    </article>
  )
}

/* ---------------------------------------------------------- */
/* Empty (clean sheet) plate                                  */
/* ---------------------------------------------------------- */

function CleanPlate({ hasEntities }: { hasEntities: boolean }): JSX.Element {
  return (
    <div className="rv-clean">
      <div className="rv-clean-plate">
        <span className="rv-clean-mark" aria-hidden="true">
          <PencilTick />
        </span>
        <p className="rv-clean-stamp">
          {hasEntities ? 'Nothing to correct' : 'Nothing drawn yet'}
        </p>
        {/* an empty state keeps its sentence — one of them. The list of
            what a mark can be about is what the marks themselves say,
            when there are any. */}
        <p className="rv-clean-prose">
          {hasEntities
            ? 'Marks appear as the model drifts, and clear as you fix it.'
            : 'Draw a table and the review starts.'}
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* Panel                                                      */
/* ---------------------------------------------------------- */

/** Right-rail review panel. `onClose` closes the rail. */
export function ReviewPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const findings = useLintFindings()
  const entities = useProjectStore((s) => s.entities)
  const select = useProjectStore((s) => s.select)

  const [flashes, setFlashes] = useState<Flash[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
      timers.current = []
    },
    [],
  )

  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)
  const total = findings.length
  const advisories = total - blockers
  const clean = total === 0
  const entityCount = Object.keys(entities).length

  const apply = (finding: LintFinding, index: number, entity: EntityDef | undefined) => {
    const fix = finding.fix
    if (!fix) return
    applyLintFix(fix)

    /* ── AND IT CAN BE PUT BACK ───────────────────────────────────
       RULE 9, WHICH THIS SCREEN WAS BREAKING IN THE ONE PLACE IT
       MATTERS MOST. "Apply fix" renames a column, retypes a field or
       rewrites a link on somebody's real price file — one press, no
       question asked, and until now no report either. The ghost card
       below is a good confirmation and it is NOT an undo: it says
       what happened, it fades after a second and a half, and it
       leaves a person who pressed the wrong card's button reaching
       for a keyboard shortcut nothing on screen has mentioned.

       `sayUndoable` pins the exact history step these writes folded
       into and puts UNDO on the note, which is the shape the rule
       asks for. It MUST be raised in this turn of the event loop —
       it reads the top of the stack on a microtask — so it stands
       here, immediately after the mutation, and never inside the
       timeout that clears the ghost. */
    sayUndoable(`${fix.label} — applied`)

    const flash: Flash = {
      key: (flashSeq += 1),
      findingId: finding.id,
      entityId: finding.entityId,
      entityName: entity?.name ?? '',
      accent: entity?.accent ?? 'graphite',
      title: finding.title,
      severity: finding.severity,
      fixLabel: fix.label,
      index,
    }
    setFlashes((prev) => [...prev, flash])
    /* NOT ANNOUNCED TWICE. This rail kept its own visually-hidden
       live region and spoke the fix into it; the toast raised above
       is itself `role="status" aria-live="polite"`, so keeping both
       would read the same sentence to a screen reader twice and only
       one of the two carries the Undo a person can actually reach.
       The note wins, and the region goes with the duplicate. */

    const t = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.key !== flash.key))
    }, FLASH_MS)
    timers.current.push(t)
  }

  const { groups, flashingIds } = useMemo(() => {
    const map = new Map<string, Group>()
    const liveIds = new Set<string>()

    for (const f of findings) {
      liveIds.add(f.id)
      let g = map.get(f.entityId)
      if (!g) {
        const entity = entities[f.entityId]
        g = {
          entityId: f.entityId,
          name: entity?.name ?? 'Deleted table',
          accent: entity?.accent ?? 'graphite',
          entity,
          findings: [],
          ghosts: [],
          blockers: 0,
        }
        map.set(f.entityId, g)
      }
      g.findings.push(f)
      if (f.severity === 'blocker') g.blockers += 1
    }

    const flashing = new Set<string>()
    for (const flash of flashes) {
      if (liveIds.has(flash.findingId)) {
        // the fix did not clear this mark — flash it in place instead
        flashing.add(flash.findingId)
        continue
      }
      let g = map.get(flash.entityId)
      if (!g) {
        const entity = entities[flash.entityId]
        g = {
          entityId: flash.entityId,
          name: entity?.name ?? (flash.entityName || 'Deleted table'),
          accent: entity?.accent ?? flash.accent,
          entity,
          findings: [],
          ghosts: [],
          blockers: 0,
        }
        map.set(flash.entityId, g)
      }
      g.ghosts.push(flash)
    }

    /* WHAT STOPS WORK COMES FIRST. Inside a table too — a blocker
       under three advisories is a blocker somebody scrolls past. The
       name is the tie-break, so the order is stable from one edit to
       the next and a group never jumps under the pointer. */
    for (const g of map.values()) g.findings.sort(bySeverity)
    const ordered = [...map.values()].sort(
      (a, b) =>
        (b.blockers > 0 ? 1 : 0) - (a.blockers > 0 ? 1 : 0) ||
        cmp(a.name.trim().toLowerCase(), b.name.trim().toLowerCase()) ||
        cmp(a.entityId, b.entityId),
    )
    return { groups: ordered, flashingIds: flashing }
  }, [findings, flashes, entities])

  return (
    <aside className="rv-rail" aria-label="Review">
      <header className="rv-head">
        <div className="rv-head-row">
          <span className="rv-eyebrow">Review</span>
          <span className="rv-head-rule" aria-hidden="true" />
          <button
            type="button"
            className="rv-close"
            onClick={onClose}
            aria-label="Close review"
            title="Close review"
          >
            <CloseGlyph />
          </button>
        </div>

        {/* THE SUMMARY, AND IT IS COUNTED. What was here was a rubber
            stamp: a double-ruled box with 17px letterspaced capitals
            in it, which is costume rather than information. Two
            figures and a sentence say the same thing and can be read
            from further away. */}
        <div
          className="rv-sum"
          data-tone={clean ? 'clean' : blockers > 0 ? 'blocker' : 'advisory'}
        >
          <p className="rv-sum-line">
            {clean ? 'Nothing to correct' : `${marksLabel(total)} on the sheet`}
          </p>
          {clean ? (
            <p className="rv-sum-say">
              Every table has been checked against all fifteen rules.
            </p>
          ) : (
            <div className="rv-sum-tally">
              <span className="rv-sum-cell" data-kind="blocker">
                <b className="rv-sum-fig">{blockers}</b>
                <span className="rv-sum-word">
                  {blockers === 1 ? 'blocker' : 'blockers'}
                </span>
              </span>
              <span className="rv-sum-cell" data-kind="advisory">
                <b className="rv-sum-fig">{advisories}</b>
                <span className="rv-sum-word">
                  {advisories === 1 ? 'advisory' : 'advisories'}
                </span>
              </span>
            </div>
          )}
        </div>

      </header>

      <div className="rv-body">
        {groups.length === 0 ? (
          <CleanPlate hasEntities={entityCount > 0} />
        ) : (
          groups.map((g, gi) => {
            const items: JSX.Element[] = g.findings.map((f, i) => (
              <FindingCard
                key={f.id}
                finding={f}
                entity={g.entity}
                flashing={flashingIds.has(f.id)}
                onSelect={() => select({ kind: 'entity', id: g.entityId })}
                onApply={() => apply(f, i, g.entity)}
              />
            ))
            for (const ghost of g.ghosts) {
              items.splice(Math.min(ghost.index, items.length), 0, (
                <GhostCard key={`ghost-${ghost.key}`} flash={ghost} />
              ))
            }
            return (
              <section
                className="rv-group ds-rise"
                key={g.entityId}
                style={{ '--i': gi } as CSSProperties}
              >
                <header className="rv-group-head">
                  <span
                    className="rv-dot"
                    style={{ '--rv-accent': accentVar(g.accent) } as CSSProperties}
                    aria-hidden="true"
                  />
                  <h3 className="rv-group-name" title={g.name}>
                    {g.name}
                  </h3>
                  <span
                    className="rv-group-count"
                    data-kind={g.blockers > 0 ? 'blocker' : 'advisory'}
                    aria-label={
                      g.blockers > 0
                        ? `${pluralize(g.blockers, 'blocker', 'blockers')} here`
                        : `${pluralize(g.findings.length, 'advisory', 'advisories')} here`
                    }
                  >
                    {g.findings.length}
                  </span>
                </header>
                <div className="rv-cards">{items}</div>
              </section>
            )
          })
        )}
      </div>
    </aside>
  )
}
