/* ============================================================
   NEW TABLE FROM A CSV — the proposal, before anything exists.

   THE INSTRUCTION: "be able to create new table directly from a csv
   import. and our schema adjusts to that tables columns etc. so they
   could upload supplier table directly."

   THIS IS THE SAME DIALOG, NOT A SECOND DOOR. New table already asks
   two questions — what kind of table is this, how is it structured —
   and this is what the first question's other answer looks like: I
   already have it in a spreadsheet. Same sheet, same header, same
   CREATE button in the same corner, same Escape.

   WHAT IS ON SCREEN IS A PROPOSAL AND EVERY PART OF IT IS EDITABLE.
   `@/features/io/csvSchema` reads the file and argues for a type per
   column; this surface draws that argument beside each column IN
   COUNTS — "2,910 of 2,913 are numbers. 3 are not a number, and will
   land empty (Std ×2, POA)" — and lets the person overrule it. The
   moment they do, the same sentence is recomputed for THEIR choice
   from the same code, so the cost of overruling is stated in exactly
   the words the proposal was.

   THREE THINGS ARE THEIRS TO CHANGE, and they are the three the file
   cannot know: what the column is CALLED, what it HOLDS, and which
   one NAMES A ROW. Everything else is read.

   NOTHING IS CREATED UNTIL THE BUTTON IS PRESSED, and the button says
   what it is about to make — the name, the column count, the row
   count — because a table with 2,913 rows arriving on the sheet is
   not a thing to discover afterwards. It IS undoable, in one step, so
   it takes a toast with UNDO rather than a confirm (rule 9).

   THE ENGINE MUST NOT KNOW WHAT A BOAT IS. The kind is asked for, in
   the footer, and defaults to `custom`. Nothing here reads the file's
   contents and guesses "this looks like trailers" — a supplier list
   is a supplier list, and a dealer who is importing their freight
   schedule is not helped by an app that thinks it recognises hulls.
   ============================================================ */
