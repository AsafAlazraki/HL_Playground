/* ============================================================
   HOME — the Finder window, and the app's front door.

   THE ARGUMENT AGAINST THE SHEET AS A LANDING SURFACE.

   The blueprint is a good drawing and a bad home. Landing on it,
   a person meets fifty-two rectangles scattered across an
   infinite plane at whatever zoom the camera happened to pick.
   Nothing is grouped, nothing is sorted, most of it is off
   screen, and the only way to look for something is to pan. It
   answers "how do these tables relate" - which is a real question
   somebody asks perhaps once a week - and it answers "where is
   Stacer" not at all, which is the question they ask forty times
   a day.

   So the sheet stops being the front door and becomes a VIEW, one
   click away on the dock, for the job it is actually good at.

   WHAT REPLACES IT is the thing every Mac user already knows: a
   Finder window in gallery view. Your tables, grouped by what
   they hold, sorted, every one of them on screen at once, each a
   card you can read from across the room. Nothing to pan, nothing
   to zoom, nothing off the edge.

   IT IS THE SAME CARD as the sheet draws, deliberately - kind
   rail, kind name, table name, what is in it - so moving between
   the two never feels like moving between two apps.
   ============================================================ */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { countLabel, leafNoun } from '@/features/table/grouping'
import { ImportExportMenu } from '@/features/io'
import { ICON_SIZE } from '@/lib/icons'
import { loadDemoSet, realDemoSet } from './demoLoad'

const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

export interface HomeStageProps {
  onOpenTable: (entityId: string) => void
}

export function HomeStage({ onOpenTable }: HomeStageProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const org = useProjectStore((s) => s.meta.org)

  const tables = useMemo(() => Object.values(entities), [entities])

  /* the prepared set, for the empty state's door. Resolved from the
     demos register rather than named here, so the offer disappears
     with the set instead of dangling. */
  const real = realDemoSet()

  /* NO FIND BOX HERE ANY MORE, and that is a ruling rather than a
     tidy-up: "i don't want search in top bar I want it in the bottom
     floating one". There is exactly ONE search in this app and it is
     the dock's "Find anything" — which answers the bigger question
     anyway, because it walks every ROW of every table as well as the
     table names, and lands you on the one you pick.

     What this box did that the dock does not is narrow the gallery
     IN PLACE, so you could keep browsing what was left. Fifty cards
     grouped by kind is a page you read rather than a list you filter,
     and a second search a metre above the first is the clutter the
     owner has asked twice to be rid of. */
  const groups = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) {
        out.push({ key: kind, label: TABLE_KINDS[kind]?.label ?? kind, items })
      }
    }
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    if (joins.length) out.push({ key: 'join', label: 'Relationships', items: joins })
    return out
  }, [tables])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="shell-viewstage hm" role="region" aria-label="Home">
      <div className="shell-view-bar">
        {/* TRACK 1, WHICH WAS AN EMPTY SPACER. Taking a copy of the
            project out and bringing one back had no home anywhere in
            the app — `features/io` was left imported by nothing when
            the masthead went, which is half of what the reachability
            guard has been red about. The front door is where a
            document's own controls belong, and this is the only
            place in the app that is about the project rather than
            about one thing inside it. */}
        <span className="hm-bar-left">
          <ImportExportMenu align="left" />
        </span>
        <p className="shell-view-what">
          <span className="shell-view-what-name">{org?.name ?? 'Your tables'}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">{total} tables</span>
        </p>
        {/* TRACK 3 IS EMPTY AND STAYS DECLARED. Both outer tracks are
            `minmax(0, 1fr)` on `.shell-view-bar`, so they hold equal
            width whether or not anything stands in them and the title
            keeps the middle of the window — which is the whole reason
            commit 0d3b1e7 put the cap on the track rather than on the
            title. Every child here names its own column, so nothing
            auto-places into the gap this leaves. */}
      </div>

      <div className="hm-scroll">
        {groups.length === 0 ? (
          /* THE FRONT DOOR HAS TO CARRY THE EXAMPLE, because it is the
             screen a new user actually lands on.

             The invitation with this door on it lives in `EmptyState`,
             which the shell draws inside `.shell-sheet-layer` — and
             that layer is `hidden` whenever a window is focused. The
             shell opens a `home` window on first render, so a person
             who has just finished onboarding met a Home page reading
             "No tables yet." with the one door to the prepared set
             mounted-but-invisible behind it, reachable only by
             guessing at the second icon on the bar. Measured: the
             `.shell-invite` node was in the DOM with zero client
             rects.

             So Home offers it too, in the same words and off the same
             register (`realDemoSet`), and stays silent when no set
             ships — the screen never draws a button that loads
             nothing. Every class here is already declared for the
             invitation; nothing new is introduced. */
          <div className="hm-none">
            <p>Nothing on the sheet yet.</p>
            {real && (
              <span style={{ display: 'block', maxWidth: '46ch', marginTop: 'var(--sp-2)' }}>
                <button
                  type="button"
                  className="shell-invite-alt"
                  onClick={() => loadDemoSet(real)}
                >
                  <span className="shell-invite-alt-tag mono-label">Example data</span>
                  <span className="shell-invite-alt-label">
                    Load a worked example — another dealer’s price file
                  </span>
                  <span className="shell-invite-alt-note">{real.blurb}</span>
                </button>
              </span>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section className="hm-sec" key={g.key}>
              <header className="hm-sec-head">
                <h2 className="hm-sec-name">{g.label}</h2>
                <span className="hm-sec-count">{g.items.length}</span>
              </header>

              <div className="hm-grid">
                {g.items.map((e) => {
                  const rows = rowsByEntity[e.id]?.length ?? 0
                  const noun = leafNoun(e)
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className="hm-card"
                      style={{ ['--tbn-accent' as string]: accentVar(e.accent) }}
                      onClick={() => onOpenTable(e.id)}
                    >
                      {/* A JOIN SAYS WHAT IT IS, WHICH IS WHAT ITS OWN
                          SECTION ALREADY CALLS IT. A join table's `kind`
                          is whatever kind it was minted as — 'custom'
                          for every one of the 26 in the prepared set —
                          so the chip read "CUSTOM TABLE" on more than
                          half the cards on the front door, directly
                          under a heading that says "Relationships". Two
                          names for one thing on one screen, and the
                          wrong one is the jargon: §6 asks for the
                          dealer's nouns in chrome. The role is the
                          honest label, and the group is the proof. */}
                      <span className="hm-card-kind">
                        <TableKindSymbol
                          kind={kindOf(e.kind)}
                          size={ICON_SIZE.small}
                        />
                        <span>
                          {e.role === 'join'
                            ? 'Relationship'
                            : (TABLE_KINDS[kindOf(e.kind)]?.label ?? '')}
                        </span>
                      </span>
                      <span className="hm-card-name">{e.name}</span>
                      <span className="hm-card-stats">
                        <b>{rows}</b>
                        <span>{countLabel(rows, noun).replace(`${rows} `, '')}</span>
                        <i aria-hidden="true" />
                        <b>{e.fields.length}</b>
                        <span>columns</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
