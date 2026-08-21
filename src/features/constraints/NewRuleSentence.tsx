/* ============================================================
   WRITE A NEW RULE — one live sentence, and everything a person needs
   in order to mean it.

   Zero required metadata. No name (the sentence IS the name), no kind
   picker, no entity picker, no save-then-configure. The draft is a real
   ConstraintDef rendered by the SAME <RuleSentence> the cards use, so
   what you are about to add looks exactly like what you will get, and
   the builder can never drift from the editor.

   THREE THINGS WERE ADDED TO IT, AND EACH ANSWERS A WAY THIS SURFACE
   USED TO LEAVE A PERSON GUESSING.

   1. THE COLUMNS SAY WHERE THEY CAME FROM. A dropdown of 2,026 columns
      named in a dealer's own shorthand — "Max HP", "ATM (KG)", "Boat
      Size (Mtr) Fisher" — is a list of words, and picking the wrong one
      is silent. Every imported column carries the cell it was read out
      of and the header row that labelled it, so the moment a column is
      named, its citation is printed under the sentence.

   2. THE CONSEQUENCE IS SHOWN BEFORE THE COMMIT. See
      `ConsequenceMeter`: a rule is a claim about the whole catalogue,
      and until now the only way to learn what the claim cost was to add
      it and read the badge afterwards.

   3. THE PRICE FILE OFFERS THE FIRST MOVE. Sixteen real rules were
      mined out of the workbooks and adjudicated; a person should be
      able to start from one rather than from a blank sentence. What an
      offer may honestly do — and what it must refuse to do — is
      written up in `startingPoints.ts`.

   THE OFFERS LIVE ON THE ACTION BAR, not in a fourth block on this
   card. The bar is what the page you are on can DO, this page's one
   page-level door is the catalogue, and a control that is used at the
   start of a sentence and never again should not charge the card its
   height for the rest of the session.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Article, Plus } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { newId, nowIso } from '@/lib/id'
import { useActionBar, type ActionGroup } from '@/lib/actions'
import type { ConstraintDef } from '@/types/model'
import { isUnsetField, type ColumnConcept } from './columns'
import {
  INDICATIVE,
  isUnary,
  literalOf,
  valueWords,
  type SentenceCtx,
} from './describe'
import { emptyClause, inferKind, singleGroup } from './edit'
import { createConstraint } from './constraintDefs'
import { missingChoice, previewConstraint } from './state'
import { RuleSentence } from './RuleSentence'
import { ConsequenceMeter } from './ConsequenceMeter'
import { StartingPointList } from './StartingPointList'
import { draftFrom, startingPoints, stillFrom, tally, type StartingPoint } from './startingPoints'
import { BECAUSE_PLACEHOLDER } from './RuleCard'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export const NEW_RULE_CAPTION =
  'It reads as a sentence, and it takes effect the moment you add it.'

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/* ---------------------------------------------------------- */
/* The draft                                                  */
/* ---------------------------------------------------------- */

/* AN EMPTY SENTENCE, AND IT MUST STAY EMPTY.
 *
 * This used to open on a rule the app had composed for itself: the two
 * best-ranked columns it could find, each with a value picked off the
 * front of its own list. On the seeded sheet that read "When
 * Discontinued is yes, Wheel Size in must be 0" — a plausible, precise,
 * entirely invented claim about this dealership — with ADD RULE already
 * live beside the words "nothing else to fill in". One press and a rule
 * nobody wrote was in the register, wearing "You, just now" as its
 * source.
 *
 * The ranking was well meant: a sentence whose every word is a dropdown
 * teaches the idea in one look. But a teaching example and a live draft
 * cannot be the same object, because the button under it commits it. So
 * the draft opens with nothing answered, the words say which choices are
 * being asked for, and the button says why it is not available yet.
 *
 * THE STARTING POINTS DO NOT REOPEN THAT DOOR, and the difference is
 * exact: they name COLUMNS the price file's own rules are about, and
 * they still answer no verb and no value. `missingChoice` refuses the
 * button just as hard either way.
 */
