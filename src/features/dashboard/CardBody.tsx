/* ============================================================
   THE SEVEN CARDS.

   EVERY FIGURE ON THIS PAGE IS COUNTED HERE AND NOW. The
   arithmetic is in `cards.ts` so it can be tested; this file is
   the drawing of it, and it holds no numbers of its own.

   THREE RULES THIS FILE KEEPS, ALL OF THEM CHECKABLE BY READING
   IT TOP TO BOTTOM:

     1. NOTHING IS INVENTED. There is no placeholder figure, no
        sample row, no percentage of a target nobody set, and no
        chart over data this app is not keeping. Where a trend
        would be the obvious thing to draw, it is absent, because
        the app records no history to draw one from.

     2. A CARD WITH NOTHING IN IT SAYS SO IN A SENTENCE AND
        OFFERS THE ACT THAT WOULD GIVE IT SOMETHING. Never a
        blank rectangle and never a spinner over an answer that
        is already known to be zero.

     3. EVERY FIGURE IS MONO AND TABULAR. `.ds-mono` and
        `.ds-mono-sm` for figures inside a row; `.dsh-fig-n` for
        the large counted ones, which is a whole type step — size,
        weight, leading and tracking together (§2 rule 6) —
        declared in dashboard.css because the system has no mono
        step above 15px. DESIGN_PRINCIPLES §2: a number in a
        column is what mono is for, and money lines up on the
        decimal because of it.

   ONE ACCENT, AND IT IS NOT SPENT HERE. §1 asks for roughly four
   appearances a screen, and a page of five cards each with an
   accent figure on it is five before anything else is counted.
   So the cards are ink and surface only: the large figure leads
   by SIZE, not by colour. The accent on this screen is the one
   primary fast action, the focus ring, and hover. The kind hues
   do not appear at all — a dashboard of seven differently-tinted
   cards is the theme §1 forbids.
   ============================================================ */

import { useMemo } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  ClockCounterClockwise,
  FileText,
  Files,
  Scales,
  SealWarning,
  SquaresFour,
  Table,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useQuotes, quoteTotals, localDay } from '@/features/quote'
import { useLintFindings } from '@/features/review'
/* BY DIRECT PATH, and for the reason the store's own imports
   give: `@/features/constraints` is the feature's barrel and
   pulls its whole React surface — the ledger, the discovery
   panel, the sentence editor — back in behind one count.
   `constraintDefs.ts` imports react, the model, the store and
   one lib helper, and nothing else. */
import { useConstraints } from '@/features/constraints/constraintDefs'
import { money } from '@/lib/money'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { CardId } from './arrangement'
import {
  CARDS,
  biggestTables,
  fileTally,
  moduleRows,
  plural,
  resolveRecent,
  rollFindings,
  rollQuotes,
  rollRules,
} from './cards'
import type { DashboardActs } from './acts'
import { useRecentPicks } from './useRecentPicks'

const MARK = ICON_SIZE.small
const MARK_WEIGHT = weightFor(MARK)

/** The mark on each card's header. One size, one weight, so seven
 *  of them read as one set — the rail's own discipline. */
export const CARD_ICON: Record<CardId, Icon> = {
  'my-quotes': FileText,
  'quotes-by-state': Files,
  'recently-opened': ClockCounterClockwise,
  'my-modules': SquaresFour,
  'the-price-file': Table,
  'data-quality': SealWarning,
  'rules-warning': Scales,
}

export function CardMark({ id }: { id: CardId }): JSX.Element {
  const Glyph = CARD_ICON[id]
  return <Glyph size={MARK} weight={MARK_WEIGHT} />
}

/* ---------------------------------------------------------- */
/* The shared pieces                                          */
/* ---------------------------------------------------------- */

/** WHAT A CARD SAYS WHEN IT HAS NOTHING TO SAY: the sentence,
 *  and the one act that would change that. Never two acts — a
 *  card is a glance, and a glance holds one decision. */
function Nothing({
  say,
  act,
  onAct,
}: {
  say: string
  act?: string
  onAct?: () => void
}): JSX.Element {
  return (
    <div className="dsh-empty">
      <p className="dsh-empty-say ds-small">{say}</p>
      {act && onAct ? (
        <button type="button" className="dsh-act" onClick={onAct}>
          {act}
        </button>
      ) : null}
    </div>
  )
}

/** One large counted figure with the words that qualify it. The
 *  figure is mono because it is a figure; the words are not. */
