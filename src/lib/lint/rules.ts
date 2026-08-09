/* ============================================================
   Lint engine — every rule from REVIEW_SPEC.md.
   Pure functions of RuleContext; no store access, no randomness.
   The `why` strings are the product's voice: one firm, calm
   sentence teaching the principle. Never smug.
   ============================================================ */

import type { EntityDef, FieldDef } from '@/types/model'
import { displayFieldOf } from '@/types/model'
import type { LintFinding, RuleContext } from './types'
import {
  dupKey,
  findingId,
  isComputedName,
  isVagueName,
  nameKey,
  pluralInfo,
  PRICE_WORDS,
  QTY_WORDS,
  TYPE_WORDS,
  wordsOf,
} from './heuristics'

/* ---------------------------------------------------------- */
/* Identity & naming                                          */
/* ---------------------------------------------------------- */

/** entity-plural — advisory — plural entity name → rename-entity singular. */
export function ruleEntityPlural(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const info = pluralInfo(entity.name)
  if (!info.isPlural) return []
  const name = entity.name.trim()
  const finding: LintFinding = {
    id: findingId('entity-plural', entity.id),
    ruleId: 'entity-plural',
    severity: 'advisory',
    entityId: entity.id,
    title: 'PLURAL ENTITY NAME',
    why: info.singular
      ? `An entity names one kind of record — each row here is a single ${info.singular.toLowerCase()} — so the card should read '${info.singular}', not '${name}'.`
      : `An entity names one kind of record, so it takes the singular form — every row inside '${name}' is just one of them.`,
  }
  if (info.singular) {
    finding.fix = {
      kind: 'rename-entity',
      entityId: entity.id,
      name: info.singular,
      label: `Rename to '${info.singular}'`,
    }
  }
  return [finding]
}

/** entity-vague — advisory — placeholder-grade entity name → no fix. */
export function ruleEntityVague(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  if (!isVagueName(entity.name)) return []
  const name = entity.name.trim()
  return [
    {
      id: findingId('entity-vague', entity.id),
      ruleId: 'entity-vague',
      severity: 'advisory',
      entityId: entity.id,
      title: 'VAGUE ENTITY NAME',
      why: `'${name}' describes storage rather than meaning — name the entity after the real-world thing one row stands for, the way 'Customer' or 'Invoice' does.`,
    },
  ]
}

/** field-default-name — advisory — /^Field \d+$/ → no fix. */
export function ruleFieldDefaultName(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    const name = f.name.trim()
    if (!/^Field \d+$/.test(name)) continue
    out.push({
      id: findingId('field-default-name', entity.id, [f.id]),
      ruleId: 'field-default-name',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'UNNAMED FIELD',
      why: `'${name}' tells the next reader nothing about what belongs in this column — name the field after the fact it holds, like 'Email' or 'Due Date'.`,
    })
  }
  return out
}

/**
 * entity-dup-name — blocker — trimmed case-insensitive name collision.
 * CONVENTION: one finding PER involved entity (so every offending card
 * carries its own blocker badge) — not one finding per name group.
 */
export function ruleEntityDupName(entityList: EntityDef[]): LintFinding[] {
  const byName = new Map<string, EntityDef[]>()
  for (const e of entityList) {
    const k = dupKey(e.name)
    const group = byName.get(k)
    if (group) group.push(e)
    else byName.set(k, [e])
  }
  const out: LintFinding[] = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    const name = group[0].name.trim() || '(blank)'
    for (const e of group) {
      out.push({
        id: findingId('entity-dup-name', e.id),
        ruleId: 'entity-dup-name',
        severity: 'blocker',
        entityId: e.id,
        title: 'DUPLICATE ENTITY NAME',
        why: `${group.length} entities on this sheet are named '${name}', so a link, a formula, or a teammate pointing at '${name}' cannot say which one is meant — rename all but one.`,
      })
    }
  }
  return out
}

