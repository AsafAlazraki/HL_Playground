/* ============================================================
   WHAT IS ON THE SHEET RIGHT NOW, COUNTED.

   Three surfaces are about to destroy it — REPLACE, CLEAR SHEET, and
   the freshness notice's offer to load a newer copy of the prepared
   set — and the design contract says a confirm states its blast
   radius COMPUTED. The wording it replaces was written unconditional:
   "Every table and row on the sheet now will be overwritten", printed
   at a person whose sheet was empty and had nothing to overwrite.

   COUNTED HERE, ONCE, so the three of them cannot disagree about how
   much is at stake. Configurator vocabulary throughout — TABLES,
   COLUMNS, ROWS, never entity, schema, field or zone-as-jargon.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { allQuotes } from '@/features/quote'

export interface SheetNow {
  tables: number
  rows: number
  rules: number
  zones: number
  modules: number
  pages: number
  /** THE ONE THING IN HERE THAT DOES NOT GO. Counted anyway, because a
   *  confirm that lists what it destroys and says nothing about the
   *  documents a dealer has given to customers is an incomplete
   *  sentence — and afterwards the dock still shows the count, which a
   *  person is entitled to have been told about first. */
  quotes: number
  /** nothing is on it, so nothing can be lost and nothing is asked */
  blank: boolean
}

export function sheetNow(): SheetNow {
  const s = useProjectStore.getState()
  const tables = Object.keys(s.entities).length
  return {
    tables,
    rows: Object.values(s.rowsByEntity).reduce((n, l) => n + l.length, 0),
    rules: Object.keys(s.rules).length,
    zones: Object.keys(s.groups).length,
    modules: Object.keys(s.modules).length,
    pages: Object.keys(s.views).length,
    quotes: allQuotes().length,
    blank: tables === 0,
  }
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** The blast radius as a list of counted phrases, longest-lived thing
 *  first. Anything that is zero is left out rather than printed as a
 *  nought — "0 rules" is noise in a sentence about what is at stake.
 *
 *  QUOTES ARE NOT IN THIS LIST, and that is deliberate rather than an
 *  omission: this list is what GOES, and they do not. They get their
 *  own sentence — see `quotesSurviveSentence`. */
export function sheetFacts(now: SheetNow): string[] {
  const facts: string[] = [plural(now.tables, 'table', 'tables')]
  if (now.rows > 0) facts.push(plural(now.rows, 'row', 'rows'))
  if (now.modules > 0) facts.push(plural(now.modules, 'module', 'modules'))
  if (now.pages > 0) facts.push(plural(now.pages, 'page', 'pages'))
  if (now.rules > 0) facts.push(plural(now.rules, 'rule', 'rules'))
  if (now.zones > 0) facts.push(plural(now.zones, 'zone', 'zones'))
  return facts
}

/* ============================================================
   WHAT HAPPENS TO THE QUOTES — decided here, said out loud.

   THEY SURVIVE. A quote is a photograph of what was offered on a day:
   every field on every line is a value, nothing on it reads the sheet,
   and it exists to answer "what did we quote them?" a month later. Two
   consequences of clearing them are unacceptable and one is merely
   inconvenient, which is what settles it — a dealer who clears the
   sheet to restore a backup would destroy every document they have
   given a customer, and an issued quote is already the one thing this
   feature refuses to delete at all (`discardDraft` takes drafts only).
   So a Clear leaves them alone, a Replace leaves them alone, and both
   confirms say so instead of leaving a person to discover a count on
   the dock beside an empty sheet and conclude the app is confused.

   THE COUNT IS THE POINT OF THE SENTENCE. "Your quotes stay" with no
   number is a promise; "Your 3 quotes stay" is a fact they can check
   against the dock a second later.
   ============================================================ */

/** What becomes of the quotes, or '' when there are none to say
 *  anything about. Both destructive confirms print it. */
export function quotesSurviveSentence(now: SheetNow): string {
  if (now.quotes === 0) return ''
  const what = now.quotes === 1 ? 'quote stays' : 'quotes stay'
  return `Your ${now.quotes} ${what}. A quote is a photograph of what was offered on the day, so it does not need the sheet — you can still open and print every one.`
}
