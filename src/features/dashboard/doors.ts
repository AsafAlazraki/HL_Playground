/* ============================================================
   THE DOORS — the catalogue, entered by kind.

   WHAT THIS IS FOR. PHASE_TWO §2.1 asks the landing for "the
   catalogue, entered by kind: four large photographic doors —
   Boats, Motors, Trailers, Parts — each showing what is in it,
   counted", and §6 phase 5 calls them the cheap half of the
   landing. Nothing in this build drew one: `DEFAULT_CARDS` was
   quotes, activity and modules, and every route into the
   catalogue from the front door went through a BRAND — the
   modules card opens Highfield, or Yamaha, or Stacer. There was
   no way to say "show me the boats".

   ── A DOOR IS A KIND, AND THE KIND IS THE DEALER'S OWN NOUN ──

   DESIGN_PRINCIPLES §1 and PHASE_TWO §1b both say it: boat,
   outboard, trailer and rigging kit are the four nouns the whole
   business is made of, and a person should know which one is in
   front of them from across the room. So a door is a
   `TableKind`, its name is `TABLE_KINDS[kind].label` — never a
   noun typed here, so a motorcycle shop reads its own word — and
   its hue is the kind's hue, which is the one place §1 allows a
   second colour to carry a surface.

   ── WHY A DOOR MUST BE BEHIND EXACTLY ONE MODULE ─────────────

   A door has to OPEN something, and the only navigations this
   feature has are the shell's ten verbs (acts.ts). So a kind
   earns a door when every live place of that kind sits behind
   ONE module: then there is one thing to open and the door is
   not guessing. A kind spread over several modules has no single
   destination, and picking the biggest of them would be the app
   inventing a primary — so it draws no door, exactly as
   `placeFilters` draws no chip for a kind nobody has.

   MEASURED ON THE REAL SET, that rule produces the four the
   document asks for and does not have to be told which four:

     boat       7 places  ▸ Boats module only            → a door
     motor      2 places  ▸ Motors module only           → a door
     trailer    7 places  ▸ Trailers module only         → a door
     accessory  2 places  ▸ Parts & Accessories only     → a door
     package    3 places  ▸ Factory Packages + Dealer Fit → none
     custom     3 places  ▸ Labour + Oils + Registration  → none

   Nothing is lost by the two that draw none: every one of those
   places is a tile on the modules card and a row under the
   modules screen's own kind chips.

   ── NOTHING HERE IS INVENTED ─────────────────────────────────

   The count is `ModuleCensus.items`, summed — the same reader
   the module's own page uses, so a door and the page it opens
   cannot disagree. The row noun is the dealer's own plural when
   the places agree on one and the kind's own plural when they do
   not, which is the rule `moduleCensus` already keeps for the
   same reason. A retired place is not stock and is not behind a
   door at all (`isStockTable`'s rule, said again here).

   AND THE PHOTOGRAPH IS A REAL ROW. It is the first picture a
   row of that kind actually carries, taken in the places' own
   order — never chosen for looks, never a stock image, never
   another kind's boat. A kind whose rows carry no picture gets
   no picture: the door draws the kind's own symbol on the kind's
   own tint instead, which is what `PlaceMark` does with a place
   that has no logo. CONFIGURATOR_PLAYBOOK §8: "the photograph
   the price file already carries is the picture."
   ============================================================ */

import {
  TABLE_KINDS,
  primaryImage,
  type EntityDef,
  type ImageRef,
  type ModuleDef,
  type RowData,
  type TableKind,
} from '@/types/model'
/* BY DIRECT PATH, for the reason CardBody's own imports give:
   `@/features/modules` is the feature's barrel and pulls its whole
   React surface — the workspace, the designer, the access grid —
   back in behind two pure readers. These two modules import the
   model, the store's readers and nothing of React's. */
import { imageFieldOf, kindPlural } from '@/features/modules/read'
import type { Place } from '@/features/modules/places'
/* WHICH PICTURES THE APP ALREADY HOLDS. `seededCopy` answers for
   the repository's own copies and `sourceKind` for a dealer's
   uploads; both are the same verdict every other surface takes,
   so a photograph that is a plate in the catalogue is never a
   broken glyph on the front door. */
import { seededCopy, sourceKind } from '@/lib/imageSources'

/** One door on the landing. */
export interface Door {
  /** the kind it stands for — its React key, its hue and its name */
  kind: TableKind
  /** the kind's own label, as its author wrote it in TABLE_KINDS */
  label: string
  /** the one module every place behind this door belongs to */
  moduleId: string
  /** the table its workspace should stand at, and it is set only
   *  when this kind IS one place. Handed to `rememberPlace`, where
   *  `undefined` means the whole module — which is the point of the
   *  door: the modules card opens a brand, and this opens the lot. */
  tableId: string | undefined
  /** the live tables behind it, in the places' own order */
  tableIds: string[]
  /** how many places — brands, counters, benches — are behind it */
  places: number
  /** live rows across them, counted by each place's own census */
  items: number
  /** the dealer's own plural for one of them: 'variants', 'parts' */
  noun: string
  /** the first photograph a row of this kind actually carries, and
   *  absent when its rows carry none */
  picture?: ImageRef
}

/** The tables one place stands for. A split place is its own table;
 *  a place that IS its module is every live table the module holds. */