/** field-dup-name — blocker — two fields in one entity share a name. */
export function ruleFieldDupName(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const byName = new Map<string, FieldDef[]>()
  for (const f of entity.fields) {
    const k = dupKey(f.name)
    const group = byName.get(k)
    if (group) group.push(f)
    else byName.set(k, [f])
  }
  const out: LintFinding[] = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    const name = group[0].name.trim() || '(blank)'
    const fieldIds = group.map((f) => f.id)
    out.push({
      id: findingId('field-dup-name', entity.id, fieldIds),
      ruleId: 'field-dup-name',
      severity: 'blocker',
      entityId: entity.id,
      fieldIds,
      title: 'DUPLICATE FIELD NAME',
      why: `This entity has ${group.length} fields named '${name}', so any value filed under that name is ambiguous — rename them to say how they differ.`,
    })
  }
  return out
}

/** no-identifier — advisory — no required non-formula field → make-required. */
export function ruleNoIdentifier(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const nonFormula = entity.fields.filter((f) => f.type !== 'formula')
  // zero stored fields is no-fields territory — one mark, not two
  if (nonFormula.length === 0) return []
  if (nonFormula.some((f) => f.required)) return []
  let target: FieldDef | undefined = displayFieldOf(entity)
  if (!target || target.type === 'formula') {
    target = entity.fields.find((f) => f.type === 'text')
  }
  const finding: LintFinding = {
    id: findingId('no-identifier', entity.id, target ? [target.id] : undefined),
    ruleId: 'no-identifier',
    severity: 'advisory',
    entityId: entity.id,
    title: 'NO REQUIRED IDENTIFIER',
    why: 'Every field here is optional, so two totally blank rows could sit side by side with nothing to tell them apart — make the identifying field required.',
  }
  if (target) {
    finding.fieldIds = [target.id]
    finding.fix = {
      kind: 'make-required',
      entityId: entity.id,
      fieldId: target.id,
      label: `Require '${target.name.trim()}'`,
    }
  }
  return [finding]
}

/** no-fields — advisory — zero fields, or only formula fields → no fix. */
export function ruleNoFields(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const empty = entity.fields.length === 0
  const onlyFormulas = !empty && entity.fields.every((f) => f.type === 'formula')
  if (!empty && !onlyFormulas) return []
  const name = entity.name.trim().toLowerCase() || 'record'
  return [
    {
      id: findingId('no-fields', entity.id),
      ruleId: 'no-fields',
      severity: 'advisory',
      entityId: entity.id,
      title: 'NO STORED FIELDS',
      why: empty
        ? `An entity with no fields cannot hold a single fact — add the fields that describe one ${name} before anything is built on it.`
        : 'Formulas only rearrange stored facts, and this entity stores none — give it at least one plain field for the calculations to stand on.',
    },
  ]
}

/* ---------------------------------------------------------- */
/* Links, not copies                                          */
/* ---------------------------------------------------------- */

/** Does `fieldKey` name the entity `entityKey` (exact or + name/id/ref)? */
const namesEntity = (fieldKey: string, entityKey: string): boolean =>
  fieldKey === entityKey ||
  fieldKey === `${entityKey} name` ||
  fieldKey === `${entityKey} id` ||
  fieldKey === `${entityKey} ref`

/** text-should-link — advisory — text/select field named after another entity. */
export function ruleTextShouldLink(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    if (f.type !== 'text' && f.type !== 'select') continue
    const fk = nameKey(f.name)
    if (!fk) continue
    // entityList is (name, id)-sorted → the first match is deterministic
    const target = ctx.entityList.find(
      (t) => t.id !== entity.id && namesEntity(fk, nameKey(t.name)),
    )
    if (!target) continue
    const tName = target.name.trim()
    out.push({
      id: findingId('text-should-link', entity.id, [f.id]),
      ruleId: 'text-should-link',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'COPY INSTEAD OF LINK',
      why: `Storing a ${tName.toLowerCase()}'s name as text keeps a copy that goes stale when the real ${tName.toLowerCase()} changes — link to the ${tName} entity so the truth lives in one place.`,
      fix: {
        kind: 'convert-to-reference',
        entityId: entity.id,
        fieldId: f.id,
        refEntityId: target.id,
        label: `Link to ${tName}`,
      },
    })
  }
  return out
}

