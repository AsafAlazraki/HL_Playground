/* ============================================================
   THE FIT SENTENCE — the second verb, in the first grammar.

   UX_PASS §11 measured the flow builder and found nothing that
   justifies it: two fitment flows in the real seed, both
   `start → match → output`, three nodes and two edges each, and
   zero `condition` / `loop` / `filter` / `find` / `action` nodes
   anywhere in the data — against a canvas that was 5,236 lines
   when §11 measured it and is 8,534 today. A graph is the right
   tool for a thing that branches. Nothing here branches.

   So a fit is said the way a limit already is:

     For every  Highfield Inflatables  boat,
     find the   Yamaha Outboards       motors where
          │  HP Rating  is at least  the boat's  Min HP
          │  HP Rating  is at most   the boat's  Max HP
     Show  Boat · Min HP · Max HP · Motor · HP Rating
     When nothing fits a boat,  leave it out

   THE SAME SURFACE, A DIFFERENT VOCABULARY. `describe.ts` speaks
   in COLUMN CONCEPTS — the column named X on every table of kind
   K — because a limit is about the whole business. A fit is about
   two named tables, so this file speaks in ENTITIES and FIELDS.
   Everything else is shared: `Tokens.tsx` draws the words,
   `INDICATIVE` supplies the verbs, `domainFor` reads the values
   off the sheet, and the read-only prose and the live dropdowns
   come out of ONE token list so they cannot drift apart.

   AN AUTHORING SURFACE OVER AN UNCHANGED MODEL. Nothing here is a
   new engine. `readFit` recognises the linear shape and hands back
   a draft; `compileFit` writes that draft into the same `RuleDef`
   the canvas edits and `@/lib/rules` runs, keeping the node ids
   and positions it was given — a person who says the sentence and
   then opens the canvas finds the plates they left, where they
   left them.

   AND IT REFUSES RATHER THAN LIES. A rule that branches, loops,
   writes or hops through a reference returns `null` from
   `readFit`, and the canvas stays the only surface that can say
   it. That refusal is what makes this a DEFAULT PATH rather than
   a replacement — §11 is explicit that retiring the canvas is a
   separate decision ("keep the engine, demote the canvas"), and
   the canvas lives in `src/features/rules`, which this file does
   not touch.

   PURE. No React, no store, no DOM.
   ============================================================ */

import { OUT_HANDLE, TABLE_KINDS, displayFieldOf, isImageValue } from '@/types/model'
import type {
  CellValue,
  Clause,
  ClauseGroup,
  CompareOp,
  EntityDef,
  FieldDef,
  RowScope,
  RuleDef,
  RuleEdge,
  RuleNode,
  RuleNodeKind,
  ValueExpr,
  ViewColumn,
} from '@/types/model'
import { newId } from '@/lib/id'
import { domainFor, type ColumnConcept, type ValueDomain } from './columns'
import { INDICATIVE, opsFor, valueWords, type SentenceCtx } from './describe'

/* ---------------------------------------------------------- */
/* The draft                                                  */
/* ---------------------------------------------------------- */

/** What a comparison is measured against: a column of the row being
 *  worked (`source`), a fixed value (`word`), or nothing at all —
 *  `isEmpty` and its three siblings take no right-hand side and must
 *  not be drawn one. */
export type FitRight =
  | { k: 'source'; fieldId: string }
  | { k: 'word'; value: CellValue }
  | { k: 'none' }

export interface FitClause {
  id: string
  /** a column on the table being searched */
  matchFieldId: string
  op: CompareOp
  right: FitRight
}

export interface FitDraft {
  /** the table the rule walks — `RuleDef.rootEntityId` */
  sourceEntityId: string
  /** the table it searches — the match node's `targetEntityId` */
  matchEntityId: string
  clauses: FitClause[]
  columns: ViewColumn[]
  /** what becomes of a row nothing fits */
  whenNothingFits: 'skip' | 'passThrough'
  /** the name of the result set — and, because there is no naming
   *  step anywhere in this surface, the name of the rule */
  label: string
}

