/* ============================================================
   THE FACET RAIL — one control per thing this table can be
   narrowed by, and nothing for the things it cannot.

   WHY THESE ARE POPOVERS AND NOT A WALL OF CHIPS. Highfield offers
   seven series, sixty-seven models, seventy variants, six shaft
   lengths, an hp envelope, a length and a price. Drawn open that is
   a hundred and fifty chips above the photographs, which is the
   register's own fault wearing a different coat. Drawn closed it is
   one line: eight buttons, each saying what it narrows by and — when
   it is narrowing — what to.

   THE CLOSED CONTROL SAYS THE ANSWER. `Series · Patrol`,
   `HP · fits 115`, `Cash · $20,000 and up`. That is the same rule
   the register's sections panel already follows ("the one answer a
   map owes at a glance is ON the closed control"), and it is what
   makes a rail of popovers legible without opening any of them.

   THE KIND CARRIES THE ON STATE. `.k-filter` — DESIGN_PRINCIPLES §1
   as amended: a filter chip may take the hue of the kind it filters,
   because everything in this catalogue IS that kind.

   WHAT IS THE PRIMITIVES LAYER'S AND WHAT IS NOT. Everything inside
   a sheet is src/ui now: the find box and the bound boxes are
   `Field`, each value is a `Row` with a real checkbox at its head,
   and every act is a `Button`. The one thing that is still this
   file's own is the closed chip — a control with a pressed state
   and a kind hue, which no tone in button.css draws. That is
   reported rather than layered: the chip keeps its local rule until
   the layer has a toggle, and nothing here restyles a primitive.
   ============================================================ */
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { Dispatch, FormEvent, JSX, SetStateAction } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import type { ColumnFilter } from '@/features/table/core'
import { ICON_SIZE } from '@/lib/icons'
import { Button, Field, Row } from '@/ui'
import { Popover } from './Popover'
import { bandWords, CHIPS_SHOWN, type Facet } from './facets'
import { countLabel, type LeafNoun } from './grouping'

const POP_W = 268

/** A number typed into a bound box. Empty is not zero — it is "no
 *  bound", which is a different filter. */
