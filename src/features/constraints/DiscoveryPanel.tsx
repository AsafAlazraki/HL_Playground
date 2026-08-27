/* ============================================================
   THE DISCOVERY ENGINE, ON SCREEN — "these are the rules your price
   file already follows, and here are the numbers".

   THE OWNER'S QUESTION, VERBATIM: "but we can reverse engineer rules
   based on those patterns. yes?" This is the answer with the working
   shown. `discover.ts` measures; this places what it measured so a
   person can decide what to keep.

   WHAT A PERSON CAN DO HERE, AND WHY EACH IS ON THE CARD

     SEE IT      one sentence, in the price file's own column names.
     SEE BOTH    how often it holds AND how much of the catalogue it
     FIGURES     leaves standing, side by side, because they only
                 mean anything together: F9 (a trailer's ATM against
                 the boat's weight) is 530 / 530 = 100 % and leaves a
                 mean 97.70 % of the catalogue — it selects NOTHING.
                 F8 (the series banner) is 581 / 581 and leaves
                 0.92 %–7.83 %. Same rate, opposite worth
                 (FITMENT_RULES.md §1.2). A card that printed the
                 rate alone would teach the wrong lesson perfectly.
     CHECK IT    the rows that disagree, BY NAME, with the values
                 each side threw away and why. A proposal a person
                 cannot check is a fabrication wearing a percentage.
     KEEP IT     into a register that can warn and cannot prune.
     DISMISS IT  and it stays dismissed.
     SEE WHAT    the ones a threshold killed, with the number that
     FAILED      killed each, so nobody wonders whether the app
                 simply missed something.

   THE LINE THIS SURFACE MAY NOT CROSS. A discovered pattern is NOT a
   rule the business stated. Every candidate here is OBSERVED; it may
   warn; it may never filter, prune or remove a row from a picker.
   That is said in the band's own opening sentence, on the button
   that accepts one ("Keep as a warning"), on the line beside that
   button, and again on the note that confirms the act — four
   places, because a person must not be able to acquire a filtering
   rule by accident. `discoveredRules.ts` is where a kept pattern
   goes, and nothing in the configurator reads that register.

   IT DOES NOT FREEZE THE APP. `useDiscovery` drives the engine's
   generator one step per idle callback, and this surface says it is
   working while it works, with the step it is on and how far through
   it is. See that file for why not a worker.

   NOTHING ON THIS SCREEN IS TYPED IN. Every figure is read off the
   report; every fixed clause is quoted from `discover.ts`,
   `workbookRules.ts` or docs/specs/FITMENT_RULES.md §0, and the
   quoting is done once, in `discoverSay.ts`.

   WHERE IT SITS. A block on Business rules, under the rules the
   price file ASSERTS and above the ones a person has written — the
   same argument `TrailerFitmentPanel` makes for being a block and
   not a door: it is not a place in the business, it is the app being
   honest about what it can measure. Its verb goes on the ACTION BAR
   like every other page action.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { CaretDown, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useActionBar, type ActionGroup } from '@/lib/actions'
import { useProjectStore } from '@/store/useProjectStore'
import { say } from '@/store/notes'
import type { Candidate, DiscoveryBounds, DiscoveryReport } from './discover'
import { orgKeyOf } from './constraintDefs'
import {
  decide,
  forget,
  useDiscoveryDecisions,
  type KeptPattern,
} from './discoveredRules'
import {
  OBSERVED_SAY,
  SHAPE_SAY,
  counterSay,
  deleteSay,
  excludedSay,
  figuresFor,
  n,
  pct,
  recommendationSay,
  uniquenessSay,
  verdictSay,
} from './discoverSay'
import { useDiscovery } from './useDiscovery'
import './discovery.css'

/** How many cards stand open before the list offers the rest. Long
 *  enough that the shape of the finding is visible, short enough
 *  that the page under it is still reachable — and the count of what
 *  is folded away is always printed beside the control. */
const FIRST_FEW = 8

export interface DiscoveryPanelProps {
  /** publish this band's verb to the action bar. False while the
   *  band is drawn but not on screen — see the note on the call to
   *  `useActionBar` below. */
  showActions?: boolean
}

