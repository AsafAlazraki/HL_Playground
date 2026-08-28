/* ============================================================
   WHAT EACH CARD IS, AND WHERE ITS FIGURE COMES FROM.

   THE ONE RULE THIS FILE EXISTS TO KEEP: every number on the
   dashboard is COUNTED, here, from the project as it stands at
   paint. Nothing is stored, nothing is cached across a session,
   nothing is estimated and nothing is sampled. If a figure
   cannot be counted it is not shown — there is no placeholder
   number anywhere in this feature and no sparkline over data
   nobody is keeping.

   That is why every function below is pure and takes its inputs
   as arguments: a derivation that reaches for a store is a
   derivation nobody can check. Each one has a test beside it.

   THE SECOND RULE: A CARD WITH NOTHING IN IT SAYS SO, IN A
   SENTENCE, AND OFFERS THE ACT THAT WOULD GIVE IT SOMETHING.
   The `empty` field of `CardMeta` is that sentence, written here
   rather than in the component so the words and the count that
   decides between them cannot drift apart.
   ============================================================ */

import {
  isRetired,
  rowLabel,
  type ConstraintDef,
  type EntityDef,
  type ModuleDef,
  type RowData,
} from '@/types/model'
import type { LintFinding } from '@/lib/lint'
import type { RecentPick } from '@/features/search'
import type { QuoteDef } from '@/features/quote'
import { ACTIVITY_EMPTY } from '@/features/activity'
import type { CardId } from './arrangement'

/* ---------------------------------------------------------- */
/* The catalogue                                              */
/* ---------------------------------------------------------- */

export interface CardMeta {
  /** what it is called on the page and in the tray */
  name: string
  /** one line in the tray: what you get by putting it on */
  says: string
  /** the sentence it draws when it has nothing to show. A
   *  statement of fact, never an apology and never a lecture. */
  empty: string
  /** DOES THIS CARD ASK FOR A SECOND COLUMN?
   *
   *  Exactly one card does, and it is the quotes card, because it
   *  is the only one carrying a filter row AND a list of named
   *  things with money on the right. The rest draw a short list of
   *  a name and a figure, and a wide box around those is a wide
   *  box around nothing.
   *
   *  IT IS ALSO ARITHMETIC. The grid lays four tracks once the
   *  column is wide enough (dashboard.css) and gives a wide card
   *  two of them, so the set a person starts with spends
   *  2 + 1 + 1 = 4 cells — one full row, no hole. `cards.test.ts`
   *  checks the multiple, because a card-shaped gap on the front
   *  door is what this pass was written to remove.
   *
   *  It is a REQUEST, not a guarantee: a card that is currently
   *  empty is given one track, since a 626px rectangle saying
   *  "no quotes have been raised here yet" is the opposite of
   *  what the extra width was for. */
  wide: boolean

  /** DOES THIS CARD ASK FOR TWO ROWS?
   *
   *  Exactly one does — the modules card — and the reason is that
   *  it is the only card holding a LIST OF PLACES rather than a
   *  list of facts. Nine modules at eight rows a card meant an
   *  "All 9 modules" link under a truncated list: the front door
   *  of a business that could not show you the business. Given the
   *  height of two cards it shows every module as a tile and
   *  scrolls the few that overflow, and the link is gone because
   *  there is nothing left for it to reveal.
   *
   *  The quotes card is deliberately NOT tall. It was, and at full
   *  height it drew four quotes and three hundred pixels of
   *  nothing under them. Half the height, and activity takes the
   *  other half — which is the composition the dashboard now is. */
  tall: boolean
}

export const CARDS: Record<CardId, CardMeta> = {
  'my-quotes': {
    name: 'Quotes',
    says: 'Every quote raised here, filtered to drafts, mine or issued.',
    empty: 'No quotes have been raised here yet.',
    wide: false,
    tall: false,
  },
  'activity': {
    name: 'Activity',
    says: 'What changed anywhere in the business, and who changed it.',
    empty: ACTIVITY_EMPTY,
    wide: false,
    tall: false,
  },
  'my-modules': {
    name: 'My modules',
    says: 'Every place in the business, as a tile, in your own order.',
    empty: 'No modules yet. A module is a place in the business — a brand, a workshop, a counter.',
    wide: false,
    tall: true,
  },
  'the-price-file': {
    name: 'The price file',
    says: 'What you sell, counted, and the biggest tables it is held in.',
    empty: 'No tables yet. The price file is what everything else is built on.',
    wide: false,
    tall: false,
  },
  'recently-opened': {
    name: 'Where I have been',
    says: 'The tables and rows you opened last.',
    empty: 'Nothing opened yet. What you open shows up here.',
    wide: false,
    tall: false,
  },
  'data-quality': {
    name: 'Worth fixing',
    says: 'What the reviewer found in your tables that is still outstanding.',
    empty: 'Nothing outstanding. Every table reads the way it should.',
    wide: false,
    tall: false,
  },
  'rules-warning': {
    name: 'Rules that warn',
    says: 'Rules that annotate rather than remove — the ones worth reading.',
    empty: 'No rule is set to warn. Every rule here removes what it disagrees with.',
    wide: false,
    tall: false,
  },
}

