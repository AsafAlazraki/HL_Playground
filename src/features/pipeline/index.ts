/* THE SALES BOARD. `stages.ts` holds the model and says at length
   why a pipeline stage is not `QuoteState`; `Board.tsx` draws it.
   The plan for what comes next — dealer-defined stages, triggers,
   comments and attachments — is docs/plan/SALES_BOARD.md. */
export { Board } from './Board'
export type { BoardProps } from './Board'
export { StageEditor } from './StageEditor'
export type { StageEditorProps } from './StageEditor'
export {
  ANCHORS,
  DEFAULT_STAGES,
  TONES,
  mintId,
  neighbourOf,
  resetStages,
  setStages,
  stagesOf,
  useStageDefs,
  whyNot,
  type StageDef,
  type StageTone,
} from './stageStore'
export {
  boardOf,
  derivedStage,
  forgetPipeline,
  moveTo,
  stageOf,
  useStages,
  type StageId,
} from './stages'
