/* ============================================================
   PRODUCT STAGE — the thing being sold, present and large.

   `DESIGN_SYSTEM.md` §2 makes this a REQUIREMENT of the Showroom
   register rather than a nicety: "the thing being sold is present,
   large, and photographic. Not an icon, not a placeholder, not a
   200px thumbnail in a white box." The build before the rebuild
   drew the hull at 264x176 inside a white card on a screen whose
   whole subject is that hull, while the original HelmLogic —
   which nobody thinks is beautiful — gave it half the window.

   THIS IS NOT THE OTHER `PictureWell`. `QuoteBuild.tsx:2776` has a
   local helper of that name drawing a 264x176 thumbnail for a line
   on the ledger. That one is correct for what it does. This is the
   stage, and the two exist at once until the configurator is
   rebuilt on this.

   THE RENDER CROSSFADES, 260ms, OPACITY ONLY. `PHASE_TWO` §4.1
   settled that and it is worth saying why it does NOT get §5's
   "materialize" treatment — blur and scale together — even though
   that is the newer rule. Materialize is for a GLASS SURFACE
   arriving: a sheet, a panel, a thing made of material. A
   photograph of a boat is not a material arriving, it is the same
   boat in a different colour, and a person flicking through 588
   variants sees this swap dozens of times a minute. The frequency
   table decides it: at that rate, reduce.

   `contain`, NEVER `cover`. A cropped boat is a boat with its bow
   cut off, and the one thing a dealer turns the screen around for
   is the shape of the hull.
   ============================================================ */

import { useState, type ReactNode } from 'react'
import './productstage.css'

export interface StagePicture {
  src: string
  /** What it is a picture OF. Never "image" — a screen reader
   *  reading "image" has been told nothing. */
  alt: string
  /** The colourway or angle this one shows, if there is more than
   *  one. Drawn as the caption under the stage. */
  says?: string
}

export interface ProductStageProps {
  pictures: readonly StagePicture[]
  /** Which one is showing. Controlled, because on a configurator
   *  the colour chips and the arrows move the same value. */
  index?: number
  onIndex?: (i: number) => void
  /** Sits over the stage, bottom-left — a kind chip, a badge. */
  overlay?: ReactNode
  /** WHY there is no picture, when there is none. A sentence, not
   *  a broken-looking glyph: "no picture" is a fact about the price
   *  file and the dealer is the person who can fix it. */
  emptyBecause?: string
}

export function ProductStage({
  pictures,
  index,
  onIndex,
  overlay,
  emptyBecause = 'No picture on this one yet.',
}: ProductStageProps) {
  /* Uncontrolled when nobody passes an index, so the stage is
     useful on its own before a screen wires the chips to it. */
  const [own, setOwn] = useState(0)
  const at = Math.min(index ?? own, Math.max(0, pictures.length - 1))
  const go = (i: number) => {
    const next = (i + pictures.length) % pictures.length
    if (onIndex) onIndex(next)
    else setOwn(next)
  }

  /* THE FLAG THAT MAKES THE CROSSFADE REPLAY — and it is state,
     not a ref, for the same reason `PriceBar`'s delta is.

     The first draft held the last `src` in a ref and compared
     against it during render. Under StrictMode React renders
     twice: pass one writes the ref, pass two compares the new src
     against the value it has just written, finds them equal, and
     sets `changed` to false. The fade never ran once. Nothing
     looked broken — the right picture was always on screen — which
     is why the linter flagging `refs during render` is worth
     obeying rather than silencing. Eleven warnings pointed at
     exactly this.

     Setting state during render is React's documented way to
     adjust state when a prop changes, and the guard makes it
     idempotent under a double render. */
  const shown = pictures[at]
  const [seen, setSeen] = useState<{ src: string | null; changed: boolean }>({
    src: shown?.src ?? null,
    changed: false,
  })
  if (shown && seen.src !== shown.src) {
    setSeen({ src: shown.src, changed: seen.src !== null })
  }
  const changed = shown ? seen.changed && seen.src === shown.src : false

  /* ============================================================
     A PICTURE THAT DOES NOT ARRIVE IS NOT A PICTURE.

     Measured on the Stabicraft 1450 Explorer: the seed carries an
     absolute URL to the manufacturer's own site, the request fails,
     and this stage — the largest element on the screen and the
     entire reason the register is called Showroom — drew Chrome's
     broken-image box with the alt string beside it. `naturalWidth`
     was 0 and `complete` was true, which is exactly the pair that
     means "failed", and nothing here was asking.

     `FrozenPhoto` already refuses to draw a broken image elsewhere
     in the app; the stage never got the same treatment. A failed
     src falls back to the sentence, which is the honest thing on
     screen and also tells the dealer — the person who can fix it —
     what to fix.

     KEYED BY SRC, so a different colourway gets its own verdict
     rather than inheriting the last one's failure, and a set that
     retries does not stay dead.
     ============================================================ */
  const [broken, setBroken] = useState<Record<string, true>>({})
  const dead = shown ? broken[shown.src] === true : false

  if (!shown || dead) {
    return (
      <div className="ui-stage" data-empty="true">
        <p className="ui-stage-empty t-small">{emptyBecause}</p>
      </div>
    )
  }

  const many = pictures.length > 1

  return (
    <div className="ui-stage">
      {/* ============================================================
          THE FRAME IS LIT AND GRAINED, which is the whole of §2's
          SHOWROOM-2 requirement — "real depth, light from one
          direction" — on the one element in the app that is
          entirely about a product.

          The light is `--kind`'s: a boat is lit indigo and a motor
          amber, so the glow is a fact about the thing rather than
          an effect. The grain is the tooth that stops a 700px
          gradient banding, and it only became worth having when §9
          deleted the 6% alpha cap that made every material token in
          this system invisible.

          Both are pseudo-elements underneath the picture, so the
          crossfade below is untouched and nothing had to be
          restructured to take them.
          ============================================================ */}
      <div className="ui-stage-frame m-lit m-grain">
        <img
          className="ui-stage-img"
          key={shown.src}
          src={shown.src}
          alt={shown.alt}
          data-fade={changed || undefined}
          decoding="async"
          /* THE FIRST ONE IS THE SUBJECT OF THE SCREEN. Lazy-loading
             the thing a person came to look at trades the only
             impression that matters for a request nobody saved. */
          loading={at === 0 ? 'eager' : 'lazy'}
          onError={() => setBroken((b) => (b[shown.src] ? b : { ...b, [shown.src]: true }))}
        />

        {overlay ? <div className="ui-stage-over">{overlay}</div> : null}

        {many ? (
          <>
            <button
              type="button"
              className="ui-stage-arrow"
              data-side="back"
              onClick={() => go(at - 1)}
              aria-label="Previous picture"
            >
              <Chevron dir="back" />
            </button>
            <button
              type="button"
              className="ui-stage-arrow"
              data-side="on"
              onClick={() => go(at + 1)}
              aria-label="Next picture"
            >
              <Chevron dir="on" />
            </button>
          </>
        ) : null}
      </div>

      {many || shown.says ? (
        <div className="ui-stage-foot">
          {shown.says ? <span className="t-small ui-stage-says">{shown.says}</span> : null}
          {many ? (
            <span className="t-mono-sm ui-stage-count" aria-live="polite">
              {at + 1} of {pictures.length}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Drawn rather than typed. A chevron character renders at a
 *  different weight and baseline in every font on every platform,
 *  and this one sits inside a 32px circle over a photograph. */
function Chevron({ dir }: { dir: 'back' | 'on' }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={dir === 'back' ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
