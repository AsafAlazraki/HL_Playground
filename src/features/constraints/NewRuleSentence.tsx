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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Article, ArrowsLeftRight, Plus } from '@phosphor-icons/react'
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
import { missingSlot, previewConstraint } from './state'
import { RuleSentence } from './RuleSentence'
import { ConsequenceMeter } from './ConsequenceMeter'
import { Provenance } from './Provenance'
import { StartingPointList } from './StartingPointList'
import { RelateTwoThings } from './RelateTwoThings'
import {
  draftFromBinding,
  relatablePairs,
  stillFromBinding,
  type BindingOffer,
  type RelatablePair,
} from './relate'
import { n } from './discoverSay'
import { draftFrom, startingPoints, stillFrom, tally, type StartingPoint } from './startingPoints'
import { BECAUSE_PLACEHOLDER } from './RuleCard'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

/* HALF OF THIS SAID WHAT THE CONTROL BELOW PLAINLY IS. "It reads as
   a sentence" describes the thing a person is looking at; the half
   worth 11px of the header is the one they cannot see, which is when
   it starts biting. */
export const NEW_RULE_CAPTION = 'It takes effect the moment you add it.'

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
  /** publish the two doors to the action bar. False while the
   *  composer is mounted but not on screen: Business rules draws it
   *  inside one of three views, and a bar carrying the verbs of a
   *  surface a person cannot see is clutter. Default true, so every
   *  other caller behaves exactly as it did. */
  showActions?: boolean
}