export function DiscoveryPanel({ showActions = true }: DiscoveryPanelProps = {}): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const orgKey = useProjectStore((s) => orgKeyOf(s.meta))

  const { phase, progress, report, stale, share, run } = useDiscovery()
  const decisions = useDiscoveryDecisions()

  const [openId, setOpenId] = useState<string | null>(null)
  const [allProposals, setAllProposals] = useState(false)
  const [showDeclined, setShowDeclined] = useState(false)
  const [showDismissed, setShowDismissed] = useState(false)

  const counts = useMemo(() => {
    const tables = Object.keys(entities).length
    let rows = 0
    for (const list of Object.values(rowsByEntity)) rows += list.length
    return { tables, rows }
  }, [entities, rowsByEntity])

  const decided = useMemo(() => {
    const map = new Map<string, KeptPattern>()
    for (const d of decisions) map.set(d.id, d)
    return map
  }, [decisions])

  const kept = useMemo(() => decisions.filter((d) => d.decision === 'kept'), [decisions])
  const dismissed = useMemo(
    () => decisions.filter((d) => d.decision === 'dismissed'),
    [decisions],
  )

  /* RULE 9. Keeping and dismissing are both undoable, so both say so
     on a note with UNDO on it rather than asking first in a dialog.
     The note carries the words that matter at the moment of the act:
     what was kept, and that keeping it makes a warning. */
  const onKeep = useCallback(
    (c: Candidate) => {
      decide(orgKey, c, 'kept')
      say({
        text: 'Kept as a warning. It flags a pairing that disagrees and never removes one from a list.',
        act: { label: 'Undo', onPick: () => forget(orgKey, c.id) },
      })
    },
    [orgKey],
  )

  const onDismiss = useCallback(
    (c: Candidate) => {
      decide(orgKey, c, 'dismissed')
      say({
        text: 'Dismissed. It stays measured and stays counted; it will not be offered again.',
        act: { label: 'Undo', onPick: () => forget(orgKey, c.id) },
      })
    },
    [orgKey],
  )

  const onForget = useCallback(
    (id: string) => {
      forget(orgKey, id)
    },
    [orgKey],
  )

  /* ---- the page's verb, on the bar the whole app uses ---- */

  const bar = useMemo<ActionGroup[] | null>(() => {
    if (counts.tables === 0) return null
    return [
      {
        id: 'dx-acts',
        rank: 92,
        items: [
          {
            kind: 'button',
            id: 'dx-run',
            label: phase === 'done' ? 'Find rules again' : 'Find rules',
            say: 'Measure the rules your price file already follows',
            icon: MagnifyingGlass,
            onPick: run,
            refusal:
              phase === 'working'
                ? 'It is reading your price file now. The findings appear as they are measured.'
                : undefined,
          },
        ],
      },
    ]
  }, [counts.tables, phase, run])
  /* THE VERB TRAVELS WITH THE VIEW. Business rules draws this band
     inside one of three views now, and an action bar carrying the
     verbs of two surfaces a person cannot see is the clutter that
     re-composition was for. The default is `true`, so anywhere this
     band is simply mounted — a module page, a future surface — it
     behaves exactly as it did. */
  useActionBar('discovery', showActions ? bar : null)

  /* NOTHING TO MEASURE IS SAID WHERE IT IS REFUSED, not by drawing a
     panel about patterns over an empty project. */
  if (counts.tables === 0) return null

  const proposals = report ? report.proposals.filter((c) => !decided.has(c.id)) : []
  const shownProposals = allProposals ? proposals : proposals.slice(0, FIRST_FEW)
  const declined = report ? report.notProposed : []
  const shownDeclined = showDeclined ? declined : []

  return (
    <section className="cn-band dx" aria-label="Rules your price file already follows">
      <p className="dx-eyebrow">Discovered rules</p>
      <h3 className="cn-band-title">The rules your price file already follows</h3>
      {/* THE LEDE IS GONE AND THE LINE STAYS, which is the whole of the
          judgement here. What was measured, how often it holds and
          which rows disagree are on every card, in figures. What a
          person CANNOT read off a card is the ceiling on all of it:
          nothing discovered may remove a row from a list. That is a
          refusal, and a refusal keeps its sentence. */}
      <p className="dx-line">
        Measured, not stated. These may <b>warn</b>; none may remove a row from a list.
      </p>

      {phase === 'working' && (
        <div className="dx-working">
          <p className="dx-working-say" role="status">
            Reading your price file.
          </p>
          <div className="dx-bar" aria-hidden="true">
            <span className="dx-bar-fill" style={{ transform: `scaleX(${share})` }} />
          </div>
          <p className="dx-working-step" aria-hidden="true">
            {progress
              ? `${n(progress.done)} of ${n(progress.total)} · ${progress.step}`
              : 'starting'}
          </p>
        </div>
      )}

      {report && (
        <>
          <Scanned report={report} stale={stale} onRun={run} />

          {kept.length > 0 && (
            <section className="dx-sec" aria-label="Patterns you have kept">
              <h4 className="dx-sec-name">
                Kept as warnings
                <span className="dx-sec-count">{n(kept.length)}</span>
              </h4>
              {/* said once, above, for every section on this panel */}
              <ul className="dx-kept">
                {kept.map((k) => (
                  <li key={k.id} className="dx-kept-row">
                    <p className="dx-kept-says">{k.statement}</p>
                    <p className="dx-kept-fig">
                      <b className="dx-kept-n">
                        {n(k.hits)} of {n(k.tested)}
                      </b>
                      <span className="dx-kept-of">
                        when you kept it
                        {k.meanLeft !== null && k.catalogue !== null
                          ? ` · left ${pct(k.meanLeft)} of ${n(k.catalogue)} standing`
                          : ''}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="dx-act"
                      onClick={() => onForget(k.id)}
                      aria-label={`Stop keeping: ${k.statement}`}
                    >
                      Stop keeping it
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.scanned.pairings === 0 ? (
            <p className="dx-none">
              Nothing in this price file pairs one table with another yet, so there is no
              pattern to measure. A pattern is read across a join — two tables naming each
              other row by row.
            </p>
          ) : proposals.length === 0 ? (
            <p className="dx-none">
              {report.proposalsTotal === 0
                ? `Nothing cleared a threshold. ${n(report.notProposedTotal)} candidates were measured and declined, and each one below says the number that killed it.`
                : `You have decided about all ${n(report.proposalsTotal)} of them.`}
            </p>
          ) : (
            <section className="dx-sec" aria-label="What was found">
              <h4 className="dx-sec-name">
                Found in your values
                <span className="dx-sec-count">{n(proposals.length)}</span>
              </h4>
              <p className="dx-sec-say">Strongest first — by how much it narrows.</p>
              <ul className="dx-list">
                {shownProposals.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    open={openId === c.id}
                    onOpen={(open) => setOpenId(open ? c.id : null)}
                    onKeep={onKeep}
                    onDismiss={onDismiss}
                  />
                ))}
              </ul>
              {proposals.length > FIRST_FEW && (
                <button
                  type="button"
                  className="dx-more"
                  onClick={() => setAllProposals((v) => !v)}
                  aria-expanded={allProposals}
                >
                  {allProposals
                    ? `Show the first ${n(FIRST_FEW)}`
                    : `Show the other ${n(proposals.length - FIRST_FEW)}`}
                </button>
              )}
            </section>
          )}

          {dismissed.length > 0 && (
            <section className="dx-sec" aria-label="Patterns you have dismissed">
              <button
                type="button"
                className="dx-toggle"
                onClick={() => setShowDismissed((v) => !v)}
                aria-expanded={showDismissed}
              >
                <span className="dx-toggle-mark" aria-hidden="true">
                  {showDismissed ? (
                    <CaretDown size={ICON_SIZE.tiny} />
                  ) : (
                    <CaretRight size={ICON_SIZE.tiny} />
                  )}
                </span>
                Dismissed by you
                <span className="dx-sec-count">{n(dismissed.length)}</span>
              </button>
              {showDismissed && (
                <ul className="dx-kept">
                  {dismissed.map((k) => (
                    <li key={k.id} className="dx-kept-row">
                      <p className="dx-kept-says">{k.statement}</p>
                      <p className="dx-kept-fig">
                        <b className="dx-kept-n">
                          {n(k.hits)} of {n(k.tested)}
                        </b>
                        <span className="dx-kept-of">still measured, still counted</span>
                      </p>
                      <button
                        type="button"
                        className="dx-act"
                        onClick={() => onForget(k.id)}
                        aria-label={`Offer again: ${k.statement}`}
                      >
                        Offer it again
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* WHAT FAILED IS AS INFORMATIVE AS WHAT PASSED. A refusal
              with a number on it is a finding; the absence of one is
              an invitation to guess again. */}
          {declined.length > 0 && (
            <section className="dx-sec" aria-label="Measured and not proposed">
              <button
                type="button"
                className="dx-toggle"
                onClick={() => setShowDeclined((v) => !v)}
                aria-expanded={showDeclined}
              >
                <span className="dx-toggle-mark" aria-hidden="true">
                  {showDeclined ? (
                    <CaretDown size={ICON_SIZE.tiny} />
                  ) : (
                    <CaretRight size={ICON_SIZE.tiny} />
                  )}
                </span>
                Measured, and not proposed
                <span className="dx-sec-count">
                  {n(declined.length)} of {n(report.notProposedTotal)}
                </span>
              </button>
              {showDeclined && (
                <ul className="dx-no-list">
                  {shownDeclined.map((c) => (
                    <Declined key={c.id} candidate={c} />
                  ))}
                </ul>
              )}
            </section>
          )}

          <p className="cn-wb-src">{boundsSay(report.bounds)}</p>
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* What it was pointed at                                      */
/* ---------------------------------------------------------- */

function Scanned({
  report,
  stale,
  onRun,
}: {
  report: DiscoveryReport
  stale: boolean
  onRun: () => void
}): ReactElement {
  const s = report.scanned
  return (
    <div className="dx-scan">
      <ul className="dx-scan-list">
        <li className="dx-scan-item">
          <b className="dx-scan-n">{n(s.rows)}</b>
          <span className="dx-scan-what">rows read, across {n(s.tables)} tables</span>
        </li>
        <li className="dx-scan-item">
          <b className="dx-scan-n">{n(s.pairings)}</b>
          <span className="dx-scan-what">
            pairings your price file writes, over {n(s.relationships)} pairs of tables
          </span>
        </li>
        <li className="dx-scan-item">
          <b className="dx-scan-n">{n(s.comparisons)}</b>
          <span className="dx-scan-what">comparisons made</span>
        </li>
        <li className="dx-scan-item">
          <b className="dx-scan-n">{(report.ms / 1000).toFixed(1)}s</b>
          <span className="dx-scan-what">to read it, without holding up the app</span>
        </li>
      </ul>
      {stale && (
        <p className="dx-stale">
          Your sheet has changed since this was measured, so these figures are the old ones.{' '}
          <button type="button" className="dx-act" onClick={onRun}>
            Measure it again
          </button>
        </p>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* One candidate                                               */
/* ---------------------------------------------------------- */

function CandidateCard({
  candidate,
  open,
  onOpen,
  onKeep,
  onDismiss,
}: {
  candidate: Candidate
  open: boolean
  onOpen: (open: boolean) => void
  onKeep: (c: Candidate) => void
  onDismiss: (c: Candidate) => void
}): ReactElement {
  const c = candidate
  const f = figuresFor(c)
  const shape = SHAPE_SAY[c.shape]

  return (
    <li className="dx-card">
      <p className="dx-meta">
        <span className="dx-tag">{shape.name}</span>
        <span className="dx-meta-sep" aria-hidden="true">
          ·
        </span>
        <span className="dx-meta-rel">{c.relationship}</span>
      </p>

      <p className="dx-says">{c.statement}</p>

      {/* THE TWO FIGURES, SIDE BY SIDE. This pair is the whole
          argument of the screen and it is drawn as a pair for that
          reason — one above the other, or one without the other, and
          the F8-versus-F9 lesson is gone. */}
      <div className="dx-figs">
        <div className="dx-fig">
          <span className="dx-fig-k">Holds</span>
          <b className="dx-fig-n">{f.holds}</b>
          <span className="dx-fig-say">{f.holdsSay}</span>
        </div>
        <div className="dx-fig">
          <span className="dx-fig-k">Leaves standing</span>
          <b className="dx-fig-n">{f.leaves}</b>
          <span className="dx-fig-say">{f.leavesSay}</span>
        </div>
      </div>

      <p className="dx-because">
        Because {c.because}. {verdictSay(c.verdict)}.
      </p>

      <div className="dx-acts">
        <button
          type="button"
          className="dx-act"
          onClick={() => onOpen(!open)}
          aria-expanded={open}
        >
          <span className="dx-toggle-mark" aria-hidden="true">
            {open ? <CaretDown size={ICON_SIZE.tiny} /> : <CaretRight size={ICON_SIZE.tiny} />}
          </span>
          {open ? 'Hide the working' : 'Check it'}
        </button>
        <button
          type="button"
          className="dx-act dx-act--keep"
          onClick={() => onKeep(c)}
          aria-label={`Keep as a warning: ${c.statement}`}
        >
          Keep as a warning
        </button>
        <button
          type="button"
          className="dx-act"
          onClick={() => onDismiss(c)}
          aria-label={`Dismiss: ${c.statement}`}
        >
          Dismiss
        </button>
        {/* SAID BESIDE THE BUTTON THAT DOES IT, not in a footnote. */}
        <span className="dx-acts-note">Keeping it makes a warning, never a filter.</span>
      </div>

      {open && (
        <div className="dx-check">
          <p className="dx-check-head">{counterSay(c)}</p>

          {c.counterExamples.length > 0 && (
            <ul className="dx-ce">
              {c.counterExamples.map((ce, i) => (
                <li className="dx-ce-row" key={`${ce.subject}|${ce.partner}|${i}`}>
                  <span className="dx-ce-pair">
                    <span className="dx-ce-subject">{ce.subject}</span>
                    <span className="dx-ce-arrow" aria-hidden="true">
                      ·
                    </span>
                    <span className="dx-ce-partner">{ce.partner}</span>
                  </span>
                  <span className="dx-ce-why">{ce.detail}</span>
                  {ce.recommended && (
                    <span className="dx-ce-rec">your price file recommends this pairing</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Working candidate={c} />

          <p className="dx-check-rule">
            The threshold that decided it: {c.threshold}.
          </p>
          <p className="dx-check-observed">{OBSERVED_SAY}</p>
          {/* NOT `.cn-wb-src`, which is `--ink-faint` — 4.21:1 over
              the sunken plane this drawer is drawn on, and the floor
              is 4.5. Same 11px mono provenance line, one tier up. */}
          <p className="dx-check-src">{c.source}</p>
        </div>
      )}
    </li>
  )
}

/** The readings that are not the headline: what each side threw
 *  away, how unique the key is, and the two outright refusals. */
function Working({ candidate }: { candidate: Candidate }): ReactElement {
  const c = candidate
  const u = uniquenessSay(c)
  const del = deleteSay(c)
  const rec = recommendationSay(c)
  const ex = excludedSay(c)
  return (
    <>
      {u && <p className="dx-check-note">{u}</p>}
      {ex.map((line) => (
        <p className="dx-check-note" key={line}>
          {line}
        </p>
      ))}
      {rec && <p className="dx-check-note dx-check-note--sharp">{rec}</p>}
      {del && <p className="dx-check-note dx-check-note--sharp">{del}</p>}
    </>
  )
}

/* ---------------------------------------------------------- */
/* One that did not clear its bar                              */
/* ---------------------------------------------------------- */

function Declined({ candidate }: { candidate: Candidate }): ReactElement {
  const c = candidate
  const f = figuresFor(c)
  return (
    <li className="dx-no">
      <p className="dx-no-says">{c.statement}</p>
      <p className="dx-no-why">
        <b className="dx-no-n">{f.holds}</b>
        <span className="dx-no-left">
          {f.leaves === '—' ? 'nothing to leave standing' : `leaves ${f.leaves}`}
        </span>
        <span className="dx-no-rule">{c.threshold}</span>
      </p>
    </li>
  )
}

/* ---------------------------------------------------------- */
/* Every bound the run applied, and what each withheld          */
/* ---------------------------------------------------------- */

/** A BOUND THAT HIDES ITS OWN EFFECT IS INDISTINGUISHABLE FROM A
 *  BUG. Each clause is a count off `DiscoveryBounds`; a bound that
 *  withheld nothing says nothing. */
export function boundsSay(b: DiscoveryBounds): string {
  const parts: string[] = []
  if (b.incomparable > 0) {
    parts.push(
      `${n(b.incomparable)} pairs of numbers were never compared, because their two headers do not declare the same unit`,
    )
  }
  if (b.restated > 0) {
    parts.push(
      `${n(b.restated)} were declined because the first column merely spells the second one out`,
    )
  }
  if (b.duplicates > 0) {
    parts.push(`${n(b.duplicates)} findings reached twice were merged into one`)
  }
  if (b.thin > 0) {
    parts.push(
      `${n(b.thin)} were measured on fewer than ${n(b.minTested)} rows and held back as noise`,
    )
  }
  if (b.withheld > 0) {
    parts.push(
      `${n(b.withheld)} cleared their threshold but sit below this page's cap of ${n(b.maxPerShape)} a shape`,
    )
  }
  if (parts.length === 0) return 'Nothing was held back from this run.'
  return `Held back from this run: ${parts.join('; ')}.`
}
