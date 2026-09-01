/* ============================================================
   "START FROM A FILE I ALREADY HAVE" — the first-run answer that
   was missing, and the way out of a trap.

   THE TRAP, MEASURED. CLEAR SHEET calls `resetProject`, which wipes
   meta including the organisation: entities 0, rows 0, views 0,
   modules 0, rules 0, meta 0. The shell's gate is `!org &&
   tableCount === 0`, so the very next frame is onboarding — and the
   ONLY import door in the app was on Home's toolbar, which is now
   behind that gate. A person who cleared their sheet in order to
   restore a backup could not restore it. There was no way out.

   SO THE DOOR BELONGS HERE, and not only as a rescue. "I already
   have a file" is one of the three honest answers to "what do you
   want on the sheet?", alongside "start empty" and "load the worked
   example", and a first run is exactly when somebody moving between
   two machines has a file in their downloads folder.

   NOTHING IS ASKED BEFORE IT LOADS. This screen exists only when the
   sheet is empty — that is the condition the shell draws onboarding
   on — so a replace here can take nothing from anybody, and a
   confirm would be a full stop in front of a door.

   THE REFUSALS ARE THE IMPORT MENU'S OWN, word for word
   (`readEnvelopeFile`). Two doors into the same feature that
   disagreed about why a file was rejected would be two apps.
   ============================================================ */

import { useRef, useState } from 'react'
import type { DragEvent, ReactElement } from 'react'
import type { ProjectExport } from '@/types/model'
import {
  applyReplace,
  pad2,
  readEnvelopeFile,
  summariseEnvelope,
  type EnvelopeSummary,
} from '@/features/io'
import { HelmMark } from './symbols'

function BackArrow() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true" focusable="false">
      <path
        d="M4.4 1 L1 4.5 L4.4 8 M1 4.5 H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GlyphDrop() {
  return (
    <svg className="ob-drop-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5v9M10 11.5 6.5 8M10 11.5 13.5 8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3 12.5v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 15.5v-3"
        fill="none"
        stroke="currentColor"
      />
    </svg>
  )
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** What else the file carries, named rather than counted into the grid:
 *  a saved copy holds the dashboard and the pages somebody designed,
 *  and "Tables 21 · Rows 651" looks identical whether it does or not. */
function alsoLine(s: EnvelopeSummary): string[] {
  return [
    s.modules > 0 ? plural(s.modules, 'MODULE', 'MODULES') : '',
    s.pages > 0 ? plural(s.pages, 'PAGE', 'PAGES') : '',
    s.rules > 0 ? plural(s.rules, 'RULE', 'RULES') : '',
  ].filter(Boolean)
}

export interface OpenSavedCopyProps {
  onBack: () => void
}

export function OpenSavedCopy({ onBack }: OpenSavedCopyProps): ReactElement {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ data: ProjectExport; fileName: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const take = async (file: File): Promise<void> => {
    setError(null)
    setPending(null)
    const res = await readEnvelopeFile(file)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPending({ data: res.data, fileName: res.fileName })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void take(file)
  }

  const summary = pending ? summariseEnvelope(pending.data) : null
  const also = summary ? alsoLine(summary) : []

  return (
    <section className="ob-screen">
      {/* THE SAME SPLIT AS THE NAME SCREEN, for the same reason and by
          the same container query: what is being asked on the left,
          what you do about it on the right. A door that looked like a
          different product from the screen one press behind it is not a
          door, it is a detour. */}
      <div className="ob-card ob-card--split">
        <span className="ob-tick ob-tick--tl" aria-hidden="true" />
        <span className="ob-tick ob-tick--tr" aria-hidden="true" />
        <span className="ob-tick ob-tick--bl" aria-hidden="true" />
        <span className="ob-tick ob-tick--br" aria-hidden="true" />

        {/* see Onboarding.tsx — the container is the card, the grid is
            one step inside it */}
        <div className="ob-card-body">
          <div className="ob-card-say">
            <div className="ob-mark">
              <HelmMark />
              <span className="ob-mark-word block-heading">HelmLogic</span>
            </div>
            <div className="ob-rule" aria-hidden="true" />

            <h1 className="ob-ask">Open a saved copy</h1>
            <p className="ob-note">
              A .json file this app saved earlier puts its tables, rows, modules and pages
              back on the sheet, exactly as they were.
            </p>
          </div>

          <div className="ob-card-do">
            {summary && pending ? (
              <>
                <span className="ob-field-label">This file holds</span>
                <div className="ob-plate">
                  <div className="ob-plate-head">
                    <span className="ob-plate-name">{summary.name}</span>
                    <span className="ob-plate-rev">REV {pad2(summary.rev)}</span>
                  </div>
                  <div className="ob-plate-grid">
                    <div className="ob-stat">
                      <span className="ob-stat-num">{summary.tables}</span>
                      <span className="ob-stat-lbl">Tables</span>
                    </div>
                    <div className="ob-stat">
                      <span className="ob-stat-num">{summary.columns}</span>
                      <span className="ob-stat-lbl">Columns</span>
                    </div>
                    <div className="ob-stat">
                      <span className="ob-stat-num">{summary.rows}</span>
                      <span className="ob-stat-lbl">Rows</span>
                    </div>
                  </div>
                  {/* SENTENCE CASE, IN THE MARKUP. These two read "ALSO —"
                    and "SOURCE —" as literal capitals, which no
                    `text-transform` pass could have caught — and the
                    second one names the FILE the person just chose, so
                    their `Boats-Feb.json` came back as `BOATS-FEB.JSON`.
                    A file name is a value. The io panel's own copy of
                    this plate (`.io-plate-also`, `.io-plate-src`) was
                    corrected to "Also —" / "Source —" by the pass at
                    io.css:770 and this one was missed, so the same plate
                    was drawn two ways one screen apart. */}
                  {also.length > 0 && (
                    <div className="ob-plate-also">Also — {also.join(' · ')}</div>
                  )}
                  <div className="ob-plate-also">Source — {pending.fileName}</div>
                </div>

                <button
                  type="button"
                  className="ob-primary"
                  onClick={() => {
                    applyReplace(pending.data)
                  }}
                >
                  Put it on the sheet
                </button>
                <button
                  type="button"
                  className="ob-alt"
                  onClick={() => {
                    setPending(null)
                    setError(null)
                  }}
                >
                  Choose a different file
                </button>
              </>
            ) : (
              <>
                <span className="ob-field-label">The file</span>
                <button
                  type="button"
                  className={`ob-drop${dragOver ? ' is-over' : ''}`}
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
                  <span className="ob-drop-main">Choose a file</span>
                  <span className="ob-drop-sub">or drop one here</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="ob-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void take(file)
                    e.target.value = ''
                  }}
                />
                {/* THE REFUSAL SAYS WHY, WHERE IT WAS REFUSED — never a
                  toast, never a tooltip, and never silence. */}
                {error && (
                  <p className="ob-refuse" role="alert">
                    <strong>Rejected</strong> {error}
                  </p>
                )}
              </>
            )}

            <button type="button" className="ob-alt ob-alt--back" onClick={onBack}>
              <BackArrow />
              Back
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
