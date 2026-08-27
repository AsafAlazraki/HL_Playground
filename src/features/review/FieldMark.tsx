/* ============================================================
   FieldMark — the mark drawn beside a single field row in the
   designer. Collapsed it is a pencil tick plus the short rule
   title; opened it gives the reason and, where one exists, the
   correction. The `title` attribute carries the same reason for
   anyone who never opens it.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { applyLintFix } from '@/lib/lint'
import type { LintFinding, LintFix } from '@/lib/lint'
import { useEntityFindings } from './useLintFindings'
import { ruleTitle } from './describe'
import { AdvisoryMark, Caret, PencilCross, PencilTick } from './glyphs'
import './review.css'

const FLASH_MS = 1500

function MarkItem({
  finding,
  showTitle,
  onApply,
}: {
  finding: LintFinding
  showTitle: boolean
  onApply: (fix: LintFix) => void
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
          onClick={() => onApply(fix)}
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
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const count = findings.length
  useEffect(() => {
    if (count === 0) setOpen(false)
  }, [count])

  const onApply = (fix: LintFix) => {
    applyLintFix(fix)
    setFlash(fix.label)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlash(null), FLASH_MS)
  }

  if (count === 0) {
    if (!flash) return null
    return (
      <div className="rv-fm rv-fm-cleared" data-severity="advisory">
        <span className="rv-fm-glyph" aria-hidden="true">
          <PencilTick />
        </span>
        <span className="rv-fm-flash" role="status">
          Cleared · {flash}
        </span>
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
        onClick={() => setOpen((o) => !o)}
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
            <MarkItem key={f.id} finding={f} showTitle={count > 1} onApply={onApply} />
          ))}
        </div>
      ) : null}

      {flash ? (
        <span className="rv-fm-flash" role="status">
          Cleared · {flash}
        </span>
      ) : null}
    </div>
  )
}
