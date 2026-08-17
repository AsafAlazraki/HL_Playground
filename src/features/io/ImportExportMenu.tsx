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
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { EXPORT_KIND, EXPORT_VERSION, type ProjectExport } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { getConstraints } from '@/features/constraints'
import { validateEnvelope } from './envelope'
import { applyMerge, applyReplace } from './apply'
import './io.css'

/* ------------------------------------------------------------ */
/* helpers — export                                              */
/* ------------------------------------------------------------ */

const pad2 = (n: number): string => String(n).padStart(2, '0')

const kebab = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project'

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

function downloadJson(json: string, fileName: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/* Deterministic serialisation order: store records are keyed objects whose
   Object.values order depends on how IndexedDB rehydrated them — sort by
   createdAt (name as tiebreak) so the same project always exports the same
   file, and revision diffs stay readable. Groups have no createdAt. */
const byCreatedAt = <T extends { createdAt: string; name: string }>(a: T, b: T): number =>
  a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name)

/* ============================================================
   WHAT "EVERYTHING" MEANS.

   Until version 2 it meant the SEED: tables, zones, flow rules and
   rows — every one of which a demo loader can produce — and none of
   the work a person actually did. The modules they built, the pages
   they curated, the business rules they wrote and the name of their
   own business all stayed in the browser they were made in, silently,
   under a button labelled Everything.

   The four that travel now, and where each is read from:

     org          `meta.org`, so an imported set knows whose it is
     views        the store's `views` slice — the shell mirrors the
                  view feature's registry into it on every change
                  (`app/viewPersistence.ts`), so this is the current
                  page layout and not a stale copy
     modules      the store's `modules` slice, in dashboard order
     constraints  `getConstraints()` — the constraint registry's own
                  non-hook reader, scoped to the current organisation

   STILL NOT CARRIED, and deliberately not smuggled: QUOTES. There is
   no `quotes` key on `ProjectExport` and no non-hook list reader on
   the quote registry (`useQuotes` is a hook; `getQuote` needs an id
   you would have to already have). Both are named in
   `features/quote/index.ts` §3 as store work. Reaching into that
   module's private `list` to make an export look complete is exactly
   how a frozen document gets re-priced by an import, so it waits.
   ============================================================ */

/** Builds the export envelope, bumps REV, triggers the download.
 *  Returns the issued rev number. */
function issueExport(includeData: boolean): number {
  const store = useProjectStore.getState()
  const rev = store.bumpExportCount()
  const s = useProjectStore.getState()
  const views = Object.values(s.views).sort(byCreatedAt)
  /* dashboard order, then name — the same comparison the Dashboard
     itself sorts by, so the file lists them as the person sees them */
  const modules = Object.values(s.modules).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  )
  const constraints = [...getConstraints()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  const payload: ProjectExport = {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: s.meta.name, rev },
    entities: Object.values(s.entities).sort(byCreatedAt),
    groups: Object.values(s.groups).sort((a, b) => a.name.localeCompare(b.name)),
    /* rules carry their whole graph — nodes, edges and every typed
       config — so a full set re-imports and runs identically */
    rules: Object.values(s.rules).sort(byCreatedAt),
    ...(includeData ? { rows: { ...s.rowsByEntity } } : {}),
    ...(s.meta.org ? { org: s.meta.org } : {}),
    ...(views.length ? { views } : {}),
    ...(modules.length ? { modules } : {}),
    ...(constraints.length ? { constraints } : {}),
  }
  downloadJson(
    JSON.stringify(payload, null, 2),
    `${kebab(s.meta.name)}-rev${pad2(rev)}.json`,
  )
  return rev
}

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
/* component                                                     */
/* ------------------------------------------------------------ */

interface Pending {
  data: ProjectExport
  fileName: string
}

