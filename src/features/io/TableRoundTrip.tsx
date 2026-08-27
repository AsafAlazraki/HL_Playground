/* ============================================================
   io/TableRoundTrip — export, edit in Excel, re-upload, FROM THE
   TABLE, with the merge said out loud before it happens.

   THE INSTRUCTION (docs/specs/ACTION_BAR.md §4): "remember, people
   will export. And than reupload." §4.1 says where it starts — "A
   person edits a register, exports it, works in Excel, and brings it
   back. That round trip should start at the table, not only from a
   global menu." §4.3 says what it owes them: "how many rows matched,
   how many are new, what will be overwritten. A silent merge over a
   real dealership's price file is the worst failure this app could
   have."

   WHERE IT LIVES, AND WHY IT IS NOT A SECOND HOME. The action bar was
   built two commits ago and its own spec closes by saying this belongs
   on it and was left undone. So this is a GROUP ON THAT BAR — rank 40,
   between "see all of it" (30) and the doors (50), which is where "take
   it away and bring it back" reads — published by the register that
   already publishes the rest. No new bar, no new menu, no second
   toolbar. The whole-sheet envelope keeps its own door on Home, and
   the two are different acts on different things: that one backs up
   the WHOLE SHEET as JSON, this one sends ONE REGISTER to Excel.

   WHAT LEAVES IS WHAT THE REGISTER IS SHOWING. If a search has
   narrowed 588 variants to 12, the file has 12 — the control acts on
   what is on the screen, which is the least surprising thing a control
   on a bar can do, and the note that follows says the figure out loud
   so it is never a guess. It is safe to be either, because the merge
   NEVER DELETES: the other 576 are reported as untouched and left
   exactly as they are.

   THE PREFLIGHT IS THE PRODUCT. `planTableUpload` reads the file and
   writes nothing; this component draws what it found — the counts, the
   cells it would change with the old value and the new one side by
   side, and every refusal as its own sentence — and only a deliberate
   press applies it. The confirm is the house one (`ConfirmSheet`), the
   same question that guards a replace and a clear, so an irreversible-
   looking act never gets drawn by a different hand.

   AND IT IS STILL UNDOABLE. The apply writes in one turn of the event
   loop, so the store records ONE history step for a merge of four
   hundred cells, and the note that follows carries UNDO for nine
   seconds with Ctrl+Z behind it (rule 9). The confirm is not there
   because the act cannot be undone; it is there because a bulk write
   over a live price file is a thing a person must be able to SEE
   before it happens.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { DownloadSimple, UploadSimple } from '@phosphor-icons/react'
import type { CellValue, FieldDef, RowData } from '@/types/model'
import type { ActionItem } from '@/lib/actions'
import { useProjectStore } from '@/store/useProjectStore'
import { ConfirmFacts, ConfirmSamples, ConfirmSheet } from '@/features/designer/ConfirmSheet'
import { offerUndo, type PushNote } from '@/store/notes'
import { downloadCsv } from './saveCopy'
import {
  ROW_KEY_HEADER,
  applyTableUpload,
  buildTableCsv,
  describePlan,
  planIsIdle,
  planTableUpload,
  type TableUploadPlan,
} from './tableCsv'
import './io.css'

/* how many changed cells the confirm lists before it starts counting */
const CHANGES_SHOWN = 8
/* how many new rows it names */
const NEW_SHOWN = 6

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

export interface TableRoundTripSource {
  entityId: string
  /** every row on the table — what a line in the file is matched against */
  allRows: RowData[]
  /** the rows the register is SHOWING, in the order it shows them */
  shownRows: RowData[]
  /** formula results for a row, so the file carries the totals */
  computedFor: (row: RowData) => Record<string, CellValue>
  /** a link column's labels, so the file says the linked row's name */
  refLabelOf: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
  /** the same columns the other way, so a name in the file resolves */
  refMapOf: (f: FieldDef) => Map<string, string> | undefined
  /** true while a search, sort or filter is narrowing the register */
  viewActive: boolean
  pushToast: PushNote
}

export interface TableRoundTrip {
  /** one group's worth of controls, for the register's own action bar */
  items: ActionItem[]
  /** the file input and the preflight — rendered by the host */
  surface: ReactNode
}

/**
 * The round trip's two controls and the surface behind them.
 *
 * A HOOK RATHER THAN A COMPONENT, because the controls have to be
 * PUBLISHED to the action bar by whoever owns the register's bar
 * (see `@/lib/actions`: one owner per register, or two half-bars),
 * while the file input and the confirm have to be RENDERED inside the
 * page. Those are two different places, so the caller gets both and
 * puts each where it goes.
 */
