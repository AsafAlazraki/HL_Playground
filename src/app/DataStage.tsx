/* ============================================================
   DATA — its own door in the rail, and not a room inside Admin.

   WHERE IT WAS. The data model, every table, Configure, Business
   rules and What fits what lived in a band on the Admin screen,
   and Admin itself was a 32px link at the very foot of the rail
   under the person's own name. The owner looked for this
   functionality twice and could not find it — "I STILL DON'T SEE
   THAT FUNCTIONALITY" — and then said where it belongs: "I WANT
   THE DATA STUFF AS ITS OWN MENU ITEM. nOT UNDER ADMIN!"

   He is right, and the reason is not only discoverability. Admin
   is about the ORGANISATION — who may do what, what has been
   saved, what goes in and out. This is about the SHAPE OF WHAT
   THE BUSINESS SELLS: 51 tables, 15,691 rows, 8,649 pairings and
   the rules over them. They are two different jobs done by two
   different people on two different days, and one of them is the
   thing this whole application is built on top of. It gets a
   door.

   THE RUNG IS THE SAME ONE. `super-admin`, exactly as the band
   was gated — a wrong move here costs a price file rather than a
   setting. The rail simply does not draw the row for anybody
   below it: a whole area that is not yours is not a refusal, and
   greying it would tell every salesperson every day about a
   screen they will never open.
   ============================================================ */

import type { ReactElement } from 'react'
import { FlowArrow, Graph, Scales, Stack, TreeStructure } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useConstraints } from '@/features/constraints/constraintDefs'
import { PageHead } from '@/features/page'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

const MARK = ICON_SIZE.medium
const MARK_WEIGHT = weightFor(MARK)

/** n and its noun, so a door never prints "1 tables". */
const one = (n: number, sing: string, plur: string): string =>
  `${n.toLocaleString('en-AU')} ${n === 1 ? sing : plur}`

/** A door. A name, a mark, and ONE fact — never a description.
 *
 *  THE SAME DOOR ADMIN DRAWS, and it is deliberately a copy of
 *  eleven lines rather than a shared component: the two screens
 *  are two surfaces now and a shared `Door` would be one file that
 *  two features both have to agree about before either can change
 *  its own. `.ad-door` is the class in both, because they ARE the
 *  same object and a second stylesheet for it is how they would
 *  drift apart. */
function Door({
  glyph: Glyph,
  name,
  fact,
  wide,
  onPick,
}: {
  glyph: Icon
  name: string
  fact?: string
  wide?: boolean
  onPick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className={`ad-door${wide ? ' is-wide' : ''}${fact ? '' : ' is-bare'}`}
      onClick={onPick}
    >
      <span className="ad-door-mark" aria-hidden="true">
        <Glyph size={MARK} weight={MARK_WEIGHT} />
      </span>
      <span className="ad-door-name">{name}</span>
      {fact ? <span className="ad-door-fact">{fact}</span> : null}
    </button>
  )
}

export interface DataStageProps {
  /** the drawing — the app's one permanent surface, under
   *  everything. Only the shell can empty the window stack. */
  onOpenDrawing: () => void
  /** every table you have, on one page */
  onOpenTables: () => void
  /** set a value once at a brand, a range or a model */
  onOpenLevels: () => void
  /** the limits every row must keep */
  onOpenRules: () => void
  /** what fits what — the pairings behind every shortlist */
  onOpenFitment: () => void
  onClose: () => void
}

export function DataStage({
  onOpenDrawing,
  onOpenTables,
  onOpenLevels,
  onOpenRules,
  onOpenFitment,
  onClose,
}: DataStageProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const constraints = useConstraints()

  /* EVERY FIGURE IS COUNTED AT PAINT, off the project as it
     stands. Nothing here is stored, cached or estimated — the
     same rule the dashboard's cards keep, and the reason a door's
     fact can never go stale. */
  const tables = Object.keys(entities).length
  const rows = Object.values(rowsByEntity).reduce((n, list) => n + list.length, 0)
  const joins = Object.values(entities).reduce(
    (n, e) => n + e.fields.filter((f) => f.type === 'reference').length,
    0,
  )
  const rules = constraints.length

  useStageEscape(onClose)

  return (
    {/* `ad`, THE SAME ROOT CLASS ADMIN'S STAGE CARRIES. This was
        written as `ad-root`, which no stylesheet declares — so the
        screen was missing whatever `.ad` sets and `check-styles`
        was right to fail it. The two screens are siblings and share
        the stage, the well, the band and the door. */}
    <div className="shell-viewstage ad" onKeyDown={stageKeys}>
      <div className="shell-view-bar" />

      <div className="ad-well">
        <PageHead
          eyebrow="Super admin"
          name="Data"
          count={`${one(tables, 'table', 'tables')} · ${one(rows, 'row', 'rows')}`}
          line="The shape of what you sell, and the limits over it."
        />

        {/* ONE GRID, FIVE DOORS, and the drawing worth two of them.
            Six cells into three columns, exactly — the arithmetic
            `shell.css` records, and the reason "All tables" is not
            marooned on a row of its own with 771px beside it. */}
        <section className="ad-band" aria-label="The shape of what you sell">
          <div className="ad-grid">
            <Door
              glyph={Graph}
              name="Data model"
              fact={`${one(tables, 'table', 'tables')} · ${one(
                joins,
                'relationship',
                'relationships',
              )}`}
              wide
              onPick={onOpenDrawing}
            />
            <Door
              glyph={Stack}
              name="All tables"
              fact={one(rows, 'row', 'rows')}
              onPick={onOpenTables}
            />
            <Door
              glyph={TreeStructure}
              name="Configure"
              fact="brand · range · model"
              onPick={onOpenLevels}
            />
            <Door
              glyph={Scales}
              name="Business rules"
              fact={one(rules, 'rule', 'rules')}
              onPick={onOpenRules}
            />
            <Door
              glyph={FlowArrow}
              name="What fits what"
              fact="every pairing behind a shortlist"
              onPick={onOpenFitment}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
