/* ============================================================
   THE CITATION — where a rule was read out of, drawn so it can be
   read.   (cn-src-*)

   THE PROBLEM THIS SOLVES. Sixteen rules were mined out of a real
   price file and every one of them carries the cell that states it.
   That line is the whole argument of this page: anyone can write a
   rule and claim the business asked for it, and this is how you
   check. It was being drawn as a single 11px mono paragraph — up to
   four hundred words of it — in the app's faintest ink, at the
   bottom of the card, which is exactly where a reader's eye goes
   last. The most load-bearing sentence in the application was the
   least legible thing on the screen.

   WHAT THIS DOES INSTEAD, AND WHAT IT DOES NOT DO.

   It does not rewrite the string. Every character of `source` is
   still on the page, in the order it was written — with one
   deliberate move, which is that the verdict is lifted out of the
   line it opens and stamped at the head, where a state stamp
   belongs. What it does is READ
   the shape the adjudicator already wrote in — parts separated by
   ` · ` — and give each part the face its content deserves:

     the workbook      the file the rule came out of, named once at
                       the head, in the reading face
     a cell reference  a part that OPENS with a sheet name and a
                       bang — `Boat Module!KV:KW` — or with a
                       formula. It is an address somebody may type
                       into Excel, so it is mono and full ink, and it
                       WRAPS: a half-printed cell address cannot be
                       looked up, and looking it up is the only
                       reason it is printed. Whatever the adjudicator
                       wrote BESIDE the address is prose and is set
                       as prose
     the verdict       ASSERTED or OBSERVED, the adjudicator's own
                       two words for "the file says so" against "the
                       file merely does so". It is a state this app
                       owns, so it is the label step in mono — the
                       one sanctioned uppercase
     the evidence      everything else is prose, so it is set in the
                       reading face at the small step, and the
                       FIGURES inside it are mono and tabular,
                       because a rate is a figure wherever it sits
     the working       a trailing `FITMENT_RULES.md §3.3` is where
                       the adjudication itself is written down. It
                       is a pointer, and it goes last

   IF THE PARSE FINDS NOTHING it prints the string as one block, in
   mono, exactly as before. A citation may never be lost to a
   classifier being clever.
   ============================================================ */

import type { ReactElement, ReactNode } from 'react'
import './constraints.css'

/* ---------------------------------------------------------- */
/* Reading the shape the string is already in                 */
/* ---------------------------------------------------------- */

/** The adjudicator's two words for how firmly the file states it.
 *  ASSERTED — a header, a formula or a banner says so in the sheet.
 *  OBSERVED — no cell says it; every row happens to do it. */
const VERDICT = /^(ASSERTED|OBSERVED)\b/

/** Where the adjudication is written up: `FITMENT_RULES.md R9`,
 *  `FOUR_MODULES.md §3.3`, `MPF_GROUND_TRUTH §14`. Screaming case,
 *  short, and always last. */
const WORKING = /^[A-Z][A-Z0-9_]{3,}(\.md)?\b/

/** A cell address: a sheet name, a bang, a column letter or a row.
 *  `Boat Module!KV:KW`, `Registration Costs!C15:C19`, `Motor
 *  Library!GT`.
 *
 *  IT IS NOT ENOUGH TO CONTAIN A BANG. "the 3 misses are
 *  single-letter typos at Boat Module!KZ115, LF137, LF138" carries
 *  one and is a sentence; setting it in mono because a classifier
 *  found a bang would be prose in the reference face. So an address
 *  line has to OPEN with a sheet name — a capital, at most three
 *  words, at most thirty characters before the bang — which is what
 *  every sheet in these workbooks is. */
