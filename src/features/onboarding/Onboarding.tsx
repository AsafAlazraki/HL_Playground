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

   ============================================================
   WHAT THIS PASS CHANGED, AND WHY.

   IT IS ONE OBJECT NOW, NOT A CARD ON A FIELD. The screen was a
   468px white panel floating in the middle of an aurora: correct,
   calm, and identical to the first run of every other product a
   person has ever set up. The app it opens is a navy rail against
   a paper page — that is the shape of this product, decided in
   `app/SideNav.tsx` — and the first screen had no part of it.

   So the panel is a SLAB IN TWO HALVES, one navy and one paper,
   sharing a radius, a border and one shadow. The left half is who
   this is and how far along you are; the right half is the one
   question being asked. It is the app's own drawing, three seconds
   before the app.

   THE HERO STEP GETS ITS ONE JOB. `--t-hero` (Archivo, 34-52px)
   exists for "the first line of a stage that IS the page", and
   until now no stage used it. On step 2 the line is THE BUSINESS
   THEY JUST TYPED, set 44px in the display face — which is the
   whole argument ds.css makes for importing that face at all: "a
   dealership's own name deserves better than the default". It is
   their proper noun in their own case, never a stamp (§2), and it
   steps down to `--t-display-lg` past 22 characters so a 60-char
   name is set rather than squeezed.

   HOW LONG THIS TAKES IS NOW ON SCREEN. There was no way to know
   step 1 of what — a person typing their business name had no idea
   whether they had opened a form with two fields or twelve. Two
   numbered steps run down the navy half, the current one lit, the
   finished one ticked. That is the functional gap this pass found
   here and built.

   THE ARRIVAL IS SEQUENCED. The slab rises once in `--d-scene`;
   inside it the mark, the line, the steps and the question follow
   on a 46ms beat (`.ob-in`, index set inline). It is under a
   second end to end, it happens once in the life of a dealership,
   and `prefers-reduced-motion` takes every bit of the movement
   while keeping the light.

   THE ACCENT IS BARRED ON THE NAVY HALF and that is measured, not
   stylistic: `--accent` is 1.9:1 on `--chrome`. The crest behind
   the mark, the current step's ring and the rule down the spine
   are all white at low alpha — the same answer `shell.css` reached
   for the rail's lit row.

   TWO OF THE FOUR INDUSTRY CARDS COULD NEVER BE PRESSED. They
   were `disabled` buttons stamped COMING SOON, drawn at the same
   weight as the two that work, on the second screen anybody sees.
   The answers that exist are cards; the ones that do not are one
   sentence underneath saying why — §7's refusal, in the place the
   refusal happens, and named out of the model so it follows the
   day an industry ships.
   ============================================================ */

import { useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { OpenSavedCopy } from './OpenSavedCopy'
import { HelmMark, IndustryMark, INDUSTRY_ORDER } from './symbols'
import './onboarding.css'

/** Which of the three screens is up. `file` is off the numbered
 *  path on purpose — it is an answer to step 1, not a third step. */
type Step = 'name' | 'industry' | 'file'

/** Past this many characters a business name is set at
 *  `--t-display-lg` instead of `--t-hero`. Measured against the
 *  360px navy half: 22 characters is where a 52px line stops
 *  fitting on two lines and starts hyphen-hunting. */
const HERO_CHARS = 22

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

function TickMark() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true" focusable="false">
      <path
        d="M1 4.2 3.6 6.8 9 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -- the navy half ----------------------------------------- */

/** The two questions, in the order they are asked. `file` is not
 *  one of them, which is why this list has two entries and not
 *  three: a saved copy answers both at once. */
const STEPS: { key: Step; label: string }[] = [
  { key: 'name', label: 'Your business' },
  { key: 'industry', label: 'What you sell' },
]

/** What the big line says, per screen. On step 2 it is the dealer's
 *  own name — the one string on this screen that is theirs. */
function heroFor(step: Step, org: string): { line: string; note: string } {
  if (step === 'industry') {
    return {
      line: org,
      note: 'It heads every quote you hand over.',
    }
  }
  if (step === 'file') {
    return {
      line: 'From a file',
      note: 'Back on the sheet exactly as it was.',
    }
  }
  return {
    line: 'Two questions',
    note: 'What it is called, and what it sells.',
  }
}

function BrandPanel({ step, org }: { step: Step; org: string }): ReactElement {
  const said = heroFor(step, org)
  const at = STEPS.findIndex((s) => s.key === step)
  /* a long name is set one step down rather than squeezed — see
     HERO_CHARS. Both steps are Archivo and both are above its 26px
     floor, so the face never renders where it blurs. */
  const long = said.line.length > HERO_CHARS

  return (
    <aside className="ob-brand">
      {/* THE LIGHT ON THE NAVY, and it carries nothing: one soft
          radial in white at 7%, fixed to the top-left corner where
          the mark is. Removed entirely under reduced transparency
          and higher contrast, like every other atmosphere here. */}
      <span className="ob-brand-lamp" aria-hidden="true" />

      <div className="ob-brand-top ob-in" style={{ ['--i' as string]: 0 } as CSSProperties}>
        <span className="ob-crest" aria-hidden="true">
          <HelmMark size={22} />
        </span>
        <span className="ob-crest-word">HelmLogic</span>
      </div>

      <div className="ob-brand-say">
        <p
          key={`${step}:${long}`}
          className={`ob-brand-line ob-in${long ? ' is-long' : ''}`}
          style={{ ['--i' as string]: 1 } as CSSProperties}
        >
          {said.line}
        </p>
        <p
          key={`note:${step}`}
          className="ob-brand-note ob-in"
          style={{ ['--i' as string]: 2 } as CSSProperties}
        >
          {said.note}
        </p>
      </div>

      {/* HOW FAR ALONG YOU ARE. Two steps, because there are two
          questions; the numbers are figures and take the mono face. */}
      <ol className="ob-steps ob-in" style={{ ['--i' as string]: 3 } as CSSProperties}>
        {STEPS.map((s, i) => {
          const done = at > i
          const here = at === i
          return (
            <li
              key={s.key}
              className={`ob-step${done ? ' is-done' : ''}${here ? ' is-here' : ''}`}
              aria-current={here ? 'step' : undefined}
            >
              <span className="ob-step-mark" aria-hidden="true">
                {done ? <TickMark /> : i + 1}
              </span>
              <span className="ob-step-name">{s.label}</span>
            </li>
          )
        })}
      </ol>

      {step === 'file' ? (
        /* TRUE WHERE IT IS SAID: `keepingOrganisation` in
           features/io/apply.ts takes the organisation OFF THE FILE
           when this machine has none, which is exactly the state
           this screen is drawn in. So a saved copy really does
           answer both questions, and neither is asked afterwards. */
        <p className="ob-steps-note">A saved copy already answers both.</p>
      ) : null}

      <p className="ob-brand-foot ob-in" style={{ ['--i' as string]: 4 } as CSSProperties}>
        Everything you put in stays in this browser.
      </p>
    </aside>
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
    <form
      className="ob-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onNext()
      }}
    >
      <h1 className="ob-ask ob-in" style={{ ['--i' as string]: 2 } as CSSProperties}>
        What&rsquo;s the name of your business?
      </h1>
      {/* WHY IT IS BEING ASKED, and it is true where it is said:
          `freeze.ts` writes the organisation onto every quote and
          `QuoteDocument` prints it at the head of the page. */}
      <p className="ob-why ob-in" style={{ ['--i' as string]: 3 } as CSSProperties}>
        It heads every quote you hand a customer. You can change it later.
      </p>

      <div className="ob-field ob-in" style={{ ['--i' as string]: 4 } as CSSProperties}>
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
        {/* THE ONE THING A 60-CHARACTER CAP OWES ANYBODY: the count,
            and only once it starts to matter. A dealer whose name is
            being silently truncated at the 61st keystroke should be
            able to see it coming. */}
        {name.length >= 45 ? (
          <span className="ob-count" aria-hidden="true">
            {name.length}/60
          </span>
        ) : null}
      </div>

      <button
        type="submit"
        className="ob-primary ob-in"
        style={{ ['--i' as string]: 5 } as CSSProperties}
        disabled={!ready}
      >
        Continue
        <GoArrow />
      </button>

      {/* THE OTHER HONEST ANSWER, kept quiet. Naming the business is
          what almost everybody does here, so this is a text button
          under the primary rather than a second card competing with
          it — but it is on screen, because after CLEAR SHEET this is
          the only import door there is. */}
      <button
        type="button"
        className="ob-alt ob-in"
        style={{ ['--i' as string]: 6 } as CSSProperties}
        onClick={onOpenFile}
      >
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
   for marine — boat, motor, trailer, accessory, package, dealer — and
   there is no equivalent set for cars or for bikes yet. Saying so
   about those two is honest.

   `other` is a different KIND of answer and one boolean cannot tell the
   two apart. Its own blurb reads "Start from a blank sheet and build
   your own tables", and that is not a capability being promised — it is
   the app as it ships today: New table is on the rail, `createTable`
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
      className="ob-kind ds-sheen ob-in"
      style={{ ['--i' as string]: 4 + index } as CSSProperties}
      onClick={() => onPick(industry)}
    >
      <span className="ob-kind-go" aria-hidden="true">
        <GoArrow size={15} />
      </span>
      <span className="ob-kind-sym">
        <IndustryMark industry={industry} size={ICON_SIZE.large} />
      </span>
      <span className="ob-kind-label">{meta.label}</span>
      <span className="ob-kind-blurb">{meta.blurb}</span>
    </button>
  )
}

