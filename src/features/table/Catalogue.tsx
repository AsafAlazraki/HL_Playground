/* ============================================================
   THE CATALOGUE — browse what you sell.

   PHASE_TWO §2.2: "the screen that does not exist today and should
   be the most-used in the app."

   WHAT WAS WRONG, MEASURED. Open Highfield Inflatables at 1600×1000
   and the app draws 588 rows of a spreadsheet: 33 columns, the
   largest type on the screen 16px, and 220 real photographs — the
   seed ships them — appearing nowhere at all except as a 20px
   thumbnail inside an image cell. That screen is the reason the
   verdict on phase one was "it still feels like a database". It IS
   a database.

   WHAT THIS IS. One surface at two densities:

     GALLERY   the photographs, large, at the 3:2 the seed was shot
               at, grouped by the level the business already files
               this table under, narrowed by the columns the table
               actually has.

     LIST      the register, unchanged and undiminished — sort,
               sections, grouping, editing, the fill handle, the row
               detail, the column menus, the round trip. Every
               capability it had, because the spreadsheet is not the
               enemy; the spreadsheet being the FRONT DOOR was.

   AND THE NARROWING IS THE SAME NARROWING. `TableSheet` takes its
   view state from here (see `SheetViewState` there), so `Patrol ·
   fits 60 hp` still holds when you press List, and the register's
   own filter chips say what the gallery's rail set. Two densities
   of one surface, rather than two surfaces over one table.

   WHAT IT REFUSES TO DO, and each one is a way it could lie:

     - no facet that is not a column of this table. The rail is read
       off the file, not off a list of things boat shops filter by
       (`facets.ts`);
     - no photograph that is not this row's own. A hull nobody has
       photographed draws its kind's crest, never a sibling's shot
       and never a stock boat (`pictures.tsx`, and `coverPhoto.ts`
       made the same ruling for a table);
     - no invented noun. "588 variants", "7 series" — the words come
       off the table's own columns (`grouping.ts`).

   THE SEAM, for whoever mounts this. It needs an `entityId` and the
   register's three housekeeping props, and it fills the box it is
   put in. A module's Stock tab is:

       <Catalogue entityId={t.id} colWidths={w} onResizeColumn={rz}
                  pushToast={toast} heading={false}
                  onOpenRow={(rowId) => openConfigurator(rowId)} />

   `heading={false}` where the host already names the table, and
   `onOpenRow` where pressing a boat should do something better than
   the default, which is to take you to that row in the register.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { Rows, SquaresFour } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  isDiscontinued,
  rowLabel,
  TABLE_KINDS,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import type { ActionGroup, ActionItem } from '@/lib/actions'
import { useActionBar } from '@/lib/actions'
import { ICON_SIZE } from '@/lib/icons'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import {
  bandOf,
  formatCell,
  formatNumber as printFigure,
  formatRange,
  priceColumnOf,
} from '@/features/views/columns'
import { pictureField, rowPicture, Picture } from '@/features/views/pictures'
import type { ColumnFilter, SortState } from '@/features/table/core'
import { TableSheet, SEARCH_LABEL } from './TableSheet'
import { NoMatchPlate } from './EmptyPlates'
import { FacetRail } from './FacetRail'
import { readFacets, type Facet } from './facets'
import { useTableData } from './useTableData'
import { branchNoun, countLabel, leafNoun } from './grouping'
import { requestRowReveal } from './rowRevealState'
import { LENS_LABEL, setCatalogueLens, useCatalogueLens } from './catalogueLens'
import type { PushToast } from './Toasts'
import './catalogue.css'

/** How many tiles are painted before the person asks for more. Five
 *  columns of ten rows at 1600 is more than a screenful and a long
 *  way short of 588 photographs, which is the whole argument for a
 *  number here rather than a virtual scroller: the grid is grouped
 *  and sticky-headed, and windowing that is a week's work to save a
 *  scroll nobody does. */
const PAGE = 48

/** A cell's display text, softened where the store shouts. A boolean
 *  is stored TRUE and the register draws it as a tick; a chip has to
 *  say a word, and rule 3 bars the uppercase one. */
function soften(text: string): string {
  if (text === 'TRUE') return 'Yes'
  if (text === 'FALSE') return 'No'
  return text
}

/** The one or two figures a tile prints beside its price: the hp
 *  envelope and the length, where the table has them. Taken from the
 *  FACETS rather than picked again, so the thing you filter by is the
 *  thing the card shows. */