import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent, ReactElement } from 'react'
import {
  FIELD_TYPES,
  TABLE_KINDS,
  accentVar,
  type FieldType,
  type TableKind,
  type XY,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
/* DIRECT PATH, DELIBERATELY — the same precedent as the store's
   `@/features/views/relations` import. `@/features/io` is the
   feature's barrel and pulls its React surfaces (and this app's whole
   import/export menu) back in; `csvSchema.ts` imports the CSV codec
   and the cell coercer and nothing else, which is what makes it safe
   to reach from a dialog. */
import {
  INFERABLE_TYPES,
  csvRowValues,
  describeBuild,
  describeColumn,
  listOptionsFor,
  tableNameFromFile,
  type ColumnChoice,
  type CsvSchemaPlan,
} from '@/features/io/csvSchema'
import { TableKindSymbol } from './symbols'
import { tableCentrePosition } from './dnd'

/** How many of a column's unreadable values are named before the rest
 *  are counted. Enough to recognise the pattern ("Std, POA, TBA"),
 *  short enough to stay on one line beside the column. */
const EXCEPTIONS_SHOWN = 4

/** The kinds offered, in the order question one draws them. `custom`
 *  leads here rather than trailing, because a file a dealer already
 *  has is far more often a supplier list than a boat catalogue — and
 *  because the first entry is the default and the default must be the
 *  one that assumes nothing. */
const KIND_ORDER: TableKind[] = [
  'custom',
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
]

const count = (n: number): string => n.toLocaleString()

const plural = (n: number, one: string, many: string): string =>
  `${count(n)} ${n === 1 ? one : many}`

export interface CsvTableStepProps {
  plan: CsvSchemaPlan
  /** flow-space top-left for the new table; omitted lets the store place it */
  position?: XY
  /** put the file picker back up — the answer to every refusal */
  onAnotherFile: () => void
  /** the table exists now; the dialog's job is done */
  onCreated: () => void
}

export function CsvTableStep({
  plan,
  position,
  onAnotherFile,
  onCreated,
}: CsvTableStepProps): ReactElement {
  const [name, setName] = useState(() => tableNameFromFile(plan.fileName))
  const [kind, setKind] = useState<TableKind>('custom')
  const [names, setNames] = useState<string[]>(() => plan.columns.map((c) => c.header))
  const [types, setTypes] = useState<FieldType[]>(() => plan.columns.map((c) => c.type))
  const [options, setOptions] = useState<Array<string[] | undefined>>(() =>
    plan.columns.map((c) => c.options),
  )
  const [nameColumn, setNameColumn] = useState(plan.nameColumn)
  /* one refusal, on the column it belongs to — never a second window
     on top of this one to deliver one short sentence */
  const [note, setNote] = useState<{ at: number; say: string } | null>(null)

  /* The readings depend on the TYPES, not on the names, so renaming a
     column does not re-judge two thousand cells on every keystroke. */
  const readings = useMemo(
    () => plan.columns.map((c, i) => describeColumn(c, types[i], options[i])),
    [plan, types, options],
  )

  const emptied = useMemo(() => readings.reduce((n, r) => n + r.emptied, 0), [readings])

  const setType = useCallback(
    (at: number, next: FieldType) => {
      if (next === 'select') {
        /* A LIST NEEDS A SET OF OPTIONS. The inference has its own
           thresholds and this is an override, so the only thing that
           can stop it is the one thing that is not a judgement — and
           it says so here, on this column. */
        const got = listOptionsFor(plan.columns[at])
        if ('refusal' in got) {
          setNote({ at, say: got.refusal })
          return
        }
        setOptions((prev) => prev.map((o, i) => (i === at ? got.options : o)))
      } else {
        setOptions((prev) => prev.map((o, i) => (i === at ? undefined : o)))
      }
      setTypes((prev) => prev.map((t, i) => (i === at ? next : t)))
      setNote(null)
    },
    [plan],
  )

  const rename = useCallback((at: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === at ? value : n)))
    setNote((prev) => (prev?.at === at ? null : prev))
  }, [])

  const create = useCallback(
    (event: FormEvent) => {
      event.preventDefault()

      /* A column with no name is not a column, and two columns with
         one name is one column twice. Both are said on the plate they
         belong to, the way an empty level already is. */
      const blank = names.findIndex((n) => n.trim() === '')
      if (blank >= 0) {
        setNote({ at: blank, say: 'Every column needs a name.' })
        return
      }
      const seen = new Map<string, number>()
      for (let i = 0; i < names.length; i += 1) {
        const key = names[i].trim().toLowerCase()
        const first = seen.get(key)
        if (first !== undefined) {
          setNote({
            at: i,
            say: `Column ${first + 1} is already called ${names[first].trim()}.`,
          })
          return
        }
        seen.set(key, i)
      }

      const choices: ColumnChoice[] = plan.columns.map((c, i) => ({
        index: c.index,
        name: names[i].trim(),
        type: types[i],
        options: options[i],
      }))

      const made = useProjectStore.getState().importTable({
        name: name.trim() || tableNameFromFile(plan.fileName),
        kind,
        columns: choices.map((c) => ({ name: c.name, type: c.type, options: c.options })),
        rows: csvRowValues(plan.rows, choices),
        nameColumn,
        position: position ?? tableCentrePosition(),
      })
      if (!made) return

      /* WHAT LANDED, INCLUDING WHAT DID NOT. A cell the chosen type
         could not carry is empty, it was counted on screen before the
         press, and it is counted again here — the one number a person
         would otherwise have to go and find. */
      const held =
        emptied > 0
          ? ` ${plural(emptied, 'cell', 'cells')} could not be read as the type chosen and ${emptied === 1 ? 'is' : 'are'} empty.`
          : ''
      sayUndoable(
        `${made.name} — ${plural(choices.length, 'column', 'columns')} and ${plural(plan.rows.length, 'row', 'rows')} from ${plan.fileName}.${held}`,
      )
      onCreated()
    },
    [plan, names, types, options, name, kind, nameColumn, position, emptied, onCreated],
  )

  /* -- a file that cannot be read ----------------------------- */

  if (!plan.ok) {
    return (
      <div className="tk-csv-refuse">
        <ul className="tk-csv-refuse-list">
          {plan.refusals.map((r) => (
            <li className="tk-csv-refuse-item" key={r.id}>
              {r.say}
            </li>
          ))}
        </ul>
        <button type="button" className="btn tk-csv-again" onClick={onAnotherFile}>
          Choose another file
        </button>
      </div>
    )
  }

  const kindMeta = TABLE_KINDS[kind]

  return (
    <form className="tk-form" onSubmit={create}>
      <div className="tk-csv">
        <p className="tk-csv-facts">
          <span className="tk-csv-filename">{plan.fileName}</span>
          <span className="tk-csv-fact">{plural(plan.columns.length, 'column', 'columns')}</span>
          <span className="tk-csv-fact">{plural(plan.rows.length, 'row', 'rows')}</span>
        </p>

        {plan.blankRowsDropped > 0 || plan.shortRows.length > 0 ? (
          <ul className="tk-csv-notes">
            {plan.blankRowsDropped > 0 ? (
              <li className="tk-csv-note">
                {plural(plan.blankRowsDropped, 'empty row was', 'empty rows were')} skipped.
              </li>
            ) : null}
            {plan.shortRows.length > 0 ? (
              <li className="tk-csv-note">
                {plural(plan.shortRows.length, 'row stops', 'rows stop')} short of{' '}
                {plan.columns.length} columns ({plan.shortRows.slice(0, 4).map(count).join(', ')}
                {plan.shortRows.length > 4 ? ', …' : ''}).{' '}
                {plan.shortRows.length === 1 ? 'Its' : 'Their'} last cells will be empty.
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="tk-csv-legend">
          <span className="mono-label">Names a row</span>
          <span className="mono-label">Column</span>
          <span className="mono-label">Holds</span>
          <span className="mono-label">What the file says</span>
        </div>

        <ul className="tk-csv-cols">
          {plan.columns.map((c, i) => {
            const reading = readings[i]
            const meta = FIELD_TYPES[types[i]]
            const shown = reading.exceptions.slice(0, EXCEPTIONS_SHOWN)
            const moreEx = reading.exceptions.length - shown.length
            return (
              <li
                className={`tk-csv-col${nameColumn === i ? ' is-name' : ''}`}
                key={c.index}
              >
                <input
                  type="radio"
                  className="tk-csv-radio"
                  name="tk-csv-namecol"
                  checked={nameColumn === i}
                  onChange={() => setNameColumn(i)}
                  aria-label={`Name rows by ${names[i].trim() || `column ${i + 1}`}`}
                />
                <input
                  className={`field-input tk-csv-name${note?.at === i ? ' is-blank' : ''}`}
                  value={names[i]}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={`Name of column ${i + 1}`}
                  aria-invalid={note?.at === i || undefined}
                  onChange={(e) => rename(i, e.target.value)}
                />
                <span className="tk-csv-holds">
                  <span className="type-tag" style={{ color: meta.cssVar }}>
                    {meta.tag}
                  </span>
                  <select
                    className="field-input tk-csv-type"
                    value={types[i]}
                    aria-label={`What column ${i + 1} holds`}
                    onChange={(e) => setType(i, e.target.value as FieldType)}
                  >
                    {INFERABLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPES[t].label}
                      </option>
                    ))}
                  </select>
                </span>
                <div className="tk-csv-read">
                  <p className="tk-csv-why">{reading.why}</p>
                  {shown.length > 0 ? (
                    <ul className="tk-csv-ex">
                      {shown.map((x) => (
                        <li className="tk-csv-ex-item" key={x.value}>
                          {x.value}
                          {x.count > 1 ? <b>×{count(x.count)}</b> : null}
                        </li>
                      ))}
                      {moreEx > 0 ? (
                        <li className="tk-csv-ex-more">+{count(moreEx)} more</li>
                      ) : null}
                    </ul>
                  ) : null}
                  {note?.at === i ? (
                    <p className="tk-csv-col-note" role="status">
                      {note.say}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <p className="tk-csv-aside">
          Link, calculated and picture columns are not read from a file — a link needs
          another table to point at, and a picture is a file rather than a word. Add those
          on the table once it is here.
        </p>
      </div>

      <footer className="tk-csv-foot">
        <div className="tk-csv-foot-fields">
          <label className="tk-name">
            <span className="mono-label">Table name</span>
            <input
              className="field-input"
              value={name}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="tk-csv-kind">
            <span className="mono-label">What it holds</span>
            <span
              className="tk-csv-kind-row"
              style={{ '--tk-ink': accentVar(kindMeta.accent) } as CSSProperties}
            >
              <TableKindSymbol kind={kind} size={16} />
              <select
                className="field-input"
                value={kind}
                onChange={(e) => setKind(e.target.value as TableKind)}
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {TABLE_KINDS[k].label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <p className="tk-csv-blurb">{kindMeta.blurb}</p>
        </div>
        <div className="tk-csv-go">
          <p className="tk-csv-make">
            {describeBuild(
              plan.columns.length,
              plan.rows.length,
              name.trim() || tableNameFromFile(plan.fileName),
              emptied,
            )}
          </p>
          <button type="submit" className="btn btn-primary tk-create">
            Create table
          </button>
        </div>
      </footer>
    </form>
  )
}
