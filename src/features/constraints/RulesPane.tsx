/* ============================================================
   THE RULES PANE — what this price file asserts, what is being
   checked, and what is not.

   WHAT CHANGED HERE, AND WHY. This page had all the right material and
   the wrong order. It opened with an empty form and the sentence "No
   rules yet", then listed sixteen rules mined out of a real price file
   under a status stamp that read "Not checked yet" ten times. Every
   word of that was true. It still read as an unbuilt feature, sitting
   beside a modules page that reads as a finished one, and the owner
   said so:

   > "the modules and tables and all of that is great but the what fits
   >  what and the business rules and stuff look half baked … why am i
   >  seeing not checked yet"

   So the page is re-composed, and nothing is removed. In order of
   loudness:

     1  WHAT THIS PRICE FILE ASSERTS — the sixteen rules, GROUPED BY
        WHAT THEY ARE ABOUT (trailers, motors, rigging, the boat row,
        registration) rather than by our progress, each led by the rate
        its own adjudication measured. `RulesLedger`.
     2  WHAT IS BEING CHECKED, AND WHAT IT CAUGHT — the trailer
        selector and the registration band check, both of which walk
        the loaded sheet on render. The registration check finds live
        rows in a band their own rated mass contradicts; that is this
        app earning its keep and it is now counted in the header rather
        than buried ten thousand pixels down.
     3  WHAT IS NOT CHECKED, AND WHY — still on every card, still
        honest, now subordinate to the finding and never without a
        reason.

   THE PERSON'S OWN RULES MOVED DOWN, NOT AWAY. Writing a sentence is
   still here, with the same component and the same behaviour, in its
   own band under the workbook's rules — because on a sheet with
   eleven thousand rows the interesting rules are the ones already in
   the file, and a blank form is a poor thing to open a page with. The
   act is published to the ACTION BAR as well, which is where a page's
   own verbs live.

   EVERY FIGURE ON THIS PAGE IS EITHER COMPUTED FROM THE LOADED SHEET
   ON RENDER OR CHECKED AGAINST THE ADJUDICATION THAT MEASURED IT
   (`ruleLedger.test.ts`). Nothing is typed to fill a card.

   It fills whatever box it is given and scrolls itself, exactly like
   `views/ViewPage`, and brings its own stylesheet.

   ------------------------------------------------------------
   AND THEN ONE MORE COMPOSITION PROBLEM, WHICH IS LENGTH.

   The order above is right and every block on it earns its place.
   Stacked, they were also about twenty thousand pixels of continuous
   scroll: sixteen ledger cards, a discovery band that can open forty
   more, a trailer ledger of eight marques, a registration band, the
   composer, the person's own rules and the left-out list — all on one
   page, all at once, with no way to be in one of them.

   So the same material is now THREE NAMED VIEWS on one segmented
   control, each counted:

     From your price file   what it asserts, and what it follows
                            without ever saying so
     Rules you write        the composer, and your own rules
     What is checked        the two checks that walk your sheet, and
                            the list of what is deliberately not here

   NOTHING IS REMOVED AND NOTHING IS UNMOUNTED. The views that are not
   showing are `hidden`, not destroyed, for two measured reasons: the
   discovery engine's run over the real seed is about three seconds
   (`useDiscovery.ts`), and a half-written sentence in the composer is
   somebody's work. Switching views may not cost either one.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { motion } from 'motion/react'
import { Article, NotePencil, Table } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { useActionBar, type ActionGroup } from '@/lib/actions'
import { SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
import type { ConstraintDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { useConstraints } from './constraintDefs'
import { LeftOutList } from './LeftOutList'
import { NewRuleSentence } from './NewRuleSentence'
import { RegistrationTheme } from './RegistrationTheme'
import { RuleCard } from './RuleCard'
import { RulesLedger, type LiveReading } from './RulesLedger'
import { TrailerFitmentPanel } from './TrailerFitmentPanel'
import { DiscoveryPanel } from './DiscoveryPanel'
import { atmBandDisagreements } from './registration'
import {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  marqueVocabulary,
  readCatalogue,
  readMarques,
} from './trailerFitment'
import { WORKBOOK_RULES, type WorkbookRuleRef } from './workbookRules'
import { evaluateConstraints, sortConstraints } from './state'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

const n = (x: number): string => x.toLocaleString('en-AU')

/** The three views, in the order a person meets them. The count on
 *  each one is counted on this render — a segment that says how much
 *  is behind it is the difference between a tab and a guess. */
