/* ============================================================
   BUTTON — the component. The measurement and the four-part
   answer to CLAUDE.md's "no shared override layer" rule are in
   button.css; this file is what enforces two of them.

   NO `className`, NO `style`. Both are omitted from the props
   type, which is not tidiness — it is the mechanism that makes
   this a primitives layer and not an override layer. A feature
   that adopts <Button> has no way to keep its old `.xx-btn` rule
   pointing at the same element, so adopting means DELETING. If a
   screen needs a look this file does not have, the answer is a
   new tone in button.css, argued once, for every screen. That is
   the difference between one layer and 34 of them.

   Everything else native passes through — `data-*`, `aria-*`,
   `onKeyDown`, `title`, `form`, `autoFocus`. The two blocked
   props are exactly the two that let a caller repaint.

   `type` DEFAULTS TO "button". A <button> with no type submits
   the form it is inside, which is the most common silent bug in
   this whole category and is why the default is here rather than
   at 278 call sites.
   ============================================================ */

import { useId, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from 'react'
import './button.css'

export type ButtonTone = 'primary' | 'neutral' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

/* Full class strings, never `'ui-btn--' + tone`. A partial class
   in a literal is read by tools/check-styles.mjs as a class the
   TSX writes and no stylesheet declares — a new orphan, and the
   baseline may not grow. Whole names also mean grep finds every
   use of a tone. */
const TONE: Record<ButtonTone, string> = {
  primary: 'ui-btn--primary',
  neutral: 'ui-btn--neutral',
  ghost: 'ui-btn--ghost',
  danger: 'ui-btn--danger',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'ui-btn--sm',
  md: 'ui-btn--md',
  lg: 'ui-btn--lg',
}

type NativeButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'className' | 'style' | 'children' | 'disabled' | 'aria-disabled'
>

export interface ButtonProps extends NativeButtonProps {
  /** The word on the button. A verb, in sentence case — rule 3
      bars uppercase on a button, because uppercasing is lossy. */
  children: ReactNode
  tone?: ButtonTone
  size?: ButtonSize
  /** Fill the width of whatever the caller put this in. */
  block?: boolean
  /** A glyph beside the word. Decoration: it is marked
      aria-hidden and never carries the meaning on its own. */
  glyph?: ReactNode
  /** WHY this cannot be done, as a sentence — rule 10. Setting it
      refuses the button: the click is blocked and the reason is
      drawn beneath the control, where the refusal is.

      There is no `disabled` prop on purpose. A `disabled` button
      cannot be focused or hovered and is skipped by a screen
      reader, so the person who needs the reason is the one person
      who cannot reach it. This keeps the control in the tab order
      and marks it `aria-disabled`. */
  refusedBecause?: string
}

export function Button({
  children,
  tone = 'neutral',
  size = 'md',
  block = false,
  glyph,
  refusedBecause,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const reasonId = useId()
  const refused = Boolean(refusedBecause)

  const classes = ['ui-btn', TONE[tone], SIZE[size]]
  if (block) classes.push('ui-btn--block')

  /* The reason is joined to any describedby the caller already
     set rather than replacing it — a refused control often also
     has a hint, and silently dropping one of the two is the kind
     of bug that only shows up in a screen reader. */
  const describedBy = [rest['aria-describedby'], refused ? reasonId : undefined]
    .filter(Boolean)
    .join(' ')

  const button = (
    <button
      {...rest}
      type={type}
      className={classes.join(' ')}
      aria-disabled={refused || undefined}
      aria-describedby={describedBy || undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        /* aria-disabled does not stop a click the way `disabled`
           does — that is the price of staying focusable, and this
           is where it is paid. */
        if (refused) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
    >
      {glyph ? (
        <span className="ui-btn-glyph" aria-hidden="true">
          {glyph}
        </span>
      ) : null}
      {children}
    </button>
  )

  /* No wrapper unless there is something to wrap. The common case
     composes exactly like a bare <button>, so dropping one into a
     flex row does not need the caller to know this exists. */
  if (!refused) return button

  return (
    <span className="ui-btn-slot">
      {button}
      <span className="ui-btn-why" id={reasonId}>
        {refusedBecause}
      </span>
    </span>
  )
}
