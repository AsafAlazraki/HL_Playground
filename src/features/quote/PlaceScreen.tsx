/* ============================================================
   ONE PLACE, OPEN — the second Showroom screen, and the one the
   588-variant problem lives on.

   MEASURED AT 1280x800 ON THE REAL SEED, the screen this replaces
   opens Highfield onto seven rows reading

       Highfield - ADV7 (HYP) B-G-B        $105,930
       Highfield - ADV7 (HYP) B-G-LB       $105,930
       Highfield - ADV7 (HYP) B-G-WB       $105,930
       Highfield - ADV7 (HYP) B-W-WG       $105,930
       ... and three more

   and says under the search box: "The first 50 are drawn — type a
   model or a series to reach the other 538." So a dealer opening
   the biggest brand on the sheet meets ONE BOAT, seven times, at
   one price, told there are 538 more they cannot see. It measured
   3.09x scale contrast over six type steps — the Showroom register
   asks for >=6x — with 56px rows and 40px thumbnails.

   THE CAP IS A SYMPTOM AND NOT THE DISEASE. `SUBJECT_CAP = 50`
   exists because 588 rows is too many to draw; 588 rows is too many
   because the screen lists VARIANTS when a person is choosing a
   MODEL. Highfield's 604 rows are 85 models, and 85 cards need no
   cap at all.

   SO A MODEL IS A CARD AND ITS FINISHES ARE IN THE BAR. What
   separates those seven rows is the trailing token, and `colourway.ts`
   reads it out of the map the original HelmLogic has shipped since
   it was seeded: B-G-B is "Black / Grey / Black". 483 of the 604
   read; the other 121 print their code exactly as the price file
   carries it, because a code half-translated reads as one that was
   understood. Measured: 604 rows draw as 67 model cards at ONE
   height, 62 of them photographed, across the sheet's own 7 series,
   with no cap on any of it.

   THE CHIPS ARE IN THE BAR AND NOT ON THE CARD, and that was
   measured too — on the card they gave five card heights in one
   view (295, 452, 483, 514, 734), because "Dark Grey / Grey /
   White/Blue" is a long chip and seven of them wrap to five rows.
   The bar is also where the decision belongs: a finish is not a
   detail confirmed afterwards, it is which boat this is.

   AND ONLY WHERE THE THIRD LEVEL IS ACTUALLY A FINISH. Highfield is
   the only brand on this sheet that splits that far. A motor's
   third level is a shaft length and a trailer's is a plug code, and
   `finishLevels` — which asks the question once per TABLE, for the
   reason its own note gives — is what stops either being folded
   into a card as though it were a colour. Where it says no, a row
   is its own card, which is what a motor list should be anyway.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { markOf } from '@/lib/mark'
import { readCell } from '@/types/model'
import type { EntityDef, ImageRef, RowData } from '@/types/model'
import { buildEntries } from '@/features/modules/read'
import type { IndexEntry } from '@/features/modules/read'
import { createViewFor } from '@/features/views/viewDefs'
import { useProjectStore } from '@/store/useProjectStore'
import { Button, Field } from '@/ui'
import type { QuoteDoor } from './start'
import { marqueOf } from './marque'
import { colourwayOf, isColourway, splitVariant } from './colourway'
import { FrozenPhoto } from './photo'
import { unsellableSubject } from './freeze'
import { createQuoteFromView, unaddressedDraftFor } from './quotes'
import './place-screen.css'

export interface PlaceScreenProps {
  door: QuoteDoor
  /** back to the grid of places */
  onBack: () => void
  /** a quote was minted, and the shell opens it */
  onStarted: (quoteId: string) => void
}

/* ---------------------------------------------------------- */
/* What a card is                                              */
/* ---------------------------------------------------------- */

/** One row, with the cell that distinguishes it from its siblings.
 *  The code is READ OFF THE ROW, never parsed back out of the
 *  rendered label: a model whose name ends in a hyphenated token
 *  would defeat any parse, and the cell is right there. */
