/* ============================================================
   src/features/rules — the BUSINESS RULE BUILDER.

   Public contract (RULES_SPEC.md). The shell/whiteboard mounts
   these; everything else in this folder is private.

     ruleNodeTypes      React Flow node types, keys `rule-<kind>`
     useRuleGraph       store → { nodes, edges }, ready to spread
     RulePaletteStrip   PRIMARY palette: floating strip on the canvas
     RulePalette        legacy column palette (kept for compatibility)
     RulesList          rule index: create / select / rename / delete
     RuleInspector      per-node config panel
     RuleResultsRail    views, effects and warnings from a run
     RuleToolbar        RUN + validity stamp (layer-agnostic)
     useRuleRun         run / clear / applyEffects
     onPaletteDrop      canvas drop handler (drag)
     addRuleNodeAt      canvas drop at a point (drag)
     addRuleNodeAfter   the next step after a plate (click)
   ============================================================ */

export { ruleNodeTypes, RULE_NODE_COMPONENTS } from './RuleNodes'

export { useRuleGraph, ruleNodeTypeKey, outHandlesOf } from './useRuleGraph'
export type { RuleFlowNode, RuleNodeData } from './useRuleGraph'

export { RulePaletteStrip } from './RulePaletteStrip'
export type { RulePaletteStripProps } from './RulePaletteStrip'
export { RulePalette } from './RulePalette'
export { RulesList } from './RulesList'
export { RuleInspector } from './RuleInspector'
export { RuleResultsRail } from './RuleResultsRail'
export { RuleToolbar } from './RuleToolbar'

export { useRuleRun } from './useRuleRun'
export type { RuleRunApi } from './useRuleRun'

export { useRuleIssues, useAllRuleIssues } from './useRuleIssues'
export type { IssueSummary } from './useRuleIssues'

export {
  RULE_DND_MIME,
  addRuleNodeAfter,
  addRuleNodeAt,
  isPaletteDrag,
  nextNodePosition,
  onPaletteDrop,
  readPaletteKind,
  setPaletteDragData,
} from './drop'

/* words a host surface may want to reuse (a tooltip, a title block) */
export {
  accentInkBright,
  describeGroup,
  describeNode,
  kindInk,
  kindInkBright,
  plateSpec,
} from './describe'
export type { PlateChunk, PlateChip, PlateLine, PlateRoute, PlateSpec } from './describe'
