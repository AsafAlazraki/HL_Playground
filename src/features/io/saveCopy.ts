/* ============================================================
   SAVING A COPY OF THE SHEET — the one write path out of the app.

   It was private to `ImportExportMenu`, which was fine while the menu
   was the only place anything was ever saved from. It is not any more:
   the freshness notice offers to replace the sheet with a newer copy
   of the prepared set, and a replace cannot be undone — so it saves a
   copy FIRST, in the same envelope, off the same rev counter, with the
   same file name. Two implementations of that would be two file
   formats a week later.

   THE REV IS BUMPED BY THE ACT OF SAVING, not by the menu that used
   to host it. Whoever saves a copy issues the next revision, and the
   number they get back is the number to print on the toast.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { buildExportPayload } from './exportPayload'

/** REV 07, not REV 7 — every figure in this app is mono and padded. */
export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const kebab = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project'

/** Hand the browser a file. ONE implementation, because there are now
 *  two kinds of file leaving this app — the JSON envelope that is a
 *  backup of the whole sheet, and the `.csv` of one register that a
 *  person opens in Excel — and a second copy of the anchor poke is how
 *  the two would drift into two different revoke timings.
 *
 *  `charset=utf-8` on the CSV is not decoration: it is the second half
 *  of the byte-order mark `@/features/io/csv` writes, and between them
 *  a mail client previewing the attachment shows `5.6m — PVC` rather
 *  than mojibake. */
export function downloadFile(text: string, fileName: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadJson(json: string, fileName: string): void {
  downloadFile(json, fileName, 'application/json')
}

/** One register, as the file Excel opens. */
export function downloadCsv(text: string, fileName: string): void {
  downloadFile(text, fileName, 'text/csv;charset=utf-8')
}

/** Builds the export envelope, bumps REV, triggers the download.
 *  Returns the issued rev number, which is what a toast prints.
 *
 *  The envelope itself is `buildExportPayload`, which lives in its own
 *  module so the round trip can be walked without a DOM — see the
 *  header there for the two importer-refuses-its-own-export bugs that
 *  went unseen while it was private to the menu. */
export function saveCopyOfSheet(includeData: boolean): number {
  const rev = useProjectStore.getState().bumpExportCount()
  const s = useProjectStore.getState()
  downloadJson(
    JSON.stringify(buildExportPayload(rev, includeData), null, 2),
    `${kebab(s.meta.name)}-rev${pad2(rev)}.json`,
  )
  return rev
}

/** What a saved copy of the sheet is called, without saving one —
 *  so a confirm can name the file it is about to write. */
export function nextCopyName(): string {
  const s = useProjectStore.getState()
  return `${kebab(s.meta.name)}-rev${pad2(s.meta.exportCount + 1)}.json`
}
