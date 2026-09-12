/* ============================================================
   A CATALOGUE (ct-) — SHOWROOM.

   WHAT A DEALER SEES TODAY WHEN THEY OPEN THEIR BIGGEST BRAND.
   Highfield is 588 variants across 7 series, and measured at
   1280x800 on the real seed the catalogue's arrival draws FIVE
   TEXT LINKS in an otherwise empty white page:

     register        NONE
     scale contrast  2.45x     below even Cockpit's 2.5x floor
     stock in view   0 of 588
     type steps      7 of ten, none of them carrying a product

   The plan names it: "the catalogue's Jobs lens is five text links
   floating in white."

   AND THE JOBS LENS WAS A CONSIDERED DECISION, WHICH IS WHY THIS
   DOES NOT SIMPLY FLIP IT BACK. `catalogueLens.ts` records the
   measurement behind it — UX_PASS §12 counted 56 columns, 11
   truncated band labels, 8 chrome verbs and a first column reading
   `kb2JYb4GLH`: 42 things to read before acting. That is a real
   finding and the register really is a bad front door.

   It was compared against the REGISTER, though, and not against the
   gallery. A photographic grid answers "what can I do here" better
   than a list of verbs does — every card carries the thing, its
   price and the act — so the arrival is the stock, and the five
   jobs are controls in the header where a verb belongs. Nothing
   that was reachable stops being reachable.

   AND THE GALLERY HAS THE 588-VARIANT PROBLEM TOO. It drew four
   cards of RU230KAM differing only by "(PVC) WH / (HYP) WH / (PVC)
   LG / (HYP) LG" — four near-identical photographs of one boat.
   `catalogue/fold.ts` is the same fold the place screen takes, and
   `colourway.ts` reads the codes: 604 rows become 67 models, and a
   finish is named rather than coded.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Field, Marque } from '@/ui'
import { markOf } from '@/lib/mark'
import { buildEntries } from '@/features/modules/read'
import { FrozenPhoto } from '@/features/quote/photo'
import { Colourways } from './Colourways'
import { finishLevels, foldModels, leafValues, priceOf } from './fold'
import type { Model } from './fold'
import './catalogue-screen.css'

export interface CatalogueScreenProps {
  entityId: string
  /** open one row in the register underneath — the way to every
   *  column this screen does not draw */
  onOpenRow: (rowId: string) => void
  /** the jobs, as the host already wires them */
  onOpenSheet: () => void
}

