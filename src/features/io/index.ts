export { ImportExportMenu } from './ImportExportMenu'
export type { ImportExportMenuProps } from './ImportExportMenu'
/* "is this copy of the example the current one?" — see Freshness.tsx */
export { Freshness } from './Freshness'
export type { FreshnessProps } from './Freshness'
export { loadSampleProject, buildSampleProject } from './sample'
/* A FILE A PERSON PICKED → AN ENVELOPE, OR A REASON WHY NOT. Exported
   because onboarding carries an import of its own: after CLEAR SHEET
   the menu above is unreachable, and "start from a file I already
   have" is a first-run answer. Both doors must refuse in the same
   words — see readEnvelope.ts. */
export { readEnvelopeFile, summariseEnvelope } from './readEnvelope'
export type { EnvelopeRead, EnvelopeSummary } from './readEnvelope'
/* the one write path out of the app, so anything that is about to
   replace the sheet can save a copy of it first */
export { saveCopyOfSheet, nextCopyName, pad2 } from './saveCopy'
export { sheetNow, sheetFacts, quotesSurviveSentence } from './sheetNow'
export type { SheetNow } from './sheetNow'
/* A BLOCK OF SPREADSHEET CELLS → A MERGE, WITH THE COLUMNS MAPPED
   BY HAND — UX_PASS §3's four steps. The surface is published to the
   register's action bar by `useTableRoundTrip` above, beside the two
   file controls it belongs with; these are the pure half, exported so
   anything that ever needs to read a pasted block reads it the one
   way. */
export { PasteRows } from './PasteRows'
export type { PasteRowsProps } from './PasteRows'
export {
  applyPaste,
  describePaste,
  planPaste,
  proposeMapping,
  readColumns,
  readPastedBlock,
} from './pasteBlock'
export type { MapTo, PastePlan, PasteResult, PastedBlock } from './pasteBlock'
export { applyReplace, applyMerge } from './apply'
/* any loader that calls replaceProject must wrap itself in this, or the
   organisation is lost and the app falls back to onboarding */
export { keepingOrganisation } from './apply'