function Figure({
  n,
  say,
  onPick,
  lead,
}: {
  n: number
  say: string
  onPick?: () => void
  /** the one figure on this card a person reads first */
  lead?: boolean
}): JSX.Element {
  const body = (
    <>
      <span className={`dsh-fig-n${lead ? ' is-lead' : ''}`}>
        {n.toLocaleString()}
      </span>
      <span className="dsh-fig-say ds-caption">{say}</span>
    </>
  )
  if (!onPick) return <div className="dsh-fig">{body}</div>
  return (
    <button type="button" className="dsh-fig dsh-fig-btn" onClick={onPick}>
      {body}
    </button>
  )
}

/** A row in a card's list. It DARKENS on press rather than
 *  scaling (§4) so its neighbours do not look like they moved. */
function Row({
  title,
  under,
  tail,
  label,
  onPick,
}: {
  title: string
  under?: ReactNode
  tail?: ReactNode
  label: string
  onPick: () => void
}): JSX.Element {
  return (
    <button type="button" className="dsh-row" onClick={onPick} aria-label={label}>
      <span className="dsh-row-main">
        <span className="dsh-row-title ds-small">{title}</span>
        {under ? <span className="dsh-row-under ds-caption">{under}</span> : null}
      </span>
      {tail ? <span className="dsh-row-tail">{tail}</span> : null}
    </button>
  )
}

/** The last line of a card: where the whole list lives. */
function More({ say, onPick }: { say: string; onPick: () => void }): JSX.Element {
  return (
    <button type="button" className="dsh-more" onClick={onPick}>
      {say}
    </button>
  )
}

/* ---------------------------------------------------------- */
/* My quotes                                                  */
/* ---------------------------------------------------------- */

const QUOTE_ROWS = 5

function MyQuotes({ me, acts }: { me: string; acts: DashboardActs }): JSX.Element {
  const quotes = useQuotes()
  const roll = useMemo(() => rollQuotes(quotes, me), [quotes, me])

  if (roll.mine.length === 0) {
    /* THE HONEST MIDDLE CASE. There are quotes and none is
       yours: saying "you have not prepared a quote yet" is true,
       but drawing it alone would read as "nothing has happened
       here", which is false. So it says both. */
    return (
      <Nothing
        say={
          roll.othersOnly
            ? `${CARDS['my-quotes'].empty} ${plural(roll.total, 'quote', 'quotes')} here were prepared by somebody else.`
            : CARDS['my-quotes'].empty
        }
        act={roll.othersOnly ? 'All quotes' : 'New quote'}
        onAct={roll.othersOnly ? acts.onOpenQuotes : acts.onNewQuote}
      />
    )
  }

  return (
    <>
      <div className="dsh-list">
        {roll.mine.slice(0, QUOTE_ROWS).map((q) => {
          const totals = quoteTotals(q)
          return (
            <Row
              key={q.id}
              title={q.subjectLabel}
              under={
                <>
                  <span className="dsh-ref ds-mono-sm">{q.reference}</span>
                  <span className={`dsh-state${q.state === 'issued' ? ' is-issued' : ' is-draft'}`}>
                    {q.state === 'issued' ? 'Issued' : 'Draft'}
                  </span>
                  <span className="dsh-when">{localDay(q.updatedAt)}</span>
                </>
              }
              tail={
                /* A QUOTE WITH AN UNPRICED LINE DOES NOT PRINT A
                   CONFIDENT TOTAL. The document itself says so out
                   loud; a dashboard that rounded it into one number
                   would be the quieter version of the same fault. */
                totals.unpricedCount > 0 ? (
                  <span className="dsh-sum is-partial ds-mono">
                    {money(totals.total)}
                    <span className="dsh-sum-note ds-caption">
                      {plural(totals.unpricedCount, 'line unpriced', 'lines unpriced')}
                    </span>
                  </span>
                ) : (
                  <span className="dsh-sum ds-mono">{money(totals.total)}</span>
                )
              }
              label={`Open quote ${q.reference} — ${q.subjectLabel}`}
              onPick={() => acts.onOpenQuote(q.id)}
            />
          )
        })}
      </div>
      {roll.mine.length > QUOTE_ROWS ? (
        <More
          say={`All ${plural(roll.mine.length, 'quote', 'quotes')} of mine`}
          onPick={acts.onOpenQuotes}
        />
      ) : (
        <More say="All quotes" onPick={acts.onOpenQuotes} />
      )}
    </>
  )
}

