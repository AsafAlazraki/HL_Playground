/* ============================================================
   THE MOMENT BEFORE A LINT FIX WRITES TO A DEALER'S PRICE FILE.

   `CLUELESS_USER_TESTS.md` O8 asked for a confirm gate on "Apply
   fix" before the reviewer deserved a door. This is that gate —
   and it is NOT on every fix, because a blanket gate would break
   two hard constraints of this repo at once and nobody would be
   able to say which rule won.

   THE TWO RULES THAT DISAGREE, AND HOW THEY ARE HELD TOGETHER.

     · DESIGN_PRINCIPLES rule 9 — "if an act is undoable it gets a
       toast with UNDO, not a dialog" — and CONFIGURATOR_PLAYBOOK
       §8 puts "a confirmation dialog for anything reversible" on
       the reject list, in as many words. Every lint fix is
       reversible: the store's history stack takes all nine kinds
       back, and `ReviewPanel.apply` already pins the step and
       offers UNDO on the note.
     · DESIGN_CONTRACT §7 — "a confirm states its blast radius,
       computed" — which is `ConfirmSheet`'s own argument for why
       four acts in the column setup kept their sheet after rule 9
       retired the rest. Undo repairs the damage; it does not TELL
       you about it in advance.

   So the gate is drawn where the second argument actually applies:
   **a fix that can drop a value, or that makes a table, asks
   first, and states what it is about to cost, counted from the
   real rows.** A fix that only renames a thing does not ask — it
   keeps the toast with UNDO it already has, because a dialog in
   front of "rename Boats to Boat" is exactly the full stop in the
   middle of somebody's work that rule 9 exists to remove.

     ASKS   convert-to-select · convert-to-reference ·
            convert-to-formula · remove-field · extract-entity
     TOAST  rename-entity · rename-field · set-display-field ·
            make-required

   AND EVERY BULK ASKS, whatever the kind. One press that touches
   eight columns of a table is a blast radius by definition, and
   the count is the first thing the sheet says.

   THE SHEET IS THE HOUSE ONE. `ConfirmSheet` + `ConfirmRadius` +
   `ConfirmSamples` from the designer, unchanged — the eyebrow,
   the question in the reader's words, the figures in one column,
   the dealer's own values shown as themselves, Cancel holding the
   focus. A second modal on this surface would be two answers to
   one question, which is the thing that file's header forbids.
   `ds-cs-line` is its sentence class, used here the way
   `ImportExportMenu` uses it — declared in designer.css, which is
   in the bundle wherever this rail is.
   ============================================================ */

import type { JSX } from 'react'
import type { CellValue, EntityDef } from '@/types/model'
import { rowLabel } from '@/types/model'
import type { LintFix } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'
import { ConfirmRadius, ConfirmSamples, ConfirmSheet } from '@/features/designer/ConfirmSheet'
import type { RadiusFact } from '@/features/designer/ConfirmSheet'
import './review.css'

/* ---------------------------------------------------------- */
/* Which fixes ask                                            */
/* ---------------------------------------------------------- */

/**
 * Does this fix move data, or make structure? Those are the two
 * things undo cannot warn about in advance.
 */
export function fixNeedsConfirm(fix: LintFix): boolean {
  switch (fix.kind) {
    case 'rename-entity':
    case 'rename-field':
    case 'set-display-field':
    case 'make-required':
      return false
    default:
      return true
  }
}

/** A whole roll asks whenever it is more than one press folded into one. */
export function fixesNeedConfirm(fixes: readonly LintFix[]): boolean {
  return fixes.length > 1 || (fixes.length === 1 && fixNeedsConfirm(fixes[0]))
}

/* ---------------------------------------------------------- */
/* Counting, against the real rows                            */
/* ---------------------------------------------------------- */

const isEmptyCell = (v: CellValue | undefined): boolean =>
  v === null || v === undefined || v === ''

const matchKey = (v: CellValue): string => String(v).trim().toLowerCase()

const SAMPLE_CAP = 6

interface Tally {
  /** rows in the table the fix is aimed at */
  rows: number
  /** cells across the affected columns that hold something */
  filled: number
  /** of those, how many survive the change as they are */
  kept: number
  /** of those, how many the change clears */
  cleared: number
  /** a few of the values, read out of the dealer's own rows */
  samples: string[]
  /** distinct values behind those samples */
  distinct: number
}

const EMPTY_TALLY: Tally = { rows: 0, filled: 0, kept: 0, cleared: 0, samples: [], distinct: 0 }

function fieldIdsOf(fix: LintFix): string[] {
  switch (fix.kind) {
    case 'extract-entity':
      return [...fix.fieldIds]
    case 'rename-entity':
      return []
    default:
      return [fix.fieldId]
  }
}

