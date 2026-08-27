/* ============================================================
   THE FAST ACTIONS — where a button goes, and what it is called.

   A quick link stores a TARGET and, when the person renamed it,
   a NAME. It stores no label, no icon and no count, because all
   three are facts about the project and the project changes: a
   table renamed on Tuesday must not leave Monday's button
   calling it by the old name.

   SO EVERY LINK IS RESOLVED AT PAINT AND NEVER TRUSTED. A link
   naming a table that has been struck, or a module deleted, or a
   subject that never arrived because a whole project was replaced
   from Import, resolves to NOTHING and is not drawn. The
   alternative is a button that opens an empty rectangle, which
   teaches a person that the buttons on this page are decoration.

   AND A LINK THAT CANNOT RESOLVE IS NOT SILENTLY DELETED. It
   stays in the arrangement — the person put it there, and a
   project can come back — it simply is not drawn while its
   subject is missing. `strandedLinks` is what lets the arrange
   tray say so in words instead of the button just being gone.
   ============================================================ */

import type { EntityDef, ModuleDef } from '@/types/model'
import type { Arrangement, LinkTarget, QuickLink } from './arrangement'
import { PLAIN_LINK_KINDS, hasLinkTo } from './arrangement'

/** Which mark a link draws. A string rather than a component so
 *  this file stays free of React and can be tested as arithmetic;
 *  `QuickLinks.tsx` owns the mapping to a glyph. */
export type LinkMark =
  | 'quote'
  | 'find'
  | 'quotes'
  | 'customers'
  | 'rules'
  | 'drawing'
  | 'modules'
  | 'table'
  | 'module'

export interface ResolvedLink {
  id: string
  target: LinkTarget
  /** what the button says — the person's own word for it when
   *  they gave it one, and the subject's own name otherwise */
  label: string
  /** the second line: what kind of place this is, or how much is
   *  in it. Empty when there is nothing true to add. */
  note: string
  /** IS THE NOTE A COUNTED FACT, OR IS IT THE APP TALKING?
   *
   *  "588 rows" is a fact about the button's subject and changes
   *  when the sheet does. "Pick what you are selling" is the app
   *  explaining a button that already says New quote — twelve
   *  such words sat permanently on the front door across three
   *  buttons. The resting row draws the note only when this is
   *  true; the arrange tray still shows every subject, because
   *  there the second line is what you are renaming. */
  counted: boolean
  mark: LinkMark
  /** true when the label came from the person rather than the
   *  project — the arrange tray shows the original underneath */
  renamed: boolean
  /** the subject's own name, whatever the button is called */
  subject: string
}

/** The seven places the app has one of. Their words are the
 *  rail's words, deliberately: two names for one door is how a
 *  person learns an app has two doors. */
const PLAIN: Record<string, { label: string; note: string; mark: LinkMark }> = {
  'new-quote': { label: 'New quote', note: 'Pick what you are selling', mark: 'quote' },
  find: { label: 'Find anything', note: 'Any row, any table', mark: 'find' },
  quotes: { label: 'Quotes', note: 'Everything raised here', mark: 'quotes' },
  customers: { label: 'Customers', note: 'The register', mark: 'customers' },
  rules: { label: 'Business rules', note: 'What must always be true', mark: 'rules' },
  'data-model': { label: 'Data model', note: 'The drawing', mark: 'drawing' },
  modules: { label: 'Modules', note: 'The places in the business', mark: 'modules' },
}

const rowWord = (n: number): string => `${n.toLocaleString()} ${n === 1 ? 'row' : 'rows'}`

/** One link against the project as it stands, or null when its
 *  subject is no longer there. */
