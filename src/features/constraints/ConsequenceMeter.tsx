/* ============================================================
   WHAT IT WOULD DO — the consequence of a rule, before the commit.

   THE ARGUMENT THIS SETTLES. A business rule is a claim about a
   dealership's whole catalogue, and until now the only way to find out
   what a claim costs was to add it and read the badge on its card. So
   the moment of highest consequence — the press — was the moment of
   lowest information.

   Everything below is read off the loaded sheet on every keystroke
   (`state.previewConstraint`). Nothing is stored, nothing is seeded and
   nothing is written down, which is the point: a measured figure that
   moves with the data cannot go stale, and a rule that turns out to
   reject four trailers you are selling today should say so while there
   is still a cursor in the sentence.

   AND IT TEACHES F9 AT THE ONE MOMENT THAT MATTERS.
   FITMENT_RULES.md F9 measured the ATM floor at 530 of 530 pairs and
   still refused to promote it, because it leaves 97.70 % of the
   catalogue standing: "a gate that leaves 97.7 % of the catalogue has
   not chosen a trailer." A condition true of every row, or of none, is
   the same failure wearing a different sign — so when the sheet says
   that is what somebody has just written, this says it, in their own
   nouns, before they press anything.
   ============================================================ */

import type { ReactElement } from 'react'
import { previewCount, type RulePreview } from './state'
import './constraints.css'

