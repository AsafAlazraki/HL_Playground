/* ============================================================
   THE GRID — roles down, this module's own verbs across.

   ONE EDITOR FOR `ModuleDef.access`, MOUNTED TWICE. It was written
   inside `ModuleSettings` and it is now here, whole, because a second
   surface needed it and the alternative was the fault that file's own
   header names: TWO OWNERS FOR ONE FIELD. The settings page mounts it
   for the module it is about; the access screen mounts it for whichever
   place is picked. Same table, same ticks, same sentences, same toast —
   so two screens cannot disagree about what a tick did.

   IT IS NOT A "SHARED COMPONENT" IN THE SENSE THIS PROJECT DISTRUSTS.
   Nothing here is generic: it takes one module and the roles at the
   dealership and draws the one grid the app has. There is no variant
   flag, no size prop and no theme — the two mounts differ in what is
   AROUND it, which is the page's job, not the grid's.

   WHAT IT ADDS TO WHAT IT REPLACED.

     · THE COLUMN SAYS WHAT IT PERMITS. A head reading `Relate` names a
       permission and explains nothing; the contract carries the
       sentence ("say what goes with what") and the designer's own
       switch already prints it, so the column prints the same one. An
       admin ticking a box now knows what they are handing over.
     · THE LAPSED AND THE ORPHANED TRAVEL WITH THE GRID rather than
       being re-stated per page. A grant that stopped applying is a
       fact about this table, and it is drawn under it wherever it is
       drawn.
     · THE ORPHAN LINE COUNTS AND OFFERS THE REPAIR. It used to say
       that some grants named roles this project does not have and stop
       there, which leaves an admin with a fact and no control. Clearing
       them is one undoable act, and — because clearing the LAST access
       row hands the module back to everyone — the sentence that offers
       it says so before it is pressed, not after.

   NOTHING HERE INVENTS A ROLE, A GRANT OR A DEFAULT. Every write goes
   through `access.ts`, which refuses a capability the module does not
   offer and turns "no rows left" back into unrestricted rather than
   into a wall nobody is on the right side of.
   ============================================================ */

import { useRef } from 'react'
import type { ReactElement } from 'react'
import { Trash, X } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { say, sayUndoable } from '@/store/notes'
import type { ModuleAccess, ModuleCapability, ModuleDef, RoleDef } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import {
  accessRows,
  capabilityLabel,
  capabilitySays,
  grantNote,
  offeredCapabilities,
  orphanGrants,
  withGrant,
  withoutOrphans,
  withoutRole,
} from './access'

export interface AccessGridProps {
  module: ModuleDef
  /** the dealership's jobs, in the order the page decided — the grid
   *  never sorts them itself, so the row order is the same on every
   *  surface that draws roles. */
  roles: readonly RoleDef[]
  /** Say that the columns are this module's own verbs and where they
   *  are switched on. True on the settings page, where that panel is
   *  directly below; false on the access screen, where it is not and a
   *  sentence pointing at it would be pointing off the page. */
  sayWhereVerbsLive?: boolean
}

/**
 * WRITE THE MODULE'S ACCESS AND OFFER THE WAY BACK.
 *
 * NOT THROUGH `sayUndoable`, AND THE REASON IS THE STORE'S. Module
 * edits are not recorded on the history stack — `updateModule` writes
 * through `mutate` without a `record()`, as every capability switch in
 * the designer already does — so there is no entry for the bus to pin
 * and Ctrl+Z would step past this change to whatever was recorded
 * before it. This act therefore holds the previous value itself, and
 * refuses if access has moved since, which is the same discipline
 * `offerUndo` applies to a pinned step.
 */
function useAccessWriter(module: ModuleDef): (
  next: ModuleAccess[] | undefined,
  text: string,
) => void {
  const updateModule = useProjectStore((s) => s.updateModule)
  return (next, text) => {
    const before = module.access
    updateModule(module.id, { access: next })
    say({
      text,
      act: {
        label: 'Undo',
        onPick: () => {
          const now = useProjectStore.getState().modules[module.id]
          if (!now) return
          if (now.access !== next) {
            say({
              text: 'Access here has changed since — nothing was put back.',
              tone: 'warn',
            })
            return
          }
          updateModule(module.id, { access: before })
        },
      },
    })
  }
}

