/* ============================================================
   io/PasteRows — THE FRONT DOOR, DRAWN.

   UX_PASS §3's four steps: PASTE → HEADER → MAP → PREVIEW,
   "none of them a wizard". So they are not four screens with a Next
   button between them. They are ONE surface that grows downward as
   each question is answered, and every answer already given stays on
   screen and stays changeable. A person who realises at the preview
   that row one was a header does not go back — the answer is still up
   there, two centimetres away, and changing it re-reads everything
   under it.

   IT IS THE HOUSE CONFIRM SHEET, not a new kind of window. The same
   sheet asks about a replace, a clear, and a re-upload, and a person
   who has re-uploaded a file has already read the bottom half of this
   screen once — the counts, the cells with the old value beside the
   new one, the list of what will not happen. Those are literally the
   same two components (`PlanEvidence`).

   WHY THE TEXTAREA TAKES THE FOCUS, against the sheet's own rule.
   `ConfirmSheet` focuses CANCEL on open, deliberately: "every path
   through here ends in a lot of data moving at once, and a person who
   presses Enter out of habit must land on the one answer that costs
   nothing." That reasoning is about a sheet whose first control is a
   button. The first control here is an empty box waiting for Ctrl+V,
   and a paste surface that cannot receive a paste is not a surface.
   Enter costs nothing in a textarea — it types a newline — so the
   hazard the rule guards against is not present at step one. The
   focus is taken on the frame AFTER the sheet's, because a child's
   effect runs before its parent's and the sheet would otherwise take
   it straight back.

   AND A PASTE ANYWHERE ON THE SHEET LANDS. Somebody who opens this
   and hits Ctrl+V without clicking first is doing the obvious thing;
   the sheet catches it and puts it in the box.

   NOTHING HERE DECIDES ANYTHING. Every judgement — the delimiter, the
   header, the mapping, the inferred type, what the merge would do —
   is `./pasteBlock`, which writes nothing and can be tested without a
   browser. This file draws it and collects three answers.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, JSX } from 'react'
import { FIELD_TYPES } from '@/types/model'
import type { EntityDef, FieldDef, FieldType, RowData } from '@/types/model'
import { ConfirmFacts, ConfirmSheet } from '@/features/designer/ConfirmSheet'
import { INFERABLE_TYPES, describeColumn, listOptionsFor } from './csvSchema'
import {
  applyPaste,
  describePaste,
  fieldOffers,
  mappingRefusals,
  pickableOffers,
  planPaste,
  proposeMapping,
  readColumns,
  readPastedBlock,
  whyNotNew,
  type MapTo,
  type PastePlan,
  type PasteResult,
  type PasteWriter,
} from './pasteBlock'
import { PlanChanges, PlanNotes } from './PlanEvidence'
import './io.css'

/** the value of the two synthetic options in the destination picker */
const SKIP = '__skip'
const NEW = '__new'

/** how many of row one's cells the header question shows */
const ROW_ONE_SHOWN = 6

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

export interface PasteRowsProps {
  entity: EntityDef
  /** every row on the table — what a pasted row is matched against */
  rows: RowData[]
  /** a link column's accepted words, so `Yamaha F70` resolves */
  refMapOf: (f: FieldDef) => Map<string, string> | undefined
  /** the same columns the other way, so the preview prints the name */
  refLabelOf: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
  write: PasteWriter
  onClose: () => void
  onDone: (plan: PastePlan, result: PasteResult) => void
}

