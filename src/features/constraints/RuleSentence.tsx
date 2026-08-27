/* ============================================================
   THE SENTENCE RENDERER — the only representation of a rule.

   There is no canvas, no node, no handle, no palette, and no second
   template. `sentenceTokens` produces the words once; this component
   draws them either as prose (`editable` false) or as the SAME words
   with live dropdowns in place (`editable` true). The two can never
   drift, because there is only one of them.

   It is used by the rule cards AND by the "write a new rule" builder,
   which holds an unsaved draft and passes `onChange`. Without
   `onChange` an edit is written straight to the registry.
   ============================================================ */

import type { ReactElement, ReactNode } from 'react'
import type { CellValue, ConstraintDef } from '@/types/model'
import { conceptOptionLabel, kindLabel, type ColumnConcept, type ValueDomain } from './columns'
import {
  conceptOf,
  opLabel,
  opsFor,
  sentenceTokens,
  type SentenceOp,
  type SentenceToken,
  type Side,
  type TokenControl,
} from './describe'
import {
  addOneOfValue,
  inferKind,
  removeOneOfValue,
  setClauseConcept,
  setClauseOp,
  setClauseValue,
  unsetSide,
} from './edit'
import { putConstraint } from './constraintDefs'
import { useSentenceCtx } from './useCtx'
import {
  AddChipToken,
  ChipToken,
  InputToken,
  ReadToken,
  SelectToken,
  Word,
  type TokenGroup,
  type TokenOption,
} from './Tokens'
import './constraints.css'

export interface RuleSentenceProps {
  constraint: ConstraintDef
  /** collapsed = read-only prose; open = the same words, live */
  editable?: boolean
  /** the builder's unsaved draft; omit and edits go to the registry */
  onChange?: (next: ConstraintDef) => void
  /** the builder's sentence is set one step larger */
  big?: boolean
  /** THE COLUMNS THIS SENTENCE MAY NAME, as ColumnConcept keys.
   *
   *  Absent means all of them, which is what BUSINESS RULES wants: a
   *  rule written there is about the whole sheet. A module passes the
   *  columns that live on ITS tables, so an admin standing in Boats
   *  writes about boats rather than scrolling past every column in the
   *  business to find one.
   *
   *  IT NARROWS THE PICKER AND NOTHING ELSE. The rule that comes out
   *  is an ordinary rule: one column is one column wherever it
   *  appears, so it bites on every table of that kind and the builder
   *  prints that reach before it is added. And it never empties a
   *  picker — a scope that keeps nothing falls back to the full list,
   *  the same way the obligation picker already falls back when the
   *  condition's kind has no other column. */
  conceptKeys?: ReadonlySet<string>
  /** THE WORD THE FOOTER IS POINTING AT. The composer says which
   *  choice is still to be made and puts the cursor in it; this
   *  lights the word up so the eye lands where the cursor went. It
   *  is the id `sentenceTokens` gave the token — see
   *  `missingSlot` in `state.ts`. */
  soughtTokenId?: string | null
}

/* ---------------------------------------------------------- */
/* Value coercion — a <select> only ever hands back a string   */
/* ---------------------------------------------------------- */

function coerceValue(text: string, domain: ValueDomain | undefined): CellValue {
  switch (domain?.control) {
    case 'boolean':
      return text === 'yes' || text === 'true'
    case 'number': {
      if (text.trim() === '') return null
      const n = Number(text)
      return Number.isFinite(n) ? n : text
    }
    default:
      return text
  }
}

const asText = (v: CellValue, domain: ValueDomain | undefined): string => {
  if (v === null || v === undefined || Array.isArray(v)) return ''
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (domain?.control === 'boolean' && typeof v === 'string') return v
  return String(v)
}

/* ---------------------------------------------------------- */
/* Pickers                                                    */
/* ---------------------------------------------------------- */

/** Columns grouped by what they belong to. One table per brand, so a
 *  concept names how many tables it reaches. */
function conceptGroups(concepts: ColumnConcept[]): TokenGroup[] {
  const groups: TokenGroup[] = []
  for (const c of concepts) {
    const label = kindLabel(c.kind)
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, options: [] }
      groups.push(group)
    }
    group.options.push({ value: c.key, label: conceptOptionLabel(c) })
  }
  return groups
}

function valueOptions(domain: ValueDomain): TokenOption[] {
  if (domain.control === 'boolean') {
    return [
      { value: 'yes', label: 'yes' },
      { value: 'no', label: 'no' },
    ]
  }
  return domain.options.map((o) => ({ value: o, label: o }))
}

/* ---------------------------------------------------------- */
/* The component                                              */
/* ---------------------------------------------------------- */

