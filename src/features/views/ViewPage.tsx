/* ============================================================
   THE VIEW PAGE — "for this thing, what else goes with it?"

   Read mode is the default and is COMPLETELY CLEAN: the thing's
   name and its specs, then one quiet block per related table.
   Nothing on it exists for the person who built it — it is a page
   you would put in front of a customer.

   One control: the ⚙ in the top-right. It does not open a screen
   and it does not open a form that represents this page. It grows
   handles on the drawing already in front of you, and pressing it
   again takes them away. THE USER NEVER LEAVES THE PAGE THEY ARE
   CONFIGURING.

   Drag a table in from the panel and we look at both tables and
   offer a rule in one English sentence, with three buttons. Until
   one of them is pressed, NOTHING has been created: no block, no
   rule, and above all no join table.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Gear, Plus, Warning, X } from '@phosphor-icons/react'
import {
  accentVar,
  isDiscontinued,
  isRetired,
  rowLabel,
  type CellValue,
  type ClauseGroup,
  type EntityDef,
  type RowData,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { usePageActions, type ActionButton } from '@/lib/actions'
import {
  bandOf,
  defaultColumns,
  formatCell,
  formatRange,
  rangePairs,
  splitUnit,
  withoutCosts,
} from './columns'
import {
  isCuratedOnly,
  levelCaption,
  levelOptions,
  levelValues,
  oneOf,
  rowsInScope,
  singular,
} from './describe'
import { findJoinTable, makeEngine, type Ctx } from './pairs'
import { retiredTablesSentence, withheldNotes } from './sellable'
import { addBlock, setBlockRule, useViewDef, walkBlocks } from './viewDefs'
import { BlockCard, type PendingDrop } from './BlockCard'
import { RuleOffer } from './RuleOffer'
import { KindMark } from './marks'
import { HeroPicture, hasPicture } from './pictures'
import { readRig, type RigPrice } from './rollup'
import { SPRING, transitionFor, useStillness } from './stillness'
import { isTableDrag, readTableDrag } from './dnd'
import './views.css'

export interface ViewPageProps {
  viewId: string
  rowId: string
}

/** Drop a sentence's leading capital without flattening the names inside
 *  it — "All variants in SP560" must not become "…in sp560". */
const uncapitalise = (s: string): string =>
  s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s

/* The stillness provider used to live here. It is now mounted once at
   the app root (`src/App.tsx`) — the policy belongs to the person, not
   to this page — so this component is the body and nothing else. */
export function ViewPage(props: ViewPageProps): ReactElement {
  return <ViewPageBody {...props} />
}

/** The DOM id of one block, in one place — the ledger writes it into
 *  an anchor and the block wears it, so a rename cannot separate a
 *  line from the block it points at. */
const blockAnchor = (blockId: string): string => `vw-block-${blockId}`

/* ============================================================
   THE PAGE'S OWN PRIMARY, READ FROM THE ONE REGISTER THAT OWNS IT.

   "Quote this one" is the most consequential press in the app: it
   turns the rig a salesperson has just configured into a document.
   It lives on the action bar, which is furniture fixed to the
   window — and the figure it produces is stated at the top of THIS
   page, in the rig panel, half a screen away from the button.

   So the panel draws the same action at the foot of the total it is
   about. NOT A SECOND BUTTON: it is the same `ActionButton` record,
   read out of `@/lib/actions`, so the label, the accessible name,
   the icon, the refusal sentence and the handler are whatever the
   stage published. Rename it on the bar and this follows; retract it
   — a page with no row open, a page mounted where quoting is not
   offered — and this disappears with it. There is no way for the two
   to disagree, because there is only one of them.

   WHY IT IS NOT SIMPLY IMPORTED FROM `@/features/quote`. That would
   make this feature depend on the quote's own door and on the shell
   that navigates to it, and `quote/freeze.ts` already imports three
   modules from here — the barrel is a cycle. The register is
   `src/lib`, which both sides already reach for.

   THE ID IS PREFERRED AND THE TONE IS THE FALLBACK, so a stage that
   renames its action keeps its door and one that has not published
   yet simply has none. §1's "one primary" is kept: this and the bar
   are one action, drawn where the money is.
   ============================================================ */
