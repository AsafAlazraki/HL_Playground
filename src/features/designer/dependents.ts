/* ============================================================
   WHAT ELSE IS HOLDING ON TO THIS COLUMN.

   Three destructive acts live in the column setup — rename, retype
   and delete — and until now all three were performed against a
   screen that showed only the column itself. A rename in particular
   committed instantly and silently, and formula references resolve
   BY NAME (`@/lib/formula/index.ts` looks the ref up in a map keyed
   on the lower-cased field name), so renaming "Base Cost" turned
   every calculation reading it into `Error — Unknown field
   [Base Cost]` — a message visible only if you happened to open the
   one column that broke. Nothing marked the row, nothing marked the
   table, and the break survived a reload.

   So: before any of the three acts — and before the fourth, deleting
   the whole table — ask this module what is holding on. It answers in
   four currencies —

     formulaReaders    calculated columns on THIS table that name the
                       column in their expression
     renameFieldRefs   the rewrite that keeps them working
     ruleBreakage      rules that would gain a new blocker, asked of
                       the rule engine itself rather than a hand-rolled
                       scanner that would drift from it
     entityDependents  the same question about a whole table: which
                       link columns elsewhere the cascade removes, and
                       which rules are deleted outright rather than
                       merely marked

   Pure TypeScript: no React, no store, no DOM.
   ============================================================ */

import type { EntityDef, FieldDef, RuleDef } from '@/types/model'
import { validateRule } from '@/lib/rules'
import type { RuleRunContext } from '@/lib/rules'

/* ---------------------------------------------------------- */
/* Rewriting a field reference inside a formula source        */
/* ---------------------------------------------------------- */

const norm = (s: string): string => s.trim().toLowerCase()

/** `]` inside a field name is written `]]`, mirroring the tokenizer. */
const escapeRefName = (name: string): string => name.replace(/]/g, ']]')

export interface RefRewrite {
  /** the source with every matching reference renamed */
  src: string
  /** how many references were rewritten */
  count: number
}

/**
 * Rewrite every `[from]` field reference in `src` to `[to]`.
 *
 * Walks the source with the same rules `@/lib/formula/tokens.ts`
 * lexes by — quoted text is skipped whole (so the words inside
 * `"[Base Cost]"` are text, not a reference, and must not move), and
 * a doubled `]]` inside a reference is a literal `]`. Matching is
 * case-insensitive and trims, because that is exactly how the engine
 * resolves a reference; a rewrite that matched more narrowly than the
 * resolver would leave a live reference behind and look like it had
 * worked.
 *
 * NEVER THROWS. A source that does not lex (an unterminated `[`, an
 * unclosed quote) comes back untouched with `count: 0` — a formula
 * that is already broken is not made worse by a rename, and this
 * function must not be the thing that decides it.
 */
export function renameFieldRefs(src: string, from: string, to: string): RefRewrite {
  const target = norm(from)
  if (!src || !target) return { src, count: 0 }

  let out = ''
  let count = 0
  let i = 0
  const n = src.length

  while (i < n) {
    const c = src[i]

    /* quoted text — copied through verbatim, brackets and all */
    if (c === '"' || c === "'") {
      const start = i
      i += 1
      let closed = false
      while (i < n) {
        if (src[i] === c) {
          if (i + 1 < n && src[i + 1] === c) {
            i += 2
            continue
          }
          i += 1
          closed = true
          break
        }
        i += 1
      }
      if (!closed) return { src, count: 0 } /* unterminated: leave it alone */
      out += src.slice(start, i)
      continue
    }

    if (c === '[') {
      const start = i
      i += 1
      let name = ''
      let closed = false
      while (i < n) {
        if (src[i] === ']') {
          if (i + 1 < n && src[i + 1] === ']') {
            name += ']'
            i += 2
            continue
          }
          i += 1
          closed = true
          break
        }
        name += src[i]
        i += 1
      }
      if (!closed) return { src, count: 0 } /* unterminated: leave it alone */
      if (norm(name) === target) {
        out += `[${escapeRefName(to.trim())}]`
        count += 1
      } else {
        out += src.slice(start, i)
      }
      continue
    }

    out += c
    i += 1
  }

  return count === 0 ? { src, count: 0 } : { src: out, count }
}

/* ---------------------------------------------------------- */
/* Who reads this column                                      */
/* ---------------------------------------------------------- */

/**
 * The calculated columns on `entity` whose stored expression names
 * `field` — in column order, self excluded.
 *
 * Detected by the same rewrite that would fix them, so the two can
 * never disagree about what counts as a reference: a column appears
 * here exactly when `renameFieldRefs` would change its source.
 */
export function formulaReaders(entity: EntityDef, field: FieldDef): FieldDef[] {
  if (!field.name.trim()) return []
  return entity.fields.filter((f) => {
    if (f.id === field.id || f.type !== 'formula' || !f.formula) return false
    return renameFieldRefs(f.formula, field.name, field.name + 'x').count > 0
  })
}

