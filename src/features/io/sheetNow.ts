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

export interface SheetNow {
  tables: number
  rows: number
  rules: number
  zones: number
  modules: number
  pages: number
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
    blank: tables === 0,
  }
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** The blast radius as a list of counted phrases, longest-lived thing
 *  first. Anything that is zero is left out rather than printed as a
 *  nought — "0 rules" is noise in a sentence about what is at stake. */
export function sheetFacts(now: SheetNow): string[] {
  const facts: string[] = [plural(now.tables, 'table', 'tables')]
  if (now.rows > 0) facts.push(plural(now.rows, 'row', 'rows'))
  if (now.modules > 0) facts.push(plural(now.modules, 'module', 'modules'))
  if (now.pages > 0) facts.push(plural(now.pages, 'page', 'pages'))
  if (now.rules > 0) facts.push(plural(now.rules, 'rule', 'rules'))
  if (now.zones > 0) facts.push(plural(now.zones, 'zone', 'zones'))
  return facts
}
