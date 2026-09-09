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
   eight currencies —

     formulaReaders    calculated columns on THIS table that name the
                       column in their expression
     renameFieldRefs   the rewrite that keeps them working
     ruleBreakage      rules that would gain a new blocker, asked of
                       the rule engine itself rather than a hand-rolled
                       scanner that would drift from it
     retypeBreakage    the same question for a change of TYPE, which
                       takes away what the column meant rather than the
                       column, and breaks a rule just as thoroughly
     retargetBreakage  and for re-aiming a LINK, where every column a
                       rule hops to becomes a column of another table
     entityDependents  the same question about a whole table: which
                       link columns elsewhere the cascade removes, and
                       which rules are deleted outright rather than
                       merely marked
     entityPages       the pages and the dashboard doors left pointing
                       at a table that is gone — the two things
                       `deleteEntity` does NOT cascade into
     fieldViewers      the pages that name one column, and where

   The last four are the newest and the argument for them is written
   at the head of their own section: rules and formulas were counted
   here for months while views and modules — the half a person is
   least able to check for themselves — were not counted anywhere.

   Pure TypeScript: no React, no store, no DOM.
   ============================================================ */

import type {
  EntityDef,
  FieldDef,
  FieldPath,
  FieldType,
  ModuleDef,
  RuleDef,
  ViewBlock,
  ViewDef,
} from '@/types/model'
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

/* ---------------------------------------------------------- */
/* What CHANGING a column would break in the rules            */
/* ---------------------------------------------------------- */

/*  A DELETE WAS THE ONLY ACT THAT ASKED. `ruleBreakage` has counted
    the damage of removing a column since the sheets stopped being
    `window.confirm`s — and removing it is not the only way to take it
    away from a rule. `updateField({ type })` takes away what the
    column MEANT; `updateField({ refEntityId })` re-aims it at a table
    where every field a rule hops to is a different field. Both are
    exactly as breaking and neither was counted anywhere.

    Both go through one core for one reason: the alternative is three
    near-identical schema-diff functions that drift, and the whole
    argument of `ruleBreakage` above is that this file must never grow
    a scanner of its own. `validate.ts` already refuses a Set aimed at
    a calculated column (:441) and a hop through a link whose target
    has lost the field (:169-172); this reports whichever of those the
    act would newly cause, without naming either. */

/** The shared half: the blockers a patched column would newly cause. */
function patchBreakage(
  ctx: RuleRunContext,
  rules: Record<string, RuleDef>,
  entityId: string,
  fieldId: string,
  patch: Partial<FieldDef>,
): RuleBreak[] {
  const entity = ctx.entities[entityId]
  if (!entity) return []
  const at = entity.fields.findIndex((f) => f.id === fieldId)
  if (at < 0) return []

  const fields = [...entity.fields]
  fields[at] = { ...fields[at], ...patch }

  return freshBlockers(rules, ctx, {
    entities: { ...ctx.entities, [entityId]: { ...entity, fields } },
    rowsByEntity: ctx.rowsByEntity,
  })
}

/**
 * Which rules would gain a blocker if `fieldId` on `entityId` stopped
 * being the type it is and became `to`.
 *
 * Returns nothing when the type is not actually changing, so a caller
 * may ask without checking first.
 */
export function retypeBreakage(
  ctx: RuleRunContext,
  rules: Record<string, RuleDef>,
  entityId: string,
  fieldId: string,
  to: FieldType,
): RuleBreak[] {
  const from = ctx.entities[entityId]?.fields.find((f) => f.id === fieldId)
  if (!from || from.type === to) return []
  return patchBreakage(ctx, rules, entityId, fieldId, { type: to })
}

/**
 * Which rules would gain a blocker if the link `fieldId` stopped
 * pointing at the table it points at and pointed at `toEntityId`.
 *
 * A rule that hops through this link — `{ viaFieldId, fieldId }` — is
 * reading a column of the OLD target, and the new one is a different
 * table with different columns. `validate.ts:169-172` says so in its
 * own words ("reads a field that is no longer on …"), which is why
 * this asks rather than deciding.
 *
 * Returns nothing when the link already points there.
 */
