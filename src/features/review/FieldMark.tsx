/* ============================================================
   FieldMark — the mark drawn beside a single field row in the
   designer. Collapsed it is a pencil tick plus the short rule
   title; opened it gives the reason and, where one exists, the
   correction. The `title` attribute carries the same reason for
   anyone who never opens it.

   THE FIX ASKS HERE TOO, and it asks the same question the rail
   asks, through the same sheet. `FixConfirm` decides whether a
   given fix owes one — a rename does not, anything that can drop
   a value does — so the two surfaces cannot answer one question
   two ways, which is the failure ConfirmSheet's own header names.

   The `open` flag is DERIVED rather than corrected. It used to be
   state that an effect reset to false whenever the last mark on
   the row cleared, which is a render scheduled to undo the render
   before it; the flag now simply cannot be true with nothing to
   show.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { applyLintFix } from '@/lib/lint'
import type { LintFinding, LintFix } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'
import { useEntityFindings } from './useLintFindings'
import { fieldNamesOf, ruleTitle } from './describe'
import { FixConfirm, fixesNeedConfirm } from './FixConfirm'
import { AdvisoryMark, Caret, PencilCross, PencilTick } from './glyphs'
import './review.css'

const FLASH_MS = 1500

interface Pending {
  fix: LintFix
  where: string
  columns: string[]
}

function MarkItem({
  finding,
  showTitle,
  onApply,
}: {
  finding: LintFinding
  showTitle: boolean
  onApply: (finding: LintFinding, fix: LintFix) => void
}): JSX.Element {
  const fix = finding.fix
  return (
    <div className="rv-fm-item">
      {showTitle ? (
        <span className="rv-fm-item-title">{ruleTitle(finding.title)}</span>
      ) : null}
      <p className="rv-fm-why">{finding.why}</p>
      {fix ? (
        <button
          type="button"
          className="rv-apply rv-apply-sm"
          onClick={() => onApply(finding, fix)}
          title={fix.label}
        >
          Apply fix
        </button>
      ) : null}
    </div>
  )
}

/** Inline mark for one field inside the designer. Renders null when clean. */
export function FieldMark({
  entityId,
  fieldId,
}: {
  entityId: string
  fieldId: string
}): JSX.Element | null {
  const findings = useEntityFindings(entityId, fieldId)
  const entity = useProjectStore((s) => s.entities[entityId])
  const [wantOpen, setWantOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const count = findings.length
  const open = wantOpen && count > 0

  const commit = (fix: LintFix) => {
    applyLintFix(fix)
    setFlash(fix.label)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlash(null), FLASH_MS)
  }

  const request = (finding: LintFinding, fix: LintFix) => {
    if (!fixesNeedConfirm([fix])) {
      commit(fix)
      return
    }
    setPending({
      fix,
      where: entity?.name ?? 'this table',
      columns: fieldNamesOf(finding, entity),
    })
  }

  const sheet = pending ? (
    <FixConfirm
      fixes={[pending.fix]}
      where={pending.where}
      columns={pending.columns}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const fix = pending.fix
        setPending(null)
        commit(fix)
      }}
    />
  ) : null

  if (count === 0) {
    if (!flash) return sheet
    return (
      <div className="rv-fm rv-fm-cleared" data-severity="advisory">
        <span className="rv-fm-glyph" aria-hidden="true">
          <PencilTick />
        </span>
        <span className="rv-fm-flash" role="status">
          Cleared · {flash}
        </span>
        {sheet}
      </div>
    )
  }

  const first = findings[0]
  const blocker = findings.some((f) => f.severity === 'blocker')
  const tip = findings.map((f) => `${f.title} — ${f.why}`).join('\n\n')

  return (
    <div className={`rv-fm${open ? ' is-open' : ''}`} data-severity={blocker ? 'blocker' : 'advisory'}>
      <button
        type="button"
        className="rv-fm-trigger"
        aria-expanded={open}
        title={tip}
        onClick={() => setWantOpen((o) => !o)}
      >
        <span className="rv-fm-glyph" aria-hidden="true">
          {blocker ? <PencilCross /> : <AdvisoryMark />}
        </span>
        <span className="rv-fm-title">{ruleTitle(first.title)}</span>
        {count > 1 ? <span className="rv-fm-more">+{count - 1}</span> : null}
        <span className="rv-fm-caret" aria-hidden="true">
          <Caret open={open} />
        </span>
      </button>

      {open ? (
        <div className="rv-fm-body">
          {findings.map((f) => (
            <MarkItem key={f.id} finding={f} showTitle={count > 1} onApply={request} />
          ))}
        </div>
      ) : null}

      {flash ? (
        <span className="rv-fm-flash" role="status">
          Cleared · {flash}
        </span>
      ) : null}

      {sheet}
    </div>
  )
}
