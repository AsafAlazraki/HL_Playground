/* ============================================================
   The column menu — one control per heading, not four.

   Ordering and narrowing are the everyday actions and sit at the
   top; changing what the column IS sits below a rule; removing it
   sits last and asks once, in the same sheet, rather than throwing
   a modal across the screen.

   The system identifier column can be ordered and narrowed like any
   other and nothing else — so that is all this menu offers it.

   WHY THIS ONE STILL ASKS, WHEN THE ROW STRIKE NO LONGER DOES.
   Both acts are one recorded step and both come all the way back on
   Ctrl+Z — measured on Surtees: remove “Matrix”, press Ctrl+Z, and the
   column returns at its own index, inside its Identity band, with all
   19 of its values. So rule 9 ("if an act is undoable it gets a toast
   with UNDO, not a dialog") would retire this sheet too, if the way
   back were the only thing a confirm is for. It is not. The other
   thing is §7's: "a confirm states its blast radius, computed."

   A row leaves in front of you. The register is one line shorter and
   the line that went is the line you had selected. A COLUMN does not:
   it takes one value out of every row in the table — 2,519 of them on
   the largest seeded one, most of them not on screen — and it can also
   put “Unknown field [Matrix]” into every row of a calculated column,
   and hand a business rule a blocker, neither of which this header
   shows and neither of which a person can be expected to remember.
   Undo repairs all of that; it does not TELL you about it. So the
   sheet stays and earns its place by counting, and its sentences are
   now true: what leaves, how much of it, and that Ctrl+Z brings it
   back. The note that follows the removal carries UNDO as well.

   The counts come from the designer's own pure modules — `columnFacts`
   and `dependents` — so this sheet and the column setup can never
   describe the same column two different ways.
   ============================================================ */
import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { isSystemFieldId, type FieldDef, type PriceLevel } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { Button, Row } from '@/ui'
import { columnFacts } from '@/features/designer/columnFacts'
import { formulaReaders, nameList, ruleBreakage } from '@/features/designer/dependents'
import type { SortDir } from '@/features/table/core'
import { Popover } from './Popover'
/* DEEP, not through the quote barrel: `isCostColumn` and `normName`
   are two pure readings, and `@/features/quote` would pull the whole
   document surface into a column menu. */
import { isCostColumn, normName } from '@/features/quote/pricing'
import { columnKindOf } from './columnKinds'


/* ============================================================
   WHAT THIS COLUMN MAY SAY ABOUT PRICE — MODULE_SYSTEM §2 defect 3.

   `priceLevelsFor` prefers a table's own declaration and falls back to
   an exact-name list per kind, so a dealer whose selling column is
   called `Retail` rather than `Cash` had a table the quote could not
   price and no screen that said why. This answers whether THIS column
   can be one, whether it already is, and how to say so either way.

   IT READS THE STORE IMPERATIVELY, deliberately: the column menu must
   not re-render because somebody is typing in the register behind it,
   which is the same reason `blast` is read this way.
   ============================================================ */
function rungFor(
  entityId: string,
  field: FieldDef,
  system: boolean,
): {
  can: boolean
  declared: boolean
  set: (scope: 'quote' | 'line') => void
  clear: () => void
} {
  const entity = useProjectStore.getState().entities[entityId]
  const holdsNumbers = field.type === 'number' || field.type === 'formula'
  const declared = (entity?.priceLevels ?? []).some((l) => l.fieldId === field.id)
  const can =
    !system &&
    holdsNumbers &&
    entity !== undefined &&
    /* THE ONE REFUSAL THAT IS NOT OURS TO SOFTEN. Cost and margin are
       excluded from every quote surface by construction, and
       `priceLevelsFor` drops a declaration pointing at one — so
       offering it here would be a control that appears to work and
       silently does not. */
    !isCostColumn(entity, field)

  const rest = (entity?.priceLevels ?? []).filter((l) => l.fieldId !== field.id)
  const write = (levels: PriceLevel[] | undefined): void => {
    useProjectStore.getState().updateEntity(entityId, { priceLevels: levels })
  }

  return {
    can,
    declared,
    /* THE KEY IS THE COLUMN'S OWN NAME, normalised — the same form the
       fallback list matches on, so a table that later loses its
       declaration lands back on the same rung rather than a different
       one. */
    set: (scope) => {
      write([
        ...rest,
        { key: normName(field.name), label: field.name, fieldId: field.id, scope },
      ])
    },
    clear: () => write(rest.length > 0 ? rest : undefined),
  }
}