export function retargetBreakage(
  ctx: RuleRunContext,
  rules: Record<string, RuleDef>,
  entityId: string,
  fieldId: string,
  toEntityId: string,
): RuleBreak[] {
  const from = ctx.entities[entityId]?.fields.find((f) => f.id === fieldId)
  if (!from || from.refEntityId === toEntityId) return []
  return patchBreakage(ctx, rules, entityId, fieldId, { refEntityId: toEntityId })
}

/* ---------------------------------------------------------- */
/* The PAGES and the PLACES — views and modules               */
/* ---------------------------------------------------------- */

/*  WHY THIS SECTION EXISTS, AND WHAT IT COST TO LEAVE IT OUT.

    DESIGN_PRINCIPLES §7 asks a confirm to state its blast radius and
    writes the example sentence itself — "3 business rules name this
    column, 1 formula reads it, 38 of 40 rows hold a value" — and the
    backlog's version of the same line says "26 rules AND 4 VIEWS read
    it". Rules and formulas were answered above. Views were not, and
    neither were modules, and they are the half a person is least able
    to check for themselves: a broken rule eventually shows a red mark
    on the rules stage, while a page and a dashboard door live behind
    two more clicks and simply come up thinner than they were.

    AND `deleteEntity` DOES NOT CASCADE INTO EITHER OF THEM. It
    rewrites entities, rows and rules and returns them
    (`useProjectStore.ts:1041-1047`); `views` and `modules` are not in
    that object. So a page rooted on the deleted table keeps its record
    and stops having a subject — `ViewPage.tsx:153` reads `root` as
    `undefined` and there is nothing left to draw — and a module keeps
    the dead id in `tableIds` and is quietly one table smaller
    (`modules/read.ts:84-99`: "skipped rather than drawn as a hole").
    Neither is a consequence a person can be asked to predict, and the
    only moment either can still be avoided is before the press.

    Pure, like everything above it: the store is read by the caller and
    handed in. */

/** A page that would be left holding a pointer to something gone. */
export interface PageRef {
  viewId: string
  viewName: string
}

/** A place on the dashboard that stands on this table. */
export interface PlaceRef {
  moduleId: string
  moduleName: string
  /** this is the module's LAST table — it would have nothing to list */
  last: boolean
}

export interface EntityPages {
  /** pages whose subject IS this table; they lose what they are about */
  rootedViews: PageRef[]
  /** pages rooted elsewhere that draw a block from it; they lose a block */
  blockViews: PageRef[]
  /** modules that name it among the tables they stand on */
  places: PlaceRef[]
}

/** Every block of a view, children included, in drawing order. */
function eachBlock(blocks: ViewBlock[] | undefined, visit: (b: ViewBlock) => void): void {
  for (const b of blocks ?? []) {
    visit(b)
    eachBlock(b.children, visit)
  }
}

/** Sort by the name a person reads, so two runs list the same order —
 *  `Object.values` over a rehydrated record is not ordered. */
function byName<T>(key: (v: T) => string): (a: T, b: T) => number {
  return (a, b) => key(a).localeCompare(key(b))
}

/**
 * The pages and the dashboard doors that would be left pointing at
 * `entityId` after it is deleted.
 *
 * A page counts once, under the worse of the two headings: a page
 * ROOTED here loses its subject entirely, and saying in the same
 * breath that it also loses a block would read as two losses where
 * there is one page.
 */
