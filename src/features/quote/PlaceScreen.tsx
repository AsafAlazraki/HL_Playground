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
import { buildEntries } from '@/features/modules/read'
import {
  finishLevels,
  foldModels,
  leafValues,
  priceOf,
} from '@/features/catalogue/fold'
import type { Model, Offer } from '@/features/catalogue/fold'
import { useSceneKind } from './scene'
import { createViewFor } from '@/features/views/viewDefs'
import { useProjectStore } from '@/store/useProjectStore'
import { Button, Field, Marque } from '@/ui'
import type { QuoteDoor } from './start'
import { marqueOf } from './marque'
import { FrozenPhoto } from './photo'
import { Colourways } from '@/features/catalogue/Colourways'
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
              <Marque as="h1" className="t-hero pl-marque">{lockup.model || door.name}</Marque>
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
      <footer className="pl-bar" data-picked={pick ? true : undefined}>
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
        {/* ============================================================
            AND THE FINISHES ARE RENDERS. They were text chips —
            "Light Grey · PVC" — which told a dealer which row they
            were on and showed them nothing. The seed carries a
            distinct photograph per variant, so `Colourways` (Chroma
            Grid, inverted) puts the actual hull in front of them.

            IT IS THE STRIP VARIANT HERE, one row that scrolls rather
            than a grid that wraps: this bar is fixed, and a bar that
            grows a second row moves the button a person is reaching
            for — the one thing a commit surface must never do.
            ============================================================ */}
        {pick && pick.model.offers.length > 1 ? (
          <Colourways
            offers={pick.model.offers}
            chosenRowId={pick.offer.entry.rowId}
            material={pick.model.materials.length > 1}
            label={`Finishes of ${pick.model.name}`}
            strip
            onChoose={(next) => setPick({ model: pick.model, offer: next })}
          />
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
  /* NIMBUS'S TILE WHERE THERE IS A PHOTOGRAPH, ZODIAC'S WHERE THERE
     IS A RENDER — driven live 2026-09-15. Which is which is read from
     the picture's own pixels (`scene.ts`), never assumed, so nothing
     is stretched to look like a photograph. */
  const scene = useSceneKind(model.img?.src)
  const tile = marqueOf(model.name)
  const first = model.offers[0]
  /* ONE FIGURE WHEN THE FINISHES COST THE SAME, which on Highfield
     they do — all seven ADV7 colourways are $105,930. `priceOf`
     carries the rule and the reason neither figure is computed. */
  const { say: priced, spread } = priceOf(model)

  return (
    <li className="pl-cell">
      <button
        type="button"
        className={on ? 'pl-card is-mine' : 'pl-card'}
        data-kind={kind}
        data-press="card"
        aria-pressed={on}
        data-scene={scene === 'scene' ? 'scene' : 'studio'}
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
        </span>

        {/* THE SAME FIXED LINE BUDGET THE PICKER'S CARDS TAKE, for
            the same reason: the grid rows equalise within ONE grid
            and every series heading starts another, so a card sized
            by its own string gives the screen as many heights as it
            has series. Two lines of name, one of price, one of
            census. */}
        <span className="pl-say">
          {/* THE MODEL, NOT THE SKU. "Stacer - 359 Skimma (HS)" is a maker,
              a model and a trim welded together; on the maker's own
              shelf the maker is the masthead and the trim is a caption.
              `marqueOf` takes it apart and nothing is dropped. */}
          <span className="t-title pl-name">{tile.model || model.name}</span>
          {tile.trim ? <span className="t-caption pl-trim">{tile.trim}</span> : null}
          <span className="t-caption pl-price">
            {priced === '' ? 'No price on this one' : spread ? `from ${priced}` : priced}
          </span>
          <span className="t-caption pl-count">
            {model.offers.length > 1 ? `${model.offers.length} finishes` : ''}
          </span>
        </span>
      <span className="pl-go" aria-hidden="true">
          Build
        </span>
      </button>
    </li>
  )
}
