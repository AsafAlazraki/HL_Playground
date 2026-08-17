/* ============================================================
   THE MASTHEAD — cut down from the engineering title block.

   What it carries now: the HELMLOGIC mark, the ORGANISATION
   (click to rename), the INDUSTRY as a quiet stamp, and I/O.

   WHAT CAME OFF, and why: SHEET · SCALE · REV · DATE were four
   compartments of read-only metadata nobody acts on; the CHECK
   stamp opened a rail this build no longer has; the SHEET|TABLE
   switch chose between two lenses when there is only one — the
   tables ARE the view. RESET moved into the I/O popover, where
   it sits at the foot as CLEAR SHEET. What is left is a calm
   masthead: who you are, what you sell, one door out.

   THE INDUSTRY MARK COMES FROM `@/lib/icons`. Four hand-drawn
   14px SVGs used to live in this file — a fourth private copy of
   marks the app already had. Marks are library work now; this
   screen's job is layout and type.

   AND ONE FIELD, WHICH IS THE ONE THING THIS BAR GAINED BACK.
   With the real file loaded — 21 tables, 651 rows — the app had no
   search anywhere: `querySelectorAll('input,textarea')` came back
   empty and Ctrl+K opened nothing. Reaching one boat cost six
   clicks, one dead end and a 1,203px scroll, and only worked
   because the person already knew which of the 21 tables it was
   in. The masthead is the only chrome on screen for all six stages
   AND the sheet, so it is the only place a search field can be
   unscoped. It sits in the actions compartment beside the one door
   out; everything about how it behaves is `@/features/search`.
   ============================================================ */

import { useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { ImportExportMenu } from '@/features/io'
import { SearchField } from '@/features/search'
import { ICON_SIZE, INDUSTRY_ICON, weightFor } from '@/lib/icons'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'

/* ------------------------------------------------------------ */

export interface TopBarProps {
  /** THE DOOR THE SEARCH FIELD NEEDS AND CANNOT OPEN ITSELF.
   *  Choosing a result selects the table, and the sheet walks its
   *  camera to it — but while a stage covers the sheet that pan
   *  happens underneath something opaque. Only the shell knows a
   *  stage is open and only the shell can close it, so the field
   *  asks through here. Unset, the selection still lands and is
   *  waiting the moment the stage is closed. */
  onRevealTable?: (entityId: string) => void
}

export function TopBar({ onRevealTable }: TopBarProps = {}) {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)
  const setOrganisation = useProjectStore((s) => s.setOrganisation)
  const setProjectName = useProjectStore((s) => s.setProjectName)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)

  const name = org?.name || projectName
  const industry: IndustryKey = org?.industry ?? 'marine'
  const IndustryMark = INDUSTRY_ICON[industry]

  const beginEdit = () => {
    setDraft(name)
    cancelled.current = false
    setEditing(true)
  }

  const commit = () => {
    if (!cancelled.current) {
      /* the organisation IS the project — renaming it has to move both,
         or the export and the masthead start disagreeing */
      if (org) setOrganisation(draft, org.industry)
      else setProjectName(draft)
    }
    cancelled.current = false
    setEditing(false)
  }

  return (
    <header className="shell-masthead">
      <div className="shell-mark" title="HelmLogic Dynamic Config">
        <span className="shell-mark-brand">Helmlogic</span>
        <span className="shell-mark-product block-heading">Dynamic Config</span>
      </div>

      <div className="shell-org">
        {editing ? (
          <input
            className="shell-org-input block-heading"
            value={draft}
            autoFocus
            spellCheck={false}
            aria-label="Organisation name"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                e.stopPropagation()
                cancelled.current = true
                e.currentTarget.blur()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="shell-org-name block-heading"
            title="Click to rename"
            onClick={beginEdit}
          >
            {name}
          </button>
        )}

        <span className="shell-org-industry" title={INDUSTRIES[industry].blurb}>
          <IndustryMark
            className="shell-org-mark"
            size={ICON_SIZE.tiny}
            weight={weightFor(ICON_SIZE.tiny)}
            aria-hidden="true"
          />
          {INDUSTRIES[industry].label}
        </span>
      </div>

      <div className="shell-masthead-actions">
        <SearchField onReveal={onRevealTable} />
        <ImportExportMenu />
      </div>
    </header>
  )
}