export function useTableRoundTrip(src: TableRoundTripSource): TableRoundTrip {
  const {
    entityId,
    allRows,
    shownRows,
    computedFor,
    refLabelOf,
    refMapOf,
    viewActive,
    pushToast,
  } = src

  const entity = useProjectStore((s) => s.entities[entityId])
  const updateCell = useProjectStore((s) => s.updateCell)
  const addRow = useProjectStore((s) => s.addRow)

  const fileRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<TableUploadPlan | null>(null)

  /* -- out ---------------------------------------------------- */

  const doExport = useCallback(() => {
    if (!entity) return
    const file = buildTableCsv({
      entity,
      rows: shownRows,
      computedFor,
      refLabelOf,
    })
    downloadCsv(file.text, file.fileName)

    /* THE NOTE SAYS THE THREE THINGS A PERSON NEEDS AND NOTHING ELSE:
       what the file is called (so they can find it), what is in it
       (so the count is never a surprise on the way back), and what
       the app will not read back (rule 10, said where it happens
       rather than discovered in Excel). */
    const scope = viewActive
      ? `${plural(file.rows, 'row', 'rows')} — the ones showing`
      : plural(file.rows, 'row', 'rows')
    const held =
      file.readOnlyColumns.length > 0
        ? ` ${file.readOnlyColumns.join(' and ')} ${file.readOnlyColumns.length === 1 ? 'is' : 'are'} in it to read, not to edit.`
        : ''
    pushToast(
      `${file.fileName} — ${scope} and ${plural(file.columns - 1, 'column', 'columns')}. Edit it in Excel, then press Re-upload.${held}`,
    )
  }, [entity, shownRows, computedFor, refLabelOf, viewActive, pushToast])

  /* -- back --------------------------------------------------- */

  const readFile = useCallback(
    async (file: File) => {
      if (!entity) return
      let text: string
      try {
        text = await file.text()
      } catch {
        pushToast(`${file.name} could not be opened.`, 'warn')
        return
      }
      setPlan(
        planTableUpload({
          entity,
          rows: allRows,
          text,
          fileName: file.name,
          refRowLabels: refMapOf,
          refLabelOf,
        }),
      )
    },
    [entity, allRows, refMapOf, refLabelOf, pushToast],
  )

  const doUpload = useCallback(() => {
    const input = fileRef.current
    if (!input) return
    /* cleared first, so picking the SAME file twice still fires a
       change — a person who fixes their spreadsheet and re-picks it
       must not be met with silence */
    input.value = ''
    input.click()
  }, [])

  const commit = useCallback(() => {
    if (!plan) return
    const result = applyTableUpload(plan, { updateCell, addRow })
    setPlan(null)

    const said: string[] = []
    if (result.cellsWritten > 0) {
      said.push(
        `${plural(result.cellsWritten, 'cell', 'cells')} across ${plural(result.rowsChanged, 'row', 'rows')}`,
      )
    }
    if (result.rowsAdded > 0) said.push(`${plural(result.rowsAdded, 'row', 'rows')} added`)
    offerUndo(
      pushToast,
      said.length === 0
        ? `${plan.fileName} changed nothing.`
        : `${plan.fileName} — ${said.join(', ')}.`,
    )
  }, [plan, updateCell, addRow, pushToast])

  /* -- the controls ------------------------------------------- */

  const items = useMemo<ActionItem[]>(() => {
    const noRows = shownRows.length === 0
    const noColumns = !entity || entity.fields.length === 0
    return [
      {
        kind: 'button',
        id: 'tb-export',
        label: 'Export',
        say: entity ? `Export ${entity.name} for Excel` : 'Export for Excel',
        icon: DownloadSimple,
        refusal: noColumns
          ? 'Draft a column before there is anything to export.'
          : noRows
            ? 'There are no rows showing to export.'
            : undefined,
        onPick: doExport,
      },
      {
        kind: 'button',
        id: 'tb-reupload',
        label: 'Re-upload',
        say: entity ? `Re-upload a file into ${entity.name}` : 'Re-upload a file',
        icon: UploadSimple,
        refusal: noColumns ? 'Draft a column before a file has anywhere to land.' : undefined,
        onPick: doUpload,
      },
    ]
  }, [entity, shownRows.length, doExport, doUpload])

  /* -- the surface -------------------------------------------- */

  const surface = (
    <>
      <input
        ref={fileRef}
        type="file"
        className="io-file"
        accept=".csv,text/csv,text/plain"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void readFile(file)
        }}
      />
      {plan && entity ? (
        <UploadPreflight
          plan={plan}
          rowsHere={allRows.length}
          onCancel={() => setPlan(null)}
          onCommit={commit}
        />
      ) : null}
    </>
  )

  return { items, surface }
}

