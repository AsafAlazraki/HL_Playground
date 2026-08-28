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
import { useActivity, useModuleActivity, whenSay, type Entry } from './activity'

export interface ActivityCardProps {
  orgSlug: string
  /** scope it to one module; omitted, it is the whole business */
  moduleId?: string
  /** how many rows. The card is a glance, not the archive. */
  limit?: number
  /** open the full log, where there is one */
  onOpenAll?: () => void
}

function Row({ e, now }: { e: Entry; now: number }): JSX.Element {
  return (
    <li className={`ac-row${e.tone ? ` ac-row--${e.tone}` : ''}`}>
      <span className="ac-dot" aria-hidden="true" />
      <span className="ac-said">{e.text}</span>
      <span className="ac-meta">
        {/* WHO IS NOT INVENTED. An entry written before anybody
            signed in carries no name, and the row simply does not
            claim one rather than saying "System". */}
        {e.who ? <span className="ac-who">{e.who}</span> : null}
        <time className="ac-when" dateTime={new Date(e.at).toISOString()}>
          {whenSay(e.at, now)}
        </time>
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
  const now = Date.now()

  if (rows.length === 0) return null
  return (
    <ul className="ac-list">
      {rows.map((e) => (
        <Row e={e} now={now} key={e.id} />
      ))}
    </ul>
  )
}

export function ActivityCard({
  orgSlug,
  moduleId,
  limit = 6,
  onOpenAll,
}: ActivityCardProps): JSX.Element {
  /* one hook or the other, chosen by the prop — both read the same
     store, so a module card and the business card never disagree */
  const all = useActivity(orgSlug, moduleId ? undefined : limit)
  const mine = useModuleActivity(orgSlug, moduleId ?? '', limit)
  const rows = moduleId ? mine : all

  /* read once per render rather than per row, so every relative
     time on the card is measured from the same instant */
  const now = Date.now()

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
        <ul className="ac-list">
          {rows.map((e) => (
            <Row e={e} now={now} key={e.id} />
          ))}
        </ul>
      )}
    </section>
  )
}
