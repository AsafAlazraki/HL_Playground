/* ============================================================
   THE FIT SENTENCE, DRAWN — the same words, read or live.

   `fitSay` produces the token list once; this component draws it
   either as prose (`editable` false) or as the SAME words with the
   dropdowns in place (`editable` true). The two can never drift,
   because there is only one of them — the guarantee `RuleSentence`
   already makes for a limit, kept here for a fit.

   EVERY UNDERLINED WORD IS A DROPDOWN BUILT FROM THE SHEET. The
   tables are the tables the person actually has, the columns are
   the columns actually on them, and the values are read out of the
   rows. Nothing here is a hand-written list — that is the mistake
   this surface exists not to repeat.

   WHY THE TINT IS A RAIL AND NOT A FILL. §11's fourth fix asks
   that `HP Rating` and `Min HP` cannot be misread as two columns
   of one table, and the preview drew that as a 10 % kind-coloured
   wash behind each token. DESIGN_CONTRACT §11 forbids exactly that
   — "kind hue is a rail, a dot or a glyph, never a fill behind
   text" — so the hue is the token's own underline, which the live
   token already draws, and the dot on each column chip.

   AND IN READ-ONLY PROSE THE SIDES ARE NAMED IN ENGLISH. A
   collapsed sentence has no underline to tint, so it does not lean
   on colour at all: it says "HP Rating is at most THE BOAT'S Max
   HP". A possessive is stronger than a hue, works in one colour,
   and survives being read aloud.

   NO MOTION. The sentence reflows as words are chosen and a person
   is typing in it — `stillness` exists for exactly this — so
   nothing here animates at all.
   ============================================================ */

import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { accentVar } from '@/types/model'
import type { RowScope } from '@/types/model'
import { kindLabel, type ValueDomain } from './columns'
import { INDICATIVE, coerceValue, valueText, type SentenceCtx } from './describe'
import {
  addClause,
  addColumn,
  entityOf,
  fitFields,
  fitOps,
  fitSay,
  fitTables,
  fieldOf,
  removeClause,
  removeColumn,
  setClauseField,
  setClauseOp,
  setClauseRight,
  setMatchEntity,
  setSourceEntity,
  setWhenNothingFits,
  NOTHING_FITS,
  UNSET,
  type FitDraft,
  type FitToken,
} from './fit'
import {
  AddChipToken,
  InputToken,
  ReadToken,
  SelectToken,
  Word,
  type TokenGroup,
  type TokenOption,
} from './Tokens'
import './constraints.css'

export interface FitSentenceProps {
  draft: FitDraft
  ctx: SentenceCtx
  /** collapsed = read-only prose; open = the same words, live */
  editable?: boolean
  /** required when `editable` — there is no registry for a fit, so
   *  the holder of the draft owns every change to it */
  onChange?: (next: FitDraft) => void
  /** the composer's sentence is set one step larger */
  big?: boolean
  /** the word the footer is pointing at — see `fitMissing` */
  soughtTokenId?: string | null
}

/* ---------------------------------------------------------- */
/* Pickers, all of them built from the sheet                  */
/* ---------------------------------------------------------- */

function tableGroups(ctx: SentenceCtx): TokenGroup[] {
  const groups: TokenGroup[] = []
  for (const entity of fitTables(ctx)) {
    const label = entity.kind ? kindLabel(entity.kind) : 'Other tables'
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, options: [] }
      groups.push(group)
    }
    const rows = ctx.rowsByEntity[entity.id]?.length ?? 0
    group.options.push({
      value: entity.id,
      label: rows > 0 ? `${entity.name} · ${rows.toLocaleString('en-AU')}` : entity.name,
    })
  }
  return groups
}

const fieldOptions = (ctx: SentenceCtx, entityId: string): TokenOption[] =>
  fitFields(entityOf(ctx, entityId)).map((f) => ({ value: f.id, label: f.name }))

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