type ViewId = 'file' | 'mine' | 'checks'

export function RulesPane(): ReactElement {
  const constraints = useConstraints()
  const ctx = useSentenceCtx()
  /* THE TYPING GATE, WHICH THIS PANE USED TO BE DEAF TO. It asked
     `useReducedMotion()` directly, so it honoured the operating
     system and nothing else — and this is a pane whose whole job is
     editing sentences in place. The list re-sorts as a rule's status
     changes, which is precisely the reflow-under-a-caret that
     `stillness` exists to stop. One shared boolean now, so the pane
     freezes for the same reasons every other surface does. */
  const { still } = useStillness()
  const [openId, setOpenId] = useState<string | null>(null)
  const [view, setView] = useState<ViewId>('file')

  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const statuses = useMemo(
    () => evaluateConstraints(constraints, ctx),
    [constraints, ctx],
  )
  const sorted = useMemo(
    () => sortConstraints(constraints, statuses),
    [constraints, statuses],
  )

  /* Conflicts surface first — but nothing may leap out from under a
     person mid-edit, so the order is frozen while a card is open and
     settles the moment they are done. */
  const frozen = useRef<string[]>([])
  if (openId === null) frozen.current = sorted.map((c) => c.id)
  const list = stableOrder(sorted, frozen.current)

  const conflicts = Object.values(statuses).filter((s) => s.conflicts > 0).length
  const noColumns = ctx.concepts.length === 0

  /* Which workbook seeds actually became rules. The seed's own
     `blocked` is only a default: the moment the contract grows what a
     rule needs, the id appears here and the list must say "checked"
     rather than keep repeating a stale excuse. */
  const liveIds = useMemo(() => new Set(constraints.map((c) => c.id)), [constraints])

  /* ---- what this app measured on THIS sheet, on this render ---- */

  const band = useMemo(
    () => atmBandDisagreements(entities, rowsByEntity),
    [entities, rowsByEntity],
  )

  const trailers = useMemo(() => {
    const project = { entities, rowsByEntity }
    const marques = marqueVocabulary(project, TRAILER_FITMENT)
    return {
      catalogue: readCatalogue(project, TRAILER_FITMENT, marques),
      readings: readMarques(project, TRAILER_FITMENT, { marques, floor: TRAILER_ATM_FLOOR }),
    }
  }, [entities, rowsByEntity])

  /* THE LIVE READINGS, keyed by the adjudication's own reference. Only
     the rules this app actually runs get one — a rule nothing checks
     must not be given a figure that implies it does. */
  const live = useMemo<Partial<Record<WorkbookRuleRef, LiveReading>>>(() => {
    const out: Partial<Record<WorkbookRuleRef, LiveReading>> = {}
    const { catalogue, readings } = trailers

    if (readings.length > 0 && catalogue.live > 0) {
      out.F8 = {
        figure: `${n(catalogue.named)} of ${n(catalogue.live)}`,
        says: `trailers sit under a heading that names a boat brand, so a hull is offered that brand's series and nothing else.`,
      }
      const warned = readings.reduce((sum, r) => sum + r.floorWarned, 0)
      out.F9 = {
        figure: n(warned),
        says:
          warned === 0
            ? 'hulls are offered a trailer in their own series rated under their weight. The floor warns; it never removes one.'
            : `${warned === 1 ? 'hull is' : 'hulls are'} offered a trailer in their own series rated under their weight, and ${warned === 1 ? 'it stays' : 'they stay'} on the list with the warning beside ${warned === 1 ? 'it' : 'them'}.`,
      }
    }

    if (band.tested > 0) {
      out.S1 = {
        figure: `${n(band.disagreements.length)} of ${n(band.tested)}`,
        says:
          band.disagreements.length === 0
            ? 'trailers checked sit inside the weight their own band states.'
            : 'trailers checked are registered in a band their own rated weight contradicts. Shown, and never corrected.',
      }
    }

    return out
  }, [trailers, band])

  /* ---- the header's tally, counted rather than written ---- */

  const tally = useMemo(() => {
    const asserted = WORKBOOK_RULES.filter((s) => s.evidence === 'asserted').length
    const observed = WORKBOOK_RULES.length - asserted
    const checked = WORKBOOK_RULES.filter(
      (s) => liveIds.has(s.id) || Boolean(s.enforcedIn),
    ).length
    return { total: WORKBOOK_RULES.length, asserted, observed, checked }
  }, [liveIds])

  /* ---- the page's own verb, on the bar the whole app uses ---- */

  /* THE PAGE'S OWN VERB NOW SWITCHES THE VIEW rather than scrolling to
     it. It used to throw the reader ten thousand pixels down a single
     column; the composer is a place now, so "Write a rule" goes there.
     The view is `hidden` and not unmounted, so the node exists — but it
     is not focusable until the attribute comes off, which is why the
     focus waits one frame. */
  const mine = useRef<HTMLElement | null>(null)
  const writeHere = useCallback(() => {
    setView('mine')
    const land = (): void => {
      const el = mine.current
      if (!el) return
      el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      /* Focus the first word of the sentence, so the keyboard lands where
         the eye does. `preventScroll` because the scroll above is the one
         that should be seen happening. */
      el.querySelector<HTMLElement>('button, input, [tabindex]')?.focus({ preventScroll: true })
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(land)
    else land()
  }, [still])

  const bar = useMemo<ActionGroup[] | null>(() => {
    if (noColumns) return null
    return [
      {
        id: 'cn-acts',
        rank: 90,
        items: [
          {
            kind: 'button',
            id: 'cn-write',
            label: 'Write a rule',
            say: 'Write a rule of your own, in a sentence',
            icon: NotePencil,
            tone: 'primary',
            onPick: writeHere,
          },
        ],
      },
    ]
  }, [noColumns, writeHere])
  useActionBar('rules-pane', bar)

  /* The segmented control's own labels and counts, in one place so the
     control, the panel it opens and the sentence under it can never
     disagree. Every figure is counted above, on this render. */
  const views: { id: ViewId; name: string; count: number; say: string }[] = [
    {
      id: 'file',
      name: 'From your price file',
      count: tally.total,
      say: `${tally.total} rules read out of your workbooks, and the patterns your values follow without anybody writing them down.`,
    },
    {
      id: 'mine',
      name: 'Rules you write',
      count: constraints.length,
      say: 'One sentence about your own columns. Every underlined word is a choice, and the count under it moves as you write.',
    },
    {
      id: 'checks',
      name: 'What is checked',
      count: tally.checked,
      say: 'The checks that walk the sheet you have loaded — and, last, what your price file holds that this does not.',
    },
  ]

  /* Arrow keys move between segments, which is what a tablist owes
     anybody not using a pointer. */
  const segKeys = (e: KeyboardEvent<HTMLDivElement>): void => {
    const i = views.findIndex((v) => v.id === view)
    const to =
      e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? views.length - 1 : -1
    if (to < 0 || to > views.length - 1) return
    e.preventDefault()
    const next = views[to]
    if (!next) return
    setView(next.id)
    e.currentTarget.querySelectorAll<HTMLElement>('.cn-seg-btn')[to]?.focus()
  }

  return (
    <section className="cn-root">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Two drifting washes
          under 6 % alpha behind the sheet, so a page whose subject is
          one white column has a ground rather than a void. Both go
          under `prefers-reduced-transparency` and `prefers-contrast`,
          and stop drifting under `prefers-reduced-motion` — ds.css. */}
      <div className="ds-aurora ds-grain cn-sky" aria-hidden="true" />

      <div className="cn-sheet">
        <header className="cn-head">
          <p className="cn-eyebrow mono-label">Business rules</p>
          <h2 className="cn-title">What this price file asserts</h2>
          <p className="cn-lede">
            {tally.total} rules were read out of your price file, each traced to the cell,
            formula, header or divider that states it, and measured against every row that
            could test it. The measurement is the first thing on every card, because a rule
            that holds on every pairing in a business is a fact about that business.
          </p>
          {/* NAME THE OTHER SURFACE. There are two places a rule can
              live and they do different jobs — this one states a LIMIT,
              the other DERIVES a list. A person who opens the wrong one
              does not discover their mistake; they conclude the thing
              they wanted cannot be done. The door it points at is on
              the bar, and it is called Fitment. */}
          <p className="cn-lede cn-lede--other">
            These are limits — things every row must keep. To work out what goes
            <em> with</em> something, use <b>Fitment</b> on the bar.
          </p>

          {/* THE TALLY, COUNTED. Four figures, none of them typed: how
              many rules were found, what they rest on, how many are
              being checked, and what those checks have caught on the
              sheet that is loaded right now.

              THE FIGURE LEADS AND THE TERM SITS UNDER IT, which is the
              order somebody scanning actually uses — they find the
              number, then check what it was. Each term is now a phrase
              rather than a clause: the four sentences this block used
              to carry were a paragraph pretending to be a dashboard,
              and the two qualifications worth keeping are the line
              underneath, where they can be read once. */}
          <dl className="cn-tally">
            <div className="cn-tally-item">
              <dt className="cn-tally-what">rules read out of it</dt>
              <dd className="cn-tally-n">{tally.total}</dd>
            </div>
            <div className="cn-tally-item">
              <dt className="cn-tally-what">stated · only seen</dt>
              <dd className="cn-tally-n">
                {tally.asserted}
                <span className="cn-tally-sep" aria-hidden="true">
                  /
                </span>
                {tally.observed}
              </dd>
            </div>
            <div className="cn-tally-item">
              <dt className="cn-tally-what">checked as you work</dt>
              <dd className="cn-tally-n">{tally.checked}</dd>
            </div>
            {band.tested > 0 && (
              <div className="cn-tally-item">
                <dt className="cn-tally-what">registered against their weight</dt>
                <dd className="cn-tally-n">{n(band.disagreements.length)}</dd>
              </div>
            )}
          </dl>

          <p className="cn-tally-note">
            A stated rule comes from a formula, a header or a divider; one that is only seen in
            the values may warn and may never filter. The {tally.total - tally.checked} that are
            not checked say what is missing, on the rule itself.
            {band.tested > 0 && (
              <>
                {' '}
                Of the {n(band.tested)} trailers checked,{' '}
                {n(band.disagreements.length)}{' '}
                {band.disagreements.length === 1 ? 'is' : 'are'} registered in a weight band
                their own rated mass contradicts — shown, and never corrected.
              </>
            )}
          </p>
        </header>

        {noColumns ? (
          <NoColumns />
        ) : (
          <>
            {/* THE THREE VIEWS. The control is the page's heading now:
                each segment names what is behind it and counts it, so
                nobody has to scroll to find out whether it is worth
                the trip. */}
            <div className="cn-seg" role="tablist" aria-label="What to show" onKeyDown={segKeys}>
              {views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  id={`cn-tab-${v.id}`}
                  aria-controls={`cn-view-${v.id}`}
                  aria-selected={view === v.id}
                  tabIndex={view === v.id ? 0 : -1}
                  className={view === v.id ? 'cn-seg-btn is-on' : 'cn-seg-btn'}
                  onClick={() => setView(v.id)}
                >
                  <span className="cn-seg-name">{v.name}</span>
                  <span className="cn-seg-n">{v.count}</span>
                </button>
              ))}
            </div>
            <p className="cn-seg-say">{views.find((v) => v.id === view)?.say}</p>

            {/* 1 · WHAT THE PRICE FILE ASSERTS — and what it follows
                without ever saying so. The sixteen in the ledger are
                ASSERTED: a formula, a header or a divider states each
                one. The discovery band measures the same file for rules
                nobody wrote down, and everything it finds is OBSERVED —
                it may warn, and it may never remove a row from a list.
                It runs off the render path and brings its own
                stylesheet. */}
            <div
              className="cn-view"
              id="cn-view-file"
              role="tabpanel"
              aria-labelledby="cn-tab-file"
              hidden={view !== 'file'}
            >
              <RulesLedger liveIds={liveIds} live={live} />
              <DiscoveryPanel />
            </div>

            {/* 2 · THE PERSON'S OWN RULES, and the composer that writes
                them. It is a view of its own now rather than the third
                band down a twenty-thousand-pixel column, which is what
                lets the sentence be set at the size it deserves.

                THE BAND'S HEADING IS GONE and that is the point: the
                segment above already says "Rules you write", and a
                heading repeating the tab under the tab is the clutter
                this pass exists to remove. The lede stays, because it
                is the one place the undo promise is made. */}
            <section
              className="cn-band cn-mine cn-view"
              id="cn-view-mine"
              role="tabpanel"
              aria-labelledby="cn-tab-mine"
              hidden={view !== 'mine'}
              ref={mine}
              aria-label="Rules you have written"
            >
              <p className="cn-band-lede">
                A rule you write here is one sentence about your own columns. Change a word
                and the rule changes; switch one off and everything it ruled out comes
                straight back.
                {constraints.length > 0 && (
                  <>
                    {' '}
                    You have written{' '}
                    <b>
                      {constraints.length} rule{constraints.length === 1 ? '' : 's'}
                    </b>
                    {conflicts > 0 && (
                      <>
                        {', '}
                        <span className="cn-count-bad">
                          {conflicts} in conflict
                        </span>
                      </>
                    )}
                    .
                  </>
                )}
              </p>

              <NewRuleSentence onAdded={setOpenId} />

              {list.length === 0 ? (
                <NoRules />
              ) : (
                <ul className="cn-list">
                  {list.map((constraint, i) => (
                    <motion.li
                      key={constraint.id}
                      className="cn-list-item"
                      initial={still ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      /* A rule card arriving in a list is the same
                         event as a row arriving in a block, so it takes
                         the same config by import. The 20ms stagger,
                         capped at seven cards, stays: it is inside
                         emil-design-eng's 30–80ms guidance once the
                         spring's own settle is counted, and capping it
                         stops a twenty-rule list from taking half a
                         second to finish arriving. */
                      transition={{
                        ...transitionFor(still, SPRING_QUICK),
                        delay: still ? 0 : Math.min(i, 6) * 0.02,
                      }}
                    >
                      <RuleCard
                        constraint={constraint}
                        status={statuses[constraint.id]}
                        open={openId === constraint.id}
                        onOpen={(open) => setOpenId(open ? constraint.id : null)}
                      />
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>

            {/* 3 · WHAT IS BEING CHECKED, AND WHAT IT CAUGHT.

                F8 is the one rule in either workbook that both holds at
                100 % and actually rejects something, and this is the
                surface that draws the measurement rather than the
                claim. REGISTRATION is the owner's own example of a
                common theme — one concept the boat and the trailer
                share — drawn once, with the four things it may not do
                and the rows that disagree with it today.

                NEITHER ADDS A DOOR. Joins and views are never doors on
                the navigation bar, and a fee register is not a place in
                the business — these are blocks on a surface that
                already exists. Both are exported from this feature's
                index so a module page can draw them too.

                AND LAST, WHAT IS NOT IN HERE. A person who knows the
                price file will look for the service schedule; without
                this they cannot tell a decision from a gap, and both
                guesses cost us. */}
            <div
              className="cn-view"
              id="cn-view-checks"
              role="tabpanel"
              aria-labelledby="cn-tab-checks"
              hidden={view !== 'checks'}
            >
              <TrailerFitmentPanel />
              <RegistrationTheme />
              <LeftOutList />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* Empty states — both of them say what to do next            */
/* ---------------------------------------------------------- */

function NoColumns(): ReactElement {
  return (
    <div className="cn-void">
      <span className="cn-void-mark">
        <Table size={ICON_SIZE.large} weight={weightFor(ICON_SIZE.large)} />
      </span>
      <p className="cn-void-title">Rules are made of your columns</p>
      <p className="cn-void-note">
        Make a table first. Its columns become the words you write rules with.
      </p>
    </div>
  )
}

function NoRules(): ReactElement {
  return (
    <div className="cn-void cn-void--small">
      <span className="cn-void-mark">
        <Article size={ICON_SIZE.medium} weight={weightFor(ICON_SIZE.medium)} />
      </span>
      <p className="cn-void-note">
        You have not written one yet. Finish the sentence above and it becomes your first.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- */

/** Keep the previous order, put anything new at the top, and drop
 *  what is gone. */
function stableOrder(sorted: ConstraintDef[], order: string[]): ConstraintDef[] {
  if (order.length === 0) return sorted
  const known = new Set(order)
  const fresh = sorted.filter((c) => !known.has(c.id))
  const kept = order
    .map((id) => sorted.find((c) => c.id === id))
    .filter((c): c is ConstraintDef => Boolean(c))
  return [...fresh, ...kept]
}
