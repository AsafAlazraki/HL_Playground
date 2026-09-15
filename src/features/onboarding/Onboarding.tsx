/* ============================================================
   Onboarding — what a business with no name meets after sign-in.

   Two questions, under ten seconds end to end. Step 1 asks for a
   name. Step 2 asks what they sell. Nothing else is on screen at
   any point. CONFIGURATOR_SPEC.md §1a, §1b.

   AND A THIRD SCREEN, OFF THE PATH UNTIL IT IS ASKED FOR: open a
   saved copy. Naming the business is still the default answer and
   still the only thing step 1 draws big. But this screen is also
   where anybody who has just pressed CLEAR SHEET arrives, and the
   only import door in the app was on Home's toolbar — behind the
   gate they had just put themselves in front of. See
   OpenSavedCopy.tsx.

   THE FRAME IS THE ENTRY'S (`features/entry`), the same one the
   sign-in is drawn in: the dealer's boat running across most of the
   window, a white column with the one question. Porsche's login and
   its registration share a frame; so do these. Where you are is on
   the photograph's foot — two steps, the current one lit — and the
   column never carries a progress bar of its own.

   WHAT THIS REPLACED, 2026-09-15. A navy-and-paper slab floating in
   an aurora, with the dealership's name set in Archivo at 44px on
   the navy half and a numbered rail beside it: the app's own shape
   three seconds before the app, and correct, but a language no
   screen after it still spoke once the standard changed.

   WHO REACHES IT. The demo account carries its organisation, so a
   person signing in with it lands on the first-run Home, not here.
   This screen is for a business that has none yet — a fresh build,
   or a sheet cleared on purpose.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { EntryFrame } from '@/features/entry/EntryFrame'
import type { EntryStep } from '@/features/entry/EntryFrame'
import { demoAccount } from '@/features/auth/session'
import { OpenSavedCopy } from './OpenSavedCopy'
import { IndustryMark, INDUSTRY_ORDER } from './symbols'
import './onboarding.css'

type Step = 'name' | 'industry' | 'file'

const STEPS: { key: Step; label: string }[] = [
  { key: 'name', label: 'Your business' },
  { key: 'industry', label: 'What you sell' },
]

function stepsFor(step: Step): EntryStep[] {
  const at = STEPS.findIndex((s) => s.key === step)
  return STEPS.map((s, i) => ({
    label: s.label,
    state: at > i ? 'done' : at === i ? 'here' : 'next',
  }))
}

function GoArrow({ size = 13 }: { size?: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      aria-hidden="true"
      focusable="false"
      className="ob-arrow"
    >
      <path
        d="M2 6.5 H11 M7 2.5 L11 6.5 L7 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BackArrow(): ReactElement {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true" focusable="false">
      <path
        d="M4.4 1 L1 4.5 L4.4 8 M1 4.5 H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -- step 1 ------------------------------------------------ */

function NameStep({
  name,
  onName,
  onNext,
  onOpenFile,
}: {
  name: string
  onName: (v: string) => void
  onNext: () => void
  onOpenFile: () => void
}): ReactElement {
  const ready = name.trim().length > 0

  return (
    <form
      className="ob-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onNext()
      }}
    >
      <span className="mono-label en-eyebrow">Step 1 of 2</span>
      <h1 className="en-head">What&rsquo;s the name of your business?</h1>
      {/* WHY IT IS BEING ASKED, and it is true where it is said:
          `freeze.ts` writes the organisation onto every quote and
          `QuoteDocument` prints it at the head of the page.

          RULE 10, AND DRAWN IN BOTH STATES. A control that cannot be
          pressed says why, where it is — but a sentence that appears
          only while Continue is dead makes the column jump on the
          first keystroke. So the paragraph is always here and only
          its first sentence comes and goes. */}
      <p className="en-say">
        {ready ? null : 'Type a name and Continue lights up. '}
        It heads every quote you hand a customer. You can change it later.
      </p>

      <label className="en-field" htmlFor="ob-org-name">
        <span className="en-label">Business name</span>
        <input
          id="ob-org-name"
          className="en-input en-input--big"
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Northside Marine"
          autoComplete="organization"
          autoFocus
          maxLength={60}
          spellCheck={false}
        />
        {/* THE ONE THING A 60-CHARACTER CAP OWES ANYBODY: the count,
            and only once it starts to matter. */}
        {name.length >= 45 ? (
          <span className="en-count" aria-hidden="true">
            {name.length}/60
          </span>
        ) : null}
      </label>

      <button type="submit" className="en-go" disabled={!ready}>
        Continue
        <GoArrow />
      </button>

      {/* THE OTHER HONEST ANSWER, kept quiet: after CLEAR SHEET this
          is the only import door there is. */}
      <button type="button" className="en-alt" onClick={onOpenFile}>
        Open a saved copy instead
      </button>
    </form>
  )
}

/* -- step 2 ------------------------------------------------ */