/** Nothing chosen yet. Deliberately the same empty string
 *  `columns.ts` uses, and for the same reason: an unanswered slot is
 *  not a missing column, and a person who has chosen nothing has
 *  lost nothing. */
export const UNSET = ''

/* ---------------------------------------------------------- */
/* Reading a RuleDef                                          */
/* ---------------------------------------------------------- */

function nodeOf<K extends RuleNodeKind>(
  rule: RuleDef,
  kind: K,
): Extract<RuleNode, { kind: K }> | undefined {
  return rule.nodes.find((n): n is Extract<RuleNode, { kind: K }> => n.kind === kind)
}

function readRight(clause: Clause): FitRight | null {
  if (isUnaryOp(clause.op)) return { k: 'none' }
  const right: ValueExpr | undefined = clause.right
  if (!right) return { k: 'word', value: null }
  if (right.kind === 'literal') return { k: 'word', value: right.value }
  if (right.kind === 'field') {
    /* one hop through a reference is a sentence this grammar cannot
       say; the canvas keeps that rule rather than half-showing it */
    if (right.path.viaFieldId) return null
    return { k: 'source', fieldId: right.path.fieldId }
  }
  return null
}

/**
 * The linear shape, read back as words — or `null`, which means "this
 * rule does something a sentence cannot say, and the canvas is still
 * the only surface for it".
 */
export function readFit(rule: RuleDef): FitDraft | null {
  if (rule.nodes.length !== 3 || rule.edges.length !== 2) return null
  const start = nodeOf(rule, 'start')
  const match = nodeOf(rule, 'match')
  const output = nodeOf(rule, 'output')
  if (!start || !match || !output) return null
  if (!rule.edges.some((e) => e.source === start.id && e.target === match.id)) return null
  if (!rule.edges.some((e) => e.source === match.id && e.target === output.id)) return null

  const group = match.config.group
  if (group.combinator !== 'AND' && group.clauses.length > 1) return null

  const clauses: FitClause[] = []
  for (const c of group.clauses) {
    if (c.left.viaFieldId) return null
    const right = readRight(c)
    if (!right) return null
    clauses.push({ id: c.id, matchFieldId: c.left.fieldId, op: c.op, right })
  }

  return {
    sourceEntityId: rule.rootEntityId,
    matchEntityId: match.config.targetEntityId,
    clauses,
    columns: output.config.columns ?? [],
    whenNothingFits: match.config.emptyBehavior,
    label: output.config.label,
  }
}

/** True when this rule can be said as a sentence. */
export const isFit = (rule: RuleDef): boolean => readFit(rule) !== null

/* ---------------------------------------------------------- */
/* Writing one back                                           */
/* ---------------------------------------------------------- */

function toClause(c: FitClause): Clause {
  if (c.right.k === 'none') return { id: c.id, left: { fieldId: c.matchFieldId }, op: c.op }
  if (c.right.k === 'source') {
    return {
      id: c.id,
      left: { fieldId: c.matchFieldId },
      op: c.op,
      right: { kind: 'field', path: { fieldId: c.right.fieldId } },
    }
  }
  return {
    id: c.id,
    left: { fieldId: c.matchFieldId },
    op: c.op,
    right: { kind: 'literal', value: c.right.value },
  }
}

/** What `compileFit` hands back: the parts of a `RuleDef` a sentence
 *  actually decides. Everything else — the id, the timestamps,
 *  whether it is enabled — belongs to whoever owns the rule. */
export type FitCompiled = Pick<RuleDef, 'rootEntityId' | 'nodes' | 'edges' | 'name'>

/**
 * The sentence compiled into the model the canvas already edits.
 *
 * `base` is the rule this draft came out of; its node ids, its edge
 * ids and its plate positions are kept, so saying the sentence never
 * silently rearranges somebody's canvas.
 */