/** dangling-link — blocker — reference to a missing entity → remove-field. */
export function ruleDanglingLink(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    if (f.type !== 'reference') continue
    // an unset target is a field mid-configuration, not import damage
    if (!f.refEntityId || ctx.entities[f.refEntityId]) continue
    out.push({
      id: findingId('dangling-link', entity.id, [f.id]),
      ruleId: 'dangling-link',
      severity: 'blocker',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'BROKEN LINK',
      why: 'This link points at an entity that no longer exists, so no row can ever resolve it — remove the field or rebuild it against a live entity.',
      fix: {
        kind: 'remove-field',
        entityId: entity.id,
        fieldId: f.id,
        label: `Remove '${f.name.trim()}'`,
      },
    })
  }
  return out
}

/** island-entity — advisory — ≥3 entities, no reference in either direction. */
export function ruleIslandEntity(ctx: RuleContext): LintFinding[] {
  const { entity, entities, entityList } = ctx
  if (entityList.length < 3) return []
  const hasOutbound = entity.fields.some(
    (f) => f.type === 'reference' && !!f.refEntityId && !!entities[f.refEntityId],
  )
  if (hasOutbound) return []
  const hasInbound = entityList.some(
    (t) =>
      t.id !== entity.id &&
      t.fields.some((f) => f.type === 'reference' && f.refEntityId === entity.id),
  )
  if (hasInbound) return []
  return [
    {
      id: findingId('island-entity', entity.id),
      ruleId: 'island-entity',
      severity: 'advisory',
      entityId: entity.id,
      title: 'UNLINKED ENTITY',
      why: `Nothing links into or out of '${entity.name.trim()}', and a data model earns its keep through relationships — connect it to the entities it works with, or ask whether it belongs on this sheet.`,
    },
  ]
}

/* ---------------------------------------------------------- */
/* Normalization                                              */
/* ---------------------------------------------------------- */

const NUMBERED_FIELD = /^(.+?)[ _-]?\d+$/

/** repeating-columns — advisory — ≥2 numbered fields with one base → extract-entity. */
export function ruleRepeatingColumns(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const groups = new Map<string, { base: string; fields: FieldDef[] }>()
  for (const f of entity.fields) {
    // formula fields store no data and cannot be migrated as value tuples
    if (f.type === 'formula') continue
    const m = NUMBERED_FIELD.exec(f.name.trim())
    if (!m) continue
    const base = m[1].trim()
    if (!base || !/[^\d\s_-]/.test(base)) continue
    const k = base.toLowerCase()
    const group = groups.get(k)
    if (group) group.fields.push(f)
    else groups.set(k, { base, fields: [f] })
  }
  const out: LintFinding[] = []
  for (const g of groups.values()) {
    if (g.fields.length < 2) continue
    const fieldIds = g.fields.map((f) => f.id)
    const examples = g.fields
      .slice(0, 2)
      .map((f) => `'${f.name.trim()}'`)
      .join(' and ')
    out.push({
      id: findingId('repeating-columns', entity.id, fieldIds),
      ruleId: 'repeating-columns',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds,
      title: 'REPEATING COLUMNS',
      why: `Numbered fields like ${examples} are a list turned on its side — give each ${g.base.toLowerCase()} its own row in its own entity, and the model never runs out of columns.`,
      fix: {
        kind: 'extract-entity',
        entityId: entity.id,
        fieldIds,
        newEntityName: g.base,
        label: `Extract '${g.base}' entity`,
      },
    })
  }
  return out
}

/**
 * prefix-cluster — advisory — ≥3 fields sharing a leading word.
 * Interplay per spec ("one finding, not both"):
 * - fields already claimed by a repeating-columns group never cluster
 *   ('Item 1/2/3' is ONE repeating-columns finding, not two findings);
 * - when an entity named like the prefix exists AND text-should-link already
 *   fired on a cluster field, the cluster is suppressed — the convert advice
 *   is already on the sheet;
 * - when the entity exists but no cluster field matched text-should-link,
 *   we emit the convert-style advisory ourselves (fix only when a confident
 *   text/select target field exists — a missing fix beats a wrong one).
 * Latitude note: formula fields are excluded along with references — they
 * hold no stored values, so extracting them cannot preserve data.
 */