/* ---------------------------------------------------------- */
/* The one quotes card, and the filters inside it             */
/* ---------------------------------------------------------- */

/** THE FOUR QUESTIONS THAT WERE THREE CARDS.
 *
 *  "My quotes", "Quotes by state" and "Where I have been" drew
 *  three boxes; two of them were a heading over a number that
 *  the third could have carried as a filter. These are that
 *  filter. Each is a predicate over the SAME list, so the counts
 *  beside them and the rows under them can never disagree —
 *  which is the fault three cards had structurally. */
export type QuoteLens = 'drafts' | 'mine' | 'issued' | 'all'

/** DRAFTS FIRST, and that is the order on screen as well as in
 *  this array. A resumable draft is the most valuable thing on
 *  the dashboard and it was four levels down. */
export const QUOTE_LENSES: readonly QuoteLens[] = ['drafts', 'mine', 'issued', 'all']

export const LENS_NAME: Record<QuoteLens, string> = {
  drafts: 'Drafts',
  mine: 'Mine',
  issued: 'Issued',
  all: 'All',
}

/** WHAT A FILTER THAT HOLDS NOTHING SAYS, WRITTEN OUT RATHER THAN
 *  ASSEMBLED. The first version built the sentence from the chip's
 *  own name — `"is a " + LENS_NAME[lens].toLowerCase()` — which
 *  reads "is a draft" and then "is a issued" and "is a mine". A
 *  sentence a person reads is not a template with a noun slot, and
 *  the four cases are four different facts in any event: there ARE
 *  quotes here, and this is what is true of them. */
export const LENS_NONE: Record<QuoteLens, string> = {
  drafts: 'Every quote here has been issued.',
  mine: 'None of these was prepared by you.',
  issued: 'Nothing here has been issued yet.',
  all: 'No quotes have been raised here yet.',
}

/** `preparedBy` is a NAME, frozen onto the document when it was
 *  raised, and it is matched case-insensitively and trimmed and
 *  on nothing else — the same rule `rollQuotes` keeps, said once
 *  here so the filter and the count cannot drift. */
const mineIs = (q: QuoteDef, me: string): boolean => {
  const m = me.trim().toLowerCase()
  return m !== '' && (q.preparedBy ?? '').trim().toLowerCase() === m
}

export function lensHolds(q: QuoteDef, lens: QuoteLens, me: string): boolean {
  if (lens === 'drafts') return q.state !== 'issued'
  if (lens === 'issued') return q.state === 'issued'
  if (lens === 'mine') return mineIs(q, me)
  return true
}

/** How many are under each filter. Counted over every quote in
 *  this browser, because the chips sit on one card and a chip
 *  that counted a different set from its neighbour is the fault
 *  the three cards had. */
export function countLenses(
  quotes: readonly QuoteDef[],
  me: string,
): Record<QuoteLens, number> {
  const out: Record<QuoteLens, number> = { drafts: 0, mine: 0, issued: 0, all: 0 }
  for (const q of quotes) {
    out.all += 1
    if (q.state === 'issued') out.issued += 1
    else out.drafts += 1
    if (mineIs(q, me)) out.mine += 1
  }
  return out
}

/** The quotes under one filter, newest first. Ties break on id so
 *  the order is stable between paints rather than depending on
 *  whatever order the registry handed them over in. */
export function quotesUnder(
  quotes: readonly QuoteDef[],
  lens: QuoteLens,
  me: string,
): QuoteDef[] {
  return quotes
    .filter((q) => lensHolds(q, lens, me))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
}

export interface CustomerBand {
  /** the name frozen onto the document, or '' when the quote was
   *  never addressed — a walk-in is not a filing error */
  name: string
  quotes: QuoteDef[]
}

/** THE SAME LIST, GATHERED UNDER WHO IT IS FOR. Grouped on
 *  `customer.name` — the name FROZEN onto the document, never
 *  resolved through `customerRef`, because a quote is a
 *  photograph and this must read the same in a project where
 *  that register never existed.
 *
 *  Bands come back in the order of their newest quote, so the
 *  customer somebody is working on today is at the top. */
export function byCustomer(quotes: readonly QuoteDef[]): CustomerBand[] {
  const bands = new Map<string, QuoteDef[]>()
  for (const q of quotes) {
    const name = q.customer.name.trim()
    const held = bands.get(name)
    if (held) held.push(q)
    else bands.set(name, [q])
  }
  return [...bands.entries()].map(([name, list]) => ({ name, quotes: list }))
}