/** A figure, in the one face every figure in this app is set in. */
function Fig({ n }: { n: number }): ReactElement {
  return <b className="cn-fig">{n.toLocaleString()}</b>
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** One decimal, and only where it says something: "0.9 %" is a
 *  measurement, "0.92307 %" is a machine talking. */
const share = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${((part / whole) * 100).toFixed(1)} %`

/* ---------------------------------------------------------- */

export interface ConsequenceMeterProps {
  preview: RulePreview
}

export function ConsequenceMeter({ preview }: ConsequenceMeterProps): ReactElement {
  const { concepts, tables, rows, conditionReady, looked, ready, kept, broken } = preview

  /* NOTHING CHOSEN — a dashed stub saying what will appear here, which
     is the pattern DESIGN_CONTRACT §5 sets for a control that is drawn
     and not yet able to act. It is not an empty box and it is not a
     zero: a zero is a measurement, and nothing has been measured. */
  if (concepts.length === 0) {
    return (
      <section className="cn-conseq">
        <p className="cn-conseq-label">What it would do</p>
        <p className="cn-conseq-stub">
          Pick a column above and this counts, from your own sheet, how many rows the rule
          would hold for and how many it would reject.
        </p>
      </section>
    )
  }

  /* THE COLUMNS ARE REAL AND NO TABLE HAS BOTH. A rule naming a boat
     column and a motor column reaches no table at all, and the reason
     is worth more than the zero it would otherwise print. */
  if (tables.length === 0) {
    return (
      <section className="cn-conseq">
        <p className="cn-conseq-label">What it would do</p>
        <p className="cn-conseq-say cn-conseq-say--none">
          No table carries every column this sentence names, so the rule would never apply to a
          row. A sentence talks about one kind of table at a time.
        </p>
      </section>
    )
  }

  const where = `on ${tables.length} ${plural(tables.length, 'table', 'tables')}`
  const retired =
    preview.retiredTables > 0
      ? ` · including ${preview.retiredTables} kept for history`
      : ''

  /* THE BAR. The track is every row in reach; the ink is what the rule
     engages; the red is what disagrees with it as the sheet stands. */
  const pct = (n: number): string => `${rows === 0 ? 0 : (n / rows) * 100}%`
  const engaged = ready ? kept : looked

  const label = ready
    ? `Looks at ${looked} of ${rows} rows. ${kept} keep it, ${broken} break it.`
    : `The condition is true of ${looked} of ${rows} rows.`

  /* THE FIGURES ARE DRAWN AS FIGURES. This block used to be three
     stacked sentences with the counts set inline inside them, which
     is the one shape a person cannot scan: the question here is
     "how many, and how many of those break it", and the answer was
     buried in prose that changed length on every keystroke.

     Mono and tabular, so a figure that moves while somebody types
     does not shuffle the words beside it — and the sentence under
     them still says what they are OF, because a figure with no
     denominator is not a measurement. */
  return (
    <section className="cn-conseq">
      <p className="cn-conseq-label">What it would do</p>

      {conditionReady && (
        <>
          <div className="cn-conseq-read">
            <div className="cn-conseq-cell">
              <b className="cn-fig">{looked.toLocaleString()}</b>
              <span className="cn-conseq-term">
                {looked === 1 ? 'row it looks at' : 'rows it looks at'}
              </span>
            </div>
            {ready && (
              <>
                <div className="cn-conseq-cell is-keeps">
                  <b className="cn-fig">{kept.toLocaleString()}</b>
                  <span className="cn-conseq-term">keep it</span>
                </div>
                {/* RED ONLY WHERE IT MEANS SOMETHING. Nought rows
                    breaking a rule is good news, and good news is
                    not drawn in the danger ink. */}
                <div className={broken > 0 ? 'cn-conseq-cell is-breaks' : 'cn-conseq-cell'}>
                  <b className="cn-fig">{broken.toLocaleString()}</b>
                  <span className="cn-conseq-term">break it today</span>
                </div>
              </>
            )}
          </div>

          <div className="cn-bar" role="img" aria-label={label}>
            <span className="cn-bar-keeps" style={{ width: pct(engaged) }} />
            {ready && broken > 0 && <span className="cn-bar-breaks" style={{ width: pct(broken) }} />}
          </div>
        </>
      )}

      {!conditionReady && (
        <p className="cn-conseq-say">
          It would look at <Fig n={rows} /> {preview.noun.many}, {where}
          {retired}. Finish the condition and this counts the ones it holds for.
        </p>
      )}

      {conditionReady && !ready && (
        <p className="cn-conseq-say">
          out of {previewCount(rows, preview)} in reach, {where}
          {retired}. Finish the sentence and this counts what keeps it.
        </p>
      )}

      {ready && (
        <p className="cn-conseq-say">
          out of {previewCount(rows, preview)} in reach, {where}
          {retired}
          {broken > 0 && (
            <>
              {' · '}
              <span className="cn-conseq-share">{share(broken, rows)}</span> of them break it
            </>
          )}
          .
        </p>
      )}

      <Lesson preview={preview} />
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The one sentence a person could not have counted themselves */
/* ---------------------------------------------------------- */

function Lesson({ preview }: { preview: RulePreview }): ReactElement | null {
  const { conditionReady, ready, rows, looked, broken } = preview
  if (!conditionReady || rows === 0) return null

  /* CHOSE NOTHING, the first way: the condition never fires. The rule
     would sit in the register looking like a limit and limiting nothing. */
  if (looked === 0) {
    return (
      <p className="cn-conseq-note">
        No row on your sheet meets this condition, so the rule would never do anything. A rule
        that engages nothing has not chosen anything.
      </p>
    )
  }

  /* CHOSE NOTHING, the second way, and it is F9's exactly: a gate every
     row walks through is a description of the catalogue, not a choice
     about it. */
  if (looked === rows) {
    return (
      <p className="cn-conseq-note">
        That is every row in reach, so the condition itself narrows nothing — whatever this rule
        decides, it decides about the whole catalogue.
      </p>
    )
  }

  if (!ready) return null

  if (broken === 0) {
    return (
      <p className="cn-conseq-note">
        Nothing on the sheet disagrees with it today, so adding it changes what you see on no
        row at all.
      </p>
    )
  }

  return (
    <p className="cn-conseq-note">
      Adding it marks those {broken === 1 ? 'row' : 'rows'} as breaking the rule. It changes
      none of them, and switching the rule off puts them straight back.
    </p>
  )
}
