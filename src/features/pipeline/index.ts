/* THE SALES BOARD. `stages.ts` holds the model and says at length
   why a pipeline stage is not `QuoteState`; `Board.tsx` draws it.
   What the board can be MADE INTO is docs/plan/BOARD_CUSTOMISATION.md
   — the columns, the card, the deal as a popup, and what is
   attached to a deal. */
export { Board } from './Board'
export type { BoardProps } from './Board'
export { BoardSetup } from './BoardSetup'
export type { BoardSetupProps } from './BoardSetup'
export { DealOverview } from './DealOverview'
export type { DealOverviewProps } from './DealOverview'
export { DealPage } from './DealPage'
export type { DealPageProps } from './DealPage'
/* WHAT WAS SAID ABOUT A DEAL — a store beside the quote, never on
   it, for the reason `dealNotes.ts` gives at length. */
export {
  composeNote,
  countOf,
  dropNote,
  forgetDealNotes,
  mintNote,
  mintNoteId,
  notesFor,
  notesOf,
  parseBag,
  saveNote,
  useDealNotes,
  whyNotNote,
  withNote,
  withoutNote,
  type DealNote,
  type NoteBag,
} from './dealNotes'
/* WHAT IS ATTACHED TO IT — links beside the notes, and files in a
   database of their own. `dealFiles.ts` says why the second one is
   IndexedDB and why it is not the project's. */
export {
  LINK_REFUSAL,
  LINK_SCHEMES,
  composeLink,
  countLinks,
  dropLink,
  forgetDealLinks,
  linksFor,
  linksOf,
  mintLink,
  mintLinkId,
  parseLinks,
  saveLink,
  tidyUrl,
  useDealLinks,
  whyNotLink,
  withLink,
  withoutLink,
  type DealLink,
  type LinkBag,
} from './dealLinks'
export {
  FILE_MAX_BYTES,
  FILE_MAX_PER_DEAL,
  dropFile,
  filePlan,
  filesFor,
  forgetDealFiles,
  isPicture,
  keptNote,
  putFile,
  restoreFile,
  useDealFiles,
  type DealFile,
  type FilePlan,
} from './dealFiles'
/* WHOSE DEAL IT IS — a store beside the quote, holding the
   HANDOVERS and deriving the current owner from the last of them.
   An owner names one of the dealership's own jobs (`RoleDef`), and
   `owners.ts` says at length why that is not `preparedBy` and why
   this build has no people directory to point at instead. */
export {
  NOBODY,
  composeHandover,
  dropHandover,
  forgetDealOwners,
  handoverSay,
  handoverToast,
  handoversFor,
  mintHandover,
  mintHandoverId,
  ownerInForce,
  ownerOf,
  ownersOf,
  parseOwners,
  roleWord,
  saveHandover,
  useDealOwners,
  whyNotOwner,
  withHandover,
  withoutHandover,
  type Handover,
  type OwnerBag,
} from './owners'
/* WHAT ONE PERSON WANTS ON A CARD — a preference, keyed by them
   and their organisation, the way the dashboard's tile order is. */
export {
  CARD_CAP,
  CARD_FIELDS,
  DEFAULT_CARD_FIELDS,
  fieldLabel,
  fieldsOf,
  forgetCardFields,
  parseFields,
  toggleField,
  useCardFields,
  whyNotField,
  type CardFieldDef,
  type CardFieldId,
} from './cardFields'
export {
  ANCHORS,
  DEFAULT_STAGES,
  TONES,
  WASHES,
  mintId,
  neighbourOf,
  resetStages,
  setStages,
  stagesOf,
  useStageDefs,
  whyNot,
  type StageDef,
  type StageTone,
  type StageWash,
} from './stageStore'
/* WHAT A STAGE CHANGE DOES — and, at length, what it does not and
   what each of SALES_BOARD §4's other three triggers would need
   before it could. See the file's own header. */
export {
  NOT_LOCKED,
  arrivalClause,
  lockDemand,
  locksButOpen,
  type StageDemand,
} from './stageTrigger'
export {
  arrivedAt,
  boardOf,
  derivedStage,
  forgetPipeline,
  moveTo,
  sinceOf,
  stageOf,
  useSince,
  useStages,
  type StageId,
} from './stages'
