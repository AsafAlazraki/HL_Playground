/* THE SALES BOARD. `stages.ts` holds the model and says at length
   why a pipeline stage is not `QuoteState`; `Board.tsx` draws it.
   The plan for what comes next — dealer-defined stages, triggers,
   comments and attachments — is docs/plan/SALES_BOARD.md. */
export { Board } from './Board'
export type { BoardProps } from './Board'
export {
  STAGES,
  boardOf,
  derivedStage,
  forgetPipeline,
  moveTo,
  stageById,
  stageOf,
  useStages,
  type Stage,
  type StageId,
} from './stages'