export function PasteRows({
  entity,
  rows,
  refMapOf,
  refLabelOf,
  write,
  onClose,
  onDone,
}: PasteRowsProps): JSX.Element {
  const [text, setText] = useState('')
  /* null until the person has answered; the detected answer is the
     first value they see, and it is theirs from then on */
  const [headerSaid, setHeaderSaid] = useState<boolean | null>(null)
  const [choices, setChoices] = useState<MapTo[] | null>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  /* see the header: after the sheet's own focus, not before it */
  useEffect(() => {
    const id = requestAnimationFrame(() => boxRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  const block = useMemo(() => readPastedBlock(text), [text])
  const headerRow = headerSaid ?? block.headerLikely
  const offers = useMemo(() => fieldOffers(entity), [entity])
  const pickable = useMemo(() => pickableOffers(offers), [offers])
  const cols = useMemo(
    () => (block.ok ? readColumns(block, headerRow) : []),
    [block, headerRow],
  )

  /* THE PROPOSAL IS RE-MADE WHEN THE HEADER ANSWER CHANGES, and that
     is the point of asking it before the mapping: the same block read
     with and without a header row has different column names and
     different values, so a mapping made against one of them is
     nonsense against the other. Anything the person had chosen by
     hand is theirs and is kept — see `settle`. */
  const proposed = useMemo(
    () => proposeMapping(cols, offers, headerRow),
    [cols, offers, headerRow],
  )
  const settled = choices && choices.length === cols.length ? choices : proposed.map((p) => p.choice)

  const refusals = useMemo(
    () => (block.ok ? mappingRefusals(cols, settled, entity) : new Map<number, string>()),
    [block.ok, cols, settled, entity],
  )

  const plan = useMemo(
    () =>
      block.ok
        ? planPaste({
            entity,
            rows,
            block,
            headerRow,
            cols,
            choices: settled,
            refRowLabels: refMapOf,
            refLabelOf,
          })
        : null,
    [block, entity, rows, headerRow, cols, settled, refMapOf, refLabelOf],
  )

  /* -- the three answers -------------------------------------- */

  const onPaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    if (event.target === boxRef.current) return
    const got = event.clipboardData.getData('text')
    if (got === '') return
    event.preventDefault()
    setText(got)
    setChoices(null)
    setHeaderSaid(null)
  }, [])

  const sayHeader = useCallback((yes: boolean) => {
    setHeaderSaid(yes)
    /* the columns are about to be called something else, so a mapping
       made against the old names cannot be carried across */
    setChoices(null)
  }, [])

  const setChoice = useCallback(
    (at: number, next: MapTo) => {
      setChoices((cur) => {
        const base = cur && cur.length === cols.length ? cur : proposed.map((p) => p.choice)
        return base.map((c, i) => (i === at ? next : c))
      })
    },
    [cols.length, proposed],
  )

  const commit = useCallback(() => {
    if (!plan?.ok) return
    const result = applyPaste(plan, entity.id, write)
    onDone(plan, result)
  }, [plan, entity.id, write, onDone])

  /* -- what the footer offers --------------------------------- */

  const ready = plan?.ok === true && plan.plan !== null
  const choicesForSheet =
    ready && plan
      ? [
          {
            label: plan.creating.length > 0 ? 'Add columns and rows' : 'Put it in',
            note: `${describePaste(plan)} One press of Ctrl+Z puts it all back.`,
            onPick: commit,
          },
        ]
      : []

  const facts =
    plan?.ok && plan.plan
      ? [
          `${plan.plan.fileRows} pasted`,
          `${plan.plan.matched} matched`,
          `${plan.plan.overwritten} overwritten`,
          `${plan.plan.added} new`,
          `${rows.length} here`,
        ]
      : []

  return (
    <ConfirmSheet
      eyebrow="Paste"
      question={
        block.ok
          ? `Put a pasted block into ${entity.name}?`
          : `Paste a block into ${entity.name}`
      }
      choices={choicesForSheet}
      cancelLabel={ready ? 'Cancel' : 'Close'}
      onCancel={onClose}
    >
      <div className="io-paste" onPaste={onPaste}>
        {/* ---- 1 · PASTE ------------------------------------- */}

        <section className="io-paste-step">
          <span className="mono-label io-paste-cap">Paste</span>
          {block.ok ? (
            <p className="io-paste-facts">
              {plural(block.grid.length, 'row', 'rows')} ·{' '}
              {plural(block.width, 'column', 'columns')} ·{' '}
              {block.delimiter === 'tab' ? 'tab separated' : 'comma separated'}
              <button
                type="button"
                className="io-paste-again"
                onClick={() => {
                  setText('')
                  setChoices(null)
                  setHeaderSaid(null)
                  boxRef.current?.focus()
                }}
              >
                Paste something else
              </button>
            </p>
          ) : null}
          <textarea
            ref={boxRef}
            className={block.ok ? 'io-paste-drop is-read' : 'io-paste-drop'}
            value={text}
            spellCheck={false}
            aria-label={`Paste rows for ${entity.name}`}
            placeholder="Copy the cells in your spreadsheet, then press Ctrl+V here."
            onChange={(e) => {
              setText(e.target.value)
              setChoices(null)
              setHeaderSaid(null)
            }}
          />
          {/* THE REFUSAL SAYS WHY, WHERE IT HAPPENED — rule 10. It sits
              under the box that was refused, never as a second window
              on top of this one.

              AND IT IS A RESPONSE, NOT A GREETING. Drawn on `!block.ok`
              alone it met a person opening an empty sheet with a red
              rule and "there is nothing to read", which is the app
              telling somebody off for not having done anything yet.
              Rule 10 is about a thing that CANNOT BE DONE; nothing has
              been attempted until there is something in the box. */}
          {!block.ok && block.refusal && text.trim() !== '' ? (
            <p className="io-paste-no" role="status">
              {block.refusal.say}
            </p>
          ) : null}
          {block.ok && (block.blankRowsDropped > 0 || block.shortRows.length > 0) ? (
            <ul className="io-rt-notes">
              {block.blankRowsDropped > 0 ? (
                <li className="io-rt-note">
                  {plural(block.blankRowsDropped, 'empty row was', 'empty rows were')} skipped.
                </li>
              ) : null}
              {block.shortRows.length > 0 ? (
                <li className="io-rt-note">
                  {plural(block.shortRows.length, 'row stops', 'rows stop')} short of{' '}
                  {block.width} columns.{' '}
                  {block.shortRows.length === 1 ? 'Its' : 'Their'} last cells will be empty.
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>

        {/* ---- 2 · HEADER ------------------------------------ */}

        {block.ok ? (
          <section className="io-paste-step">
            <span className="mono-label io-paste-cap">Header</span>
            <p className="ds-cs-line">Is the first row a header?</p>
            {/* ROW ONE, SHOWN, AND SHOWN FIRST. The question is
                unanswerable without it, and a person reading "is the
                first row a header?" over a block they pasted four
                seconds ago should not have to remember what was in it
                — or answer and then find out. */}
            <p className="io-paste-row1">
              {block.grid[0].slice(0, ROW_ONE_SHOWN).map((cell, i) => (
                <span className="io-paste-cell" key={`${i}:${cell}`}>
                  {cell.trim() === '' ? '—' : cell}
                </span>
              ))}
              {block.width > ROW_ONE_SHOWN ? (
                <span className="io-paste-cell-more">
                  +{block.width - ROW_ONE_SHOWN} more
                </span>
              ) : null}
            </p>
            <div className="io-paste-yn" role="radiogroup" aria-label="Is the first row a header?">
              <button
                type="button"
                className={headerRow ? 'io-paste-yn-btn is-on' : 'io-paste-yn-btn'}
                role="radio"
                aria-checked={headerRow}
                onClick={() => sayHeader(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={headerRow ? 'io-paste-yn-btn' : 'io-paste-yn-btn is-on'}
                role="radio"
                aria-checked={!headerRow}
                onClick={() => sayHeader(false)}
              >
                No
              </button>
            </div>
          </section>
        ) : null}

        {/* ---- 3 · MAP --------------------------------------- */}

        {block.ok ? (
          <section className="io-paste-step">
            <span className="mono-label io-paste-cap">Where each column goes</span>
            <ul className="io-paste-cols">
              {cols.map((col, i) => (
                <MapRow
                  key={col.index}
                  title={col.title}
                  choice={settled[i]}
                  how={proposed[i]?.how ?? 'nothing'}
                  offers={pickable}
                  cannotBeNew={whyNotNew(col, headerRow)}
                  refusal={refusals.get(i) ?? proposed[i]?.refusal}
                  reading={
                    settled[i].to === 'new'
                      ? describeColumn(
                          col.stats,
                          settled[i].type as FieldType,
                          (settled[i] as { options?: string[] }).options,
                        ).why
                      : null
                  }
                  sample={col.sample}
                  onChoose={(next) => setChoice(i, next)}
                  onRetype={(type) => {
                    /* A LIST NEEDS A SET OF OPTIONS, and the only thing
                       that can stop an override is the one thing that
                       is not a judgement — said on this column, never
                       as a second window. */
                    if (type === 'select') {
                      const got = listOptionsFor(col.stats)
                      if ('refusal' in got) {
                        setChoice(i, {
                          to: 'new',
                          name: (settled[i] as { name: string }).name,
                          type: (settled[i] as { type: FieldType }).type,
                        })
                        return
                      }
                      setChoice(i, {
                        to: 'new',
                        name: (settled[i] as { name: string }).name,
                        type,
                        options: got.options,
                      })
                      return
                    }
                    setChoice(i, {
                      to: 'new',
                      name: (settled[i] as { name: string }).name,
                      type,
                    })
                  }}
                  onRename={(name) =>
                    setChoice(i, {
                      to: 'new',
                      name,
                      type: (settled[i] as { type: FieldType }).type,
                      ...((settled[i] as { options?: string[] }).options
                        ? { options: (settled[i] as { options?: string[] }).options }
                        : {}),
                    })
                  }
                />
              ))}
            </ul>
            <UnfillableNote offers={offers} />
          </section>
        ) : null}

        {/* ---- 4 · PREVIEW ----------------------------------- */}

        {block.ok && plan ? (
          <section className="io-paste-step">
            <span className="mono-label io-paste-cap">What lands</span>

            {plan.blocked ? (
              <p className="io-paste-no" role="status">
                {plan.blocked}
              </p>
            ) : null}

            {plan.ok && plan.plan ? (
              <>
                <p className="ds-cs-line">{describePaste(plan)}</p>
                <ConfirmFacts items={facts} />

                {/* STRUCTURE IS OFFERED, IN A SENTENCE THAT NAMES IT —
                    DESIGN_PRINCIPLES §7. A table growing a column is
                    not a side effect of pasting into it. */}
                {plan.creating.length > 0 ? (
                  <ul className="io-paste-made">
                    {plan.creating.map((c) => (
                      <li className="io-paste-made-item" key={c.id}>
                        <span className="io-paste-made-name">{c.name}</span>
                        <span className="type-tag" style={{ color: FIELD_TYPES[c.type].cssVar }}>
                          {FIELD_TYPES[c.type].tag}
                        </span>
                        <span className="io-paste-made-why">{c.reading.why}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <PreviewRows rows={plan.preview} />
                <PlanChanges changes={plan.plan.changes} />
                <PlanNotes notes={plan.plan.refusals} />
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </ConfirmSheet>
  )
}

/* ------------------------------------------------------------ */
/* one incoming column                                           */
/* ------------------------------------------------------------ */

/** The word beside the picker, in §3's own vocabulary. */
const HOW_SAYS: Record<'matched' | 'inferred' | 'nothing', string> = {
  matched: 'matched',
  inferred: 'inferred',
  nothing: 'nothing to match',
}

function MapRow({
  title,
  choice,
  how,
  offers,
  cannotBeNew,
  refusal,
  reading,
  sample,
  onChoose,
  onRetype,
  onRename,
}: {
  title: string
  choice: MapTo
  how: 'matched' | 'inferred' | 'nothing'
  offers: ReturnType<typeof pickableOffers>
  cannotBeNew: string | null
  refusal: string | undefined
  reading: string | null
  sample: string[]
  onChoose: (next: MapTo) => void
  onRetype: (type: FieldType) => void
  onRename: (name: string) => void
}): JSX.Element {
  const value = choice.to === 'field' ? choice.fieldId : choice.to === 'new' ? NEW : SKIP
  const type = choice.to === 'new' ? choice.type : null

  return (
    <li className={refusal ? 'io-paste-col has-no' : 'io-paste-col'}>
      <span className="io-paste-from">
        <span className="io-paste-from-name">{title}</span>
        {/* THE COLUMN'S OWN VALUES, so "where does this go" is a
            question about something the person can see rather than
            about a heading they have to remember. */}
        <span className="io-paste-from-vals">{sample.join(' · ')}</span>
      </span>
      <span className="io-paste-arrow" aria-hidden="true">
        →
      </span>
      <span className="io-paste-to">
        <select
          className="field-input io-paste-pick"
          value={value}
          aria-label={`Where ${title} goes`}
          onChange={(e) => {
            const v = e.target.value
            if (v === SKIP) {
              onChoose({ to: 'skip' })
              return
            }
            if (v === NEW) {
              onChoose({ to: 'new', name: title, type: 'text' })
              return
            }
            onChoose({ to: 'field', fieldId: v })
          }}
        >
          <option value={SKIP}>( skip )</option>
          {cannotBeNew ? null : <option value={NEW}>( new column )</option>}
          {offers.map((o) => (
            <option key={o.field.id} value={o.field.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="io-paste-how">{HOW_SAYS[how]}</span>
      </span>

      {choice.to === 'new' && type ? (
        <span className="io-paste-new">
          <input
            className="field-input io-paste-name"
            value={choice.name}
            spellCheck={false}
            autoComplete="off"
            aria-label={`Name of the new column from ${title}`}
            onChange={(e) => onRename(e.target.value)}
          />
          <span className="type-tag" style={{ color: FIELD_TYPES[type].cssVar }}>
            {FIELD_TYPES[type].tag}
          </span>
          <select
            className="field-input io-paste-type"
            value={type}
            aria-label={`What the new column from ${title} holds`}
            onChange={(e) => onRetype(e.target.value as FieldType)}
          >
            {INFERABLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPES[t].label}
              </option>
            ))}
          </select>
        </span>
      ) : null}

      {reading ? <p className="io-paste-why">{reading}</p> : null}
      {/* WHY IT WILL NOT MAP, AND WHAT IT WOULD TAKE — on the column
          it happens to, never as a banner over the list. */}
      {refusal ? (
        <p className="io-paste-no" role="status">
          {refusal}
        </p>
      ) : null}
      {!refusal && choice.to === 'skip' && cannotBeNew ? (
        <p className="io-paste-why">{cannotBeNew}</p>
      ) : null}
    </li>
  )
}

/* ------------------------------------------------------------ */
/* what this table will not take from any block                  */
/* ------------------------------------------------------------ */

/** The columns on this table a paste can never fill, and why. Said
 *  once, under the mapping — because their absence from the picker is
 *  otherwise a control that has quietly gone missing. */
function UnfillableNote({
  offers,
}: {
  offers: ReturnType<typeof fieldOffers>
}): JSX.Element | null {
  const held = offers.filter((o) => o.refusal)
  if (held.length === 0) return null
  return (
    <ul className="io-rt-notes">
      {held.map((o) => (
        <li className="io-rt-note" key={o.field.id}>
          {o.refusal}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------ */
/* the first rows, as they will appear                           */
/* ------------------------------------------------------------ */

/**
 * §3: "the first three rows, drawn as they will actually appear, with
 * the row label resolved."
 *
 * The label is the point. A block whose header row was read as data
 * produces a boat named `Variant`, and this is where that becomes
 * visible — before it exists, rather than after somebody finds it in
 * the register a week later.
 */
function PreviewRows({ rows }: { rows: PastePlan['preview'] }): JSX.Element | null {
  if (rows.length === 0) return null
  return (
    <ul className="io-paste-prev">
      {rows.map((r, i) => (
        <li className="io-paste-prev-row" key={`${i}:${r.label}`}>
          <span className="io-paste-prev-head">
            <span className="io-paste-prev-label">{r.label}</span>
            <span className="io-paste-prev-fate">{r.fate === 'new' ? 'new row' : 'updates'}</span>
          </span>
          <span className="io-paste-prev-cells">
            {r.cells.map((c) => (
              <span className="io-paste-prev-cell" key={c.column}>
                <span className="io-paste-prev-col">{c.column}</span>
                <span className={c.read ? 'io-paste-prev-val' : 'io-paste-prev-val is-empty'}>
                  {c.read && c.text !== '' ? c.text : '—'}
                </span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}