export function compileFit(draft: FitDraft, base?: RuleDef): FitCompiled {
  const idFor = (kind: RuleNodeKind): string =>
    (base ? nodeOf(base, kind === 'start' ? 'start' : kind === 'match' ? 'match' : 'output')?.id : undefined) ??
    newId()
  const startId = idFor('start')
  const matchId = idFor('match')
  const outputId = idFor('output')

  const at = (kind: RuleNodeKind, x: number): { x: number; y: number } =>
    base?.nodes.find((n) => n.kind === kind)?.position ?? { x, y: 0 }

  const group: ClauseGroup = { combinator: 'AND', clauses: draft.clauses.map(toClause) }
  const nodes: RuleNode[] = [
    { id: startId, kind: 'start', position: at('start', 80), config: {} },
    {
      id: matchId,
      kind: 'match',
      position: at('match', 400),
      config: {
        targetEntityId: draft.matchEntityId,
        group,
        emptyBehavior: draft.whenNothingFits,
      },
    },
    {
      id: outputId,
      kind: 'output',
      position: at('output', 720),
      config: { label: draft.label, columns: draft.columns },
    },
  ]

  const keepEdge = (source: string, target: string): RuleEdge =>
    base?.edges.find((e) => e.source === source && e.target === target) ?? {
      id: newId(),
      source,
      target,
      sourceHandle: OUT_HANDLE,
    }

  return {
    rootEntityId: draft.sourceEntityId,
    nodes,
    edges: [keepEdge(startId, matchId), keepEdge(matchId, outputId)],
    name: draft.label,
  }
}

/* ---------------------------------------------------------- */
/* Vocabulary — tables, columns, values                       */
/* ---------------------------------------------------------- */

/** Columns a comparison can honestly name — the same list a limit
 *  gets. A formula is an outcome rather than a choice, a reference is
 *  a row id rather than a word, and an image is neither. */
const SAYABLE = new Set(['text', 'number', 'boolean', 'date', 'select'])

export const fitFields = (entity: EntityDef | undefined): FieldDef[] =>
  entity ? entity.fields.filter((f) => SAYABLE.has(f.type)) : []

/** Tables a fit may stand on or search. A retired table is history
 *  rather than stock, a view is somebody else's answer, and a table
 *  with nothing sayable on it cannot be one side of a comparison. */