/* ---------------------------------------------------------- */
/* Quotes by state                                            */
/* ---------------------------------------------------------- */

function QuotesByState({ acts }: { acts: DashboardActs }): JSX.Element {
  const quotes = useQuotes()
  const roll = useMemo(() => rollQuotes(quotes, ''), [quotes])

  if (roll.total === 0) {
    return (
      <Nothing say={CARDS['quotes-by-state'].empty} act="New quote" onAct={acts.onNewQuote} />
    )
  }

  return (
    <>
      <div className="dsh-figures">
        {/* "1 still drafts" is the kind of line that makes a tool
            feel unfinished — every count on this page picks its
            own words. "issued" is a past participle and reads
            correctly at any number; "draft" is a noun and does
            not. The sentence under the pair is what carries the
            meaning of the two states, so the captions stay nouns
            rather than becoming a clause. */}
        <Figure
          n={roll.drafts}
          say={roll.drafts === 1 ? 'draft' : 'drafts'}
          onPick={acts.onOpenQuotes}
          lead
        />
        <Figure n={roll.issued} say="issued" onPick={acts.onOpenQuotes} />
      </div>
      {/* TWO STATES AND NO THIRD. `QuoteState` is exactly
          'draft' | 'issued' — there is no expiry engine and no
          order conversion (quote/index.ts §7) — so this is the
          whole of it and the card does not imply a funnel it
          cannot count. */}
      <p className="dsh-note ds-caption">
        A quote stays a draft until it is issued. Issuing freezes it.
      </p>
    </>
  )
}

/* ---------------------------------------------------------- */
/* Where I have been                                          */
/* ---------------------------------------------------------- */

