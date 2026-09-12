/* ============================================================
   THE COLOURWAY GRID — reactbits Chroma Grid, inverted.

   `docs/research/motion-libraries-remine-2026-09-12.md` calls this
   "the single best idea in either library for our worst-named
   problem", and §7.2 is the port. It is the P1 of the ranked build
   list and until now the finishes were a row of text chips.

   WHAT CHROMA GRID DOES is hold a grid of grayscale tiles and give
   colour back as a hover reward. INVERTED, colour is the CONTENT:
   these are the per-colourway renders of one hull, and the whole
   reason the screen exists is that "B-G-B" and "B-G-LB" are the
   same boat in two finishes. Hover does nothing — a Showroom grid
   is hovered a hundred times a session and a reward that fires on
   every pass is noise. SELECTION is what animates.

   EVERY TILE CARRIES ITS OWN RENDER, and that is the point: the
   seed holds a distinct photograph per variant — the ADV7 rows
   alone point at different files on highfieldboats.com — so the
   difference between two codes is a thing a person can SEE rather
   than a string they have to decode.

   THE CODE IS PRINTED UNDER IT, in the sheet's own characters, in
   mono at the caption step: `(PVC) WH` is what a dealer reads on
   an order and §4 forbids uppercasing or truncating it. The NAME
   is above it where the map could read one — "Black / Grey /
   Black" — and where it could not, the code stands alone rather
   than being half-translated.

   KEYBOARD: the grid is a radiogroup, arrows move, which is
   reactbits' Option Wheel without the wheel. §2 COCKPIT-3 asks for
   keyboard parity and a Showroom screen should still honour it.
   ============================================================ */

import { useRef } from 'react'
import type { ReactElement } from 'react'
import { FrozenPhoto } from '@/features/quote/photo'
import { colourwayOf, splitVariant } from '@/features/quote/colourway'
import type { Offer } from './fold'
import './colourways.css'

export interface ColourwaysProps {
  offers: readonly Offer[]
  /** the row that is chosen, or '' for none */
  chosenRowId: string
  /** show the material beside the colour — only where a model has
   *  more than one, because repeating "HYP" four times says nothing */
  material: boolean
  onChoose: (offer: Offer) => void
  /** what the group is called, for a screen reader */
  label: string
  /** ONE SCROLLING ROW instead of a wrapping grid — for a fixed
   *  bar, where a second row would move the button somebody is
   *  reaching for. */
  strip?: boolean
}

export function Colourways({
  offers,
  chosenRowId,
  material,
  onChoose,
  label,
  strip = false,
}: ColourwaysProps): ReactElement {
  const root = useRef<HTMLDivElement | null>(null)

  /* ARROWS MOVE, HOME AND END JUMP. The grid wraps, because a
     finish list is a ring rather than a line — there is no "first"
     colourway in a way anybody thinks about. */
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const tiles = [...(root.current?.querySelectorAll<HTMLButtonElement>('.cw-tile') ?? [])]
    if (tiles.length === 0) return
    const at = tiles.findIndex((t) => t === document.activeElement)
    let next = at
    if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tiles.length - 1
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (at + 1) % tiles.length
    else next = (at - 1 + tiles.length) % tiles.length
    e.preventDefault()
    tiles[next]?.focus()
    const offer = offers[next]
    if (offer) onChoose(offer)
  }

  return (
    <div
      className={strip ? 'cw cw--strip' : 'cw'}
      role="radiogroup"
      aria-label={label}
      /* THE GROUP IS FOCUSABLE so the arrows have somewhere to start
         when a tab lands on it rather than on a tile — which is what
         a roving tabindex means. */
      tabIndex={-1}
      ref={root}
      onKeyDown={onKey}
    >
      {offers.map((offer, i) => {
        const { code, material: mat } = splitVariant(offer.leaf)
        const read = colourwayOf(code)
        const clean = mat.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
        const on = offer.entry.rowId === chosenRowId
        /* THE NAME WHERE THE MAP COULD READ ONE, and the code on its
           own where it could not — never half of each. */
        const say = read.read ? read.say : code

        return (
          <button
            key={offer.entry.rowId}
            type="button"
            role="radio"
            aria-checked={on}
            className={on ? 'cw-tile is-on' : 'cw-tile'}
            /* only the chosen tile is in the tab order; arrows do the
               rest, which is what a radiogroup means */
            tabIndex={on || (chosenRowId === '' && i === 0) ? 0 : -1}
            style={{ '--i': Math.min(i, 10) } as Record<string, number>}
            onClick={() => onChoose(offer)}
          >
            <span className="cw-well">
              <FrozenPhoto
                img={offer.entry.img}
                fallbackAlt={`${say} — ${offer.entry.label}`}
                className="cw-img"
                w={240}
                h={150}
              />
            </span>
            <span className="cw-say">
              <span className="t-caption cw-name">{say}</span>
              <span className="cw-line">
                <span className="cw-code">{code}</span>
                {material && clean !== '' ? <span className="cw-mat">{clean}</span> : null}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
