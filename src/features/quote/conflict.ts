/* ============================================================
   THE CONFLICT SHEET — what a choice does to what is already
   chosen, said before it happens.

   ── WHAT THE FIELD DOES, MEASURED ────────────────────────────

   CONFIGURATOR_PLAYBOOK §5 drove eight configurators and recorded
   what each one does when a choice removes something already
   chosen:

     Sea Ray Sundancer 370   seven constraint rules, all seven are
                             HIDES. Choose a black hull and the black
                             boot stripe silently ceases to exist.
     McLaren 750S            enabling the track brake upgrade removed
                             five caliper colours and SILENTLY
                             SWAPPED the finish already chosen. No
                             dialog, banner, toast or mark.
     Porsche                 a routed flyout: what you asked for, its
                             price, the cheapest fix PRE-SELECTED,
                             every alternative priced, and a footer
                             reading `Total price change +$2,480`.
                             The committed total does not move until
                             Accept.

   Porsche is the one to beat and this is its shape with our facts
   in it. Nothing below writes a reason: every sentence a person
   reads comes out of frozen data or out of the solver's own record
   of the removal.

   ── THE ONE THAT FIRES ON A REAL PRICE FILE ──────────────────

   THE PRICE LEVEL is the choice in this application that changes
   what is already chosen, and it changes ALL of it at once. A quote
   is priced at one rung — cash, trade — and every line was frozen
   with every rung its own table carries. So moving the quote from
   Cash to Trade:

     · re-prices most lines, from one named column to another
     · leaves alone any line whose table HAS NO SUCH COLUMN, which
       prices at that table's first rung and must say so
     · leaves alone any line a person pinned to its own rung — a
       part switched to `fitted`, a hull to `warranty`
     · moves the total, sometimes by thousands

   Production loses the level entirely on save and prices every
   trade quote's hull at cash (hl-journeys.md §3.2). Ours has always
   re-priced correctly and did it INSTANTLY AND SILENTLY: press
   Trade, the total is different, and nothing on screen says which
   lines moved or which could not. That is the McLaren failure with
   better arithmetic underneath it.

   `levelConflict` is the answer. It is a pure reading of the
   document's own frozen rungs through `repricedAt` — the SAME
   function `setLevel` calls if the person accepts — so the preview
   and the act cannot disagree.

   ── AND THE ONE THAT NEEDS A RULE TO EXIST ───────────────────

   `optionConflict` is the second channel and it is the general one:
   a pick whose values make a rule remove a value some line already
   on the quote holds. It reads the reason from `explain()`, which
   `src/lib/configure` records AT THE MOMENT OF REMOVAL — that is
   the sentence Boston Whaler stores as a string and lets go stale,
   and the reason we can say it and they cannot.

   IT IS HONEST ABOUT WHEN IT CANNOT FIRE. On the seeded price file
   `seedWorkbookConstraints()` emits nothing runnable — all sixteen
   workbook rules need a lookup, a formula or an arithmetic the
   clause vocabulary cannot state, which `seededRules.test.ts`
   asserts outright — so `solve()` returns an empty state and this
   channel correctly finds nothing. It is not dead code and it is
   not a stub: it is the same reading `subjectRules.ts` makes, over
   the whole build instead of over one row, and it fires the day a
   dealer writes a rule that can run.

   ── PURITY ───────────────────────────────────────────────────

   No React and no store. The solver channel is handed its answers
   by the surface, exactly as `subjectVerdict` is handed its rules.
   ============================================================ */

