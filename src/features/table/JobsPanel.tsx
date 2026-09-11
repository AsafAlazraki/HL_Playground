/* ============================================================
   WHAT DO YOU WANT TO DO? — UX_PASS §12, drawn.

   `jobs.ts` decides what there is to do; this draws it and nothing
   else. The split is the same one `dealParts.tsx` and `describe.ts`
   keep: a file that decides is testable without a DOM, and a file
   that draws has no opinions to test.

   IT IS THE `Row` PRIMITIVE AND NOT A NEW LIST. A job is a name, a
   line under it and a figure at the end — which is exactly what a row
   is — so press, hover, focus and the 40px rhythm all come from
   `src/ui` and none of them is decided again here. The only thing
   this file adds is what a REFUSED job looks like, and even that is
   the shape the action bar already uses: the control stays, dimmed,
   with its reason beside it rather than a tooltip that has to be
   hunted for.

   A REFUSED JOB IS NOT A BUTTON. `Row` makes the whole line pressable
   the moment it is handed `onActivate`, so a job that cannot run is
   handed none — it draws as a still row. That is stronger than
   `disabled`: there is nothing to press, nothing takes focus, and the
   reason is on the line rather than behind a hover.

   THE COUNT IS A FIGURE AND NOT A BADGE. `ds-mono` is the app's one
   numeral face and `.jb-count` only positions it; a pill drawn around
   a number is a status, and none of these are statuses.
   ============================================================ */

import type { JSX } from 'react'
import { Row, SectionHead } from '@/ui'
import type { Job, JobId } from './jobs'
import './jobs.css'

export interface JobsPanelProps {
  /** the table's name, WHERE THE HOST HAS NOT ALREADY SPENT IT.
   *  Measured with it always on: the catalogue drew "Highfield
   *  Inflatables" three times on one screen — the stage bar, the page
   *  head and this panel — which is the "one fact, said four times"
   *  fault this same plan opens with. A host that names the table
   *  passes neither of these and puts the sentence in its own `line`
   *  slot, which is the app's one place for a sentence about a page. */
  name?: string
  /** "40 boats in 3 series. Pictures on 38 of them, and prices are
   *  set." — from `tableSay`, so the panel states no fact of its own */
  say?: string
  jobs: readonly Job[]
  /** where each job goes. A job with no handler draws as a still row,
   *  the same as a refused one — a host that cannot answer a job is
   *  not different, to a reader, from a table that cannot. */
  onPick: (id: JobId) => void
}

export function JobsPanel({ name, say, jobs, onPick }: JobsPanelProps): JSX.Element {
  return (
    <div className="jb">
      {name === undefined && say === undefined ? null : (
        <header className="jb-head">
          {name === undefined ? null : (
            <h2 className="ds-display-lg jb-name">{name}</h2>
          )}
          {say === undefined ? null : <p className="jb-say">{say}</p>}
        </header>
      )}

      {/* THE ONE UPPERCASE LABEL ON THE SCREEN, and it is a label:
          §2 rule 3 allows uppercase for exactly this and never for a
          name or a value. `SectionHead` owns that style. */}
      <SectionHead level="h3">What do you want to do?</SectionHead>

      <ul className="jb-list">
        {jobs.map((job) => (
          <li key={job.id} className="jb-item">
            {job.refusal === undefined ? (
              <Row
                name={job.name}
                meta={<span className="jb-say-line">{job.say}</span>}
                label={`${job.name} — ${job.say}`}
                {...(job.count === undefined
                  ? {}
                  : {
                      lead: undefined,
                    })}
                onActivate={() => onPick(job.id)}
              />
            ) : (
              <Row
                name={job.name}
                meta={
                  <span className="jb-say-line">
                    {/* THE REASON REPLACES THE LINE RATHER THAN JOINING
                        IT. Two sentences under a job somebody cannot
                        do is one more than they need; the reason is
                        the only one that helps. Rule 10. */}
                    {job.refusal}
                  </span>
                }
              />
            )}
            {job.count === undefined ? null : (
              <span className="jb-count ds-mono" aria-hidden="true">
                {job.count.toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
