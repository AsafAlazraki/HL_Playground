/* ============================================================
   RULES — the index of rules, beside the index of entities.

   Create (choosing a root entity), select, rename in place,
   delete with a confirm, and a validity stamp per rule.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { ruleReach, useAllRuleIssues } from './useRuleIssues'
import './rules.css'

const pad2 = (n: number): string => String(n).padStart(2, '0')

export function RulesList() {
  const rules = useProjectStore((s) => s.rules)
  const entities = useProjectStore((s) => s.entities)
  const activeRuleId = useProjectStore((s) => s.activeRuleId)
  const setActiveRule = useProjectStore((s) => s.setActiveRule)
  const select = useProjectStore((s) => s.select)
  const createRule = useProjectStore((s) => s.createRule)
  const updateRule = useProjectStore((s) => s.updateRule)
  const deleteRule = useProjectStore((s) => s.deleteRule)
  const issuesByRule = useAllRuleIssues()

  const [drafting, setDrafting] = useState(false)
  const [draftRoot, setDraftRoot] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)

  const entityList = useMemo(
    () =>
      Object.values(entities).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
      ),
    [entities],
  )

  const ruleList = useMemo(
    () =>
      Object.values(rules).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
      ),
    [rules],
  )

  const openRule = (id: string) => {
    setActiveRule(id)
    select({ kind: 'rule', id })
  }

  const startDraft = () => {
    setDraftRoot(entityList[0]?.id ?? '')
    setDrafting(true)
  }

  const commitDraft = () => {
    if (!draftRoot) return
    const rule = createRule(draftRoot)
    setDrafting(false)
    openRule(rule.id)
  }

  const remove = (id: string, name: string) => {
    if (!window.confirm(`Delete rule "${name}"? The flow you drew is removed with it.`)) {
      return
    }
    if (activeRuleId === id) setActiveRule(null)
    deleteRule(id)
  }

  return (
    <div className="rl-rules">
      <div className="rl-panel-head">
        <span className="mono-label">Rules</span>
        <span className="rl-panel-count">{pad2(ruleList.length)}</span>
      </div>

      {entityList.length === 0 ? (
        <div className="rl-empty">
          <span className="rl-empty-title">Nothing to reason about yet</span>
          <span className="rl-empty-hint">
            Draft a table on the sheet first — a rule always walks the rows of one.
          </span>
        </div>
      ) : (
        <>
          {ruleList.length === 0 && !drafting ? (
            <div className="rl-empty">
              <span className="rl-empty-title">No rules drawn</span>
              <span className="rl-empty-hint">
                A rule walks every row of one table and matches, routes or writes from there.
              </span>
            </div>
          ) : null}

          <ul className="rl-rulelist">
            {ruleList.map((r) => {
              const isActive = activeRuleId === r.id
              const root = entities[r.rootEntityId]
              const summary = issuesByRule[r.id]
              const ok = summary?.ok ?? false
              const blockers = summary?.blockers.length ?? 0
              /* "no blockers" is not "ready" — see RuleToolbar */
              const reach = ruleReach(r)
              const wired = reach.reachesOutput || reach.reachesAction
              return (
                <li key={r.id} className={`rl-ruleitem${isActive ? ' is-active' : ''}`}>
                  {renaming === r.id ? (
                    <input
                      className="field-input rl-input rl-rename"
                      autoFocus
                      aria-label={`Rename ${r.name}`}
                      defaultValue={r.name}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          e.stopPropagation()
                          e.currentTarget.value = r.name
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={(e) => {
                        const name = e.currentTarget.value.trim()
                        if (name && name !== r.name) updateRule(r.id, { name })
                        setRenaming(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="rl-ruleopen"
                      aria-current={isActive || undefined}
                      onClick={() => openRule(r.id)}
                      onDoubleClick={() => setRenaming(r.id)}
                      /* THE NAME IS IN THE TITLE because the rail is
                         192px wide and two rules named after the same
                         brand are told apart by their last few words —
                         which are exactly the words the ellipsis eats. */
                      title={`${r.name} — ${r.nodes.length} step${
                        r.nodes.length === 1 ? '' : 's'
                      }${root ? `, walks every row of ${root.name}` : ''}`}
                    >
                      <span
                        className="rl-ruledot"
                        style={
                          {
                            '--rl-stamp-ink': root
                              ? accentVar(root.accent)
                              : 'var(--ink-faint)',
                          } as CSSProperties
                        }
                        aria-hidden="true"
                      />
                      <span className="rl-rulename">{r.name}</span>
                      {/* A STATE, SAID OUT LOUD. Unlabelled, this read
                          as a checkbox to tick — and it said "Ready to
                          run" about rules whose steps join up to
                          nothing. It now says the same thing the
                          toolbar's stamp says, in the same words. */}
                      <span
                        className={`rl-dotstamp${
                          !ok ? ' is-blocked' : wired ? ' is-ok' : ' is-adrift'
                        }`}
                        role="img"
                        aria-label={
                          !ok
                            ? `${blockers} thing${blockers === 1 ? '' : 's'} to fix`
                            : wired
                              ? 'Ready to run'
                              : 'Steps not joined up yet'
                        }
                        title={
                          !ok
                            ? `${blockers} thing${blockers === 1 ? '' : 's'} to fix before this can run`
                            : wired
                              ? 'Ready to run'
                              : 'Nothing set up wrongly, but the steps do not join up to an answer yet'
                        }
                      >
                        {!ok ? blockers || '!' : wired ? '✓' : '–'}
                      </span>
                    </button>
                  )}

                  <div className="rl-ruleacts">
                    <button
                      type="button"
                      className="rl-icon"
                      aria-label={`Rename ${r.name}`}
                      title="Rename"
                      onClick={() => setRenaming(r.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="rl-icon rl-icon--danger"
                      aria-label={`Delete ${r.name}`}
                      title="Delete"
                      onClick={() => remove(r.id, r.name)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {drafting ? (
            <div className="rl-draft">
              <span className="mono-label rl-block-lab">Walks every row of</span>
              <select
                className="rl-select rl-select--wide"
                aria-label="The table the new rule walks"
                value={draftRoot}
                autoFocus
                onChange={(e) => setDraftRoot(e.currentTarget.value)}
              >
                {entityList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <div className="rl-draft-acts">
                <button type="button" className="btn" onClick={() => setDrafting(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={commitDraft}
                  disabled={!draftRoot}
                >
                  Draft rule
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn rl-add" onClick={startDraft}>
              + New rule
            </button>
          )}
        </>
      )}
    </div>
  )
}