export function NewRuleSentence({
  onAdded,
  title = 'Write a new rule',
  conceptKeys,
  showActions = true,
}: NewRuleSentenceProps): ReactElement | null {
  const ctx = useSentenceCtx()
  const [draft, setDraft] = useState<ConstraintDef | null>(() => makeDraft(ctx))
  const [from, setFrom] = useState<StartingPoint | null>(null)
  /* WHERE THE THIRD DOOR LEFT THE SENTENCE. Two doors, two
     provenance blocks, and never both: whichever one opened the
     sentence last is the one describing it. */
  const [bound, setBound] = useState<{ offer: BindingOffer; pair: RelatablePair } | null>(null)

  /* THE REFUSAL POINTS AT ITSELF.
   *
   * Rule 10 asks a thing that cannot be done to say why, WHERE it is
   * refused, and this footer has always said why: "Choose a value for
   * Hull Length (mtr)." What it could not do was say WHERE — and the
   * sentence above it can run to a dozen words, half of them
   * underlined, in a composer set at 23px. So the reason is a control
   * now: press it and the cursor lands in the exact word, which
   * lights up for a moment so the eye follows the cursor rather than
   * hunting for it. The light is colour only, so reduced motion keeps
   * every bit of it. */
  const sentenceRef = useRef<HTMLDivElement>(null)
  const [sought, setSought] = useState<string | null>(null)
  const seekTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (seekTimer.current !== null) window.clearTimeout(seekTimer.current)
    },
    [],
  )

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
      setBound(null)
    },
    [ctx],
  )

  /* THE THIRD DOOR LANDS IN THE SAME SENTENCE. It answers no verb
     and no value — see `draftFromBinding`, which holds exactly the
     line `draftFrom` holds and for a harder reason: what was just
     read is a MEASUREMENT, and a measurement is not a rule this
     business stated. */
  const bind = useCallback(
    (offer: BindingOffer, pair: RelatablePair) => {
      const next = draftFromBinding(offer, ctx)
      if (!next) return
      setDraft(next)
      setFrom(null)
      setBound({ offer, pair })
    },
    [ctx],
  )

  /* WHICH TWO THINGS THIS PRICE FILE RELATES, counted off its own
     join tables. One pass over the join rows and no product column
     read — about 18 ms on the full seed — so it is affordable here,
     where the measurement behind the second step is not, and it is
     taken ONCE: the control on the bar counts them for its label and
     the panel below draws the same array. */
  const pairs = useMemo(
    () => relatablePairs({ entities: ctx.entities, rowsByEntity: ctx.rowsByEntity }),
    [ctx.entities, ctx.rowsByEntity],
  )

  /* THE DOORS ARE PAGE ACTIONS, AND THEY GO ON THE BAR, side by side
     in one group. They are two ways into the SAME sentence — the
     catalogue names the columns the workbooks' own rules are about,
     and the second names two things and lets the file say which
     column binds them — so a person may move between them, and the
     card below never grows a control that is used once and then
     charges the page its height all session.

     THE CATALOGUE IS WITHHELD when this sheet is not the one those
     rules were read out of: every offer reporting a column the sheet
     does not have is not a catalogue, it is sixteen rows of somebody
     else's business. The second door has no such dependency — it
     reads only what is loaded — so it stands either way and says, in
     place, when there is nothing to relate. */
  const bar = useMemo<ActionGroup[] | null>(() => {
    const items: ActionGroup['items'] = []

    if (counted.total > 0 && counted.points + counted.crossKind > 0) {
      items.push({
        kind: 'panel',
        id: 'cn-start-panel',
        label: 'From the price file',
        at: `${counted.points} of ${counted.total}`,
        icon: Article,
        panelLabel: 'From the price file',
        panelSay: `${counted.total} rules read out of your price file. ${counted.points} ${counted.points === 1 ? 'names a column' : 'name columns'} this sentence can be pointed at; the rest say what stops them.`,
        closeOnAct: true,
        content: <StartingPointList offers={offers} onPick={pick} />,
      })
    }

    items.push({
      kind: 'panel',
      id: 'cn-relate-panel',
      label: 'Relate two things',
      at: pairs.length > 0 ? `${n(pairs.length)} pairs` : 'none yet',
      icon: ArrowsLeftRight,
      panelLabel: 'Relate two things',
      panelSay:
        'Name two things your price file already pairs, and it will offer the columns that could bind them — each with how much of the far list it would keep, measured on the sheet you have loaded.',
      closeOnAct: true,
      content: (
        <RelateTwoThings
          pairs={pairs}
          tables={Object.keys(ctx.entities).length}
          conceptKeys={conceptKeys}
          onPick={bind}
        />
      ),
    })

    return items.length > 0 ? [{ id: 'cn-start', rank: 40, items }] : null
  }, [bind, conceptKeys, counted, ctx.entities, offers, pairs, pick])

  useActionBar('constraints-new-rule', showActions ? bar : null)

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

  const gap = missingSlot(draft, ctx)
  const ready = gap === null

  /** Put the cursor in the word the footer is talking about. The
   *  address is the sentence's own id for the token (`missingSlot`),
   *  written into the DOM by `Tokens`. */
  const seek = (): void => {
    const id = gap?.tokenId
    if (!id) return
    const host = sentenceRef.current?.querySelector<HTMLElement>(`[data-tok="${id}"]`)
    host?.querySelector<HTMLSelectElement | HTMLInputElement>('select, input')?.focus()
    setSought(id)
    if (seekTimer.current !== null) window.clearTimeout(seekTimer.current)
    seekTimer.current = window.setTimeout(() => setSought(null), 1600)
  }

  /* THE CITATION COMES OFF THE SCREEN THE MOMENT IT STOPS BEING TRUE.
     Re-point a column and the sentence is no longer the one the offer
     opened, so a block still saying "started from S1" would be
     describing a rule that is not there. */
  const started = from && stillFrom(from, draft, ctx) ? from : null
  const measured = bound && stillFromBinding(bound.offer, draft, ctx) ? bound : null

  const blank = (): void => {
    setDraft(makeDraft(ctx))
    setFrom(null)
    setBound(null)
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
      ) : measured ? (
        <MeasuredFrom bound={measured} onBlank={blank} />
      ) : (
        counted.points > 0 && (
          /* THE SECOND SENTENCE NAMED THE BUTTON BESIDE IT. "From the
             price file on the bar opens all N, each with what stops it
             or what it can start" is a caption for a control that is
             on screen, labelled, and counted — which is the door's own
             job. What is left is the fact a person cannot get from
             looking: how many of the file's rules this sentence could
             be pointed at.

             AND THE VERB AGREES NOW. It read "1 of them name columns"
             on the seeded file, where `counted.points` is 1. */
          <p className="cn-new-offer">
            Your price file already asserts {counted.total}{' '}
            {plural(counted.total, 'rule', 'rules')}; {counted.points} of them{' '}
            {plural(counted.points, 'names', 'name')} a column this sentence can be pointed at.
          </p>
        )
      )}

      {/* THE SENTENCE AND WHAT IT WOULD DO, SIDE BY SIDE.
          A rule is a claim about the whole catalogue, and until this
          split the reading of that claim sat below the fold of a
          2000px-wide column of form fields — you wrote the words, then
          scrolled to find out what they cost. Above `--cn-split` the
          words take a column suited to a sentence and the measurement
          takes a rail beside them, so every dropdown you change moves a
          bar you are already looking at.

          THE SENTENCE KEEPS ITS OWN RAIL INSIDE THE SPLIT. `.cn-new-say`
          is both the accent rail that says "this is the thing being
          written" and the element `sentenceRef` addresses, so the
          footer's "Take me to it" still finds the token it names. The
          split moves that wrapper into the work column; it does not
          flatten it.

          THE FOOT IS OUTSIDE THE SPLIT ON PURPOSE. Narrow, this reads
          in exactly the order it always did — sentence, columns,
          because, measurement, Add — and the button that commits stays
          the last thing on the card at every width. */}
      <div className="cn-new-split">
        <div className="cn-new-work">
          <div className="cn-new-say" ref={sentenceRef}>
            <RuleSentence
              constraint={draft}
              editable
              big
              onChange={setDraft}
              conceptKeys={conceptKeys}
              soughtTokenId={sought}
            />
          </div>

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
        </div>

        <aside className="cn-new-effect" aria-label="What this rule would do">
          <ConsequenceMeter preview={preview} />
        </aside>
      </div>

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
        {gap !== null &&
          (gap.tokenId !== null ? (
            <button type="button" className="cn-new-why is-seek" id="cn-new-why" onClick={seek}>
              <span className="cn-new-why-say">{gap.say}</span>
              <span className="cn-new-why-go">Take me to it</span>
            </button>
          ) : (
            /* no clause on that side at all, so there is no word on
               screen to put a cursor in — say why and stop there */
            <span className="cn-new-why" id="cn-new-why">
              {gap.say}
            </span>
          ))}
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
      <Provenance text={offer.seed.source} />
      <button type="button" className="cn-from-blank" onClick={onBlank}>
        Start from a blank sentence instead
      </button>
    </aside>
  )
}