function usePrimaryDoor(): ActionButton | null {
  const groups = usePageActions()
  return useMemo(() => {
    let fallback: ActionButton | null = null
    for (const group of groups) {
      for (const item of group.items) {
        if (item.kind !== 'button' || item.tone !== 'primary') continue
        if (item.id === 'vw-quote') return item
        if (!fallback) fallback = item
      }
    }
    return fallback
  }, [groups])
}

/* ---------------------------------------------------------- */

function ViewPageBody({ viewId, rowId }: ViewPageProps): ReactElement {
  const view = useViewDef(viewId)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const { still } = useStillness()

  const [configuring, setConfiguring] = useState(false)
  const [picking, setPicking] = useState(false)
  const [pending, setPending] = useState<PendingDrop | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [scope, setScope] = useState<number | undefined>(undefined)
  const seq = useRef(0)

  const ctx: Ctx = useMemo(() => ({ entities, rowsByEntity }), [entities, rowsByEntity])
  const engine = useMemo(() => makeEngine(ctx), [ctx])

  const root: EntityDef | undefined = view ? entities[view.rootTableId] : undefined
  const row: RowData | undefined = useMemo(
    () => (root ? (rowsByEntity[root.id] ?? []).find((r) => r.id === rowId) : undefined),
    [root, rowsByEntity, rowId],
  )

  const levels = useMemo(() => (root && row ? levelOptions(root, row) : []), [root, row])
  const deepest = levels.length > 0 ? levels[0].scope : undefined

  /* the rows a decision lands on: this one, or every row of the level
     chosen in the header. Computed once, here, so a block never has to
     work out what "all variants in SP560" means. */
  const appliesTo = useMemo(
    () =>
      root && row ? rowsInScope(root, rowsByEntity[root.id] ?? [], row, scope ?? deepest) : [],
    [root, row, rowsByEntity, scope, deepest],
  )

  /* THE SAME TABLES THE DRAG OFFERS, as a list that can be clicked.
     Dragging a table across the window was the ONLY way to put one on a
     page — one gesture, no keyboard, and nothing to try when it missed.
     The drag is now the shortcut, not the door. */
  const addable = useMemo<EntityDef[]>(() => {
    if (!view || !root) return []
    const taken = new Set(view.blocks.map((b) => b.tableId))
    return Object.values(entities)
      .filter(
        (e) =>
          e.role !== 'join' &&
          e.id !== root.id &&
          !taken.has(e.id) &&
          /* A RETIRED TABLE IS NEVER OFFERED as something that goes
             with this one. It stays on the sheet — an old quote was
             written against it — but this is a page a customer reads. */
          !isRetired(e),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entities, view, root])

  /** How many were left out of that list because they are history
   *  rather than stock. Said out loud under the list, so a person who
   *  can see the table in the panel behind this page is never left
   *  wondering whether the app lost it. */
  const retiredCount = useMemo(() => {
    if (!view || !root) return 0
    const taken = new Set(view.blocks.map((b) => b.tableId))
    return Object.values(entities).filter(
      (e) => e.role !== 'join' && e.id !== root.id && !taken.has(e.id) && isRetired(e),
    ).length
  }, [entities, view, root])

  /* WHAT THIS PAGE HELD BACK BEFORE IT DREW ANYTHING, in words.

     A block holds its own retired rows back and says so in its own
     header. But `existingRelations` refuses a retired table, and a
     retired join, BEFORE a block is ever seeded. Measured on Surtees -
     620 Game Fisher: six relations in the store, five blocks on the
     screen, and not one word about the sixth — "Surtees × OBSOLETE
     Trailers", whose table is retired too. `BlockCard`'s heldNote
     could not fire: it only runs for a block, and there was none.

     SO THE SENTENCE COMES FROM THE PAGE. It belongs to whatever
     answers "what else goes with this one", and with no block to
     carry it that is the page itself — the same place the picker
     already owns `retiredTablesSentence` for the tables it did not
     offer. It sits at the end of the blocks because it is the tail of
     that same answer, and it uses `sellable.ts`'s sentences verbatim
     so the page and its blocks say it in one voice.

     A relation somebody has ALREADY put on this page is skipped: the
     block draws it and BlockCard says it, and twice is worse than
     once. Nothing here filters, deletes or re-decides — `isRetired`
     is still the only judge, upstream, in `relations.ts`. */
  const withheld = useMemo(() => {
    if (!view || !root) return []
    return withheldNotes(
      entities,
      root.id,
      new Set(walkBlocks(view).map((b) => b.block.tableId)),
    )
  }, [entities, view, root])

  /* ── WHAT THIS RIG COMES TO, AND WHY IT IS ON THIS PAGE ───────

     The three numbers a salesperson is asked for in the first minute
     — the hull, the motor, the trailer — were all on this screen and
     none of them was added up. `readRig` does the arithmetic in one
     place and, crucially, chooses the rows THE QUOTE WOULD CHOOSE:
     the star where there is one, a single pick where there is not,
     and nothing at all where a person still has a choice to make.
     So the figure in the header is the figure QUOTE THIS ONE will
     produce, and a block still waiting on a decision says so instead
     of being quietly left out of a total.

     Memoised apart from the blocks because it walks only the tables
     that carry a price column at all — see `rollup.ts`. */
  const rig = useMemo(
    () => readRig({ ctx, engine, view, root, row }),
    [ctx, engine, view, root, row],
  )

  /* ── THE LEDGER IS THE PAGE'S TABLE OF CONTENTS ───────────────

     Every line in the rig panel names a block that is somewhere
     further down this page — and on a boat with five lists and four
     hundred cards in them, "further down" was the whole answer. A
     line is a door now: press it and the page goes to the block the
     figure came out of, and the block says so for a moment.

     THE MARK IS A MOMENT AND NOT A SELECTION. Nothing is selected by
     arriving somewhere, so the ring fades on its own rather than
     waiting to be dismissed — and the sequence number is what makes
     pressing the same line twice light it up twice.

     MOVEMENT GOES WHEN THE PERSON HAS ASKED IT TO. `still` is this
     app's one motion switch (stillness.tsx) and it covers both
     reduced motion and somebody typing — a page that smooth-scrolls
     under a caret is the exact fault that policy exists for. */
  const [found, setFound] = useState<{ blockId: string; seq: number } | null>(null)

  const goToBlock = useCallback(
    (blockId: string) => {
      const el = document.getElementById(blockAnchor(blockId))
      if (!el) return
      el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      seq.current += 1
      setFound({ blockId, seq: seq.current })
    },
    [still],
  )

  useEffect(() => {
    if (!found) return
    const t = setTimeout(() => setFound(null), 1600)
    return () => clearTimeout(t)
  }, [found])

  /* the safe answer is the narrow one, so the default is always
     "this row only" — and it resets when the page changes row */
  useEffect(() => {
    setScope(deepest)
  }, [deepest, rowId, viewId])

  /* a refusal is a sentence, not a dialog: it says why and goes away */
  useEffect(() => {
    if (!refusal) return
    const t = setTimeout(() => setRefusal(null), 7000)
    return () => clearTimeout(t)
  }, [refusal])

  const refuse = useCallback((message: string) => {
    setPending(null)
    setRefusal(message)
  }, [])

  const offerDrop = useCallback((parentBlockId: string | null, tableId: string) => {
    seq.current += 1
    setRefusal(null)
    setConfiguring(true)
    setPending({ parentBlockId, tableId, seq: seq.current })
  }, [])

  const onPageDrop = (e: ReactDragEvent<HTMLElement>): void => {
    if (!isTableDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const tableId = readTableDrag(e)
    if (!tableId || !view || !root) return
    if (tableId === root.id) {
      refuse(`You are already looking at ${oneOf(root.name)} — pick a different table.`)
      return
    }
    if (view.blocks.some((b) => b.tableId === tableId)) {
      refuse(`${entities[tableId]?.name ?? 'That table'} is already on this page.`)
      return
    }
    offerDrop(null, tableId)
  }

  /** Accepting the offer is the ONLY thing that creates a block. An
   *  existing join is adopted; a new one is not made until someone
   *  actually curates (see pairs.ts). */
  const acceptPending = (rule: ClauseGroup | undefined): void => {
    if (!pending || !view) return
    const parentAt = pending.parentBlockId
      ? walkBlocks(view).find((b) => b.block.id === pending.parentBlockId)
      : undefined
    const sourceId = parentAt ? parentAt.block.tableId : view.rootTableId
    const join = findJoinTable(entities, sourceId, pending.tableId)
    const id = addBlock(view.id, pending.parentBlockId, {
      tableId: pending.tableId,
      ...(join ? { joinTableId: join.entityId } : {}),
    })
    if (id) setBlockRule(view.id, id, rule)
    setPending(null)
  }

  const cancelPending = useCallback(() => setPending(null), [])

  /* -- nothing to draw --------------------------------------- */

  if (!view || !root || !row) {
    return (
      <div className="vw-root">
        <div className="vw-sheet">
          <p className="vw-void">
            {!view
              ? 'That page has not been set up.'
              : !root
                ? 'The table this page was drawn for is no longer here.'
                : 'That row is no longer here.'}
          </p>
        </div>
      </div>
    )
  }

  const trail = levelValues(root, row)
    .slice(0, -1)
    .filter((v) => v !== '')
  const pendingHere = pending && pending.parentBlockId === null ? pending : null
  const pendingTable = pendingHere ? entities[pendingHere.tableId] : undefined

  /* Layout asks before it draws: a page with a photograph is two
     columns and a page without one is a single wide column. */
  const shot = hasPicture(root, row)

  /* ── ONE SENTENCE, NOT FIVE ───────────────────────────────────

     Every block seeded by `defaultBlocksFor` is curated-only, so on a
     real page `ruleReason` handed the identical clause — "only what
     somebody picked for this one shows here" — to five curation
     notes, one under the other. Five printings of one fact is not
     five explanations; it is furniture, and it buries the counts
     beside it, which are the part that differs per block.

     So the page says it ONCE, above the blocks, and each block keeps
     its own count without repeating the reason. A page with a single
     curated block says nothing here and leaves the clause where it
     was — there is nothing to de-duplicate, and a sentence about
     "every list below" would be a lie about one. */
  const curatedBlocks = view.blocks.filter((b) => isCuratedOnly(b.rule)).length
  const sayCuratedOnce = curatedBlocks > 1

  return (
    <div
      className={`vw-root${configuring ? ' is-config' : ''}${dragOver ? ' is-drop' : ''}`}
      style={{ '--vw-root-accent': accentVar(root.accent) } as CSSProperties}
      onDragOver={(e) => {
        if (!isTableDrag(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragOver(false)
      }}
      onDrop={onPageDrop}
    >
      <div className="vw-sheet">
        {/* ============================================================
            THE HERO — the boat, at the size a boat is worth.

            WHAT WAS HERE. A 120×90 thumbnail, a name, and five mono
            specs in a row, inside a header whose height was set by the
            words. It was a correct header and the wrong drawing: this
            page is the one place in the app where a salesperson and a
            customer look at the same screen together, and the largest
            thing on it was a paragraph of grey.

            The photograph is the row's OWN — `HeroPicture`, which
            draws nothing at all rather than a stand-in, so a hull
            nobody has photographed gets a single wide column of words
            instead of a hole where a picture should be. That is what
            `shot` decides, before layout, and why the modifier class
            is on the hero rather than a rule about an empty box.
            ============================================================ */}
        <header className={`vw-hero${shot ? ' vw-hero--shot' : ''}`}>
          <figure className="vw-hero-shot">
            <HeroPicture entity={root} row={row} />
          </figure>

          <div className="vw-hero-say">
            <div className="vw-hero-top">
              {trail.length > 0 ? (
                <p className="vw-trail mono-label">
                  {trail.map((t, i) => (
                    <span key={`${t}-${i}`} className="vw-trail-step">
                      {i > 0 ? (
                        <span className="vw-trail-sep" aria-hidden="true">
                          ▸
                        </span>
                      ) : null}
                      {t}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="vw-trail mono-label">
                  <KindMark entity={root} size={ICON_SIZE.tiny} />
                  {root.name}
                </p>
              )}

              <button
                type="button"
                className={`vw-gear${configuring ? ' is-on' : ''}`}
                aria-pressed={configuring}
                title={configuring ? 'Done — back to the clean page' : 'Set up this page'}
                onClick={() => {
                  setConfiguring((v) => !v)
                  setPicking(false)
                  setPending(null)
                  setRefusal(null)
                }}
              >
                {configuring ? <Check size={16} weight="bold" /> : <Gear size={16} weight="light" />}
                <span className="vw-gear-word">{configuring ? 'Done' : 'Set up'}</span>
              </button>
            </div>

            {/* THE ONE HERO STEP IN THIS FEATURE. `--t-hero-*` is the
                step above display, and a rig's name in front of a
                customer is what it is for. */}
            <h1 className="ds-hero vw-name">{rowLabel(root, row)}</h1>
          </div>

          {/* FOUR GRID CHILDREN AND NO WRAPPERS, so the two columns
              balance: the photograph over the measurements it is a
              photograph of, and the name over what it comes to. With
              no photograph the figure is `display: none`, drops out of
              the grid entirely, and the three that are left stack. */}
          <SpecStrip entity={root} row={row} engine={engine} />
          <RigPanel rig={rig} root={root} entities={entities} onGoTo={goToBlock} />
        </header>

        {/* THE SUBJECT ITSELF IS HISTORY. Nothing sends a person here —
            no module lists it and no block offers it — but the sheet
            can still open it, so the page says what it is looking at
            rather than presenting a discontinued hull as stock. */}
        {isDiscontinued(row) || isRetired(root) ? (
          <p className="vw-held" role="note">
            {isRetired(root)
              ? `${root.name} is history rather than stock, so nothing in it is listed in a module or offered on a page a customer reaches.`
              : `${rowLabel(root, row)} is no longer sold, so it is not listed in a module and nothing offers it to a customer.`}{' '}
            It stays on the sheet, and every quote already written against it still opens,
            still totals and still prints.
          </p>
        ) : null}

        <AnimatePresence initial={false}>
          {configuring && levels.length > 1 ? (
            <motion.div
              key="levels"
              className="vw-levels"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              /* A DRAWER OPENED BY A BUTTON, so ζ 1.0 and not
                 apple-design §4's 0.8 drawer bounce — bounce is for a
                 drag release, and SET UP is a press. It was on the
                 424ms over-damped spring, which is the slowest thing
                 in the file bolted to a `height` animation, the most
                 expensive property it touches. */
              transition={transitionFor(still, SPRING)}
            >
              <label className="vw-levels-lab">
                <span className="mono-label">Changes apply to</span>
                <select
                  className="field-input vw-select"
                  value={scope ?? deepest ?? 0}
                  onChange={(e) => setScope(Number(e.target.value))}
                >
                  {levels.map((l) => (
                    <option key={l.scope} value={l.scope}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="vw-levels-note">
                What you keep, drop or star lands on{' '}
                {uncapitalise(levelCaption(root, row, scope ?? deepest ?? 0))}
                {appliesTo.length > 1 ? ` — ${appliesTo.length} of them` : ''}. Change one of them
                on its own later and that one wins.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {refusal ? (
            <motion.p
              key={refusal}
              className="vw-refusal"
              role="status"
              initial={still ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              /* A notification with no momentum behind it — nothing
                 threw this line onto the page, so it settles rather
                 than overshoots (apple-design §4). Default response. */
              transition={transitionFor(still, SPRING)}
            >
              <Warning size={14} weight="light" aria-hidden="true" />
              <span className="vw-refusal-text">{refusal}</span>
              <button
                type="button"
                className="vw-icon-btn"
                title="Dismiss"
                onClick={() => setRefusal(null)}
              >
                <X size={12} weight="bold" />
              </button>
            </motion.p>
          ) : null}
        </AnimatePresence>

        {sayCuratedOnce ? (
          <p className="vw-once" role="note">
            Every list below shows only what somebody picked for this{' '}
            {singular(root.name)}. Press “Show everything” on one to see its whole table.
          </p>
        ) : null}

        <div className="vw-blocks">
          {view.blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              viewId={view.id}
              block={block}
              /* the anchor the rig ledger's lines point at, and the
                 moment's mark when one of them has just been pressed */
              domId={blockAnchor(block.id)}
              lit={found?.blockId === block.id}
              depth={2}
              ctx={ctx}
              engine={engine}
              sourceEntity={root}
              sourceRow={row}
              appliesTo={appliesTo}
              configuring={configuring}
              index={i}
              /* the page has said it once already; the block keeps its
                 own count and drops the repeated clause */
              sayWhyCurated={!sayCuratedOnce}
              onDropTable={offerDrop}
              onRefuse={refuse}
              pending={pending}
              onPendingUse={acceptPending}
              onPendingCancel={cancelPending}
            />
          ))}
        </div>

        {/* THE JOINS THIS PAGE NEVER DREW, NAMED. See `withheld` above:
            the guard is upstream of the block, so the sentence has to
            come from here or from nowhere. */}
        {withheld.length > 0 ? (
          <div className="vw-withheld">
            {withheld.map((w) => (
              <p key={w.id} className="vw-held" role="note">
                {w.sentence}
              </p>
            ))}
          </div>
        ) : null}

        {pendingHere && pendingTable ? (
          <RuleOffer
            key={pendingHere.seq}
            root={root}
            target={pendingTable}
            onUse={acceptPending}
            onCancel={cancelPending}
          />
        ) : null}

        {view.blocks.length === 0 && !pendingHere ? (
          <section className="vw-nothing">
            {/* "Nothing goes with this yet" is FALSE when something
                does and it is history — the sentence above has just
                named it. Saying both would send a person off to
                configure a relationship that already exists. */}
            <p className="vw-nothing-line">
              {withheld.length > 0
                ? 'Nothing that goes with this is still stock.'
                : 'Nothing goes with this yet.'}
            </p>
            <p className="vw-nothing-sub">
              {configuring
                ? `Add a table below — or drag one in from the left — and we will work out how it relates to this ${singular(root.name)}.`
                : 'Press “Set up”, then add a table.'}
            </p>
          </section>
        ) : null}

        <AnimatePresence initial={false}>
          {configuring ? (
            <motion.div
              key="foot"
              className="vw-foot"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              /* Same drawer, same press, same reason as the levels
                 strip above — and this one hangs off the most-pressed
                 control on the page, so 424ms was the wait between
                 SET UP and anything appearing. */
              transition={transitionFor(still, SPRING)}
            >
              {picking ? (
                <section
                  className="vw-add vw-pickzone"
                  aria-label={`Add a table to this ${singular(root.name)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setPicking(false)
                    }
                  }}
                >
                  <div className="vw-add-bar">
                    <span className="mono-label vw-add-lead">
                      What else goes with {oneOf(root.name)}?
                    </span>
                    <button
                      type="button"
                      className="vw-icon-btn"
                      title="Close"
                      onClick={() => setPicking(false)}
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>

                  {addable.length === 0 ? (
                    <p className="vw-add-none">
                      {retiredCount > 0
                        ? retiredTablesSentence(retiredCount)
                        : 'Every other table is already on this page.'}
                    </p>
                  ) : (
                    <ul className="vw-add-list">
                      {addable.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className="vw-add-row"
                            title={`Show ${e.name} on this page`}
                            onClick={() => {
                              setPicking(false)
                              offerDrop(null, e.id)
                            }}
                          >
                            <span className="vw-add-plus" aria-hidden="true">
                              <KindMark entity={e} />
                            </span>
                            <span className="vw-add-name">{e.name}</span>
                            <span className="vw-add-cells">
                              <span className="vw-add-cell">
                                {(rowsByEntity[e.id] ?? []).length}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {addable.length > 0 && retiredCount > 0 ? (
                    <p className="vw-add-none">{retiredTablesSentence(retiredCount)}</p>
                  ) : null}
                </section>
              ) : (
                <button
                  type="button"
                  className={`vw-dropzone${dragOver ? ' is-over' : ''}`}
                  onClick={() => setPicking(true)}
                >
                  <Plus size={13} weight="bold" aria-hidden="true" />
                  <span className="mono-label">
                    Add a table — or drag one in from the left
                  </span>
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ============================================================
   WHAT IT COMES TO — the rig, added up.

   THE FIGURE IS COUNTED, NEVER TYPED, and it is counted out of the
   dealer's own price columns through the one resolver this app has
   (`@/features/quote/pricing`). A table with no named price column
   contributes nothing and SAYS so; a block still holding a choice
   contributes nothing and says so too. The whole panel is absent
   when there is not a single figure to state — a `$0` here would
   be a claim about a business's stock that nobody made.

   IT AGREES WITH THE BUTTON. `readRig` picks the rows the quote
   picks, so the total a customer is read off this header is the
   total QUOTE THIS ONE produces. Two summations of one deal that
   disagree is the failure `@/lib/money` exists to end, and this is
   the same discipline one layer up.

   ── THREE THINGS THE PANEL DOES THAT IT DID NOT ───────────────

   1 · EVERY LINE IS A DOOR. A line names a block that is somewhere
       under it on a page four screens long, and "somewhere under
       it" was the whole answer to "which trailer is that, then?".
       Pressing a line takes the page to the block the figure came
       out of. The subject's own line is not a door: it is the thing
       you are already looking at.

   2 · A LIST STILL HOLDING A CHOICE IS A LINE, NOT A FOOTNOTE. It
       was a sentence at the bottom of the panel, in the third
       paragraph, about the one thing on this page a salesperson has
       to go and DO. It is a line in the ledger now, in its place in
       the reading, saying what it is waiting for — and it is a door
       to the list that is waiting. Rule 10: where it is.

   3 · THE PRIMARY LANDS UNDER THE TOTAL. See `usePrimaryDoor`.

   WHAT IS UNCHANGED: no figure is invented, `$0` is never drawn,
   and a table with no price column is still named in words.
   ============================================================ */

function RigPanel({
  rig,
  root,
  entities,
  onGoTo,
}: {
  rig: RigPrice
  root: EntityDef
  entities: Record<string, EntityDef>
  onGoTo: (blockId: string) => void
}): ReactElement | null {
  const door = usePrimaryDoor()

  /* NOTHING TO SAY AND NOTHING TO OFFER. The total is still refused
     outright when there is no figure to state, but a page that has
     lists waiting on a choice, or tables that carry no price at all,
     has something to say about why — and that is the panel's job as
     much as the arithmetic is. */
  if (rig.counted === 0 && rig.open.length === 0 && rig.unpriced.length === 0) return null

  const lines = rig.subject ? [rig.subject, ...rig.added] : rig.added

  /* WHAT IS NOT IN THE FIGURE AND HAS NO LINE OF ITS OWN. The lists
     holding a choice are drawn in the ledger now; what is left here
     is the tables that can never contribute one, which is a fact
     about the sheet rather than a decision anybody can go and make. */
  const notes: string[] = []
  if (rig.unpriced.length > 0) {
    notes.push(
      rig.unpriced.length <= 2
        ? `${joinNames(rig.unpriced)} ${rig.unpriced.length === 1 ? 'carries' : 'carry'} no price column on this sheet.`
        : `${rig.unpriced.length} other tables on this page carry no price column on this sheet.`,
    )
  }

  const DoorIcon = door?.icon

  return (
    <section className="vw-rig" aria-label={`What this ${singular(root.name)} comes to`}>
      <div className="vw-rig-head">
        <span className="mono-label vw-rig-lead">Added up</span>
        {/* NO `$0`. A page where nothing carries a price says so in
            the lines below rather than stating a total nobody made. */}
        {rig.counted > 0 ? <b className="vw-rig-total">{money(rig.total)}</b> : null}
      </div>

      <ul className="vw-rig-lines">
        {lines.map((l) => {
          const what = l.blockId === '' ? singular(l.tableName) : l.label
          const body = (
            <>
              <span className="vw-rig-dot" aria-hidden="true" />
              <span className="vw-rig-what">{what}</span>
              {/* the business's own word for the rung it was read at
                  — `Sell inc Rego`, `Cash`. A name, so its case is
                  its own. */}
              <span className="vw-rig-rung">{l.rung}</span>
              <span className="vw-rig-amt">{money(l.amount)}</span>
            </>
          )
          return (
            <li
              key={`${l.blockId}-${l.tableId}-${l.label}`}
              className={`vw-rig-line${l.recommended ? ' is-star' : ''}`}
              style={
                { '--vw-line-accent': accentVar(entities[l.tableId]?.accent) } as CSSProperties
              }
            >
              {l.blockId === '' ? (
                <span className="vw-rig-still">{body}</span>
              ) : (
                <button
                  type="button"
                  className="vw-rig-door"
                  /* the words on the line are the row's name and its
                     figure; this says what pressing it DOES */
                  aria-label={`Show ${what} on ${l.tableName}, further down this page`}
                  onClick={() => onGoTo(l.blockId)}
                >
                  {body}
                </button>
              )}
            </li>
          )
        })}

        {/* A DECISION NOBODY HAS MADE YET, IN ITS PLACE IN THE LEDGER
            rather than in a paragraph under it. It carries no amount,
            because there is none — not a nought. */}
        {rig.open.map((o) => (
          <li key={`open-${o.blockId}`} className="vw-rig-line is-open">
            <button
              type="button"
              className="vw-rig-door"
              aria-label={`Choose which ${singular(o.tableName)} goes on this ${singular(root.name)}`}
              onClick={() => onGoTo(o.blockId)}
            >
              <span className="vw-rig-dot" aria-hidden="true" />
              <span className="vw-rig-what">{o.tableName}</span>
              <span className="vw-rig-rung">
                {o.picked} picked, none recommended yet — nothing from that list is in
                this figure
              </span>
              <span className="vw-rig-amt vw-rig-amt--none">Choose</span>
            </button>
          </li>
        ))}
      </ul>

      {notes.length > 0 ? <p className="vw-rig-note">{notes.join(' ')}</p> : null}

      {/* THE NEXT MOVE, UNDER THE FIGURE IT PRODUCES. Same record as
          the bar's — see `usePrimaryDoor` — so there is one action and
          two places it can be reached, never two actions. */}
      {door ? (
        <div className="vw-rig-go">
          <button
            type="button"
            className="vw-rig-btn"
            aria-label={door.say ?? door.label}
            /* NOT `disabled`. A disabled control drops out of the tab
               order and takes its own explanation with it, and the
               explanation is the whole point — the same ruling the
               action bar's own buttons keep. */
            aria-disabled={door.refusal ? true : undefined}
            onClick={() => {
              if (door.refusal) return
              door.onPick()
            }}
          >
            {DoorIcon ? <DoorIcon size={16} weight="bold" aria-hidden="true" /> : null}
            <span>{door.label}</span>
          </button>
          {door.refusal ? <p className="vw-rig-why">{door.refusal}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

/** "a, b and c" — the same shape `@/features/curation` joins clauses
 *  with, so two surfaces reading one page do not punctuate lists two
 *  different ways. */
function joinNames(parts: readonly string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/* ---------------------------------------------------------- */
/* The spec plate — the row's own facts, set as data           */
/* ---------------------------------------------------------- */

interface Spec {
  label: string
  value: string
}

function SpecStrip({
  entity,
  row,
  engine,
}: {
  entity: EntityDef
  row: RowData
  engine: ReturnType<typeof makeEngine>
}): ReactElement | null {
  const specs = useMemo<Spec[]>(() => {
    const values = engine.valuesOf({ entityId: entity.id, row })
    const read = (fieldId: string): CellValue => values[fieldId] ?? null
    const out: Spec[] = []
    const used = new Set<string>(entity.hierarchy ?? [])
    /* "HP · 90–115 HP" reads like a stutter; the label already said it */
    const withUnit = (label: string, text: string, unit?: string): Spec =>
      unit && unit.toLowerCase() !== label.toLowerCase()
        ? { label, value: `${text} ${unit}` }
        : { label, value: text }

    /* an envelope reads as ONE fact — 90–115 HP, never two columns */
    for (const pair of rangePairs(entity)) {
      used.add(pair.min.id)
      used.add(pair.max.id)
      const text = formatRange(
        read(pair.min.id),
        read(pair.max.id),
        pair.min.name,
        bandOf(entity, pair.min),
      )
      if (text === '') continue
      out.push(withUnit(pair.label, text, splitUnit(pair.min.name).unit))
    }

    /* NOT A COST, ON THIS PAGE. The strip picks the highest-ranked
       columns after the envelopes, and `defaultColumns` ranks numbers
       first — which on several tables is the dealer's cost build. The
       money on this page is the rig panel's, read through the quote's
       own resolver; a spec strip is measurements. See `cardColumns`
       in columns.ts for the whole argument. */
    for (const fieldId of withoutCosts(entity, defaultColumns(entity, 12))) {
      if (out.length >= 5) break
      if (used.has(fieldId)) continue
      const field = entity.fields.find((f) => f.id === fieldId)
      if (!field) continue
      const text = formatCell(field, read(fieldId), undefined, bandOf(entity, field))
      if (text === '') continue
      const { base, unit } = splitUnit(field.name)
      out.push(withUnit(base, text, unit))
    }
    return out
  }, [entity, row, engine])

  if (specs.length === 0) return null
  return (
    <dl className="vw-specs">
      {specs.map((s) => (
        <div key={s.label} className="vw-spec">
          <dt className="mono-label">{s.label}</dt>
          <dd className="vw-spec-val">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
