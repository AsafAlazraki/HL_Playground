/* ============================================================
   A FILE A PERSON PICKED → AN ENVELOPE, OR A REASON WHY NOT.

   The three failures before `validateEnvelope` ever gets a look — the
   wrong extension, a file the browser will not hand over, text that is
   not JSON — used to live inside `ImportExportMenu`. There is now a
   second door into the app that has to answer them identically: after
   CLEAR SHEET the menu is unreachable, so ONBOARDING carries an import
   too, and "start from a file I already have" must fail with the same
   sentence in both places or the two doors are two apps.

   THE REFUSAL IS THE FEATURE. Every branch here returns a reason a
   person can act on, in the vocabulary the io surfaces are written in.
   Nothing throws, nothing is logged and dropped.
   ============================================================ */

import { validateEnvelope, type ProjectFile } from './envelope'

export type EnvelopeRead =
  | { ok: true; data: ProjectFile; fileName: string }
  | { ok: false; error: string }

export async function readEnvelopeFile(file: File): Promise<EnvelopeRead> {
  if (!/\.json$/i.test(file.name)) return { ok: false, error: 'EXPECTED A .JSON FILE' }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: 'FILE COULD NOT BE READ' }
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'FILE IS NOT VALID JSON' }
  }

  const res = validateEnvelope(raw)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, data: res.data, fileName: file.name }
}

/** What a validated file holds, counted, for a preview plate. The two
 *  surfaces that show one must agree about the figures. */
export interface EnvelopeSummary {
  name: string
  rev: number
  tables: number
  columns: number
  rows: number
  modules: number
  pages: number
  rules: number
  /** the documents in the file. A person about to press Replace is
   *  entitled to know the file is carrying quotes, because they are the
   *  one thing in it that was handed to a customer. */
  quotes: number
}

export function summariseEnvelope(data: ProjectFile): EnvelopeSummary {
  return {
    name: data.project.name,
    rev: data.project.rev,
    tables: data.entities.length,
    columns: data.entities.reduce((n, e) => n + e.fields.length, 0),
    rows: data.rows ? Object.values(data.rows).reduce((n, l) => n + l.length, 0) : 0,
    modules: data.modules?.length ?? 0,
    pages: data.views?.length ?? 0,
    rules: data.constraints?.length ?? 0,
    quotes: data.quotes?.length ?? 0,
  }
}