/** Does a value survive this fix as it stands? */
function survives(fix: LintFix, value: CellValue, keys: ReadonlySet<string>): boolean {
  switch (fix.kind) {
    case 'convert-to-select':
    case 'convert-to-reference':
      return keys.has(matchKey(value))
    case 'convert-to-formula':
    case 'remove-field':
      return false
    default:
      return true
  }
}

/** The keys a value must match to survive — options, or the target's labels. */
function survivorKeys(fix: LintFix, entities: Record<string, EntityDef>): Set<string> {
  const out = new Set<string>()
  if (fix.kind === 'convert-to-select') {
    for (const o of fix.options) {
      const k = o.trim().toLowerCase()
      if (k) out.add(k)
    }
    return out
  }
  if (fix.kind === 'convert-to-reference') {
    const target = entities[fix.refEntityId]
    if (!target) return out
    const rows = useProjectStore.getState().rowsByEntity[fix.refEntityId] ?? []
    for (const r of rows) {
      const k = rowLabel(target, r).trim().toLowerCase()
      if (k) out.add(k)
    }
  }
  return out
}

/**
 * WHAT THE CHANGE COSTS, COUNTED — DESIGN_PRINCIPLES §7, on this
 * table's real rows rather than on an estimate. Every figure the
 * sheet prints comes from here.
 */
function tally(fixes: readonly LintFix[]): Tally {
  const first = fixes[0]
  if (!first) return EMPTY_TALLY
  const store = useProjectStore.getState()
  const entityId = first.entityId
  const rows = store.rowsByEntity[entityId] ?? []
  const seen = new Map<string, string>()
  let filled = 0
  let kept = 0
  for (const fix of fixes) {
    const keys = survivorKeys(fix, store.entities)
    for (const fieldId of fieldIdsOf(fix)) {
      for (const row of rows) {
        const v = row.values[fieldId]
        if (isEmptyCell(v)) continue
        filled += 1
        if (survives(fix, v as CellValue, keys)) kept += 1
        const text = String(v).trim()
        const k = text.toLowerCase()
        if (text && !seen.has(k)) seen.set(k, text)
      }
    }
  }
  const values = [...seen.values()]
  return {
    rows: rows.length,
    filled,
    kept,
    cleared: filled - kept,
    samples: values.slice(0, SAMPLE_CAP),
    distinct: values.length,
  }
}

/* ---------------------------------------------------------- */
/* The words                                                  */
/* ---------------------------------------------------------- */

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

interface Words {
  eyebrow: string
  question: string
  /** the button that does it */
  verb: string
  /** the last line — what the sheet promises about coming back */
  after: string
}

function words(fixes: readonly LintFix[], where: string, columns: string[]): Words {
  const fix = fixes[0]
  const n = fixes.length
  const cols = columns.length
  const one = cols === 1 ? `“${columns[0]}”` : `${cols} columns`
  switch (fix.kind) {
    case 'convert-to-select':
      return {
        eyebrow: 'Fix a mark',
        question:
          n === 1
            ? `Turn ${one} into a choice list?`
            : `Turn ${cols} columns of ${where} into choice lists?`,
        verb: n === 1 ? 'Convert it' : `Convert all ${cols}`,
        after:
          'Afterwards the column takes only the choices below — anything else has to be added to the list first.',
      }
    case 'convert-to-reference':
      return {
        eyebrow: 'Fix a mark',
        question: `Point ${one} at another table instead of holding a copy?`,
        verb: n === 1 ? 'Point it at the table' : `Point all ${cols} at the table`,
        after: 'Afterwards the column holds a link, and the text it held is gone.',
      }
    case 'convert-to-formula':
      return {
        eyebrow: 'Fix a mark',
        question: `Compute ${one} instead of typing it?`,
        verb: n === 1 ? 'Compute it' : `Compute all ${cols}`,
        after: 'Afterwards the column is worked out from the others and cannot be typed into.',
      }
    case 'remove-field':
      return {
        eyebrow: 'Fix a mark',
        question: `Remove ${one} from ${where}?`,
        verb: n === 1 ? 'Remove it' : `Remove all ${cols}`,
        after: 'The column and every value in it leave the table.',
      }
    case 'extract-entity':
      return {
        eyebrow: 'Make a table',
        question: `Move ${one} out of ${where} into a table of its own?`,
        verb: 'Make the table',
        after: 'A new table appears on the sheet, and this one links to it.',
      }
    default:
      return {
        eyebrow: 'Fix a mark',
        question: `Apply ${n === 1 ? 'this correction' : `these ${n} corrections`} to ${where}?`,
        verb: n === 1 ? 'Apply it' : `Apply all ${n}`,
        after: '',
      }
  }
}

