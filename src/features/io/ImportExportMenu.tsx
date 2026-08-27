/* ============================================================
   io/ImportExportMenu — document-control popover for the
   title block: export a copy of the sheet, import one back,
   or clear the sheet. Drafting-table styled.

   Two sections, nothing else. The prepared-set list that used
   to sit here is gone from the default path: its data was
   invented, and the choice belongs on the empty state, not in
   a menu the user opens to move a file.

   Everything the user reads here is configurator vocabulary —
   TABLES, COLUMNS, ROWS. Never entity, schema, field or zone.

   THE TWO IRREVERSIBLE ACTS ARE ASKED IN THE APP'S OWN VOICE.
   Both used to be `window.confirm`, and both were wrong in the
   same three ways. The OS drew them, so the one moment a
   stakeholder is watching something irreversible was the one
   moment the drawing office handed off to Segoe UI. `confirm`
   has exactly two answers, so neither could offer the third
   one that actually matters — SAVE A COPY FIRST. And REPLACE's
   sentence was written unconditional: "Every table and row on
   the sheet now will be overwritten", printed at people whose
   sheet was empty. `ConfirmSheet` is the house question, its
   facts are counted from the store (`sheetNow`), and an empty
   sheet is not asked at all because it has nothing to lose.

   CLEAR SHEET IS THE DOOR THAT USED TO STRAND PEOPLE. It calls
   `resetProject`, which wipes meta including the organisation,
   so the shell lands on onboarding — and this menu, the only
   import door in the app, went with it. Somebody who cleared
   the sheet in order to restore a backup could not restore it.
   Two things answer that: the confirm offers to save a copy
   before it clears, and onboarding now carries an import of its
   own (`features/onboarding`).
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { isRetired } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { forgetSeedStamp } from '@/demos/seedStamp'
import { ConfirmFacts, ConfirmSheet } from '@/features/designer/ConfirmSheet'
import { useQuotes } from '@/features/quote'
import { useConfiguringCount } from '@/features/modules'
import { applyMerge, applyReplace } from './apply'
/* the envelope this build reads and writes: ProjectExport plus the
   quotes, declared beside the validator that narrows them */
import type { ProjectFile } from './envelope'
import { readEnvelopeFile, summariseEnvelope } from './readEnvelope'
import { nextCopyName, pad2, saveCopyOfSheet } from './saveCopy'
import { quotesSurviveSentence, sheetFacts, sheetNow } from './sheetNow'
import './io.css'

/* ------------------------------------------------------------ */
/* helpers                                                       */
/* ------------------------------------------------------------ */

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/* ------------------------------------------------------------ */
/* small glyphs                                                  */
/* ------------------------------------------------------------ */

