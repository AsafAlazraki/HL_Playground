/* ============================================================
   THE OFFER — what happens the instant a table is dropped in.

   We look at both tables, say what we think in one English
   sentence, and then wait. Three buttons and nothing else:

       Use this  ·  Show all motors  ·  Pick a different rule

   NOTHING IS APPLIED UNTIL ONE IS PRESSED. No join table is made,
   no rule is stored, and pressing Escape leaves the page exactly
   as it was. "The suggestion is a guess offered, never a rule
   silently applied."
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { motion } from 'motion/react'
import { ArrowUUpLeft, Check } from '@phosphor-icons/react'
import type { ClauseGroup, CompareOp, EntityDef } from '@/types/model'
import { curatedOnly, describeRule, opWord, PICKABLE_OPS, plural, thisOne } from './describe'
import { pickableColumns, pickedRule, suggestRule } from './suggest'
import { KindMark } from './marks'
import { SPRING, transitionFor, useStillness } from './stillness'

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
  const [targetFieldId, setTargetFieldId] = useState(targetCols[0]?.id ?? '')
  const [op, setOp] = useState<CompareOp>('eq')
  const [rootFieldId, setRootFieldId] = useState(rootCols[0]?.id ?? '')

  const firstRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const many = plural(target.name)
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

          <div className="vw-offer-acts">
            {suggestion.group ? (
              <button
                ref={firstRef}
                type="button"
                className="btn btn-primary"
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
