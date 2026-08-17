/* ============================================================
   RULE INSPECTOR — the chrome panel for one node.

   White instrument panel, marine-navy ink, mono micro-labels.
   Every control writes through a store action with a FRESH config
   object; nothing here mutates what it was handed.
   ============================================================ */

import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import { RULE_NODE_KINDS } from '@/types/model'
import type {
  ActionOp,
  ConditionBranch,
  EntityDef,
  FieldDef,
  RowScope,
  RuleDef,
  RuleNode,
  RuleNodeConfigMap,
  RuleNodeKind,
  ValueExpr,
  ViewColumn,
} from '@/types/model'
import { newId } from '@/lib/id'
import { ClauseEditor, EntityStamp, FieldSelect, ValueEditor } from './ClauseEditor'
import {
  ACTION_OPS,
  ACTION_OP_LABEL,
  actionOpOf,
  fieldOptions,
  fieldOptionsIn,
  findFieldIn,
  kindInk,
  matchEntityOf,
  ruleScopes,
  sourceEntityOf,
  type ActionOpKind,
  type EntityMap,
  type EntityScope,
} from './describe'
import { useRuleIssues } from './useRuleIssues'
import './rules.css'

/* ------------------------------------------------------------ */
/* Small shared pieces                                          */
/* ------------------------------------------------------------ */

function Block({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rl-block">
      <span className="mono-label rl-block-lab">{label}</span>
      {children}
      {hint ? <p className="rl-hint">{hint}</p> : null}
    </section>
  )
}

