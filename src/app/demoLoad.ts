/* ============================================================
   STARTING POINTS — the guard in front of every prepared set.

   Loading a set REPLACES the sheet. `replaceProject` swaps
   entities, zones, rules and rows wholesale and clears
   `selection` — but NOT `activeRuleId`, which would then point at
   a rule that no longer exists. So the guard lives here, once,
   rather than at each call site: stand the chrome down, then load.
   On an empty sheet there is nothing to lose, which is the only
   case either door hits — and over a full sheet this REFUSES rather
   than asking, because a module with no surface has nowhere honest
   to ask from. See `loadDemoSet` at the foot of the file for the
   `window.confirm` that used to stand there and who asks now.

   WHAT IS ON OFFER is `@/demos`, and only that. Two sets survive
   CONFIGURATOR_SPEC.md §6b ("Starting data — REAL, or none at
   all"): the real Northside Marine file, and a blank sheet. The
   invented `fitment` and `dealership` sets are retired and are
   reachable from no surface in the app.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { DEMOS, type DemoSet } from '@/demos'

/** The id of the do-nothing set, which every empty surface already
 *  offers implicitly — it is what the user is looking at. */
const BLANK_ID = 'blank'

/** The prepared set built from real, sourced business data — today
 *  the Northside Marine Master Price File. Read off `DEMOS` rather
 *  than named here, so the demos module stays the single register
 *  of what exists. `undefined` while only the blank sheet ships,
 *  and every caller draws nothing rather than a dead button. */
export function realDemoSet(): DemoSet | undefined {
  return DEMOS.find((d) => d.id !== BLANK_ID)
}

/* ============================================================
   WHAT THE DOOR TO THE PREPARED SET IS ALLOWED TO CALL IT.

   THE SENTENCE THIS REPLACES. Both doors — the invitation and Home's
   empty state — read:

     EXAMPLE DATA
     Load a worked example — another dealer's price file
     Real data extracted from Northside Marine's Master Price File.

   Three lines, and the second contradicts the third. Worse, it is the
   FIRST thing this app's first real customer reads: Northside Marine
   are not a fixture, and their own catalogue was being introduced to
   them as a stranger's sample.

   IT WAS RIGHT ONCE, AND THAT IS WORTH KEEPING STRAIGHT. `EmptyState`
   records why it was worded that way: the button used to say "Start
   from Northside Marine" on a screen headed with the name the user had
   just typed, and a dealer who had called their own business Northside
   Marine read it as "start from MY data" and expected their price list
   back. Anonymising the file fixed that reader and broke the other one.

   THERE IS ONLY ONE SET, AND IT HAS TWO TRUE READINGS. `@/demos` ships
   exactly one prepared set — Northside's real Master Price File — and
   no generic sample; CONFIGURATOR_SPEC.md §6b bans inventing a second
   one. So the honest fix is not a third wording, it is to NAME the
   business and let the sheet's own organisation decide which reading a
   given person is looking at:

     the org IS that business    it is their catalogue, and the door
                                 says so
     the org is anybody else     it is that business's file, named, so
                                 nobody can mistake it for their own

   `setOrganisation` writes `meta.org` from onboarding and `Shell.tsx`
   re-applies it after every project swap, so `meta.org.name` is always
   the reader's own business and never the set's. That is what makes the
   comparison safe to make.

   NOTHING IS INFERRED BEYOND THE NAME. The set says whose file it is
   (`DemoSet.business`) and what the business calls the document
   (`DemoSet.file`); the provenance line is still the demos module's own
   `blurb`, because the demos module is what knows where the numbers came
   from. A set with no business named falls through to the words that
   claim nothing.
   ============================================================ */

/* ============================================================
   AND WHAT IT SAYS WHILE IT IS FETCHING, WHICH IS NEW.

   The prepared set is its own chunk now (`demos/seedChunk.ts`): a
   megabyte of real price file that is NOT in the bundle which drew
   this button, and arrives when somebody asks for it. So there is a
   moment — short on a fast connection, not short on a phone in a
   boat shed — where the press has happened and the sheet has not
   changed. A door that looks pressed and does nothing is the worst
   reading of that moment, and it is the one you get for free.

   THE SAME FUNCTION WRITES ALL THREE PHASES, deliberately. Two
   functions would let the idle door and the busy door disagree
   about whose file it is — which is the exact mistake
   `startingPointWords` exists to prevent, made twice.

   FAILURE IS A SENTENCE WITH A REASON, WHERE IT FAILED
   (DESIGN_CONTRACT §6.5). `import()` can only really fail one way
   here — the chunk was never fetched and there is no connection to
   fetch it with — so the note says that, and the door stays
   pressable because pressing it again is the retry.
   ============================================================ */

/** Where the press has got to. `idle` is also what a door wears
 *  before anybody touches it. */
export type LoadPhase = 'idle' | 'loading' | 'failed'

/** The three lines the door wears, and which reading produced them. */
export interface StartingPointWords {
  /** the tag, drawn as a LABEL — never a name and never a value */
  tag: string
  /** the action, in the terms of the person reading it */
  label: string
  /** where the numbers came from */
  note: string
  /** true when the sheet's organisation IS the business whose file it is */
  own: boolean
}

