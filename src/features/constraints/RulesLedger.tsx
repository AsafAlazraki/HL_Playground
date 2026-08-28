/* ============================================================
   WHAT THE PRICE FILE ASSERTS — the sixteen rules, grouped by what
   they are about, each led by the rate it was measured at.

   THE COMPLAINT THIS ANSWERS, verbatim:

   > "the modules and tables and all of that is great but the what fits
   >  what and the business rules and stuff look half baked with how
   >  good everything else is … why am i seeing not checked yet"

   Every one of those "Not checked yet" stamps was TRUE, and the
   honesty is not the problem. The ORDER was. A card that opens with
   what we have not built, on a page that repeats it ten times, reads
   as an unfinished feature — beside a modules page that reads as a
   finished one. Meanwhile the actual subject of the screen, sixteen
   rules mined out of a real price file with their cell references and
   their measured hit rates, was two lines further down in 13px grey.

   SO THE ORDER IS INVERTED, AND NOTHING IS REMOVED.

     1  THE RATE, first and largest. 100 %, and under it "581 of 581
        testable live pairings take a trailer from a series built for
        the boat's own brand". That is a remarkable fact about a
        business and it now reads like one.
     2  THE RULE ITSELF, in the adjudicator's words, and the `because`
        clause under it.
     3  THE QUALIFICATION, which may never be separated from the
        figure — F9 holds on 530 of 530 pairings AND leaves 97.7 % of
        the catalogue standing, and quoting the first without the
        second is how a floor gets promoted to a selector.
     4  WHAT IS BEING CHECKED, on your data, now — computed on render
        where this app can compute it, so the figure moves with the
        sheet rather than going stale in a string.
     5  WHAT IS NOT CHECKED, LAST, AND ALWAYS WITH A REASON. "Not
        checked yet" alone is a shrug. "Not checked here: it compares a
        column on the boat with a column on the motor, and a sentence
        can only talk about one kind of table at a time" is a position
        a person can argue with.

   GROUPED BY SUBJECT, NOT BY STATUS. Trailers, motors, rigging and
   propellers, the boat row, registration — so the page is about the
   business rather than about our progress. That is the whole
   re-composition in one sentence.

   THE RAIL TAKES THE TABLE'S OWN COLOUR. A group names a TableKind and
   the accent is read off a live table of that kind in the loaded
   project — `accentVar(entity.accent)`, exactly as Home and the module
   dashboard do it. A sheet with no trailer tables draws a hairline
   instead of inventing a hue for a table that is not there.

   NOT ONE FIGURE ON THIS SURFACE IS TYPED IN. Every rate comes from
   `ruleLedger.ts`, whose every numerator and denominator is checked
   against the seed's own provenance line by `ruleLedger.test.ts`; the
   percentage is derived from the pair; and the live counts are walked
   out of the store on render.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowSquareOut, CheckCircle, Circle } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { accentVar, isRetired } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  RULE_GROUPS,
  holdRate,
  ledgerFor,
  ruleState,
  type RuleGroup,
  type RuleLedgerEntry,
  type RuleState,
} from './ruleLedger'
import { WORKBOOK_RULES, type WorkbookRuleRef, type WorkbookRuleSeed } from './workbookRules'
import { Provenance, readSource, withFigures } from './Provenance'

/** One sentence, measured off the loaded sheet on render, for a rule
 *  this app is actually running. Keyed by the adjudication's reference
 *  so the caller — which owns the store reads — decides what it can
 *  honestly compute, and this component never guesses. */
export interface LiveReading {
  /** the figure, drawn in mono beside the sentence */
  figure: string
  /** what it counts, in the dealer's words */
  says: string
}

export interface RulesLedgerProps {
  /** ids the engine is carrying. The truth about what is checked;
   *  `seed.blocked` is only a default for when the id is absent. */
  liveIds: ReadonlySet<string>
  /** what this app measured on THIS sheet, for the rules it runs */
  live?: Partial<Record<WorkbookRuleRef, LiveReading>>
}