export function AccessGrid({
  module,
  roles,
  sayWhereVerbsLive = false,
}: AccessGridProps): ReactElement {
  const modules = useProjectStore((s) => s.modules)
  const updateRole = useProjectStore((s) => s.updateRole)
  const deleteRole = useProjectStore((s) => s.deleteRole)
  const setAccess = useAccessWriter(module)

  /* the last real name each role had, so blurring an emptied field
     restores it rather than leaving a row nobody can point at */
  const named = useRef(new Map<string, string>())
  for (const r of roles) if (r.name.trim() !== '') named.current.set(r.id, r.name)

  const verbs = offeredCapabilities(module)
  const rows = accessRows(module, roles)
  const orphan = orphanGrants([module], roles)[0]

  const toggle = (role: RoleDef, cap: ModuleCapability, on: boolean): void => {
    const next = withGrant(module, role.id, cap, on)
    if (next === module.access) return
    setAccess(next, grantNote(role.name, module.name, cap, on))
  }

  const dropRow = (role: RoleDef): void => {
    setAccess(
      withoutRole(module, role.id),
      `${role.name} has no access in ${module.name} any more.`,
    )
  }

  const removeRole = (role: RoleDef): void => {
    /* THE BLAST RADIUS, COMPUTED, in the sentence that reports it —
       the act is undoable, so it is a note with UNDO and not a dialog
       asking permission first. */
    const holds = Object.values(modules).filter((m) =>
      m.access?.some((a) => a.roleId === role.id),
    ).length
    deleteRole(role.id)
    /* THROUGH THE BUS, WHICH PINS THE STEP. `deleteRole` records one
       history entry — the job and every grant it held — and
       `sayUndoable` holds THAT entry by reference, so pressing UNDO
       after doing something else refuses and says why rather than
       reverting the wrong act. */
    sayUndoable(
      holds === 0
        ? `${role.name} is gone. It held access nowhere.`
        : `${role.name} is gone, and its access in ${holds} ${
            holds === 1 ? 'module' : 'modules'
          } with it.`,
    )
  }

  const clearOrphans = (): void => {
    if (!orphan) return
    setAccess(
      withoutOrphans(module, roles),
      orphan.opensUp
        ? `Those grants are gone, and ${module.name} is open to everyone again.`
        : `${orphan.roleIds.length} ${
            orphan.roleIds.length === 1 ? 'grant is' : 'grants are'
          } gone from ${module.name}.`,
    )
  }

  return (
    <div className="md-grid-hold">
      {/* THE GRID SCROLLS SIDEWAYS RATHER THAN SQUEEZING. Nine verbs on
          a narrow window is wider than the panel, and a column of ticks
          that overlapped its neighbour would be a permission read
          wrong. */}
      <div className="md-grid-wrap">
        <table className="md-grid">
          <thead>
            <tr>
              <th scope="col" className="md-grid-corner">
                <span className="mono-label">Role</span>
              </th>
              {verbs.map((v) => (
                <th scope="col" key={v} className="md-grid-head">
                  <span className="md-grid-verb">{capabilityLabel(v)}</span>
                  {/* WHAT A TICK IN THIS COLUMN ACTUALLY HANDS OVER,
                      in the contract's own words. */}
                  <span className="md-grid-says">{capabilitySays(v)}</span>
                </th>
              ))}
              <th scope="col" className="md-grid-corner">
                <span className="mono-label">Off</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.role.id}>
                <th scope="row" className="md-grid-role">
                  <span className="md-role-id">
                    <input
                      className="field-input md-role-name"
                      type="text"
                      value={row.role.name}
                      spellCheck={false}
                      /* NAMED BY THE ROLE IT IS. Every row's field
                         would otherwise announce the same four words,
                         and this field is the row header — it is what a
                         reader hears before each tick in the row. */
                      aria-label={`Rename ${row.role.name}`}
                      onChange={(e) => updateRole(row.role.id, { name: e.target.value })}
                      /* THE LAST NAME THAT WAS ACTUALLY A NAME — the
                         same guard the module's own name field carries,
                         for the same reason: clearing the field to
                         retype it writes an empty string, and a job
                         nobody can point at is not a job. Nothing is
                         invented; the name it had a keystroke ago comes
                         back. */
                      onBlur={(e) => {
                        if (e.target.value.trim() !== '') return
                        const last = named.current.get(row.role.id)
                        if (last) updateRole(row.role.id, { name: last })
                      }}
                    />
                    {/* WHO THIS IS, IN THE OWNER'S WORDS — optional, and
                        never generated. It starts empty with an
                        instruction in it rather than a plausible
                        sentence somebody could mistake for their own. */}
                    <input
                      className="field-input md-role-desc"
                      type="text"
                      value={row.role.description ?? ''}
                      spellCheck={false}
                      placeholder="Who this is, in one line"
                      aria-label={`Who ${row.role.name} is, in one line`}
                      onChange={(e) =>
                        updateRole(row.role.id, {
                          description:
                            e.target.value.trim() === '' ? undefined : e.target.value,
                        })
                      }
                    />
                  </span>
                  <button
                    type="button"
                    className="md-icon-btn md-icon-btn--drop"
                    title={`Delete ${row.role.name} from this dealership`}
                    aria-label={`Delete the role ${row.role.name}`}
                    onClick={() => removeRole(row.role)}
                  >
                    <Trash size={ICON_SIZE.tiny} weight="bold" />
                  </button>
                </th>

                {verbs.map((v) => {
                  const on = row.granted.includes(v)
                  return (
                    <td key={v} className="md-grid-cell">
                      <button
                        type="button"
                        className={`md-grant${on ? ' is-on' : ''}`}
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${row.role.name} may ${capabilityLabel(
                          v,
                        ).toLowerCase()} in ${module.name}`}
                        onClick={() => toggle(row.role, v, !on)}
                      >
                        <span className="md-grant-tick" aria-hidden="true" />
                      </button>
                    </td>
                  )
                })}

                <td className="md-grid-cell">
                  <button
                    type="button"
                    className="md-icon-btn"
                    /* LIVE WHENEVER THE ROLE IS ON THE LIST AT ALL, not
                       just when it holds something in force. A role left
                       holding only LAPSED verbs draws no ticks, and
                       disabling this on the tick count would be the one
                       state with no control that clears it. */
                    disabled={!module.access?.some((a) => a.roleId === row.role.id)}
                    title={`Take ${row.role.name} out of ${module.name}`}
                    aria-label={`Take ${row.role.name} out of ${module.name}`}
                    onClick={() => dropRow(row.role)}
                  >
                    <X size={ICON_SIZE.tiny} weight="bold" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* THE COLUMNS ARE THIS MODULE'S OWN VERBS, AND THAT IS THE WHOLE
          POINT — not the nine the contract carries. Said, because a
          person who knows there are nine will look for the other six.
          Only where the panel that switches them is on the same page:
          a sentence pointing at a control that is not there is worse
          than no sentence. */}
      {sayWhereVerbsLive ? (
        <p className="md-set-note">
          The columns are the verbs <em>{module.name}</em> itself offers. Access can never
          be more than the module can do, so a verb switched off in{' '}
          <em>What may be done here</em> below is not a column here — and a role that held
          it stops holding it the moment it goes.
        </p>
      ) : (
        <p className="md-set-note">
          The columns are the verbs <em>{module.name}</em> itself offers. Access can never
          be more than the module can do, so a verb this place does not have is not a
          column here.
        </p>
      )}

      {rows.some((r) => r.lapsed.length > 0) ? (
        <p className="md-panel-warn" role="note">
          {rows
            .filter((r) => r.lapsed.length > 0)
            .map(
              (r) =>
                `${r.role.name} was given ${r.lapsed
                  .map((c) => capabilityLabel(c).toLowerCase())
                  .join(', ')} here, and ${module.name} no longer does that.`,
            )
            .join(' ')}{' '}
          Those grants are not in force. Switching the verb back on in{' '}
          <em>What may be done here</em> restores them.
        </p>
      ) : null}

      {/* A GRANT NAMING A ROLE THAT IS NOT THERE — the fact, and the
          repair, in one place. See the header for why the sentence has
          to name what clearing the last row does. */}
      {orphan ? (
        <div className="md-panel-warn md-orphan" role="note">
          <p className="md-orphan-say">
            {orphan.roleIds.length}{' '}
            {orphan.roleIds.length === 1 ? 'grant names a role' : 'grants name roles'} this
            project does not have, holding {orphan.capabilities}{' '}
            {orphan.capabilities === 1 ? 'capability' : 'capabilities'} between them. They
            are not in force. This happens to a module that arrived from a file made
            somewhere else, where the jobs were written down and the roles did not travel
            with it.
          </p>
          <button type="button" className="md-linkbtn" onClick={clearOrphans}>
            {orphan.opensUp
              ? `Clear them — ${module.name} goes back to open to everyone`
              : 'Clear them'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