export function ImportExportMenu() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [stamp, setStamp] = useState<string | null>(null)

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
  /* the card must not promise more than the file holds, nor less: it
     said "Everything" for a long time while carrying none of this */
  const moduleCount = useProjectStore((s) => Object.keys(s.modules).length)
  const pageCount = useProjectStore((s) => Object.keys(s.views).length)

  const closeMenu = useCallback(() => {
    setOpen(false)
    setError(null)
    setPending(null)
    setDragOver(false)
  }, [])

  /* escape + outside click */
  useEffect(() => {
    if (!open) return
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
  }, [open, closeMenu])

  /* focus the sheet when it opens */
  useEffect(() => {
    if (open) popRef.current?.focus()
  }, [open])

  /* stamp toast lifecycle */
  const showStamp = useCallback((msg: string) => {
    if (stampTimer.current !== null) window.clearTimeout(stampTimer.current)
    setStamp(msg)
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
    const issued = issueExport(includeData)
    closeMenu()
    showStamp(`REV ${pad2(issued)} ISSUED`)
  }

  /* -- import ------------------------------------------------ */
  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setPending(null)
    if (!/\.json$/i.test(file.name)) {
      setError('EXPECTED A .JSON FILE')
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setError('FILE COULD NOT BE READ')
      return
    }
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      setError('FILE IS NOT VALID JSON')
      return
    }
    const res = validateEnvelope(raw)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPending({ data: res.data, fileName: file.name })
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const doReplace = () => {
    if (!pending) return
    const ok = window.confirm(
      `Replace this sheet with "${pending.data.project.name}"?\n\nEvery table and row on the sheet now will be overwritten.`,
    )
    if (!ok) return
    applyReplace(pending.data)
    closeMenu()
    showStamp('SHEET REPLACED')
  }

  /* additive — nothing on the sheet is touched, so no confirm */
  const doMerge = () => {
    if (!pending) return
    applyMerge(pending.data)
    closeMenu()
    showStamp('TABLES ADDED')
  }

  /* -- clear sheet ------------------------------------------- */
  const doClear = () => {
    if (
      !window.confirm(
        'Clear the sheet? Every table, column and row will be wiped, and you will start again from naming your business.',
      )
    )
      return
    if (!window.confirm('Confirm again — this cannot be undone.')) return
    void useProjectStore.getState().resetProject()
    closeMenu()
    showStamp('SHEET CLEARED')
  }

  /* -- derived preview stats --------------------------------- */
  const preview = pending
    ? {
        name: pending.data.project.name,
        rev: pending.data.project.rev,
        tables: pending.data.entities.length,
        columns: pending.data.entities.reduce((n, e) => n + e.fields.length, 0),
        rows: pending.data.rows
          ? Object.values(pending.data.rows).reduce((n, l) => n + l.length, 0)
          : 0,
        /* the design layer, named rather than counted into the grid:
           REPLACE overwrites the dashboard too, and a person deserves
           to see that before they press it */
        also: [
          pending.data.modules?.length
            ? plural(pending.data.modules.length, 'MODULE', 'MODULES')
            : '',
          pending.data.views?.length
            ? plural(pending.data.views.length, 'PAGE', 'PAGES')
            : '',
          pending.data.constraints?.length
            ? plural(pending.data.constraints.length, 'RULE', 'RULES')
            : '',
        ].filter(Boolean),
      }
    : null

  const blank = tableCount === 0

  return (
    <div className="io-root" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="btn io-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : setOpen(true))}
      >
        <GlyphArrows />
        I/O
      </button>

      {open && (
        <div
          className="io-pop"
          role="dialog"
          aria-label="Import / export"
          ref={popRef}
          tabIndex={-1}
        >
          <i className="io-tick io-tick-tl" aria-hidden="true" />
          <i className="io-tick io-tick-tr" aria-hidden="true" />
          <i className="io-tick io-tick-bl" aria-hidden="true" />
          <i className="io-tick io-tick-br" aria-hidden="true" />

          <header className="io-head">
            <span className="mono-label io-head-title">Document Control</span>
            <span className="io-head-rev">REV {pad2(rev)}</span>
          </header>

          <div className="io-body">
            {preview && pending ? (
              /* ---------------- import preview ---------------- */
              <section className="io-section">
                <div className="io-caption">
                  <span className="mono-label">This File Holds</span>
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
                  {preview.also.length > 0 && (
                    <div className="io-plate-also">ALSO — {preview.also.join(' · ')}</div>
                  )}
                  <div className="io-plate-src">
                    SOURCE — {pending.fileName}
                  </div>
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
                  <button type="button" className="btn io-replace" onClick={doReplace}>
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
                      <span className="io-card-sub">Tables, rows, modules and pages</span>
                      <span className="io-card-meta">
                        {plural(tableCount, 'TABLE', 'TABLES')} ·{' '}
                        {plural(rowCount, 'ROW', 'ROWS')}
                        {moduleCount > 0
                          ? ` · ${plural(moduleCount, 'MODULE', 'MODULES')}`
                          : ''}
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
                      {/* modules and pages are STRUCTURE, not data: they say
                          how the business is arranged, and only the rows are
                          the contents. So this leaves out rows and nothing
                          else. */}
                      <span className="io-card-sub">Tables and pages, no rows</span>
                      <span className="io-card-meta">
                        {plural(tableCount, 'TABLE', 'TABLES')}
                        {pageCount > 0 ? ` · ${plural(pageCount, 'PAGE', 'PAGES')}` : ''} · NO
                        ROWS
                      </span>
                    </button>
                  </div>
                  {blank && (
                    <p className="io-blank-note">NOTHING ON THE SHEET TO SAVE YET</p>
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
                    <span className="io-drop-main">DROP .JSON HERE</span>
                    <span className="io-drop-sub">OR CLICK TO BROWSE</span>
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
                  {error && (
                    <p className="io-error" role="alert">
                      <strong>REJECTED</strong> — {error}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>

          <footer className="io-foot">
            <button type="button" className="io-clear" onClick={doClear}>
              Clear Sheet
            </button>
            <span className="io-foot-sig">HELMLOGIC · DOC CTRL</span>
          </footer>
        </div>
      )}

      {stamp && (
        <div className="io-stamp" role="status" aria-live="polite">
          {stamp}
        </div>
      )}
    </div>
  )
}
