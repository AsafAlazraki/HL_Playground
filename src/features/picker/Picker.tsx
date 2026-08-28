/* ============================================================
   ONE DROPDOWN, AND IT USED TO BE THE OPERATING SYSTEM'S.

   THE FAULT. The board's sort and the register's sort were native
   `<select>` elements. A native select draws the OS menu: its own
   typeface, its own metrics, its own focus ring, its own row
   height — in the middle of a screen built to a design system with
   a token for every one of those. It is the one control in this
   application that ignores every rule the rest of it keeps, and on
   Windows it is unmistakably not part of the app.

   WHAT A NATIVE SELECT GIVES FREE, AND WHAT THIS THEREFORE OWES.
   Replacing it is only worth doing if none of this is lost:

     · arrows move, Home and End jump, Escape closes
     · typing jumps to the option that starts with what you typed
     · the trigger says `aria-expanded` and owns the listbox
     · options are `role="option"` with `aria-selected`
     · focus returns to the trigger when it closes, always
     · a click anywhere outside dismisses it
     · the current value is readable without opening it

   Every one of those is implemented below and none is decoration.
   A styled control that loses the keyboard is a worse control than
   the ugly one it replaced.

   WHY NOT A LIBRARY. This is the app's only dropdown and it has
   four call sites; a headless menu package is 40kB and a second
   set of conventions for focus, portals and ids to reconcile with
   the ones this app already has.

   IT IS NOT A COMBOBOX. There is no typing INTO it, no filtering
   and no free text — those are a different control answering a
   different question, and `QuoteStart`'s finder already is one.
   ============================================================ */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'

export interface PickerOption<T extends string> {
  id: T
  label: string
  /** one line under the label, where a choice needs explaining.
   *  Most do not — a list where every row carries a sentence is a
   *  list nobody reads. */
  under?: string
}

export interface PickerProps<T extends string> {
  /** the small word before the value — "Sort", "Show". A LABEL, so
   *  §3 lets it be uppercase; the value beside it never is. */
  label: string
  value: T
  options: readonly PickerOption<T>[]
  onPick: (id: T) => void
  /** said instead of the options when there is nothing to choose —
   *  a control with one option is not a choice, and one that is
   *  currently inert should say why rather than look broken */
  disabledWhy?: string
  /** for the trigger, where the visible label is not enough */
  ariaLabel?: string
}

export function Picker<T extends string>({
  label,
  value,
  options,
  onPick,
  disabledWhy,
  ariaLabel,
}: PickerProps<T>): JSX.Element {
  const [open, setOpen] = useState(false)
  /* WHICH ROW THE KEYBOARD IS ON, which is not the same as which is
     chosen: you walk past options without choosing them, and a list
     that committed on every arrow press would be a control you
     cannot browse. */
  const [at, setAt] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const goRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const typed = useRef({ text: '', at: 0 })
  const id = useId()

  const chosen = options.find((o) => o.id === value) ?? options[0]
  const shut = useCallback(
    (toTrigger: boolean) => {
      setOpen(false)
      /* FOCUS GOES BACK TO THE TRIGGER, always. Without it a person
         who closes with Escape is dropped at the top of the
         document and has to tab all the way back. */
      if (toTrigger) goRef.current?.focus()
    },
    [],
  )

  /* OPENING PUTS THE CURSOR ON THE CURRENT VALUE, not on the first
     row — you open a sort control to change FROM something. */
  const show = (): void => {
    const i = options.findIndex((o) => o.id === value)
    setAt(i < 0 ? 0 : i)
    setOpen(true)
  }

  /* A PRESS OUTSIDE DISMISSES. `pointerdown` rather than `click`,
     so the menu is gone before whatever was pressed acts — a menu
     that closes on the click it did not receive feels like a
     half-press. */
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) shut(false)
    }
    window.addEventListener('pointerdown', away, true)
    return () => window.removeEventListener('pointerdown', away, true)
  }, [open, shut])

  /* THE OPTION UNDER THE CURSOR IS SCROLLED TO, because a list
     taller than its box otherwise moves the selection off screen
     and the arrows appear to stop working. */
  useEffect(() => {
    if (!open) return
    const row = listRef.current?.children[at] as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [open, at])

  const onKey = (e: ReactKeyboardEvent): void => {
    if (disabledWhy) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      shut(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAt((n) => (n + 1) % options.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAt((n) => (n - 1 + options.length) % options.length)
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setAt(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setAt(options.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const pick = options[at]
      if (pick) onPick(pick.id)
      shut(true)
      return
    }
    /* TYPE-AHEAD, which is the half of a native select people use
       without noticing. Letters typed within a second accumulate,
       so "ne" finds "Newest first" rather than jumping to N and
       then to E. */
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now()
      const t = typed.current
      t.text = now - t.at > 900 ? e.key : t.text + e.key
      t.at = now
      const want = t.text.toLowerCase()
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(want))
      if (hit >= 0) setAt(hit)
    }
  }

  return (
    <div className={`pk${disabledWhy ? ' is-off' : ''}`} ref={rootRef}>
      <span className="pk-label" id={`${id}-lab`}>
        {label}
      </span>
      <button
        type="button"
        ref={goRef}
        className="pk-go"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-labelledby={ariaLabel ? undefined : `${id}-lab ${id}-val`}
        aria-label={ariaLabel}
        aria-disabled={disabledWhy ? true : undefined}
        title={disabledWhy}
        onKeyDown={onKey}
        onClick={() => {
          if (disabledWhy) return
          if (open) shut(true)
          else show()
        }}
      >
        <span className="pk-val" id={`${id}-val`}>
          {chosen?.label ?? ''}
        </span>
        <CaretDown size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          className="pk-list"
          id={`${id}-list`}
          role="listbox"
          ref={listRef}
          aria-activedescendant={`${id}-o${at}`}
          tabIndex={-1}
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.id === value}
              className={`pk-opt${i === at ? ' is-at' : ''}${o.id === value ? ' is-on' : ''}`}
              /* `pointerdown` and not `click`: the outside-press
                 handler above runs on pointerdown too, and a row
                 that waited for the click would be gone by then. */
              onPointerDown={(e) => {
                e.preventDefault()
                onPick(o.id)
                shut(true)
              }}
              onPointerEnter={() => setAt(i)}
            >
              <span className="pk-tick" aria-hidden="true">
                {o.id === value ? <Check size={ICON_SIZE.tiny} weight="bold" /> : null}
              </span>
              <span className="pk-opt-say">
                <span className="pk-opt-name">{o.label}</span>
                {o.under ? <span className="pk-opt-under">{o.under}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