/* ---------------------------------------------------------- */
/* Where the sentence was measured from                       */
/* ---------------------------------------------------------- */

/** THE THIRD DOOR'S PROVENANCE, AND THE HALF IT CANNOT KEEP EITHER.
 *
 *  What a person just read was a MEASUREMENT across two kinds of
 *  table — a trailer's column against a boat's — and a
 *  `ConstraintDef` sentence talks about one kind at a time
 *  (`state.tablesFor` keeps only tables carrying every column the
 *  sentence names, so a two-kind sentence reaches none). So this
 *  block says exactly what happened: the sentence is pointed at the
 *  column that was chosen, every verb and value below is the
 *  person's, and the comparison itself is not written here — with
 *  the figures it was chosen on, and the cell the column was read
 *  out of.
 *
 *  IT CARRIES NO REASON ACROSS. `draftFromBinding` leaves `because`
 *  empty on purpose: the candidate's own reason is the measurement
 *  of the cross-kind claim, and attaching it to a sentence that is
 *  not that claim would be a justification belonging to a different
 *  rule — the most convincing kind of wrong. */
function MeasuredFrom({
  bound,
  onBlank,
}: {
  bound: { offer: BindingOffer; pair: RelatablePair }
  onBlank: () => void
}): ReactElement {
  const { offer, pair } = bound
  const far = pair.partner.label.toLowerCase()
  return (
    <aside className="cn-from">
      <p className="cn-from-label">MEASURED ON YOUR PRICE FILE</p>
      <p className="cn-from-says">
        <span className="cn-fig">
          {offer.kept !== null && offer.catalogue !== null
            ? `${n(offer.kept)} of ${n(offer.catalogue)}`
            : offer.holds}
        </span>{' '}
        {far} stay standing when {offer.name} decides, {offer.against}.
      </p>
      <p className="cn-from-note">
        The sentence is pointed at <b>{offer.name}</b> on your {pair.partner.label} tables. The
        verbs and the values below are yours. What was measured runs between your{' '}
        {pair.subject.label} and your {pair.partner.label}, and one sentence talks about one kind
        of table at a time — so the comparison itself is not written here.
      </p>
      <p className="cn-from-plainly">
        {offer.holds} pairings your price file writes hold it.
      </p>
      {offer.desc !== undefined && <p className="cn-wb-src">{offer.desc}</p>}
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
    <section className="cn-cols-block">
      {/* THE LIST HAD NO HEADING, and without one a stack of cell
          addresses under a sentence reads as debris the composer
          left behind rather than as the answer to the question
          somebody is actually asking: which "Max HP" is this. It
          also names the REACH, because one column is one column
          wherever it appears and the rule will bite on every table
          of that kind — which the sentence itself never says. */}
      <p className="cn-cols-label">
        {concepts.length === 1 ? 'The column it names' : 'The columns it names'}
      </p>
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
    </section>
  )
}
