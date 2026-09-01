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

   AND IT IS A SENTENCE NOW, NOT A STAMP. These three read
   `EXPECTED A .JSON FILE`, `FILE COULD NOT BE READ` and `FILE IS NOT
   VALID JSON` — literal capitals, which no `text-transform` pass
   could have caught — while both stylesheets that print them carry a
   paragraph each saying the reason "stopped shouting" and is "set as
   a sentence in full ink". Only the CSS had stopped. The first of
   the three also said what was expected without saying what to DO
   about it, which §6 asks of a refusal: it names the file the person
   actually picked and points at the door that reads THAT kind of
   file, which exists — New table reads a CSV.
   ============================================================ */

import { validateEnvelope, type ProjectFile } from './envelope'

export type EnvelopeRead =
  | { ok: true; data: ProjectFile; fileName: string }
  | { ok: false; error: string }

/** The extensions a dealer actually drops on a door marked "open a
 *  saved copy" when what they have is their price list. Naming them is
 *  what turns "expected a .json file" into an instruction. `.txt` is in
 *  the list because a tab-separated export very often arrives as one. */
const SPREADSHEET = /\.(csv|tsv|txt|xls|xlsx|xlsm|ods|numbers)$/i

export async function readEnvelopeFile(file: File): Promise<EnvelopeRead> {
  /* THE THREE REFUSALS SAY WHY, AND THE FIRST ONE SAYS WHERE TO GO
     INSTEAD. "EXPECTED A .JSON FILE" was true, shouted, and no help to
     the one person most likely to read it: somebody who has their stock
     in a spreadsheet and dropped it on the first door that mentioned
     files. A CSV IS THE LIKELY WRONG ANSWER, and it is a wrong answer
     with a right door: `New table ▸ Read a CSV` reads a spreadsheet's
     own columns, argues a type for every one of them and shows the
     argument before anything is created. Saying so here is the
     difference between a refusal and a dead end — a refusal that does
     not name the other door leaves them stuck at a rejection notice.
     Sentence case, because a refusal is a sentence and capitals are a
     label style (DESIGN_PRINCIPLES §2). */
  if (!/\.json$/i.test(file.name)) {
    return {
      ok: false,
      error: SPREADSHEET.test(file.name)
        ? `${file.name} is a spreadsheet, and this door takes a saved copy of a whole sheet (.json). To bring a spreadsheet in as one table, use New table and choose Read a CSV — it reads the columns, says what it made of each one and lets you correct it before a table exists.`
        : `${file.name} is not a .json file. A saved copy is the .json this app writes when you use Save a copy — the whole sheet in one file.`,
    }
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    return {
      ok: false,
      error: `The browser would not hand over ${file.name}. If it is on a drive that is not mounted, or still downloading, try choosing it again once it is on this machine.`,
    }
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: `${file.name} is not readable as JSON, so something has changed it since it was saved. It has the right name but the text inside it is broken — most often a file that was edited by hand, or a download that stopped early. Try the copy it was made from.`,
    }
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
