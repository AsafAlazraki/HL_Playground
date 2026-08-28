/* ============================================================
   RECENT ACTIVITY — what happened here, and who did it.

   The card for a dashboard, and for a module's own dashboard
   scoped to that module. Rows are the app's own words at the time
   they were said, never re-worded afterwards: a log that improves
   its prose is not a log.

   The empty state is honest and offers nothing, because there is
   no act that "makes activity happen" — it fills as the business
   is used, and saying so is the whole message.
   ============================================================ */

import type { JSX } from 'react'
import { byDay, clockSay, useActivity, useModuleActivity, type Entry } from './activity'

export interface ActivityCardProps {
  orgSlug: string
  /** scope it to one module; omitted, it is the whole business */
  moduleId?: string
  /** how many rows. The card is a glance, not the archive. */
  limit?: number
  /** open the full log, where there is one */
  onOpenAll?: () => void
}

function Row({ e }: { e: Entry }): JSX.Element {
  return (
    <li className={`ac-row${e.tone ? ` ac-row--${e.tone}` : ''}`}>
      <span className="ac-dot" aria-hidden="true" />
      <span className="ac-said">{e.text}</span>
      {/* WHO AND WHEN SIT UNDER THE SENTENCE, and they used to be
          pushed to the far right of the row. On a 640px card that
          put "Asaf Alazraki  7 minutes ago" four hundred pixels
          from the words it belongs to, with an empty channel
          between them — a layout that reads as two columns of
          unrelated things rather than as one entry.

          THE TIME IS THE CLOCK, NOT "7 minutes ago". The list is
          cut into days above this (see `byDay`), so a relative
          time is a second unit for a fact the day heading has
          already given — and of the two, the clock is the one that
          sorts by eye down a column.

          WHO IS NOT INVENTED. An entry written before anybody
          signed in carries no name, and the row simply does not
          claim one rather than saying "System". */}
      <span className="ac-meta">
        <time className="ac-when" dateTime={new Date(e.at).toISOString()}>
          {clockSay(e.at)}
        </time>
        {e.who ? <span className="ac-who">{e.who}</span> : null}
      </span>
    </li>
  )
}

/** JUST THE ROWS, WITH NO CARD AROUND THEM.
 *
 *  The dashboard already draws a bordered box with a heading and
 *  a mark in it, and a second bordered box inside the first is the
 *  card-in-a-card every dashboard grows if nobody stops it. So the
 *  chrome and the contents are two components: the front door
 *  takes the contents, the module page takes the whole card.
 *
 *  It returns null when there is nothing, rather than drawing its
 *  own empty sentence — the caller knows which words are right for
 *  the surface it is on, and the dashboard has one house style for
 *  emptiness that this must not compete with. */
export function ActivityList({
  orgSlug,
  moduleId,
  limit = 6,
}: Omit<ActivityCardProps, 'onOpenAll'>): JSX.Element | null {
  const all = useActivity(orgSlug, moduleId ? undefined : limit)
  const mine = useModuleActivity(orgSlug, moduleId ?? '', limit)
  const rows = moduleId ? mine : all

  /* READ ONCE PER RENDER rather than per row, so every day on the
     card is measured from the same instant — a list that asked the
     clock fifteen times can straddle midnight inside one paint. */
  const days = byDay(rows, Date.now())

  if (rows.length === 0) return null
  return (
    <div className="ac-days">
      {days.map((d) => (
        <section className="ac-day" key={d.key}>
          {/* THE DAY IS SAID ONCE, at the top of its run. Fifteen
              rows each carrying their own relative time is fifteen
              conversions a person has to do to see a shape. */}
          <h4 className="mono-label ac-day-name">{d.name}</h4>
          <ul className="ac-list">
            {d.rows.map((e) => (
              <Row e={e} key={e.id} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function ActivityCard({
  orgSlug,
  moduleId,
  limit = 6,
  onOpenAll,
}: ActivityCardProps): JSX.Element {
  const all = useActivity(orgSlug, moduleId ? undefined : limit)
  const mine = useModuleActivity(orgSlug, moduleId ?? '', limit)
  const rows = moduleId ? mine : all

  return (
    <section className="ac" aria-label="Recent activity">
      <header className="ac-head">
        <h3 className="ac-name">Recent activity</h3>
        {onOpenAll && rows.length > 0 ? (
          <button type="button" className="ac-all" onClick={onOpenAll}>
            All of it
          </button>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <p className="ac-none">
          {moduleId
            ? 'Nothing has changed in here yet. Edits, prices and quotes show up as they happen.'
            : 'Nothing has changed yet. Edits, prices and quotes show up here as they happen.'}
        </p>
      ) : (
        /* THE SAME LIST THE DASHBOARD DRAWS. One implementation of
           what an entry looks like, so the module's log and the
           front door's cannot drift apart. */
        <ActivityList orgSlug={orgSlug} {...(moduleId ? { moduleId } : {})} limit={limit} />
      )}
    </section>
  )
}