function tablesOf(
  place: Place,
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
): string[] {
  if (place.tableId !== undefined) return [place.tableId]
  return (modules[place.moduleId]?.tableIds ?? []).filter((id) => entities[id] !== undefined)
}

/** THE NATURAL SIZE OF A PICTURE, in pixels, or 0 when nothing
 *  recorded one. `ImageRef` carries `w`/`h` when the author knew
 *  them; the repository's own copies carry the ORIGINAL's size
 *  beside them (`northsideImages.ts`), which is what a person means
 *  by how big the photograph is. Neither is guessed. */
function pixels(img: ImageRef): number {
  if (typeof img.w === 'number' && typeof img.h === 'number') return img.w * img.h
  const copy = seededCopy(img.src)
  return copy === null ? 0 : copy.w * copy.h
}

/** THE PICTURE, AND THE TWO RULES THAT PICK IT. Both are
 *  measurements rather than opinions, which is the only kind of
 *  preference this file is allowed to hold.
 *
 *  1 · A PICTURE THE APP ALREADY HOLDS BEATS ONE IT WOULD HAVE TO
 *  FETCH. A repository copy or a dealer's own upload paints from
 *  our own origin with no request, no host verdict and no wait;
 *  the alternative is the front door opening four connections to
 *  four manufacturers' web servers before it has drawn.
 *
 *  2 · THE BIGGEST ONE WINS. Not because a big photograph is
 *  prettier — because the plate is 225px wide and these files run
 *  from 320x230 to 2560x1440, and drawing the 320 there is
 *  upscaling a thumbnail into a showpiece. It is also, measured on
 *  the real set, what separates a manufacturer's hero shot from a
 *  detail crop and a wordmark: taking the FIRST picture in row
 *  order gave the Boats door a grey close-up of a hull fitting and
 *  the Trailers door a 1000x635 REDCO logo, neither of which reads
 *  as what is behind the door from across a counter.
 *
 *  Ties break on the order the rows are in, so the answer is the
 *  same on every paint. A picture whose size nobody recorded
 *  measures 0 and is taken only when it is the only one there is —
 *  never a guess at its size. */
export function doorPicture(
  tableIds: readonly string[],
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ImageRef | undefined {
  let best: ImageRef | undefined
  let bestHeld = false
  let bestSize = -1
  for (const id of tableIds) {
    const entity = entities[id]
    if (!entity) continue
    const field = imageFieldOf(entity)
    if (!field) continue
    for (const row of rowsByEntity[id] ?? []) {
      const img = primaryImage(row.values[field.id] ?? null)
      if (!img || img.src === '') continue
      const held = seededCopy(img.src) !== null || sourceKind(img.src) === 'own'
      if (bestHeld && !held) continue
      const size = pixels(img)
      if (held && !bestHeld) {
        best = img
        bestHeld = true
        bestSize = size
        continue
      }
      if (size > bestSize) {
        best = img
        bestSize = size
      }
    }
  }
  return best
}

/** Every door this project earns, in `TABLE_KINDS`' own order —
 *  the order the modules screen's filter chips already use, so the
 *  two surfaces name the kinds in one sequence.
 *
 *  Pure, and it takes the places rather than reading them, for the
 *  same reason everything in `cards.ts` does. */
export function doorsOf(
  places: readonly Place[],
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): Door[] {
  /* HISTORY IS NOT STOCK. A retired place is drawn on the modules
     card, counted at zero and said to be held; behind a door that
     says what you sell it would be a room with nothing in it. */
  const live = places.filter((p) => !p.retired && p.census.items > 0)

  const byKind = new Map<TableKind, Place[]>()
  for (const p of live) {
    const held = byKind.get(p.kind)
    if (held) held.push(p)
    else byKind.set(p.kind, [p])
  }

  const out: Door[] = []
  for (const kind of Object.keys(TABLE_KINDS) as TableKind[]) {
    const group = byKind.get(kind)
    if (!group || group.length === 0) continue

    /* THE ONE-MODULE RULE, and it is the whole of the header's
       argument in one line: a door with two destinations is not a
       door. */
    const moduleId = group[0].moduleId
    if (group.some((p) => p.moduleId !== moduleId)) continue

    const tableIds: string[] = []
    for (const p of group) {
      for (const id of tablesOf(p, modules, entities)) {
        if (!tableIds.includes(id)) tableIds.push(id)
      }
    }

    /* THE DEALER'S OWN WORD WHERE THEY AGREE ON ONE. Two places
       calling their rows different things are two facts, and
       picking one of them would be a small lie about the other —
       the rule `moduleCensus` states for itself, kept here so the
       door and the page behind it read the same. */
    const nouns = new Set(group.map((p) => p.census.noun))
    const noun = nouns.size === 1 ? [...nouns][0] : kindPlural(kind)

    const picture = doorPicture(tableIds, entities, rowsByEntity)

    out.push({
      kind,
      label: TABLE_KINDS[kind].label,
      moduleId,
      tableId: group.length === 1 ? group[0].tableId : undefined,
      tableIds,
      places: group.length,
      items: group.reduce((n, p) => n + p.census.items, 0),
      noun,
      ...(picture ? { picture } : {}),
    })
  }
  return out
}