export function resolveLink(
  link: QuickLink,
  entities: Record<string, EntityDef>,
  modules: Record<string, ModuleDef>,
  rowCount: (entityId: string) => number,
): ResolvedLink | null {
  const named = link.name?.trim() ?? ''

  if (link.target.kind === 'table') {
    const entity = entities[link.target.entityId]
    if (!entity) return null
    return {
      id: link.id,
      target: link.target,
      label: named || entity.name,
      note: rowWord(rowCount(entity.id)),
      counted: true,
      mark: 'table',
      renamed: named !== '' && named !== entity.name,
      subject: entity.name,
    }
  }

  if (link.target.kind === 'module') {
    const module = modules[link.target.moduleId]
    if (!module) return null
    /* the module's own one-line description is the admin's words
       — never derived, never substring-matched off the name */
    return {
      id: link.id,
      target: link.target,
      label: named || module.name,
      note: module.description.trim(),
      counted: false,
      mark: 'module',
      renamed: named !== '' && named !== module.name,
      subject: module.name,
    }
  }

  const plain = PLAIN[link.target.kind]
  if (!plain) return null
  return {
    id: link.id,
    target: link.target,
    label: named || plain.label,
    note: plain.note,
    counted: false,
    mark: plain.mark,
    renamed: named !== '' && named !== plain.label,
    subject: plain.label,
  }
}

export interface ResolvedLinks {
  /** in the person's order, drawable */
  live: ResolvedLink[]
  /** the ones whose subject is missing, in the person's order.
   *  Not drawn as buttons; named in the arrange tray so a person
   *  can see why a button they placed is not on the page. */
  stranded: QuickLink[]
}

export function resolveLinks(
  links: readonly QuickLink[],
  entities: Record<string, EntityDef>,
  modules: Record<string, ModuleDef>,
  rowCount: (entityId: string) => number,
): ResolvedLinks {
  const live: ResolvedLink[] = []
  const stranded: QuickLink[] = []
  for (const link of links) {
    const got = resolveLink(link, entities, modules, rowCount)
    if (got) live.push(got)
    else stranded.push(link)
  }
  return { live, stranded }
}

/* ---------------------------------------------------------- */
/* What the tray can offer                                    */
/* ---------------------------------------------------------- */

export interface LinkOffer {
  target: LinkTarget
  label: string
  /** the group it is offered under: the app's own places, this
   *  dealer's tables, or this dealer's modules */
  band: 'places' | 'tables' | 'modules'
  mark: LinkMark
}

/** EVERYTHING THAT REALLY EXISTS AND IS NOT ALREADY A BUTTON.
 *  Nothing is invented: the tables are the dealer's tables, the
 *  modules are the modules they made, and the seven places are
 *  the seven doors the rail already has. */
export function linkOffers(
  a: Arrangement,
  entities: Record<string, EntityDef>,
  modules: Record<string, ModuleDef>,
): LinkOffer[] {
  const out: LinkOffer[] = []

  for (const kind of PLAIN_LINK_KINDS) {
    const target = { kind } as LinkTarget
    if (hasLinkTo(a, target)) continue
    const plain = PLAIN[kind]
    if (!plain) continue
    out.push({ target, label: plain.label, band: 'places', mark: plain.mark })
  }

  const tables = Object.values(entities)
    .filter((e) => e.role !== 'join' && e.retired !== true)
    .sort((x, y) => x.name.localeCompare(y.name))
  for (const e of tables) {
    const target: LinkTarget = { kind: 'table', entityId: e.id }
    if (hasLinkTo(a, target)) continue
    out.push({ target, label: e.name, band: 'tables', mark: 'table' })
  }

  const places = Object.values(modules).sort(
    (x, y) => x.order - y.order || x.name.localeCompare(y.name),
  )
  for (const m of places) {
    const target: LinkTarget = { kind: 'module', moduleId: m.id }
    if (hasLinkTo(a, target)) continue
    out.push({ target, label: m.name, band: 'modules', mark: 'module' })
  }

  return out
}

export const BAND_NAME: Record<LinkOffer['band'], string> = {
  places: 'Places in the app',
  tables: 'Your tables',
  modules: 'Your modules',
}
