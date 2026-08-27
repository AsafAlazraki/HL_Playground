/* ============================================================
   TOKENS — the words that are also controls.

   The whole visual trick, and it is three rules of CSS: a native
   <select> is stretched over the token at opacity 0, and a plain <i>
   paints the word underneath it. The user reads prose and gets a real
   dropdown — with real keyboard behaviour, a real focus ring and the
   real picker on touch — on click. We do NOT rebuild it as a custom
   popover; the native control is why it feels instant.

   Editable tokens carry an inset hairline underline. Read-only ones
   do not. That single difference is how a person knows which words
   they can change, and it is why a collapsed card reads as a
   sentence rather than as a form.
   ============================================================ */

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react'
import { X } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { TokenRole } from './describe'

export interface TokenOption {
  value: string
  label: string
}

export interface TokenGroup {
  label: string
  options: TokenOption[]
}

const cls = (role: TokenRole, live: boolean, extra?: string): string =>
  ['cn-tok', `cn-tok--${role}`, live ? 'is-live' : '', extra ?? ''].filter(Boolean).join(' ')

/** THE WORD BEING POINTED AT. The composer's footer names the choice
 *  still to be made and puts the cursor in it; this is the second
 *  half of that — the word lights up so the eye lands where the
 *  cursor went. It is colour and nothing else, so it survives
 *  `prefers-reduced-motion` intact (§4: movement goes, colour stays). */
const seeking = (sought: boolean, extra: string): string =>
  sought ? `${extra} is-sought` : extra

/** A word that is only a word — "When", "and", the comma. */
export function Word({ text, tight }: { text: string; tight?: boolean }): ReactElement {
  return <span className={tight ? 'cn-word is-tight' : 'cn-word'}>{text}</span>
}

/** A word that carries meaning but cannot be changed here. */
export function ReadToken({ role, text }: { role: TokenRole; text: string }): ReactElement {
  return <span className={cls(role, false)}>{text}</span>
}

/* ---------------------------------------------------------- */
/* Select                                                     */
/* ---------------------------------------------------------- */

export interface SelectTokenProps {
  role: TokenRole
  /** the word painted under the select */
  face: string
  value: string
  options?: TokenOption[]
  groups?: TokenGroup[]
  onChange: (value: string) => void
  label: string
  title?: string
  /** nothing has been chosen here yet: the face is a slot, not a name */
  unchosen?: boolean
  /** THE SENTENCE'S OWN NAME FOR THIS WORD, written into the DOM.
   *
   *  The composer's footer says which choice is still to be made —
   *  "Pick the column this rule looks at." — and rule 10 asks a
   *  refusal to say why WHERE the thing is refused. A sentence can
   *  run to a dozen words and the unanswered one is not always the
   *  one your eye lands on, so the footer is a control that puts the
   *  cursor in the exact word it is talking about. This is the
   *  address it uses. */
  tokenId?: string
  /** the footer has just pointed at this word */
  sought?: boolean
}

export function SelectToken({
  role,
  face,
  value,
  options,
  groups,
  onChange,
  label,
  title,
  unchosen = false,
  tokenId,
  sought = false,
}: SelectTokenProps): ReactElement {
  /* a value that is no longer in the list would silently select the
     first option; keep it visible instead so the user sees the truth */
  const flat = groups ? groups.flatMap((g) => g.options) : (options ?? [])
  const known = flat.some((o) => o.value === value)

  return (
    <span
      className={cls(role, true, seeking(sought, unchosen ? 'cn-tok--sel is-unset' : 'cn-tok--sel'))}
      title={title}
      data-tok={tokenId}
    >
      <select
        className="cn-tok-input"
        value={value}
        aria-label={label}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {/* An unanswered slot keeps its own face at the top of the list
            and CANNOT BE CHOSEN: "a column" is the absence of a choice,
            not one of the choices. A value that has gone missing stays
            selectable so the truth is visible rather than silently
            replaced by whatever sorts first. */}
        {!known && (
          <option value={value} disabled={value === ''}>
            {face}
          </option>
        )}
        {groups
          ? groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))
          : (options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
      </select>
      <i className="cn-tok-face">{face}</i>
    </span>
  )
}