export function entityPages(
  views: Record<string, ViewDef>,
  modules: Record<string, ModuleDef>,
  entityId: string,
): EntityPages {
  const rootedViews: PageRef[] = []
  const blockViews: PageRef[] = []

  for (const v of Object.values(views)) {
    const ref: PageRef = { viewId: v.id, viewName: v.name || 'an unnamed page' }
    if (v.rootTableId === entityId) {
      rootedViews.push(ref)
      continue
    }
    let drawn = false
    eachBlock(v.blocks, (b) => {
      if (b.tableId === entityId || b.joinTableId === entityId) drawn = true
    })
    if (drawn) blockViews.push(ref)
  }

  const places: PlaceRef[] = Object.values(modules)
    .filter((m) => m.tableIds.includes(entityId))
    .map((m) => ({
      moduleId: m.id,
      moduleName: m.name || 'an unnamed module',
      last: m.tableIds.length === 1,
    }))

  return {
    rootedViews: rootedViews.sort(byName((p) => p.viewName)),
    blockViews: blockViews.sort(byName((p) => p.viewName)),
    places: places.sort(byName((p) => p.moduleName)),
  }
}

/* ---------------------------------------------------------- */
/* Which pages name one COLUMN                                */
/* ---------------------------------------------------------- */

/** One page that names the column, and how many places on it do. */
export interface PageUse extends PageRef {
  /** shown in a block, filtered on, or named by a block's own rule */
  uses: number
}

/**
 * The table a `FieldPath` finally lands on, given the table the side it
 * is written on stands for. `undefined` when the hop cannot be followed
 * — a link column since deleted, or one never pointed anywhere. An
 * unfollowable hop is reported as nothing rather than as a match: a
 * count that guesses is the thing this module exists to replace.
 */
function landsOn(
  path: FieldPath,
  sideId: string | undefined,
  entities: Record<string, EntityDef>,
): string | undefined {
  if (!sideId) return undefined
  if (!path.viaFieldId) return sideId
  const via = entities[sideId]?.fields.find((f) => f.id === path.viaFieldId)
  return via?.type === 'reference' ? via.refEntityId : undefined
}

/** How many times one clause path names `fieldId` of `entityId`. */
function pathUses(
  path: FieldPath,
  sideId: string | undefined,
  entities: Record<string, EntityDef>,
  entityId: string,
  fieldId: string,
): number {
  let n = 0
  /* the hop itself is a column on THIS side, and taking it away breaks
     the clause exactly as taking its destination away would */
  if (path.viaFieldId === fieldId && sideId === entityId) n += 1
  if (path.fieldId === fieldId && landsOn(path, sideId, entities) === entityId) n += 1
  return n
}

/**
 * Which pages name `fieldId`, and how many places on each.
 *
 * WHICH SIDE A CLAUSE IS WRITTEN ON IS NOT A GUESS. `evalPairRule`
 * (`features/views/pairs.ts:288`) binds `left` to the CANDIDATE row and
 * `right` to the SOURCE row, so a clause's left path is a column on the
 * block's own table and its right path is a column on the table the
 * block hangs under — the view's root for a top-level block, the parent
 * block's table for a nested one. That is carried down the walk rather
 * than assumed: a nested block read against the wrong table would count
 * columns that are not there, and an over-count in a confirm is a
 * finding a person cannot go and check.
 */
export function fieldViewers(
  views: Record<string, ViewDef>,
  entities: Record<string, EntityDef>,
  entityId: string,
  fieldId: string,
): PageUse[] {
  const walk = (block: ViewBlock, sourceId: string | undefined): number => {
    let n = 0
    if (block.tableId === entityId) {
      if (block.columns?.includes(fieldId)) n += 1
      for (const f of block.filters ?? []) if (f.fieldId === fieldId) n += 1
    }
    for (const c of block.rule?.clauses ?? []) {
      n += pathUses(c.left, block.tableId, entities, entityId, fieldId)
      if (c.right?.kind === 'field') {
        n += pathUses(c.right.path, sourceId, entities, entityId, fieldId)
      }
    }
    for (const child of block.children ?? []) n += walk(child, block.tableId)
    return n
  }

  const out: PageUse[] = []
  for (const v of Object.values(views)) {
    let uses = 0
    for (const b of v.blocks ?? []) uses += walk(b, v.rootTableId)
    if (uses > 0) out.push({ viewId: v.id, viewName: v.name || 'an unnamed page', uses })
  }
  return out.sort(byName((p) => p.viewName))
}
