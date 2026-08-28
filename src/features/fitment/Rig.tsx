/* ============================================================
   THE RIG, DRAWN — the solver on screen.

   > "not offered on this rig: the Sea Ranger 499 is rated to 70 hp"

   WHAT WAS WRONG. `src/lib/configure` is an arc-consistency solver
   that records THE REASON at the moment an option is removed, and
   the whole app called `solve()` exactly nowhere. The reasoning was
   real, tested, and invisible — behind a sentence editor that can
   author a rule and a fitment page that can count pairings, neither
   of which ever ran one against a boat.

   ── THE FOUR THINGS THIS SURFACE IS FOR ───────────────────────

     1 · AN OPTION THAT STOPS FITTING DOES NOT DISAPPEAR. It stays
         exactly where it was, drawn as refused, with its price
         struck and the reason beside it. A dealer standing in front
         of a customer needs to see that the F150 EXISTS and why
         they cannot have it — a list that silently shortens teaches
         them the catalogue is smaller than it is.
     2 · THE REASON IS THE RULE'S OWN WORDS. Nothing on this page
         composes a refusal sentence. Every one is
         `ConstraintDef.because`, carried out of `explain()` or
         `warningsFor()` by `rigReading.ts` and printed here verbatim; a
         rule authored without one prints its own sentence through
         `describeConstraint`, which is the same words the rules
         page shows. There is no third wording anywhere.
     3 · CHANGING THE HULL RE-PROPAGATES, IN PLACE. A catalogue row
         whose verdict changes does not vanish from one list and
         appear in another — it MOVES, on `SPRING`, transform and
         opacity only, inside the 200–500ms band a state change gets.
         The option tiles do not move at all, because they never
         reorder; their state change is carried by a CSS transition,
         which is what owns a state change here. `stillness` switches
         both off for a person who asked their operating system for
         less motion, and while a caret is in either search box.
     4 · A REFUSAL IS NEVER A DEAD CONTROL. A refused option is not
         a disabled button, it is a STATEMENT — a span, with its
         reason, that was never pressable. DESIGN_PRINCIPLES rule 10
         says a thing that cannot be done says why, where it is, and
         a greyed-out chip with a tooltip is the failure that rule
         was written about.

   ── WHY THE COLUMNS ARE HIDDEN UNTIL YOU ASK ──────────────────

   Measured on the Northside seed: 63 columns across the catalogues
   one hull draws from hold few enough live values to be a menu, and
   93 more hold too many. Drawing all 63 would bury the one or two
   the business actually wrote a rule about under sixty-one it did
   not. So the rig leads with the columns a rule in force READS —
   that is `RigSlot.narrowed`, a fact about the rules rather than a
   guess — plus anything a person has set, and says in one line how
   many more there are. Nothing is removed; one press shows every one
   of them, and both figures are counted on render so neither can go
   stale the way the two in this paragraph would.

   ── AND WHAT IT SAYS WHEN THE BUSINESS HAS STATED NO RULE ─────

   The truth, in one sentence, with the door: a rig is exactly as
   narrow as the rules the business has written, and on a fresh
   price file that is not narrow at all. Inventing a demonstration
   rule to make this screen look clever would be inventing business,
   which is the one thing this app may never do.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowsClockwise,
  Check,
  MagnifyingGlass,
  Prohibit,
  Warning,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { accentVar } from '@/types/model'
import type { CellValue } from '@/types/model'
import { TableKindSymbol } from '@/features/tablekit'
import { kindNoun, leafNoun } from '@/features/table/grouping'
import { describeConstraint, useConstraints } from '@/features/constraints'
import { searchReach } from '@/features/curation'
import { SPRING, SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
import { describeChange } from '@/lib/configure'
import type { SolveState } from '@/lib/configure'
import type { FieldDef } from '@/types/model'
import type { FanReading } from './reading'
import {
  DRAW_CAP,
  readRig,
  readStarters,
  type OptionState,
  type RigCandidate,
  type RigCatalogue,
  type RigSlot,
  type RigStarter,
} from './rigReading'

/** Hulls drawn in the picker before it asks you to type. 810 rows is
 *  a search, not a list, and the box above reaches all of them. */