export function rulePrefixCluster(
  ctx: RuleContext,
  repeatingFieldIds: ReadonlySet<string>,
  tslFieldIds: ReadonlySet<string>,
): LintFinding[] {
  const { entity } = ctx
  const entityNameKey = nameKey(entity.name)
  const clusters = new Map<string, { prefix: string; fields: FieldDef[] }>()
  for (const f of entity.fields) {
    if (f.type === 'reference' || f.type === 'formula') continue
    if (repeatingFieldIds.has(f.id)) continue
    const ws = wordsOf(f.name)
    if (ws.length === 0) continue
    const w0 = ws[0]
    if (w0.length < 4) continue
    const lower = w0.toLowerCase()
    if (TYPE_WORDS.has(lower)) continue
    if (lower === entityNameKey) continue
    const cluster = clusters.get(lower)
    if (cluster) cluster.fields.push(f)
    else clusters.set(lower, { prefix: w0, fields: [f] })
  }

  const out: LintFinding[] = []
  for (const c of clusters.values()) {
    if (c.fields.length < 3) continue
    const pk = c.prefix.toLowerCase()
    const target = ctx.entityList.find((t) => {
      if (t.id === entity.id) return false
      const tk = nameKey(t.name)
      return tk === pk || tk === `${pk}s` || `${tk}s` === pk
    })
    const fieldIds = c.fields.map((f) => f.id)

    if (target) {
      // text-should-link already carries the convert advice for this cluster
      if (c.fields.some((f) => tslFieldIds.has(f.id))) continue
      const best = c.fields.find(
        (f) => (f.type === 'text' || f.type === 'select') && namesEntity(nameKey(f.name), pk),
      )
      const finding: LintFinding = {
        id: findingId('prefix-cluster', entity.id, fieldIds),
        ruleId: 'prefix-cluster',
        severity: 'advisory',
        entityId: entity.id,
        fieldIds,
        title: 'COPIED DETAILS',
        why: `These '${c.prefix}' fields copy details that already belong to the ${target.name.trim()} entity — replace the copies with a single link so those details live in one place.`,
      }
      if (best) {
        finding.fix = {
          kind: 'convert-to-reference',
          entityId: entity.id,
          fieldId: best.id,
          refEntityId: target.id,
          label: `Link to ${target.name.trim()}`,
        }
      }
      out.push(finding)
    } else {
      out.push({
        id: findingId('prefix-cluster', entity.id, fieldIds),
        ruleId: 'prefix-cluster',
        severity: 'advisory',
        entityId: entity.id,
        fieldIds,
        title: 'HIDDEN ENTITY',
        why: `${c.fields.length} fields all starting with '${c.prefix}' describe a second thing hiding inside this one — give '${c.prefix}' its own entity and link to it, so those details live in one place.`,
        fix: {
          kind: 'extract-entity',
          entityId: entity.id,
          fieldIds,
          newEntityName: c.prefix,
          label: `Extract '${c.prefix}' entity`,
        },
      })
    }
  }
  return out
}

/* ---------------------------------------------------------- */
/* Derived data as formulas                                   */
/* ---------------------------------------------------------- */

/** derived-column — advisory — stored number named like a computation. */
export function ruleDerivedColumn(ctx: RuleContext): LintFinding[] {
  const { entity } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    if (f.type !== 'number') continue
    if (!isComputedName(f.name)) continue
    const others = entity.fields.filter((o) => o.id !== f.id && o.type === 'number')
    if (others.length < 2) continue

    const wordHit = (field: FieldDef, list: ReadonlySet<string>): boolean =>
      wordsOf(field.name).some((w) => list.has(w.toLowerCase()))
    const a = others.find((o) => wordHit(o, PRICE_WORDS))
    const b = others.find((o) => o.id !== a?.id && wordHit(o, QTY_WORDS))

    let formula: string | undefined
    let used: FieldDef[] = []
    if (a && b) {
      formula = `[${a.name.trim()}] * [${b.name.trim()}]`
      used = [a, b]
    } else if (others.length <= 3) {
      formula = others.map((o) => `[${o.name.trim()}]`).join(' + ')
      used = others
    }
    // a field name containing brackets would corrupt the formula source
    if (formula && used.some((u) => /[[\]]/.test(u.name))) formula = undefined

    const finding: LintFinding = {
      id: findingId('derived-column', entity.id, [f.id]),
      ruleId: 'derived-column',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'STORED CALCULATION',
      why: `A stored ${f.name.trim().toLowerCase()} drifts out of date the moment any number it came from changes — a calculated field cannot disagree with its inputs.`,
    }
    if (formula) {
      finding.fix = {
        kind: 'convert-to-formula',
        entityId: entity.id,
        fieldId: f.id,
        formula,
        label: `Calculate as ${formula}`,
      }
    }
    out.push(finding)
  }
  return out
}