export function RuleSentence({
  constraint,
  editable = false,
  onChange,
  big = false,
  conceptKeys,
  soughtTokenId = null,
}: RuleSentenceProps): ReactElement {
  const ctx = useSentenceCtx()
  /* a `table` constraint is a curated whitelist: readable as a
     sentence, not restructurable inline (MOCKUP_FINDINGS §2.4) */
  const live = editable && constraint.kind !== 'table'
  const tokens = sentenceTokens(constraint, ctx, live)

  const apply = (next: ConstraintDef): void => {
    const settled: ConstraintDef = { ...next, kind: inferKind(next) }
    if (onChange) onChange(settled)
    else putConstraint(settled)
  }

  /** The obligation lives on the same kind as the condition, or the
   *  rule could never be true of any row. So retargeting the condition
   *  across kinds STRANDS the obligation — and when it does, the
   *  obligation goes back to being an open question.
   *
   *  It used to reach into the column list and pick some other column of
   *  the new kind instead, which wrote half a rule on the reader's
   *  behalf: change "Discontinued" to "Hull Length" and the far side
   *  silently became a claim about a column nobody had looked at. An
   *  unanswered slot says what happened; a substituted column hides it. */
  const changeConcept = (control: TokenControl & { k: 'field' }, key: string): void => {
    const concept = conceptOf(ctx, key)
    if (!concept) return
    let next = setClauseConcept(constraint, control.side, control.clauseId, concept, ctx)
    if (control.side === 'if') {
      const head = next.then?.clauses[0]
      const current = head ? ctx.index.get(head.left.fieldId) : undefined
      if (head && current && current.kind !== concept.kind) next = unsetSide(next, 'then')
    }
    apply(next)
  }

  /** The caller's scope, applied last and never to the point of
   *  emptiness: a picker with no options is a control that cannot be
   *  answered, which is the one thing worse than a long list. */
  const inScope = (list: ColumnConcept[]): ColumnConcept[] => {
    if (!conceptKeys) return list
    const kept = list.filter((c) => conceptKeys.has(c.key))
    return kept.length > 0 ? kept : list
  }

  const sideConcepts = (side: Side): ColumnConcept[] => {
    if (side === 'if') return inScope(ctx.concepts)
    const head = constraint.if.clauses[0]
    const kind = head ? ctx.index.get(head.left.fieldId)?.kind : undefined
    if (!kind) return inScope(ctx.concepts)
    const same = ctx.concepts.filter((c) => c.kind === kind)
    return inScope(same.length > 0 ? same : ctx.concepts)
  }

  const renderToken = (token: SentenceToken): ReactNode => {
    if (token.role === 'word') return <Word key={token.id} text={token.text} tight={token.tight} />
    if (!live || !token.control) return <ReadToken key={token.id} role={token.role} text={token.text} />

    const control = token.control
    const domain = token.domain
    const sought = soughtTokenId !== null && token.id === soughtTokenId

    switch (control.k) {
      case 'field':
        return (
          <SelectToken
            key={token.id}
            role="field"
            face={token.text}
            value={control.conceptKey}
            groups={conceptGroups(sideConcepts(control.side))}
            label={control.side === 'if' ? 'The column the rule looks at' : 'The column the rule sets'}
            title={token.concept ? conceptOptionLabel(token.concept) : undefined}
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onChange={(key) => changeConcept(control, key)}
          />
        )

      case 'op': {
        const ops = opsFor(domain)
        const options: TokenOption[] = ops.map((op) => ({
          value: op,
          label: opLabel(op, control.side),
        }))
        return (
          <SelectToken
            key={token.id}
            role="op"
            face={token.text}
            value={control.op}
            options={options}
            label="How the two are compared"
            tokenId={token.id}
            sought={sought}
            onChange={(op) =>
              apply(setClauseOp(constraint, control.side, control.clauseId, op as SentenceOp, ctx))
            }
          />
        )
      }

      case 'value': {
        if (!domain) return <ReadToken key={token.id} role="value" text={token.text} />
        if (domain.control === 'choice' || domain.control === 'boolean') {
          const options = valueOptions(domain)
          if (options.length > 0) {
            return (
              <SelectToken
                key={token.id}
                role="value"
                face={token.text}
                value={asText(control.value, domain)}
                options={options}
                label="The value"
                unchosen={token.unchosen}
                tokenId={token.id}
                sought={sought}
                onChange={(text) =>
                  apply(
                    setClauseValue(
                      constraint,
                      control.side,
                      control.clauseId,
                      coerceValue(text, domain),
                    ),
                  )
                }
              />
            )
          }
        }
        return (
          <InputToken
            key={token.id}
            role="value"
            value={asText(control.value, domain)}
            type={domain.control === 'number' ? 'number' : domain.control === 'date' ? 'date' : 'text'}
            suggestions={domain.control === 'text' ? domain.options : undefined}
            placeholder="…"
            label="The value"
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onCommit={(text) =>
              apply(
                setClauseValue(constraint, control.side, control.clauseId, coerceValue(text, domain)),
              )
            }
          />
        )
      }

      case 'chip':
        return (
          <ChipToken
            key={token.id}
            text={token.text}
            label={`Remove ${token.text}`}
            /* the last member of a set has nothing to be removed to:
               drawing a cross that cannot act is a control that lies */
            onRemove={
              control.removable
                ? () => apply(removeOneOfValue(constraint, control.side, control.value, ctx))
                : undefined
            }
          />
        )

      case 'chipAdd': {
        const taken = new Set(control.taken.map((v) => asText(v, domain)))
        const options = (domain ? valueOptions(domain) : []).filter((o) => !taken.has(o.value))
        return (
          <AddChipToken
            key={token.id}
            options={options}
            label="Add another value"
            onAdd={(text) =>
              apply(addOneOfValue(constraint, control.side, coerceValue(text, domain), ctx))
            }
          />
        )
      }

      default:
        return <ReadToken key={token.id} role={token.role} text={token.text} />
    }
  }

  return (
    <p className={big ? 'cn-sentence is-big' : 'cn-sentence'}>{tokens.map(renderToken)}</p>
  )
}