const HULLS_DRAWN = 40

const n = (v: number): string => v.toLocaleString()

/* WRITTEN OUT, NEVER INTERPOLATED — `check-styles` trusts a string
   literal inside a className and nothing else, and a class it cannot
   read is a class nobody notices going unstyled. */
const optClass = (state: OptionState): string => {
  if (state === 'refused') return 'rg-opt is-refused'
  if (state === 'flagged') return 'rg-opt is-flagged'
  if (state === 'chosen') return 'rg-opt is-chosen'
  return 'rg-opt'
}

/** "It has taken nothing off this rig." — written out per case rather
 *  than assembled from three ternaries, because the assembled version
 *  shipped "None of them have taken something off this rig" for a
 *  single rule that fired nothing, and a page arguing for precision
 *  cannot be caught disagreeing with itself about a count of one. */
function ranSentence(inForce: number, fired: number): string {
  if (fired === 0) {
    return inForce === 1
      ? 'It has taken nothing off this rig'
      : 'None of them has taken anything off this rig'
  }
  if (inForce === 1) return 'It has taken something off this rig'
  if (fired === inForce) return 'Every one of them has taken something off this rig'
  return `${n(fired)} of them ${fired === 1 ? 'has' : 'have'} taken something off this rig`
}

const rowClass = (verdict: RigCandidate['verdict']): string => {
  if (verdict === 'refused') return 'rg-row is-refused'
  if (verdict === 'flagged') return 'rg-row is-flagged'
  return 'rg-row'
}

export interface RigProps {
  /** the fan-out, so the catalogues under a hull are the ones the
   *  price file already pairs its table with */
  reading: FanReading
}