function IndustryStep({
  onBack,
  onPick,
}: {
  onBack: () => void
  onPick: (k: IndustryKey) => void
}) {
  /* both lists come off one ruling, so they can never disagree */
  const live = INDUSTRY_ORDER.filter(isReady)
  const soon = INDUSTRY_ORDER.filter((k) => !isReady(k))
  const one = soon.length === 1

  return (
    <div className="ob-form">
      <button
        type="button"
        className="ob-back ob-in"
        style={{ ['--i' as string]: 1 } as CSSProperties}
        onClick={onBack}
      >
        <BackArrow />
        Back
      </button>

      <h1 className="ob-ask ob-in" style={{ ['--i' as string]: 2 } as CSSProperties}>
        What do you sell?
      </h1>
      {/* THE SUB-LINE SAYS WHAT PICKING EACH ONE GETS YOU. It does
          not claim Marine "arrives ready" — both answers land on the
          same empty sheet; what Marine gets you is table presets
          already drawn for boats, motors and trailers. */}
      {/* The refusal beneath — which industries cannot be picked, and
          why — stays in full; a refusal always keeps its sentence. This
          line is not a refusal, it is the difference between the two
          live answers, so it is a clause. */}
      <p className="ob-why ob-in" style={{ ['--i' as string]: 3 } as CSSProperties}>
        Marine has the table presets drawn. Other starts blank.
      </p>

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
        <p
          className="ob-soon ob-in"
          style={{ ['--i' as string]: 4 + live.length } as CSSProperties}
        >
          <span className="mono-label ob-soon-tag">Not yet</span>
          <span className="ob-soon-say">
            {joinNames(soon)} {one ? 'has' : 'have'} no table presets drawn yet, so{' '}
            {one ? 'it cannot' : 'they cannot'} be picked.
          </span>
        </p>
      )}
    </div>
  )
}

/* -- the flow ---------------------------------------------- */

export function Onboarding(): ReactElement {
  const setOrganisation = useProjectStore((s) => s.setOrganisation)
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')

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
        onBack={() => setStep('name')}
        onPick={(industry) => setOrganisation(name.trim(), industry)}
      />
    )
  }

  return (
    <div className="ob-root">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Two drifting radial
          washes under 6% alpha and a grain tile, so the first screen
          has a ground instead of a void. Both are removed outright
          under `prefers-reduced-transparency` and `prefers-contrast:
          more`, and stop drifting under `prefers-reduced-motion` —
          see ds.css. */}
      <div className="ds-aurora ds-grain ob-sky" aria-hidden="true" />

      <div className="ob-screen">
        <div className="ob-stage">
          <BrandPanel step={step} org={name.trim() || 'Your business'} />
          {/* KEYED ON THE STEP, so the question ARRIVES rather than
              being swapped under the reader. The navy half does not
              remount — only its two lines do — so the slab itself
              never re-enters. */}
          <section className="ob-work" key={step}>
            {work}
          </section>
        </div>
      </div>
    </div>
  )
}