/* ---------------------------------------------------------- */
/* Typed value                                                */
/* ---------------------------------------------------------- */

export interface InputTokenProps {
  role: TokenRole
  value: string
  onCommit: (value: string) => void
  label: string
  /** 'number' | 'date' | 'text' */
  type?: 'number' | 'date' | 'text'
  /** offered as native suggestions, never as a cage */
  suggestions?: string[]
  placeholder?: string
  /** nothing has been typed here yet — the same question the
   *  unanswered column asks, and it is drawn the same way */
  unchosen?: boolean
  /** see `SelectTokenProps.tokenId` */
  tokenId?: string
  /** the footer has just pointed at this word */
  sought?: boolean
}

/** A number takes a typed input, not a list of every number anyone has
 *  ever entered. Text takes one too, with what is already in the
 *  columns offered as suggestions. */
export function InputToken({
  role,
  value,
  onCommit,
  label,
  type = 'text',
  suggestions,
  placeholder,
  unchosen = false,
  tokenId,
  sought = false,
}: InputTokenProps): ReactElement {
  const [draft, setDraft] = useState(value)
  const listId = useId()
  const dirty = useRef(false)

  useEffect(() => {
    if (!dirty.current) setDraft(value)
  }, [value])

  /* commits the value the field actually holds, never the one this
     render closed over — typing and leaving in the same tick must not
     be able to lose a keystroke */
  const commit = (next: string): void => {
    dirty.current = false
    if (next !== value) onCommit(next)
  }

  /* `size` is ignored on number and date inputs, so the width is set
     explicitly — otherwise a one-digit value gets a 180px box and the
     sentence stops reading as a sentence */
  const chars = type === 'date' ? 11 : Math.max(4, Math.min(draft.length + 1, 24))

  return (
    <span
      className={cls(role, true, seeking(sought, unchosen ? 'cn-tok--input is-unset' : 'cn-tok--input'))}
      data-tok={tokenId}
    >
      <input
        className="cn-tok-typed"
        type={type}
        value={draft}
        size={chars}
        style={{ width: `${chars}ch` }}
        aria-label={label}
        placeholder={placeholder}
        list={suggestions && suggestions.length > 0 ? listId : undefined}
        onChange={(e) => {
          dirty.current = true
          setDraft(e.target.value)
        }}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(e.currentTarget.value)
          }
          if (e.key === 'Escape') {
            dirty.current = false
            setDraft(value)
          }
        }}
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </span>
  )
}

/* ---------------------------------------------------------- */
/* The "is one of" set                                        */
/* ---------------------------------------------------------- */

export function ChipToken({
  text,
  onRemove,
  label,
}: {
  text: string
  onRemove?: () => void
  label: string
}): ReactElement {
  if (!onRemove) return <span className={cls('value', false, 'cn-chip')}>{text}</span>
  return (
    <span className={cls('value', true, 'cn-chip')}>
      <span className="cn-chip-text">{text}</span>
      <button type="button" className="cn-chip-x" onClick={onRemove} aria-label={label}>
        <X size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
      </button>
    </span>
  )
}

/** The empty slot at the end of a set. Reads as "+", opens the list of
 *  values not yet chosen, and disappears when there are none left. */
export function AddChipToken({
  options,
  onAdd,
  label,
}: {
  options: TokenOption[]
  onAdd: (value: string) => void
  label: string
}): ReactElement | null {
  if (options.length === 0) return null
  return (
    <span className={cls('value', true, 'cn-tok--sel cn-chip cn-chip--add')}>
      <select
        className="cn-tok-input"
        value=""
        aria-label={label}
        onChange={(e) => {
          if (e.target.value) onAdd(e.target.value)
        }}
      >
        <option value="">add a value…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <i className="cn-tok-face">+</i>
    </span>
  )
}