interface TileSpec {
  key: string
  label: string
  read: (row: RowData) => string
}

function tileSpecs(entity: EntityDef, facets: Facet[], priceId: string | undefined): TileSpec[] {
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const out: TileSpec[] = []
  for (const facet of facets) {
    if (out.length >= 2) break
    if (facet.kind === 'envelope') {
      const min = byId.get(facet.minFieldId)
      const max = byId.get(facet.maxFieldId)
      if (!min || !max) continue
      out.push({
        key: facet.id,
        label: facet.label,
        read: (row) => {
          const a = row.values[min.id] ?? null
          const b = row.values[max.id] ?? null
          if (typeof a === 'number' || typeof b === 'number') {
            return formatRange(a, b, min.name, bandOf(entity, min))
          }
          /* the business typed the unit in — `4 HP`. Its own words. */
          const at = typeof a === 'string' ? a : ''
          const bt = typeof b === 'string' ? b : ''
          if (at !== '' && bt !== '' && at !== bt) return `${at}–${bt}`
          return at !== '' ? at : bt
        },
      })
      continue
    }
    if (facet.kind === 'band' && facet.fieldId !== priceId && !facet.money) {
      const f = byId.get(facet.fieldId)
      if (!f) continue
      out.push({
        key: facet.id,
        label: facet.label,
        read: (row) =>
          formatCell(f, row.values[f.id] ?? null, undefined, bandOf(entity, f)) +
          (facet.unit ? ` ${facet.unit}` : ''),
      })
    }
  }
  return out
}

export interface CatalogueProps {
  entityId: string
  /** the register's column widths, kept above this so they survive a
   *  move to another table and back */
  colWidths: Record<string, number>
  onResizeColumn: (fieldId: string, w: number) => void
  pushToast: PushToast
  /** the host's own doors, published on the action bar in both
   *  densities so pressing Gallery never costs a person a door */
  doors?: ActionItem[]
  onCount?: (shown: number, total: number) => void
  /** false where the host already names the table — a module's own
   *  header does, a stage's top bar does not have to */
  heading?: boolean
  /** what pressing a boat does. Absent = go to that row in the
   *  register, which is the honest default for a surface that has a
   *  register underneath it. */
  onOpenRow?: (rowId: string) => void
}