export function RulesLedger({ liveIds, live }: RulesLedgerProps): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)

  /* THE RAIL COLOUR, READ OUT OF THE PROJECT. A group says which kind
     of table its rules bite on; the colour is whatever the dealer's
     own table of that kind is drawn in everywhere else in the app, so
     the trailer rules are the same ochre as the trailer tables on Home
     without this file knowing what ochre is. */
  const accents = useMemo(() => {
    const out = new Map<RuleGroup['id'], string>()
    const live = Object.values(entities).filter((e) => !isRetired(e))
    for (const group of RULE_GROUPS) {
      /* The named table first, because "the first table of this kind"
         is whatever order the store iterates in — and three of this
         sheet's tables are `custom` in two different hues. */
      const named = group.table
        ? live.find((e) => e.name.trim().toLowerCase() === group.table!.toLowerCase())
        : undefined
      const table = named ?? live.find((e) => e.kind === group.kind)
      if (table) out.set(group.id, accentVar(table.accent))
    }
    return out
  }, [entities])

  const grouped = useMemo(() => {
    const seen = new Set<WorkbookRuleSeed>()
    const rows = RULE_GROUPS.map((group) => {
      const seeds = WORKBOOK_RULES.filter((s) => ledgerFor(s.ref)?.group === group.id)
      for (const s of seeds) seen.add(s)
      return { group, seeds }
    }).filter((r) => r.seeds.length > 0)

    /* A SEED WITH NO LEDGER ENTRY IS STILL DRAWN. If somebody adds a
       seventeenth rule and forgets to file it, it lands here rather
       than vanishing — a list that quietly loses one is how a person
       learns not to trust the count. `ruleLedger.test.ts` fails first,
       so this should never render; it exists so that if it does, the
       rule is on screen and not missing. */
    const unfiled = WORKBOOK_RULES.filter((s) => !seen.has(s))
    return { rows, unfiled }
  }, [])

  if (WORKBOOK_RULES.length === 0) return null

  return (
    <section className="cn-ledger" aria-label="What this price file asserts">
      {grouped.rows.map(({ group, seeds }) => (
        /* THE GROUP HOST CARRIES THE KIND, and everything inside it
           reads `--kind` rather than being handed a colour. A group
           names a TableKind and the hue is read off a live table of
           that kind in the loaded project, so trailer rules are the
           same ochre as the trailer tables on Home — which is the
           discipline that keeps this identity rather than decoration:
           a hue only ever appears on something that HAS that kind. */
        <section
          key={group.id}
          className="cn-grp"
          aria-label={group.name}
          style={{ '--kind': accents.get(group.id) ?? 'var(--kind-slate)' } as CSSProperties}
        >
          {/* A TINTED BAND HEAD, WHICH IS WHAT DESIGN_PRINCIPLES §1 NOW
              ALLOWS: "a kind hue may carry a SURFACE — a tinted band
              head, a card rail at full height". It was a 7px dot on
              white, which is the demotion PHASE_TWO §1b calls going
              backwards. The name and the count are ink on the tint, not
              hue, and the tint is 10 % — under the point at which any
              ink on it moves by a contrast point. */}
          <header className="cn-grp-head k-band">
            <span className="k-dot" aria-hidden="true" />
            <h3 className="cn-grp-name">{group.name}</h3>
            <span className="cn-grp-count">
              {seeds.length} {seeds.length === 1 ? 'rule' : 'rules'}
            </span>
          </header>
          <p className="cn-grp-say">{group.say}</p>

          <ul className="cn-grp-list">
            {seeds.map((seed) => (
              <RuleRow
                key={seed.id}
                seed={seed}
                entry={ledgerFor(seed.ref)}
                state={ruleState(seed, liveIds)}
                accent={accents.get(group.id) ?? 'var(--hairline-strong)'}
                live={live?.[seed.ref]}
              />
            ))}
          </ul>
        </section>
      ))}

      {grouped.unfiled.length > 0 && (
        <section className="cn-grp" aria-label="Not yet filed">
          {/* no kind, so no hue — the host does not set `--kind` and the
              band falls back to the neutral ds.css parks there */}
          <header className="cn-grp-head k-band">
            <span className="k-dot" aria-hidden="true" />
            <h3 className="cn-grp-name">Not yet filed</h3>
            <span className="cn-grp-count">{grouped.unfiled.length}</span>
          </header>
          <p className="cn-grp-say">Read out of your price file, not yet filed.</p>
          <ul className="cn-grp-list">
            {grouped.unfiled.map((seed) => (
              <RuleRow
                key={seed.id}
                seed={seed}
                entry={null}
                state={ruleState(seed, liveIds)}
                accent="var(--hairline-strong)"
                live={live?.[seed.ref]}
              />
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* One rule                                                    */
/* ---------------------------------------------------------- */

function RuleRow({
  seed,
  entry,
  state,
  accent,
  live,
}: {
  seed: WorkbookRuleSeed
  entry: RuleLedgerEntry | null
  state: RuleState
  accent: string
  live?: LiveReading
}): ReactElement {
  const measure = entry?.measure
  /* THE REASONING, SHUT BY DEFAULT. See the note at the disclosure. */
  const [why, setWhy] = useState(false)
  /* the `said` pieces of the citation — read from the seed's own
     string, so this and the citation below can never disagree */
  const narrative = readSource(seed.source)
    .parts.filter((p) => p.k === 'said')
    .map((p) => p.text)

  return (
    <li
      className={`cn-rl is-${state}`}
      /* the FULL-HEIGHT rail in the kind's hue — `k-rail` is 3px by
         the system's own definition, and `--cn-rl-accent` is kept as
         the name the stylesheet already knows it by */
      style={{ '--cn-rl-accent': accent, '--kind': accent } as CSSProperties}
    >
      <div className="cn-rl-top">
        {measure ? (
          <p className="cn-rl-rate">
            <b className="cn-rl-rate-n">{holdRate(measure)}</b>
            <span className="cn-rl-rate-of">
              <b>
                {measure.held.toLocaleString('en-AU')} of{' '}
                {measure.tested.toLocaleString('en-AU')}
              </b>{' '}
              {measure.of}
            </span>
          </p>
        ) : (
          <p className="cn-rl-rate cn-rl-rate--stated">
            <span className="cn-rl-rate-of">
              {entry?.asserts ?? 'Read out of your price file.'}
            </span>
          </p>
        )}
        <StatusPill state={state} where={seed.enforcedIn} />
      </div>

      {/* THE SAME MEASUREMENT, SEEN. `held / tested` as a 4px rule in
          the kind's own hue, so 685 of 757 does not read like 581 of
          581 at a glance. It is `aria-hidden` because the figure
          above it states the same thing in words, and drawn only
          where there IS a measurement — a rule the workbook asserts
          without a rate may never be given a bar it never had. */}
      {measure && measure.tested > 0 ? (
        <div className="cn-rl-meter" aria-hidden="true">
          <span
            className="cn-rl-meter-fill"
            style={{ width: `${Math.min(100, (measure.held / measure.tested) * 100)}%` }}
          />
        </div>
      ) : null}

      <p className="cn-rl-says">{seed.statement}</p>

      {/* THE REASONING MOVED BEHIND A DISCLOSURE, WHICH IS WHERE
          PHASE_TWO SENDS IT: "the explanation does not disappear; it
          moves to where it is needed — the first time, on hover,
          behind a ?". Sixteen cards each carrying a `because` and a
          `caveat` is what made this the worst-measured surface in the
          app at 69 % explanation. Both are still here, in full, one
          press away, and neither is paraphrased.

          THE QUALIFICATION STILL TRAVELS WITH THE FIGURE — it is in
          the same disclosure as the reason, so a person who opens one
          gets both. F9 holds on 530 of 530 pairings AND leaves 97.7 %
          of the catalogue standing; FITMENT_RULES.md calls quoting the
          first without the second "the A2 failure … it does not get
          made twice", and a closed detail quotes neither. */}
      <div className="cn-rl-why-more">
        {/* NOT A `details`. It was one, and this browser's closed
            `::details-content` still reported a box — measured: the
            `because` paragraph had a 19.5px client rect with `open`
            false, so every word of it was still on screen to anything
            reading the layout, and to a person if the UA ever changed
            its mind. State and a conditional render is the version
            that is actually shut, and it is the version that can carry
            hover, press and focus. */}
        <button
          type="button"
          className="cn-rl-why-sum"
          aria-expanded={why}
          onPointerDown={() => setWhy((v) => !v)}
        >
          Why
        </button>
        {why ? (
          <>
            <p className="cn-rl-because">Because {seed.because}.</p>
            {entry ? <p className="cn-rl-caveat">{entry.caveat}</p> : null}
            {/* THE ADJUDICATOR'S NARRATIVE, drawn here rather than in
                the citation below. The citation itself — the file and
                the cell addresses — is never moved; this is the
                paragraph about the evidence, and sixteen of them
                stacked down one column is the app talking about its
                own workings. Same words, same source, read by
                `readSource` from the same string. */}
            {narrative.map((t, i) => (
              <p key={`n${i}`} className="cn-rl-caveat">
                {withFigures(t)}
              </p>
            ))}
          </>
        ) : null}
      </div>

      {/* WHAT IT FOUND ON THIS SHEET, walked on render. A figure that
          moves with the data cannot go stale, and it is the argument
          this whole app is making. */}
      {live ? (
        <p className="cn-rl-live">
          <span className="cn-rl-live-k">On your sheet now</span>
          <b className="cn-rl-live-n">{live.figure}</b>
          <span className="cn-rl-live-what">{live.says}</span>
        </p>
      ) : null}

      {/* LAST, AND NEVER WITHOUT A REASON. `plainly` is required beside
          `blocked` for precisely this line; if one is ever missing, say
          so rather than print an empty excuse.

          THE STAMP CAME OFF THE FRONT OF IT. This line opened "Not
          checked here." and the pill four rows up already says
          exactly that — measured on Business rules, ten of ten
          pending cards printed the phrase twice, once as a state and
          once as the first three words of its own reason. A state is
          a mark; a reason is a sentence; saying the state again in
          the sentence spends a tenth of the reason repeating the
          chip. The reason is untouched. */}
      {state === 'pending' ? (
        <p className="cn-rl-why">{seed.plainly ?? 'This app cannot express this rule yet.'}</p>
      ) : null}

      {/* THE PROVENANCE IS THE POINT. Anyone can write a rule and claim
          the business asked for it; this line is how you check. Mono
          because it is a reference, and it wraps rather than truncating
          — a half-printed cell address cannot be looked up. */}
      <Provenance text={seed.source} narrative="omit" />
    </li>
  )
}

/* ---------------------------------------------------------- */

/* A rule enforced by a block on THIS page carries "Business rules · …"
   in its seed, because that string is written for whoever is reading
   the seed rather than for whoever is standing on the page. Printed
   here unedited it says "Checked in Business rules" to somebody who is
   already in Business rules, which reads as a broken pointer. The
   second half is the block's own name and it is the useful half. */
const HERE = 'Business rules · '

function StatusPill({ state, where }: { state: RuleState; where?: string }): ReactElement {
  const size = ICON_SIZE.tiny
  if (state === 'here') {
    return (
      <span className="cn-rl-pill is-here">
        <CheckCircle size={size} weight="fill" aria-hidden="true" />
        Checked on every row
      </span>
    )
  }
  if (state === 'elsewhere') {
    const at = where ?? ''
    return (
      <span className="cn-rl-pill is-elsewhere">
        <ArrowSquareOut size={size} weight="bold" aria-hidden="true" />
        {at.startsWith(HERE) ? `Checked on this page · ${at.slice(HERE.length)}` : `Checked in ${at}`}
      </span>
    )
  }
  return (
    <span className="cn-rl-pill is-pending">
      <Circle size={size} weight="regular" aria-hidden="true" />
      Not checked here
    </span>
  )
}