const CELL_HEAD = /^([A-Z][A-Za-z0-9 ()._'-]{0,29})!/

/** …or be a formula, which is the other thing on this slab a person
 *  reads character by character. */
const FORMULA = /^=/

/** The address itself, so the note beside it can be set as prose:
 *  `Boat Module!KV:KW` out of `Boat Module!KV:KW Min HP / Max HP
 *  column pair`. */
const ADDRESS = /^[A-Z][A-Za-z0-9 ()._'-]{0,29}!\$?[A-Z]{1,3}[0-9]*(?::\$?[A-Z]{1,3}[0-9]*)?/

const cellHead = (piece: string): boolean => {
  const m = CELL_HEAD.exec(piece)
  if (!m) return false
  return (m[1] ?? '').trim().split(/\s+/).length <= 3
}

/** A file: something a person could open. */
const IS_FILE = /\.(xlsx|xlsm|csv)\b/i

type Part =
  | { k: 'file'; text: string }
  /** `addr` is the part set in mono and full ink; `note` is whatever
   *  the adjudicator wrote beside it, and it is prose. */
  | { k: 'cell'; text: string; addr: string; note: string }
  | { k: 'said'; text: string }
  | { k: 'working'; text: string }

interface Read {
  /** ASSERTED / OBSERVED, when the string states one */
  verdict: string | null
  parts: Part[]
}

/** Split on the separator the strings are already written with, and
 *  give each piece a role. Nothing is dropped and nothing is
 *  reordered — `working` is last because it is written last. */
export function readSource(text: string): Read {
  const raw = text
    .split(' · ')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (raw.length <= 1) {
    return { verdict: null, parts: raw.map((t) => ({ k: 'said', text: t }) as Part) }
  }

  let verdict: string | null = null
  const parts: Part[] = []

  for (const piece of raw) {
    const stamp = VERDICT.exec(piece)
    if (stamp) {
      /* the verdict is lifted out of the line it opens; whatever it
         was qualifying stays, because "OBSERVED, not asserted: 0 of
         7,830 remote-boat cells name a tiller" is the evidence and
         only the first word was the stamp */
      verdict ??= stamp[1] ?? null
      const rest = piece.slice(stamp[0].length).replace(/^[\s,:;—-]+/, '')
      if (rest.length > 0) parts.push({ k: 'said', text: rest })
      continue
    }
    if (WORKING.test(piece) && piece.length < 72 && !cellHead(piece)) {
      parts.push({ k: 'working', text: piece })
      continue
    }
    if (FORMULA.test(piece) || cellHead(piece)) {
      const addr = ADDRESS.exec(piece)?.[0] ?? ''
      parts.push({
        k: 'cell',
        text: piece,
        addr: addr === '' ? piece : addr,
        note: addr === '' ? '' : piece.slice(addr.length).replace(/^[\s,]+/, ''),
      })
      continue
    }
    if (IS_FILE.test(piece) && piece.length < 72) {
      parts.push({ k: 'file', text: piece })
      continue
    }
    parts.push({ k: 'said', text: piece })
  }

  return { verdict, parts }
}

/* ---------------------------------------------------------- */
/* Figures inside prose                                        */
/* ---------------------------------------------------------- */

/** A figure is a figure wherever it sits, and this app sets every
 *  one of them in the same face. Splitting the prose lets "530 of
 *  530" and "97.70 %" line up on the decimal with every other
 *  number on the page instead of being set in the reading face's
 *  proportional digits.
 *
 *  It is deliberately conservative: a run of digits must not be
 *  glued to a letter, or `KZ115` — a cell address inside a sentence
 *  — would come apart in the middle. */
const FIGURE = /((?:^|[^\dA-Za-z])[\d][\d,.]*(?:\s?%)?)/g

export function withFigures(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const chunks = text.split(FIGURE)
  chunks.forEach((chunk, i) => {
    if (chunk === '') return
    if (i % 2 === 1) {
      /* the guard character the regex had to eat comes back as
         itself — it belongs to the prose, not to the number */
      const lead = /^[^\d]/.test(chunk) ? chunk[0] : ''
      const fig = lead ? chunk.slice(1) : chunk
      if (lead) out.push(lead)
      out.push(
        <span key={`f${i}`} className="cn-src-n">
          {fig.replace(/\.$/, '')}
        </span>,
      )
      if (fig.endsWith('.')) out.push('.')
      return
    }
    out.push(chunk)
  })
  return out
}

/* ---------------------------------------------------------- */
/* The component                                              */
/* ---------------------------------------------------------- */

export interface ProvenanceProps {
  /** the adjudicator's own line, unedited */
  text: string
  /** the words over it. "Read out of" by default; the left-out list
   *  and the registration band each name their own subject. */
  label?: string
  /** WHERE THE ADJUDICATOR'S NARRATIVE GOES, and it is the one part
   *  of a citation that is prose rather than reference.
   *
   *  A citation is the FILE and the CELL — "Boat Module (5).xlsx",
   *  "Trailer Module!A" — and those are never moved: they are how a
   *  person checks the claim, which is the whole argument for drawing
   *  provenance at all. The `said` pieces beside them are the
   *  adjudicator's paragraph ABOUT the evidence, and on the ledger
   *  that paragraph is printed sixteen times down one column. Passing
   *  `narrative="omit"` leaves it to the caller to draw where it
   *  belongs — on the ledger, inside the card's own Why disclosure,
   *  beside the reason it qualifies. Nothing is dropped: `readSource`
   *  is exported and the caller reads the same pieces. */
  narrative?: 'draw' | 'omit'
}

export function Provenance({
  text,
  label = 'Read out of',
  narrative = 'draw',
}: ProvenanceProps): ReactElement {
  const { verdict, parts } = readSource(text)

  /* NOT A CITATION, OR NOT ONE THIS CAN READ. Print it whole, in the
     face a reference takes, rather than dressing up a guess. */
  if (parts.length <= 1 && verdict === null) {
    return <p className="cn-wb-src">{text}</p>
  }

  const cells = parts.filter((p) => p.k === 'cell')
  const files = parts.filter((p) => p.k === 'file')
  const said = narrative === 'omit' ? [] : parts.filter((p) => p.k === 'said')
  const working = parts.filter((p) => p.k === 'working')

  return (
    <figure className="cn-src">
      <figcaption className="cn-src-head">
        <span className="cn-src-label">{label}</span>
        {verdict !== null && (
          <span className={verdict === 'ASSERTED' ? 'cn-src-verdict is-asserted' : 'cn-src-verdict'}>
            {verdict}
          </span>
        )}
      </figcaption>

      {files.length > 0 && (
        <p className="cn-src-file">{files.map((f) => f.text).join(' · ')}</p>
      )}

      {cells.length > 0 && (
        <ul className="cn-src-cells">
          {cells.map((c, i) => (
            <li key={`c${i}`} className="cn-src-cell">
              <span className="cn-src-addr">{c.k === 'cell' ? c.addr : c.text}</span>
              {c.k === 'cell' && c.note !== '' && (
                <span className="cn-src-note"> {withFigures(c.note)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {said.length > 0 && (
        <ul className="cn-src-said">
          {said.map((s, i) => (
            <li key={`s${i}`} className="cn-src-line">
              {withFigures(s.text)}
            </li>
          ))}
        </ul>
      )}

      {working.length > 0 && (
        <p className="cn-src-working">
          {working.map((w, i) => (
            <span key={`w${i}`} className="cn-src-doc">
              {w.text}
            </span>
          ))}
        </p>
      )}
    </figure>
  )
}
