/* ============================================================
   A FIT IS A SENTENCE — the model under UX_PASS §11.

   THE MEASUREMENT THAT ASKED FOR THIS. Both fitment flows in the real
   seed are `start → match → output`: three nodes, two edges, linear,
   two comparison clauses each. The builder offers eight node kinds
   and the real data uses three; `condition`, `loop`, `filter`, `find`
   and `action` have ZERO uses. Both flows come out of one factory —
   `northside.ts`'s `mkRule` — which can only emit that shape, because
   fitment does not branch. It is a filter with a name. Meanwhile the
   canvas measured 524px wide at 1280 with the Output plate 123 of its
   190px off screen: a TWO-plate rule does not fit on the screen that
   draws it.

   A graph is the right tool for a thing that branches. Nothing here
   branches.

   SO THIS IS A NEW AUTHORING SURFACE OVER AN UNCHANGED MODEL. The
   engine is pure, correct and untouched; a sentence compiles into the
   same `RuleDef` the walker already runs, and an existing rule reads
   back out into a sentence. Nothing here evaluates anything.

   THE TWO HALVES ARE A ROUND TRIP AND THAT IS THE POINT.

     compile(sentence) → RuleDef       what the editor writes
     read(RuleDef)     → FitSentence   what the editor opens

   `read` RETURNS NULL RATHER THAN GUESSING, and this is the whole
   safety argument. A rule someone built on the canvas with a
   condition, a loop or a second match is not expressible as this
   sentence; flattening it would silently rewrite somebody's rule into
   a simpler one that runs differently. So anything that is not
   exactly start → match → output, wired in that order, comes back as
   null and the caller is expected to leave the canvas in charge of
   it. UX_PASS says the canvas "is not deleted yet, because deleting
   it is a one-way door" — this is the seam that keeps both true at
   once.

   THE SCOPE CONVENTION IS THE MODEL'S, RESTATED HERE BECAUSE IT IS
   THE ONE THING A SENTENCE COULD GET BACKWARDS. Inside a match, a
   clause's `left` resolves against the CANDIDATE row (the motor) and
   a `{kind:'field'}` right-hand side against the SOURCE row (the
   boat). So "motors that fit this boat" is
       left [HP] gte right field [Min HP]
       left [HP] lte right field [Max HP]
   and the sentence draws the candidate's column on the left of the
   comparison for that reason, not for looks.
   ============================================================ */

import {
  OUT_HANDLE,
  type Clause,
  type CompareOp,
  type RuleDef,
  type RuleEdge,
  type RuleNode,
  type ValueExpr,
  type ViewColumn,
  type XY,
} from '@/types/model'

/** One line of the "where" block: a column of the CANDIDATE compared
 *  against a column of the SOURCE, or against a typed value. */
export interface FitClause {
  id: string
  /** the candidate's column — the motor's HP */
  fieldId: string
  op: CompareOp
  /** what it is compared against. Absent for a unary op. */
  right?: ValueExpr
}