export function Rig({ reading }: RigProps): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const constraints = useConstraints()
  const { still } = useStillness()

  const [hull, setHull] = useState<{ tableId: string; rowId: string } | null>(null)
  const [picking, setPicking] = useState(false)
  const [hullQuery, setHullQuery] = useState('')
  const [chosen, setChosen] = useState<Record<string, CellValue>>({})
  const [showEvery, setShowEvery] = useState(false)
  const [openCatalogue, setOpenCatalogue] = useState<string | null>(null)
  const [catalogueQuery, setCatalogueQuery] = useState('')
  const [note, setNote] = useState('')

  const project = useMemo(() => ({ entities, rowsByEntity }), [entities, rowsByEntity])
  const starters = useMemo(() => readStarters(project, reading), [project, reading])

  const rig = useMemo(
    () => readRig({ project, constraints, reading, hull, chosen }),
    [project, constraints, reading, hull, chosen],
  )

  /* WHAT THE LAST PRESS DID, IN THE ENGINE'S OWN SENTENCE.
     `describeChange` compares two solves and says what settled and
     what was ruled out — the thing that makes a propagating engine
     feel helpful rather than spooky. It is only ever computed from
     the solve that just happened against the one before it; nothing
     here reconstructs it.

     IT IS ASKED ABOUT THE CHOICES ONLY, and that is a correction
     rather than a tidy-up. Handed every column, a change of hull
     reported the new boat's own cells as though a rule had worked
     them out: "Settled deadrise ° to 26 … ruled out RU230KAM for
     model". Nothing decided any of that — the row simply says so —
     and a note that claims credit for reading a cell is the kind of
     confidently wrong sentence §7 forbids. The slots are the columns
     somebody could still answer, so they are the only ones a
     propagation can honestly be reported about. */
  const lastSolve = useRef<{ state: SolveState; fields: FieldDef[] } | null>(null)
  const lastTouched = useRef<string | undefined>(undefined)
  const noteFields = useMemo(() => {
    const ids = new Set(rig.slots.map((s) => s.fieldId))
    return rig.fields.filter((f) => ids.has(f.id))
  }, [rig])
  useEffect(() => {
    const before = lastSolve.current
    lastSolve.current = { state: rig.state, fields: noteFields }
    if (!before || rig.hull === null) {
      setNote('')
      return
    }
    setNote(describeChange(before.state, rig.state, noteFields, lastTouched.current))
  }, [rig, noteFields])

  /* the first catalogue a rule reaches opens itself, because that is
     the one with something to show; otherwise the heaviest one */
  useEffect(() => {
    if (rig.catalogues.length === 0) {
      setOpenCatalogue(null)
      return
    }
    setOpenCatalogue((current) => {
      if (current && rig.catalogues.some((c) => c.tableId === current)) return current
      const lively = rig.catalogues.find((c) => c.refused > 0 || c.flagged > 0)
      return (lively ?? rig.catalogues[0]).tableId
    })
  }, [rig.catalogues])

  const subjectNoun =
    (reading.subjectKind ? kindNoun(reading.subjectKind) : null) ?? leafNoun(undefined)

  const hulls = useMemo(() => {
    const found = searchReach({
      pool: starters,
      offered: new Set(starters.map((s) => `${s.tableId}:${s.rowId}`)),
      idOf: (s: RigStarter) => `${s.tableId}:${s.rowId}`,
      hayOf: (s: RigStarter) => s.hay,
      term: hullQuery,
    })
    const matched = found.active ? found.within : starters
    return { matched, drawn: matched.slice(0, HULLS_DRAWN), searching: found.active }
  }, [starters, hullQuery])

  if (starters.length === 0) return null

  const pick = (key: string, value: CellValue, fieldId: string): void => {
    lastTouched.current = fieldId
    setChosen((prev) => {
      const next = { ...prev }
      if (Object.prototype.hasOwnProperty.call(next, key) && next[key] === value) delete next[key]
      else next[key] = value
      return next
    })
  }

  const takeHull = (starter: RigStarter): void => {
    lastTouched.current = undefined
    setHull({ tableId: starter.tableId, rowId: starter.rowId })
    setChosen({})
    setPicking(false)
    setHullQuery('')
    setCatalogueQuery('')
  }

  const narrowed = rig.slots.filter((s) => s.narrowed || s.chosen !== null)
  const quiet = rig.slots.length - narrowed.length
  const slots = showEvery ? rig.slots : narrowed

  return (
    <section className="rg" aria-label="One rig, solved">
      <header className="rg-head">
        <p className="rg-eyebrow">One at a time</p>
        <h3 className="rg-title">
          What still fits one {subjectNoun.one} — and what does not
        </h3>
        {/* THE LEGEND SURVIVED AND THE INSTRUCTIONS DID NOT. Two of
            the four sentences said what this section is and what
            pressing the picker below does — both of which the heading
            and the picker say for themselves. The one a person cannot
            work out by looking is what a struck-through row means, and
            that is all this is now: the mark, and where its reason
            sits. */}
        <p className="rg-lede">
          What stops fitting stays, struck through, with the rule&rsquo;s words.
        </p>
      </header>

      {/* ---- the hull ---- */}
      {rig.hull === null || picking ? (
        <HullPicker
          hulls={hulls.drawn}
          total={hulls.matched.length}
          pool={starters.length}
          searching={hulls.searching}
          noun={subjectNoun.one}
          query={hullQuery}
          onQuery={setHullQuery}
          onTake={takeHull}
          onCancel={rig.hull ? () => setPicking(false) : undefined}
          still={still}
        />
      ) : (
        <div
          className="rg-hull"
          style={{ '--rg-accent': accentVar(rig.hull.accent) } as CSSProperties}
        >
          <span className="rg-hull-mark">
            <TableKindSymbol kind={rig.hull.kind} size={ICON_SIZE.small} />
          </span>
          <span className="rg-hull-said">
            <span className="rg-hull-name">{rig.hull.label}</span>
            <span className="rg-hull-table">{rig.hull.tableName}</span>
          </span>
          {rig.hull.price === null ? null : (
            <span className="rg-hull-price">{money(rig.hull.price)}</span>
          )}
          <button type="button" className="rg-hull-change" onClick={() => setPicking(true)}>
            <ArrowsClockwise size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            <span>Another {subjectNoun.one}</span>
          </button>
        </div>
      )}

      {rig.hull === null ? null : (
        <div className="rg-body">
          {/* ---- what the rules read off it ---- */}
          {rig.facts.length === 0 ? null : (
            <ul className="rg-facts">
              {rig.facts.map((fact) => (
                <li className="rg-fact" key={fact.key} title={fact.desc ?? fact.name}>
                  <span className="rg-fact-name">{fact.name}</span>
                  <span className="rg-fact-value">{fact.value}</span>
                </li>
              ))}
            </ul>
          )}

          {/* ---- how much reasoning there was to do ---- */}
          <p className="rg-rules">
            {rig.rulesInForce === 0 ? (
              <>
                No business rule is in force, so nothing below is refused. A rig is exactly
                as narrow as the rules your business has written — write one on{' '}
                <b>Business rules</b> and it takes effect here the moment you finish the
                sentence.
              </>
            ) : (
              <>
                {rig.rulesInForce === 1
                  ? 'One rule is in force'
                  : `${n(rig.rulesInForce)} rules are in force`}
                .{' '}
                {ranSentence(rig.rulesInForce, rig.fired.length)}
                {rig.warnedBy.length > 0 ? (
                  <>
                    , and{' '}
                    {rig.warnedBy.length === 1
                      ? 'one has flagged'
                      : `${n(rig.warnedBy.length)} have flagged`}{' '}
                    something without removing it
                  </>
                ) : null}
                .
              </>
            )}
          </p>

          {/* ---- what the last press did ---- */}
          <AnimatePresence initial={false}>
            {note === '' ? null : (
              <motion.p
                className="rg-note"
                key={note}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: transitionFor(still, SPRING) }}
                exit={{ opacity: 0, y: -6, transition: transitionFor(still, SPRING_QUICK) }}
              >
                {note}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ---- a dead end, in the solver's own sentence ---- */}
          <AnimatePresence initial={false}>
            {rig.problems.length === 0 ? null : (
              <motion.ul
                className="rg-problems"
                key="problems"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: transitionFor(still, SPRING) }}
                exit={{ opacity: 0, y: -6, transition: transitionFor(still, SPRING_QUICK) }}
              >
                {rig.problems.map((problem) => (
                  <li className="rg-problem" key={`${problem.constraintId}|${problem.message}`}>
                    <Prohibit size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
                    <span>{problem.message}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* ---- the choices ---- */}
          {slots.length === 0 ? null : (
            <ul className="rg-slots">
              {slots.map((slot) => (
                <Slot
                  key={slot.key}
                  slot={slot}
                  onPick={(value) => pick(slot.key, value, slot.fieldId)}
                  sentenceFor={(id) => sentenceOf(constraints, id)}
                />
              ))}
            </ul>
          )}

          {rig.slots.length === 0 ? null : (
            <p className="rg-quiet">
              {quiet === 0 ? (
                <>
                  Every column on these catalogues that could be a choice is drawn above.
                </>
              ) : (
                <>
                  {n(quiet)} more {quiet === 1 ? 'column holds' : 'columns hold'} few enough
                  live values to be a choice, and no rule in force reads{' '}
                  {quiet === 1 ? 'it' : 'them'}.
                </>
              )}
              {rig.tooWide === 0 ? null : (
                <>
                  {' '}
                  {n(rig.tooWide)} {rig.tooWide === 1 ? 'column holds' : 'columns hold'} too
                  many different values to be a menu, so{' '}
                  {rig.tooWide === 1 ? 'it is' : 'they are'} left open rather than drawn as a
                  list nobody could read.
                </>
              )}
              {/* THE CONTROL ENDS THE PARAGRAPH. Put between the two
                  sentences it reads as a word in the middle of one,
                  and a person scanning for the way to see the rest
                  has to find a button inside prose. */}
              {quiet === 0 ? null : (
                <>
                  {' '}
                  <button
                    type="button"
                    className="rg-quiet-door"
                    aria-expanded={showEvery}
                    onClick={() => setShowEvery(!showEvery)}
                  >
                    {showEvery ? 'Show only what a rule reads' : 'Show every column'}
                  </button>
                </>
              )}
            </p>
          )}

          {/* ---- the catalogues, row by row ---- */}
          <ul className="rg-cats">
            {rig.catalogues.map((catalogue) => (
              <Catalogue
                key={catalogue.tableId}
                catalogue={catalogue}
                open={openCatalogue === catalogue.tableId}
                query={openCatalogue === catalogue.tableId ? catalogueQuery : ''}
                onQuery={setCatalogueQuery}
                onOpen={() => {
                  setOpenCatalogue(openCatalogue === catalogue.tableId ? null : catalogue.tableId)
                  setCatalogueQuery('')
                }}
                still={still}
                sentenceFor={(id) => sentenceOf(constraints, id)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The rule's own sentence, for a rule authored without words  */
/* ---------------------------------------------------------- */

/** A rule may be stored with an empty `because` — the rules pane
 *  leaves it blank until somebody writes it. The refusal still has to
 *  say WHY, so it falls back to the rule's own sentence, which is the
 *  same string the rules page prints. Nothing is composed here. */
function sentenceOf(
  constraints: ReturnType<typeof useConstraints>,
  constraintId: string,
): string {
  const found = constraints.find((c) => c.id === constraintId)
  return found ? describeConstraint(found) : ''
}

/* ---------------------------------------------------------- */
/* The hull picker                                             */
/* ---------------------------------------------------------- */

function HullPicker({
  hulls,
  total,
  pool,
  searching,
  noun,
  query,
  onQuery,
  onTake,
  onCancel,
  still,
}: {
  hulls: RigStarter[]
  total: number
  pool: number
  searching: boolean
  noun: string
  query: string
  onQuery: (v: string) => void
  onTake: (starter: RigStarter) => void
  onCancel?: () => void
  still: boolean
}): ReactElement {
  return (
    <div className="rg-pick">
      <div className="rg-pick-bar">
        <label className="rg-pick-search">
          <MagnifyingGlass size={ICON_SIZE.small} aria-hidden="true" />
          <input
            className="rg-pick-input"
            type="search"
            value={query}
            placeholder={`Find a ${noun} by name…`}
            aria-label={`Find a ${noun} by name, across all ${n(pool)}`}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        {onCancel ? (
          <button type="button" className="rg-pick-cancel" onClick={onCancel}>
            Keep the one I have
          </button>
        ) : null}
      </div>

      {hulls.length === 0 ? (
        <p className="rg-pick-none">
          Nothing on your sheet matches &ldquo;{query.trim()}&rdquo;. It searches all{' '}
          {n(pool)}.
        </p>
      ) : (
        <ul className="rg-pick-list">
          {hulls.map((starter, i) => (
            <motion.li
              className="rg-pick-item"
              key={`${starter.tableId}:${starter.rowId}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: transitionFor(still, i < 12 ? SPRING : SPRING_QUICK),
              }}
            >
              <button type="button" className="rg-pick-row" onClick={() => onTake(starter)}>
                <span
                  className="rg-pick-rail"
                  aria-hidden="true"
                  style={{ '--rg-accent': accentVar(starter.accent) } as CSSProperties}
                />
                <span className="rg-pick-name">{starter.label}</span>
                <span className="rg-pick-table">{starter.tableName}</span>
                {starter.price === null ? null : (
                  <span className="rg-pick-price">{money(starter.price)}</span>
                )}
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <p className="rg-pick-more">
        {searching ? (
          <>
            {n(total)} of {n(pool)} match
            {total > hulls.length ? <> · {n(total - hulls.length)} more not drawn</> : null}
          </>
        ) : (
          <>
            {n(hulls.length)} of {n(pool)} drawn — type above to reach the rest
          </>
        )}
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* One column of choices                                       */
/* ---------------------------------------------------------- */

function Slot({
  slot,
  onPick,
  sentenceFor,
}: {
  slot: RigSlot
  onPick: (value: CellValue) => void
  sentenceFor: (constraintId: string) => string
}): ReactElement {
  return (
    <li className={slot.narrowed ? 'rg-slot is-narrowed' : 'rg-slot'}>
      <p className="rg-slot-head">
        <span className="rg-slot-name" title={slot.desc ?? slot.name}>
          {slot.name}
        </span>
        <span className="rg-slot-where">{slot.tables.join(' · ')}</span>
        <span className="rg-slot-count">
          <b>{n(slot.open)}</b> of {n(slot.options.length)} left
        </span>
      </p>

      {/* NO SPRING ON A CHIP, AND THE REASON IS MEASURED. These tiles
          never REORDER — `optionsOf` hands back the column's own list
          and the refused ones keep their place, which is the whole
          point of the surface — so a `layout` animation here has
          nothing to move and still pays a layout read per element.
          At 415 tiles (this price file, every column shown) that cost
          about 1.5s of main thread for no motion at all. The state
          change is carried by the CSS transition on `.rg-opt`, which
          is what §4 says owns a state change anyway. The springs are
          spent where something genuinely moves: the catalogue rows. */}
      <ul className="rg-opts">
        {slot.options.map((option) => {
          /* A REFUSED OPTION WAS NEVER A CONTROL. It is a statement
             with its reason attached — see the header. A disabled
             button here is precisely the shape rule 10 forbids. */
          if (option.state === 'refused') {
            return (
              <li className={optClass(option.state)} key={option.key}>
                <span className="rg-opt-said">
                  <Prohibit size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  <span className="rg-opt-label">{option.label}</span>
                </span>
                <span className="rg-opt-why">
                  Not offered on this rig
                  {because(option.because, sentenceFor(option.constraintId))}
                </span>
              </li>
            )
          }
          const chosen = option.state === 'chosen'
          return (
            <li className={optClass(option.state)} key={option.key}>
              <button
                type="button"
                className="rg-opt-btn"
                aria-pressed={chosen}
                onClick={() => onPick(option.value)}
              >
                {chosen ? (
                  <Check size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                ) : null}
                {option.state === 'flagged' ? (
                  <Warning size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                ) : null}
                <span className="rg-opt-label">{option.label}</span>
              </button>
              {option.state === 'flagged' ? (
                <span className="rg-opt-why">
                  Offered, and something disagrees
                  {because(option.because, sentenceFor(option.constraintId))}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </li>
  )
}

/** The rule's clause, or — where it was authored without one — the
 *  rule itself. Never a sentence this file made up. */
function because(clause: string, sentence: string): ReactElement | null {
  const said = clause.trim() !== '' ? clause.trim() : sentence.trim()
  if (said === '') return null
  return (
    <>
      {clause.trim() !== '' ? ', because ' : ': '}
      {said}
    </>
  )
}

/* ---------------------------------------------------------- */
/* One catalogue, row by row                                   */
/* ---------------------------------------------------------- */

function Catalogue({
  catalogue,
  open,
  query,
  onQuery,
  onOpen,
  still,
  sentenceFor,
}: {
  catalogue: RigCatalogue
  open: boolean
  query: string
  onQuery: (v: string) => void
  onOpen: () => void
  still: boolean
  sentenceFor: (constraintId: string) => string
}): ReactElement {
  const found = searchReach({
    pool: catalogue.candidates,
    offered: new Set(catalogue.candidates.map((c) => c.rowId)),
    idOf: (c: RigCandidate) => c.rowId,
    hayOf: (c: RigCandidate) => c.hay,
    term: query,
  })
  const pool = found.active ? found.within : catalogue.candidates

  /* CAPPED PER VERDICT, DRAWN AS ONE LIST, and both halves of that
     matter.

     PER VERDICT, because 154 refusals under 55 rows that fit would
     put the interesting half below the fold — a refusal a person has
     to scroll two hundred rows to reach has not been shown to them.

     ONE LIST, because a row whose verdict changes has to MOVE rather
     than vanish from one list and appear in another. Three sibling
     <ul>s would unmount it and mount a new one, and `layout` cannot
     animate across a change of parent — the row would blink, which
     is the opposite of the claim this surface makes. */
  const bands = (['offered', 'flagged', 'refused'] as const).map((verdict) => {
    const all = pool.filter((c) => c.verdict === verdict)
    return { verdict, all, drawn: all.slice(0, DRAW_CAP) }
  })
  const drawn = bands.flatMap((band) => band.drawn)

  return (
    <li
      className={open ? 'rg-cat is-open' : 'rg-cat'}
      style={{ '--rg-accent': accentVar(catalogue.accent) } as CSSProperties}
    >
      <button type="button" className="rg-cat-door" aria-expanded={open} onClick={onOpen}>
        <span className="rg-cat-mark">
          <TableKindSymbol kind={catalogue.kind} size={ICON_SIZE.small} />
        </span>
        <span className="rg-cat-name">{catalogue.tableName}</span>
        <span className="rg-cat-n">
          <b>{n(catalogue.offered)}</b> of {n(catalogue.live)} offered
          {catalogue.flagged > 0 ? <> · {n(catalogue.flagged)} flagged</> : null}
          {catalogue.refused > 0 ? <> · {n(catalogue.refused)} refused</> : null}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!open ? null : (
          <motion.div
            className="rg-cat-body"
            key="body"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: transitionFor(still, SPRING) }}
            exit={{ opacity: 0, y: -8, transition: transitionFor(still, SPRING_QUICK) }}
          >
            <label className="rg-cat-search">
              <MagnifyingGlass size={ICON_SIZE.small} aria-hidden="true" />
              <input
                className="rg-cat-input"
                type="search"
                value={query}
                placeholder={`Find one in ${catalogue.tableName}…`}
                aria-label={`Find a row in ${catalogue.tableName}, offered or not`}
                onChange={(e) => onQuery(e.target.value)}
              />
            </label>

            {catalogue.narrowed ? null : (
              <p className="rg-cat-quiet">
                No rule in force reads a column on this table, so every one of its{' '}
                {n(catalogue.live)} live rows is offered.
              </p>
            )}

            {pool.length === 0 ? (
              <p className="rg-cat-none">
                Nothing on {catalogue.tableName} matches &ldquo;{query.trim()}&rdquo;. It
                searches every row, refused ones included.
              </p>
            ) : (
              <>
                <ul className="rg-rows">
                  {drawn.map((candidate) => (
                    <motion.li
                      className={rowClass(candidate.verdict)}
                      key={candidate.rowId}
                      layout={!still}
                      initial={false}
                      transition={transitionFor(still, SPRING)}
                    >
                      <span className="rg-row-said">
                        {candidate.verdict === 'refused' ? (
                          <Prohibit size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                        ) : null}
                        {candidate.verdict === 'flagged' ? (
                          <Warning size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                        ) : null}
                        <span className="rg-row-name">{candidate.label}</span>
                      </span>
                      {candidate.price === null ? (
                        <span className="rg-row-noprice">no price on this table</span>
                      ) : (
                        <span className="rg-row-price">{money(candidate.price)}</span>
                      )}
                      {candidate.reasons.length === 0 ? null : (
                        <span className="rg-row-why">
                          {/* THE CELL THE RULE READ, VERBATIM, so a
                              reader can check the verdict against their
                              own file rather than take it. */}
                          <span className="rg-row-cell">
                            {candidate.reasons[0].column} {candidate.reasons[0].value}
                          </span>
                          {because(
                            candidate.reasons[0].because,
                            sentenceFor(candidate.reasons[0].constraintId),
                          )}
                          {candidate.reasons.length > 1 ? (
                            <> · and {n(candidate.reasons.length - 1)} more</>
                          ) : null}
                        </span>
                      )}
                    </motion.li>
                  ))}
                </ul>
                {bands.map((band) =>
                  band.all.length <= band.drawn.length ? null : (
                    <p className="rg-band-more" key={band.verdict}>
                      {n(band.all.length - band.drawn.length)} more {band.verdict} and not
                      drawn — type above to reach them.
                    </p>
                  ),
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