export function CatalogueScreen({
  entityId,
  onOpenRow,
  onOpenSheet,
}: CatalogueScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const entity = entities[entityId]

  const models = useMemo(() => {
    if (!entity) return []
    const tables = [entity]
    const entries = buildEntries(tables, rowsByEntity, { facts: true })
    const leaves = leafValues(tables, rowsByEntity)
    return foldModels(entries, leaves, finishLevels(tables, leaves))
  }, [entity, rowsByEntity])

  const typed = query.trim().toLowerCase()
  const shown = typed === '' ? models : models.filter((m) => m.hay.includes(typed))

  const bands = useMemo(() => {
    const by = new Map<string, Model[]>()
    for (const m of shown) by.set(m.series, [...(by.get(m.series) ?? []), m])
    return [...by.entries()]
  }, [shown])

  const rows = models.reduce((n, m) => n + m.offers.length, 0)
  const pictured = models.reduce((n, m) => n + (m.img ? 1 : 0), 0)

  if (!entity) {
    return (
      <div className="ct" data-register="showroom">
        <p className="t-small ct-none">That table is no longer here.</p>
      </div>
    )
  }

  return (
    <div className="ct" data-register="showroom">
      <div className="ct-port">
        <div className="ct-col">
          <header className="ct-head">
            <div className="ct-head-say">
              <Marque as="h1" className="t-marque ct-marque">{entity.name}</Marque>
              <p className="t-small ct-sub">
                {models.length} {models.length === 1 ? 'model' : 'models'} ·{' '}
                {rows.toLocaleString('en-AU')} {rows === 1 ? 'row' : 'rows'} ·{' '}
                {/* PICTURES ON N OF THEM, which is a fact about the
                    file and not a complaint about it — the same
                    sentence the shipped header prints. */}
                {pictured === models.length
                  ? 'every model is photographed'
                  : `${pictured} of them photographed`}
              </p>
            </div>
            <div className="ct-head-do">
              <Field
                label={`Find in ${entity.name}`}
                value={query}
                onChange={setQuery}
                placeholder="A model, a series, a code…"
                type="search"
                autoComplete="off"
              />
              {/* THE SPREADSHEET, LAST AND PLAINLY LABELLED — which
                  is UX_PASS §12's own requirement, kept. It is the
                  way to every column this screen does not draw. */}
              <button type="button" className="ct-sheet" onClick={onOpenSheet}>
                Open the sheet
              </button>
            </div>
          </header>

          {bands.length === 0 ? (
            <p className="t-small ct-none">
              Nothing here matches “{query}”. Clear the search to see all {models.length}.
            </p>
          ) : null}

          {bands.map(([series, inBand]) => (
            <section className="ct-band" key={series || '—'}>
              <p className="ct-band-head">
                <span className="t-label ct-band-name">{series === '' ? entity.name : series}</span>
                <span className="t-caption ct-band-count">
                  {inBand.length} {inBand.length === 1 ? 'model' : 'models'}
                </span>
              </p>
              <ul className="ct-grid">
                {inBand.map((model) => (
                  <Card
                    key={model.key}
                    model={model}
                    kind={entity.kind ?? 'custom'}
                    open={open === model.key}
                    onToggle={() => setOpen(open === model.key ? null : model.key)}
                    onOpenRow={onOpenRow}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function Card({
  model,
  kind,
  open,
  onToggle,
  onOpenRow,
}: {
  model: Model
  kind: string
  open: boolean
  onToggle: () => void
  onOpenRow: (rowId: string) => void
}): ReactElement {
  const first = model.offers[0]
  const { say: priced, spread } = priceOf(model)
  const many = model.offers.length > 1

  return (
    <li className="ct-cell">
      <div className="ct-card" data-kind={kind}>
        <button
          type="button"
          className="ct-face"
          data-press="card"
          aria-expanded={many ? open : undefined}
          onClick={() => {
            if (many) onToggle()
            else if (first) onOpenRow(first.entry.rowId)
          }}
        >
          <span className="ct-well m-lit m-grain">
            <span className="ct-plate" aria-hidden="true">
              <span className="t-display ct-mono">{markOf(model.name)}</span>
            </span>
            <FrozenPhoto
              img={model.img}
              fallbackAlt={model.name}
              className="ct-img"
              w={480}
              h={300}
            />
            <span className="k-rail ct-rail" aria-hidden="true" />
          </span>

          {/* The same fixed line budget every Showroom grid takes:
              rows equalise within ONE grid and every band heading
              starts another, so a card sized by its own string gives
              the screen as many heights as it has bands. */}
          <span className="ct-say">
            <span className="t-title ct-name">{model.name}</span>
            <span className="t-caption ct-price">
              {priced === '' ? 'No price on this one' : spread ? `from ${priced}` : priced}
            </span>
            <span className="t-caption ct-count">
              {many ? `${model.offers.length} finishes` : ''}
            </span>
          </span>
        </button>

        {/* THE FINISHES OPEN UNDER THE CARD THEY BELONG TO, and only
            one card's are open at a time — which is what keeps the
            grid a grid. On the place screen they live in the bar,
            because that screen has one, and this one does not: a
            catalogue is for reading, not for committing to. */}
        {/* ============================================================
            THE FINISHES ARE RENDERS, NOT A LIST OF WORDS.

            They were rows of text — "Light Grey · PVC  $2,770" —
            which is the 588-variant problem solved correctly and
            not solved WELL: the seed holds a distinct photograph
            per variant, so the difference between two codes is a
            thing a person can see rather than a string they decode.
            `Colourways` is reactbits' Chroma Grid inverted, which
            the re-mine calls the best idea in either library for
            this exact problem.
            ============================================================ */}
        {many && open ? (
          <Colourways
            offers={model.offers}
            chosenRowId=""
            material={model.materials.length > 1}
            label={`Finishes of ${model.name}`}
            onChoose={(offer) => onOpenRow(offer.entry.rowId)}
          />
        ) : null}
      </div>
    </li>
  )
}

