/* ============================================================
   ONE COLUMN of a table — collapsed card row + accordion editor
   (name / type / required / default + per-type editor).

   IT SAYS COLUMN, NEVER FIELD OR SCHEMA. The rest of the app calls
   this thing a column because that is what a person sees on the
   sheet; a surface that renames it halfway through the sentence
   makes the reader wonder whether they are editing something else.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FIELD_TYPES,
  UID_FIELD,
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type FieldType,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { FormulaEditor, ReferenceEditor, SelectOptionsEditor } from './FieldTypeEditors'
import { GuardNote } from './GuardNote'
import { useNameGuard } from './useNameGuard'
import { ConfirmFacts, ConfirmSamples, ConfirmSheet } from './ConfirmSheet'
import { columnFacts, factLines, retypePlan, type ColumnFacts, type RetypePlan } from './columnFacts'
import { formulaReaders, nameList, renameFieldRefs, ruleBreakage } from './dependents'
/* PHOSPHOR ONLY, THROUGH `@/lib/icons`. This folder used to hand-draw
   eight SVGs of its own, so the same caret appeared here at 1.4px and
   everywhere else in the app at Phosphor's 'light' weight — a hairline
   language that disagrees with itself a few hundred pixels apart. */
import { CaretDown, CaretRight, CaretUp, Check, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'

const TYPE_ORDER = Object.keys(FIELD_TYPES) as FieldType[]

interface FieldRowProps {
  entity: EntityDef
  field: FieldDef
  index: number
  count: number
  expanded: boolean
  /** focus + select the name input when the editor opens (fresh field) */
  autoFocusName: boolean
  onToggle: () => void
}

/** what the sheet is asking about, while it is up */
type Pending =
  | { act: 'retype'; to: FieldType; plan: RetypePlan }
  | { act: 'delete' }
  | null

export function FieldRow({
  entity,
  field,
  index,
  count,
  expanded,
  autoFocusName,
  onToggle,
}: FieldRowProps) {
  const updateField = useProjectStore((s) => s.updateField)
  const removeField = useProjectStore((s) => s.removeField)
  const moveField = useProjectStore((s) => s.moveField)
  const updateCell = useProjectStore((s) => s.updateCell)
  const rows = useProjectStore((s) => s.rowsByEntity[entity.id])

  const meta = FIELD_TYPES[field.type]

  /* WHAT IS IN THE COLUMN, ON THE SCREEN THAT TAKES IT AWAY. Read
     from the rows every render — the counts have to be the counts at
     the moment of the decision, not the ones from when the row was
     opened, because the sheet underneath is live. */
  const facts = useMemo(() => columnFacts(rows, field.id), [rows, field.id])
  /* the type warning belongs to THIS column, not to the table: a
     brand-new calculated column on a 40-row table used to be told
     that changing its type would clear data it has never held */
  const hasData = facts.filled > 0

  const [pending, setPending] = useState<Pending>(null)
  /** what a rename carried with it, said once, in the row that did it */
  const [carried, setCarried] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (expanded && autoFocusName && nameRef.current) {
      nameRef.current.focus()
      nameRef.current.select()
    }
  }, [expanded, autoFocusName])

  /* BRING THE EDITOR YOU JUST OPENED ONTO THE SCREEN. The row expands
     in place, and a column two thirds of the way down a 26-column table
     opens its whole editor below the fold: you click, the caret turns,
     and nothing you can see has changed. `block: 'nearest'` scrolls by
     the least that makes the panel whole — a row already fully visible
     does not move at all. Deferred one frame, because the panel does
     not exist to be measured until after this render. */
  const rowRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!expanded) return
    const id = requestAnimationFrame(() => {
      /* A SMOOTH SCROLL IS MOTION AND HAS TO ASK. This one carries a
         long, dense column list past the reader on the way to the
         editor — apple-design §14's "avoid a large moving surface"
         case, and the browser does not gate `behavior: 'smooth'` on
         `prefers-reduced-motion` for you. `'auto'` still lands the
         editor on screen, which is the whole point of the scroll; it
         simply stops taking the reader along for the ride. The same
         check, spelled the same way, as `LeftPanel.tsx`. */
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      rowRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [expanded])

  /* -- guardrail 1: no two columns share a name ---------------
     UID IS ON THE LIST THOUGH IT IS NOT IN `entity.fields`. The grid
     always draws a system UID column and refuses a second one by that
     name; this surface used to accept it, so the same table could be
     given two columns headed UID depending on which screen you were
     standing on. */
  const takenNames = useMemo(
    () => [
      UID_FIELD.name,
      ...entity.fields.filter((f) => f.id !== field.id).map((f) => f.name),
    ],
    [entity.fields, field.id],
  )
  /* A RENAME USED TO BE A LIVE GRENADE UNDER EVERY CALCULATION.
     Formula references resolve BY NAME, case-insensitively
     (`@/lib/formula/index.ts` keys its field map on the lower-cased
     name), so renaming "Base Cost" turned every expression reading it
     into `Error — Unknown field [Base Cost]`. The rename committed
     instantly: no dialog, no mark on the calculated row, nothing
     anywhere in the stage. The break was visible only if you happened
     to open the one column that broke, and it survived a reload.

     It is the only one of this surface's four destructive acts that
     had no gate at all — so it is given the fix that removes the
     destruction rather than a fifth dialog: every expression on this
     table that names the column is rewritten in the same commit, and
     the row says which ones moved. A rename now means what a person
     thinks it means, and the note is there so the rewrite is not
     itself a silent edit. */
  const commitName = (name: string) => {
    const readers = formulaReaders(entity, field)
    updateField(entity.id, field.id, { name })
    const moved: string[] = []
    for (const r of readers) {
      const next = renameFieldRefs(r.formula ?? '', field.name, name)
      if (next.count === 0) continue
      updateField(entity.id, r.id, { formula: next.src })
      moved.push(r.name || 'an untitled column')
    }
    setCarried(moved.length > 0 ? nameList(moved) : null)
  }

  const nameGuard = useNameGuard({
    current: field.name,
    taken: takenNames,
    /* A NAMELESS COLUMN IS NOT A COLUMN. The table refuses to blank a
       header for the plain reason that nothing can then refer to it —
       no formula, no import, no rule — and the two surfaces edit the
       same column, so they cannot disagree about that. */
    allowEmpty: false,
    message: (n) =>
      `A column named “${n}” already exists on this table — two columns with the same name make every formula and import ambiguous.`,
    onCommit: commitName,
  })

  /* -- guardrail 4: a list with nothing on it ----------------- */
  const emptyList = field.type === 'select' && (field.options?.length ?? 0) === 0

  /* WHAT THE TABLE KNOWS AND THIS SHEET DID NOT SAY.
     A band is a named run of consecutive columns and the grid draws its
     header from `sectionId`; a grouping level is a column the grid
     drawers open on. Both were invisible here, so a person reordering
     columns or deleting one could not see they were taking apart the
     structure of the sheet they were looking at. Named, not editable —
     editing them belongs to the table. */
  const band = entity.sections?.find((s) => s.id === field.sectionId)
  const groupLevel = (entity.hierarchy ?? []).indexOf(field.id)

  const label = field.name.trim() || 'this untitled column'

  /* WHAT ELSE IS HOLDING ON — computed only while the sheet is up, so
     the whole rules graph is not re-validated on every keystroke in
     the name box. `ruleBreakage` asks the rule engine rather than
     scanning the graph here; see the note on it. */
  const holders = useMemo(() => {
    if (pending?.act !== 'delete') return null
    const { entities, rowsByEntity, rules } = useProjectStore.getState()
    return {
      readers: formulaReaders(entity, field),
      rules: ruleBreakage({ entities, rowsByEntity }, rules, entity.id, field.id),
    }
  }, [pending?.act, entity, field])

  return (
    <div className={expanded ? 'ds-frow ds-frow-open' : 'ds-frow'} ref={rowRef}>
      <div className="ds-frow-head">
        <div className="ds-frow-arrows" aria-hidden={count < 2 || undefined}>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === 0}
            onClick={() => moveField(entity.id, field.id, -1)}
            aria-label={`Move the column ${field.name || 'untitled'} up`}
          >
            <CaretUp size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === count - 1}
            onClick={() => moveField(entity.id, field.id, 1)}
            aria-label={`Move the column ${field.name || 'untitled'} down`}
          >
            <CaretDown size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </button>
        </div>

        {/* THE NAME OF THIS CONTROL WAS "TXT SERIES GROUPS IDENTITY" —
            three stamps read out in a row, with no verb and no hint
            that pressing it opens anything. It is stated plainly here;
            `aria-expanded` carries the open/shut state. */}
        <button
          type="button"
          className="ds-frow-main"
          aria-expanded={expanded}
          aria-label={`Set up the column ${field.name || 'untitled'}`}
          onClick={onToggle}
        >
          <span className="type-tag" style={{ color: meta.cssVar }}>
            {meta.tag}
          </span>
          <span className={field.name ? 'ds-frow-name' : 'ds-frow-name ds-frow-untitled'}>
            {field.name || 'untitled column'}
            {field.required ? (
              <span className="ds-req" title="Required">
                *
              </span>
            ) : null}
          </span>
          {groupLevel >= 0 ? (
            <span
              className="mono-label ds-frow-level"
              title={`Grouping level ${groupLevel + 1} — the sheet opens a drawer on this column`}
            >
              Groups
            </span>
          ) : null}
          {band ? (
            <span className="mono-label ds-frow-band" title={`Band: ${band.name}`}>
              {band.name}
            </span>
          ) : null}
          {/* THE CARET POINTED RIGHT WHILE THE ROW OPENED DOWNWARD.
              Two directions for one movement, and the one on screen
              was the wrong one — a right caret is the app's own mark
              for a door that takes you somewhere else, which this is
              not. `.ds-frow-open` turns it in the stylesheet; the
              glyph stays Phosphor's. */}
          <span className="ds-frow-caret" aria-hidden="true">
            <CaretRight size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          className="ds-frow-del"
          onClick={() => setPending({ act: 'delete' })}
          aria-label={`Delete the column ${field.name || 'untitled'}`}
          title="Delete this column"
        >
          <X size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
        </button>
      </div>

      {/* THE REVIEWER IS NOT DRAWN HERE, and this is a decision rather
          than an omission. `<FieldMark>` puts a one-click "Apply fix"
          in this margin with no confirmation and nothing computed
          beside it. (The clause that used to close this sentence —
          "and this app has no undo" — was false and has been struck:
          Ctrl+Z takes a fix back like any other column change. Undo is
          not the argument. A fix that is applied before anybody is told
          what it costs is.) On the real sheet its commonest suggestion — "this column only
          ever holds one value, make it a choice list" — fires on 26
          columns where the fix would LOCK the column to that single
          value, and `updateField` wipes every cell in the column on the
          way through. The lint rules also predate table kinds and
          roles, so they read a brand price file as a mis-named entity.
          The reviewer gets its own door once its rules know what a
          brand table is and its fixes are confirm-gated; until then the
          column setup must not be the back way in. */}

      {/* stays put whether the row is open or shut — the column cannot
          hold a value until the list has something on it */}
      {emptyList ? (
        <div className="ds-frow-guard">
          <GuardNote
            tag="Blocker"
            live="status"
            action={expanded ? undefined : { label: 'Open options', onClick: onToggle }}
          >
            This list has no choices yet, so every cell in the column can only
            ever stay empty — give it at least one to choose from.
          </GuardNote>
        </div>
      ) : null}

      {expanded ? (
        <div className="ds-frow-body">
          <div className="ds-ctl-block">
            <label className="mono-label ds-lab" htmlFor={`ds-fname-${field.id}`}>
              Column name
            </label>
            <input
              id={`ds-fname-${field.id}`}
              ref={nameRef}
              className={nameGuard.invalid ? 'field-input ds-input-refused' : 'field-input'}
              value={nameGuard.draft ?? field.name}
              placeholder="Name this column"
              aria-invalid={nameGuard.invalid || undefined}
              onChange={(e) => nameGuard.change(e.target.value)}
              onBlur={nameGuard.settle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  /* a refused name holds the edit open with its mark */
                  if (nameGuard.commit()) e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  /* the shell deselects on a bubbled Escape — here it
                     only means "undo what I was typing" */
                  e.stopPropagation()
                  nameGuard.cancel()
                }
              }}
            />
            {nameGuard.note ? (
              <div className="ds-ctl-note">
                <GuardNote
                  tag={nameGuard.reverted ? 'Reverted' : 'Blocked'}
                  live={nameGuard.reverted ? 'status' : 'alert'}
                >
                  {nameGuard.note}
                </GuardNote>
              </div>
            ) : null}
            {carried ? (
              <div className="ds-ctl-note">
                <GuardNote tag="Carried over" live="status">
                  A calculation names a column by its name, so the new name went
                  into {carried} as well. Nothing else read this column.
                </GuardNote>
              </div>
            ) : null}
          </div>

          {/* WHAT IS IN IT NOW — the block this surface had no answer
              for. The type control below wipes every one of these
              cells, and until this block existed the person deciding
              could see the column's name, its type tag and its band,
              and not one value of the data. Real values, read out of
              the user's own rows; never an example. */}
          <div className="ds-ctl-block ds-holds">
            <span className="mono-label ds-lab">What it holds now</span>
            {facts.rows === 0 ? (
              <p className="ds-hint">This table has no rows yet.</p>
            ) : facts.filled === 0 ? (
              <p className="ds-hint">
                Empty in all {facts.rows} rows — nothing to lose here.
              </p>
            ) : (
              <>
                <p className="ds-holds-count mono-label">
                  {facts.filled} of {facts.rows} rows hold a value
                  <span className="ds-holds-sep" aria-hidden="true"> · </span>
                  {facts.distinct === 1 ? '1 distinct value' : `${facts.distinct} distinct values`}
                </p>
                <div className="ds-holds-samples">
                  {facts.samples.map((v, i) => (
                    <span className="ds-holds-sample" key={`${i}:${v}`}>
                      {v}
                    </span>
                  ))}
                  {facts.distinct > facts.samples.length ? (
                    <span className="ds-holds-more mono-label">
                      +{facts.distinct - facts.samples.length} more
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="ds-ctl-block">
            <label className="mono-label ds-lab" htmlFor={`ds-ftype-${field.id}`}>
              Type
            </label>
            <div className="ds-type-row">
              <span className="type-tag" style={{ color: meta.cssVar }}>
                {meta.tag}
              </span>
              <select
                id={`ds-ftype-${field.id}`}
                className="field-input"
                value={field.type}
                onChange={(e) => {
                  const el = e.currentTarget
                  const next = el.value as FieldType
                  if (next === field.type) return
                  /* THE SELECT NEVER COMMITS THE CHANGE. It puts the
                     question up and snaps straight back to the type
                     the column still has, so a sheet dismissed any way
                     at all — Escape, the scrim, Cancel, a click
                     somewhere else — leaves the control agreeing with
                     the column. It used to be reverted only on the
                     Cancel path, which is the one path a modal cannot
                     assume it gets. */
                  el.value = field.type
                  if (facts.filled === 0) {
                    /* nothing to lose: a column nobody has filled in
                       does not need a sheet of paper to change */
                    updateField(entity.id, field.id, { type: next })
                    return
                  }
                  setPending({ act: 'retype', to: next, plan: retypePlan(rows, field, next) })
                }}
              >
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPES[t].tag} · {FIELD_TYPES[t].label}
                  </option>
                ))}
              </select>
            </div>
            {hasData ? (
              <p className="ds-warn">changing type clears this column’s data</p>
            ) : null}
          </div>

          <label className="ds-check">
            <input
              type="checkbox"
              className="ds-check-input"
              checked={field.required === true}
              onChange={(e) =>
                updateField(entity.id, field.id, {
                  required: e.target.checked || undefined,
                })
              }
            />
            <span className="ds-check-box" aria-hidden="true">
              <Check size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            </span>
            <span className="mono-label ds-check-label">Required</span>
            <span className="ds-req ds-check-req" aria-hidden="true">
              *
            </span>
          </label>

          {/* NO DEFAULT BLOCK WITHOUT A CONTROL UNDER IT. A formula
              column computes its value, and a picture column has no
              value to pre-set — `DefaultValueInput` renders nothing for
              either, so drawing the label over them left a heading with
              empty space beneath it, which reads as a control that
              failed to load. */}
          {field.type !== 'formula' && field.type !== 'image' ? (
            <div className="ds-ctl-block">
              <span className="mono-label ds-lab">Default value</span>
              <DefaultValueInput entityId={entity.id} field={field} />
            </div>
          ) : null}

          {field.type === 'select' ? (
            <SelectOptionsEditor entityId={entity.id} field={field} />
          ) : null}
          {field.type === 'reference' ? (
            <ReferenceEditor entityId={entity.id} field={field} />
          ) : null}
          {field.type === 'formula' ? <FormulaEditor entity={entity} field={field} /> : null}
        </div>
      ) : null}

      {pending?.act === 'retype' ? (
        <RetypeSheet
          columnName={label}
          to={pending.to}
          plan={pending.plan}
          facts={facts}
          onCancel={() => setPending(null)}
          onChoose={(keep) => {
            setPending(null)
            /* ORDER MATTERS. `updateField` clears every cell of the
               column as part of the type change, so the carried
               values can only be written back after it — writing them
               first would put them straight in front of the wipe.
               These land in one React event, so the sheet underneath
               re-renders once however many rows carried across. */
            updateField(entity.id, field.id, { type: pending.to })
            if (!keep) return
            for (const c of pending.plan.carried) {
              updateCell(entity.id, c.rowId, field.id, c.value)
            }
          }}
        />
      ) : null}

      {pending?.act === 'delete' ? (
        <DeleteSheet
          columnName={label}
          tableName={entity.name}
          facts={facts}
          groupLevel={groupLevel}
          readers={holders?.readers ?? []}
          rules={holders?.rules ?? []}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setPending(null)
            removeField(entity.id, field.id)
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ */
/* the two sheets                                               */
/* ------------------------------------------------------------ */

function RetypeSheet({
  columnName,
  to,
  plan,
  facts,
  onCancel,
  onChoose,
}: {
  columnName: string
  to: FieldType
  plan: RetypePlan
  facts: ColumnFacts
  onCancel: () => void
  onChoose: (keep: boolean) => void
}) {
  const kept = plan.carried.length
  const target = FIELD_TYPES[to].label.toLowerCase()

  return (
    <ConfirmSheet
      eyebrow="Change type"
      question={`Make “${columnName}” a ${target} column?`}
      onCancel={onCancel}
      choices={
        kept > 0
          ? [
              {
                label: `Keep the ${kept} that convert`,
                note:
                  plan.lost === 0
                    ? 'Every value survives, written as the new type.'
                    : `The other ${plan.lost} cannot be written as a ${target} and are cleared.`,
                destructive: plan.lost > 0,
                onPick: () => onChoose(true),
              },
              {
                label: 'Clear the column',
                note: `All ${plan.filled} values go.`,
                destructive: true,
                onPick: () => onChoose(false),
              },
            ]
          : [
              {
                label: 'Clear the column and change the type',
                note: `All ${plan.filled} values go — none of them can be written as a ${target}.`,
                destructive: true,
                onPick: () => onChoose(false),
              },
            ]
      }
    >
      <ConfirmFacts
        items={[...factLines(facts), kept > 0 ? `${kept} convert` : 'none convert']}
      />
      <ConfirmSamples
        label="In it now"
        values={facts.samples}
        more={facts.distinct - facts.samples.length}
      />
      {plan.lost > 0 ? (
        <ConfirmSamples
          label={
            plan.lost === 1
              ? 'The 1 that cannot cross'
              : `${plan.lost} cannot cross, among them`
          }
          values={plan.lostSamples}
        />
      ) : null}
      {/* THE SENTENCE THAT USED TO BE FALSE. It said "This app has no
          undo. Whatever is cleared here can only come back from a file
          you exported earlier." Measured in the running app on Surtees:
          retype "Model Code" from text to number, take "Clear the
          column and change the type", press Ctrl+Z — the column is a
          text column again and all 19 values are back, this row still
          open on it. `updateField` calls `record()` BEFORE it mutates,
          so the snapshot on the stack is the column as it stood; the
          "keep what converts" branch writes its carried cells in the
          same event-loop turn, which the store folds into the one step.
          Either choice is one press of Ctrl+Z.

          Why the sheet stays anyway is ColumnMenu.tsx's argument,
          verbatim: undo repairs the damage, it does not TELL you about
          it, and DESIGN_CONTRACT §7 wants a confirm that states its
          blast radius, computed. This one shows the values it is about
          to clear. */}
      <p className="ds-cs-line">
        Ctrl+Z takes the whole change back — the type it was, and every value
        cleared here.
      </p>
    </ConfirmSheet>
  )
}

function DeleteSheet({
  columnName,
  tableName,
  facts,
  groupLevel,
  readers,
  rules,
  onCancel,
  onConfirm,
}: {
  columnName: string
  tableName: string
  facts: ColumnFacts
  groupLevel: number
  readers: FieldDef[]
  rules: Array<{ ruleId: string; ruleName: string; messages: string[] }>
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmSheet
      eyebrow="Remove column"
      question={`Remove “${columnName}” from ${tableName}?`}
      onCancel={onCancel}
      choices={[
        {
          label: 'Remove it',
          /* "and cannot be recovered" stood on the end of this line and
             was the same falsehood as the paragraph below, in the one
             place a person reads last before pressing. What leaves is
             true and worth counting; what happens to it afterwards is
             the paragraph's to say, and it says Ctrl+Z. */
          note:
            facts.filled === 0
              ? 'The column is empty, so no values go with it.'
              : `${facts.filled} values go with it.`,
          destructive: true,
          onPick: onConfirm,
        },
      ]}
    >
      {/* one voice with the retype sheet: `factLines` is the only place
          these counts are worded, so the two sheets can never describe
          the same column two different ways */}
      <ConfirmFacts items={factLines(facts)} />
      <ConfirmSamples
        label="In it now"
        values={facts.samples}
        more={facts.distinct - facts.samples.length}
      />

      {/* WHAT ELSE BREAKS. The rules stage already put a red mark on
          the rule an hour after the column left — one stage away, if
          you went looking. The warning belongs here, before it. */}
      {groupLevel >= 0 ? (
        <p className="ds-cs-line">
          It is grouping level {groupLevel + 1}, so {tableName} loses that drawer
          on the sheet.
        </p>
      ) : null}
      {readers.length > 0 ? (
        <p className="ds-cs-line ds-cs-line-warn">
          {nameList(readers.map((r) => r.name || 'an untitled column'))}{' '}
          {readers.length === 1 ? 'reads' : 'read'} this column, and will show
          “Unknown field [{columnName}]” in every row instead of a value.
        </p>
      ) : null}
      {rules.map((r) => (
        <p className="ds-cs-line ds-cs-line-warn" key={r.ruleId}>
          <span className="ds-cs-rule-name">{r.ruleName}</span> breaks:{' '}
          {r.messages.join(' ')}
        </p>
      ))}
      {/* THE SENTENCE THAT USED TO BE FALSE, and the same one the
          register's own column menu already corrected — the two sheets
          remove the same column and must not answer differently.
          Measured in the running app on Surtees: remove "Matrix", press
          Ctrl+Z, and the column is back as the FOURTH row of this page,
          inside its Identity band, with all 19 of its values on the
          sheet behind it. `removeField` records one step, and the store
          restores a whole DataSlice, which is why the index and the
          band come back and not just the name. */}
      <p className="ds-cs-line">
        Ctrl+Z brings the column back, at its own place in this list and in its
        own band, with every value in it.
      </p>
    </ConfirmSheet>
  )
}

/* ------------------------------------------------------------ */
/* default value — control matches the field's type             */
/* ------------------------------------------------------------ */

function DefaultValueInput({ entityId, field }: { entityId: string; field: FieldDef }) {
  const updateField = useProjectStore((s) => s.updateField)
  const targetEntity = useProjectStore((s) =>
    field.refEntityId ? s.entities[field.refEntityId] : undefined,
  )
  const targetRows = useProjectStore((s) =>
    field.refEntityId ? s.rowsByEntity[field.refEntityId] : undefined,
  )

  const set = (v: CellValue | undefined) =>
    updateField(entityId, field.id, { defaultValue: v })

  const dv = field.defaultValue

  switch (field.type) {
    case 'text':
      return (
        <input
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          placeholder="— none —"
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          className="field-input"
          value={typeof dv === 'number' ? dv : ''}
          placeholder="— none —"
          aria-label="Default value"
          onChange={(e) => {
            const t = e.target.value
            if (t === '') {
              set(undefined)
            } else {
              const n = Number(t)
              if (!Number.isNaN(n)) set(n)
            }
          }}
        />
      )
    case 'boolean':
      return (
        <select
          className="field-input"
          value={dv === true ? 'true' : dv === false ? 'false' : ''}
          aria-label="Default value"
          onChange={(e) =>
            set(e.target.value === '' ? undefined : e.target.value === 'true')
          }
        >
          <option value="">— none —</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    case 'date':
      return (
        <input
          type="date"
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        />
      )
    case 'select': {
      const opts = field.options ?? []
      if (opts.length === 0) {
        return <p className="ds-hint">Add options below first.</p>
      }
      return (
        <select
          className="field-input"
          value={typeof dv === 'string' && opts.includes(dv) ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">— none —</option>
          {/* the options editor refuses duplicates, but an imported project
              can still carry them — index-qualify so keys stay unique */}
          {opts.map((o, i) => (
            <option key={`${i}:${o}`} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    }
    case 'reference': {
      if (!field.refEntityId || !targetEntity) {
        /* SAID "TARGET ENTITY" on a surface whose whole contract is
           table and column — and the control it points at is headed
           "Links to". */
        return <p className="ds-hint">Choose the table this links to, below.</p>
      }
      const rows = targetRows ?? []
      if (rows.length === 0) {
        return (
          <p className="ds-hint">
            No {targetEntity.name.toLowerCase()} rows drafted yet.
          </p>
        )
      }
      return (
        <select
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">— none —</option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {rowLabel(targetEntity, r)}
            </option>
          ))}
        </select>
      )
    }
    default:
      return null
  }
}
