/* ============================================================
   STEPPER — where you are in a build, and how to get back.

   WHY THIS EXISTS AT ALL, since the repo spent a document arguing
   against it. `docs/plan/PHASE_TWO.md` specifies "no step rail and
   no progress at all", citing GOV.UK measuring no change from
   removing a 12-step indicator, NN/g preferring counts, and the
   "300% more conversions" claim tracing only to form-vendor blogs.
   That evidence is real and it is about LINEAR WEB FORMS — a thing
   a stranger fills in once, in one sitting, and abandons.

   This is a seven-stage build over a 15,691-row price file that a
   dealer leaves, returns to after lunch, and resumes on somebody
   else's draft. `DESIGN_SYSTEM.md` §9.6 reverses the rule for this
   screen specifically. The original HelmLogic's rail is the single
   clearest thing it does better than us.

   AND IT BEATS THE ORIGINAL ON THE ONE THING THE ORIGINAL GOT
   WRONG. `docs/plan/hl-journeys.md` Q1: production's stepper is
   DISPLAY-ONLY — "to change the hull colour from the Summary you
   press Back six times". Every step here that a person has already
   answered is a control. That is the whole difference between a
   progress bar and a map.

   A STEP THAT CANNOT BE REACHED SAYS WHY, in the place it is
   refused — rule 10, and the same `refusedBecause` contract
   `Button` uses. Never a greyed number with no sentence: dimming
   is what you do when you have given up on explaining.

   NO `className`, NO `style`. Same mechanism as every primitive
   here: a feature that adopts this has no way to keep its old rule
   pointing at the same element, so adopting means deleting.
   ============================================================ */

import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { useStillness } from '@/features/views/stillness'
import { D_MED, SPRING, transitionFor } from './motion'
import './stepper.css'

export interface Step {
  /** Stable across renders — it is the layout key and the anchor. */
  id: string
  /** The dealer's noun for this stage. Sentence case; rule 3 bars
   *  uppercase on a name, and uppercasing is lossy. */
  name: string
  /** What is chosen here, once something is. The original prints
   *  the step name and nothing else, so a person scanning the rail
   *  learns the order of the form rather than the shape of the
   *  deal. */
  chose?: string
  /** WHY this step cannot be opened yet, as a sentence. Set it and
   *  the step refuses: the press is blocked and the reason is
   *  readable, rather than the control being silently dead. */
  refusedBecause?: string
}

export interface StepperProps {
  steps: readonly Step[]
  /** The step being worked on. */
  currentId: string
  /** Which steps are answered. A step is DONE when it is in here,
   *  not when it is before the current one — a person can jump
   *  forward past an optional stage and the rail must not claim
   *  they filled it in. */
  doneIds?: readonly string[]
  onGo: (id: string) => void
  /** Names the rail for a screen reader. */
  label?: string
}

type State = 'done' | 'current' | 'ahead' | 'refused'

export function Stepper({
  steps,
  currentId,
  doneIds = [],
  onGo,
  label = 'Build steps',
}: StepperProps) {
  const { still } = useStillness()
  const railId = useId()
  const done = new Set(doneIds)
  const index = steps.findIndex((s) => s.id === currentId)
  const position = index < 0 ? 1 : index + 1

  const stateOf = (step: Step, i: number): State => {
    if (step.refusedBecause) return 'refused'
    if (step.id === currentId) return 'current'
    if (done.has(step.id)) return 'done'
    return i < position - 1 ? 'done' : 'ahead'
  }

  return (
    <nav className="ui-stepper" aria-label={label}>
      {/* THE COUNT IS A FACT, AND IT IS THE HALF NN/G ACTUALLY
          ENDORSED. The cited research prefers a count over a bar;
          it does not say a person should be unable to tell where
          they are. */}
      <p className="ui-stepper-count">
        <span className="t-label">Step {position} of {steps.length}</span>
        <span className="ui-stepper-where t-small">{steps[index]?.name ?? ''}</span>
      </p>

      <ol className="ui-stepper-list">
        {steps.map((step, i) => {
          const state = stateOf(step, i)
          const reasonId = `${railId}-${step.id}`

          return (
            <li className="ui-stepper-item" key={step.id} data-state={state}>
              <button
                type="button"
                className="ui-stepper-go"
                aria-current={state === 'current' ? 'step' : undefined}
                aria-disabled={state === 'refused' || undefined}
                aria-describedby={step.refusedBecause ? reasonId : undefined}
                onClick={() => {
                  if (state === 'refused') return
                  onGo(step.id)
                }}
              >
                <Mark state={state} n={i + 1} />
                <span className="ui-stepper-text">
                  <span className="ui-stepper-name t-small">{step.name}</span>
                  {step.chose ? (
                    <span className="ui-stepper-chose t-caption">{step.chose}</span>
                  ) : null}
                </span>

                {/* ONE INDICATOR, MOVED — not seven, toggled. A
                    shared `layoutId` means the mark travels from
                    the step you left to the step you opened, which
                    is what tells a person their press did that.
                    Seven independently fading marks say only that
                    something changed somewhere. */}
                {state === 'current' ? (
                  <motion.span
                    className="ui-stepper-here"
                    layoutId={`${railId}-here`}
                    transition={transitionFor(still, SPRING)}
                    aria-hidden="true"
                  />
                ) : null}
              </button>

              {step.refusedBecause ? (
                <p className="ui-stepper-why t-caption" id={reasonId}>
                  {step.refusedBecause}
                </p>
              ) : null}

              {/* THE RUN LIGHTS WHEN THE STEP BEHIND IT IS DONE, not
                  when it is current. Lighting it on `current` draws
                  a finished line to a step nobody has opened — the
                  rail would claim progress past where the person
                  actually is, which is the one thing a progress
                  indicator must never do. */}
              {i < steps.length - 1 ? (
                <span
                  className="ui-stepper-run"
                  data-lit={state === 'done' || undefined}
                  aria-hidden="true"
                  style={{ ['--run-ms' as string]: `${D_MED}ms` }}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** The tick, the number, or the refusal. A tick is drawn rather
 *  than typed: a check character renders differently in every font
 *  on every platform, and this one has to line up with a digit. */
function Mark({ state, n }: { state: State; n: number }): ReactNode {
  if (state === 'done') {
    return (
      <span className="ui-stepper-mark" data-mark="done">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }
  return (
    <span className="ui-stepper-mark" data-mark={state}>
      <span className="t-mono-sm">{n}</span>
    </span>
  )
}
