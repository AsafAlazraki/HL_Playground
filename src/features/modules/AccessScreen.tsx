/* ============================================================
   ACCESS & ROLES — the whole dealership's permissions, on one page.

   THE DOOR THE RAIL ALREADY HAS. `SideNav` carries a SETTINGS section
   whose one entry is "Access & roles", and it landed on the dashboard
   because that is where access was actually granted — one module at a
   time, five panels down its set-up page. So the question the door
   asks ("who may do what here?") could only be answered nine times,
   once per place, with no screen anywhere that could answer it about
   the business.

   THIS IS THAT SCREEN, AND IT IS THREE ANSWERS IN THE ORDER THEY ARE
   ASKED:

     1 · EVERY JOB, EVERY PLACE. Roles down, places across, and the
         cell says how much of that place that job holds. It is the
         only drawing in the app from which "the Yard hand can do
         nothing anywhere" is visible without opening nine pages.
         READ-ONLY BY CONSTRUCTION: a grid of 81 cells where a
         mis-click is a permission change is not a summary, it is a
         hazard. Pressing a place PICKS it, and the editing happens
         below, where the verbs are named.

     2 · ONE PLACE, IN FULL. `AccessGrid` — the same component the
         module's own set-up page mounts, so there is one editor for
         `ModuleDef.access` and a tick means the same thing, says the
         same sentence and offers the same UNDO on both.

     3 · THE JOBS THEMSELVES. Adding one, and what each already
         reaches. A role is DATA — the dealership's own word for a job
         — and nothing on this page seeds one, suggests one, or fills
         a form in with a plausible "Salesperson" nobody asked for.

   WHAT IT SAYS THAT NO OTHER SURFACE COULD.

     · A GRANT NAMING A ROLE THAT IS NOT THERE is a fact somebody needs
       to see, and it was previously visible only if you happened to
       open the one module holding it. It is counted in the masthead,
       named per place, and repaired from the grid — including what
       clearing the last one does, which is hand the place back to
       everyone.
     · WHERE A JOB REACHES. `roleReach` counts the places a role may
       act in, and counts an UNRESTRICTED place for every role, because
       a place open to everyone is a place that job may work in. A
       screen reading `access` alone would report a brand-new
       dealership — every module open, nothing restricted — as nine
       jobs that may go nowhere.

   IT IS HONEST ABOUT THE ONE THING THAT IS NOT TRUE YET. Nobody signs
   in to this build. What is set here is recorded on the module,
   travels with it, and is what will be enforced the day people do —
   and that sentence is at the top of the page rather than in a
   footnote, because everything below it is a decision somebody is
   making about their business.

   THE ACCENT IS SPENT ONCE. The picked place's own hue marks the
   place, the ticks and the map's bars; blue stays for the focused
   control and the one primary button. A page of permissions where
   every cell is coloured has no primary and reads as an alarm.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { CaretLeft, Gear, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar, type ModuleDef, type RoleDef } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { AccessGrid } from './AccessGrid'
import {
  accessCensus,
  grantedTo,
  isUnrestricted,
  offeredCapabilities,
  orphanGrants,
  roleReach,
} from './access'
import './modules.css'

export interface AccessScreenProps {
  /** back to the list of places — the control that opened this page is
   *  the control that closes it */
  onPlaces: () => void
  /** one place's own set-up page: its mark, its verbs, its tables.
   *  Absent = the door is not drawn, which is the arrangement every
   *  other surface in this feature already uses for a route only the
   *  shell can provide. */
  onSettings?: (moduleId: string) => void
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

/** One counted figure in the masthead. A cell exists only where the
 *  figure is true of something — the same rule the dashboard's tally
 *  keeps, so the two mastheads read as one page. */
interface TallyCell {
  term: string
  figure: number
}