export function fitTables(ctx: SentenceCtx): EntityDef[] {
  return Object.values(ctx.entities)
    .filter((e) => !e.retired && e.role !== 'view' && fitFields(e).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const entityOf = (ctx: SentenceCtx, id: string): EntityDef | undefined => ctx.entities[id]

export const fieldOf = (entity: EntityDef | undefined, fieldId: string): FieldDef | undefined =>
  entity?.fields.find((f) => f.id === fieldId)

/** The kind's own singular noun — "boat", "motor", "trailer". The
 *  KEY is singular where the label ("Boats", "Accessories") is not,
 *  which is the observation `conceptOptionLabel` already leans on. A
 *  table with no declared kind gets NO noun rather than an invented
 *  one, and the sentence closes up around the gap. */
export const nounOf = (entity: EntityDef | undefined): string =>
  entity?.kind && entity.kind !== 'custom' ? entity.kind : ''

/** …and the plural is the kind's own label, lower-cased, because
 *  "accessorys" is what happens when you add an s to a singular. */
export const nounsOf = (entity: EntityDef | undefined): string =>
  entity?.kind && entity.kind !== 'custom' ? TABLE_KINDS[entity.kind].label.toLowerCase() : ''

/** THE NOUN THE TABLE HAS ALREADY SAID.
 *
 *  The apposition — "every Highfield Inflatables boat" — earns its
 *  place because the table's own name never says "boat". "NSM Custom
 *  Trailers trailers" is the same construction with the word twice,
 *  and it is what happens when you glue a kind to a name without
 *  looking at the name. Measured on the real seed: 'Yamaha Outboards'
 *  keeps "motors", 'NSM Custom Trailers' drops "trailers".
 *
 *  It only ever suppresses the APPOSITION. "the trailer's ATM" and
 *  "when nothing fits a trailer" still say the noun, because there
 *  the word is doing grammar rather than repeating a name. */
export function leadNoun(entity: EntityDef | undefined, noun: string): string {
  if (!noun || !entity) return noun
  const last = entity.name.trim().toLowerCase().split(/\s+/).pop() ?? ''
  const bare = noun.replace(/s$/, '')
  return last === bare || last === `${bare}s` || last === `${bare}es` ? '' : noun
}

/** One field wearing a concept's clothes, so the shared `domainFor`
 *  reads its values off the one table it actually lives on. */
function conceptForField(entity: EntityDef, field: FieldDef): ColumnConcept {
  return {
    key: `${entity.id}:${field.id}`,
    kind: entity.kind ?? 'custom',
    name: field.name,
    type: field.type,
    fieldIds: [field.id],
    tableIds: [entity.id],
    options: field.options ?? [],
  }
}

/** What a value token may offer. Cached on the context the same way
 *  `domainOf` caches a concept's — a row scan per column, not per
 *  token, and there are eleven thousand rows. */
export function fitDomain(
  ctx: SentenceCtx,
  entity: EntityDef | undefined,
  field: FieldDef | undefined,
): ValueDomain | undefined {
  if (!entity || !field) return undefined
  const key = `fit:${entity.id}:${field.id}`
  const hit = ctx.domains.get(key)
  if (hit) return hit
  const domain = domainFor(conceptForField(entity, field), ctx.entities, ctx.rowsByEntity)
  ctx.domains.set(key, domain)
  return domain
}

/** The comparisons a fit may make. `is one of` is not among them: an
 *  OR of equals needs a nested group, `ClauseGroup` does not nest, so
 *  offering the word would be offering a rule this model cannot
 *  hold. */
export const fitOps = (domain: ValueDomain | undefined): CompareOp[] =>
  opsFor(domain).filter((op): op is CompareOp => op !== 'oneOf')

export function isUnaryOp(op: CompareOp): boolean {
  return op === 'isEmpty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse'
}

/* ---------------------------------------------------------- */
/* What the answer is called                                  */
/* ---------------------------------------------------------- */

/** THE COLUMN THAT NAMES A ROW, NOT THE ONE THAT SORTS FIRST.
 *
 *  §11's third fix, first half. `displayFieldOf` honours
 *  `displayFieldId` and only then falls back — which is the whole
 *  difference between an answer headed "Boat" and one headed by
 *  whichever column happens to be first, and therefore between a
 *  person trusting the answer and a person pressing RUN to find out
 *  what it was. */
export function defaultFitColumns(
  source: EntityDef | undefined,
  match: EntityDef | undefined,
  clauses: FitClause[],
): ViewColumn[] {
  const out: ViewColumn[] = []
  const add = (scope: RowScope, field: FieldDef | undefined): void => {
    if (!field) return
    if (out.some((c) => c.scope === scope && c.fieldId === field.id)) return
    out.push({ scope, fieldId: field.id, label: field.name })
  }
  add('source', source ? displayFieldOf(source) : undefined)
  add('match', match ? displayFieldOf(match) : undefined)
  /* and the columns the rule is actually decided on, because an
     answer that hides the number it turned on cannot be checked by
     eye — which is the whole point of having it on screen */
  for (const c of clauses) {
    add('match', fieldOf(match, c.matchFieldId))
    if (c.right.k === 'source') add('source', fieldOf(source, c.right.fieldId))
  }
  return out
}

export function columnLabel(ctx: SentenceCtx, draft: FitDraft, column: ViewColumn): string {
  if (column.label) return column.label
  const entity = entityOf(
    ctx,
    column.scope === 'source' ? draft.sourceEntityId : draft.matchEntityId,
  )
  return fieldOf(entity, column.fieldId)?.name ?? 'a column that is gone'
}

/** THE ANSWER THAT NAMES NEITHER SIDE.
 *
 *  §11's third fix, second half, and it is a finding rather than a
 *  hypothetical: the audit's guided path produced 193 rows under two
 *  columns both headed `Series`, and the person found out only after
 *  pressing RUN. Two headings with one word between them name
 *  nothing, so the sentence says so where it happens and offers the
 *  repair — the two display columns, which is what the reader was
 *  owed in the first place. */
export interface FitTrouble {
  /** the word both columns are wearing */
  word: string
  says: string
  fix: { says: string; columns: ViewColumn[] } | null
}

export function fitTrouble(ctx: SentenceCtx, draft: FitDraft): FitTrouble | null {
  if (draft.columns.length === 0) return null

  const sides = new Map<string, Set<RowScope>>()
  for (const column of draft.columns) {
    const key = columnLabel(ctx, draft, column).trim().toLowerCase()
    const scopes = sides.get(key) ?? new Set<RowScope>()
    scopes.add(column.scope)
    sides.set(key, scopes)
  }
  let clash: string | null = null
  for (const [key, scopes] of sides) if (scopes.size > 1) clash = key
  if (clash === null) return null
  const clashed: string = clash

  const source = entityOf(ctx, draft.sourceEntityId)
  const match = entityOf(ctx, draft.matchEntityId)
  const sourceName = source ? displayFieldOf(source) : undefined
  const matchName = match ? displayFieldOf(match) : undefined

  const shown =
    draft.columns
      .map((c) => columnLabel(ctx, draft, c))
      .find((w) => w.trim().toLowerCase() === clashed) ?? clashed

  const kept = draft.columns.filter(
    (c) => columnLabel(ctx, draft, c).trim().toLowerCase() !== clashed,
  )
  const canFix =
    sourceName !== undefined &&
    matchName !== undefined &&
    sourceName.name.trim().toLowerCase() !== matchName.name.trim().toLowerCase()

  return {
    word: shown,
    says: `Two columns are called ${shown}. Nobody reading the answer can tell which side it is about.`,
    fix:
      canFix && sourceName && matchName
        ? {
            says: `Use ${sourceName.name} and ${matchName.name} instead`,
            columns: defaultFitColumns(source, match, []).concat(kept),
          }
        : null,
  }
}

/* ---------------------------------------------------------- */
/* Edits — every one returns a new draft                      */
/* ---------------------------------------------------------- */

export const blankClause = (): FitClause => ({
  id: newId(),
  matchFieldId: UNSET,
  op: 'eq',
  right: { k: 'word', value: null },
})

export function blankFit(source: EntityDef | undefined, match: EntityDef | undefined): FitDraft {
  return {
    sourceEntityId: source?.id ?? UNSET,
    matchEntityId: match?.id ?? UNSET,
    clauses: [blankClause()],
    columns: defaultFitColumns(source, match, []),
    whenNothingFits: 'skip',
    label: match ? `${match.name} that fit` : 'What fits',
  }
}

/** Retargeting a side STRANDS everything that named it, and the
 *  sentence says so rather than substituting. It is the lesson
 *  `RuleSentence.changeConcept` already records: an unanswered slot
 *  says what happened, a column swapped in on the reader's behalf
 *  hides it. */
export function setSourceEntity(ctx: SentenceCtx, draft: FitDraft, id: string): FitDraft {
  if (id === draft.sourceEntityId) return draft
  const source = entityOf(ctx, id)
  const match = entityOf(ctx, draft.matchEntityId)
  return {
    ...draft,
    sourceEntityId: id,
    clauses: draft.clauses.map((c) =>
      c.right.k === 'source' ? { ...c, right: { k: 'word' as const, value: null } } : c,
    ),
    columns: defaultFitColumns(source, match, []).concat(
      draft.columns.filter((c) => c.scope === 'match'),
    ),
  }
}

export function setMatchEntity(ctx: SentenceCtx, draft: FitDraft, id: string): FitDraft {
  if (id === draft.matchEntityId) return draft
  const source = entityOf(ctx, draft.sourceEntityId)
  const match = entityOf(ctx, id)
  return {
    ...draft,
    matchEntityId: id,
    clauses: [blankClause()],
    columns: defaultFitColumns(source, match, []),
    label: match ? `${match.name} that fit` : draft.label,
  }
}

const mapClause = (draft: FitDraft, id: string, f: (c: FitClause) => FitClause): FitDraft => ({
  ...draft,
  clauses: draft.clauses.map((c) => (c.id === id ? f(c) : c)),
})

export function setClauseField(
  ctx: SentenceCtx,
  draft: FitDraft,
  clauseId: string,
  fieldId: string,
): FitDraft {
  const match = entityOf(ctx, draft.matchEntityId)
  const domain = fitDomain(ctx, match, fieldOf(match, fieldId))
  const ops = fitOps(domain)
  return mapClause(draft, clauseId, (c) => ({
    ...c,
    matchFieldId: fieldId,
    /* an operator the new column cannot take is a claim nobody made */
    op: ops.includes(c.op) ? c.op : (ops[0] ?? 'eq'),
    right: { k: 'word', value: null },
  }))
}

export function setClauseOp(draft: FitDraft, clauseId: string, op: CompareOp): FitDraft {
  return mapClause(draft, clauseId, (c) => {
    if (isUnaryOp(op)) return { ...c, op, right: { k: 'none' } }
    if (c.right.k === 'none') return { ...c, op, right: { k: 'word', value: null } }
    return { ...c, op }
  })
}

export const setClauseRight = (draft: FitDraft, clauseId: string, right: FitRight): FitDraft =>
  mapClause(draft, clauseId, (c) => ({ ...c, right }))

export const addClause = (draft: FitDraft): FitDraft => ({
  ...draft,
  clauses: [...draft.clauses, blankClause()],
})

/** The last comparison has nothing to be removed to: a rule that
 *  compares nothing pairs every row with every row, which is not a
 *  fit, it is an accident with 8,679 outcomes. */
export const removeClause = (draft: FitDraft, clauseId: string): FitDraft =>
  draft.clauses.length < 2
    ? draft
    : { ...draft, clauses: draft.clauses.filter((c) => c.id !== clauseId) }

export function addColumn(ctx: SentenceCtx, draft: FitDraft, key: string): FitDraft {
  const cut = key.indexOf(':')
  if (cut < 1) return draft
  const scope = key.slice(0, cut)
  const fieldId = key.slice(cut + 1)
  if (scope !== 'source' && scope !== 'match') return draft
  if (draft.columns.some((c) => c.scope === scope && c.fieldId === fieldId)) return draft
  const entity = entityOf(ctx, scope === 'source' ? draft.sourceEntityId : draft.matchEntityId)
  const field = fieldOf(entity, fieldId)
  if (!field) return draft
  return { ...draft, columns: [...draft.columns, { scope, fieldId, label: field.name }] }
}

export const removeColumn = (draft: FitDraft, scope: RowScope, fieldId: string): FitDraft => ({
  ...draft,
  columns: draft.columns.filter((c) => !(c.scope === scope && c.fieldId === fieldId)),
})

export const setWhenNothingFits = (
  draft: FitDraft,
  whenNothingFits: 'skip' | 'passThrough',
): FitDraft => ({ ...draft, whenNothingFits })

export const setColumns = (draft: FitDraft, columns: ViewColumn[]): FitDraft => ({
  ...draft,
  columns,
})

/* ---------------------------------------------------------- */
/* The words                                                  */
/* ---------------------------------------------------------- */

export type FitTokenRole = 'word' | 'table' | 'field' | 'op' | 'value'

export type FitControl =
  | { k: 'sourceTable' }
  | { k: 'matchTable' }
  | { k: 'matchField'; clauseId: string }
  | { k: 'op'; clauseId: string }
  | { k: 'rightKind'; clauseId: string }
  | { k: 'rightField'; clauseId: string }
  | { k: 'rightWord'; clauseId: string }
  | { k: 'nothingFits' }

export interface FitToken {
  id: string
  role: FitTokenRole
  text: string
  /** punctuation: sits against the word before it */
  tight?: boolean
  /** a slot nobody has answered yet — drawn as empty, never as a name */
  unchosen?: boolean
  /** WHICH TABLE THIS WORD BELONGS TO. §11's fourth fix: `HP Rating`
   *  and `Min HP` must not read as two columns of one table. The tint
   *  is a RAIL UNDER the word and never a fill behind it —
   *  DESIGN_CONTRACT §11, "kind hue is a rail, a dot or a glyph,
   *  never a fill behind text". */
  side?: 'source' | 'match'
  control?: FitControl
  domain?: ValueDomain
}

export interface FitClauseSay {
  id: string
  tokens: FitToken[]
  /** the only comparison left cannot be removed */
  removable: boolean
}

export interface FitColumnSay {
  key: string
  scope: RowScope
  fieldId: string
  label: string
  side: 'source' | 'match'
}

export interface FitSay {
  lead: FitToken[]
  clauses: FitClauseSay[]
  columns: FitColumnSay[]
  foot: FitToken[]
}

const UNCHOSEN_TABLE = 'a table'
const UNCHOSEN_COLUMN = 'a column'
const MISSING_COLUMN = 'a column that is gone'

const say = (id: string, text: string, tight?: boolean): FitToken =>
  tight ? { id, role: 'word', text, tight: true } : { id, role: 'word', text }

/** The two answers to "and when nothing fits?", in the dealer's terms
 *  rather than the model's (`skip` / `passThrough`). */
export const NOTHING_FITS: Record<'skip' | 'passThrough', string> = {
  skip: 'leave it out',
  passThrough: 'keep it with nothing attached',
}

/** THE ONE TOKEN LIST. The read-only prose and the live dropdowns are
 *  both drawn from it, which is why a card and its editor cannot
 *  disagree — the same guarantee `sentenceTokens` gives a limit. */
export function fitSay(ctx: SentenceCtx, draft: FitDraft): FitSay {
  const source = entityOf(ctx, draft.sourceEntityId)
  const match = entityOf(ctx, draft.matchEntityId)
  const sourceNoun = nounOf(source)
  const sourceLead = leadNoun(source, sourceNoun)
  const matchLead = leadNoun(match, nounsOf(match))

  const lead: FitToken[] = [
    say('w-for', 'For every'),
    {
      id: 'source-table',
      role: 'table',
      text: source?.name ?? UNCHOSEN_TABLE,
      side: 'source',
      unchosen: !source,
      control: { k: 'sourceTable' },
    },
  ]
  if (sourceLead) lead.push(say('w-source-noun', sourceLead))
  lead.push(say('w-comma', ',', true), say('w-find', 'find the'))
  lead.push({
    id: 'match-table',
    role: 'table',
    text: match?.name ?? UNCHOSEN_TABLE,
    side: 'match',
    unchosen: !match,
    control: { k: 'matchTable' },
  })
  if (matchLead) lead.push(say('w-match-noun', matchLead))
  lead.push(say('w-where', 'where'))

  const clauses: FitClauseSay[] = draft.clauses.map((clause) => {
    const field = fieldOf(match, clause.matchFieldId)
    const domain = fitDomain(ctx, match, field)
    const unchosenField = clause.matchFieldId === UNSET
    const removable = draft.clauses.length > 1

    const head: FitToken = {
      id: `${clause.id}:field`,
      role: 'field',
      text: field?.name ?? (unchosenField ? UNCHOSEN_COLUMN : MISSING_COLUMN),
      side: 'match',
      unchosen: unchosenField,
      domain,
    }
    if (field || unchosenField) head.control = { k: 'matchField', clauseId: clause.id }
    const tokens: FitToken[] = [head]

    /* THE VERB WAITS FOR THE COLUMN, exactly as a limit's does. With
       no column chosen there is nothing true to offer, so the rest of
       the comparison is words rather than controls that would have to
       guess. One live choice at a time, in reading order. */
    if (!field) {
      tokens.push(say(`${clause.id}:op`, INDICATIVE[clause.op]))
      return { id: clause.id, tokens, removable }
    }

    tokens.push({
      id: `${clause.id}:op`,
      role: 'op',
      text: INDICATIVE[clause.op],
      domain,
      control: { k: 'op', clauseId: clause.id },
    })

    if (clause.right.k === 'none') return { id: clause.id, tokens, removable }

    if (clause.right.k === 'source') {
      tokens.push({
        id: `${clause.id}:rightkind`,
        role: 'word',
        text: sourceNoun ? `the ${sourceNoun}'s` : 'its own',
        control: { k: 'rightKind', clauseId: clause.id },
      })
      const rightField = fieldOf(source, clause.right.fieldId)
      const unchosenRight = clause.right.fieldId === UNSET
      tokens.push({
        id: `${clause.id}:right`,
        role: 'field',
        text: rightField?.name ?? (unchosenRight ? UNCHOSEN_COLUMN : MISSING_COLUMN),
        side: 'source',
        unchosen: unchosenRight,
        control: { k: 'rightField', clauseId: clause.id },
      })
    } else {
      tokens.push({
        id: `${clause.id}:rightkind`,
        role: 'word',
        text: 'the value',
        control: { k: 'rightKind', clauseId: clause.id },
      })
      const v = clause.right.value
      tokens.push({
        id: `${clause.id}:right`,
        role: 'value',
        text: isImageValue(v) ? '…' : valueWords(v, domain?.control),
        unchosen: v === null || v === undefined || v === '',
        domain,
        control: { k: 'rightWord', clauseId: clause.id },
      })
    }

    return { id: clause.id, tokens, removable }
  })

  const columns: FitColumnSay[] = draft.columns.map((column) => ({
    key: `${column.scope}:${column.fieldId}`,
    scope: column.scope,
    fieldId: column.fieldId,
    label: columnLabel(ctx, draft, column),
    side: column.scope === 'source' ? 'source' : 'match',
  }))

  const foot: FitToken[] = [
    say('w-foot', sourceNoun ? `When nothing fits a ${sourceNoun},` : 'When nothing fits,'),
    {
      id: 'nothing-fits',
      role: 'value',
      text: NOTHING_FITS[draft.whenNothingFits],
      control: { k: 'nothingFits' },
    },
  ]

  return { lead, clauses, columns, foot }
}

/** The same words, joined — the sentence as a title, a log line or a
 *  search index. There is exactly one set of words and this is it. */
export function describeFit(ctx: SentenceCtx, draft: FitDraft): string {
  const spoken = fitSay(ctx, draft)
  const join = (tokens: FitToken[]): string =>
    tokens.reduce((text, t) => (t.tight ? text + t.text : text ? `${text} ${t.text}` : t.text), '')
  const head = join(spoken.lead)
  const body = spoken.clauses.map((c) => join(c.tokens)).join(', and ')
  return body ? `${head} ${body}` : head
}

/* ---------------------------------------------------------- */
/* Is it finished?                                            */
/* ---------------------------------------------------------- */

/** The first word still to be answered, and what to say about it.
 *
 *  Rule 10 asks a refusal to say WHY, WHERE it is refused. A greyed
 *  ADD button says neither, so the composer names the choice and puts
 *  the cursor in the exact word it is talking about — the same
 *  contract `missingSlot` keeps for a limit. */
export function fitMissing(
  ctx: SentenceCtx,
  draft: FitDraft,
): { tokenId: string; says: string } | null {
  const spoken = fitSay(ctx, draft)
  for (const token of [...spoken.lead, ...spoken.clauses.flatMap((c) => c.tokens)]) {
    if (!token.unchosen) continue
    if (token.id === 'source-table') {
      return { tokenId: token.id, says: 'Pick the table this rule walks — the thing being fitted.' }
    }
    if (token.id === 'match-table') {
      return { tokenId: token.id, says: 'Pick the table this rule searches for a match.' }
    }
    if (token.role === 'field') {
      return { tokenId: token.id, says: 'Pick the column this comparison is about.' }
    }
    return { tokenId: token.id, says: 'Say what it is compared with.' }
  }
  if (draft.columns.length === 0) {
    return { tokenId: 'columns', says: 'Choose at least one column for the answer to show.' }
  }
  return null
}
