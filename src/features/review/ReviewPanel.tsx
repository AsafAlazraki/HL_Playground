/* ============================================================
   ReviewPanel — the red-pencil rail.

   A senior architect's pass over the drawing: a sheet-health
   stamp at the top, then every mark grouped by the entity it
   belongs to, blockers first. Each mark teaches (the `why`
   sentence gets the typographic care) and, where the engine can
   derive one, offers a single-click correction.

   Applying a fix mutates the store, which re-derives the list —
   so the card is gone on the very next render. We hold a short
   "mark cleared" ghost in its place so the correction is legible
   instead of a silent disappearance.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { accentVar } from '@/types/model'
import type { AccentKey, EntityDef } from '@/types/model'
import { applyLintFix } from '@/lib/lint'
import type { FindingSeverity, LintFinding } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'
import { useLintFindings } from './useLintFindings'
import { marksLabel, pluralize, targetLine } from './describe'
import { CloseGlyph, PencilCross, PencilTick, PlateTicks, TargetArrow } from './glyphs'
import './review.css'

const FLASH_MS = 1500

interface Flash {
  key: number
  findingId: string
  entityId: string
  entityName: string
  accent: AccentKey
  title: string
  severity: FindingSeverity
  fixLabel: string
  /** position the mark held inside its group when the fix was applied */
  index: number
}

interface Group {
  entityId: string
  name: string
  accent: AccentKey
  entity: EntityDef | undefined
  findings: LintFinding[]
  ghosts: Flash[]
}

let flashSeq = 0

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/* ---------------------------------------------------------- */
/* Cards                                                      */
/* ---------------------------------------------------------- */

function FindingCard({
  finding,
  entity,
  flashing,
  onSelect,
  onApply,
}: {
  finding: LintFinding
  entity: EntityDef | undefined
  flashing: boolean
  onSelect: () => void
  onApply: () => void
}): JSX.Element {
  const blocker = finding.severity === 'blocker'
  return (
    <article
      className={`rv-card${flashing ? ' is-flashing' : ''}`}
      data-severity={finding.severity}
    >
      <button
        type="button"
        className="rv-card-head"
        onClick={onSelect}
        title={entity ? `Focus ${entity.name} on the sheet` : 'Focus on the sheet'}
      >
        <span className="rv-card-titlerow">
          <span className="rv-card-mark" aria-hidden="true">
            {blocker ? <PencilCross /> : <PencilTick />}
          </span>
          <span className="rv-card-title">{finding.title}</span>
          <span className="rv-card-sev">{blocker ? 'Blocker' : 'Advisory'}</span>
        </span>
        <span className="rv-card-target">
          <span className="rv-card-arrow" aria-hidden="true">
            <TargetArrow />
          </span>
          <span className="rv-card-address">{targetLine(finding, entity)}</span>
        </span>
      </button>

      <p className="rv-why">{finding.why}</p>

      {finding.fix ? (
        <div className="rv-fix">
          <span className="rv-fix-label">{finding.fix.label}</span>
          <button type="button" className="rv-apply" onClick={onApply} title={finding.fix.label}>
            Apply fix
          </button>
        </div>
      ) : null}
    </article>
  )
}

function GhostCard({ flash }: { flash: Flash }): JSX.Element {
  return (
    <article className="rv-card rv-ghost" data-severity={flash.severity} aria-hidden="true">
      <span className="rv-ghost-row">
        <span className="rv-ghost-mark">
          <PencilTick />
        </span>
        <span className="rv-ghost-title">{flash.title}</span>
      </span>
      <span className="rv-ghost-note">Mark cleared · {flash.fixLabel}</span>
    </article>
  )
}

/* ---------------------------------------------------------- */
/* Empty (clean sheet) plate                                  */
/* ---------------------------------------------------------- */

