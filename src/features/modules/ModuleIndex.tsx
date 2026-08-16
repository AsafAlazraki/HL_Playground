/* ============================================================
   THE INDEX — the catalogue, and the one genuinely new drawing
   in the module system.

   WHAT IT IS. Every row of every table a module points at, cut
   into sections by TABLE and then into groups by that table's own
   `hierarchy`. Brand first, because the tables are per-brand: a
   salesperson sees HIGHFIELD ▸ Sport ▸ SP460 and STACER ▸ Open
   Boats in one place, and each brand keeps its own columns.

   WHY IT DID NOT EXIST. `ViewPage` requires a rowId — it answers
   "for THIS thing, what goes with it?" — and the closest thing to
   a list in the app is the view stage's capped row rail. With 21
   tables and 651 rows loaded, you could not ask the app for a boat
   by name. This is the screen that answers.

   THE THREE REFUSALS BUILT INTO IT.

   1. NO PRICE IS INVENTED. The price column is resolved in
      `read.ts` through the quote feature's own ladder, and a table
      that declares nothing prints nothing. A blank tile face is a
      table that needs a price column, and it says so by being
      blank rather than by showing a zero.

   2. NO COST REACHES IT. `priceReadOf` refuses cost and margin
      bands twice over. This screen is the one a customer reads
      over a shoulder.

   3. NO PICTURE IS FAKED. A row with no picture, or a picture on a
      host the browser cannot fetch, draws the row's name on plain
      paper — never a hatched rectangle, never a filename. The
      verdict is `@/lib/imageSources`', shared with the table cell
      and the view page, so a picture that is a plate in the grid
      is never a broken glyph here.

   IT MUST STAY SMOOTH AT 651 ROWS. The entry list is built once
   per data change, the price and picture columns are resolved once
   per table, and the drawing is capped at `INDEX_CAP` with the
   remainder stated in words — the same discipline, and the same
   sentence shape, as the view stage's rail.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  MODULE_CAPABILITIES,
  type ImageRef,
  type ModuleCapability,
  type ModuleDef,
} from '@/types/model'
import { TableKindSymbol } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import {
  buildEntries,
  groupEntries,
  moduleTables,
  type IndexEntry,
  type IndexSection,
} from './read'
import './modules.css'

/** How many items are drawn before the page asks you to narrow.
 *  240 is two full screens of tiles at any sensible width — enough
 *  that nobody meets the cap while browsing one brand, small
 *  enough that seven brands at once stay instant. */
const INDEX_CAP = 240

/** The verbs this renderer does not yet perform. A module with one
 *  of these switched on gets a DISABLED control saying what it will
 *  do, rather than a control that looks finished and does nothing —
 *  which is a lie told to whoever is looking at the screen. */
const NOT_YET: ModuleCapability[] = ['add', 'edit', 'delete', 'relate', 'quote', 'export']

const NOT_YET_SAYS: Record<string, string> = {
  add: 'Adding an item from here arrives with the module designer.',
  edit: 'Editing from here arrives with the module designer. The sheet is where data changes today.',
  delete: 'Removing an item from here arrives with the module designer.',
  relate: 'Ticking what goes with what happens on the item’s own page today.',
  quote: 'Quoting starts from an item’s own page today — open one and press “Quote this one”.',
  export: 'Taking a copy of this list out arrives with the module designer.',
}

export interface ModuleIndexProps {
  module: ModuleDef
  /** clicking an item — the table it belongs to and the row itself */
  onOpen: (tableId: string, rowId: string) => void
}