export function ColumnMenu({
  field,
  entityId,
  anchor,
  sortDir,
  filtered,
  onSort,
  onFilter,
  onRename,
  onEditOptions,
  onRemove,
  onClose,
}: {
  field: FieldDef
  /** the table the column is on — the blast radius is read from it */
  entityId: string
  anchor: DOMRect
  sortDir: SortDir | null
  filtered: boolean
  onSort: (dir: SortDir | null) => void
  onFilter: () => void
  /** OPEN THE RENAME BOX in the heading itself. The heading press is
   *  the sort control now (see `nextSort` in Grid.tsx), so the rarer
   *  act moved in here — where the rest of a column's rarer acts, its
   *  choices and its removal, already were. Absent where a heading
   *  cannot be renamed at all. */
  onRename?: () => void
  onEditOptions: (options: string[]) => void
  onRemove: () => void
  onClose: () => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  /* asking which kind of rung this is — see `PriceAsk` below */
  const [pricing, setPricing] = useState(false)
  const [optionText, setOptionText] = useState(() =>
    (field.options ?? []).join('\n'),
  )

  const system = isSystemFieldId(field.id)
  const kind = columnKindOf(field.type)

  /* ---- what this column may say about price -------------------
     COMPUTED BY A PLAIN FUNCTION BELOW, not inline: reading the store
     imperatively inside a component body is what `blast` does two
     lines down and it is right — a column menu must not re-render
     because somebody is typing in the register behind it — but doing
     it twice in one component reads as a hook being passed around.
     One helper, called from a memo, says the same thing once. */
  const rung = useMemo(() => rungFor(entityId, field, system), [entityId, field, system])

  /* WORKED OUT ONLY WHILE THE SHEET IS UP. `ruleBreakage` validates
     every rule twice, and doing that on every hover of a column menu
     would be a full graph pass to draw three sort buttons. Read from
     `getState()` rather than a selector for the same reason: this sheet
     must not re-render on every keystroke somebody types into the
     register underneath it. */
  const blast = useMemo(() => {
    if (!confirming) return null
    const { entities, rowsByEntity, rules } = useProjectStore.getState()
    const entity = entities[entityId]
    if (!entity) return null
    return {
      facts: columnFacts(rowsByEntity[entityId], field.id),
      readers: formulaReaders(entity, field),
      broken: ruleBreakage({ entities, rowsByEntity }, rules, entityId, field.id),
    }
  }, [confirming, entityId, field])

  const act = (fn: () => void) => (): void => {
    fn()
    onClose()
  }

  const commitOptions = (): void => {
    onEditOptions(
      optionText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    )
    onClose()
  }

  /* the counted sentence, or the honest fallback if the table went
     away under us — never a number this file guessed at */
  const whatLeaves = ((): string => {
    if (blast === null) return 'Every value in this column leaves with it.'
    const { rows, filled } = blast.facts
    if (filled === 0) return 'The column is empty, so no values go with it.'
    const rowWord = rows === 1 ? '1 row' : `${rows} rows`
    return `${filled} of ${rowWord} hold a value in it, and those go too.`
  })()

  return (
    <Popover anchor={anchor} width={248} label={`${field.name} column`} onClose={onClose}>
      <header className="tb-menu-head">
        {/* `tb-menu-name`, not `tb-menu-title`: this is the dealer's
            own column name and it keeps its case. The caption class
            still exists for the two popovers that hold a caption. */}
        <span className="tb-menu-name">{field.name}</span>
        <span className="tb-menu-kind">{kind.label}</span>
      </header>

      {editing ? (
        <>
          <div className="tb-menu-body">
            <label className="mono-label tb-menu-lab" htmlFor={`tb-opts-${field.id}`}>
              The choices — one per line
            </label>
            <textarea
              id={`tb-opts-${field.id}`}
              className="field-input tb-area"
              rows={5}
              value={optionText}
              autoFocus
              spellCheck={false}
              onChange={(e) => setOptionText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <p className="tb-menu-note">
              Cells already holding something else keep it until you retype them.
            </p>
          </div>
          <footer className="tb-menu-foot">
            <Button tone="ghost" size="sm" onClick={() => setEditing(false)}>
              Back
            </Button>
            <Button tone="primary" size="sm" onClick={commitOptions}>
              Save choices
            </Button>
          </footer>
        </>
      ) : pricing ? (
        /* ============================================================
           WHICH KIND OF RUNG THIS IS — asked, never defaulted.

           `PriceLevel.scope` decides what moving to this column does.
           A QUOTE rung re-prices the whole document at once, which is
           what Cash and Trade are; a LINE rung is one a single line
           can be switched to, which is what `fitted` on a part and
           `warranty` on a hull are. Guessing between them would be
           the app writing a pricing policy on a dealer's behalf, and
           the two are not recoverable from each other by inspection.

           SO IT IS TWO ROWS AND NOT A TOGGLE. Each one says what
           happens in the sentence a person would use to describe it,
           and neither is primary — the app has no recommendation to
           make about how a business prices.
           ============================================================ */
        <>
          <div className="tb-menu-body">
            <p className="tb-confirm-title">Price from “{field.name}”</p>
            <p className="tb-menu-note">
              What does this column price? A quote is set to one rung at a time; a
              line can be switched to its own.
            </p>
          </div>
          <div className="tb-acts">
            <Row
              dense
              onActivate={act(() => rung.set('quote'))}
              name="The whole quote"
              meta={<span className="tb-menu-note">Every line moves together</span>}
            />
            <Row
              dense
              onActivate={act(() => rung.set('line'))}
              name="One line at a time"
              meta={<span className="tb-menu-note">A single line can be switched to it</span>}
            />
          </div>
          <footer className="tb-menu-foot">
            <Button tone="ghost" size="sm" onClick={() => setPricing(false)}>
              Back
            </Button>
          </footer>
        </>
      ) : confirming ? (
        <>
          <div className="tb-menu-body">
            <p className="tb-confirm-title">Remove “{field.name}”?</p>
            {/* THE SENTENCE THAT USED TO BE FALSE. It said "There is no
                undo." Ctrl+Z has taken this act back since the history
                stack landed, and a destructive sheet claiming otherwise
                is the one kind of wrong wording that changes what a
                person does: it stops them doing something they could
                safely try. */}
            <p className="tb-confirm-sub">
              {whatLeaves} Ctrl+Z brings the column back, with every value in it.
            </p>

            {/* WHAT UNDO CANNOT TELL YOU IN ADVANCE — the reason this
                sheet is still a sheet. Both sentences are the designer's
                own, verbatim, so the two surfaces speak once. */}
            {blast !== null && blast.readers.length > 0 ? (
              <p className="tb-confirm-sub">
                {nameList(blast.readers.map((r) => r.name || 'an untitled column'))}{' '}
                {blast.readers.length === 1 ? 'reads' : 'read'} this column, and will
                show “Unknown field [{field.name}]” in every row instead of a value.
              </p>
            ) : null}
            {blast?.broken.map((r) => (
              <p className="tb-confirm-sub" key={r.ruleId}>
                {r.ruleName} breaks: {r.messages.join(' ')}
              </p>
            ))}
          </div>
          {/* FOCUS LANDS ON THE WAY OUT, NOT ON THE DELETE.
              This dialog used to hand the keyboard the Remove button, so
              the Enter that opened it could destroy a column of the price
              file on the follow-through. The app already disagreed with
              itself here — the designer's own confirm sheet focuses
              cancel — so this is bringing one surface into line with the
              other, not inventing a policy. */}
          <footer className="tb-menu-foot">
            <Button tone="ghost" size="sm" autoFocus onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button tone="danger" size="sm" onClick={act(onRemove)}>
              Remove
            </Button>
          </footer>
        </>
      ) : (
        /* THE ACTS ARE ROWS — the src/ui line, activating, dense. The
           one in force (this sort, a narrowing) is `current`, which
           is drawn from aria-current so the look and the announcement
           cannot part. The destructive act is a Button in the danger
           tone rather than a row painted red: it is the one act here
           that asks a question before it does anything. */
        <div className="tb-acts">
          <Row
            dense
            current={sortDir === 'asc'}
            onActivate={act(() => onSort(sortDir === 'asc' ? null : 'asc'))}
            name="Sort first to last"
          />
          <Row
            dense
            current={sortDir === 'desc'}
            onActivate={act(() => onSort(sortDir === 'desc' ? null : 'desc'))}
            name="Sort last to first"
          />
          <Row
            dense
            current={filtered}
            onActivate={act(onFilter)}
            name={filtered ? 'Change what shows…' : 'Show only some…'}
          />

          {/* ============================================================
              DECLARING THIS COLUMN A PRICE — MODULE_SYSTEM §2 defect 3.

              `priceLevelsFor` prefers a table's own declaration and
              falls back to an exact-name list per kind, so a dealer
              whose selling column is called `Retail` rather than
              `Cash` had a table the quote could not price and no
              screen that said why. This is where they say so.

              ONLY ON A COLUMN THAT COULD HOLD ONE. A text column is
              not a price, and a COST column is refused outright:
              `priceLevelsFor` drops a rung pointing at one by
              construction, so offering it here would be a control
              that appears to work and silently does not.
              ============================================================ */}
          {rung.can && (
            <>
              <span className="tb-act-rule" aria-hidden="true" />
              {rung.declared ? (
                <Row
                  dense
                  current
                  onActivate={act(rung.clear)}
                  name="Stop pricing from this"
                />
              ) : (
                <Row dense onActivate={() => setPricing(true)} name="Price from this column…" />
              )}
            </>
          )}

          {!system && (
            <>
              <span className="tb-act-rule" aria-hidden="true" />
              {onRename && <Row dense onActivate={act(onRename)} name="Rename column…" />}
              {field.type === 'select' && (
                <Row dense onActivate={() => setEditing(true)} name="Edit the choices…" />
              )}
              <Button tone="danger" size="sm" block onClick={() => setConfirming(true)}>
                Remove column
              </Button>
            </>
          )}
        </div>
      )}
    </Popover>
  )
}