function CleanPlate({ hasEntities }: { hasEntities: boolean }): JSX.Element {
  return (
    <div className="rv-clean">
      <div className="rv-clean-plate">
        <PlateTicks />
        <span className="rv-clean-stamp">{hasEntities ? 'Clean sheet' : 'Nothing drawn yet'}</span>
        <span className="rv-clean-rule" aria-hidden="true" />
        <p className="rv-clean-prose">
          {hasEntities
            ? 'Nothing to correct on this drawing. Marks appear the moment the model drifts — naming, links, repeated columns, stored calculations — and clear themselves the moment you fix them.'
            : 'Draw an entity and the review starts. Every mark comes with the reason behind it, so the sheet teaches while you work.'}
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* Panel                                                      */
/* ---------------------------------------------------------- */

/** Right-rail review panel. `onClose` closes the rail. */
export function ReviewPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const findings = useLintFindings()
  const entities = useProjectStore((s) => s.entities)
  const select = useProjectStore((s) => s.select)

  const [flashes, setFlashes] = useState<Flash[]>([])
  const [announce, setAnnounce] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
      timers.current = []
    },
    [],
  )

  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)
  const total = findings.length
  const advisories = total - blockers
  const clean = total === 0
  const entityCount = Object.keys(entities).length

  const apply = (finding: LintFinding, index: number, entity: EntityDef | undefined) => {
    const fix = finding.fix
    if (!fix) return
    applyLintFix(fix)

    const flash: Flash = {
      key: (flashSeq += 1),
      findingId: finding.id,
      entityId: finding.entityId,
      entityName: entity?.name ?? '',
      accent: entity?.accent ?? 'graphite',
      title: finding.title,
      severity: finding.severity,
      fixLabel: fix.label,
      index,
    }
    setFlashes((prev) => [...prev, flash])
    setAnnounce(`${fix.label} — applied.`)

    const t = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.key !== flash.key))
    }, FLASH_MS)
    timers.current.push(t)
  }

  const { groups, flashingIds } = useMemo(() => {
    const map = new Map<string, Group>()
    const liveIds = new Set<string>()

    for (const f of findings) {
      liveIds.add(f.id)
      let g = map.get(f.entityId)
      if (!g) {
        const entity = entities[f.entityId]
        g = {
          entityId: f.entityId,
          name: entity?.name ?? 'Deleted entity',
          accent: entity?.accent ?? 'graphite',
          entity,
          findings: [],
          ghosts: [],
        }
        map.set(f.entityId, g)
      }
      g.findings.push(f)
    }

    const flashing = new Set<string>()
    for (const flash of flashes) {
      if (liveIds.has(flash.findingId)) {
        // the fix did not clear this mark — flash it in place instead
        flashing.add(flash.findingId)
        continue
      }
      let g = map.get(flash.entityId)
      if (!g) {
        const entity = entities[flash.entityId]
        g = {
          entityId: flash.entityId,
          name: entity?.name ?? (flash.entityName || 'Deleted entity'),
          accent: entity?.accent ?? flash.accent,
          entity,
          findings: [],
          ghosts: [],
        }
        map.set(flash.entityId, g)
      }
      g.ghosts.push(flash)
    }

    // same ordering rule the lint engine uses, so a ghost-only group keeps its place
    const ordered = [...map.values()].sort(
      (a, b) => cmp(a.name.trim().toLowerCase(), b.name.trim().toLowerCase()) || cmp(a.entityId, b.entityId),
    )
    return { groups: ordered, flashingIds: flashing }
  }, [findings, flashes, entities])

  return (
    <aside className="rv-rail" aria-label="Red-pencil review">
      <header className="rv-head">
        <div className="rv-head-row">
          <span className="mono-label rv-eyebrow">Review</span>
          <span className="rv-head-rule" aria-hidden="true" />
          <button
            type="button"
            className="rv-close"
            onClick={onClose}
            aria-label="Close review"
            title="Close review"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className={`rv-stamp${clean ? ' is-clean' : ' is-marked'}`}>
          <PlateTicks />
          <span className="rv-stamp-mark">{clean ? 'Clean sheet' : marksLabel(total)}</span>
          {clean ? (
            <span className="rv-stamp-split">
              <span className="rv-seg is-live">Checked</span>
            </span>
          ) : (
            <span className="rv-stamp-split">
              <span className={`rv-seg${blockers > 0 ? ' is-live' : ''}`}>
                {pluralize(blockers, 'blocker', 'blockers')}
              </span>
              <span className="rv-seg-sep" aria-hidden="true">
                ·
              </span>
              <span className={`rv-seg${advisories > 0 ? ' is-live' : ''}`}>
                {pluralize(advisories, 'advisory', 'advisories')}
              </span>
            </span>
          )}
        </div>

        <p className="rv-sr-live" role="status" aria-live="polite">
          {announce}
        </p>
      </header>

      <div className="rv-body">
        {groups.length === 0 ? (
          <CleanPlate hasEntities={entityCount > 0} />
        ) : (
          groups.map((g) => {
            const items: JSX.Element[] = g.findings.map((f, i) => (
              <FindingCard
                key={f.id}
                finding={f}
                entity={g.entity}
                flashing={flashingIds.has(f.id)}
                onSelect={() => select({ kind: 'entity', id: g.entityId })}
                onApply={() => apply(f, i, g.entity)}
              />
            ))
            for (const ghost of g.ghosts) {
              items.splice(Math.min(ghost.index, items.length), 0, (
                <GhostCard key={`ghost-${ghost.key}`} flash={ghost} />
              ))
            }
            const liveCount = g.findings.length
            return (
              <section className="rv-group" key={g.entityId}>
                <header className="rv-group-head">
                  <span
                    className="rv-dot"
                    style={{ '--rv-accent': accentVar(g.accent) } as CSSProperties}
                    aria-hidden="true"
                  />
                  <h3 className="rv-group-name block-heading" title={g.name}>
                    {g.name}
                  </h3>
                  <span className="rv-group-count">{liveCount}</span>
                </header>
                <div className="rv-cards">{items}</div>
              </section>
            )
          })
        )}
      </div>
    </aside>
  )
}
