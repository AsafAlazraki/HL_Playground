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
   ============================================================ */
import type { CSSProperties, JSX } from 'react'
import { plural } from './helpers'
import type { BandChip } from './useWholeTable'

export function BandStrip({
  bands,
  onReveal,
}: {
  bands: BandChip[]
  onReveal: (sectionId: string) => void
}): JSX.Element | null {
  if (bands.length === 0) return null

  return (
    <div className="tb-strip">
      <span className="tb-strip-label mono-label">Sections</span>
      <div className="tb-strip-rail" role="group" aria-label="Column sections">
        {bands.map((b) => {
          const cols = plural(b.count, 'column', 'columns')
          const style = { ['--tb-band-ink' as string]: b.ink } as CSSProperties
          return (
            <button
              key={b.id}
              type="button"
              className={'tb-strip-chip' + (b.folded ? ' tb-strip-chip-shut' : '')}
              style={style}
              aria-label={
                b.folded
                  ? `${b.name} — ${cols}, folded. Open them and bring them into view.`
                  : `${b.name} — ${cols}. Bring them into view.`
              }
              title={
                b.folded
                  ? `${b.name} — ${cols}, folded away. Click to open them and scroll to them.`
                  : `${b.name} — ${cols}. Click to scroll to them.`
              }
              onClick={() => onReveal(b.id)}
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
