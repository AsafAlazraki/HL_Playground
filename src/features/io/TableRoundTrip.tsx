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
import {
  ClipboardText,
  ClockCounterClockwise,
  DownloadSimple,
  UploadSimple,
} from '@phosphor-icons/react'
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
import { PasteRows } from './PasteRows'
import { recordMerge, useMerges } from './evidence'
import { MergeLog } from './MergeLog'
import type { PastePlan, PasteResult } from './pasteBlock'
import { PlanChanges, PlanNotes } from './PlanEvidence'
import './io.css'

/* how many new rows the confirm names */
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
  /**
   * OPEN THE PASTE DOOR FROM SOMEWHERE THAT IS NOT THE BAR.
   *
   * The empty-register plate is why this exists. It has been telling
   * people they may "paste a block straight from Excel to fill the
   * whole table at once" for as long as it has existed, under a
   * single button that adds ONE empty row — naming a door it did not
   * draw, on the one screen where that door is worth the most. A
   * sentence about an act is not the act.
   *
   * It is the same door the bar's `tb-paste` opens, handed over
   * rather than copied: one paste surface, two ways in.
   */
  openPaste: () => void
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
  const [pasting, setPasting] = useState(false)
  const [reading, setReading] = useState(false)
  const addField = useProjectStore((s) => s.addField)
  /* what has already landed here, so the fourth control knows
     whether it has anything to open */
  const merges = useMerges(entityId)

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
          /* AND THE APP'S OWN ANSWER FOR ITS CALCULATED COLUMNS, so
             the merge can grade the file's against them — the same
             resolver the export writes the file with, handed to the
             read so the round trip is checked against itself
             (CONFIG_FINDINGS adopt 8). */
          computedFor,
        }),
      )
    },
    [entity, allRows, refMapOf, refLabelOf, computedFor, pushToast],
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

    /* THE APPLY LOG, WRITTEN FROM THE PLAN THE PERSON APPROVED —
       CONFIG_FINDINGS adopt 7. What the preflight drew is exactly
       what is kept: re-deriving it here would be a second reading of
       the same event, free to disagree with the one they said yes to.
       `evidence.ts` carries the rest of the argument. */
    recordMerge({
      tableId: plan.tableId,
      tableName: plan.tableName,
      source: plan.fileName,
      matchedOn: plan.matchedOn,
      changes: plan.changes,
      added: plan.newRows.map((r) => r.label),
      rowsChanged: result.rowsChanged,
    })

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

  /* -- the block ---------------------------------------------- */

  /* THE THREE STORE DOORS THE PASTE NEEDS, IN ONE OBJECT AND IN ONE
     TURN. `addField` is the one the file door does not have and must
     not be given: a `.csv` carries no type and no description, so a
     FILE creating a column would be the app inventing everything
     about it (tableCsv.ts reason 3). A person standing in front of
     the mapping, told the type and what it costs, is a different act
     — DESIGN_PRINCIPLES §7, offered in a sentence that names it. */
  const write = useMemo(
    () => ({ updateCell, addRow, addField }),
    [updateCell, addRow, addField],
  )

  const pasted = useCallback(
    (from: PastePlan, done: PasteResult) => {
      setPasting(false)

      /* THE PASTE DOOR GOES ON THE RECORD TOO, and it is the door a
         dealer actually uses (UX_PASS §9 item 8). Two ways in and one
         log: a person asking what moved the Highfield prices should
         not have to know whether the values arrived as a file or as a
         block of cells out of Excel.

         MINUS THE COLUMNS THE STORE WOULD NOT MAKE. Their cells were
         planned and never written — `applyPaste` drops a change whose
         column failed to be created — so recording them would put
         writes in the log that never happened, which is the one lie an
         apply log cannot afford. */
      const refused = new Set(done.columnsRefused)
      const changes = (from.plan?.changes ?? []).filter((c) => !refused.has(c.columnName))
      if (entity) {
        recordMerge({
          tableId: entity.id,
          tableName: entity.name,
          source: 'Pasted rows',
          matchedOn: from.plan?.matchedOn ?? 'name',
          changes,
          added: (from.plan?.newRows ?? []).map((r) => r.label),
          rowsChanged: done.rowsChanged,
        })
      }

      const said: string[] = []
      if (done.columnsAdded > 0) {
        said.push(`${plural(done.columnsAdded, 'column', 'columns')} added`)
      }
      if (done.rowsAdded > 0) said.push(`${plural(done.rowsAdded, 'row', 'rows')} added`)
      if (done.cellsWritten > 0) {
        said.push(
          `${plural(done.cellsWritten, 'cell', 'cells')} across ${plural(done.rowsChanged, 'row', 'rows')}`,
        )
      }
      /* rule 10 travels all the way to the note: a column the store
         would not make took its cells with it, and that is not a
         thing to discover in the register afterwards */
      const held =
        done.columnsRefused.length > 0
          ? ` ${done.columnsRefused.join(', ')} could not be created, so nothing was written into ${done.columnsRefused.length === 1 ? 'it' : 'them'}.`
          : ''
      offerUndo(
        pushToast,
        said.length === 0
          ? `The pasted block changed nothing.${held}`
          : `Pasted into ${entity?.name ?? 'the table'} — ${said.join(', ')}.${held}`,
      )
    },
    [entity, pushToast],
  )

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
      /* THE THIRD DOOR, AND THE ONE A DEALER USES. UX_PASS §9 item 8:
         "Paste with header mapping — the front door to the product."
         It stands in this group and not somewhere new because it is
         the same act as the two beside it — data arriving at this
         register from a spreadsheet — and it reads as the shortest
         version of it: no file, no download, no Excel. */
      {
        kind: 'button',
        id: 'tb-paste',
        label: 'Paste rows',
        say: entity ? `Paste rows into ${entity.name}` : 'Paste rows',
        icon: ClipboardText,
        /* IT IS REFUSED ON AN EMPTY SCHEMA AND SAYS SO, unlike the
           file door, whose refusal is the same sentence: a column is
           where a pasted value lands, and a table with none has
           nowhere to put one. */
        refusal: noColumns
          ? 'Draft a column before a pasted block has anywhere to land.'
          : undefined,
        onPick: () => setPasting(true),
      },
      /* THE FOURTH, AND IT IS THE ONLY ONE THAT READS. CONFIG_FINDINGS
         adopt 7 asks for before/after evidence logs on every mutation,
         and evidence nobody can open is not evidence. It stands in
         this group because it is about exactly what the three beside
         it did — and its refusal is the honest one: a register nothing
         has been merged into has no log, which is a different fact
         from a log that is empty. */
      {
        kind: 'button',
        id: 'tb-merges',
        label: 'Merge log',
        say: entity ? `What has been merged into ${entity.name}` : 'What has been merged in',
        icon: ClockCounterClockwise,
        refusal:
          merges.length === 0
            ? `Nothing has been merged into ${entity?.name ?? 'this table'} yet. A file or a pasted block that changes something is recorded here, with the value each cell held before it.`
            : undefined,
        onPick: () => setReading(true),
      },
    ]
  }, [entity, shownRows.length, merges.length, doExport, doUpload])

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
      {pasting && entity ? (
        <PasteRows
          entity={entity}
          rows={allRows}
          refMapOf={refMapOf}
          refLabelOf={refLabelOf}
          write={write}
          onClose={() => setPasting(false)}
          onDone={pasted}
        />
      ) : null}
      {reading && entity ? (
        <MergeLog
          tableName={entity.name}
          merges={merges}
          onClose={() => setReading(false)}
        />
      ) : null}
    </>
  )

  return { items, surface, openPaste: () => setPasting(true) }
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

      {/* THE SAME TWO BLOCKS THE PASTE DOOR DRAWS. Extracted to
          `PlanEvidence` when the second door arrived, because two
          copies of "here is what would change" is two places for the
          sentence a dealer checks against their supplier's email to
          drift out of agreement with itself. */}
      <PlanChanges changes={plan.changes} />

      {plan.newRows.length > 0 ? (
        <ConfirmSamples
          label="New rows"
          values={plan.newRows.slice(0, NEW_SHOWN).map((r) => r.label)}
          more={Math.max(0, plan.newRows.length - NEW_SHOWN)}
        />
      ) : null}

      <PlanNotes notes={plan.refusals} />
    </ConfirmSheet>
  )
}
