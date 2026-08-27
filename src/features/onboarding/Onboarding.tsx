/* ============================================================
   Onboarding — the first thing anyone ever sees.

   Two screens, under ten seconds end to end. Step 1 asks for a
   name. Step 2 asks what they sell. Nothing else is on screen at
   any point. CONFIGURATOR_SPEC.md §1a, §1b.

   AND A THIRD SCREEN, WHICH IS OFF THE PATH UNTIL IT IS ASKED
   FOR: open a saved copy. Naming the business is still the
   default answer and still the only thing step 1 draws big.
   But this screen is also where anybody who has just pressed
   CLEAR SHEET arrives, and the only import door in the app was
   on Home's toolbar — behind the gate they had just put
   themselves in front of. A person who cleared the sheet to
   restore a backup could not restore it. See OpenSavedCopy.tsx.

   WHAT THIS PASS CHANGED, and why each thing went:

   THE ROOM. A navy blueprint field with a 16px/96px ruling became
   the app's own canvas ground with the house atmosphere on it
   (`.ds-aurora .ds-grain`, ds.css). A grid under an aurora is two
   textures arguing; the grid was the retired art direction's and
   it went with it.

   THE FOUR CORNER TICKS AND THE RULED HEADER. Eight elements of
   drafting-office costume drawn on every one of the three screens.
   Deleted. What identifies the product is the product's own mark,
   which is now drawn in the one accent instead of being a hairline
   the same weight as the rules around it.

   TWO OF THE FOUR INDUSTRY CARDS COULD NEVER BE PRESSED. They
   were `disabled` buttons stamped COMING SOON, drawn at the same
   weight as the two that work, on the second screen anybody sees.
   The answers that exist are cards; the ones that do not are one
   sentence underneath saying why — §7's refusal, in the place the
   refusal happens, and named out of the model so it follows the
   day an industry ships.
   ============================================================ */

import { useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { OpenSavedCopy } from './OpenSavedCopy'
import { BrandLockup, IndustryMark, INDUSTRY_ORDER } from './symbols'
import './onboarding.css'

function BackArrow() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true" focusable="false">
      <path
        d="M4.4 1 L1 4.5 L4.4 8 M1 4.5 H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GoArrow({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 6.5h9M7.4 2.9 11 6.5l-3.6 3.6"
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
}) {
  const ready = name.trim().length > 0

  return (
    <section className="ob-screen">
      <form
        className="ob-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onNext()
        }}
      >
        <BrandLockup />

        <h1 className="ob-ask">What&rsquo;s the name of your business?</h1>
        {/* WHY IT IS BEING ASKED, and it is true where it is said:
            `freeze.ts` writes the organisation onto every quote and
            `QuoteDocument` prints it at the head of the page. */}
        <p className="ob-why">
          It heads every quote you hand a customer. You can change it later.
        </p>

        <input
          className="ob-input"
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Northside Marine"
          aria-label="Business name"
          autoComplete="organization"
          autoFocus
          maxLength={60}
          spellCheck={false}
        />

        <button type="submit" className="ob-primary" disabled={!ready}>
          Continue
          <GoArrow />
        </button>

        {/* THE OTHER HONEST ANSWER, kept quiet. Naming the business is
            what almost everybody does here, so this is a text button
            under the primary rather than a second card competing with
            it — but it is on screen, because after CLEAR SHEET this is
            the only import door there is. */}
        <button type="button" className="ob-alt" onClick={onOpenFile}>
          Open a saved copy instead
        </button>
      </form>
    </section>
  )
}

/* -- step 2 ------------------------------------------------ */

/* ============================================================
   WHAT "NOT DRAWN YET" IS ALLOWED TO MEAN — AND WHY `other` IS NOT IT.

   `INDUSTRIES[k].available` records one thing: whether HelmLogic ships
   PREPARED DOMAIN KNOWLEDGE for that industry. `TABLE_KINDS` is drawn
   for marine — boat, motor, trailer, accessory, package, dealer — and
   there is no equivalent set for cars or for bikes yet. Saying so
   about those two is honest.

   `other` is a different KIND of answer and one boolean cannot tell the
   two apart. Its own blurb reads "Start from a blank sheet and build
   your own tables", and that is not a capability being promised — it is
   the app as it ships today: New table is on the dock, `createTable`
   mints a table from any kind, and the custom preset exists precisely
   for "anything the presets do not cover" (model.ts, `--kind-custom`).
   So the stamp was telling anybody reading this screen that a shipped
   path was unbuilt, which is the one thing an unavailable mark must
   never do.

   The reading lives HERE because onboarding is the only surface that
   consumes `available`, and because `src/types/model.ts` is not this
   feature's file to write.
   ============================================================ */

