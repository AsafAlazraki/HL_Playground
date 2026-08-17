/* ============================================================
   BAND STRIP — the map of a wide sheet, above the sheet.

   Eleven bands and fifty-eight columns mean "Hull Only Pricing" is
   forty columns to the right of where you are looking. The strip is
   how you get there: the section names, in column order, as one quiet
   row of chips. Pick one and the sheet scrolls to it — opening it
   first if it was folded.

   It is a MAP, not a second toolbar, so it does exactly one thing per
   chip and says one thing per chip: the band's name, how many columns
   it holds, and whether it is folded. Folding a single band stays
   where it already was, on the band's own header over its columns.

   Drawing-office notation carries the state instead of an icon:
   an open band is a name over its hairline bracket; a folded one is a
   solid chip in its own ink. The count never changes between the two,
   so the chip never disagrees with itself about how big the band is.

   AND IT NOW SAYS WHERE YOU ARE, which is the one thing a map has to
   do and the one thing this one did not. Eight identical chips over a
   58-column register answered "what sections are there" and never
   "which one am I looking at" — so the reader had to read a column
   heading to find out where a chip had put them.

   TWO MARKS, ONE MEASUREMENT (`useWholeTable`, and it is the same
   geometry `revealBand` scrolls with, so the strip and the scroll can
   never disagree):

     · the band the window's left edge is in is LIT, and named in
       words at the head of the strip;
     · a chip whose scroll position is the one the sheet is already at
       is marked unavailable rather than offered. On Highfield
       Inflatables the last three bands all clamp to the same maximum
       scroll, so once you are there, pressing any of them changes
       nothing — three chips that looked like doors and were not. They
       are not broken; those columns are already on screen, and the chip
       now says so.

   `aria-disabled` AND A LIVE onClick GUARD, not the `disabled`
   attribute: a disabled button drops out of the tab order, taking its
   own explanation with it, and the explanation is the whole point. The
   press is a no-op and the accessible name says why.
   ============================================================ */
import type { CSSProperties, JSX } from 'react'
import { plural } from './helpers'
import type { BandChip } from './useWholeTable'

export function BandStrip({
  bands,
  atBandName,
  onReveal,
}: {
  bands: BandChip[]
  /** the band the window is on, in words */
  atBandName?: string | undefined
  onReveal: (sectionId: string) => void
}): JSX.Element | null {
  if (bands.length === 0) return null

  return (
    <div className="tb-strip">
      <span className="tb-strip-label mono-label">Sections</span>
      {/* THE REASON, IN WORDS, BESIDE THE THING IT EXPLAINS. A lit chip
          says "here"; this says which, and it is what makes the inert
          chips read as "already on screen" rather than as broken.
          `aria-live` because it changes under a scroll the reader is
          driving, and politely because it is never urgent. */}
      {atBandName ? (
        <span className="tb-strip-at" aria-live="polite">
          In view <b>{atBandName}</b>
        </span>
      ) : null}
      <div className="tb-strip-rail" role="group" aria-label="Column sections">
        {bands.map((b) => {
          const cols = plural(b.count, 'column', 'columns')
          const style = { ['--tb-band-ink' as string]: b.ink } as CSSProperties
          const say = b.folded
            ? `${b.name} — ${cols}, folded. Open them and bring them into view.`
            : b.stuck
              ? `${b.name} — ${cols}, already in view. Nothing to scroll to.`
              : `${b.name} — ${cols}. Bring them into view.`
          return (
            <button
              key={b.id}
              type="button"
              className={
                'tb-strip-chip' +
                (b.folded ? ' tb-strip-chip-shut' : '') +
                (b.here ? ' tb-strip-chip-here' : '') +
                (b.stuck ? ' tb-strip-chip-stuck' : '')
              }
              style={style}
              aria-current={b.here ? 'true' : undefined}
              aria-disabled={b.stuck ? true : undefined}
              aria-label={say}
              title={
                b.folded
                  ? `${b.name} — ${cols}, folded away. Click to open them and scroll to them.`
                  : b.stuck
                    ? `${b.name} — ${cols}. These columns are already on screen.`
                    : `${b.name} — ${cols}. Click to scroll to them.`
              }
              onClick={() => {
                /* the press that would change nothing does nothing, and
                   the chip already says why — see the header */
                if (b.stuck) return
                onReveal(b.id)
              }}
            >
              <span className="tb-strip-name">{b.name}</span>
              <span className="tb-strip-count">{b.count}</span>
              <span className="tb-strip-rule" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