export function FitSentence({
  draft,
  ctx,
  editable = false,
  onChange,
  big = false,
  soughtTokenId = null,
}: FitSentenceProps): ReactElement {
  const live = editable && onChange !== undefined
  /* the composer sets its sentence one step larger; the size lives on
     `.cn-sentence.is-big`, so the modifier travels with the paragraph
     rather than being restated on a wrapper */
  const line = big ? 'cn-sentence is-big' : 'cn-sentence'
  const said = fitSay(ctx, draft)
  const source = entityOf(ctx, draft.sourceEntityId)
  const match = entityOf(ctx, draft.matchEntityId)
  const apply = (next: FitDraft): void => onChange?.(next)

  /** THE TABLE'S OWN HUE, read off the loaded project — the pattern
   *  `RulesLedger` already uses here and Home and the module cards use
   *  everywhere else. It is `accentVar(entity.accent)` and not
   *  `--kind-<kind>`, because two BOAT tables are two tables: a rule
   *  pairing Highfield with Stacer would get one hue on both sides
   *  from a kind, which is the exact confusion §11's fourth fix
   *  exists to end. A table with no live accent falls back to the
   *  hairline rather than borrowing somebody else's colour. */
  const hueOf = (side: 'source' | 'match' | undefined): CSSProperties | undefined => {
    if (!side) return undefined
    const entity = side === 'source' ? source : match
    if (!entity) return undefined
    return { '--kind': accentVar(entity.accent) } as CSSProperties
  }

  const renderToken = (token: FitToken): ReactNode => {
    const sought = soughtTokenId !== null && token.id === soughtTokenId
    const control = token.control

    if (!live || !control) {
      if (token.role === 'word') {
        return <Word key={token.id} text={token.text} tight={token.tight} />
      }
      return (
        <ReadToken
          key={token.id}
          role={token.role === 'table' ? 'field' : token.role}
          text={token.text}
        />
      )
    }

    const wrap = (node: ReactNode): ReactNode =>
      token.side ? (
        <span key={token.id} className="cn-fit-side" style={hueOf(token.side)}>
          {node}
        </span>
      ) : (
        node
      )

    switch (control.k) {
      case 'sourceTable':
        return wrap(
          <SelectToken
            key={token.id}
            role="field"
            face={token.text}
            value={draft.sourceEntityId}
            groups={tableGroups(ctx)}
            label="The table this rule walks"
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onChange={(id) => apply(setSourceEntity(ctx, draft, id))}
          />,
        )

      case 'matchTable':
        return wrap(
          <SelectToken
            key={token.id}
            role="field"
            face={token.text}
            value={draft.matchEntityId}
            groups={tableGroups(ctx)}
            label="The table this rule searches"
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onChange={(id) => apply(setMatchEntity(ctx, draft, id))}
          />,
        )

      case 'matchField': {
        const clause = draft.clauses.find((c) => c.id === control.clauseId)
        return wrap(
          <SelectToken
            key={token.id}
            role="field"
            face={token.text}
            value={clause?.matchFieldId ?? UNSET}
            options={fieldOptions(ctx, draft.matchEntityId)}
            label="The column this comparison is about"
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onChange={(fieldId) => apply(setClauseField(ctx, draft, control.clauseId, fieldId))}
          />,
        )
      }

      case 'op': {
        const clause = draft.clauses.find((c) => c.id === control.clauseId)
        const options: TokenOption[] = fitOps(token.domain).map((op) => ({
          value: op,
          label: INDICATIVE[op],
        }))
        return (
          <SelectToken
            key={token.id}
            role="op"
            face={token.text}
            value={clause?.op ?? 'eq'}
            options={options}
            label="How the two are compared"
            tokenId={token.id}
            sought={sought}
            onChange={(picked) => {
              /* the list was built from `fitOps`, so anything in it is
                 an operator this column can actually take — and
                 anything not in it is somebody else's string */
              const op = fitOps(token.domain).find((o) => o === picked)
              if (op) apply(setClauseOp(draft, control.clauseId, op))
            }}
          />
        )
      }

      /* WHAT KIND OF THING IT IS MEASURED AGAINST, said as a word
         rather than as a mode switch. "the boat's" opens a list of
         the boat's columns; "the value" opens the values that are
         actually in the column being compared. */
      case 'rightKind':
        return (
          <SelectToken
            key={token.id}
            role="op"
            face={token.text}
            value={
              draft.clauses.find((c) => c.id === control.clauseId)?.right.k === 'source'
                ? 'source'
                : 'word'
            }
            options={[
              { value: 'source', label: `a column on ${source?.name ?? 'the other table'}` },
              { value: 'word', label: 'a fixed value' },
            ]}
            label="What it is compared with"
            tokenId={token.id}
            sought={sought}
            onChange={(kind) =>
              apply(
                setClauseRight(
                  draft,
                  control.clauseId,
                  kind === 'source' ? { k: 'source', fieldId: UNSET } : { k: 'word', value: null },
                ),
              )
            }
          />
        )

      case 'rightField': {
        const clause = draft.clauses.find((c) => c.id === control.clauseId)
        const value = clause?.right.k === 'source' ? clause.right.fieldId : UNSET
        return wrap(
          <SelectToken
            key={token.id}
            role="field"
            face={token.text}
            value={value}
            options={fieldOptions(ctx, draft.sourceEntityId)}
            label={`The column on ${source?.name ?? 'the other table'}`}
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onChange={(fieldId) =>
              apply(setClauseRight(draft, control.clauseId, { k: 'source', fieldId }))
            }
          />,
        )
      }

      case 'rightWord': {
        const clause = draft.clauses.find((c) => c.id === control.clauseId)
        const held = clause?.right.k === 'word' ? clause.right.value : null
        const domain = token.domain
        if (domain && (domain.control === 'choice' || domain.control === 'boolean')) {
          const options = valueOptions(domain)
          if (options.length > 0) {
            return (
              <SelectToken
                key={token.id}
                role="value"
                face={token.text}
                value={valueText(held, domain)}
                options={options}
                label="The value"
                unchosen={token.unchosen}
                tokenId={token.id}
                sought={sought}
                onChange={(text) =>
                  apply(
                    setClauseRight(draft, control.clauseId, {
                      k: 'word',
                      value: coerceValue(text, domain),
                    }),
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
            value={valueText(held, domain)}
            type={
              domain?.control === 'number' ? 'number' : domain?.control === 'date' ? 'date' : 'text'
            }
            suggestions={domain?.control === 'text' ? domain.options : undefined}
            placeholder="…"
            label="The value"
            unchosen={token.unchosen}
            tokenId={token.id}
            sought={sought}
            onCommit={(text) =>
              apply(
                setClauseRight(draft, control.clauseId, {
                  k: 'word',
                  value: coerceValue(text, domain),
                }),
              )
            }
          />
        )
      }

      case 'nothingFits':
        return (
          <SelectToken
            key={token.id}
            role="value"
            face={token.text}
            value={draft.whenNothingFits}
            options={[
              { value: 'skip', label: NOTHING_FITS.skip },
              { value: 'passThrough', label: NOTHING_FITS.passThrough },
            ]}
            label="What happens when nothing fits"
            tokenId={token.id}
            sought={sought}
            onChange={(pick) =>
              apply(setWhenNothingFits(draft, pick === 'passThrough' ? 'passThrough' : 'skip'))
            }
          />
        )

      default:
        return <ReadToken key={token.id} role="value" text={token.text} />
    }
  }

  /* The columns still to be offered, grouped by the table they are
     on — a flat list of forty columns with no heading is a list you
     read twice. */
  const columnGroups = (): TokenGroup[] => {
    const taken = new Set(draft.columns.map((c) => `${c.scope}:${c.fieldId}`))
    const build = (scope: RowScope, entityId: string): TokenGroup | null => {
      const entity = entityOf(ctx, entityId)
      if (!entity) return null
      const options = fitFields(entity)
        .filter((f) => !taken.has(`${scope}:${f.id}`))
        .map((f) => ({ value: `${scope}:${f.id}`, label: f.name }))
      return options.length > 0 ? { label: entity.name, options } : null
    }
    return [build('source', draft.sourceEntityId), build('match', draft.matchEntityId)].filter(
      (g): g is TokenGroup => g !== null,
    )
  }

  return (
    <div className="cn-fit">
      <p className={`${line} cn-fit-line`}>{said.lead.map(renderToken)}</p>

      {/* THE COMPARISONS, ALIGNED AS A COLUMN. Two limits on one
          thing that do not line up read as two unrelated sentences. */}
      <div className="cn-fit-clauses">
        {said.clauses.map((clause) => (
          <p className={`${line} cn-fit-clause`} key={clause.id}>
            {clause.tokens.map(renderToken)}
            {live && clause.removable && (
              <button
                type="button"
                className="cn-fit-x"
                aria-label="Remove this comparison"
                onClick={() => apply(removeClause(draft, clause.id))}
              >
                <X size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
              </button>
            )}
          </p>
        ))}
        {live && (
          <button type="button" className="cn-fit-add" onClick={() => apply(addClause(draft))}>
            Add a comparison
          </button>
        )}
      </div>

      {/* WHAT THE ANSWER SHOWS. Each chip carries its table's hue as
          a dot, so a column from the boat and a column from the motor
          are never two anonymous words in one row. */}
      <p className={`${line} cn-fit-line cn-fit-show`}>Show</p>
      <div className="cn-fit-cols">
        {said.columns.map((column) => (
          <span key={column.key} className="cn-fit-col" style={hueOf(column.side)}>
            <i className="cn-fit-dot" />
            <span className="cn-fit-col-name">{column.label}</span>
            {live && (
              <button
                type="button"
                className="cn-fit-col-x"
                aria-label={`Stop showing ${column.label}`}
                onClick={() => apply(removeColumn(draft, column.scope, column.fieldId))}
              >
                <X size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
              </button>
            )}
          </span>
        ))}
        {live && (
          <AddChipToken
            groups={columnGroups()}
            label="Show another column"
            prompt="add a column…"
            onAdd={(key) => apply(addColumn(ctx, draft, key))}
          />
        )}
      </div>

      <p className={`${line} cn-fit-line cn-fit-foot`}>{said.foot.map(renderToken)}</p>
    </div>
  )
}

/** The columns a fit's answer will carry, as the words a person
 *  reads — exported so a card can print the heading row without
 *  running the rule. */
export const fitColumnNames = (ctx: SentenceCtx, draft: FitDraft): string[] =>
  draft.columns.map((column) => {
    if (column.label) return column.label
    const entity = entityOf(
      ctx,
      column.scope === 'source' ? draft.sourceEntityId : draft.matchEntityId,
    )
    return fieldOf(entity, column.fieldId)?.name ?? 'a column that is gone'
  })