import type { CellValue } from '@/types/model'
import { formatValue } from '@/lib/configure'
import { money, repricedAt } from './pricing'
import { lineAmount, quoteTotals } from './totals'
import type { QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* What a sheet is                                             */
/* ---------------------------------------------------------- */

/** One line the change touches. `from` and `to` are the figures the
 *  document would carry before and after — `null` is a real state
 *  ("not priced here") and is never rendered as 0. */
export interface ConflictLine {
  lineId: string
  label: string
  /** the column the figure is read from now, as the business writes
   *  it — '' when the line has no price column at all */
  fromColumn: string
  from: number | null
  /** the column it would be read from. Equal to `fromColumn` when
   *  the line cannot take the new rung. */
  toColumn: string
  to: number | null
  /** why this line does not move, or '' when it simply re-prices.
   *  A sentence, always, wherever a thing cannot be done. */
  why: string
}

/**
 * A change to the build, priced, before it is committed.
 *
 * `to` is the PROPOSED total and `from` is the committed one. They
 * are two different numbers in two different places on purpose:
 * Porsche's rule, and the thing that makes a sheet a decision rather
 * than a notification.
 */
export interface Conflict {
  /** stable for the life of the proposal — the sheet's identity */
  id: string
  /** what the person asked for, named. One line, never a paragraph. */
  title: string
  /** the lines whose figure moves */
  changed: ConflictLine[]
  /** the lines that stay as they are, each saying why */
  held: ConflictLine[]
  /** the committed total, which does not move while this is open */
  from: number
  /** what the total would be */
  to: number
  /** the arithmetic, shown rather than hidden */
  delta: number
  /** what Accept does, named — never a bare "OK" */
  accept: string
}

/* ---------------------------------------------------------- */
/* THE LEVEL — the change that touches every line at once      */
/* ---------------------------------------------------------- */

/** The rung a line is charged at right now, as the business named
 *  the column. A line with no rungs at all has no column, and the
 *  empty string is that fact rather than a guess at one. */
const columnOf = (line: QuoteLine): string => line.priceColumnName ?? ''

/**
 * WHAT MOVING THE QUOTE TO `nextKey` WOULD DO, line by line.
 *
 * Returns `null` when there is nothing to decide — the rung is
 * already the one asked for, or the quote has no lines — because a
 * sheet that opens to say "nothing happens" is a full stop in the
 * middle of somebody's work.
 */
export function levelConflict(
  quote: QuoteDef,
  nextKey: string,
  nextLabel: string,
): Conflict | null {
  if (nextKey === quote.levelKey) return null
  if (quote.lines.length === 0) return null

  const changed: ConflictLine[] = []
  const held: ConflictLine[] = []
  let lines = 0

  for (const line of quote.lines) {
    const next = repricedAt(line, nextKey)
    const before = lineAmount(line)
    const after = lineAmount(next)
    if (after.amount !== null) lines += after.amount

    const row: ConflictLine = {
      lineId: line.id,
      label: line.label,
      fromColumn: columnOf(line),
      from: before.amount,
      toColumn: columnOf(next),
      to: after.amount,
      why: '',
    }

    /* A LINE A PERSON PINNED TO ITS OWN RUNG. `repricedAt` returns it
       untouched, and the reason is a decision somebody made by hand —
       so it is said, with the column they chose named. */
    const current = line.levels.find((l) => l.key === line.levelKey)
    if (current && current.scope === 'line') {
      held.push({ ...row, why: `priced by hand at ${current.label}` })
      continue
    }

    /* THE TABLE HAS NO COLUMN FOR THIS RUNG. `priceAtLevel` falls
       back to the table's first one and records which it used, which
       is the honest answer and the one nobody can read unless the
       screen says it. */
    if (!line.levels.some((l) => l.key === nextKey)) {
      held.push({
        ...row,
        why:
          row.toColumn === ''
            ? 'no price column on this table'
            : `no ${nextLabel} column — stays at ${row.toColumn}`,
      })
      continue
    }

    if (before.amount === after.amount) continue
    changed.push(row)
  }

  if (changed.length === 0 && held.length === 0) return null

  const from = quoteTotals(quote).total
  let adjustments = 0
  for (const a of quote.adjustments) {
    if (Number.isFinite(a.amount)) adjustments += a.amount
  }
  const to = lines + adjustments

  return {
    id: `level:${nextKey}`,
    title: `Pricing at ${nextLabel} changes ${
      changed.length === 1 ? 'one line' : `${changed.length} lines`
    }.`,
    changed,
    held,
    from,
    to,
    delta: to - from,
    accept: `Price it at ${nextLabel}`,
  }
}

/* ---------------------------------------------------------- */
/* THE OPTION — a pick that removes something already chosen   */
/* ---------------------------------------------------------- */

/** One thing the pick would take off the quote, with the reason the
 *  solver recorded at the moment it removed the value. */
export interface Removal {
  lineId: string
  label: string
  amount: number | null
  /** the column the blocked value sits on, as the dealer wrote it */
  where: string
  /** the value that was removed, formatted the way the register
   *  prints it */
  value: string
  /** the rule's own `because`, read from `explain()` and never
   *  written here */
  because: string
}

/** How the surface looks a blocked value up. It is `explain()` bound
 *  to the state `solve()` returned — the same arrangement
 *  `subjectVerdict` keeps, and what lets this file stay free of the
 *  store and of the constraint registry. */
export type BlockedLookup = (
  fieldId: string,
  value: CellValue,
) => { because: string } | undefined

/** The values one line already on the quote holds on the columns the
 *  rules in force actually reach. */
export interface LineValues {
  line: QuoteLine
  cells: Array<{ fieldId: string; where: string; value: CellValue }>
}

/** An alternative the sheet may offer instead, priced. */
export interface Fix {
  label: string
  amount: number | null
}

/**
 * WHAT A PICK WOULD REMOVE, and what it would cost to fix.
 *
 * Every sentence in the result is the constraint's own `because`,
 * recorded by `prune()` at the moment of removal — never
 * reconstructed, never stored, and so never stale.
 *
 * The cheapest surviving alternative sets the proposed total, which
 * is what lets the sheet pre-select it the way Porsche does. Where
 * no alternative survives, leaving the thing off is a real answer
 * and the arithmetic says so.
 */
export function optionConflict(
  quote: QuoteDef,
  asked: Fix,
  onQuote: readonly LineValues[],
  blocked: BlockedLookup,
  fixes: readonly Fix[],
): { removals: Removal[]; conflict: Conflict | null } {
  const removals: Removal[] = []

  for (const held of onQuote) {
    for (const cell of held.cells) {
      const why = blocked(cell.fieldId, cell.value)
      if (!why) continue
      removals.push({
        lineId: held.line.id,
        label: held.line.label,
        amount: lineAmount(held.line).amount,
        where: cell.where,
        value: formatValue(cell.value),
        because: why.because,
      })
      break
    }
  }

  if (removals.length === 0) return { removals, conflict: null }

  const from = quoteTotals(quote).total
  let lost = 0
  for (const r of removals) lost += r.amount ?? 0
  let cheapest: number | null = null
  for (const f of fixes) {
    if (f.amount === null) continue
    if (cheapest === null || f.amount < cheapest) cheapest = f.amount
  }
  const to = from - lost + (asked.amount ?? 0) + (cheapest ?? 0)

  return {
    removals,
    conflict: {
      id: `option:${asked.label}`,
      title: `Adding ${asked.label} takes ${
        removals.length === 1 ? 'a line' : `${removals.length} lines`
      } off this quote.`,
      changed: [],
      held: [],
      from,
      to,
      delta: to - from,
      accept: `Add ${asked.label}`,
    },
  }
}

/** The arithmetic on a sheet is shown, never hidden. This is the one
 *  place a delta is formatted with its sign — everywhere else on a
 *  quote a figure is the figure the price file states. */
export const deltaSay = (n: number): string => (n > 0 ? `+${money(n)}` : money(n))
