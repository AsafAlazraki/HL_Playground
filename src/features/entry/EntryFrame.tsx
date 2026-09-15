/* ============================================================
   THE ENTRY — the frame the first screens share.

   Sign-in, and the wizard a business with no name meets after it,
   are one family: Porsche's login and its registration are the same
   frame, and BMW's are the same frame the other way round. Driven
   live on 2026-09-15 (`out/ref/entry/`): a photograph fills most of
   the window; a white column holds the one thing being asked; the
   headline is set light and large, not bold; the fields are quiet.

   WHOSE PHOTOGRAPH. Not a stock picture and not a render: the
   dealer's own Stacer Assault Pro 529, running, from the Master
   Price File — the repository holds the copy (`seededCopy`), so
   the first screen is drawn from the same file every other screen
   is. The caption says so. Where the copy is missing the frame
   keeps its deep ground and says nothing, which is the honest
   failure; it never invents a picture.

   THE STEPS live on the photograph's foot — Porsche's configurator
   puts its progress on the picture, not in the form — and the
   column stays the one question. The crest is the column's, top
   left, where Porsche's wordmark sits.
   ============================================================ */

import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { seededCopy } from '@/lib/imageSources'
import { HelmMark } from '@/features/onboarding/symbols'
import './entry.css'

/** the one photograph the entry is drawn from; its seeded copy is
 *  the repository's own file */
const RUNNING =
  'https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/529-Assault-Lifestyle-Tiffs-7-1024x676.jpg'
const RUNNING_SAYS = 'Stacer Assault Pro 529'

export interface EntryStep {
  label: string
  state: 'done' | 'here' | 'next'
}

export interface EntryFrameProps {
  /** whose file the photograph is from — the caption names them */
  fileOf: string
  steps?: readonly EntryStep[]
  /** the one line at the column's foot */
  fine?: ReactNode
  children: ReactNode
}

function Tick(): ReactElement {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true" focusable="false">
      <path
        d="M1 4.2 L3.8 7 L9 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function EntryFrame({ fileOf, steps, fine, children }: EntryFrameProps): ReactElement {
  const photo = seededCopy(RUNNING)
  const style = photo ? ({ ['--en-photo' as string]: `url(${photo.at})` } as CSSProperties) : undefined

  return (
    <div className="en" data-register="showroom">
      <aside className="en-scene" data-photo={photo ? 'yes' : 'no'} style={style}>
        <div className="en-scene-foot">
          {steps && steps.length > 0 ? (
            <ol className="en-steps" aria-label="Where you are">
              {steps.map((s, i) => (
                <li
                  key={s.label}
                  className={`en-step is-${s.state}`}
                  aria-current={s.state === 'here' ? 'step' : undefined}
                >
                  <span className="en-step-n" aria-hidden="true">
                    {s.state === 'done' ? <Tick /> : i + 1}
                  </span>
                  <span className="en-step-say">{s.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {photo ? (
            <p className="en-caption">
              {RUNNING_SAYS}
              <span className="en-caption-from">from {fileOf}&rsquo;s Master Price File</span>
            </p>
          ) : null}
        </div>
      </aside>

      <main className="en-col">
        <div className="en-crest">
          <span className="en-crest-mark" aria-hidden="true">
            <HelmMark size={20} />
          </span>
          <span className="en-crest-word">HelmLogic</span>
        </div>
        <div className="en-col-in">{children}</div>
        {fine ? <p className="en-fine">{fine}</p> : null}
      </main>
    </div>
  )
}
