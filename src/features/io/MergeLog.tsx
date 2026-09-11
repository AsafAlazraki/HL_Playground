/* ============================================================
   io/MergeLog — READING THE APPLY LOG BACK.

   `evidence.ts` keeps what each merge did; this is the one place it
   is read. The question it answers is the one a dealership actually
   asks, three days later, with a supplier on the phone: "the
   Highfield prices moved — when, who did it, which file, and what
   were they before?"

   IT STANDS ON THE REGISTER, not in a settings screen, because that
   is where the question is asked and where the answer is checkable —
   the row labels beside you are the rows in the log. It is the fourth
   item in the same group as Export, Re-upload and Paste rows, since
   it is the same subject: data arriving at this table from a
   spreadsheet.

   IT DRAWS THE SAME `PlanChanges` THE PREFLIGHT DID. The evidence a
   person approved and the evidence they read back a week later are
   the same list in the same shape, and the only way to keep that true
   is for it to be the same component.

   AND IT SAYS WHERE IT IS SHORT, twice over: when the log kept part
   of a big merge, and when there are older merges it is not drawing.
   Rule 10 is about refusals, and a silent truncation is a refusal
   that did not say anything.
   ============================================================ */

import type { JSX } from 'react'
import { ConfirmSheet } from '@/features/designer/ConfirmSheet'
import { Button } from '@/ui'
import { PlanChanges } from './PlanEvidence'
import { downloadFile } from './saveCopy'
import { mergeFileName, mergeJsonl, type MergeEvidence } from './evidence'

/** How many merges the sheet draws. Older ones are counted, not
 *  listed: a scroll of ten price files is not a reading surface. */
export const MERGES_SHOWN = 4

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

/** `11 Sept, 2:14pm`. The log is read against a memory of a week, so
 *  the date leads and the time is there to tell two files apart. */
export function stampSay(at: number): string {
  const d = new Date(at)
  const day = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const time = d
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(' ', '')
  return `${day}, ${time}`
}

/** What one merge did, counted, in the words the toast used at the
 *  time — so the line in the log and the line a person remembers
 *  seeing are the same sentence. */
export function mergeSay(m: MergeEvidence): string {
  const said: string[] = []
  if (m.cellTotal > 0) {
    said.push(
      `${plural(m.cellTotal, 'cell', 'cells')} across ${plural(m.rowsChanged, 'row', 'rows')}`,
    )
  }
  if (m.addedTotal > 0) said.push(`${plural(m.addedTotal, 'row', 'rows')} added`)
  return said.join(', ')
}

/** THE SAVE, AS THE FINDING ASKS FOR IT. `application/x-ndjson` is
 *  the registered type for one-JSON-object-per-line; a browser that
 *  does not know it still saves the file, because the name carries
 *  the extension. */
export function saveMergeLog(m: MergeEvidence): void {
  downloadFile(mergeJsonl(m), mergeFileName(m), 'application/x-ndjson')
}

export interface MergeLogProps {
  tableName: string
  merges: MergeEvidence[]
  onClose: () => void
}

export function MergeLog({ tableName, merges, onClose }: MergeLogProps): JSX.Element {
  const shown = merges.slice(0, MERGES_SHOWN)
  const older = merges.length - shown.length

  return (
    <ConfirmSheet
      eyebrow="Merge log"
      question={`What has been merged into ${tableName}`}
      choices={[]}
      cancelLabel="Close"
      onCancel={onClose}
    >
      {shown.length === 0 ? (
        <p className="ds-cs-line">
          Nothing has been merged into {tableName}. A file or a pasted block that changes
          something is recorded here, with the value each cell held before it.
        </p>
      ) : null}

      <ul className="io-log">
        {shown.map((m) => (
          <li className="io-log-item" key={m.id}>
            <p className="io-log-head">
              <span className="io-log-source">{m.source}</span>
              <span className="io-log-when">{stampSay(m.at)}</span>
              {m.who ? <span className="io-log-who">{m.who}</span> : null}
            </p>
            <p className="io-log-said">{mergeSay(m)}</p>

            {m.matchedOn === 'name' ? (
              <p className="io-log-said">
                Those lines were matched on their names — that file carried no row key.
              </p>
            ) : null}

            <PlanChanges changes={m.cells} />

            {m.cellTotal > m.cells.length ? (
              <p className="io-log-short">
                The log kept the first {m.cells.length.toLocaleString()} of{' '}
                {m.cellTotal.toLocaleString()} changed cells.
              </p>
            ) : null}

            {m.addedTotal > 0 ? (
              <p className="io-log-said">
                New: {m.added.map((r) => r.label).join(', ')}
                {m.addedTotal > m.added.length
                  ? ` and ${(m.addedTotal - m.added.length).toLocaleString()} more`
                  : ''}
              </p>
            ) : null}

            <Button onClick={() => saveMergeLog(m)}>Save this log</Button>
          </li>
        ))}
      </ul>

      {older > 0 ? (
        <p className="io-log-short">
          {plural(older, 'older merge is', 'older merges are')} on the record and not drawn
          here.
        </p>
      ) : null}
    </ConfirmSheet>
  )
}