function radiusFacts(fixes: readonly LintFix[], t: Tally, columns: string[]): RadiusFact[] {
  const fix = fixes[0]
  const facts: RadiusFact[] = []
  const cols = columns.length

  if (fix.kind === 'extract-entity') {
    /* STRUCTURE IS NEVER A SIDE EFFECT (§7). The table this is about
       to create is the FIRST figure on the sheet, named, before
       anything about the columns or the rows — because it is the part
       of this act a person cannot see coming from the button. */
    facts.push({ figure: '1', say: `new table, named “${fix.newEntityName}”` })
    facts.push({
      figure: String(cols),
      say: `${plural(cols, 'column moves', 'columns move')} into it`,
    })
    facts.push({
      figure: String(t.rows),
      say: `${plural(t.rows, 'row', 'rows')} here keep a link to it`,
    })
    return facts
  }

  if (cols > 1) {
    facts.push({ figure: String(cols), say: 'columns change at once' })
  }

  if (t.filled === 0) {
    facts.push({
      figure: '0',
      say: `of ${t.rows} ${plural(t.rows, 'row holds', 'rows hold')} a value — nothing to lose`,
    })
    return facts
  }

  facts.push({
    figure: cols > 1 ? String(t.filled) : `${t.filled} of ${t.rows}`,
    say: cols > 1 ? 'values are in them' : `${plural(t.filled, 'row holds', 'rows hold')} a value`,
  })

  if (fix.kind === 'convert-to-select') {
    facts.push({
      figure: String(t.distinct),
      say: `distinct ${plural(t.distinct, 'value becomes a choice', 'values become the choices')}`,
    })
  }

  /* ONLY WHEN THE SPLIT MATTERS. "24 values are in them" followed by
     "24 values cross unchanged" is one fact stated twice, and the
     second one reads as a finding. The kept line earns its place
     exactly when something does NOT cross — which is the same
     argument §7 makes for never passing a zero. */
  if (t.kept > 0 && t.cleared > 0) {
    facts.push({
      figure: String(t.kept),
      say: `${plural(t.kept, 'value crosses', 'values cross')} unchanged`,
    })
  }
  if (t.cleared > 0) {
    facts.push({
      figure: String(t.cleared),
      say: `${plural(t.cleared, 'value matches nothing and is', 'values match nothing and are')} cleared`,
      grave: true,
    })
  }
  return facts
}

/* ---------------------------------------------------------- */
/* The sheet                                                  */
/* ---------------------------------------------------------- */

export interface FixConfirmProps {
  /** every fix this one press would run — same kind, same table */
  fixes: LintFix[]
  /** the table, as the dealer knows it */
  where: string
  /** the columns the fixes are aimed at, in schema order */
  columns: string[]
  onCancel: () => void
  onConfirm: () => void
}

/** The house question, aimed at a lint fix. Null when there is nothing to ask. */
export function FixConfirm({
  fixes,
  where,
  columns,
  onCancel,
  onConfirm,
}: FixConfirmProps): JSX.Element | null {
  if (fixes.length === 0) return null
  const t = tally(fixes)
  const w = words(fixes, where, columns)
  const facts = radiusFacts(fixes, t, columns)
  const destructive = t.cleared > 0 || fixes[0].kind === 'remove-field'

  return (
    <ConfirmSheet
      eyebrow={w.eyebrow}
      question={w.question}
      onCancel={onCancel}
      choices={[
        {
          /* THE NOTE UNDER THE BUTTON IS THE COST, AND NOTHING ELSE.
             It used to repeat `w.after` verbatim, which the body was
             already printing four lines up — the same sentence twice
             on one sheet. What belongs beside the button is the one
             thing a person weighs in the second before pressing it:
             what leaves. When nothing leaves there is nothing to add,
             and the button says its own verb. */
          label: w.verb,
          note:
            t.cleared > 0
              ? `${t.cleared} ${plural(t.cleared, 'value', 'values')} go.`
              : undefined,
          destructive,
          onPick: onConfirm,
        },
      ]}
    >
      <ConfirmRadius label="What the change costs" facts={facts} />
      {columns.length > 1 ? (
        <ConfirmSamples label="The columns" values={columns.slice(0, SAMPLE_CAP)} more={columns.length - Math.min(columns.length, SAMPLE_CAP)} />
      ) : null}
      {t.samples.length > 0 ? (
        <ConfirmSamples
          label="In them now"
          values={t.samples}
          more={t.distinct - t.samples.length}
        />
      ) : null}
      {w.after === '' ? null : <p className="ds-cs-line">{w.after}</p>}
      {/* THE LAST LINE, AND WHY IT IS TRUE. Every write here goes
          through a store action, and the actions one fix chains — the
          type change, then the cells re-written after it — land in the
          same turn of the event loop, which `record()` folds into a
          single history step (see the microtask argument in
          `store/notes.ts`). That is the same guarantee FieldRow's
          retype sheet states, for the same act on the same column.
          The sheet stays anyway for ConfirmSheet.tsx's own reason:
          undo repairs the damage and tells you about none of it
          beforehand. */}
      <p className="ds-cs-line">Ctrl+Z takes the whole change back, in one press.</p>
    </ConfirmSheet>
  )
}