/* ============================================================
   WHAT "NOT DRAWN YET" IS ALLOWED TO MEAN — AND WHY `other` IS NOT IT.

   `INDUSTRIES[k].available` records one thing: whether HelmLogic ships
   PREPARED DOMAIN KNOWLEDGE for that industry. `TABLE_KINDS` is drawn
   for marine and there is no equivalent set for cars or for bikes
   yet. Saying so about those two is honest.

   `other` is a different KIND of answer: "start from a blank sheet"
   is the app as it ships today — New table is on the rail, and the
   custom preset exists precisely for anything the presets do not
   cover. So it is pickable, and an unavailable mark on it would be
   telling anybody reading this screen that a shipped path was
   unbuilt, which is the one thing such a mark must never do.
   ============================================================ */

/** Answers that start from a blank sheet rather than from prepared
 *  domain knowledge. The app has always been able to do this. */
const STARTS_BLANK: ReadonlySet<IndustryKey> = new Set<IndustryKey>(['other'])

/** Can this answer be picked today? */
const isReady = (k: IndustryKey): boolean => INDUSTRIES[k].available || STARTS_BLANK.has(k)

/** `Automotive and Motorcycles & ATVs` — plain English, no comma
 *  where a person would not put one. */
function joinNames(keys: IndustryKey[]): string {
  const names = keys.map((k) => INDUSTRIES[k].label)
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function IndustryRow({
  industry,
  onPick,
}: {
  industry: IndustryKey
  onPick: (k: IndustryKey) => void
}): ReactElement {
  const meta = INDUSTRIES[industry]
  return (
    <li className="ob-row-cell">
      <button type="button" className="ob-row" data-press="card" onClick={() => onPick(industry)}>
        <span className="ob-row-sym" aria-hidden="true">
          <IndustryMark industry={industry} size={ICON_SIZE.medium} />
        </span>
        <span className="ob-row-say">
          <span className="ob-row-name">{meta.label}</span>
          <span className="ob-row-blurb">{meta.blurb}</span>
        </span>
        <span className="ob-row-go" aria-hidden="true">
          <GoArrow size={15} />
        </span>
      </button>
    </li>
  )
}

function IndustryStep({
  org,
  onBack,
  onPick,
}: {
  org: string
  onBack: () => void
  onPick: (k: IndustryKey) => void
}): ReactElement {
  /* both lists come off one ruling, so they can never disagree */
  const live = INDUSTRY_ORDER.filter(isReady)
  const soon = INDUSTRY_ORDER.filter((k) => !isReady(k))
  const one = soon.length === 1

  return (
    <div className="ob-form">
      <span className="mono-label en-eyebrow">Step 2 of 2</span>
      <h1 className="en-head">What does {org} sell?</h1>
      {/* the difference between the two live answers, as a clause —
          not a refusal, so not a stamp */}
      <p className="en-say">Marine has the table presets drawn. Other starts blank.</p>

      <ul className="ob-rows" aria-label="Choose an industry">
        {live.map((key) => (
          <IndustryRow key={key} industry={key} onPick={onPick} />
        ))}
      </ul>

      {/* WHAT CANNOT BE PICKED, AND WHY, IN THE PLACE IT IS REFUSED —
          rather than two dead rows drawn like live ones. */}
      {soon.length > 0 && (
        <p className="ob-soon">
          <span className="mono-label ob-soon-tag">Not yet</span>
          <span className="ob-soon-say">
            {joinNames(soon)} {one ? 'has' : 'have'} no table presets drawn yet, so{' '}
            {one ? 'it cannot' : 'they cannot'} be picked.
          </span>
        </p>
      )}

      <button type="button" className="en-alt" onClick={onBack}>
        <BackArrow />
        Back
      </button>
    </div>
  )
}

/* -- the flow ---------------------------------------------- */

export function Onboarding(): ReactElement {
  const setOrganisation = useProjectStore((s) => s.setOrganisation)
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const org = name.trim() || 'your business'

  let work: ReactNode
  if (step === 'name') {
    work = (
      <NameStep
        name={name}
        onName={setName}
        onNext={() => setStep('industry')}
        onOpenFile={() => setStep('file')}
      />
    )
  } else if (step === 'file') {
    /* loading a file leaves onboarding by itself: the shell's gate
       is `!org && tableCount === 0`, and a file that validated has
       tables in it */
    work = <OpenSavedCopy onBack={() => setStep('name')} />
  } else {
    work = (
      <IndustryStep
        org={org}
        onBack={() => setStep('name')}
        onPick={(industry) => setOrganisation(name.trim(), industry)}
      />
    )
  }

  /* THE PHOTOGRAPH IS THE SEED'S, and the seed is one business's file;
     the caption names that business, whoever is typing. */
  const fileOf = demoAccount().orgName

  return (
    <EntryFrame
      fileOf={fileOf}
      steps={step === 'file' ? undefined : stepsFor(step)}
      fine="Everything you put in stays in this browser."
    >
      {/* KEYED ON THE STEP, so the question ARRIVES rather than being
          swapped under the reader. */}
      <div className="ob-work" key={step}>
        {work}
      </div>
    </EntryFrame>
  )
}
