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
   *  rule could never be true of any row. Retargeting the condition
   *  therefore carries the obligation with it. */
  const changeConcept = (control: TokenControl & { k: 'field' }, key: string): void => {
    const concept = conceptOf(ctx, key)
    if (!concept) return
    let next = setClauseConcept(constraint, control.side, control.clauseId, concept, ctx)
    if (control.side === 'if') {
      const head = next.then?.clauses[0]
      const current = head ? ctx.index.get(head.left.fieldId) : undefined
      if (head && current && current.kind !== concept.kind) {
        const replacement =
          ctx.concepts.find((c) => c.kind === concept.kind && c.key !== concept.key) ??
          ctx.concepts.find((c) => c.kind === concept.kind)
        if (replacement) next = setClauseConcept(next, 'then', head.id, replacement, ctx)
      }
    }
    apply(next)
  }

  const sideConcepts = (side: Side): ColumnConcept[] => {
    if (side === 'if') return ctx.concepts
    const head = constraint.if.clauses[0]
    const kind = head ? ctx.index.get(head.left.fieldId)?.kind : undefined
    if (!kind) return ctx.concepts
    const same = ctx.concepts.filter((c) => c.kind === kind)
    return same.length > 0 ? same : ctx.concepts
  }

  const renderToken = (token: SentenceToken): ReactNode => {
    if (token.role === 'word') return <Word key={token.id} text={token.text} tight={token.tight} />
    if (!live || !token.control) return <ReadToken key={token.id} role={token.role} text={token.text} />

    const control = token.control
    const domain = token.domain

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
            onRemove={() => apply(removeOneOfValue(constraint, control.side, control.value, ctx))}
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
