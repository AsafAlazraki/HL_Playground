/* ============================================================
   CARD — the component. The measurement (612 self-drawn card
   treatments across 36 app stylesheets) and the press argument
   are in card.css.

   THE ONE DECISION THIS COMPONENT MAKES FOR YOU. Pass
   `onActivate` and you get a real <button>; leave it off and you
   get a <div>. There is no third option and no `as` prop, because
   the failure this prevents is the common one: a div with an
   onClick, which has no role, no tab stop, no Enter or Space, and
   no focus ring — and looks completely correct on screen. Here
   the pressable LOOK and the pressable BEHAVIOUR arrive together
   or not at all.

   The consequence to know about: an activating Card must not
   contain a Button. Nested interactive elements are invalid HTML
   and the inner one is unreachable in some screen readers. If a
   card needs both a whole-card target and its own actions, the
   card is a <div> and the target is a Button inside it.

   NO `className`, NO `style` — see Button.tsx for why that is the
   mechanism rather than the manners. `kind` and `id` are the only
   attributes that pass through, and `kind` goes to `data-kind`,
   which is how ds.css:2163 already resolves `--kind`.
   ============================================================ */

import type { ReactNode } from 'react'
import './card.css'

export type CardTone = 'raised' | 'flat' | 'sunken'
export type CardPad = 'none' | 'sm' | 'md' | 'lg'

/* The eight kinds ds.css:2163-2170 declares, named rather than
   left as `string` so a typo is a type error instead of a card
   that silently loses its hue. */
export type CardKind =
  | 'boat'
  | 'motor'
  | 'trailer'
  | 'accessory'
  | 'package'
  | 'dealer'
  | 'custom'
  | 'join'

const TONE: Record<CardTone, string> = {
  raised: 'ui-card--raised',
  flat: 'ui-card--flat',
  sunken: 'ui-card--sunken',
}

const PAD: Record<CardPad, string> = {
  none: 'ui-card--pad-none',
  sm: 'ui-card--pad-sm',
  md: 'ui-card--pad-md',
  lg: 'ui-card--pad-lg',
}

export interface CardProps {
  children: ReactNode
  tone?: CardTone
  pad?: CardPad
  /** What this card IS. Sets `data-kind`, which ds.css resolves to
      `--kind`; card.css draws it as a 6% ground, the mix the
      module tile already measured at 4.5:1 for the name on it. */
  kind?: CardKind
  /** Present ⇒ the whole card is a button. */
  onActivate?: () => void
  /** An accessible name for the card, when the card's own content
      does not read as one — a tile whose visible text is a number,
      say. Only meaningful on an activating card. */
  label?: string
  /** The current one of a set. Drawn from `aria-current`, so the
      look cannot exist without the announcement. */
  current?: boolean
  id?: string
}

export function Card({
  children,
  tone = 'raised',
  pad = 'md',
  kind,
  onActivate,
  label,
  current = false,
  id,
}: CardProps) {
  const classes = ['ui-card', TONE[tone], PAD[pad]]
  if (onActivate) classes.push('ui-card--action')

  const shared = {
    id,
    className: classes.join(' '),
    'data-kind': kind,
    'aria-current': current || undefined,
  }

  if (onActivate) {
    return (
      <button {...shared} type="button" aria-label={label} onClick={onActivate}>
        {children}
      </button>
    )
  }

  return <div {...shared}>{children}</div>
}
