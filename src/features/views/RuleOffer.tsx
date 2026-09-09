/* ============================================================
   THE OFFER — what happens the instant a table is dropped in.

   We look at both tables, say what we think in one English
   sentence, and then wait. Three buttons and nothing else:

       Use this  ·  Show all motors  ·  Pick a different rule

   NOTHING IS APPLIED UNTIL ONE IS PRESSED. No join table is made,
   no rule is stored, and pressing Escape leaves the page exactly
   as it was. "The suggestion is a guess offered, never a rule
   silently applied."

   ── AND WHERE IT IS A GUESS, IT SAYS SO (UX_PASS §5, finding 18) ──

   Two of the four suggestions are the file talking: a reference
   column that points at the other table, and a Min/Max envelope
   naming the quantity the other side carries. One is not — two
   tables happening to use one word — and it was drawn identically,
   under a blue primary button, with the same confident voice.

   Measured on the real seed at 1280×800 on 2026-09-09: dropping
   Dunbier Trailers on a Highfield page and pressing PICK A DIFFERENT
   RULE opened with `Series` selected on both sides and USE THIS RULE
   already live — the app had written a committable business rule
   over 193 rows naming neither the boat nor the trailer, and the
   person had chosen nothing. So:

     · the pickers start at the column that NAMES A ROW on each side
       (`displayFieldId`), which is the one column a table is certain
       about, rather than at whatever happens to be written first;
     · a guess is labelled a guess, in a line under the offer;
     · and a guess is not the primary. Nothing on the sheet is,
       because the app does not have a recommendation to make.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { motion } from 'motion/react'
import { ArrowUUpLeft, Check } from '@phosphor-icons/react'
import type { ClauseGroup, CompareOp, EntityDef, FieldDef } from '@/types/model'
import { curatedOnly, describeRule, opWord, PICKABLE_OPS, plural, thisOne } from './describe'
import { pickableColumns, pickedRule, suggestRule } from './suggest'
import { KindMark } from './marks'
import { SPRING, transitionFor, useStillness } from './stillness'

/** Where a picker OPENS — never where a rule ends up.
 *
 *  The column a table names its rows by, when it is one a person can
 *  compare at all; otherwise the first comparable column, which is
 *  where both pickers used to start unconditionally. UX_PASS §5:
 *  *"Prefer `displayFieldId`."* It is the one column a table is
 *  certain about — `Series` is a grouping somebody typed, and on the
 *  real seed it was on both sides of a rule nobody wrote. */
function startColumn(entity: EntityDef, cols: FieldDef[]): string {
  const named = cols.find((f) => f.id === entity.displayFieldId)
  return named?.id ?? cols[0]?.id ?? ''
}

export interface RuleOfferProps {
  root: EntityDef
  target: EntityDef
  /** the rule already in force, when changing one rather than adding */
  current?: ClauseGroup
  /** true when this block already exists — the copy changes, not the flow */
  changing?: boolean
  /** `undefined` means "show everything in the table" */
  onUse: (rule: ClauseGroup | undefined) => void
  onCancel: () => void
}

export function RuleOffer({
  root,
  target,
  current,
  changing = false,
  onUse,
  onCancel,
}: RuleOfferProps): ReactElement {
  const { still } = useStillness()
  const [picking, setPicking] = useState(false)
  const suggestion = useMemo(() => suggestRule(root, target), [root, target])

  const targetCols = pickableColumns(target)
  const rootCols = pickableColumns(root)
  const [targetFieldId, setTargetFieldId] = useState(() => startColumn(target, targetCols))
  const [op, setOp] = useState<CompareOp>('eq')
  const [rootFieldId, setRootFieldId] = useState(() => startColumn(root, rootCols))

  const firstRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const many = plural(target.name)
  /* a guess with nothing to commit is not a guess, it is the empty
     answer — `kind: 'none'` already says so in its own sentence */
  const guessing = suggestion.ground === 'guess' && suggestion.group !== undefined
  const canPick = targetCols.length > 0 && rootCols.length > 0
  const picked =
    targetFieldId && rootFieldId ? pickedRule(targetFieldId, op, rootFieldId) : undefined

  return (
    <motion.section
      className="vw-offer"
      role="group"
      aria-label={`How should ${target.name} relate to ${root.name}?`}
      initial={still ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionFor(still, SPRING)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
    >
      <header className="vw-offer-head">
        <KindMark entity={target} />
        <span className="mono-label">{changing ? 'Change what is shown' : `Relating ${target.name}`}</span>
      </header>

      {!picking ? (
        <>
          {changing && current !== undefined ? (
            <p className="vw-offer-now mono-label">Now: {describeRule(current, root, target)}</p>
          ) : null}

          <p className="vw-offer-ask">{suggestion.sentence}</p>
          <p className="vw-offer-why">{suggestion.because}</p>

          {/* THE GUESS SAYS IT IS ONE. Not a warning and not a
              refusal — the rule may well be right, and the person
              can read the list it produces in a second. What it must
              not do is arrive in the same voice as a link column the
              file actually declares. */}
          {guessing ? (
            <p className="vw-offer-guess">
              <b className="vw-offer-guess-word">That is a guess</b>, from two column names
              rather than anything the file declares. Use it and check what it brings in — or
              show all {many} and pick them yourself.
            </p>
          ) : null}

          <div className="vw-offer-acts">
            {suggestion.group ? (
              <button
                ref={firstRef}
                type="button"
                /* NOT THE PRIMARY WHEN IT IS A GUESS. One primary per
                   surface is rule §1's, and it belongs to the answer
                   the app is sure of. Where it is sure of nothing,
                   the sheet has no primary — which is the honest
                   drawing of "you decide". */
                className={guessing ? 'btn' : 'btn btn-primary'}
                onClick={() => onUse(suggestion.group)}
              >
                <Check size={13} weight="bold" />
                Use this
              </button>
            ) : null}
            <button
              ref={suggestion.group ? undefined : firstRef}
              type="button"
              className="btn"
              onClick={() => onUse(undefined)}
            >
              Show all {many}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPicking(true)}
              disabled={!canPick}
            >
              Pick a different rule
            </button>
            <button type="button" className="btn btn-ghost vw-offer-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="vw-pick">
            <label className="vw-pick-leg">
              <span className="mono-label">Show {many} where their</span>
              <select
                className="field-input vw-select"
                value={targetFieldId}
                onChange={(e) => setTargetFieldId(e.target.value)}
              >
                {targetCols.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="vw-pick-leg">
              <span className="mono-label">Comparison</span>
              <select
                className="field-input vw-select"
                value={op}
                onChange={(e) => setOp(e.target.value as CompareOp)}
              >
                {PICKABLE_OPS.map((o) => (
                  <option key={o} value={o}>
                    {opWord(o)}
                  </option>
                ))}
              </select>
            </label>

            <label className="vw-pick-leg">
              <span className="mono-label">{thisOne(root)}&rsquo;s</span>
              <select
                className="field-input vw-select"
                value={rootFieldId}
                onChange={(e) => setRootFieldId(e.target.value)}
              >
                {rootCols.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="vw-offer-ask">{describeRule(picked, root, target)}</p>

          <div className="vw-offer-acts">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!picked}
              onClick={() => picked && onUse(picked)}
            >
              <Check size={13} weight="bold" />
              Use this rule
            </button>
            <button type="button" className="btn" onClick={() => onUse(curatedOnly())}>
              Only the {many} I pick
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPicking(false)}>
              <ArrowUUpLeft size={13} weight="light" />
              Back
            </button>
          </div>
        </>
      )}
    </motion.section>
  )
}