function RecentlyOpened({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const picks = useRecentPicks()
  const rows = useMemo(
    () => resolveRecent(picks, entities, rowsByEntity),
    [picks, entities, rowsByEntity],
  )

  if (rows.length === 0) {
    return (
      <Nothing say={CARDS['recently-opened'].empty} act="Find anything" onAct={acts.onFind} />
    )
  }

  return (
    <div className="dsh-list">
      {rows.map((r) => (
        <Row
          key={r.key}
          title={r.title}
          under={r.under ? <span className="dsh-when">{r.under}</span> : undefined}
          label={`Open ${r.under || r.title}`}
          onPick={() => acts.onOpenTable(r.entityId)}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* My modules                                                 */
/* ---------------------------------------------------------- */

const MODULE_ROWS = 5

function MyModules({ acts }: { acts: DashboardActs }): JSX.Element {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const rows = useMemo(
    () => moduleRows(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )

  if (rows.length === 0) {
    return <Nothing say={CARDS['my-modules'].empty} act="Modules" onAct={acts.onOpenModules} />
  }

  return (
    <>
      <div className="dsh-list">
        {rows.slice(0, MODULE_ROWS).map((r) => (
          <Row
            key={r.module.id}
            title={r.module.name}
            under={
              r.module.description.trim() ? (
                <span className="dsh-when">{r.module.description.trim()}</span>
              ) : r.master ? (
                <span className="dsh-when">{r.master}</span>
              ) : undefined
            }
            tail={<span className="dsh-sum ds-mono">{r.rows.toLocaleString()}</span>}
            label={`Open ${r.module.name}`}
            onPick={() => acts.onOpenModule(r.module.id)}
          />
        ))}
      </div>
      <More
        say={rows.length > MODULE_ROWS ? `All ${rows.length} modules` : 'All modules'}
        onPick={acts.onOpenModules}
      />
    </>
  )
}

/* ---------------------------------------------------------- */
/* The price file                                             */
/* ---------------------------------------------------------- */

const BIG_ROWS = 4

function ThePriceFile({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const tally = useMemo(() => fileTally(entities, rowsByEntity), [entities, rowsByEntity])
  const big = useMemo(
    () => biggestTables(entities, rowsByEntity, BIG_ROWS),
    [entities, rowsByEntity],
  )

  if (tally.tables === 0) {
    return (
      <Nothing say={CARDS['the-price-file'].empty} act="Data model" onAct={acts.onOpenDataModel} />
    )
  }

  return (
    <>
      <div className="dsh-figures">
        <Figure n={tally.rows} say="rows you sell from" lead />
        <Figure n={tally.tables} say="tables" />
        {tally.relationships > 0 ? (
          <Figure n={tally.relationships} say="relationships" />
        ) : null}
      </div>
      <div className="dsh-list">
        {big.map((t) => (
          <Row
            key={t.entity.id}
            title={t.entity.name}
            tail={<span className="dsh-sum ds-mono">{t.rows.toLocaleString()}</span>}
            label={`Open ${t.entity.name}`}
            onPick={() => acts.onOpenTable(t.entity.id)}
          />
        ))}
      </div>
      <More say="The drawing" onPick={acts.onOpenDataModel} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* Worth fixing                                               */
/* ---------------------------------------------------------- */

const FINDING_ROWS = 3

function WorthFixing({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const findings = useLintFindings()
  const roll = useMemo(() => rollFindings(findings, FINDING_ROWS), [findings])

  if (findings.length === 0) {
    return <Nothing say={CARDS['data-quality'].empty} />
  }

  return (
    <>
      <div className="dsh-figures">
        {roll.blockers > 0 ? (
          <Figure n={roll.blockers} say={roll.blockers === 1 ? 'blocker' : 'blockers'} lead />
        ) : null}
        <Figure
          n={roll.advisories}
          say={roll.advisories === 1 ? 'advisory' : 'advisories'}
          lead={roll.blockers === 0}
        />
      </div>
      {/* THE TABLE IS THE TITLE AND THE FINDING IS THE LABEL, in
          that order, for two reasons. It is the order a person
          acts in — you go to a table and fix a thing in it, not
          the other way round. And `LintFinding.title` arrives from
          the engine already upper-case ('DUPLICATE FIELD NAME');
          §2 rule 3 allows uppercase as a LABEL and never as a
          name, so it belongs on the metadata line beside what it
          describes, not standing in for the row's name. Neither
          string is re-cased here — re-casing somebody's data is
          the lossy act the rule is about. */}
      <div className="dsh-list">
        {roll.head.map((f) => (
          <Row
            key={f.id}
            title={entities[f.entityId]?.name ?? 'A table since removed'}
            under={
              <>
                <span
                  className={`dsh-dot${f.severity === 'blocker' ? ' is-blocker' : ' is-advisory'}`}
                  aria-hidden="true"
                />
                <span className="dsh-when">{f.title}</span>
              </>
            }
            label={`Open ${entities[f.entityId]?.name ?? 'the table'} — ${f.title}`}
            onPick={() => acts.onOpenTable(f.entityId)}
          />
        ))}
      </div>
    </>
  )
}

/* ---------------------------------------------------------- */
/* Rules that warn                                            */
/* ---------------------------------------------------------- */

const RULE_ROWS = 3

function RulesThatWarn({ acts }: { acts: DashboardActs }): JSX.Element {
  const constraints = useConstraints()
  const roll = useMemo(() => rollRules(constraints), [constraints])

  if (roll.enabled === 0) {
    return (
      <Nothing
        say="No rules are switched on here yet. A rule is a sentence about what must always be true."
        act="Business rules"
        onAct={acts.onOpenRules}
      />
    )
  }

  if (roll.warning.length === 0) {
    return <Nothing say={CARDS['rules-warning'].empty} act="Business rules" onAct={acts.onOpenRules} />
  }

  return (
    <>
      <div className="dsh-figures">
        <Figure n={roll.warning.length} say="warn rather than remove" lead />
        <Figure n={roll.enabled} say="rules switched on" />
      </div>
      <div className="dsh-list">
        {roll.warning.slice(0, RULE_ROWS).map((c) => (
          <Row
            key={c.id}
            title={c.because}
            under={<span className="dsh-when">Annotates the row; removes nothing</span>}
            label={`Open business rules — ${c.because}`}
            onPick={acts.onOpenRules}
          />
        ))}
      </div>
      <More say="All business rules" onPick={acts.onOpenRules} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* The switch                                                 */
/* ---------------------------------------------------------- */

export interface CardBodyProps {
  id: CardId
  /** the signed-in person's name, as it is frozen onto a quote */
  me: string
  acts: DashboardActs
}

export function CardBody({ id, me, acts }: CardBodyProps): JSX.Element {
  switch (id) {
    case 'my-quotes':
      return <MyQuotes me={me} acts={acts} />
    case 'quotes-by-state':
      return <QuotesByState acts={acts} />
    case 'recently-opened':
      return <RecentlyOpened acts={acts} />
    case 'my-modules':
      return <MyModules acts={acts} />
    case 'the-price-file':
      return <ThePriceFile acts={acts} />
    case 'data-quality':
      return <WorthFixing acts={acts} />
    case 'rules-warning':
      return <RulesThatWarn acts={acts} />
  }
}
