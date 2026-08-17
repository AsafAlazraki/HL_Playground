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
export { applyReplace, applyMerge } from './apply'
/* any loader that calls replaceProject must wrap itself in this, or the
   organisation is lost and the app falls back to onboarding */
export { keepingOrganisation } from './apply'