/* ---------------------------------------------------------- */
/* My quotes, and quotes by state                             */
/* ---------------------------------------------------------- */

export interface QuoteRoll {
  /** every quote this person prepared, newest first */
  mine: QuoteDef[]
  /** counted over EVERY quote in this browser, not only mine —
   *  "how is the yard doing" is a different question from "what
   *  have I done", and the card that asks it says which it means */
  drafts: number
  issued: number
  total: number
  /** THE HONEST MIDDLE CASE, and the reason this is one function
   *  rather than two. There are quotes, and none of them is
   *  yours: a card that draws its empty sentence there would be
   *  telling somebody the yard has quoted nothing. */
  othersOnly: boolean
}

/** `preparedBy` is a NAME, frozen onto the document when it was
 *  raised (features/quote/types.ts) — the same name that prints
 *  on the copy a customer is handed. It is matched
 *  case-insensitively and trimmed, and on nothing else: an email
 *  is not on the quote, and guessing at initials would put
 *  another person's deal on your dashboard. */
export function rollQuotes(quotes: readonly QuoteDef[], preparedBy: string): QuoteRoll {
  const me = preparedBy.trim().toLowerCase()
  const mine: QuoteDef[] = []
  let drafts = 0
  let issued = 0
  for (const q of quotes) {
    if (q.state === 'issued') issued += 1
    else drafts += 1
    if (me !== '' && (q.preparedBy ?? '').trim().toLowerCase() === me) mine.push(q)
  }
  mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return {
    mine,
    drafts,
    issued,
    total: quotes.length,
    othersOnly: mine.length === 0 && quotes.length > 0,
  }
}

/* ---------------------------------------------------------- */
/* Where I have been                                          */
/* ---------------------------------------------------------- */

export interface ResolvedRecent {
  /** stable across a re-resolve, so a list does not re-key */
  key: string
  entityId: string
  /** the row's own label when a row was picked, else the table's name */
  title: string
  /** the table's name, when the title above is a row's */
  under: string
}

/** RESOLVED AT PAINT, NEVER TRUSTED — the same discipline
 *  `recent.ts` states for itself. A remembered id is a guess
 *  about a project that has gone on changing: tables are struck,
 *  rows are deleted, whole files are replaced from Import. A pick
 *  whose subject is gone is DROPPED rather than drawn, because a
 *  recall list that offers something no longer there is a list
 *  that has stopped being worth pressing. */