function boundOf(text: string): number | undefined {
  const t = text.trim().replace(/[$,\s]/g, '')
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export interface FacetRailProps {
  facets: Facet[]
  filters: ColumnFilter[]
  onFilters: Dispatch<SetStateAction<ColumnFilter[]>>
  /** the register's own display text, softened where it shouts —
   *  a boolean column stores TRUE and a chip must not say it */
  say: (fieldId: string, value: string) => string
  /** how a figure prints in this column: money as money, a
   *  measurement with its unit */
  print: (fieldId: string, n: number) => string
  /** the dealer's own word for a row, so a value's count reads
   *  "12 variants" rather than a bare figure (§6) */
  noun: LeafNoun
}

interface OpenAt {
  facetId: string
  rect: DOMRect
}

export function FacetRail({
  facets,
  filters,
  onFilters,
  say,
  print,
  noun,
}: FacetRailProps): JSX.Element | null {
  const [open, setOpen] = useState<OpenAt | null>(null)
  const close = useCallback(() => setOpen(null), [])

  const byField = useMemo(() => {
    const m = new Map<string, ColumnFilter>()
    for (const f of filters) m.set(f.fieldId, f)
    return m
  }, [filters])

  const setOne = useCallback(
    (fieldId: string, next: ColumnFilter | null) => {
      onFilters((prev) => {
        const without = prev.filter((x) => x.fieldId !== fieldId)
        return next ? [...without, next] : without
      })
    },
    [onFilters],
  )

  const setPair = useCallback(
    (a: string, b: string, next: [ColumnFilter, ColumnFilter] | null) => {
      onFilters((prev) => {
        const without = prev.filter((x) => x.fieldId !== a && x.fieldId !== b)
        return next ? [...without, ...next] : without
      })
    },
    [onFilters],
  )

  if (facets.length === 0) return null

  return (
    <div className="cat-facets" role="group" aria-label="Narrow this catalogue">
      {facets.map((facet) => {
        const at = summarise(facet, byField, say, print)
        return (
          <FacetButton
            key={facet.id}
            label={facet.label}
            at={at}
            open={open?.facetId === facet.id}
            onOpen={(rect) =>
              setOpen((cur) => (cur?.facetId === facet.id ? null : { facetId: facet.id, rect }))
            }
          />
        )
      })}

      {open
        ? (() => {
            const facet = facets.find((f) => f.id === open.facetId)
            if (!facet) return null
            return (
              <Popover
                anchor={open.rect}
                width={POP_W}
                label={`Narrow by ${facet.label}`}
                onClose={close}
              >
                {facet.kind === 'values' ? (
                  /* A CHOICE LIST DOES NOT CLOSE ON A TICK. It is a
                     multiple choice — Patrol AND Sport — and a sheet
                     that shut itself after the first one would make
                     the second choice cost a second press of the
                     button. It applies live; the way out is the way
                     out of any popover. */
                  <ValuesBody
                    facet={facet}
                    current={byField.get(facet.fieldId)}
                    say={say}
                    noun={noun}
                    onApply={(next) => setOne(facet.fieldId, next)}
                  />
                ) : facet.kind === 'band' ? (
                  <BandBody
                    facet={facet}
                    current={byField.get(facet.fieldId)}
                    print={print}
                    onApply={(next) => {
                      setOne(facet.fieldId, next)
                      close()
                    }}
                  />
                ) : (
                  <EnvelopeBody
                    facet={facet}
                    current={byField.get(facet.maxFieldId)}
                    print={print}
                    onApply={(next) => {
                      setPair(facet.minFieldId, facet.maxFieldId, next)
                      close()
                    }}
                  />
                )}
              </Popover>
            )
          })()
        : null}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* The closed control                                         */
/* ---------------------------------------------------------- */

function FacetButton({
  label,
  at,
  open,
  onOpen,
}: {
  label: string
  at: string | null
  open: boolean
  onOpen: (rect: DOMRect) => void
}): JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null)
  return (
    <button
      ref={ref}
      type="button"
      className="cat-facet k-filter"
      aria-pressed={at !== null}
      aria-expanded={open}
      aria-haspopup="dialog"
      onPointerDown={(e) => {
        /* PRESS LANDS ON POINTER-DOWN — rule 8. Opening on click
           would put the sheet a whole event behind the finger.
           `preventDefault` stops the press starting a text selection
           across the rail — and it also stops the button taking
           focus, which is why focus is then given explicitly: a
           person who opens a sheet with the mouse and shuts it with
           Escape must land back on the control they pressed. */
        if (e.button !== 0) return
        e.preventDefault()
        const el = ref.current
        if (!el) return
        el.focus()
        onOpen(el.getBoundingClientRect())
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        const rect = ref.current?.getBoundingClientRect()
        if (rect) onOpen(rect)
      }}
    >
      <span className="cat-facet-name">{label}</span>
      {at !== null ? (
        <>
          <span className="cat-facet-sep" aria-hidden="true">
            ·
          </span>
          <span className="cat-facet-at">{at}</span>
        </>
      ) : null}
      <CaretDown size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
    </button>
  )
}

/** What the closed control says it is narrowing to, or `null` for
 *  "nothing yet". */
function summarise(
  facet: Facet,
  byField: Map<string, ColumnFilter>,
  say: (fieldId: string, value: string) => string,
  print: (fieldId: string, n: number) => string,
): string | null {
  if (facet.kind === 'values') {
    const f = byField.get(facet.fieldId)
    if (!f || f.kind !== 'values') return null
    if (f.selected.length === 0) return 'none'
    if (f.selected.length === 1) return say(facet.fieldId, f.selected[0] ?? '')
    return `${f.selected.length} chosen`
  }
  if (facet.kind === 'band') {
    const f = byField.get(facet.fieldId)
    if (!f || f.kind !== 'between') return null
    return bandWords(f.min, f.max, (n) => print(facet.fieldId, n))
  }
  const hi = byField.get(facet.maxFieldId)
  if (!hi || hi.kind !== 'between' || hi.min === undefined) return null
  return `fits ${print(facet.maxFieldId, hi.min)}`
}

/* ---------------------------------------------------------- */
/* The three bodies                                           */
/* ---------------------------------------------------------- */

function ValuesBody({
  facet,
  current,
  say,
  noun,
  onApply,
}: {
  facet: Extract<Facet, { kind: 'values' }>
  current: ColumnFilter | undefined
  say: (fieldId: string, value: string) => string
  noun: LeafNoun
  onApply: (next: ColumnFilter | null) => void
}): JSX.Element {
  const all = facet.values
  const [chosen, setChosen] = useState<Set<string>>(() =>
    current && current.kind === 'values' ? new Set(current.selected) : new Set(),
  )
  const [find, setFind] = useState('')
  const [wide, setWide] = useState(false)
  const uid = useId()

  const needle = find.trim().toLowerCase()
  const matching = useMemo(
    () =>
      needle === ''
        ? all
        : all.filter((v) => say(facet.fieldId, v.value).toLowerCase().includes(needle)),
    [all, needle, say, facet.fieldId],
  )
  const shown = wide || needle !== '' ? matching : matching.slice(0, CHIPS_SHOWN)
  const hidden = matching.length - shown.length

  /* COMPUTED OUTSIDE THE UPDATER. Publishing the filter from inside
     `setChosen`'s callback sets state on the OWNER while this
     component is rendering, which React reports as "cannot update a
     component while rendering a different component" — and it is a
     real hazard, not a lint: the updater may be run twice in strict
     mode and the owner would be written to twice. */
  const toggle = (value: string): void => {
    const next = new Set(chosen)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setChosen(next)
    /* EMPTY IS NOT A FILTER, it is the absence of one. `values` with
       nothing selected means "let nothing through" in the core, which
       is right for the column menu's uncheck-all and wrong for a chip
       a person has just switched back off. */
    onApply(
      next.size === 0
        ? null
        : { kind: 'values', fieldId: facet.fieldId, selected: [...next] },
    )
  }

  return (
    <>
      {all.length > CHIPS_SHOWN ? (
        <div className="cat-pop-find">
          <Field
            label={`Find a ${facet.label.toLowerCase()}`}
            type="search"
            value={find}
            placeholder="Type to match…"
            onChange={setFind}
          />
        </div>
      ) : null}

      {/* EACH VALUE IS A ROW with a real checkbox at its head and the
          value as that box's label: the tick, the tab stop and Space
          come from the browser, and the count is the row's metadata
          in the dealer's own noun. The hand-drawn box and the button
          pretending to be a checkbox are gone with their rules. */}
      <div className="cat-pop-list">
        {shown.length === 0 ? (
          <p className="cat-pop-none">Nothing here matches “{find.trim()}”.</p>
        ) : null}
        {shown.map((v, i) => {
          const on = chosen.has(v.value)
          const id = `${uid}-${i}`
          return (
            <Row
              key={v.value}
              dense
              lead={
                <input
                  className="tb-menu-check"
                  type="checkbox"
                  id={id}
                  checked={on}
                  onChange={() => toggle(v.value)}
                />
              }
              name={<label htmlFor={id}>{say(facet.fieldId, v.value)}</label>}
              meta={countLabel(v.count, noun)}
            />
          )
        })}
        {hidden > 0 ? (
          <Button tone="ghost" size="sm" block onClick={() => setWide(true)}>
            {hidden} more
          </Button>
        ) : null}
      </div>

      <footer className="tb-menu-foot">
        <Button
          tone="ghost"
          size="sm"
          onClick={() => {
            setChosen(new Set())
            onApply(null)
          }}
        >
          Clear
        </Button>
      </footer>
    </>
  )
}

/* ENTER APPLIES, AND IT IS THE FORM THAT SAYS SO. `Field` owns its
   input and hands out no key handler — deliberately, so a feature
   cannot bolt behaviour onto a control it did not draw. A bound box
   is a form with one submit button, which is what the browser's own
   implicit submission already means by Enter. */
function submitting(commit: () => void) {
  return (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    commit()
  }
}

function BandBody({
  facet,
  current,
  print,
  onApply,
}: {
  facet: Extract<Facet, { kind: 'band' }>
  current: ColumnFilter | undefined
  print: (fieldId: string, n: number) => string
  onApply: (next: ColumnFilter | null) => void
}): JSX.Element {
  const held = current && current.kind === 'between' ? current : undefined
  const [lo, setLo] = useState(held?.min === undefined ? '' : String(held.min))
  const [hi, setHi] = useState(held?.max === undefined ? '' : String(held.max))

  const commit = (): void => {
    const min = boundOf(lo)
    const max = boundOf(hi)
    if (min === undefined && max === undefined) onApply(null)
    else onApply({ kind: 'between', fieldId: facet.fieldId, min, max })
  }

  return (
    <form onSubmit={submitting(commit)}>
      <div className="cat-pop-band">
        <div className="cat-pop-bound">
          <Field
            label="From"
            mono
            inputMode="decimal"
            value={lo}
            placeholder={print(facet.fieldId, facet.lo)}
            onChange={setLo}
          />
        </div>
        <div className="cat-pop-bound">
          <Field
            label="To"
            mono
            inputMode="decimal"
            value={hi}
            placeholder={print(facet.fieldId, facet.hi)}
            onChange={setHi}
          />
        </div>
      </div>
      <footer className="tb-menu-foot">
        <Button
          tone="ghost"
          size="sm"
          onClick={() => {
            setLo('')
            setHi('')
            onApply(null)
          }}
        >
          Clear
        </Button>
        <Button tone="primary" size="sm" type="submit">
          Apply
        </Button>
      </footer>
    </form>
  )
}

function EnvelopeBody({
  facet,
  current,
  print,
  onApply,
}: {
  facet: Extract<Facet, { kind: 'envelope' }>
  current: ColumnFilter | undefined
  print: (fieldId: string, n: number) => string
  onApply: (next: [ColumnFilter, ColumnFilter] | null) => void
}): JSX.Element {
  const held = current && current.kind === 'between' ? current.min : undefined
  const [at, setAt] = useState(held === undefined ? '' : String(held))

  const commit = (): void => {
    const n = boundOf(at)
    if (n === undefined) {
      onApply(null)
      return
    }
    /* THE ENVELOPE, AS TWO BOUNDS ON TWO REAL COLUMNS. A hull is
       offered when its Min is at or below what you are fitting and
       its Max is at or above it. Nothing here invents a third
       column to hold the answer in. */
    onApply([
      { kind: 'between', fieldId: facet.minFieldId, max: n },
      { kind: 'between', fieldId: facet.maxFieldId, min: n },
    ])
  }

  return (
    <form onSubmit={submitting(commit)}>
      <div className="cat-pop-band">
        <div className="cat-pop-bound">
          <Field
            label={`Fits ${facet.label}`}
            mono
            inputMode="decimal"
            value={at}
            placeholder={`${print(facet.maxFieldId, facet.lo)} – ${print(facet.maxFieldId, facet.hi)}`}
            onChange={setAt}
          />
        </div>
      </div>
      <footer className="tb-menu-foot">
        <Button
          tone="ghost"
          size="sm"
          onClick={() => {
            setAt('')
            onApply(null)
          }}
        >
          Clear
        </Button>
        <Button tone="primary" size="sm" type="submit">
          Apply
        </Button>
      </footer>
    </form>
  )
}