function makeDraft(ctx: SentenceCtx): ConstraintDef | null {
  if (ctx.concepts.length === 0) return null
  const now = nowIso()
  return {
    id: newId(),
    kind: 'implies',
    if: singleGroup(emptyClause()),
    then: singleGroup(emptyClause()),
    because: '',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** A draft survives a change to the sheet as long as every column it
 *  has been pointed at is still there. An unanswered slot is always
 *  still valid — there is nothing in it to go stale. */
const draftStillValid = (draft: ConstraintDef, ctx: SentenceCtx): boolean =>
  [...draft.if.clauses, ...(draft.then?.clauses ?? [])].every(
    (c) => isUnsetField(c.left.fieldId) || ctx.index.has(c.left.fieldId),
  )

/** When nobody writes a reason, write one that is at least true: the
 *  condition itself, phrased to read after "because". */
function autoBecause(draft: ConstraintDef, ctx: SentenceCtx): string {
  const clause = draft.if.clauses[0]
  const concept = clause ? ctx.index.get(clause.left.fieldId) : undefined
  if (!clause || !concept) return 'that is how this is set up'
  if (isUnary(clause.op)) return `${concept.name.toLowerCase()} ${INDICATIVE[clause.op]}`
  return `${concept.name.toLowerCase()} ${INDICATIVE[clause.op]} ${valueWords(literalOf(clause.right))}`
}

const AUTO_WHY =
  'Written here, in the list. It behaves exactly like every other rule: it runs in both directions, so a choice on either side narrows the other.'

/* ---------------------------------------------------------- */
/* The component                                              */
/* ---------------------------------------------------------- */

export interface NewRuleSentenceProps {
  /** the pane opens the rule it just added */
  onAdded?: (id: string) => void
  /** the heading over the builder. Defaults to the pane's own words;
   *  a module names its own subject — "Write a rule for Boats" — so
   *  the sentence a person is about to write says where they are. */
  title?: string
  /** the columns the sentence may name — see `RuleSentenceProps`. */
  conceptKeys?: ReadonlySet<string>
}

export function NewRuleSentence({
  onAdded,
  title = 'Write a new rule',
  conceptKeys,
}: NewRuleSentenceProps): ReactElement | null {
  const ctx = useSentenceCtx()
  const [draft, setDraft] = useState<ConstraintDef | null>(() => makeDraft(ctx))
  const [from, setFrom] = useState<StartingPoint | null>(null)

  useEffect(() => {
    setDraft((current) =>
      current && draftStillValid(current, ctx) ? current : makeDraft(ctx),
    )
  }, [ctx])

  /* WHAT THE PRICE FILE ASSERTS, READ AGAINST THIS SHEET. A module
     narrows the sentence to its own columns, so it narrows the offers
     too: a rule about trailers is not a starting point on the page
     about boats, and offering it there would be a door to nowhere. */
  const offers = useMemo(() => {
    const all = startingPoints(ctx)
    if (!conceptKeys) return all
    return all.filter((o) => o.columns.every((c) => conceptKeys.has(c.key)))
  }, [ctx, conceptKeys])

  const counted = useMemo(() => tally(offers), [offers])

  const pick = useCallback(
    (offer: StartingPoint) => {
      const next = draftFrom(offer, ctx)
      if (!next) return
      setDraft(next)
      setFrom(offer)
    },
    [ctx],
  )

  /* THE CATALOGUE IS A PAGE ACTION, AND IT GOES ON THE BAR.
     It is withheld entirely when this sheet is not the one those rules
     were read out of: every offer reporting a column the sheet does not
     have is not a catalogue, it is sixteen rows of somebody else's
     business. */
  const bar = useMemo<ActionGroup[] | null>(() => {
    if (counted.total === 0 || counted.points + counted.crossKind === 0) return null
    return [
      {
        id: 'cn-start',
        rank: 40,
        items: [
          {
            kind: 'panel',
            id: 'cn-start-panel',
            label: 'From the price file',
            at: `${counted.points} of ${counted.total}`,
            icon: Article,
            panelLabel: 'From the price file',
            panelSay: `${counted.total} rules read out of the workbooks. ${counted.points} name columns this sentence can be pointed at; the rest say what stops them.`,
            closeOnAct: true,
            content: <StartingPointList offers={offers} onPick={pick} />,
          },
        ],
      },
    ]
  }, [counted, offers, pick])

  useActionBar('constraints-new-rule', bar)

  /* THE MEASUREMENT COSTS A ROW WALK, SO IT IS TAKEN ONLY WHEN THE
     SENTENCE CHANGES. `previewConstraint` reads every row of every
     table the sentence reaches — 810 boats, 444 trailers, and up to
     eleven thousand rows where a column name is shared across
     thirty-one tables. Typing in the reason field makes a new draft
     OBJECT on every keystroke while leaving `if` and `then` untouched,
     so the two clause groups are the dependency and the whole reason
     is not: the transforms in `edit.ts` return new groups only when a
     word of the sentence actually changed. */
  const preview = useMemo(
    () => (draft ? previewConstraint(draft, ctx) : null),
    [draft?.if, draft?.then, draft?.kind, ctx],
  )

  if (!draft || !preview) return null

  const missing = missingChoice(draft, ctx)
  const ready = missing === null

  /* THE CITATION COMES OFF THE SCREEN THE MOMENT IT STOPS BEING TRUE.
     Re-point a column and the sentence is no longer the one the offer
     opened, so a block still saying "started from S1" would be
     describing a rule that is not there. */
  const started = from && stillFrom(from, draft, ctx) ? from : null

  const blank = (): void => {
    setDraft(makeDraft(ctx))
    setFrom(null)
  }

  const add = (): void => {
    if (!ready) return
    const added = createConstraint({
      kind: inferKind(draft),
      if: draft.if,
      ...(draft.then ? { then: draft.then } : {}),
      because: draft.because.trim() || autoBecause(draft, ctx),
      why: AUTO_WHY,
    })
    blank()
    onAdded?.(added.id)
  }

  return (
    <section className="cn-new">
      <header className="cn-new-head">
        <span className="cn-new-mark">
          <Plus size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />
        </span>
        <h3 className="cn-new-title">{title}</h3>
        <p className="cn-new-cap">{NEW_RULE_CAPTION}</p>
      </header>

      {started ? (
        <StartedFrom offer={started} tables={preview.tables.length} onBlank={blank} />
      ) : (
        counted.points > 0 && (
          <p className="cn-new-offer">
            Your price file already asserts {counted.total}{' '}
            {plural(counted.total, 'rule', 'rules')}, and {counted.points} of them name columns
            this sentence can be pointed at. <b>From the price file</b> on the bar opens all{' '}
            {counted.total}, each with what stops it or what it can start.
          </p>
        )
      )}

      <RuleSentence
        constraint={draft}
        editable
        big
        onChange={setDraft}
        conceptKeys={conceptKeys}
      />

      <ColumnNotes concepts={preview.concepts} />

      <p className="cn-because is-editing">
        <label className="cn-because-kw" htmlFor="cn-new-because">
          because
        </label>
        <input
          id="cn-new-because"
          className="cn-because-input"
          value={draft.because}
          placeholder={BECAUSE_PLACEHOLDER}
          onChange={(e) => setDraft({ ...draft, because: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
      </p>

      <ConsequenceMeter preview={preview} />

      <div className="cn-new-foot">
        <button
          type="button"
          className="cn-add"
          onClick={add}
          disabled={!ready}
          /* the reason is beside the button and readable — never a
             tooltip, and never a disabled control with no explanation */
          aria-describedby={ready ? undefined : 'cn-new-why'}
        >
          Add rule
        </button>
        {!ready && (
          <span className="cn-new-why" id="cn-new-why">
            {missing}
          </span>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* Where the sentence was started from                        */
/* ---------------------------------------------------------- */

/** THE PROVENANCE, AND THE HALF OF IT THIS SURFACE CANNOT KEEP.
 *
 *  It would be easy, and wrong, to draw this as "S1 is now a rule".
 *  None of the sixteen can be stated as a ConstraintDef today —
 *  `workbookRules.ts` says so in its own header and names the contract
 *  each one is waiting on. So the block says exactly what happened: the
 *  sentence has been pointed at the columns that rule is about, the
 *  words below are the person's own, and here is the adjudicator's line
 *  on why the rule itself is not written here, with the citation it
 *  rests on. */
function StartedFrom({
  offer,
  tables,
  onBlank,
}: {
  offer: StartingPoint
  tables: number
  onBlank: () => void
}): ReactElement {
  const n = offer.columns.length
  return (
    <aside className="cn-from">
      <p className="cn-from-label">STARTED FROM {offer.seed.ref}</p>
      <p className="cn-from-says">{offer.seed.statement}</p>
      <p className="cn-from-note">
        The sentence is pointed at the {n === 1 ? 'column' : `${n} columns`} it names, on{' '}
        {tables} of your {plural(tables, 'table', 'tables')}. The verbs and the values below are
        yours — the price file&rsquo;s own rule is not written here, and this is why.
      </p>
      {offer.seed.plainly !== undefined && (
        <p className="cn-from-plainly">{offer.seed.plainly}</p>
      )}
      {/* THE PROVENANCE LINE IS ONE THING, and it is `.cn-wb-src` —
          mono, 11px, wrapping so a cell address can actually be looked
          up. The workbook list and both theme bands already share it;
          a fourth copy would guarantee two of them eventually differ. */}
      <p className="cn-wb-src">{offer.seed.source}</p>
      <button type="button" className="cn-from-blank" onClick={onBlank}>
        Start from a blank sentence instead
      </button>
    </aside>
  )
}

/* ---------------------------------------------------------- */
/* What the columns are, in the workbook's own words          */
/* ---------------------------------------------------------- */

/** A dealer's column names are shorthand for cells in a spreadsheet
 *  they know — "Max HP" is `Boat Module!KW`, and "Min HP" is the cell
 *  beside it. Naming the wrong one is silent, and this is the only
 *  thing on the screen that can say which is which. The description is
 *  the importer's, not this file's: absent means the column was drawn
 *  here rather than read out of a workbook, and then there is nothing
 *  honest to print. */
function ColumnNotes({ concepts }: { concepts: ColumnConcept[] }): ReactElement | null {
  if (concepts.length === 0) return null
  return (
    <ul className="cn-cols">
      {concepts.map((c) => (
        <li key={c.key} className="cn-col">
          <span className="cn-col-name">{c.name}</span>
          <span className="cn-col-where">
            on {c.tableIds.length} {c.kind} {plural(c.tableIds.length, 'table', 'tables')}
          </span>
          {c.desc !== undefined && <span className="cn-col-desc">{c.desc}</span>}
        </li>
      ))}
    </ul>
  )
}