export function Catalogue({
  entityId,
  colWidths,
  onResizeColumn,
  pushToast,
  doors,
  onCount,
  heading = true,
  onOpenRow,
}: CatalogueProps): JSX.Element {
  const entity = useProjectStore((s) => s.entities[entityId]) as EntityDef | undefined
  const lens = useCatalogueLens(entityId)

  /* THE NARROWING LIVES HERE, not in the register — see the note on
     SheetViewState in TableSheet.tsx. */
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<ColumnFilter[]>([])
  const [search, setSearch] = useState('')
  const hostedView = useMemo(
    () => ({ sort, setSort, filters, setFilters, search, setSearch }),
    [sort, filters, search],
  )

  const data = useTableData(entityId, { sort, filters, search })
  const { rows, viewActive } = data

  /* THE FACET SOURCE IS EVERY ROW, unnarrowed, so a chip's count is
     what the table holds rather than what is left after the last
     chip. Text, because a facet's values and the register's filters
     have to be the same strings. */
  /* NAMED, NOT READ THROUGH `data`. `useTableData` memoises every
     field it returns and then hands back a fresh OBJECT, so a
     dependency on `data` is a dependency on nothing — this pass over
     every row would re-run on every keystroke typed into the search
     box. The same trap `TableSheet` records against `whole`. */
  const { buildViewRows, hasFormula } = data
  const allViewRows = useMemo(
    () => buildViewRows(rows, hasFormula),
    [buildViewRows, rows, hasFormula],
  )
  const facets = useMemo(() => readFacets(entity, allViewRows), [entity, allViewRows])

  const [page, setPage] = useState(PAGE)
  useEffect(() => {
    setPage(PAGE)
  }, [filters, search, sort, lens])

  const [listShown, setListShown] = useState<number | null>(null)
  const shown = lens === 'gallery' ? data.viewRows.length : (listShown ?? rows.length)
  useEffect(() => {
    onCount?.(shown, rows.length)
  }, [onCount, shown, rows.length])

  const clearView = useCallback(() => {
    setSort(null)
    setFilters([])
    setSearch('')
  }, [])

  /* THE HOST'S DOORS, IN THE GALLERY. In the register `TableSheet`
     publishes them with its own controls; up here there is no
     register to publish them, and a door that vanishes when you
     change density is a door that cannot be relied on. */
  const galleryBar = useMemo<ActionGroup[] | null>(() => {
    if (lens !== 'gallery' || !doors || doors.length === 0) return null
    return [{ id: 'cat-doors', rank: 50, items: doors }]
  }, [lens, doors])
  useActionBar(`catalogue:${entityId}`, galleryBar)

  /* -- the words on the head ------------------------------------ */
  const noun = leafNoun(entity)
  const branch = branchNoun(entity)
  const levelId = entity?.hierarchy?.[0]
  const branchCount = useMemo(() => {
    if (!levelId) return 0
    const seen = new Set<string>()
    for (const r of allViewRows) seen.add(r.text[levelId] ?? '')
    return seen.size
  }, [allViewRows, levelId])

  const fact =
    viewActive && shown !== rows.length
      ? `${shown} of ${countLabel(rows.length, noun)}`
      : branch && branchCount > 1
        ? `${countLabel(rows.length, noun)} · ${countLabel(branchCount, branch)}`
        : countLabel(rows.length, noun)

  /* -- how a value and a figure print in this table -------------- */
  const byId = useMemo(
    () => new Map((entity?.fields ?? []).map((f) => [f.id, f])),
    [entity],
  )
  const say = useCallback(
    (_fieldId: string, value: string) => soften(value),
    [],
  )
  const print = useCallback(
    (fieldId: string, n: number) => {
      const f = byId.get(fieldId)
      return printFigure(n, f?.name ?? '', bandOf(entity, f))
    },
    [byId, entity],
  )

  const kind = kindOf(entity?.kind)

  /* A TABLE WITH NO ROWS IS THE REGISTER'S BUSINESS. Its plates say
     what is missing AND carry the act that fixes it — "add the first
     column", "paste a block straight from Excel" — which is the one
     place the prose budget spends words on purpose. A gallery of
     nothing would be a second, worse empty state over the top of a
     working one. */
  if (!entity) return <div className="cat-root" />

  return (
    <section
      /* written out rather than interpolated, so `check-styles` can
         see the class as a literal and hold this file to its contract */
      className={'cat-root' + (lens === 'list' ? ' cat-root--list' : '')}
      data-kind={kind}
      aria-label={entity.name}
    >
      {heading ? (
        <header className="cat-head k-wash k-rail-thick">
          <div className="cat-head-say">
            <p className="cat-eyebrow mono-label">
              <TableKindSymbol kind={kind} size={ICON_SIZE.tiny} />
              <span>{TABLE_KINDS[kind].label}</span>
            </p>
            {/* THE HEAD DOES LESS WORK WHEN THE CONTENT IS DENSE.
                The gallery is the showroom and the name is its hero
                at 34–52px; the register is the workbench, where 155px
                of chrome is nine rows a dealer doing entry does not
                get. One step down — the WHOLE step, size, weight,
                leading and tracking together, which is what
                `.ds-display-lg` is — and the identity is unchanged. */}
            <h1 className={`${lens === 'gallery' ? 'ds-hero' : 'ds-display-lg'} cat-name`}>
              {entity.name}
            </h1>
            <p className="cat-fact">{fact}</p>
          </div>
          <Lens entityId={entityId} lens={lens} />
        </header>
      ) : (
        <div className="cat-head cat-head--bare">
          <p className="cat-fact">{fact}</p>
          <Lens entityId={entityId} lens={lens} />
        </div>
      )}

      <div className="cat-rail">
        <label className="cat-find">
          <input
            className="field-input"
            type="search"
            value={search}
            spellCheck={false}
            placeholder={`Search every ${noun.one}…`}
            /* the same accessible name the '/' key looks the box up
               by, so the register's keyboard route still lands here
               when the catalogue has taken the box off its bar */
            aria-label={SEARCH_LABEL}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <FacetRail
          facets={facets}
          filters={filters}
          onFilters={setFilters}
          say={say}
          print={print}
        />

        {viewActive ? (
          <button type="button" className="cat-clear" onClick={clearView}>
            Clear
          </button>
        ) : null}
      </div>

      <div className="cat-body">
        {lens === 'gallery' && rows.length > 0 ? (
          <Gallery
            entity={entity}
            data={data}
            facets={facets}
            sorted={sort !== null}
            page={page}
            onMore={() => setPage((p) => p + PAGE)}
            onClear={clearView}
            onOpenRow={(rowId) => {
              if (onOpenRow) {
                onOpenRow(rowId)
                return
              }
              requestRowReveal(entityId, rowId)
              setCatalogueLens(entityId, 'list')
            }}
          />
        ) : (
          <TableSheet
            entityId={entityId}
            colWidths={colWidths}
            onResizeColumn={onResizeColumn}
            pushToast={pushToast}
            doors={doors}
            onCount={setListShown}
            view={hostedView}
          />
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The density control                                        */
/* ---------------------------------------------------------- */

function Lens({
  entityId,
  lens,
}: {
  entityId: string
  lens: 'gallery' | 'list'
}): JSX.Element {
  return (
    <div className="cat-lens" role="group" aria-label="How to show this">
      {(['gallery', 'list'] as const).map((l) => {
        const Mark = l === 'gallery' ? SquaresFour : Rows
        return (
          <button
            key={l}
            type="button"
            className="cat-lens-btn"
            aria-pressed={lens === l}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              setCatalogueLens(entityId, l)
            }}
            onClick={() => setCatalogueLens(entityId, l)}
          >
            <Mark size={ICON_SIZE.small} weight="regular" aria-hidden="true" />
            <span>{LENS_LABEL[l]}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* The photographs                                            */
/* ---------------------------------------------------------- */

interface Band {
  key: string
  /** the value of the level column, as its author wrote it */
  name: string
  rows: RowData[]
  /** how many this band holds in the NARROWED set — not how many are
   *  painted. A head that counted the painted ones would say 48 for
   *  a series of 130 and be wrong the moment somebody scrolled. */
  held: number
}

function Gallery({
  entity,
  data,
  facets,
  sorted,
  page,
  onMore,
  onClear,
  onOpenRow,
}: {
  entity: EntityDef
  data: ReturnType<typeof useTableData>
  facets: Facet[]
  /** a column sort is in force, so the person's order wins over the
   *  table's own filing and the bands go away */
  sorted: boolean
  page: number
  onMore: () => void
  onClear: () => void
  onOpenRow: (rowId: string) => void
}): JSX.Element {
  const { viewRows, rowById, rows, viewActive } = data

  const shot = useMemo(() => pictureField(entity), [entity])
  const priceId = useMemo(() => priceColumnOf(entity), [entity])
  const priceField: FieldDef | undefined = priceId
    ? entity.fields.find((f) => f.id === priceId)
    : undefined
  const specs = useMemo(() => tileSpecs(entity, facets, priceId), [entity, facets, priceId])
  const levelId = entity.hierarchy?.[0]
  const levelName = levelId
    ? (entity.fields.find((f) => f.id === levelId)?.name ?? '')
    : ''
  const nameAt = useCallback(
    (row: RowData): string => {
      if (!levelId) return ''
      const raw = row.values[levelId] ?? ''
      return typeof raw === 'string' ? raw.trim() : String(raw ?? '')
    },
    [levelId],
  )

  /* THE FILING THE BUSINESS ALREADY DOES. The store holds Highfield
     in workbook order, which interleaves Patrol, Sport and Classic —
     so bands taken off consecutive rows come out as `Patrol 1 · Sport
     4 · Patrol 1`, which is noise wearing the shape of structure. The
     register answers this with drawers (`buildGroups`); the gallery
     answers it by collecting each series' rows together, in the order
     the series FIRST appear in the file. Nothing is reordered inside
     a series and nothing is sorted — that is the person's own act,
     and when they make it the bands step aside. */
  const collected = useMemo(() => {
    if (!levelId || sorted) return viewRows
    const buckets = new Map<string, typeof viewRows>()
    for (const vr of viewRows) {
      const row = rowById.get(vr.rowId)
      if (!row) continue
      const key = nameAt(row)
      const held = buckets.get(key)
      if (held) held.push(vr)
      else buckets.set(key, [vr])
    }
    return [...buckets.values()].flat()
  }, [viewRows, rowById, levelId, sorted, nameAt])

  const painted = useMemo(() => collected.slice(0, page), [collected, page])

  /* ONE CREST, HOISTED. It is the same element on every tile that
     needs one and nothing about it varies per row. */
  const crest = (
    <span className="cat-shot-none" aria-hidden="true">
      <TableKindSymbol kind={kindOf(entity.kind)} size={ICON_SIZE.large} />
    </span>
  )

  /* THE BANDS ARE OVER WHAT IS PAINTED, not over the whole table, so
     a band head never promises rows that are not under it yet. */
  const held = useMemo(() => {
    const m = new Map<string, number>()
    if (!levelId || sorted) return m
    for (const vr of collected) {
      const row = rowById.get(vr.rowId)
      if (!row) continue
      const key = nameAt(row)
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return m
  }, [collected, rowById, levelId, sorted, nameAt])

  const bands = useMemo<Band[]>(() => {
    const out: Band[] = []
    let current: Band | null = null
    for (const vr of painted) {
      const row = rowById.get(vr.rowId)
      if (!row) continue
      const name = nameAt(row)
      const key = levelId && !sorted ? name : '·'
      if (!current || current.key !== key) {
        current = { key, name, rows: [], held: held.get(key) ?? 0 }
        out.push(current)
      }
      current.rows.push(row)
    }
    return out
  }, [painted, rowById, levelId, sorted, nameAt, held])

  if (viewRows.length === 0 && viewActive) {
    return <NoMatchPlate total={rows.length} onClear={onClear} />
  }

  let i = 0
  return (
    <div className="cat-gallery">
      {bands.map((band) => (
        <section key={band.key} className="cat-band">
          {levelId && !sorted && band.name !== '' ? (
            <h2 className="cat-band-head k-band">
              <span className="mono-label cat-band-lab">{levelName}</span>
              <span className="cat-band-name">{band.name}</span>
              <span className="cat-band-count cat-num">{band.held}</span>
            </h2>
          ) : null}
          <ol className="cat-grid">
            {band.rows.map((row) => {
              const img = rowPicture(row, shot)
              const held = isDiscontinued(row)
              const name = rowLabel(entity, row)
              const price = priceField
                ? formatCell(
                    priceField,
                    row.values[priceField.id] ?? null,
                    undefined,
                    bandOf(entity, priceField),
                  )
                : ''
              const idx = i
              i += 1
              return (
                <li
                  key={row.id}
                  className="cat-tile ds-rise"
                  style={{ '--i': idx } as CSSProperties}
                >
                  <button
                    type="button"
                    className={`cat-card k-lift ${held ? 's-held' : 'k-rail'}`}
                    onClick={() => onOpenRow(row.id)}
                  >
                    <span className="cat-shot">
                      {img ? (
                        <Picture
                          img={img}
                          /* the name is the next thing in the card,
                             so a repeat would make a screen reader
                             say it twice */
                          alt={img.alt?.trim() ?? ''}
                          className="cat-shot-img"
                          w={600}
                          h={400}
                          /* AN ADDRESS IS NOT A PICTURE. Mackay's 125
                             rows all carry one and the maker's host
                             cannot be fetched from a browser, so
                             without this the whole table draws as 125
                             empty grey rectangles. The verdict is
                             still taken in one place — `pictures.tsx`
                             — and this is only what to draw instead. */
                          fallback={crest}
                        />
                      ) : (
                        /* NOTHING IS SUBSTITUTED. No stock boat, no
                           sibling's photograph, no silhouette of a
                           hull nobody shot — the table's own crest,
                           which is the ruling coverPhoto.ts already
                           made for a card. */
                        crest
                      )}
                    </span>

                    <span className="cat-card-say">
                      <span className="cat-tile-name">{name}</span>
                      <span className="cat-tile-facts">
                        {price !== '' ? (
                          <span className="cat-price cat-num">{price}</span>
                        ) : null}
                        {specs.map((s) => {
                          const v = s.read(row)
                          if (v === '') return null
                          /* THE LABEL GOES WHERE THE VALUE ALREADY
                             SAYS IT. Highfield types `115 HP` into a
                             column called Min HP, and `HP 115 HP` is
                             the app repeating the file back at it. */
                          const said = v.toLowerCase().includes(s.label.toLowerCase())
                          return (
                            <span key={s.key} className="cat-spec">
                              {said ? null : (
                                <span className="mono-label cat-spec-lab">{s.label}</span>
                              )}
                              <span className="cat-num">{v}</span>
                            </span>
                          )
                        })}
                      </span>
                      {held ? (
                        <span className="cat-tile-held s-say">No longer sold</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      {collected.length > painted.length ? (
        <div className="cat-more">
          <button type="button" className="btn" onClick={onMore}>
            Show more
          </button>
          <p className="cat-more-say cat-num">
            {painted.length} of {collected.length}
          </p>
        </div>
      ) : null}
    </div>
  )
}