/** A business name reduced to its words, so punctuation, case and double
 *  spaces cannot make two spellings of one dealer look like two dealers. */
const nameWords = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w !== '')

/** Is the sheet's organisation the business whose file this is?
 *
 *  A WORD-BOUNDARY PREFIX, deliberately, and not a substring test.
 *  "Northside Marine Pty Ltd" is the same dealer and must match;
 *  "Northside Marinas" is a different one and must not. Getting this
 *  wrong in the false-positive direction tells a stranger that somebody
 *  else's catalogue is theirs, so the test is the strict one. */
export function isSameBusiness(
  orgName: string | undefined,
  business: string | undefined,
): boolean {
  if (!orgName || !business) return false
  const org = nameWords(orgName)
  const own = nameWords(business)
  if (own.length === 0 || org.length < own.length) return false
  return own.every((w, i) => org[i] === w)
}

/** WHILE IT IS COMING. It names the document, because that is what
 *  the wait is about, and it is the same document the idle line
 *  named a moment ago. */
export const LOADING_NOTE =
  'The file downloads the first time you open it, and stays on this computer afterwards.'

/** AND WHEN IT DOES NOT COME. There is one honest reason — the
 *  chunk has never been fetched and cannot be now — so it is the
 *  reason given, on the control that refused. */
export const LOAD_FAILED_NOTE =
  'The file did not download. It is fetched the first time you open it, so this needs a connection. Press again to try.'

export function startingPointWords(
  demo: DemoSet,
  orgName: string | undefined,
  phase: LoadPhase = 'idle',
): StartingPointWords {
  const note =
    phase === 'loading' ? LOADING_NOTE : phase === 'failed' ? LOAD_FAILED_NOTE : demo.blurb
  const { business, file } = demo
  if (!business || !file) {
    /* a set that is nobody's data claims nothing about whose it is */
    const label = phase === 'loading' ? `Loading ${demo.name}…` : `Load ${demo.name}`
    return { tag: 'Example data', label, note, own: false }
  }
  if (isSameBusiness(orgName, business)) {
    return {
      tag: 'Your data',
      label: phase === 'loading' ? `Loading your ${file}…` : `Load your ${file}`,
      note,
      own: true,
    }
  }
  return {
    tag: 'Example data',
    label:
      phase === 'loading'
        ? `Loading ${business}’s ${file}…`
        : `Load ${business}’s ${file} — a worked example`,
    note,
    own: false,
  }
}

/** Put the set on the sheet, having already asked. Nothing here is a
 *  question: the two doors that offer a prepared set from an EMPTY
 *  sheet have nothing to ask about, and the one door that offers it
 *  over a full sheet — the freshness notice — asks in the app's own
 *  voice and offers to save a copy first, which `window.confirm` had
 *  no room to do. See features/io/Freshness.tsx. */
export async function applyDemoSet(demo: DemoSet): Promise<void> {
  const store = useProjectStore.getState()
  /* the old rule id would survive the swap and leave the canvas drawing
     a flow that no longer exists — drop it before the sheet changes */
  store.setActiveRule(null)
  store.select(null)
  /* AWAITED, AND THE REJECTION IS THE CALLER'S. The prepared set is
     its own chunk (demos/seedChunk.ts), so `load()` has a fetch in it
     and can fail — on a first visit with no connection there is
     nothing to fall back on, and the honest thing is to say so on the
     button that was pressed. Swallowing it here would leave a door
     that looks pressed and does nothing. */
  await demo.load()
}

/**
 * Put a prepared set on an EMPTY sheet.
 *
 * WHY THERE IS NO QUESTION IN HERE ANY MORE, and why the guard stayed.
 * This held the app's last `window.confirm` — `Load "…"? It replaces
 * the sheet you have now — 50 tables, 3,566 rows of data, 5 rules —
 * and that cannot be undone.` Every word of it was true. It was also
 * unreachable: both doors that call this are drawn only over an empty
 * sheet (`EmptyState`'s invitation and Home's `.hm-none`), so
 * `entityCount > 0` was never once satisfied, and the only door that
 * offers a set over a FULL sheet is `features/io/Freshness.tsx` —
 * which asks in the app's own voice and offers to save a copy first,
 * the third answer `confirm` had no room for. It calls `applyDemoSet`
 * directly and never came through here.
 *
 * So the branch is a refusal rather than a question. A module with no
 * surface has nowhere honest to ask — a native modal is not an answer,
 * it is a different application interrupting — and REFUSING is the one
 * behaviour that cannot destroy a dealer's sheet by accident. The
 * capability is not removed, it is where it always belonged: the
 * freshness notice, with a save-a-copy door beside it.
 *
 * @returns true if the set was put on the sheet; false if the sheet
 * was not empty and nothing was touched — see above for who asks.
 * REJECTS if the set's own chunk could not be fetched; `useDemoLoad`
 * is what turns that into words on the door.
 */
export async function loadDemoSet(demo: DemoSet): Promise<boolean> {
  const store = useProjectStore.getState()
  if (Object.keys(store.entities).length > 0) return false
  await applyDemoSet(demo)
  return true
}
