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
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
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

  const mine = useRef<HTMLElement | null>(null)
  const writeHere = useCallback(() => {
    const el = mine.current
    if (!el) return
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    /* Focus the first word of the sentence, so the keyboard lands where
       the eye does. `preventScroll` because the scroll above is the one
       that should be seen happening. */
    el.querySelector<HTMLElement>('button, input, [tabindex]')?.focus({ preventScroll: true })
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

  return (
    <section className="cn-root">
      <div className="cn-sheet">
        <span className="cn-tick cn-tick--tl" aria-hidden />
        <span className="cn-tick cn-tick--tr" aria-hidden />

        <header className="cn-head">
          <p className="cn-eyebrow">BUSINESS RULES</p>
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
              sheet that is loaded right now. */}
          <ul className="cn-tally">
            <li className="cn-tally-item">
              <b className="cn-tally-n">{tally.total}</b>
              <span className="cn-tally-what">
                rules found in your price file, each with the cell that says it
              </span>
            </li>
            <li className="cn-tally-item">
              <b className="cn-tally-n">
                {tally.asserted}
                <span className="cn-tally-sep" aria-hidden="true">
                  /
                </span>
                {tally.observed}
              </b>
              <span className="cn-tally-what">
                stated by a formula, a header or a divider · seen only in the values, so they
                may warn and never filter
              </span>
            </li>
            <li className="cn-tally-item">
              <b className="cn-tally-n">{tally.checked}</b>
              <span className="cn-tally-what">
                are checked as you work. The other {tally.total - tally.checked} say what is
                missing, on the rule itself
              </span>
            </li>
            {band.tested > 0 && (
              <li className="cn-tally-item">
                <b className="cn-tally-n">{n(band.disagreements.length)}</b>
                <span className="cn-tally-what">
                  of the {n(band.tested)} trailers checked{' '}
                  {band.disagreements.length === 1 ? 'is' : 'are'} registered in a weight band
                  their own rated mass contradicts. Shown, and never corrected
                </span>
              </li>
            )}
          </ul>
        </header>

        {noColumns ? (
          <NoColumns />
        ) : (
          <>
            {/* 1 · WHAT THE PRICE FILE ASSERTS */}
            <RulesLedger liveIds={liveIds} live={live} />

            {/* 1b · AND WHAT IT FOLLOWS WITHOUT EVER SAYING SO. The
                sixteen above are ASSERTED — a formula, a header, a
                divider states each one. The band below measures the
                same file for rules nobody wrote down, and everything
                it finds is OBSERVED: it may warn, and it may never
                remove a row from a list. It runs off the render path
                and brings its own stylesheet. */}
            <DiscoveryPanel />

            {/* 2 · WHAT IS BEING CHECKED, AND WHAT IT CAUGHT.

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
                index so a module page can draw them too. */}
            <TrailerFitmentPanel />
            <RegistrationTheme />

            {/* 3 · THE PERSON'S OWN RULES. Below the workbook's,
                because on a sheet of eleven thousand rows the
                interesting rules are the ones already in the file — and
                because a page that opens on a blank form says the
                system knows nothing. */}
            <section className="cn-band cn-mine" ref={mine} aria-label="Rules you have written">
              <p className="cn-band-eyebrow mono-label">Your own rules</p>
              <h3 className="cn-band-title">Rules you have written</h3>
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

            {/* WHAT IS NOT IN HERE. A person who knows the price file
                will look for the service schedule; without this they
                cannot tell a decision from a gap, and both guesses cost
                us. */}
            <LeftOutList />
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