export function resolveRecent(
  picks: readonly RecentPick[],
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ResolvedRecent[] {
  const out: ResolvedRecent[] = []
  for (const p of picks) {
    const entity = entities[p.entityId]
    if (!entity) continue
    if (p.rowId === undefined) {
      out.push({
        key: p.entityId,
        entityId: p.entityId,
        title: entity.name,
        under: '',
      })
      continue
    }
    const row = rowsByEntity[p.entityId]?.find((r) => r.id === p.rowId)
    if (!row) continue
    out.push({
      key: `${p.entityId}:${p.rowId}`,
      entityId: p.entityId,
      title: rowLabel(entity, row),
      under: entity.name,
    })
  }
  return out
}

/* ---------------------------------------------------------- */
/* The price file                                             */
/* ---------------------------------------------------------- */

/** A table a person SELLS FROM: not a join, which records pairs
 *  rather than stock, and not retired, which is history rather
 *  than stock (see `isRetired` and DISCONTINUED_FIELD). */
export const isStockTable = (e: EntityDef): boolean => e.role !== 'join' && !isRetired(e)

export interface FileTally {
  tables: number
  rows: number
  /** joins, counted separately because they are a different fact
   *  and folding them in would inflate "what you sell" with pairs */
  relationships: number
}

export function fileTally(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): FileTally {
  let tables = 0
  let rows = 0
  let relationships = 0
  for (const e of Object.values(entities)) {
    if (isRetired(e)) continue
    if (e.role === 'join') {
      relationships += 1
      continue
    }
    tables += 1
    rows += rowsByEntity[e.id]?.length ?? 0
  }
  return { tables, rows, relationships }
}

export interface TableRow {
  entity: EntityDef
  rows: number
}

/** The biggest stock tables, largest first. Ties break on name so
 *  the order is stable between paints rather than depending on
 *  whatever order the store happened to hand them over in. */
export function biggestTables(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  limit: number,
): TableRow[] {
  return Object.values(entities)
    .filter(isStockTable)
    .map((entity) => ({ entity, rows: rowsByEntity[entity.id]?.length ?? 0 }))
    .sort((a, b) => b.rows - a.rows || a.entity.name.localeCompare(b.entity.name))
    .slice(0, Math.max(0, limit))
}

/* ---------------------------------------------------------- */
/* My modules                                                 */
/* ---------------------------------------------------------- */

export interface ModuleRow {
  module: ModuleDef
  /** the primary table's name, or '' when it is no longer there */
  master: string
  /** rows across every table the module names — what is actually
   *  in this place in the business */
  rows: number
}

/** In the order the dealer put them in (`ModuleDef.order`), which
 *  is the same order the module dashboard draws. A module whose
 *  primary table has been struck still lists — it is a place they
 *  made, and hiding it would be the app deciding to forget
 *  something on their behalf — but it says nothing it cannot
 *  count. */
export function moduleRows(
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ModuleRow[] {
  return Object.values(modules)
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((module) => {
      let rows = 0
      for (const id of module.tableIds) rows += rowsByEntity[id]?.length ?? 0
      return {
        module,
        master: entities[module.tableIds[0] ?? '']?.name ?? '',
        rows,
      }
    })
}

/** HOW MANY QUOTES HAVE BEEN RAISED AGAINST EACH PLACE.
 *
 *  Keyed by the place's own key, so the caller does a lookup rather
 *  than a scan per tile: twenty-five tiles each filtering the whole
 *  quote list is twenty-five passes over the same array on every
 *  render, and the dashboard redraws on every note.
 *
 *  A QUOTE POINTS AT A TABLE, NOT AT A MODULE. `rootTableId` is
 *  the table the subject was configured from, which is exactly
 *  what a place is when a module holds several — so Highfield's
 *  count is Highfield's, not Boats'. Where a module is ONE place,
 *  the place stands for every table the module holds and the
 *  counts of those tables add up.
 *
 *  Pure, and it takes the places rather than reading them, for the
 *  same reason everything else in this file does. */
export function quotesPerPlace(
  places: readonly { key: string; moduleId: string; tableId: string | undefined }[],
  modules: Record<string, ModuleDef>,
  quotes: readonly QuoteDef[],
): Record<string, number> {
  const byTable: Record<string, number> = {}
  for (const q of quotes) byTable[q.rootTableId] = (byTable[q.rootTableId] ?? 0) + 1

  const out: Record<string, number> = {}
  for (const p of places) {
    if (p.tableId !== undefined) {
      out[p.key] = byTable[p.tableId] ?? 0
      continue
    }
    let n = 0
    for (const id of modules[p.moduleId]?.tableIds ?? []) n += byTable[id] ?? 0
    out[p.key] = n
  }
  return out
}

/* ---------------------------------------------------------- */
/* Worth fixing                                               */
/* ---------------------------------------------------------- */

export interface FindingRoll {
  blockers: number
  advisories: number
  /** the few a card can show, blockers first — a card is a
   *  glance, and the reviewer is where the whole list lives */
  head: LintFinding[]
}

export function rollFindings(findings: readonly LintFinding[], head: number): FindingRoll {
  let blockers = 0
  let advisories = 0
  for (const f of findings) {
    if (f.severity === 'blocker') blockers += 1
    else advisories += 1
  }
  const ranked = [...findings].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'blocker' ? -1 : 1
    return a.id.localeCompare(b.id)
  })
  return { blockers, advisories, head: ranked.slice(0, Math.max(0, head)) }
}

/* ---------------------------------------------------------- */
/* Rules that warn                                            */
/* ---------------------------------------------------------- */

export interface RuleRoll {
  /** enabled rules that ANNOTATE rather than prune. `severity`
   *  absent means 'block' — that is the contract's own default,
   *  written for the rules authored before the field existed. */
  warning: ConstraintDef[]
  /** every rule that is switched on, so the count above has
   *  something to be a share of */
  enabled: number
}

export function rollRules(constraints: readonly ConstraintDef[]): RuleRoll {
  const warning: ConstraintDef[] = []
  let enabled = 0
  for (const c of constraints) {
    if (!c.enabled) continue
    enabled += 1
    if (c.severity === 'warn') warning.push(c)
  }
  warning.sort((a, b) => a.because.localeCompare(b.because))
  return { warning, enabled }
}

/* ---------------------------------------------------------- */
/* Words                                                      */
/* ---------------------------------------------------------- */

/** "1 quote" · "12 quotes". Written once because six surfaces on
 *  this page count something, and "1 quotes" is the kind of
 *  detail that makes a tool feel unfinished. */
export const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

/** THE TIME OF DAY, WHICH IS A FACT AND NOT A GUESS. Read off
 *  the clock the person is sitting in front of. The bands are the
 *  ordinary English ones; nothing about this is computed from
 *  their data. */
export function greeting(at: Date): string {
  const h = at.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** The first word of a name — what a person is called across a
 *  counter. Falls back to the whole thing rather than to nothing:
 *  a single-word name is a name. */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name