/** `[a, b, c]` -> `a, b and c` — for a sentence, not a list. */
export function nameList(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/* ---------------------------------------------------------- */
/* What deleting it would break in the rules                  */
/* ---------------------------------------------------------- */

export interface RuleBreak {
  ruleId: string
  ruleName: string
  /** the engine's own sentences, deduped, that only appear once the
   *  column is gone */
  messages: string[]
}

/**
 * Which rules would gain a blocker if `fieldId` left `entityId`.
 *
 * ASKED OF THE ENGINE, NOT GUESSED. A field id can be referenced from
 * a clause's left path, a clause's right-hand value, a `viaFieldId`
 * hop, a Find node, a Set/Create/Link action or an output column —
 * seven shapes, in `RuleNodeConfigMap`, which a hand-written scanner
 * here would have to track forever. So instead the rule is validated
 * twice, once against the schema as it stands and once against a
 * schema with the column already gone, and the difference is the
 * damage. Whatever the engine learns to check next, this learns too.
 *
 * Never throws: `validateRule` does not, and a rule the engine cannot
 * read simply contributes nothing.
 */
export function ruleBreakage(
  ctx: RuleRunContext,
  rules: Record<string, RuleDef>,
  entityId: string,
  fieldId: string,
): RuleBreak[] {
  const entity = ctx.entities[entityId]
  if (!entity) return []

  const without: RuleRunContext = {
    entities: {
      ...ctx.entities,
      [entityId]: { ...entity, fields: entity.fields.filter((f) => f.id !== fieldId) },
    },
    rowsByEntity: ctx.rowsByEntity,
  }

  return freshBlockers(rules, ctx, without)
}

/**
 * The blockers each rule gains between two schemas — the shared half
 * of "what would this act break".
 *
 * Only what the change ADDS is reported. A rule that is already broken
 * for some other reason must not be laid at the door of the act being
 * considered, or the sheet cries wolf on every table with one stale
 * node in the graph.
 */
function freshBlockers(
  rules: Record<string, RuleDef>,
  before: RuleRunContext,
  after: RuleRunContext,
  skip: (rule: RuleDef) => boolean = () => false,
): RuleBreak[] {
  const out: RuleBreak[] = []
  for (const rule of Object.values(rules)) {
    if (skip(rule)) continue
    const had = new Set(validateRule(rule, before).map((i) => i.message))
    const fresh: string[] = []
    for (const issue of validateRule(rule, after)) {
      if (had.has(issue.message)) continue
      if (!fresh.includes(issue.message)) fresh.push(issue.message)
    }
    if (fresh.length > 0) {
      out.push({ ruleId: rule.id, ruleName: rule.name, messages: fresh })
    }
  }
  return out.sort((a, b) => a.ruleName.localeCompare(b.ruleName))
}

/* ---------------------------------------------------------- */
/* What deleting a whole TABLE would take with it             */
/* ---------------------------------------------------------- */

export interface EntityDependents {
  /** link columns on OTHER tables aimed here — the cascade removes them */
  links: Array<{ tableName: string; columnName: string }>
  /** rules rooted on this table — DELETED outright, not merely broken */
  rootedRules: Array<{ ruleId: string; ruleName: string }>
  /** rules rooted elsewhere that gain a blocker */
  brokenRules: RuleBreak[]
}

/**
 * Everything `deleteEntity` takes with the table, worked out before it
 * is asked for.
 *
 * The footer button under DANGER said only that the rows and the link
 * columns went. Two of the three things that actually happen were
 * unsaid: WHICH link columns, on which other tables — and that every
 * rule ROOTED on the table is struck from the project entirely, which
 * is not a blocker a person can go and fix afterwards, it is the rule
 * gone. A person deleting a mis-drafted table cannot be expected to
 * know the rule they wrote last week was rooted on it.
 *
 * The "after" schema is built exactly the way `useProjectStore
 * .deleteEntity` builds it — table gone, its rows gone, every
 * `reference` column aimed at it dropped from every other table — so
 * the blockers reported are the blockers that will exist. Mirroring
 * the reducer is a debt; the alternative is asking the store to do a
 * dry run, which it has no shape for.
 */
export function entityDependents(
  ctx: RuleRunContext,
  rules: Record<string, RuleDef>,
  entityId: string,
): EntityDependents {
  const doomed = ctx.entities[entityId]
  if (!doomed) return { links: [], rootedRules: [], brokenRules: [] }

  const links: EntityDependents['links'] = []
  const entities: RuleRunContext['entities'] = {}
  for (const [id, e] of Object.entries(ctx.entities)) {
    if (id === entityId) continue
    const kept = e.fields.filter((f) => {
      const aimed = f.type === 'reference' && f.refEntityId === entityId
      if (aimed) links.push({ tableName: e.name, columnName: f.name || 'an untitled column' })
      return !aimed
    })
    entities[id] = kept.length === e.fields.length ? e : { ...e, fields: kept }
  }

  const rowsByEntity = { ...ctx.rowsByEntity }
  delete rowsByEntity[entityId]

  const rootedRules = Object.values(rules)
    .filter((r) => r.rootEntityId === entityId)
    .map((r) => ({ ruleId: r.id, ruleName: r.name }))
    .sort((a, b) => a.ruleName.localeCompare(b.ruleName))

  return {
    links,
    rootedRules,
    /* a rule rooted here is not "broken", it is deleted — reporting it
       in both currencies would read as two separate losses */
    brokenRules: freshBlockers(
      rules,
      ctx,
      { entities, rowsByEntity },
      (r) => r.rootEntityId === entityId,
    ),
  }
}