/* ------------------------------------------------------------ */
/* the preflight                                                 */
/* ------------------------------------------------------------ */

/**
 * WHAT IT IS ABOUT TO DO, BEFORE IT DOES IT.
 *
 * The order is the order a person needs it in: the one-line verdict,
 * then the counts, then the cells themselves with the old value beside
 * the new one, then every refusal. The cells are the part §4.3 was
 * really asking for — a count of "12 overwritten" is a number, and
 * `Cash 68,990 → 71,990 on Sport 560` is a fact somebody can check
 * against the email that sent them the file.
 */
function UploadPreflight({
  plan,
  rowsHere,
  onCancel,
  onCommit,
}: {
  plan: TableUploadPlan
  rowsHere: number
  onCancel: () => void
  onCommit: () => void
}): JSX.Element {
  const idle = planIsIdle(plan)

  const facts: string[] = plan.ok
    ? [
        `${plan.fileRows} in file`,
        `${plan.matched} matched`,
        `${plan.overwritten} overwritten`,
        `${plan.added} new`,
        `${rowsHere} here`,
      ]
    : []

  const shown = plan.changes.slice(0, CHANGES_SHOWN)
  const moreChanges = plan.changes.length - shown.length

  const choices =
    plan.ok && !idle
      ? [
          {
            label: plan.added > 0 ? 'Merge and add' : 'Merge it',
            note:
              plan.added > 0
                ? `Writes ${plural(plan.changes.length, 'cell', 'cells')} and adds ${plural(plan.added, 'row', 'rows')}. One press of Ctrl+Z puts it all back.`
                : `Writes ${plural(plan.changes.length, 'cell', 'cells')}. One press of Ctrl+Z puts it all back.`,
            onPick: onCommit,
          },
        ]
      : []

  return (
    <ConfirmSheet
      /* SENTENCE CASE, IN THE MARKUP. It read RE-UPLOAD as literal
         capitals — which no `text-transform` pass could have caught —
         beside four other call sites of this same confirm that say
         "Replace the sheet", "Clear the sheet" and "Load the current
         example". One question asked five ways. */
      eyebrow="Re-upload"
      question={
        plan.ok
          ? `Put ${plan.fileName} into ${plan.tableName}?`
          : `${plan.fileName} cannot be read into ${plan.tableName}`
      }
      choices={choices}
      cancelLabel={choices.length === 0 ? 'Close' : 'Cancel'}
      onCancel={onCancel}
    >
      <p className="ds-cs-line">{describePlan(plan)}</p>
      <ConfirmFacts items={facts} />

      {plan.matchedOn === 'name' && plan.ok ? (
        <p className="ds-cs-line">
          That file has no {ROW_KEY_HEADER} column, so each line was matched on its name.
          Export this table first and the file it writes carries one.
        </p>
      ) : null}

      {shown.length > 0 ? (
        <ul className="io-diff">
          {shown.map((c) => (
            <li className="io-diff-line" key={`${c.rowId}:${c.fieldId}`}>
              <span className="io-diff-where">{c.rowLabel}</span>
              {/* A COLUMN NAME IS A NAME (§2), and this one carried
                  `.mono-label`, whose identity IS uppercase — so a
                  dealer's `Landed hull cost` was printed back at them
                  as LANDED HULL COST on the one screen whose entire
                  job is "check this against the email that sent you
                  the file". It is now the caption step in the reading
                  face, in the case the column is actually called. */}
              <span className="io-diff-col">{c.columnName}</span>
              <span className="io-diff-from">{c.from === '' ? '—' : c.from}</span>
              <span className="io-diff-arrow" aria-hidden="true">
                →
              </span>
              <span className="io-diff-to">{c.to === '' ? '—' : c.to}</span>
            </li>
          ))}
          {moreChanges > 0 ? (
            /* a sentence, not a stamp: this read +12 MORE CELLS */
            <li className="io-diff-more">
              +{moreChanges} more {moreChanges === 1 ? 'cell' : 'cells'}
            </li>
          ) : null}
        </ul>
      ) : null}

      {plan.newRows.length > 0 ? (
        <ConfirmSamples
          label="New rows"
          values={plan.newRows.slice(0, NEW_SHOWN).map((r) => r.label)}
          more={Math.max(0, plan.newRows.length - NEW_SHOWN)}
        />
      ) : null}

      {plan.refusals.length > 0 ? (
        <ul className="io-rt-notes">
          {plan.refusals.map((r) => (
            <li className="io-rt-note" key={r.id}>
              {r.say}
            </li>
          ))}
        </ul>
      ) : null}
    </ConfirmSheet>
  )
}