export function ModuleIndex({ module, onOpen }: ModuleIndexProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [query, setQuery] = useState('')

  const tables = useMemo(() => moduleTables(module, entities), [module, entities])

  /* Built once per data change, not per keystroke: 651 rows resolve
     their label, trail, price and picture here and the search below
     only reads the string this already made. */
  const entries = useMemo(() => buildEntries(tables, rowsByEntity), [tables, rowsByEntity])

  const canSearch = module.capabilities.includes('search')
  const canOpen = module.capabilities.includes('open')

  /* WORD BY WORD, NOT ONE LONG STRING — the lesson the view stage's
     rail already learned. "SP460 PVC" must find a row named
     "Highfield - SP460 (PVC)", and a whole-string test answers
     "nothing matches" for a row two screens down.
     Split inside the memo, so the dependency is the typed STRING and
     not an array rebuilt on every render. */
  const matches = useMemo(() => {
    if (!canSearch) return entries
    const needles = query.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
    if (needles.length === 0) return entries
    return entries.filter((e) => needles.every((n) => e.hay.includes(n)))
  }, [entries, canSearch, query])

  const shown = matches.length > INDEX_CAP ? matches.slice(0, INDEX_CAP) : matches
  const hidden = matches.length - shown.length
  const sections = useMemo(() => groupEntries(shown, tables), [shown, tables])

  const multiTable = tables.length > 1
  const stubs = NOT_YET.filter((c) => module.capabilities.includes(c))

  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties

  /* A module without `browse` has no index at all — that is what the
     switch means, and saying so is better than drawing an empty page. */
  if (!module.capabilities.includes('browse')) {
    return (
      <section className="md-index" style={style} aria-label={module.name}>
        <p className="md-none">
          Browsing is switched off for {module.name}, so this list is not drawn.
        </p>
      </section>
    )
  }

  return (
    <section className="md-index" style={style} aria-label={module.name}>
      <header className="md-idx-head">
        <div className="md-idx-id">
          <h2 className="md-idx-name">{module.name}</h2>
          {module.description === '' ? null : (
            <p className="md-idx-desc">{module.description}</p>
          )}
          <p className="md-idx-facts mono-label">
            {entries.length} {entries.length === 1 ? 'item' : 'items'}
            {multiTable ? ` · ${tables.length} tables` : ''}
          </p>
        </div>

        {canSearch ? (
          <div className="md-idx-find">
            <MagnifyingGlass
              size={ICON_SIZE.tiny}
              weight="light"
              aria-hidden="true"
              className="md-idx-find-mark"
            />
            <input
              className="field-input md-idx-find-input"
              type="search"
              value={query}
              spellCheck={false}
              placeholder="Find one by name"
              aria-label={`Find one in ${module.name} by name`}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        ) : null}
      </header>

      {/* WHAT IS SWITCHED ON BUT NOT YET BUILT. Drawn disabled, with
          the sentence saying what it will do — never as a live-looking
          control. Nothing is drawn at all for a module that has none
          of these on, which is every module a person makes today. */}
      {stubs.length > 0 ? (
        <div className="md-stubs">
          {stubs.map((c) => (
            <div className="md-stub" key={c}>
              <button type="button" className="btn" disabled>
                {MODULE_CAPABILITIES[c].label}
              </button>
              <p className="md-stub-say">{NOT_YET_SAYS[c]}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!canOpen ? (
        <p className="md-idx-note">
          Opening one is switched off for this module, so these are a list to read
          rather than a way in.
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="md-none">
          {tables.length === 0
            ? 'The tables this module was made from are no longer on the sheet.'
            : 'These tables have no rows yet. Add rows on the sheet and they appear here.'}
        </p>
      ) : matches.length === 0 ? (
        <p className="md-none">Nothing here matches “{query.trim()}”.</p>
      ) : (
        sections.map((section) => (
          <Section
            key={section.tableId}
            section={section}
            showHead={multiTable}
            mode={module.index}
            canOpen={canOpen}
            onOpen={onOpen}
          />
        ))
      )}

      {hidden > 0 ? (
        <p className="md-more mono-label">
          {hidden} more —{' '}
          {canSearch
            ? 'type above to narrow'
            : 'switch search on for this module to reach them'}
        </p>
      ) : null}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* One table's run                                            */
/* ---------------------------------------------------------- */

interface SectionProps {
  section: IndexSection
  /** the brand head, drawn only when the module spans more than one
   *  table — a one-table module already has its name in the header */
  showHead: boolean
  mode: ModuleDef['index']
  canOpen: boolean
  onOpen: (tableId: string, rowId: string) => void
}

function Section({
  section,
  showHead,
  mode,
  canOpen,
  onOpen,
}: SectionProps): ReactElement {
  return (
    <section className="md-sec" aria-label={section.name}>
      {showHead ? (
        <div className="md-sec-head">
          <span className="md-sec-mark">
            <TableKindSymbol kind={section.kind} size={ICON_SIZE.small} />
          </span>
          <h3 className="md-sec-name block-heading">{section.name}</h3>
          <span className="md-sec-count mono-label">{section.count}</span>
        </div>
      ) : null}

      {section.groups.map((group) => (
        <div className="md-grp" key={group.key}>
          {group.trail === '' ? null : (
            <p className="md-grp-trail mono-label">{group.trail}</p>
          )}
          {mode === 'tiles' ? (
            <ul className="md-tiles">
              {group.entries.map((e) => (
                <Tile key={e.rowId} entry={e} canOpen={canOpen} onOpen={onOpen} />
              ))}
            </ul>
          ) : (
            <ul className="md-rows">
              {group.entries.map((e) => (
                <Row key={e.rowId} entry={e} canOpen={canOpen} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The two faces                                              */
/* ---------------------------------------------------------- */

interface FaceProps {
  entry: IndexEntry
  canOpen: boolean
  onOpen: (tableId: string, rowId: string) => void
}

function Tile({ entry, canOpen, onOpen }: FaceProps): ReactElement {
  const body = (
    <>
      <span className="md-tile-pic">
        <TilePicture img={entry.img} alt={entry.label} />
      </span>
      <span className="md-tile-name">{entry.label}</span>
      {/* NO EMPTY PRICE SLOT. A table that prices nothing draws no
          line at all, rather than a dash a salesperson could read as
          "free" or "ask". */}
      {entry.price === '' ? null : <span className="md-tile-price">{entry.price}</span>}
    </>
  )
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          className="md-tile"
          /* NAMED EXPLICITLY. The face is three spans, one of them a
             picture and one a mono figure, and a reader announcing
             them run together is not a name. */
          aria-label={entry.price === '' ? entry.label : `${entry.label}, ${entry.price}`}
          onClick={() => onOpen(entry.tableId, entry.rowId)}
        >
          {body}
        </button>
      ) : (
        <div className="md-tile is-flat">{body}</div>
      )}
    </li>
  )
}

/** The dense line. IT DOES NOT REPEAT ITS OWN TRAIL: the group
 *  heading above it already says "EPROPULSION - ELECTRIC OUTBOARDS",
 *  and printing that again on all fourteen rows underneath is a
 *  column of noise where the eye is trying to compare names and
 *  numbers. Drawn and seen; the trail is on the heading, once. */
function Row({ entry, canOpen, onOpen }: FaceProps): ReactElement {
  const body = (
    <>
      <span className="md-row-name">{entry.label}</span>
      {entry.price === '' ? null : <span className="md-row-price">{entry.price}</span>}
    </>
  )
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          className="md-row"
          aria-label={entry.price === '' ? entry.label : `${entry.label}, ${entry.price}`}
          onClick={() => onOpen(entry.tableId, entry.rowId)}
        >
          {body}
        </button>
      ) : (
        <div className="md-row is-flat">{body}</div>
      )}
    </li>
  )
}

/* ---------------------------------------------------------- */
/* The picture, or nothing at all                             */
/* ---------------------------------------------------------- */

/** One tile's picture. There is no third outcome: a picture, or the
 *  name on plain paper. The verdict is taken per HOST in
 *  `@/lib/imageSources` and shared with the grid and the view page,
 *  so a catalogue of 240 tiles costs at most two failed requests per
 *  host rather than one per tile.
 *
 *  Split in two so the hook is never asked about a row that has no
 *  picture at all — a conditional hook is not an option, and an
 *  empty source is not a question `useImageDisplay` should be made
 *  to answer. */
function TilePicture({
  img,
  alt,
}: {
  img: ImageRef | undefined
  alt: string
}): ReactElement | null {
  if (!img) return null
  return <Painted img={img} alt={alt} />
}

function Painted({ img, alt }: { img: ImageRef; alt: string }): ReactElement | null {
  const { paint, probe } = useImageDisplay(img.src)
  if (!paint) return null
  return (
    <img
      className="md-tile-img"
      src={img.src}
      /* the author's own words when they wrote any; the row's label
         is the only honest fallback and nothing here invents one */
      alt={img.alt && img.alt.trim() !== '' ? img.alt.trim() : alt}
      /* the box is reserved before the bytes arrive, so a picture
         landing late never reflows the grid under a reader's thumb */
      width={200}
      height={132}
      /* THE PROBE IS THE ONE PICTURE on an unknown host allowed to
         make the request that settles it, so it must not be deferred.
         Everything else waits until it is on screen — a 240-tile page
         must not fetch 240 full-size photographs at once. */
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}