interface Offer {
  entry: IndexEntry
  /** the row's own hierarchy level — "HYP B-G-B" */
  leaf: string
}

interface Model {
  key: string
  /** the series this model sits under — "Adventure", "Sport". '' on
   *  a table that groups by nothing. */
  series: string
  /** what the card is called — the model code on a three-level
   *  table, the row's own label everywhere else. */
  name: string
  /** one row, or every finish of one model */
  offers: Offer[]
  img?: ImageRef
  /** every offer's price, for the range under the name */
  amounts: number[]
  /** the distinct materials across the offers — one on most models,
   *  two where the same hull comes in Hypalon and PVC */
  materials: string[]
  hay: string
}

/** The row's OWN level of the hierarchy — the one `trailOf` drops
 *  because the label already says it. Read here rather than parsed
 *  off the label: a proper noun with a hyphen in it would defeat any
 *  parse, and the cell is right there. */
function leafValues(
  tables: readonly EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
): Map<string, string> {
  const out = new Map<string, string>()
  for (const entity of tables) {
    const levels = entity.hierarchy ?? []
    const last = levels.at(-1)
    if (levels.length < 2 || last === undefined) continue
    for (const row of rowsByEntity[entity.id] ?? []) {
      const v = readCell(row, last)
      if (v === null || v === undefined) continue
      out.set(`${entity.id}:${row.id}`, String(v).trim())
    }
  }
  return out
}

/* ============================================================
   WHETHER A TABLE'S LAST LEVEL IS A FINISH — asked ONCE PER TABLE.

   The first draft asked it per ROW, and that was wrong in a way
   only the measurement showed: 604 Highfield rows came back as 171
   cards rather than 85, because the 121 rows whose code is `I`, `O`,
   `R` or `WH` — tokens no production map carries — did not read as
   colourways and so fell OUT of their own model's card and sat
   beside it as singles. The same boat, drawn twice, once as a model
   and once as a row.

   WHAT THE LEVEL MEANS IS A FACT ABOUT THE COLUMN, not about the
   cell. If most of a table's rows put a colourway there then the
   level IS the finish, and a row whose code nobody can read is a
   finish with an unreadable name — which is what it is. Half is the
   line: Highfield reads 80%, and a motor's shaft codes and a
   trailer's plug codes read 0%.
   ============================================================ */
export function finishLevels(
  tables: readonly EntityDef[],
  leaves: ReadonlyMap<string, string>,
): Set<string> {
  const seen = new Map<string, { read: number; all: number }>()
  for (const [key, leaf] of leaves) {
    const tableId = key.slice(0, key.lastIndexOf(':'))
    const tally = seen.get(tableId) ?? { read: 0, all: 0 }
    tally.all += 1
    if (isColourway(leaf)) tally.read += 1
    seen.set(tableId, tally)
  }
  const out = new Set<string>()
  for (const entity of tables) {
    const tally = seen.get(entity.id)
    if (tally && tally.all > 0 && tally.read * 2 >= tally.all) out.add(entity.id)
  }
  return out
}

/** The material half of a variant cell, with the brackets the sheet
 *  writes around some of them taken off: "(PVC)" is PVC, "HYP" is
 *  HYP. The code is left as the code — the sheet's own word for it —
 *  because "HYP" is what a dealer reads on an order. */
function materialOf(leaf: string): string {
  return splitVariant(leaf).material.replace(/[()]/g, ' ').replace(/s+/g, ' ').trim()
}

/** The last segment of a trail — "Adventure ▸ ADV7" is ADV7. */
function modelOf(trail: string): string {
  const at = trail.lastIndexOf('▸')
  return at < 0 ? trail.trim() : trail.slice(at + 1).trim()
}