function EntityPicker({
  value,
  entities,
  onChange,
  ariaLabel,
  placeholder = 'Pick a table',
  exclude,
}: {
  value: string
  entities: EntityMap
  onChange: (id: string) => void
  ariaLabel: string
  placeholder?: string
  exclude?: string
}) {
  const list = useMemo(
    () =>
      Object.values(entities)
        .filter((e) => e.id !== exclude)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entities, exclude],
  )
  const known = list.some((e) => e.id === value)
  return (
    <select
      className={`rl-select rl-select--wide${value && !known ? ' is-invalid' : ''}`}
      aria-label={ariaLabel}
      value={known ? value : ''}
      onChange={(e) => onChange(e.currentTarget.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {value && !known ? <option value={value}>(table removed)</option> : null}
      {list.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </select>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div className="rl-seg rl-seg--wide" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`rl-seg-btn${o.value === value ? ' is-on' : ''}`}
          aria-pressed={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Values written on a created / linked row: field → expression. */
function ValuesEditor({
  target,
  values,
  onChange,
  valueScope,
  entities,
  skipFieldIds,
}: {
  target: EntityDef | undefined
  values: Record<string, ValueExpr> | undefined
  onChange: (v: Record<string, ValueExpr>) => void
  /** rows a written value may read — the source row first */
  valueScope: EntityScope
  entities: EntityMap
  /** the join's own reference fields are wired above, not here */
  skipFieldIds?: string[]
}) {
  const entries = Object.entries(values ?? {})
  const used = new Set(entries.map(([id]) => id))
  const options = useMemo(
    () =>
      fieldOptions(target, entities, { includeFormula: false, includeVia: false }).filter(
        (o) => !skipFieldIds?.includes(o.field.id),
      ),
    [target, entities, skipFieldIds],
  )
  const free = options.filter((o) => !used.has(o.field.id))

  const setValue = (fieldId: string, v: ValueExpr) => {
    onChange({ ...(values ?? {}), [fieldId]: v })
  }
  const remove = (fieldId: string) => {
    const next = { ...(values ?? {}) }
    delete next[fieldId]
    onChange(next)
  }
  const add = () => {
    const first = free[0]
    if (!first) return
    onChange({ ...(values ?? {}), [first.field.id]: { kind: 'literal', value: null } })
  }

  return (
    <div className="rl-values">
      {entries.length === 0 ? (
        <p className="rl-hint">No values written — the row is created empty.</p>
      ) : (
        entries.map(([fieldId, expr]) => {
          const field = target?.fields.find((f) => f.id === fieldId)
          return (
            <div className="rl-valuerow" key={fieldId}>
              <div className="rl-valuerow-head">
                <span className="rl-valuerow-name">{field?.name ?? '(field removed)'}</span>
                <button
                  type="button"
                  className="rl-x"
                  aria-label={`Stop writing ${field?.name ?? 'this field'}`}
                  onClick={() => remove(fieldId)}
                >
                  ×
                </button>
              </div>
              <ValueEditor
                ariaPrefix={`${field?.name ?? 'Value'} —`}
                value={expr}
                onChange={(v) => setValue(fieldId, v)}
                fieldScope={valueScope}
                entities={entities}
                compareField={field}
              />
            </div>
          )
        })
      )}
      <button type="button" className="btn rl-add" onClick={add} disabled={free.length === 0}>
        + Write a value
      </button>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* Panels, one per kind                                         */
/* ------------------------------------------------------------ */

interface PanelProps<K extends RuleNodeKind> {
  ruleId: string
  rule: RuleDef
  node: Extract<RuleNode, { kind: K }>
  entities: EntityMap
  setConfig: (config: RuleNodeConfigMap[RuleNodeKind]) => void
}

function StartPanel({ rule, entities }: PanelProps<'start'>) {
  const updateRule = useProjectStore((s) => s.updateRule)
  const source = sourceEntityOf(rule, entities)
  return (
    <Block
      label="Walks every row of"
      hint="Change this and every condition below is re-read against the new table — check them after."
    >
      <EntityPicker
        ariaLabel="The table this rule walks"
        value={rule.rootEntityId}
        entities={entities}
        onChange={(rootEntityId) => updateRule(rule.id, { rootEntityId })}
      />
      {source ? (
        <p className="rl-note">
          One pass per {source.name} row. Everything downstream reads that row as{' '}
          <EntityStamp entity={source} />.
        </p>
      ) : null}
    </Block>
  )
}

/** Numbers first, then calculated numbers — what a range can be built from. */
const rangeFields = (e: EntityDef | undefined): FieldDef[] =>
  (e?.fields ?? []).filter((f) => f.type === 'number' || f.type === 'formula')

/** "Min HP" before "Max HP" before everything else — the honest guess. */
function boundOrder(fields: FieldDef[]): FieldDef[] {
  const rank = (f: FieldDef): number => {
    const n = f.name.toLowerCase()
    if (n.startsWith('min') || n.includes(' min')) return 0
    if (n.startsWith('max') || n.includes(' max')) return 1
    return 2
  }
  return [...fields].sort((a, b) => rank(a) - rank(b))
}

function MatchPanel({ rule, node, entities, setConfig }: PanelProps<'match'>) {
  const source = sourceEntityOf(rule, entities)
  const target = entities[node.config.targetEntityId]

  /* The canonical fitment shape, in one click: a number on the candidate
     row bracketed by two numbers on the source row. */
  const candidate = rangeFields(target)[0]
  const bounds = boundOrder(rangeFields(source))
  const canBracket =
    !!candidate && bounds.length >= 2 && node.config.group.clauses.length === 0

  const addBracket = () => {
    const [lo, hi] = bounds
    if (!candidate || !lo || !hi) return
    setConfig({
      ...node.config,
      group: {
        combinator: 'AND',
        clauses: [
          {
            id: newId(),
            left: { fieldId: candidate.id },
            op: 'gte',
            right: { kind: 'field', path: { fieldId: lo.id } },
          },
          {
            id: newId(),
            left: { fieldId: candidate.id },
            op: 'lte',
            right: { kind: 'field', path: { fieldId: hi.id } },
          },
        ],
      },
    })
  }

  return (
    <>
      <Block label="Rows that must fit">
        <EntityPicker
          ariaLabel="Table to match against"
          value={node.config.targetEntityId}
          entities={entities}
          onChange={(targetEntityId) => setConfig({ ...node.config, targetEntityId })}
        />
      </Block>

      {target ? (
        <Block label="Fits when">
          <p className="rl-legend">
            <EntityStamp entity={target} /> the row being tested
            <span className="rl-legend-sep">·</span>
            <EntityStamp entity={source} /> the row you started from
          </p>
          <ClauseEditor
            group={node.config.group}
            left={[target]}
            right={[source]}
            entities={entities}
            onChange={(group) => setConfig({ ...node.config, group })}
            emptyTitle="Nothing fitted yet"
            emptyHint={`Every ${target.name} will match every ${source?.name ?? 'row'} until you add a condition.`}
            addLabel="Add fitting rule"
          />
          {canBracket && candidate ? (
            <button
              type="button"
              className="btn rl-add"
              onClick={addBracket}
              title={`${candidate.name} between ${bounds[0]?.name} and ${bounds[1]?.name}`}
            >
              + {candidate.name} between two {source?.name ?? 'source'} fields
            </button>
          ) : null}
        </Block>
      ) : (
        <div className="rl-empty">
          <span className="rl-empty-title">Pick a table first</span>
          <span className="rl-empty-hint">
            A match scans every row of another table and keeps the ones that fit
            the row you are on.
          </span>
        </div>
      )}

      <Block label="When nothing fits">
        <Seg
          ariaLabel="Empty behaviour"
          value={node.config.emptyBehavior}
          onChange={(emptyBehavior) => setConfig({ ...node.config, emptyBehavior })}
          options={[
            {
              value: 'skip',
              label: 'Drop the row',
              title: 'The source row stops here',
            },
            {
              value: 'passThrough',
              label: 'Carry it on',
              title: 'The source row continues with no match attached',
            },
          ]}
        />
        <p className="rl-hint">
          {node.config.emptyBehavior === 'skip'
            ? `A ${source?.name ?? 'row'} with nothing fitting stops here.`
            : `A ${source?.name ?? 'row'} with nothing fitting carries on unmatched — route it to a “nothing fits” branch.`}
        </p>
      </Block>
    </>
  )
}

function ConditionPanel({ ruleId, rule, node, entities, setConfig }: PanelProps<'condition'>) {
  const scopes = useMemo(() => ruleScopes(rule, entities), [rule, entities])
  const deleteRuleEdge = useProjectStore((s) => s.deleteRuleEdge)
  const branches = node.config.branches

  const setBranch = (id: string, patch: Partial<ConditionBranch>) => {
    setConfig({
      branches: branches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
  }

  const addBranch = () => {
    setConfig({
      branches: [
        ...branches,
        {
          id: newId(),
          label: `Branch ${branches.length + 1}`,
          group: { combinator: 'AND', clauses: [] },
        },
      ],
    })
  }

  const removeBranch = (id: string) => {
    /* the branch id IS the source handle — its edges must go with it */
    for (const e of rule.edges) {
      if (e.source === node.id && e.sourceHandle === id) deleteRuleEdge(ruleId, e.id)
    }
    setConfig({ branches: branches.filter((b) => b.id !== id) })
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= branches.length) return
    const next = [...branches]
    const a = next[index]
    const b = next[j]
    if (!a || !b) return
    next[index] = b
    next[j] = a
    setConfig({ branches: next })
  }

  return (
    <>
      <Block
        label="Branches"
        hint="Branches are tested top to bottom. The first one that matches wins; anything left over leaves by ELSE."
      >
        {branches.length === 0 ? (
          <div className="rl-empty">
            <span className="rl-empty-title">No branches yet</span>
            <span className="rl-empty-hint">
              Every row will leave by the ELSE handle until you add one.
            </span>
          </div>
        ) : null}

        <div className="rl-branches">
          {branches.map((b, i) => (
            <div className="rl-branch" key={b.id}>
              <div className="rl-branch-head">
                <span className="rl-branch-n">{String(i + 1).padStart(2, '0')}</span>
                <input
                  className="field-input rl-input"
                  aria-label={`Branch ${i + 1} name`}
                  value={b.label}
                  placeholder="Name this route"
                  onChange={(e) => setBranch(b.id, { label: e.currentTarget.value })}
                />
                <button
                  type="button"
                  className="rl-icon"
                  aria-label={`Move ${b.label || 'branch'} up`}
                  title="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rl-icon"
                  aria-label={`Move ${b.label || 'branch'} down`}
                  title="Move down"
                  disabled={i === branches.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rl-x"
                  aria-label={`Remove ${b.label || 'branch'}`}
                  title="Remove this branch and its connection"
                  onClick={() => removeBranch(b.id)}
                >
                  ×
                </button>
              </div>
              <ClauseEditor
                group={b.group}
                left={scopes.left}
                right={scopes.right}
                entities={entities}
                onChange={(group) => setBranch(b.id, { group })}
                emptyTitle="This branch has no conditions"
                emptyHint="A branch with no conditions never takes a row — the engine will flag it."
              />
            </div>
          ))}
        </div>

        <button type="button" className="btn rl-add" onClick={addBranch}>
          + Add branch
        </button>
      </Block>
    </>
  )
}

function FilterPanel({ rule, node, entities, setConfig }: PanelProps<'filter'>) {
  const scopes = useMemo(() => ruleScopes(rule, entities), [rule, entities])
  return (
    <Block
      label="Keep rows where"
      hint={
        scopes.match
          ? `Fields of both ${scopes.source?.name ?? 'the source'} and ${scopes.match.name} are in play here — the stamp shows which row each one reads.`
          : undefined
      }
    >
      <ClauseEditor
        group={node.config.group}
        left={scopes.left}
        right={scopes.right}
        entities={entities}
        onChange={(group) => setConfig({ group })}
        emptyTitle="Nothing is filtered"
        emptyHint="Add a condition and only the rows that pass carry on."
      />
    </Block>
  )
}

function FindPanel({ rule, node, entities, setConfig }: PanelProps<'find'>) {
  const scopes = useMemo(() => ruleScopes(rule, entities), [rule, entities])
  /* the link may sit on either row in play — the engine prefers the match */
  const links = useMemo(() => {
    const out: { owner: EntityDef; field: FieldDef }[] = []
    const seen = new Set<string>()
    for (const e of scopes.left) {
      if (!e || seen.has(e.id)) continue
      seen.add(e.id)
      for (const f of e.fields) {
        if (f.type === 'reference' && f.refEntityId && entities[f.refEntityId]) {
          out.push({ owner: e, field: f })
        }
      }
    }
    return out
  }, [scopes, entities])

  const via = links.find((l) => l.field.id === node.config.viaFieldId)
  const target = via?.field.refEntityId ? entities[via.field.refEntityId] : undefined

  return (
    <Block
      label="Follow the link"
      hint="One hop: the related row is carried forward with the row you are on."
    >
      {links.length === 0 ? (
        <div className="rl-empty">
          <span className="rl-empty-title">No links to follow</span>
          <span className="rl-empty-hint">
            {scopes.source
              ? `${scopes.source.name} has no link (REF) columns yet — add one in that table's column setup.`
              : 'This rule has no table to walk yet.'}
          </span>
        </div>
      ) : (
        <>
          <select
            className="rl-select rl-select--wide"
            aria-label="Link field to follow"
            value={via ? via.field.id : ''}
            onChange={(e) => setConfig({ viaFieldId: e.currentTarget.value })}
          >
            <option value="" disabled>
              Pick a link
            </option>
            {links.map((l) => (
              <option key={l.field.id} value={l.field.id}>
                {l.owner.name} → {l.field.name}
              </option>
            ))}
          </select>
          {target ? (
            <p className="rl-note">
              Carries the linked <EntityStamp entity={target} /> row forward as the matched row.
            </p>
          ) : null}
        </>
      )}
    </Block>
  )
}

function LoopPanel({ rule, node, entities, setConfig }: PanelProps<'loop'>) {
  const scopes = useMemo(() => ruleScopes(rule, entities), [rule, entities])
  const source = scopes.source
  const src = node.config.source

  /** every reference field, anywhere, pointing at a row this rule holds */
  const backlinks = useMemo(() => {
    const out: { owner: EntityDef; field: FieldDef; anchor: EntityDef }[] = []
    const anchors = scopes.left.filter((e): e is EntityDef => !!e)
    if (anchors.length === 0) return out
    for (const e of Object.values(entities)) {
      for (const f of e.fields) {
        if (f.type !== 'reference' || !f.refEntityId) continue
        const anchor = anchors.find((a) => a.id === f.refEntityId)
        if (anchor) out.push({ owner: e, field: f, anchor })
      }
    }
    return out
  }, [entities, scopes])

  return (
    <>
      <Block label="Repeat over">
        <Seg
          ariaLabel="Loop source"
          value={src.kind}
          onChange={(kind) =>
            setConfig({
              source:
                kind === 'entity'
                  ? { kind: 'entity', entityId: '' }
                  : { kind: 'linked', viaFieldId: '' },
            })
          }
          options={[
            { value: 'entity', label: 'Every row of', title: 'Walk a whole table' },
            {
              value: 'linked',
              label: 'Rows linked to this one',
              title: 'Walk the rows that point back at the row you are on',
            },
          ]}
        />
      </Block>

      <Block
        label={src.kind === 'entity' ? 'Collection' : 'Linked by'}
        hint="Rows leave by BODY once each; the flow continues from NEXT when the loop is done."
      >
        {src.kind === 'entity' ? (
          <EntityPicker
            ariaLabel="Table to loop over"
            value={src.entityId}
            entities={entities}
            onChange={(entityId) => setConfig({ source: { kind: 'entity', entityId } })}
          />
        ) : backlinks.length === 0 ? (
          <div className="rl-empty">
            <span className="rl-empty-title">Nothing links back</span>
            <span className="rl-empty-hint">
              No table has a link column pointing at {source?.name ?? 'this table'} yet.
            </span>
          </div>
        ) : (
          <select
            className="rl-select rl-select--wide"
            aria-label="Link field pointing at this row"
            value={src.viaFieldId}
            onChange={(e) =>
              setConfig({ source: { kind: 'linked', viaFieldId: e.currentTarget.value } })
            }
          >
            <option value="" disabled>
              Pick a link
            </option>
            {backlinks.map(({ owner, field, anchor }) => (
              <option key={field.id} value={field.id}>
                {owner.name} → {field.name} (per {anchor.name})
              </option>
            ))}
          </select>
        )}
      </Block>
    </>
  )
}

function ActionPanel({ rule, node, entities, setConfig }: PanelProps<'action'>) {
  const createJoinEntity = useProjectStore((s) => s.createJoinEntity)
  const scopes = useMemo(() => ruleScopes(rule, entities), [rule, entities])
  const source = scopes.source
  const match = scopes.match
  const action = node.config.action
  const op = actionOpOf(action)

  const setAction = (next: ActionOp) => setConfig({ action: next })

  const switchOp = (next: ActionOpKind) => {
    if (next === op) return
    switch (next) {
      case 'set':
        setAction({ op: 'set', fieldId: '', value: { kind: 'literal', value: null } })
        break
      case 'create':
        setAction({ op: 'create', entityId: '', values: {} })
        break
      case 'flag':
        setAction({ op: 'flag', label: 'Flagged', tone: 'info' })
        break
      case 'link':
        setAction({ op: 'link', joinEntityId: '', sourceFieldId: '', matchFieldId: '' })
        break
    }
  }

  /* a `set` writes the row that OWNS the field — the matched row wins a tie,
     which is how "mark this motor recommended" works at all */
  const setFieldOptions = useMemo(
    () => fieldOptionsIn(scopes.left, entities, { includeFormula: false, includeVia: false }),
    [scopes, entities],
  )
  const written = action.op === 'set' ? findFieldIn(scopes.left, action.fieldId) : undefined

  const join = action.op === 'link' ? entities[action.joinEntityId] : undefined
  const joinRefs = useMemo(
    () => (join ? join.fields.filter((f) => f.type === 'reference') : []),
    [join],
  )

  const makeJoin = () => {
    if (!source || !match) return
    const made = createJoinEntity(source.id, match.id)
    if (!made) return
    setAction({
      op: 'link',
      joinEntityId: made.entity.id,
      sourceFieldId: made.aFieldId,
      matchFieldId: made.bFieldId,
      values: action.op === 'link' ? action.values : undefined,
    })
  }

  return (
    <>
      <Block label="Do what">
        <Seg
          ariaLabel="Action"
          value={op}
          onChange={switchOp}
          options={ACTION_OPS.map((o) => ({ value: o, label: ACTION_OP_LABEL[o] }))}
        />
      </Block>

      {action.op === 'set' ? (
        <Block label="Write this field">
          <div className="rl-side">
            <EntityStamp entity={written?.owner ?? source} />
            <FieldSelect
              ariaLabel="Field to write"
              value={action.fieldId}
              options={setFieldOptions}
              onChange={(fieldId) => setAction({ ...action, fieldId })}
            />
          </div>
          <span className="mono-label rl-block-lab rl-block-lab--sub">Set it to</span>
          <ValueEditor
            ariaPrefix="New value —"
            value={action.value}
            onChange={(value) => setAction({ ...action, value })}
            fieldScope={written ? [written.owner, source, match] : scopes.left}
            entities={entities}
            compareField={written?.field}
          />
          <p className="rl-hint">
            The stamp shows which row is written — the row that owns the field.
            Calculated (FX) fields are not offered; they are computed, never stored.
          </p>
        </Block>
      ) : null}

      {action.op === 'create' ? (
        <>
          <Block label="Create a row in">
            <EntityPicker
              ariaLabel="Table to create a row in"
              value={action.entityId}
              entities={entities}
              onChange={(entityId) => setAction({ ...action, entityId })}
            />
          </Block>
          <Block label="With these values">
            <ValuesEditor
              target={entities[action.entityId]}
              values={action.values}
              onChange={(values) => setAction({ ...action, values })}
              valueScope={scopes.right}
              entities={entities}
            />
          </Block>
        </>
      ) : null}

      {action.op === 'flag' ? (
        <Block label="Flag" hint="Flags are display-only — they mark the run, they never write data.">
          <input
            className="field-input rl-input"
            aria-label="Flag label"
            value={action.label}
            placeholder="Nothing fits"
            onChange={(e) => setAction({ ...action, label: e.currentTarget.value })}
          />
          <Seg
            ariaLabel="Flag tone"
            value={action.tone}
            onChange={(tone) => setAction({ ...action, tone })}
            options={[
              { value: 'info', label: 'Note' },
              { value: 'warn', label: 'Warn' },
              { value: 'danger', label: 'Alert' },
            ]}
          />
        </Block>
      ) : null}

      {action.op === 'link' ? (
        <>
          <Block
            label="Link table"
            hint="The pairing itself becomes a row, so it can carry its own values — a fitment note, a recommended flag."
          >
            <EntityPicker
              ariaLabel="Link table"
              value={action.joinEntityId}
              entities={entities}
              onChange={(joinEntityId) =>
                setAction({ ...action, joinEntityId, sourceFieldId: '', matchFieldId: '' })
              }
            />
            {!action.joinEntityId ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary rl-add"
                  onClick={makeJoin}
                  disabled={!source || !match}
                  title={
                    source && match
                      ? `Create ${source.name} ${match.name} with a link to each side`
                      : 'A match node must name the other side first'
                  }
                >
                  + Create a link table
                </button>
                {!match ? (
                  <p className="rl-hint">
                    Add a Match node above and pick what it matches — the join needs both sides.
                  </p>
                ) : null}
              </>
            ) : null}
          </Block>

          {join ? (
            <Block label="Wire up the pair">
              <label className="rl-labelled">
                <span className="rl-labelled-lab">
                  <EntityStamp entity={source} /> goes in
                </span>
                <select
                  className="rl-select rl-select--wide"
                  aria-label="Join field holding the source row"
                  value={action.sourceFieldId}
                  onChange={(e) => setAction({ ...action, sourceFieldId: e.currentTarget.value })}
                >
                  <option value="" disabled>
                    Pick a link field
                  </option>
                  {joinRefs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.refEntityId && entities[f.refEntityId]
                        ? ` → ${entities[f.refEntityId].name}`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rl-labelled">
                <span className="rl-labelled-lab">
                  <EntityStamp entity={match} fallback="match" /> goes in
                </span>
                <select
                  className="rl-select rl-select--wide"
                  aria-label="Join field holding the matched row"
                  value={action.matchFieldId}
                  onChange={(e) => setAction({ ...action, matchFieldId: e.currentTarget.value })}
                >
                  <option value="" disabled>
                    Pick a link field
                  </option>
                  {joinRefs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.refEntityId && entities[f.refEntityId]
                        ? ` → ${entities[f.refEntityId].name}`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
            </Block>
          ) : null}

          {join ? (
            <Block label="Also write">
              <ValuesEditor
                target={join}
                values={action.values}
                onChange={(values) => setAction({ ...action, values })}
                valueScope={scopes.right}
                entities={entities}
                skipFieldIds={[action.sourceFieldId, action.matchFieldId]}
              />
            </Block>
          ) : null}
        </>
      ) : null}
    </>
  )
}

function OutputPanel({ rule, node, entities, setConfig }: PanelProps<'output'>) {
  const source = sourceEntityOf(rule, entities)
  const match = matchEntityOf(rule, entities)
  const columns = node.config.columns ?? []

  const setColumns = (next: ViewColumn[]) => setConfig({ ...node.config, columns: next })

  const addColumn = (scope: RowScope) => {
    const entity = scope === 'source' ? source : match
    const taken = new Set(
      columns.filter((c) => c.scope === scope).map((c) => c.fieldId),
    )
    const field = entity?.fields.find((f) => !taken.has(f.id)) ?? entity?.fields[0]
    if (!field) return
    setColumns([...columns, { scope, fieldId: field.id }])
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= columns.length) return
    const next = [...columns]
    const a = next[index]
    const b = next[j]
    if (!a || !b) return
    next[index] = b
    next[j] = a
    setColumns(next)
  }

  const useDisplayFields = () => {
    const next: ViewColumn[] = []
    if (source?.fields[0]) next.push({ scope: 'source', fieldId: source.fields[0].id })
    if (match?.fields[0]) next.push({ scope: 'match', fieldId: match.fields[0].id })
    if (next.length) setColumns(next)
  }

  return (
    <>
      <Block label="Result set name" hint="This is the tab the results rail shows.">
        <input
          className="field-input rl-input"
          aria-label="Result set name"
          value={node.config.label}
          placeholder="Fitting motors"
          onChange={(e) => setConfig({ ...node.config, label: e.currentTarget.value })}
        />
      </Block>

      <Block
        label="Columns"
        hint="Pick from both sides — that is what makes this a combined view rather than a list."
      >
        {columns.length === 0 ? (
          <div className="rl-empty">
            <span className="rl-empty-title">No columns picked</span>
            <span className="rl-empty-hint">
              Add one from {source?.name ?? 'the source'}
              {match ? ` and one from ${match.name}` : ''} to see them side by side.
            </span>
            {source || match ? (
              <button type="button" className="btn rl-add" onClick={useDisplayFields}>
                Use the obvious two
              </button>
            ) : null}
          </div>
        ) : (
          <div className="rl-cols">
            {columns.map((c, i) => {
              const entity = c.scope === 'source' ? source : match
              const options = fieldOptions(entity, entities, { includeVia: false })
              return (
                <div className="rl-col" key={`${c.scope}:${c.fieldId}:${i}`}>
                  <div className="rl-col-head">
                    <Seg
                      ariaLabel={`Column ${i + 1} side`}
                      value={c.scope}
                      onChange={(scope) => {
                        const e2 = scope === 'source' ? source : match
                        const next = [...columns]
                        next[i] = { scope, fieldId: e2?.fields[0]?.id ?? '' }
                        setColumns(next)
                      }}
                      options={[
                        { value: 'source' as RowScope, label: source?.name ?? 'Source' },
                        { value: 'match' as RowScope, label: match?.name ?? 'Match' },
                      ]}
                    />
                    <button
                      type="button"
                      className="rl-icon"
                      aria-label={`Move column ${i + 1} up`}
                      title="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rl-icon"
                      aria-label={`Move column ${i + 1} down`}
                      title="Move down"
                      disabled={i === columns.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rl-x"
                      aria-label={`Remove column ${i + 1}`}
                      onClick={() => setColumns(columns.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="rl-side">
                    <EntityStamp entity={entity} fallback={c.scope} />
                    <FieldSelect
                      ariaLabel={`Column ${i + 1} field`}
                      value={c.fieldId}
                      options={options}
                      onChange={(fieldId) => {
                        const next = [...columns]
                        next[i] = { ...c, fieldId }
                        setColumns(next)
                      }}
                    />
                  </div>
                  <input
                    className="field-input rl-input rl-input--sm"
                    aria-label={`Column ${i + 1} header override`}
                    placeholder="Header (optional)"
                    value={c.label ?? ''}
                    onChange={(e) => {
                      const next = [...columns]
                      const label = e.currentTarget.value
                      next[i] = label ? { ...c, label } : { scope: c.scope, fieldId: c.fieldId }
                      setColumns(next)
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="rl-addrow">
          <button
            type="button"
            className="btn rl-add"
            onClick={() => addColumn('source')}
            disabled={!source}
          >
            + {source?.name ?? 'Source'} column
          </button>
          <button
            type="button"
            className="btn rl-add"
            onClick={() => addColumn('match')}
            disabled={!match}
            title={match ? undefined : 'Add a Match node to get a second side'}
          >
            + {match?.name ?? 'Match'} column
          </button>
        </div>
      </Block>
    </>
  )
}

/* ------------------------------------------------------------ */
/* The inspector                                                */
/* ------------------------------------------------------------ */

export function RuleInspector({
  ruleId,
  nodeId,
}: {
  ruleId: string
  nodeId: string | null
}) {
  const rule = useProjectStore((s) => s.rules[ruleId])
  const entities = useProjectStore((s) => s.entities)
  const updateRuleNodeConfig = useProjectStore((s) => s.updateRuleNodeConfig)
  const deleteRuleNode = useProjectStore((s) => s.deleteRuleNode)
  const { issues } = useRuleIssues(ruleId)

  const node = useMemo(
    () => (nodeId ? rule?.nodes.find((n) => n.id === nodeId) : undefined),
    [rule, nodeId],
  )

  if (!rule) {
    return (
      <div className="rl-inspector">
        <div className="rl-empty">
          <span className="rl-empty-title">No rule open</span>
          <span className="rl-empty-hint">Choose a rule in the index to edit it.</span>
        </div>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="rl-inspector">
        <div className="rl-empty">
          <span className="rl-empty-title">
            {nodeId ? 'That node is gone' : 'Nothing selected'}
          </span>
          <span className="rl-empty-hint">
            {nodeId
              ? 'It was deleted from the flow. Pick another node on the sheet.'
              : 'Click a node on the sheet to configure it, or drag a new one from the palette.'}
          </span>
          <span className="rl-empty-meta mono-label">
            {rule.name} · {rule.nodes.length} node{rule.nodes.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    )
  }

  const meta = RULE_NODE_KINDS[node.kind]
  const setConfig = (config: RuleNodeConfigMap[RuleNodeKind]) =>
    updateRuleNodeConfig(ruleId, node.id, config)
  const nodeIssues = issues.filter((i) => i.nodeId === node.id)

  const shared = { ruleId, rule, entities, setConfig }

  return (
    <div className="rl-inspector" key={node.id}>
      <header
        className="rl-insp-head"
        style={{ '--rl-ink-chrome': kindInk(node.kind) } as CSSProperties}
      >
        <span className="rl-insp-tag">{meta.tag}</span>
        <h3 className="rl-insp-kind block-heading">{meta.label}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-danger rl-insp-del"
          title="Delete this step and the lines into and out of it"
          /* NO CONFIRM. `deleteRuleNode` records a step, and the step
             it records covers the node AND the wires that go with it —
             they are removed inside the same mutation, so one Ctrl+Z or
             one press of UNDO puts the whole thing back configured
             exactly as it was. Rule 9: an undoable act is a note, not a
             question. The note names the KIND, because the plate the
             reader was looking at has just left the screen. */
          onClick={() => {
            deleteRuleNode(ruleId, node.id)
            sayUndoable(
              `Deleted the ${meta.label.toLowerCase()} step and the lines joined to it`,
            )
          }}
        >
          Delete
        </button>
      </header>

      <p className="rl-insp-blurb">{meta.blurb}</p>

      {nodeIssues.length > 0 ? (
        <ul className="rl-issues">
          {nodeIssues.map((i, k) => (
            <li
              key={`${i.severity}-${k}`}
              className={`rl-issue rl-issue--${i.severity === 'blocker' ? 'blocker' : 'advisory'}`}
            >
              {i.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rl-insp-body">
        {node.kind === 'start' ? <StartPanel {...shared} node={node} /> : null}
        {node.kind === 'match' ? <MatchPanel {...shared} node={node} /> : null}
        {node.kind === 'condition' ? <ConditionPanel {...shared} node={node} /> : null}
        {node.kind === 'filter' ? <FilterPanel {...shared} node={node} /> : null}
        {node.kind === 'find' ? <FindPanel {...shared} node={node} /> : null}
        {node.kind === 'loop' ? <LoopPanel {...shared} node={node} /> : null}
        {node.kind === 'action' ? <ActionPanel {...shared} node={node} /> : null}
        {node.kind === 'output' ? <OutputPanel {...shared} node={node} /> : null}
      </div>
    </div>
  )
}
