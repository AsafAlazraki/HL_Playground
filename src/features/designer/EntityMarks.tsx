/* ============================================================
   Entity-level reviewer marks — the strip of red-pencil notes
   the sheet carries in its margin, under the title block.

   Field-level marks live on their own rows (<FieldMark/>); this
   strip is only what is said about the entity as a whole.
   Marks are annotations, not form errors: a pencil rule in the
   margin, a stamped label, the WHY in plain prose.
   ============================================================ */

import { applyLintFix, type LintFinding } from '@/lib/lint'
import { useEntityFindings } from '@/features/review'
/* Phosphor only — the double caret a reviewer leaves in a margin. */
import { CaretDoubleRight } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'

/** the whole-entity rules — everything else is a field's business */
const ENTITY_RULES = new Set([
  'entity-plural',
  'entity-vague',
  'no-identifier',
  'island-entity',
  'entity-dup-name',
])

export function EntityMarks({ entityId }: { entityId: string }) {
  const findings = useEntityFindings(entityId)
  /* A finding that names a field is that field's mark and is already written
     in its row by <FieldMark/> — 'no-identifier' carries one whenever it can
     point at the identifying field, and the same sentence with the same fix
     must not be said twice on one sheet. Where it names no field, nobody
     else can speak for it, so the strip keeps it. */
  const marks = findings.filter(
    (f) => ENTITY_RULES.has(f.ruleId) && !(f.fieldIds && f.fieldIds.length > 0),
  )
  if (marks.length === 0) return null

  const blockers = marks.filter((m) => m.severity === 'blocker').length

  return (
    <section className="ds-marks" aria-label="Reviewer marks on this entity">
      <div className="ds-sect ds-sect-mark">
        <span className="mono-label ds-sect-label">Marks</span>
        <span className="ds-sect-rule" aria-hidden="true" />
        <span className="mono-label ds-sect-meta">
          {blockers > 0
            ? `${String(blockers).padStart(2, '0')} blocking`
            : String(marks.length).padStart(2, '0')}
        </span>
      </div>

      <ul className="ds-mark-list">
        {marks.map((m) => (
          <MarkRow key={m.id} finding={m} />
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------ */

function MarkRow({ finding }: { finding: LintFinding }) {
  const fix = finding.fix
  return (
    <li className={finding.severity === 'blocker' ? 'ds-mark ds-mark-blocker' : 'ds-mark'}>
      <span className="ds-mark-gut" aria-hidden="true">
        <CaretDoubleRight size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
      </span>
      <div className="ds-mark-body">
        <span className="mono-label ds-mark-title">{finding.title}</span>
        <p className="ds-mark-why">{finding.why}</p>
        {fix ? (
          <div className="ds-mark-fixrow">
            <button
              type="button"
              className="ds-mark-fix"
              onClick={() => applyLintFix(fix)}
              title={fix.label}
            >
              Apply fix
            </button>
            <span className="ds-mark-fixlabel">{fix.label}</span>
          </div>
        ) : null}
      </div>
    </li>
  )
}