/** Fold the catalogue into the things a person is choosing between.
 *
 *  A GROUP ONLY FORMS WHERE THE TABLE'S LAST LEVEL IS A FINISH.
 *  Everywhere else each row is its own model, so a list of 209
 *  motors stays a list of 209 motors and is not silently collapsed
 *  into nine cards by a hierarchy that means something different. */
export function foldModels(
  entries: readonly IndexEntry[],
  leaves: ReadonlyMap<string, string>,
  finishes: ReadonlySet<string>,
): Model[] {
  const by = new Map<string, Model>()
  for (const e of entries) {
    const leaf = leaves.get(`${e.tableId}:${e.rowId}`) ?? ''
    const grouped = e.trail !== '' && finishes.has(e.tableId)
    const key = grouped ? `${e.tableId}|${e.trail}` : `${e.tableId}|${e.rowId}`
    const found = by.get(key)
    if (found) {
      found.offers.push({ entry: e, leaf })
      if (!found.img && e.img) found.img = e.img
      if (e.amount !== undefined) found.amounts.push(e.amount)
      const mat = materialOf(leaf)
      if (mat !== '' && !found.materials.includes(mat)) found.materials.push(mat)
      found.hay = `${found.hay} ${e.hay}`
      continue
    }
    by.set(key, {
      key,
      series: e.branch,
      name: grouped ? modelOf(e.trail) : e.label,
      offers: [{ entry: e, leaf }],
      ...(e.img ? { img: e.img } : {}),
      amounts: e.amount === undefined ? [] : [e.amount],
      materials: materialOf(leaf) === '' ? [] : [materialOf(leaf)],
      hay: `${e.hay} ${e.trail.toLowerCase()}`,
    })
  }
  return [...by.values()]
}

/* ---------------------------------------------------------- */