export function AccessScreen({ onPlaces, onSettings }: AccessScreenProps): ReactElement {
  const moduleMap = useProjectStore((s) => s.modules)
  const roleMap = useProjectStore((s) => s.roles)
  const createRole = useProjectStore((s) => s.createRole)

  const [draft, setDraft] = useState('')
  const [pickedId, setPicked] = useState<string | null>(null)

  /* THE PLACES IN THE ORDER THE DASHBOARD DRAWS THEM. Two screens
     listing the same nine modules in two orders is two screens a
     person has to learn. */
  const places = useMemo(
    () =>
      Object.values(moduleMap).sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      ),
    [moduleMap],
  )

  /* AND THE JOBS IN THE ORDER THEY WERE WRITTEN DOWN, which is the
     order `ModuleSettings` already uses. */
  const roles = useMemo(
    () =>
      Object.values(roleMap).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
      ),
    [roleMap],
  )

  const census = useMemo(() => accessCensus(places, roles), [places, roles])
  const orphans = useMemo(() => orphanGrants(places, roles), [places, roles])

  /* WHICH PLACE THE GRID IS ABOUT. Nothing is stored: it is a position
     on this page, like which card somebody is hovering. It lands on
     the first place somebody has actually closed, because that is the
     one an admin came here about; failing that, the first place. And
     it survives a module being deleted from under it by falling back
     the same way rather than drawing an empty grid. */
  const picked =
    (pickedId ? places.find((m) => m.id === pickedId) : undefined) ??
    places.find((m) => !isUnrestricted(m)) ??
    places[0]

  const addRole = (): void => {
    if (createRole(draft)) setDraft('')
  }

  const tally: TallyCell[] = [
    { term: census.roles === 1 ? 'Job' : 'Jobs', figure: census.roles },
    { term: census.modules === 1 ? 'Place' : 'Places', figure: census.modules },
  ]
  if (census.restricted > 0) {
    tally.push({ term: 'Closed', figure: census.restricted })
    tally.push({ term: 'Grants in force', figure: census.grants })
  }
  if (census.orphans > 0) tally.push({ term: 'Naming nobody', figure: census.orphans })

  return (
    <div className="md-acc">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING — the dashboard's own
          sky, so the two surfaces behind one rail door are one place.
          Under 6% alpha, removed entirely under
          `prefers-reduced-transparency`. */}
      <div className="ds-aurora ds-grain md-acc-sky" aria-hidden="true" />

      <div className="md-acc-scroll">
        <div className="md-acc-page">
          <header className="md-acc-mast">
            <div className="md-acc-say">
              <span className="mono-label md-acc-eyebrow">Settings</span>
              <h1 className="ds-hero md-acc-title">Access &amp; roles</h1>
              <p className="md-acc-note">
                A role is a job at your dealership, in your own words. It says nothing on
                its own — it becomes real in a place, where you say what it may do there.
              </p>
            </div>

            <div className="md-acc-aside">
              <dl className="md-acc-tally">
                {tally.map((cell) => (
                  <div className="md-acc-cell" key={cell.term}>
                    <dt>{cell.term}</dt>
                    <dd className="md-acc-fig">{grouped(cell.figure)}</dd>
                  </div>
                ))}
              </dl>

              <div className="md-acc-acts">
                <button type="button" className="btn md-acc-leave" onClick={onPlaces}>
                  <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  The places
                </button>
              </div>
            </div>
          </header>

          {/* WHAT IS NOT TRUE YET, AT THE TOP RATHER THAN IN A
              FOOTNOTE. Everything below this line is a decision
              somebody is making about their business, and they are
              entitled to know when it starts to bite. */}
          <p className="md-acc-real">
            Nobody signs in to this build, so nothing here is enforced today. What you set
            is recorded on the place itself, travels with it, and is what will be enforced
            the day people sign in.
          </p>

          {places.length === 0 ? (
            <div className="md-acc-void">
              <span className="mono-label md-acc-void-eyebrow">No places yet</span>
              <p className="md-acc-void-say">
                Access is granted in a place — the boats you sell, the workshop, the
                trailers. There are none yet, so there is nothing to grant. Make one from{' '}
                <em>The places</em>, and this page fills itself in.
              </p>
            </div>
          ) : (
            <>
              {orphans.length > 0 ? (
                <div className="md-acc-orphans" role="note">
                  <p className="md-acc-orphans-say">
                    <strong>
                      {census.orphans}{' '}
                      {census.orphans === 1 ? 'grant names a job' : 'grants name jobs'} this
                      project does not have.
                    </strong>{' '}
                    They are not in force, and they are not lost either — a place that
                    arrived from a file made somewhere else brings the grants and leaves
                    the jobs behind. Pick the place below to see them and clear them.
                  </p>
                  <ul className="md-acc-orphans-list">
                    {orphans.map((o) => (
                      <li key={o.module.id}>
                        <button
                          type="button"
                          className="md-linkbtn"
                          onClick={() => setPicked(o.module.id)}
                        >
                          {o.module.name} — {o.roleIds.length}{' '}
                          {o.roleIds.length === 1 ? 'grant' : 'grants'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* 1 · EVERY JOB, EVERY PLACE */}
              <section className="md-acc-panel">
                <h2 className="md-acc-panel-name mono-label">Every job, every place</h2>
                <p className="md-acc-panel-say">
                  How much of each place each job holds. A place nobody has closed is open
                  to everyone, which is where every place starts and is not a decision
                  anybody has to unmake.
                </p>

                {roles.length === 0 ? (
                  <div className="md-acc-void">
                    <span className="mono-label md-acc-void-eyebrow">No jobs yet</span>
                    <p className="md-acc-void-say">
                      Nothing is written down until you write it. Name the first job at
                      your dealership and it becomes a row here, with a column for every
                      place you have.
                    </p>
                    <p className="md-acc-void-count">
                      You have{' '}
                      <strong>
                        {places.length} {places.length === 1 ? 'place' : 'places'}
                      </strong>{' '}
                      and no jobs.
                    </p>
                    <NewRole draft={draft} onDraft={setDraft} onAdd={addRole} first />
                  </div>
                ) : (
                  <>
                    <ReachMap
                      places={places}
                      roles={roles}
                      pickedId={picked?.id ?? null}
                      onPick={setPicked}
                    />
                    <NewRole
                      draft={draft}
                      onDraft={setDraft}
                      onAdd={addRole}
                      first={false}
                    />
                  </>
                )}
              </section>

              {/* 2 · ONE PLACE, IN FULL */}
              {picked && roles.length > 0 ? (
                <section
                  className="md-acc-panel"
                  style={{ '--md-accent': accentVar(picked.accent) } as CSSProperties}
                >
                  <div className="md-acc-panel-head">
                    <div className="md-acc-panel-id">
                      <h2 className="md-acc-panel-name mono-label">In one place</h2>
                      <p className="md-acc-panel-say">
                        Tick what each job may do in <em>{picked.name}</em>. Every column
                        says what it hands over.
                      </p>
                    </div>
                    {onSettings ? (
                      <button
                        type="button"
                        className="md-acc-door"
                        title={`Set up ${picked.name} — its mark, its verbs and its tables`}
                        onClick={() => onSettings(picked.id)}
                      >
                        <Gear size={ICON_SIZE.small} weight="light" aria-hidden="true" />
                        <span>Set up {picked.name}</span>
                      </button>
                    ) : null}
                  </div>

                  {/* THE PLACE PICKER. The same nine places as the map's
                      columns, in the same order, because a person who
                      pressed a column head and then looked down here
                      must find the thing they pressed. */}
                  <ul className="md-acc-pick">
                    {places.map((m) => {
                      const on = m.id === picked.id
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            className={`md-acc-pick-one${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            style={
                              { '--md-accent': accentVar(m.accent) } as CSSProperties
                            }
                            onClick={() => setPicked(m.id)}
                          >
                            <span className="md-acc-pick-dot" aria-hidden="true" />
                            <span className="md-acc-pick-name">{m.name}</span>
                            <span className="md-acc-pick-state">
                              {isUnrestricted(m) ? 'open' : 'closed'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <p className={`md-set-state${isUnrestricted(picked) ? ' is-open' : ''}`}>
                    {isUnrestricted(picked) ? (
                      <>
                        <strong>{picked.name} is open to everyone.</strong> Nothing has
                        been restricted here. The moment you tick one box, only the jobs
                        with a tick may act in this place — everybody else may do nothing
                        here.
                      </>
                    ) : (
                      <>
                        <strong>Only the jobs ticked below may act in {picked.name}.</strong>{' '}
                        Everybody else may do nothing here. Clearing every tick opens it to
                        everyone again.
                      </>
                    )}
                  </p>

                  <AccessGrid module={picked} roles={roles} />
                </section>
              ) : null}

              {/* 3 · THE JOBS THEMSELVES */}
              {roles.length > 0 ? (
                <section className="md-acc-panel">
                  <h2 className="md-acc-panel-name mono-label">Where each job reaches</h2>
                  <p className="md-acc-panel-say">
                    Counted over the places themselves: a job may work in a place it has
                    been granted something in, and in every place nobody has closed.
                  </p>
                  <ul className="md-acc-jobs">
                    {roles.map((role) => (
                      <Job
                        key={role.id}
                        role={role}
                        places={places}
                        onPick={setPicked}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   THE MAP — roles down, places across.
   ============================================================ */

function ReachMap({
  places,
  roles,
  pickedId,
  onPick,
}: {
  places: ModuleDef[]
  roles: RoleDef[]
  pickedId: string | null
  onPick: (moduleId: string) => void
}): ReactElement {
  /* ONE READ PER PLACE, ONCE — the verbs it offers and whether anybody
     has closed it. Both are asked once per cell otherwise, which on
     nine places and nine jobs is 81 intersections of the same two
     sets. */
  const cols = useMemo(
    () =>
      places.map((m) => ({
        module: m,
        offered: offeredCapabilities(m).length,
        open: isUnrestricted(m),
      })),
    [places],
  )

  return (
    <div className="md-acc-map-wrap">
      <table className="md-acc-map">
        <thead>
          <tr>
            <th scope="col" className="md-acc-map-corner">
              <span className="mono-label">Job</span>
            </th>
            {cols.map((col) => (
              <th
                scope="col"
                key={col.module.id}
                className="md-acc-map-head"
                style={{ '--md-accent': accentVar(col.module.accent) } as CSSProperties}
              >
                {/* THE HEAD IS THE CONTROL, AND IT IS THE ONLY ONE IN
                    THIS TABLE. Pressing a place picks it for the grid
                    below; the cells are a reading and stay a reading. */}
                <button
                  type="button"
                  className={`md-acc-map-place${col.module.id === pickedId ? ' is-on' : ''}`}
                  aria-pressed={col.module.id === pickedId}
                  onClick={() => onPick(col.module.id)}
                >
                  <span className="md-acc-map-name">{col.module.name}</span>
                  {/* ON THIS SCREEN, "OPEN TO EVERYONE" IS WORTH SAYING.
                      A dashboard card must not stamp it — nine cards
                      saying so would be nine decisions nobody made —
                      but a column of dashes on the access screen has to
                      be told apart from a column of zeroes, and those
                      are opposite facts. */}
                  <span className="md-acc-map-state">
                    {col.open ? 'open to everyone' : 'closed'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <th scope="row" className="md-acc-map-role">
                <span className="md-acc-map-job">{role.name}</span>
                {role.description ? (
                  <span className="md-acc-map-who">{role.description}</span>
                ) : null}
              </th>
              {cols.map((col) => {
                const held = col.open ? 0 : grantedTo(col.module, role.id).length
                /* THREE DIFFERENT FACTS, DRAWN THREE WAYS. A place open
                   to everyone, a place this job holds nothing in, and a
                   place with no verbs to grant at all are not the same
                   answer and must not look like one. */
                const say = col.open
                  ? `${col.module.name} is open to everyone, so ${role.name} may work there.`
                  : col.offered === 0
                    ? `${col.module.name} offers nothing that can be granted.`
                    : held === 0
                      ? `${role.name} may do nothing in ${col.module.name}.`
                      : `${role.name} holds ${held} of ${col.offered} ${
                          col.offered === 1 ? 'verb' : 'verbs'
                        } in ${col.module.name}.`
                return (
                  <td
                    key={col.module.id}
                    className="md-acc-map-cell"
                    title={say}
                    style={
                      {
                        '--md-accent': accentVar(col.module.accent),
                        '--fill': col.offered === 0 ? 0 : held / col.offered,
                      } as CSSProperties
                    }
                  >
                    {col.open ? (
                      <span className="md-acc-map-all">open</span>
                    ) : col.offered === 0 || held === 0 ? (
                      <span className="md-acc-map-none" aria-hidden="true">
                        —
                      </span>
                    ) : (
                      <span className="md-acc-map-hold">
                        <span className="md-acc-map-n">{held}</span>
                        <span className="md-acc-map-of">/{col.offered}</span>
                        <span className="md-acc-map-bar" aria-hidden="true" />
                      </span>
                    )}
                    {/* THE READING, FOR SOMEBODY WHO CANNOT SEE THE BAR.
                        A cell announcing "2 / 7" and nothing else is a
                        fraction with no subject. */}
                    <span className="md-acc-map-read">{say}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ============================================================
   ONE JOB, AND WHERE IT REACHES.
   ============================================================ */

function Job({
  role,
  places,
  onPick,
}: {
  role: RoleDef
  places: ModuleDef[]
  onPick: (moduleId: string) => void
}): ReactElement {
  const reach = roleReach(places, role.id)
  /* NAMED, NOT JUST COUNTED — but only the places this job was
     deliberately let into. Listing the open ones as well would print
     nine names against every job on a dealership that has restricted
     nothing, which is a wall of text saying "no decisions have been
     made". */
  const closedToo = places.filter(
    (m) => !isUnrestricted(m) && grantedTo(m, role.id).length > 0,
  )

  return (
    <li className="md-acc-job">
      <p className="md-acc-job-top">
        <span className="md-acc-job-name">{role.name}</span>
        <span className="md-acc-job-reach mono-label">
          {reach} of {places.length} {places.length === 1 ? 'place' : 'places'}
        </span>
      </p>
      {role.description ? <p className="md-acc-job-who">{role.description}</p> : null}
      {closedToo.length > 0 ? (
        <ul className="md-acc-job-in">
          {closedToo.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="md-acc-job-place"
                style={{ '--md-accent': accentVar(m.accent) } as CSSProperties}
                onClick={() => onPick(m.id)}
              >
                <span className="md-acc-job-dot" aria-hidden="true" />
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="md-acc-job-say">
          {reach === 0
            ? 'Let into nowhere, and every place is closed — this job can do nothing at all today.'
            : 'Let into nowhere in particular. It works wherever nobody has closed the door.'}
        </p>
      )}
    </li>
  )
}

/* ============================================================
   NAMING A JOB.
   ============================================================ */

function NewRole({
  draft,
  onDraft,
  onAdd,
  first,
}: {
  draft: string
  onDraft: (next: string) => void
  onAdd: () => void
  first: boolean
}): ReactElement {
  return (
    <form
      className="md-role-new"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd()
      }}
    >
      <input
        className="field-input"
        type="text"
        value={draft}
        spellCheck={false}
        placeholder={first ? 'The first job at your dealership' : 'Another job'}
        aria-label="What this role is called"
        onChange={(e) => onDraft(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={draft.trim() === ''}>
        <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
        Add role
      </button>
    </form>
  )
}
