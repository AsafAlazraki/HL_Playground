/* ============================================================
   ADMIN — the workshop behind the shop, and it is not a
   graveyard.

   THE RISK THIS FILE EXISTS TO NOT TAKE. PHASE_TWO §8.1 names it
   first: "Admin becomes a graveyard. The schema work is genuinely
   good and burying it badly is the biggest risk here." Eight
   doors came off the rail into this stage. Every one of them
   opens a finished feature, and one of them — the fitment
   builder — had no door anywhere in the application before this
   file was written.

   SO IT IS BUILT LIKE A SELLING SCREEN, NOT LIKE A SETTINGS PAGE.

     ONE THING DOMINATES. The business's name, in the display
     face, clamped 34→64px. Everything else on this screen is
     15px or 11px, which is the scale contrast §3 asks for and
     the thing the dashboard measured at 34px flat did not have.

     EVERY DOOR CARRIES A FIGURE, and the figure is real: tables
     counted off the store, rows summed off the rows, rules off
     `useConstraints`, roles off the roles slice. A door with no
     honest number carries no number — "Configure" says which
     three levels it writes at, because that is a fact about the
     door and not a sentence about the app.

     NO PARAGRAPHS. The stage gets its name and one line. A door
     gets a name and one fact. That is the whole prose budget
     (§1a) and this screen spends exactly it.

     NO KIND HUE. The discipline is that a hue only ever appears
     on something that HAS that kind (§1b). A rule, a role and an
     import are not boats, motors, trailers or rigging kits, so
     Admin is ink, accent and paper — and that is not a shortfall,
     it is the rule being kept where keeping it costs something.

   THE ACCESS SCREEN IS THIS STAGE'S OWN STATE, not a second stage
   kind — the same argument ModuleStage makes about its settings
   panel. "Back to Admin" must not unmount the box, re-run the
   fade and drop the scroll of a person comparing two roles.

   THE DRAWING IS NOT MOUNTED HERE. `.shell-sheet-layer` is the
   whiteboard and it is the app's one permanent surface, alive
   under every window. Its door empties the window stack, which is
   the honest reading of "show me the drawing" — see `setStage`
   in Shell.tsx.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import {
  ArrowLeft,
  Archive,
  ArrowsLeftRight,
  CaretLeft,
  FlowArrow,
  Graph,
  Scales,
  ShieldCheck,
  Stack,
  TreeStructure,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { isRetired } from '@/types/model'
import { useConstraints } from '@/features/constraints'
import { AccessScreen } from '@/features/modules'
import { ImportExportMenu } from '@/features/io'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

const MARK = ICON_SIZE.medium
const MARK_WEIGHT = weightFor(MARK)

export interface AdminStageProps {
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
  /** the organisation's saved configurations */
  onOpenConfigurations: () => void
  /** one module's own set-up, from the access grid */
  onOpenModule: (moduleId: string) => void
  onClose: () => void
}

/** A door. A name, a mark, and ONE fact — never a description. */
function Door({
  glyph: Glyph,
  name,
  fact,
  wide,
  onPick,
}: {
  glyph: Icon
  name: string
  fact: string
  wide?: boolean
  onPick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className={`ad-door${wide ? ' is-wide' : ''}`}
      onClick={onPick}
    >
      <span className="ad-door-mark" aria-hidden="true">
        <Glyph size={MARK} weight={MARK_WEIGHT} />
      </span>
      <span className="ad-door-name">{name}</span>
      {/* THE ONE FACT. Mono, tabular, because most of them are
          figures and a column of facts that do not line up on the
          decimal is a column somebody has to read twice. */}
      <span className="ad-door-fact">{fact}</span>
    </button>
  )
}