export function PlaceScreen({ door, onBack, onStarted }: PlaceScreenProps): ReactElement {
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [query, setQuery] = useState('')
  /* WHAT IS PICKED IS A MODEL AND A FINISH, in one state update, so
     the bar can never draw one model's name over another's price. */
  const [pick, setPick] = useState<{ model: Model; offer: Offer } | null>(null)

  const models = useMemo(() => {
    const entries = buildEntries(door.tables, rowsByEntity, { facts: false })
    const leaves = leafValues(door.tables, rowsByEntity)
    return foldModels(entries, leaves, finishLevels(door.tables, leaves))
  }, [door, rowsByEntity])

  const typed = query.trim().toLowerCase()
  const shown = typed === '' ? models : models.filter((m) => m.hay.includes(typed))

  /* THE SERIES ARE THE SHEET'S OWN, in the sheet's own order, and
     there is no cap on them. 85 cards is a screen somebody scrolls;
     50 rows of one boat is not. */
  const sections = useMemo(() => {
    const by = new Map<string, Model[]>()
    for (const m of shown) by.set(m.series, [...(by.get(m.series) ?? []), m])
    return [...by.entries()]
  }, [shown])

  /* THE LAST GATE IS A LIVE READ ABOUT ONE ROW — the same sentence
     the view stage draws instead of "Quote this one", so the two
     surfaces refuse identically. */
  const chosen = pick?.offer.entry ?? null
  const barred = chosen ? unsellableSubject(chosen.tableId, chosen.rowId) : ''
  const standing = chosen ? unaddressedDraftFor(chosen.tableId, chosen.rowId) : undefined

  const start = useCallback(() => {
    if (!chosen || barred !== '') return
    /* FORWARD AGAIN GOES BACK TO THE SAME DOCUMENT. Three drafts for
       one boat after two attempts is the measurement `quotes.ts`
       carries, and this is what answers it. */
    if (standing) {
      onStarted(standing.id)
      return
    }
    /* `createViewFor` is idempotent and creates no table, no column
       and no join: structure is never a side effect of arrowing down
       a list (§7). */
    const view = createViewFor(chosen.tableId)
    const made = createQuoteFromView(view.id, chosen.rowId)
    if (made) onStarted(made.id)
  }, [chosen, barred, standing, onStarted])

  const lockup = marqueOf(door.name)

  return (
    <div className="pl" data-register="showroom">
      <div className="pl-port">
        <div className="pl-col">
          <header className="pl-head">
            <div className="pl-head-say">
              <button type="button" className="pl-back" onClick={onBack}>
                <ArrowLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                Every place
              </button>
              <h1 className="t-marque pl-marque">{lockup.model || door.name}</h1>
              <p className="t-small pl-sub">
                {models.length} {models.length === 1 ? 'model' : 'models'} · {door.say}
              </p>
            </div>
            <div className="pl-head-do">
              <Field
                label={`Find in ${lockup.model || door.name}`}
                value={query}
                onChange={setQuery}
                placeholder="A model, a series, a code…"
                type="search"
                autoComplete="off"
              />
            </div>
          </header>

          {shown.length === 0 ? (
            <p className="t-small pl-none">
              Nothing here matches “{query}”. Clear the search to see all {models.length}.
            </p>
          ) : null}

          {sections.map(([series, inSeries]) => (
            <section className="pl-series" key={series || '—'}>
              <p className="pl-series-head">
                <span className="t-label pl-series-name">{series === '' ? door.name : series}</span>
                <span className="t-caption pl-series-count">
                  {inSeries.length} {inSeries.length === 1 ? 'model' : 'models'}
                </span>
              </p>
              <ul className="pl-grid">
                {inSeries.map((model) => (
                  <ModelCard
                    key={model.key}
                    model={model}
                    kind={door.kind}
                    on={pick?.model.key === model.key}
                    onChoose={(offer) => setPick({ model, offer })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* ============================================================
          THE BAR IS ALWAYS THERE, AND IT SAYS WHAT IS CHOSEN.

          Not a control that appears once something is picked: a strip
          that is empty reading "nothing yet" tells a person there IS
          a next step and where it will be, which an element that
          materialises cannot. Outside the scrollport, so no card can
          pass behind it.
          ============================================================ */}
      <footer className="pl-bar">
        <div className="pl-bar-say">
          {pick ? (
            <>
              <span className="t-subtitle pl-bar-name">{pick.offer.entry.label}</span>
              <span className="t-small pl-bar-price">
                {barred !== ''
                  ? barred
                  : standing
                    ? 'You already have a draft for this one'
                    : pick.offer.entry.price}
              </span>
            </>
          ) : (
            <span className="t-small pl-bar-none">Pick one to see what its quote will hold.</span>
          )}
        </div>

        {/* ============================================================
            THE FINISHES ARE IN THE BAR AND NOT ON THE CARD.

            They were on the card, and the cards measured 295, 452,
            483, 514 and 734px in one view: "Dark Grey / Grey /
            White/Blue" is a long chip, seven of them wrap to five
            rows, and a card that grows by its own content is the
            ragged grid this whole rebuild is about.

            The bar is also where the decision belongs. A finish is
            not a detail confirmed afterwards — it is WHICH BOAT THIS
            IS — and the bar is the one strip on the screen that is
            about the thing being committed to. One model is picked
            at a time, so there is exactly one row of them.
            ============================================================ */}
        {pick && pick.model.offers.length > 1 ? (
          <ul className="pl-ways" aria-label="Finishes">
            {pick.model.offers.map((offer) => (
              <Colour
                key={offer.entry.rowId}
                offer={offer}
                /* THE MATERIAL IS ON THE CHIP ONLY WHERE IT VARIES.
                   RU230KAM comes in two colours and two materials, so
                   its four chips first read "WH · WH · Light Grey ·
                   Light Grey" — two pairs of identical-looking
                   controls that are different boats at different
                   prices. Where every finish shares a material the
                   chip stays the colour alone, because repeating
                   "HYP" four times says nothing. */
                material={pick.model.materials.length > 1}
                on={offer.entry.rowId === pick.offer.entry.rowId}
                onChoose={(next) => setPick({ model: pick.model, offer: next })}
              />
            ))}
          </ul>
        ) : null}
        <Button
          tone="primary"
          {...(!chosen
            ? { refusedBecause: 'Pick a model first — its card or one of its finishes.' }
            : barred !== ''
              ? { refusedBecause: barred }
              : {})}
          onClick={start}
        >
          {standing ? 'Back to the quote' : 'Start the quote'}
        </Button>
      </footer>
    </div>
  )
}

/* ---------------------------------------------------------- */

function ModelCard({
  model,
  kind,
  on,
  onChoose,
}: {
  model: Model
  kind: string
  on: boolean
  onChoose: (offer: Offer) => void
}): ReactElement {
  const first = model.offers[0]

  /* ONE FIGURE WHEN THE FINISHES COST THE SAME, which on Highfield
     they do — all seven ADV7 colourways are $105,930. A range is
     only printed when there is one, and neither figure is computed:
     both come off `buildEntries`, already formatted by the price
     column the table itself nominates. */
  const cheapest = model.amounts.length ? Math.min(...model.amounts) : undefined
  const dearest = model.amounts.length ? Math.max(...model.amounts) : undefined
  const spread = cheapest !== undefined && dearest !== undefined && cheapest !== dearest
  const priced = spread
    ? (model.offers.find((o) => o.entry.amount === cheapest)?.entry.price ?? '')
    : (first?.entry.price ?? '')

  return (
    <li className="pl-cell">
      <button
        type="button"
        className={on ? 'pl-card is-mine' : 'pl-card'}
        data-kind={kind}
        data-press="card"
        aria-pressed={on}
        onClick={() => {
          if (first) onChoose(first)
        }}
      >
        <span className="pl-well">
          <span className="pl-plate" aria-hidden="true">
            <span className="t-display pl-mono">{markOf(model.name)}</span>
          </span>
          <FrozenPhoto
            img={model.img}
            fallbackAlt={model.name}
            className="pl-img"
            w={420}
            h={264}
          />
          <span className="k-rail pl-rail" aria-hidden="true" />
        </span>

        {/* THE SAME FIXED LINE BUDGET THE PICKER'S CARDS TAKE, for
            the same reason: the grid rows equalise within ONE grid
            and every series heading starts another, so a card sized
            by its own string gives the screen as many heights as it
            has series. Two lines of name, one of price, one of
            census. */}
        <span className="pl-say">
          <span className="t-title pl-name">{model.name}</span>
          <span className="t-caption pl-price">
            {priced === '' ? 'No price on this one' : spread ? `from ${priced}` : priced}
          </span>
          <span className="t-caption pl-count">
            {model.offers.length > 1 ? `${model.offers.length} finishes` : ''}
          </span>
        </span>
      </button>
    </li>
  )
}

function Colour({
  offer,
  material,
  on,
  onChoose,
}: {
  offer: Offer
  material: boolean
  on: boolean
  onChoose: (offer: Offer) => void
}): ReactElement {
  /* The code is the LAST token of the row's own hierarchy cell —
     "HYP B-G-B" splits into a material and a colourway. Read through
     the map it is "Black / Grey / Black"; unread it is exactly the
     code the price file carries, and nothing else. */
  const { code } = splitVariant(offer.leaf)
  const read = colourwayOf(code)
  const mat = materialOf(offer.leaf)
  const say = read.read ? read.say : code

  return (
    <li>
      <button
        type="button"
        className={on ? 't-caption pl-way is-on' : 't-caption pl-way'}
        aria-pressed={on}
        onClick={() => onChoose(offer)}
      >
        {material && mat !== '' ? `${say} · ${mat}` : say}
      </button>
    </li>
  )
}