/** stale-select — advisory — rows hold values the option list never offered. */
export function ruleStaleSelect(ctx: RuleContext): LintFinding[] {
  const { entity, rows } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    if (f.type !== 'select') continue
    const options = f.options ?? []
    const exact = new Set(options)
    const ciOptions = new Set(options.map((o) => o.trim().toLowerCase()))
    let staleCount = 0
    const extras: string[] = []
    const extraKeys = new Set<string>()
    for (const row of rows) {
      const v = row.values[f.id]
      if (v === null || v === undefined || v === '') continue
      const sv = String(v)
      const tv = sv.trim()
      if (!tv) continue
      if (exact.has(sv)) continue
      staleCount += 1
      const k = tv.toLowerCase()
      if (ciOptions.has(k) || extraKeys.has(k)) continue
      extraKeys.add(k)
      extras.push(tv)
    }
    if (staleCount === 0) continue
    out.push({
      id: findingId('stale-select', entity.id, [f.id]),
      ruleId: 'stale-select',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'STALE CHOICE LIST',
      why: `A choice list only protects your data while every stored value is on it — ${
        staleCount === 1 ? 'one row here holds a value' : `${staleCount} rows here hold values`
      } the list never offered.`,
      fix: {
        kind: 'convert-to-select',
        entityId: entity.id,
        fieldId: f.id,
        // union preserves order: existing options first, observed extras in first-seen order
        options: [...options, ...extras],
        label: 'Merge values into options',
      },
    })
  }
  return out
}

/**
 * text-low-cardinality — advisory — free text behaving like a choice list.
 * Skips fields already flagged by text-should-link: when a field should be a
 * link, "make it a select" would be conflicting advice.
 */
export function ruleTextLowCardinality(
  ctx: RuleContext,
  tslFieldIds: ReadonlySet<string>,
): LintFinding[] {
  const { entity, rows } = ctx
  const out: LintFinding[] = []
  for (const f of entity.fields) {
    if (f.type !== 'text') continue
    if (tslFieldIds.has(f.id)) continue
    const seen = new Map<string, string>() // ci key → first-seen casing
    let count = 0
    let totalLen = 0
    for (const row of rows) {
      const v = row.values[f.id]
      if (v === null || v === undefined || v === '') continue
      const tv = String(v).trim()
      if (!tv) continue
      count += 1
      totalLen += tv.length
      const k = tv.toLowerCase()
      if (!seen.has(k)) seen.set(k, tv)
    }
    if (count < 6) continue
    if (seen.size === 0 || seen.size > 4) continue
    if (totalLen / count >= 24) continue
    const options = [...seen.values()]
    out.push({
      id: findingId('text-low-cardinality', entity.id, [f.id]),
      ruleId: 'text-low-cardinality',
      severity: 'advisory',
      entityId: entity.id,
      fieldIds: [f.id],
      title: 'FREE TEXT, FEW VALUES',
      why: `Free text invites typos and near-duplicates, and this field repeats the same ${options.length} value${options.length === 1 ? '' : 's'} across ${count} rows — a fixed choice list keeps every entry consistent.`,
      fix: {
        kind: 'convert-to-select',
        entityId: entity.id,
        fieldId: f.id,
        options,
        label: 'Convert to a choice list',
      },
    })
  }
  return out
}