/** A fitment rule as the thing it is when read aloud. */
export interface FitSentence {
  id: string
  name: string
  description?: string
  enabled: boolean
  /** "For every [X] variant" */
  sourceEntityId: string
  /** "find the [Y] where" */
  targetEntityId: string
  clauses: FitClause[]
  /** AND is what every real rule uses; OR is carried rather than
   *  assumed, because the model allows it and a reader who opens a
   *  rule someone wrote with OR must not have it silently changed. */
  combinator: 'AND' | 'OR'
  /** "Show [these columns]" — either side of the pair */
  columns: ViewColumn[]
  /** the name of the result set the output emits into */
  label: string
  /** "When nothing fits, [skip the boat] / [keep it anyway]" */
  whenNothingFits: 'skip' | 'passThrough'
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------ */
/* Reading a rule back out                                       */
/* ------------------------------------------------------------ */

/** The three nodes, in order, or null when this rule is not that
 *  shape. Separated from `read` so the editor can ask "may I open
 *  this?" without building a sentence it is going to throw away. */
export function fitShapeOf(
  rule: RuleDef,
): { start: RuleNode; match: RuleNode; output: RuleNode } | null {
  if (rule.nodes.length !== 3 || rule.edges.length !== 2) return null

  const start = rule.nodes.find((n) => n.kind === 'start')
  const match = rule.nodes.find((n) => n.kind === 'match')
  const output = rule.nodes.find((n) => n.kind === 'output')
  if (!start || !match || !output) return null

  /* AND WIRED IN THAT ORDER. Three right nodes joined the wrong way
     round is a different rule — the engine walks edges, not the
     node list — so the wiring is checked rather than assumed. */
  const first = rule.edges.find((e) => e.source === start.id)
  const second = rule.edges.find((e) => e.source === match.id)
  if (!first || !second) return null
  if (first.target !== match.id || second.target !== output.id) return null

  return { start, match, output }
}

/** Is this rule one the sentence may edit? */
export const isFitSentence = (rule: RuleDef): boolean => fitShapeOf(rule) !== null

/**
 * A rule as a sentence, or null when the graph says more than a
 * sentence can. See the header: null is a refusal, not a failure.
 */
export function readFit(rule: RuleDef): FitSentence | null {
  const shape = fitShapeOf(rule)
  if (!shape) return null
  const { match, output } = shape
  if (match.kind !== 'match' || output.kind !== 'output') return null

  const clauses: FitClause[] = []
  for (const c of match.config.group.clauses) {
    /* A CLAUSE THAT REACHES THROUGH A LINK IS NOT A COMPARISON THIS
       SENTENCE DRAWS. `FieldPath.viaFieldId` follows a reference to
       another row before reading a column, and the sentence has no
       line for that — so the whole rule goes back to the canvas
       rather than losing the hop. */
    if (c.left.viaFieldId !== undefined) return null
    if (c.right?.kind === 'field' && c.right.path.viaFieldId !== undefined) return null
    clauses.push({
      id: c.id,
      fieldId: c.left.fieldId,
      op: c.op,
      ...(c.right ? { right: c.right } : {}),
    })
  }

  return {
    id: rule.id,
    name: rule.name,
    ...(rule.description === undefined ? {} : { description: rule.description }),
    enabled: rule.enabled,
    sourceEntityId: rule.rootEntityId,
    targetEntityId: match.config.targetEntityId,
    clauses,
    combinator: match.config.group.combinator,
    columns: output.config.columns ?? [],
    label: output.config.label,
    whenNothingFits: match.config.emptyBehavior,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

/* ------------------------------------------------------------ */
/* Writing one back                                              */
/* ------------------------------------------------------------ */

/** Where the three plates stand when the canvas draws this rule.
 *  The sentence has no geometry; the canvas does, and a rule written
 *  here still has to be openable there. `mkRule` in the seed uses the
 *  same three columns. */
const LANE = { start: 80, match: 400, output: 720 } as const

export interface CompileIds {
  /** ids for the three nodes and two edges, in that order. Passed in
   *  rather than minted here so this file is pure and a test can read
   *  the output without a clock or a random source. */
  nodes: [string, string, string]
  edges: [string, string]
  /** y, so a rule compiled beside others does not land on top of one */
  y?: number
}

/**
 * The sentence as the rule the engine runs.
 *
 * IT PRESERVES THE NODE IDS OF THE RULE IT CAME FROM when the caller
 * passes them back, which is what makes editing an existing rule an
 * edit rather than a replacement: anything holding a node id — a
 * canvas viewport, a selection, a saved camera — still resolves.
 */
export function compileFit(sentence: FitSentence, ids: CompileIds): RuleDef {
  const [startId, matchId, outputId] = ids.nodes
  const [e1, e2] = ids.edges
  const y = ids.y ?? 0
  const at = (x: number): XY => ({ x, y })

  const clauses: Clause[] = sentence.clauses.map((c) => ({
    id: c.id,
    left: { fieldId: c.fieldId },
    op: c.op,
    ...(c.right ? { right: c.right } : {}),
  }))

  const nodes: RuleNode[] = [
    { id: startId, kind: 'start', position: at(LANE.start), config: {} },
    {
      id: matchId,
      kind: 'match',
      position: at(LANE.match),
      config: {
        targetEntityId: sentence.targetEntityId,
        group: { combinator: sentence.combinator, clauses },
        emptyBehavior: sentence.whenNothingFits,
      },
    },
    {
      id: outputId,
      kind: 'output',
      position: at(LANE.output),
      config: { label: sentence.label, columns: sentence.columns },
    },
  ]

  const edges: RuleEdge[] = [
    { id: e1, source: startId, target: matchId, sourceHandle: OUT_HANDLE },
    { id: e2, source: matchId, target: outputId, sourceHandle: OUT_HANDLE },
  ]

  return {
    id: sentence.id,
    name: sentence.name,
    ...(sentence.description === undefined ? {} : { description: sentence.description }),
    rootEntityId: sentence.sourceEntityId,
    enabled: sentence.enabled,
    nodes,
    edges,
    createdAt: sentence.createdAt,
    updatedAt: sentence.updatedAt,
  }
}

/** The ids an existing rule already uses, so recompiling it edits
 *  rather than replaces. Null for a rule the sentence cannot read. */
export function idsOf(rule: RuleDef): CompileIds | null {
  const shape = fitShapeOf(rule)
  if (!shape) return null
  const first = rule.edges.find((e) => e.source === shape.start.id)
  const second = rule.edges.find((e) => e.source === shape.match.id)
  if (!first || !second) return null
  return {
    nodes: [shape.start.id, shape.match.id, shape.output.id],
    edges: [first.id, second.id],
    y: shape.match.position.y,
  }
}