function GlyphArrows() {
  return (
    <svg className="io-glyph" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path d="M3 6.5V1.5M3 1.5 1 3.5M3 1.5l2 2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 4.5v5M8 9.5l-2-2M8 9.5l2-2" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

function GlyphFullSet() {
  return (
    <svg className="io-glyph" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" />
      <rect x="2.5" y="4.5" width="11" height="11" rx="1" fill="var(--paper-high)" stroke="currentColor" />
      <path d="M4.5 7.5h7M4.5 10h7M4.5 12.5h4.5" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  )
}

function GlyphStructureOnly() {
  return (
    <svg className="io-glyph" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="3.5" y="2.5" width="11" height="13" rx="1" fill="none" stroke="currentColor" />
      <path d="M3.5 6h11" stroke="currentColor" strokeWidth="0.9" />
      <path d="M5.5 8.5h5M5.5 11h7M5.5 13.5h4" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 1.4" />
    </svg>
  )
}

function GlyphDrop() {
  return (
    <svg className="io-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5v9M10 11.5 6.5 8M10 11.5 13.5 8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 12.5v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 15.5v-3" fill="none" stroke="currentColor" />
    </svg>
  )
}

/* ------------------------------------------------------------ */
/* the sentence about the documents that outlive the sheet        */
/* ------------------------------------------------------------ */

/** WHAT HAPPENS TO THE QUOTES, inside both destructive confirms.
 *
 *  The clear sheet's blast radius read "52 TABLES · 3,567 ROWS · 5
 *  MODULES · 25 PAGES · 2 RULES" and never mentioned quotes — while not
 *  clearing them, so afterwards the dock showed a quote count against
 *  an empty sheet and nothing had ever said why. Erring safe was right;
 *  saying nothing about it was not. The wording and the decision behind
 *  it live in `sheetNow.ts`, so the two confirms cannot drift apart.
 *
 *  `ds-cs-line` is ConfirmSheet's own sentence class (designer.css) —
 *  the same one EntityDesigner and FieldRow put inside this sheet. */
function QuotesSurvive() {
  const say = quotesSurviveSentence(sheetNow())
  if (say === '') return null
  return <p className="ds-cs-line">{say}</p>
}

/* ------------------------------------------------------------ */
/* component                                                     */
/* ------------------------------------------------------------ */

interface Pending {
  data: ProjectFile
  fileName: string
}

/** which irreversible act is being asked about, or null */
type Asking = 'replace' | 'clear' | null

export interface ImportExportMenuProps {
  /** Which edge the popover hangs from. It has always hung from the
   *  RIGHT, because it lived at the right end of a title block; on a
   *  toolbar's left-hand track that puts a 348px sheet off the side
   *  of the window. The trigger's own look is unchanged either way. */
  align?: 'left' | 'right'
}

export function ImportExportMenu({ align = 'right' }: ImportExportMenuProps = {}) {
  const [open, setOpen] = useState(false)
  /* ============================================================
     WHICH WAY THE PANEL OPENS, AND WHY THIS IS NOT A PREFERENCE.

     THE BUG IT FIXES. This panel hung from `top: 100%` — always
     downward — because for its whole life the trigger stood in a
     title block at the TOP of the window. It moved to the foot of
     the navy rail, which is pinned to the bottom of a 100dvh
     column, and a 384px sheet hanging DOWN from a control 48px
     off the floor of the window is a sheet nobody can see. The
     one door out of this app for a dealer's whole price file
     opened off the bottom of the screen.

     A PROP WOULD HAVE BEEN A SECOND THING TO KEEP RIGHT. `align`
     already exists because the same control stands in two places;
     a `drop` prop would be a third fact about the host that the
     host has to remember, and the fourth host would get it wrong.
     The room is measurable at the moment of the press, so it is
     measured: below if it fits below, above if it fits better
     above, and the panel is never taller than the room it landed
     in — `--io-room` caps it either way, so a short window
     scrolls the sections rather than clipping the footer.
     ============================================================ */
  const [drop, setDrop] = useState<{ up: boolean; room: number }>({
    up: false,
    room: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [dragOver, setDragOver] = useState(false)
  /* WHAT JUST HAPPENED, IN A SENTENCE AND A FIGURE. It used to be one
     uppercase string — `REV 03 ISSUED`, `SHEET REPLACED` — drawn as a
     rubber stamp rotated two degrees off true. Nothing else in this
     design shouts, and the loudest object in the app was the one that
     said "saved". The words are words; the revision is a figure and
     takes the mono face. */
  const [stamp, setStamp] = useState<{ say: string; fig?: string } | null>(null)
  const [asking, setAsking] = useState<Asking>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stampTimer = useRef<number | null>(null)

  const rev = useProjectStore((s) => s.meta.exportCount)
  const tableCount = useProjectStore((s) => Object.keys(s.entities).length)
  const rowCount = useProjectStore((s) =>
    Object.values(s.rowsByEntity).reduce((n, l) => n + l.length, 0),
  )
  /* TWO SURFACES, TWO DEFENSIBLE FIGURES, AND NOW A SENTENCE BETWEEN
     THEM. This card said "52 TABLES · 3,566 ROWS" while Home, the
     surface whose toolbar opens this very panel, said 50 — with nothing
     anywhere to reconcile them. Neither number was wrong. A copy really
     does carry 52, and it MUST: `retired` was once dropped on the way
     through the envelope, and exporting the seed and importing it back
     resurrected "OBSOLETE Trailers — No Longer Available" as live
     stock, which is the app offering a discontinued trailer to a
     customer because a file went out and came back (envelope.ts). And
     Home is right to withhold them, because a retired table is history
     rather than stock and no surface a customer sees may offer it.
     So the difference is named where the bigger number is printed. */
  const retiredCount = useProjectStore(
    (s) => Object.values(s.entities).filter((e) => isRetired(e)).length,
  )
  /* the card must not promise more than the file holds, nor less: it
     said "Everything" for a long time while carrying none of this */
  const moduleCount = useProjectStore((s) => Object.keys(s.modules).length)
  const pageCount = useProjectStore((s) => Object.keys(s.views).length)
  /* the quotes are not in the store — they are their own registry, and
     `useQuotes` is its hook. Read the same way as everything else on
     this panel, so the figure on the card is the figure the export
     writes rather than a count taken at a different moment. */
  const quoteCount = useQuotes().length
  /* THE ONE SWITCH THE FILE CANNOT CARRY. A module's tenth verb —
     "Set rules" — is held in a browser-local registry rather than on
     `ModuleDef.capabilities`, because `ModuleCapability` is a closed
     union this session does not own (features/modules/ruleCapability.ts
     writes down the exact line the contract wants). So it does not
     travel, and this panel has twice been fixed for exactly this shape
     of silence: quotes, and retired tables. It is named below rather
     than discovered by a dealer who opened their copy and found the
     rules panel gone.

     THE RECORD, NOT ITS KEYS. `Object.keys` would be a new array on
     every render and zustand compares with Object.is; the record's
     identity only changes when a module does. */
  const modules = useProjectStore((s) => s.modules)
  const configuringCount = useConfiguringCount(Object.keys(modules))

  const closeMenu = useCallback(() => {
    setOpen(false)
    setError(null)
    setPending(null)
    setDragOver(false)
    setAsking(null)
  }, [])

  /** The gap the panel needs before it will hang downward. Below
   *  this it opens upward instead — 320px is the export section
   *  plus the head and the footer, which is the least of this
   *  panel worth drawing at all. */
  const ROOM_ENOUGH = 320
  /** air left between the panel and the edge of the window */
  const MARGIN = 16

  const openMenu = useCallback(() => {
    const box = triggerRef.current?.getBoundingClientRect()
    if (box) {
      const below = window.innerHeight - box.bottom - MARGIN
      const above = box.top - MARGIN
      const up = below < ROOM_ENOUGH && above > below
      setDrop({ up, room: Math.max(200, up ? above : below) })
    }
    setOpen(true)
  }, [])

  /* escape + outside click.
     THE CONFIRM OWNS BOTH WHILE IT IS UP. It is portalled to
     document.body, so every pointerdown inside it is "outside" this
     root — pressing a choice would close the menu out from under the
     question. And `ConfirmSheet` takes Escape in the capture phase to
     cancel itself; this listener must not also fire and take the menu
     with it. */
  useEffect(() => {
    if (!open || asking !== null) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        closeMenu()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, asking, closeMenu])

  /* focus the sheet when it opens */
  useEffect(() => {
    if (open) popRef.current?.focus()
  }, [open])

  /* stamp toast lifecycle */
  const showStamp = useCallback((say: string, fig?: string) => {
    if (stampTimer.current !== null) window.clearTimeout(stampTimer.current)
    setStamp({ say, fig })
    stampTimer.current = window.setTimeout(() => {
      setStamp(null)
      stampTimer.current = null
    }, 2100)
  }, [])
  useEffect(
    () => () => {
      if (stampTimer.current !== null) window.clearTimeout(stampTimer.current)
    },
    [],
  )

  /* -- export ------------------------------------------------ */
  const onExport = (includeData: boolean) => {
    const issued = saveCopyOfSheet(includeData)
    closeMenu()
    showStamp('Copy saved', `REV ${pad2(issued)}`)
  }

  /* -- import ------------------------------------------------ */
  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setPending(null)
    const res = await readEnvelopeFile(file)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPending({ data: res.data, fileName: res.fileName })
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  /* -- replace ----------------------------------------------- */

  const doReplace = (data: ProjectFile) => {
    applyReplace(data)
    closeMenu()
    showStamp('Sheet replaced')
  }

  /** An empty sheet has nothing to overwrite, so it is not asked.
   *  That is also the case the old unconditional sentence was false
   *  about — it promised to overwrite "every table and row" of a sheet
   *  that held none. */
  const askReplace = () => {
    if (!pending) return
    if (sheetNow().blank) {
      doReplace(pending.data)
      return
    }
    setAsking('replace')
  }

  /* additive — nothing on the sheet is touched, so no confirm */
  const doMerge = () => {
    if (!pending) return
    applyMerge(pending.data)
    closeMenu()
    showStamp('Tables added')
  }

  /* -- clear sheet ------------------------------------------- */

  const doClear = () => {
    void useProjectStore.getState().resetProject()
    /* the sheet this browser was seeded with is gone, so the record of
       which build seeded it goes too — see @/demos/seedStamp */
    forgetSeedStamp()
    closeMenu()
    showStamp('Sheet cleared')
  }

  /* -- derived preview stats --------------------------------- */
  const preview = pending ? summariseEnvelope(pending.data) : null
  /* the design layer, named rather than counted into the grid:
     REPLACE overwrites the dashboard too, and a person deserves to see
     that before they press it */
  const previewAlso = preview
    ? [
        preview.modules > 0 ? plural(preview.modules, 'module', 'modules') : '',
        preview.pages > 0 ? plural(preview.pages, 'page', 'pages') : '',
        preview.rules > 0 ? plural(preview.rules, 'rule', 'rules') : '',
        /* the documents in the file. A replace does NOT overwrite the
           quotes already here — a file only ever adds documents, see
           `restoreQuotes` — and naming them is how a person knows the
           count on the dock is about to go up.

           NAMED AS CUSTOMER QUOTES, in the same words the export card
           uses, because that is what makes them different from the
           other three things in this list: a file arriving with them in
           it is a file carrying somebody else's customers. A
           structure-only copy has none, and this line then says
           nothing — which is the file telling the truth for free. */
        preview.quotes > 0
          ? plural(preview.quotes, 'customer quote', 'customer quotes')
          : '',
      ].filter(Boolean)
    : []

  const blank = tableCount === 0

  return (
    <div className={`io-root${align === 'left' ? ' io-root--left' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        /* NOT `.btn`. This control now stands on a toolbar the
           redesign drew, and `.btn` carries the outgoing build's
           uppercase mono stamp — see io.css. */
        className="io-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <GlyphArrows />
        Import / export
      </button>

      {open && (
        <div
          className={`io-pop${drop.up ? ' is-up' : ''}`}
          /* only once it has actually been measured — `min()` against
             a zero would collapse the panel outright */
          style={
            drop.room > 0
              ? ({ ['--io-room' as string]: `${drop.room}px` } as CSSProperties)
              : undefined
          }
          role="dialog"
          aria-label="Import / export"
          ref={popRef}
          tabIndex={-1}
        >
          {/* THE FOUR CORNER TICKS ARE GONE. Registration marks are a
              drafting-office motif from the art direction that was
              replaced, and they were drawn on a control panel where
              they carried nothing.

              AND SO IS "DOCUMENT CONTROL". §6 asks for the dealer's
              nouns in chrome; this panel is about their sheet, and
              that is what it is called now. The revision stamp stays,
              because the copies it counts really are numbered and the
              plate below prints the same stamp for the file. */}
          <header className="io-head">
            <span className="mono-label io-head-title">This sheet</span>
            <span className="io-head-rev">REV {pad2(rev)}</span>
          </header>

          <div className="io-body">
            {preview && pending ? (
              /* ---------------- import preview ---------------- */
              <section className="io-section">
                <div className="io-caption">
                  {/* SENTENCE CASE IN THE MARKUP, uppercase in the
                      primitive. `.mono-label` is the one uppercase
                      style and it applies the transform itself, so
                      typing the capitals here as well is how a
                      caption survives a pass that retires the
                      transform and is never noticed. */}
                  <span className="mono-label">This file holds</span>
                </div>
                <div className="io-plate">
                  <div className="io-plate-head">
                    <span className="io-plate-name">{preview.name}</span>
                    <span className="io-plate-rev">REV {pad2(preview.rev)}</span>
                  </div>
                  <div className="io-plate-grid">
                    <div className="io-stat">
                      <span className="io-stat-num">{preview.tables}</span>
                      <span className="io-stat-lbl">Tables</span>
                    </div>
                    <div className="io-stat">
                      <span className="io-stat-num">{preview.columns}</span>
                      <span className="io-stat-lbl">Columns</span>
                    </div>
                    <div className="io-stat">
                      <span className="io-stat-num">{preview.rows}</span>
                      <span className="io-stat-lbl">Rows</span>
                    </div>
                  </div>
                  {previewAlso.length > 0 && (
                    <div className="io-plate-also">Also — {previewAlso.join(' · ')}</div>
                  )}
                  <div className="io-plate-src">Source — {pending.fileName}</div>
                </div>
                <div className="io-plate-actions">
                  <button
                    type="button"
                    className="btn btn-ghost io-discard"
                    onClick={() => {
                      setPending(null)
                      setError(null)
                    }}
                  >
                    Discard
                  </button>
                  <span className="io-grow" />
                  <button type="button" className="btn io-replace" onClick={askReplace}>
                    Replace
                  </button>
                  <button type="button" className="btn btn-primary" onClick={doMerge}>
                    Add to sheet
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* ---------------- export ---------------- */}
                <section className="io-section">
                  <div className="io-caption">
                    <span className="mono-label">Save a copy</span>
                  </div>
                  <div className="io-cards">
                    <button
                      type="button"
                      className="io-card"
                      disabled={blank}
                      onClick={() => onExport(true)}
                    >
                      <GlyphFullSet />
                      <span className="io-card-title">Everything</span>
                      {/* THE TITLE SAYS EVERYTHING, SO THE FILE HAS TO
                          HOLD EVERYTHING. This subtitle listed four
                          things and the envelope carried those four: a
                          dealer who pressed it, cleared the sheet and
                          re-imported lost every quote they had raised,
                          silently, under the word Everything. Quotes
                          travel now (exportPayload.ts), so the sentence
                          can say so — and the meta counts them beside
                          the tables and rows, because a promise on a
                          card is worth what the figure under it says.

                          AND IT NAMES WHAT A QUOTE HOLDS. This is the
                          card that carries customer names, contact
                          lines, offered prices and discounts out of the
                          browser in a file a person may send on. Naming
                          them is what makes the OTHER card's promise
                          mean something: one of the two is safe to hand
                          over and a person has to be able to tell
                          which. */}
                      <span className="io-card-sub">
                        Tables, rows, modules, pages, rules and quotes — with customer names
                      </span>
                      <span className="io-card-meta">
                        {plural(tableCount, 'table', 'tables')} ·{' '}
                        {plural(rowCount, 'row', 'rows')}
                        {moduleCount > 0
                          ? ` · ${plural(moduleCount, 'module', 'modules')}`
                          : ''}
                        {quoteCount > 0 ? ` · ${plural(quoteCount, 'quote', 'quotes')}` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="io-card"
                      disabled={blank}
                      onClick={() => onExport(false)}
                    >
                      <GlyphStructureOnly />
                      <span className="io-card-title">Structure only</span>
                      {/* MODULES AND PAGES ARE STRUCTURE, not data: they say
                          how the business is arranged, and only the rows are
                          the contents.

                          QUOTES ARE NOT STRUCTURE, and this card used to
                          carry them while reading "Tables and pages, no
                          rows". A quote holds a customer's name, their
                          contact details, the prices they were offered and
                          any discount given — and this is the card a person
                          picks because it sounds safe to hand to a supplier
                          or another dealer. They are out of the file now
                          (exportPayload.ts) and the sentence says so. */}
                      <span className="io-card-sub">
                        Tables, pages and rules. No rows, and no customer quotes.
                      </span>
                      <span className="io-card-meta">
                        {plural(tableCount, 'table', 'tables')}
                        {pageCount > 0 ? ` · ${plural(pageCount, 'page', 'pages')}` : ''} · no rows
                        {/* A COUNT MUST SAY WHAT IT LEFT OUT. Silence about
                            two documents that are on the sheet and not in
                            the file is how the meta line stops being the
                            one place either card tells the truth. */}
                        {quoteCount > 0
                          ? ` · ${plural(quoteCount, 'quote', 'quotes')} left out`
                          : ''}
                      </span>
                    </button>
                  </div>
                  {/* A SENTENCE, IN THE MARKUP. It was typed as literal
                      capitals, which no `text-transform` pass could
                      have caught. */}
                  {blank && (
                    <p className="io-blank-note">Nothing on the sheet to save yet.</p>
                  )}
                  {/* the one sentence that makes 52 and 50 the same
                      answer. Derived from the store, so it disappears on
                      a sheet with no history on it and can never quote a
                      figure the cards above it do not. */}
                  {!blank && retiredCount > 0 && (
                    <p
                      className="io-kept-note"
                      title="A retired table is history rather than stock: it is kept so an old quote still opens, and no surface a customer sees offers it. A copy has to carry it — leaving it out would restore it as live stock."
                    >
                      {plural(retiredCount, 'retired table', 'retired tables')} included — Home
                      counts the other {tableCount - retiredCount}
                    </p>
                  )}
                  {/* SAID ON THE CARDS, NOT IN A RELEASE NOTE. Both
                      cards carry modules, so both lose this, and the
                      sentence names the fix where the loss happens —
                      the switch is one press in the module's own set-up
                      panel, so a person told about it can undo it in
                      seconds and a person not told cannot know to. It
                      is drawn only when there is something to lose. */}
                  {!blank && configuringCount > 0 && (
                    <p
                      className="io-kept-note"
                      title="Every other verb a module carries is a field on the module and travels with it. This one is held in this browser until the module contract can name it, so the copy arrives with the module intact and this switch off."
                    >
                      {plural(configuringCount, 'module sets', 'modules set')} rules — that
                      switch stays in this browser, so switch it back on in the copy
                    </p>
                  )}
                </section>

                {/* ---------------- import ---------------- */}
                <section className="io-section io-section-t">
                  <div className="io-caption">
                    <span className="mono-label">Open a saved copy</span>
                  </div>
                  <button
                    type="button"
                    className={`io-drop${dragOver ? ' is-over' : ''}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                      setDragOver(false)
                    }}
                    onDrop={onDrop}
                  >
                    <GlyphDrop />
                    <span className="io-drop-main">Drop a .json copy here</span>
                    <span className="io-drop-sub">or click to browse</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json,application/json"
                    className="io-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFile(file)
                      e.target.value = ''
                    }}
                  />
                  {/* THE REFUSAL SAYS WHY, WHERE IT WAS REFUSED — and
                      it stopped shouting. It read `REJECTED — <reason>`
                      in red letterspaced mono: a sentence set as a
                      stamp. Same shape as onboarding's, which reads the
                      same file with the same code and must refuse it in
                      the same voice. */}
                  {error && (
                    <div className="io-error" role="alert">
                      <span className="mono-label io-error-tag">Not opened</span>
                      <span className="io-error-say">{error}</span>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <footer className="io-foot">
            {/* THE REFUSAL SITS WHERE THE ACT IS REFUSED. An enabled
                CLEAR SHEET on an empty sheet is a control that does
                nothing, and the reason is one line away in the same
                footer rather than in a tooltip. */}
            <button
              type="button"
              className="io-clear"
              disabled={blank}
              onClick={() => setAsking('clear')}
            >
              Clear sheet
            </button>
            {/* THE SIGNATURE SLOT IS GONE. "HELMLOGIC · DOC CTRL" said
                nothing and stood between the most destructive button in
                the app and the reason it is sometimes refused. The
                reason has the slot to itself, and on a sheet with
                something on it the footer is one button and air. */}
            {blank ? (
              <span className="io-foot-why">Nothing on it to clear.</span>
            ) : null}
          </footer>
        </div>
      )}

      {/* ============================================================
          THE TWO QUESTIONS, IN THE HOUSE VOICE.

          Each offers the answer `window.confirm` could not: save a
          copy first. The safe choice is listed first and the
          destructive one is drawn in the red pencil; Cancel takes the
          focus, so Enter out of habit costs nothing.
          ============================================================ */}
      {asking === 'replace' && pending ? (
        <ConfirmSheet
          eyebrow="Replace the sheet"
          question={`Put “${pending.data.project.name}” on the sheet instead of what is there now?`}
          choices={[
            {
              label: 'Save a copy, then replace',
              note: `Writes ${nextCopyName()} to your downloads first.`,
              onPick: () => {
                saveCopyOfSheet(true)
                doReplace(pending.data)
              },
            },
            {
              label: 'Replace without saving',
              note: 'The sheet below is gone for good.',
              destructive: true,
              onPick: () => doReplace(pending.data),
            },
          ]}
          onCancel={() => setAsking(null)}
        >
          <ConfirmFacts items={sheetFacts(sheetNow())} />
          <QuotesSurvive />
        </ConfirmSheet>
      ) : null}

      {asking === 'clear' ? (
        <ConfirmSheet
          eyebrow="Clear the sheet"
          question="Take everything off the sheet and start again from naming your business?"
          choices={[
            {
              label: 'Save a copy, then clear',
              note: `Writes ${nextCopyName()} to your downloads first.`,
              onPick: () => {
                saveCopyOfSheet(true)
                doClear()
              },
            },
            {
              label: 'Clear without saving',
              note: 'Nothing here can be got back.',
              destructive: true,
              onPick: doClear,
            },
          ]}
          onCancel={() => setAsking(null)}
        >
          <ConfirmFacts items={sheetFacts(sheetNow())} />
          <QuotesSurvive />
        </ConfirmSheet>
      ) : null}

      {stamp && (
        <div
          className={`io-stamp${drop.up ? ' is-up' : ''}`}
          role="status"
          aria-live="polite"
        >
          {stamp.say}
          {stamp.fig ? <> &middot; <b>{stamp.fig}</b></> : null}
        </div>
      )}
    </div>
  )
}