export function AdminStage({
  onOpenDrawing,
  onOpenTables,
  onOpenLevels,
  onOpenRules,
  onOpenFitment,
  onOpenConfigurations,
  onOpenModule,
  onClose,
}: AdminStageProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const roles = useProjectStore((s) => s.roles)
  const org = useProjectStore((s) => s.meta.org)
  const constraints = useConstraints()

  /* WHOSE SET-UP IS ON SCREEN. Held here rather than in the shell's
     Stage union — see the header. */
  const [showing, setShowing] = useState<'index' | 'access'>('index')

  /* Escape is the control in track 1 of the bar, on the keyboard.
     Inside the access screen it is that screen's own way back, so the
     stage yields it rather than throwing the whole page away under
     somebody halfway through granting a capability. */
  useStageEscape(showing === 'index' ? onClose : () => setShowing('index'))

  const facts = useMemo(() => {
    const live = Object.values(entities).filter((e) => !isRetired(e))
    const tables = live.filter((e) => e.role !== 'join')
    const joins = live.filter((e) => e.role === 'join')
    let rows = 0
    for (const e of tables) rows += rowsByEntity[e.id]?.length ?? 0
    let pairs = 0
    for (const e of joins) pairs += rowsByEntity[e.id]?.length ?? 0
    return {
      tables: tables.length,
      rows,
      joins: joins.length,
      pairs,
      roles: Object.keys(roles).length,
      rules: constraints.length,
    }
  }, [entities, rowsByEntity, roles, constraints])

  const n = (x: number): string => x.toLocaleString('en-AU')
  const one = (x: number, singular: string, plural: string): string =>
    `${n(x)} ${x === 1 ? singular : plural}`

  return (
    <div
      className="ad"
      role="region"
      aria-label="Admin"
      /* Delete and Backspace stop at this root, the same line every
         other stage carries: the sheet's window-level handler offers
         to strike the SELECTED TABLE on either one. Escape travels —
         see stageKeys.ts. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        <button
          type="button"
          className="shell-view-back"
          onClick={showing === 'index' ? onClose : () => setShowing('index')}
          aria-label="Back"
        >
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>Back</span>
        </button>
        <p className="shell-view-what" role="heading" aria-level={1}>
          <span className="shell-view-what-name">
            {showing === 'index' ? 'Admin' : 'Access & roles'}
          </span>
        </p>
        {showing === 'access' ? (
          <div className="shell-quote-acts">
            <button
              type="button"
              className="btn shell-quote-act"
              onClick={() => setShowing('index')}
            >
              <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              All of Admin
            </button>
          </div>
        ) : null}
      </div>

      {showing === 'access' ? (
        <div className="ad-well">
          <AccessScreen
            onPlaces={() => setShowing('index')}
            onSettings={onOpenModule}
          />
        </div>
      ) : (
        <div className="ad-well">
          <header className="ad-head">
            <p className="mono-label ad-eyebrow">Admin</p>
            {/* THE ONE BIG THING ON THE SCREEN. `ds-hero` is Archivo
                and bottoms out at 34px, which is the floor the third
                face is allowed at all (§2). */}
            <h2 className="ad-name ds-hero">{org?.name ?? 'Your business'}</h2>
            {/* THE ONE LINE. A stage gets its name and at most one
                line, and this is it for the whole surface. */}
            <p className="ad-say">
              The shape of what you sell, and who may change it.
            </p>
          </header>

          <section className="ad-band" aria-labelledby="ad-band-shape">
            <p className="mono-label ad-band-name" id="ad-band-shape">
              The shape of what you sell
            </p>
            <div className="ad-grid">
              <Door
                glyph={Graph}
                name="Data model"
                fact={`${one(facts.tables, 'table', 'tables')} · ${one(
                  facts.joins,
                  'relationship',
                  'relationships',
                )}`}
                wide
                onPick={onOpenDrawing}
              />
              <Door
                glyph={Stack}
                name="All tables"
                fact={one(facts.rows, 'row', 'rows')}
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
                fact={one(facts.rules, 'rule', 'rules')}
                onPick={onOpenRules}
              />
              <Door
                glyph={FlowArrow}
                name="What fits what"
                fact={one(facts.pairs, 'pairing', 'pairings')}
                onPick={onOpenFitment}
              />
            </div>
          </section>

          <section className="ad-band" aria-labelledby="ad-band-org">
            <p className="mono-label ad-band-name" id="ad-band-org">
              The organisation
            </p>
            <div className="ad-grid">
              <Door
                glyph={ShieldCheck}
                name="Access & roles"
                fact={one(facts.roles, 'role', 'roles')}
                onPick={() => setShowing('access')}
              />
              <Door
                glyph={Archive}
                name="Saved configurations"
                fact="this organisation's working sets"
                onPick={onOpenConfigurations}
              />
              {/* THE TWO DOORS A FILE COMES IN AND GOES OUT BY. It is
                  a menu, not a page, so it keeps its own trigger and
                  takes the door's shape around it rather than being
                  redrawn — one control, one behaviour, one place that
                  knows what an import costs. */}
              <div className="ad-door ad-door-io">
                <span className="ad-door-mark" aria-hidden="true">
                  <ArrowsLeftRight size={MARK} weight={MARK_WEIGHT} />
                </span>
                <ImportExportMenu align="left" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
