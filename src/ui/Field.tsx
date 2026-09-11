/* ============================================================
   FIELD — the component. The measurement (33 self-drawn input
   treatments across 19 stylesheets, eleven of them with no
   `:focus` rule at all) is in field.css.

   THE LABEL IS REQUIRED AND IT IS A REAL <label for>. Not a
   placeholder standing in for one — a placeholder disappears the
   moment a person types, so a form labelled by placeholders is a
   form nobody can check their own answers on, and it is invisible
   to a screen reader once filled.

   THE REFUSAL IS A SENTENCE, WIRED UP. `refusedBecause` sets
   `aria-invalid` on the control and `aria-describedby` at the
   sentence, so the reason is announced with the field rather than
   sitting beside it in red and hoping. Rule 10: a thing that
   cannot be done says why, WHERE IT IS.

   THERE IS NO `type="number"`. It looks like the right answer for
   a price and is not: the scroll wheel silently changes the value
   over a focused field, the spinners are unstyleable, and a
   partially-typed value reads back as empty string. A figure here
   is a text input with `mono` and `inputMode="decimal"` — the
   right keyboard on a phone, mono and tabular on screen, and the
   characters the person typed, unchanged.

   NO `className`, NO `style` — see Button.tsx for why that is the
   mechanism and not the manners.
   ============================================================ */

import { useId, type ReactNode } from 'react'
import './field.css'

export type FieldType = 'text' | 'search' | 'email' | 'tel' | 'url' | 'password'

export interface FieldProps {
  /** Always drawn, always a real <label for>. Sentence case —
      rule 3 keeps uppercase for section captions. */
  label: ReactNode
  value: string
  onChange: (value: string) => void
  /** Help beside the control. Replaced by `refusedBecause` when
      there is one, so the two never stack. */
  hint?: ReactNode
  /** Why this value cannot be accepted, as a sentence — rule 10.
      Sets `aria-invalid` and describes the control. */
  refusedBecause?: ReactNode
  placeholder?: string
  type?: FieldType
  /** A figure, a code, a SKU or an identifier: Plex Mono, tabular
      (§2). Pair it with `inputMode="decimal"` for a price. */
  mono?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'search' | 'email' | 'tel' | 'url'
  autoComplete?: string
  readOnly?: boolean
  name?: string
  id?: string
  /** WHEN THE PERSON HAS FINISHED, as distinct from while they are
   *  typing. A value that writes to a store on every keystroke is a
   *  history entry per character, and Ctrl+Z walks somebody backwards
   *  through their own typing one letter at a time. `onChange` keeps
   *  the draft; this commits it. */
  onBlur?: () => void
}

export function Field({
  label,
  value,
  onChange,
  hint,
  refusedBecause,
  placeholder,
  type = 'text',
  mono = false,
  inputMode,
  autoComplete,
  readOnly = false,
  name,
  id,
  onBlur,
}: FieldProps) {
  const auto = useId()
  const inputId = id ?? auto
  const noteId = `${auto}-note`

  const refused = refusedBecause !== undefined && refusedBecause !== null
  /* One note line, never two: a refusal replaces the hint rather
     than pushing it down, so the place a person looks for the
     answer does not move between states. */
  const note = refused ? refusedBecause : hint

  const inputClasses = ['ui-field-input']
  if (mono) inputClasses.push('ui-field-input--mono')

  return (
    <div className="ui-field">
      <label className="ui-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={inputClasses.join(' ')}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-invalid={refused || undefined}
        aria-describedby={note ? noteId : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...(onBlur ? { onBlur } : {})}
      />
      {note ? (
        <p className={refused ? 'ui-field-why' : 'ui-field-note'} id={noteId}>
          {note}
        </p>
      ) : null}
    </div>
  )
}
