/* ============================================================
   WHAT YOUR TABLES SUGGEST — the list, on both screens that have
   the moment.

   UX_PASS §8 asks for this on "the empty dashboard", and there are
   two of those. The front door draws a modules card that is empty
   on a fresh sheet; the MODULES SCREEN draws an empty state of its
   own, and that one is the harder moment — a person who has pressed
   Modules has gone looking for them, and what they used to find was
   a paragraph defining the word and a button that opened a blank
   panel. `proposals.ts` had the answer all along and only one of
   the two screens was asking it.

   SO IT IS ONE SURFACE WITH TWO CALLERS rather than two lists that
   agree today. It moved out of `CardBody` unchanged: same reading,
   same Row, same seed, same panel.

   WHAT IS NOT HERE, AND THE MEASUREMENT THAT KEPT IT OUT.

   §8's sketch ends with `[ Create all three ]`. It is not built,
   and the reason is `useProjectStore.ts:115`: "Views and modules
   stay out" of the undo stack. Every other bulk act in this app is
   one press because Ctrl+Z is one press after it; a control that
   made four modules from one click would be the only irreversible
   multi-write on any empty state, and the person most likely to
   press it is the one who has been using the app for ninety
   seconds. Each proposal opens the panel it is a seed for, which
   costs one more click and leaves the third click a person's.
   Written up in docs/BACKLOG.md row 34 rather than left as
   silence.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Row, SectionHead } from '@/ui'
/* THE PANEL THAT MAKES A MODULE, BY DIRECT PATH. `@/features/modules`
   re-exports the modules SCREEN, which is now one of this file's two
   callers — through the barrel that is a cycle, and by the file it
   is the same three-click panel it always was. */
import { NewModuleDialog } from '@/features/modules/NewModuleDialog'
import { KindMark } from './KindMark'
import { plural } from './cards'
import { proposeModules, seedFor } from './proposals'
import type { ModuleProposal, ProposalReading } from './proposals'
import './dashboard.css'

/* THE SCREEN THIS ANSWERS. A dealer imports their price file and
   lands on a front door that does not know what they sell: 53
   tables and 15,691 rows behind a card reading "No modules yet"
   over one button called Modules. The app is not short of the
   answer — `EntityDef.kind` records what each table holds and
   `TABLE_KINDS` names it — it simply was not saying it.

   THE PROPOSAL IS A READING, NEVER A VERDICT, which is the same
   line `split.ts` draws for itself: it names the tables it would
   hold and the rows under them, and a person presses it or does
   not. `proposals.ts` holds the arithmetic and the argument for
   every predicate in it.

   AND PRESSING ONE OPENS THE PANEL THAT ALREADY EXISTS. There is
   one create path in this application. `NewModuleDialog` is a
   three-click create — pick a table, tick its siblings, Create —
   and a proposal a person has read has already answered the first
   two, so it hands them over as a seed and the panel opens on
   them, editable and abandonable. Nothing here calls
   `createModule`; a second create path would be a second set of
   rules about what a module may be built from. */

/** The modules this sheet implies and has not got. Reads the store
 *  so both callers ask the same question; the derivation itself is
 *  pure and takes its inputs (`proposals.ts`). */
export function useProposals(): ProposalReading {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  return useMemo(
    () => proposeModules(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )
}

export function Proposals({
  reading,
  lead,
  why,
  onCreated,
}: {
  reading: ProposalReading
  /** the label over the list. Two callers want one: an empty card
   *  is being told what its tables suggest, and a card with places
   *  on it is being told what is left over.
   *
   *  OMITTED IS A REAL ANSWER, and rule 3 is why. `SectionHead`
   *  uppercases, which is a LABEL style and never a sentence — the
   *  modules screen introduces this list with §8's own line, "From
   *  your 3 tables, these look like places in your business", and
   *  that sentence carries a figure in it. Shouted, it read as a
   *  heading that had swallowed a number. So the caller that has
   *  already said what the list is does not say it twice. */
  lead?: string
  /** draw the refusal. Only where the count line it qualifies is
   *  directly above it — under a grid of tiles it would be a
   *  sentence about a number that is not on screen */
  why: boolean
  /** where the third click lands. A place you then have to go and
   *  find is a fourth click */
  onCreated: (moduleId: string) => void
}): JSX.Element | null {
  /* WHICH PROPOSAL THE PANEL IS STANDING ON, and it is the panel's
     `key` as well as its seed: a different answer is a different
     panel, which is what stops a half-typed name surviving into a
     proposal somebody pressed afterwards. */
  const [asked, setAsked] = useState<ModuleProposal | null>(null)
  if (reading.proposals.length === 0) return null

  return (
    <div className="dsh-propose">
      {lead === undefined ? null : <SectionHead level="h3">{lead}</SectionHead>}
      <ul className="dsh-propose-list">
        {reading.proposals.map((p) => {
          const tables = plural(p.tables.length, 'table', 'tables')
          const rows = plural(p.rows, 'row', 'rows')
          const held = p.tables.map((t) => t.name)
          return (
            <li key={p.kind}>
              {/* EVERYTHING IT WOULD DO IS IN THE LABEL, because a
                  proposal a person cannot check before pressing is
                  a guess with a button on it — and a reader who
                  cannot see the second line has to be able to check
                  it too. The kind's mark leads the Row, in the
                  kind's hue: this is a thing that HAS that kind,
                  which is the whole of the rule in §1. */}
              <Row
                onActivate={() => setAsked(p)}
                label={`Make ${p.name} from ${tables} — ${rows}: ${held.join(', ')}`}
                lead={<KindMark kind={p.kind} />}
                name={p.name}
                meta={
                  <>
                    {/* THE FIGURES ARE MONO AND THE NOUNS ARE NOT —
                        the rule every other count on this page keeps */}
                    <span className="dsh-propose-n" aria-hidden="true">
                      <b className="dsh-propose-fig ds-mono">{p.tables.length}</b>{' '}
                      {p.tables.length === 1 ? 'table' : 'tables'}
                      {' · '}
                      <b className="dsh-propose-fig ds-mono">{p.rows.toLocaleString()}</b>{' '}
                      {p.rows === 1 ? 'row' : 'rows'}
                    </span>
                    {/* THE TABLES IT WOULD HOLD, BY NAME. This line
                        is the reason the proposal is allowed to
                        exist: nothing is invented, and a person can
                        read what they are about to agree to before
                        they agree to it. It wraps rather than
                        truncating — a list cut short with an
                        ellipsis is the reduced count
                        DESIGN_CONTRACT §5 refuses. */}
                    {/* ONE TABLE NAMES ITSELF ONCE. A proposal over a
                        single table is CALLED that table
                        (`proposals.ts`), so this line would repeat
                        the line above it word for word — evidence
                        that evidences nothing. The label still
                        carries it, because a person who cannot see
                        the row still needs to know what it holds. */}
                    {held.length > 1 ? (
                      <span className="dsh-propose-holds" aria-hidden="true">
                        {held.join(' · ')}
                      </span>
                    ) : null}
                  </>
                }
              />
            </li>
          )
        })}
      </ul>

      {/* RULE 10, WHERE THE THING IS REFUSED. The tables that
          declare no kind are inside the count above and outside
          every proposal below it, and a person who cannot see why
          has been handed a number that does not add up. */}
      {why && reading.why ? <p className="dsh-propose-why ds-small">{reading.why}</p> : null}

      {asked ? (
        <NewModuleDialog
          key={asked.kind}
          seed={seedFor(asked)}
          onClose={() => setAsked(null)}
          onCreated={onCreated}
        />
      ) : null}
    </div>
  )
}