/** Answers that start from a blank sheet rather than from prepared
 *  domain knowledge. The app has always been able to do this. */
const STARTS_BLANK: ReadonlySet<IndustryKey> = new Set<IndustryKey>(['other'])

/** Can this answer be picked today? */
const isReady = (k: IndustryKey): boolean =>
  INDUSTRIES[k].available || STARTS_BLANK.has(k)

/** `Automotive and Motorcycles & ATVs` — plain English, no comma
 *  where a person would not put one. */
function joinNames(keys: IndustryKey[]): string {
  const names = keys.map((k) => INDUSTRIES[k].label)
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function IndustryCard({
  industry,
  index,
  onPick,
}: {
  industry: IndustryKey
  index: number
  onPick: (k: IndustryKey) => void
}) {
  const meta = INDUSTRIES[industry]

  return (
    <button
      type="button"
      className="ob-kind ds-sheen ds-rise"
      style={{ ['--i' as string]: index } as CSSProperties}
      onClick={() => onPick(industry)}
    >
      <span className="ob-kind-go" aria-hidden="true">
        <GoArrow size={15} />
      </span>
      <span className="ob-kind-sym">
        <IndustryMark industry={industry} size={ICON_SIZE.hero} />
      </span>
      <span className="ob-kind-label">{meta.label}</span>
      <span className="ob-kind-blurb">{meta.blurb}</span>
    </button>
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
}) {
  /* both lists come off one ruling, so they can never disagree */
  const live = INDUSTRY_ORDER.filter(isReady)
  const soon = INDUSTRY_ORDER.filter((k) => !isReady(k))
  const one = soon.length === 1

  return (
    <section className="ob-screen">
      <div className="ob-col">
        <button type="button" className="ob-back" onClick={onBack}>
          <BackArrow />
          Back
        </button>

        <header className="ob-head">
          {/* the name they just typed, so the second screen says where
              they are without spending the headline on it */}
          <span className="mono-label ob-eyebrow">{org}</span>
          <h1 className="ob-title">What do you sell?</h1>
          {/* THE SUB-LINE SAYS WHAT PICKING EACH ONE GETS YOU. It does
              not claim Marine "arrives ready" — both answers land on the
              same empty sheet; what Marine gets you is table presets
              already drawn for boats, motors and trailers. */}
          <p className="ob-sub">
            Marine is the one the table presets are drawn for. Other starts you on a
            blank sheet and you draw your own.
          </p>
        </header>

        <div className="ob-grid" role="group" aria-label="Choose an industry">
          {live.map((key, i) => (
            <IndustryCard key={key} industry={key} index={i} onPick={onPick} />
          ))}
        </div>

        {/* WHAT CANNOT BE PICKED, AND WHY, IN THE PLACE IT IS REFUSED —
            rather than two dead buttons drawn like live ones. The names
            and the count come off INDUSTRIES, so the day cars ship this
            sentence loses them by itself. */}
        {soon.length > 0 && (
          <p className="ob-soon">
            <span className="mono-label ob-soon-tag">Not yet</span>
            <span className="ob-soon-say">
              {joinNames(soon)} {one ? 'has' : 'have'} no table presets drawn yet, so{' '}
              {one ? 'it cannot' : 'they cannot'} be picked.
            </span>
          </p>
        )}
      </div>
    </section>
  )
}

/* -- the flow ---------------------------------------------- */

export function Onboarding(): ReactElement {
  const setOrganisation = useProjectStore((s) => s.setOrganisation)
  const [step, setStep] = useState<'name' | 'industry' | 'file'>('name')
  const [name, setName] = useState('')

  return (
    <div className="ob-root">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Two drifting radial
          washes under 6% alpha and a grain tile, so the first screen
          has a ground instead of a void. Both are removed outright
          under `prefers-reduced-transparency` and `prefers-contrast:
          more`, and stop drifting under `prefers-reduced-motion` —
          see ds.css. */}
      <div className="ds-aurora ds-grain ob-sky" aria-hidden="true" />

      {step === 'name' ? (
        <NameStep
          key="name"
          name={name}
          onName={setName}
          onNext={() => setStep('industry')}
          onOpenFile={() => setStep('file')}
        />
      ) : step === 'file' ? (
        /* loading a file leaves onboarding by itself: the shell's gate
           is `!org && tableCount === 0`, and a file that validated has
           tables in it */
        <OpenSavedCopy key="file" onBack={() => setStep('name')} />
      ) : (
        <IndustryStep
          key="industry"
          org={name.trim()}
          onBack={() => setStep('name')}
          onPick={(industry) => setOrganisation(name.trim(), industry)}
        />
      )}
    </div>
  )
}
