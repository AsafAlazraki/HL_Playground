/* ============================================================
   Onboarding — the first thing anyone ever sees.
   Two calm screens on the navy blueprint field, under ten
   seconds end to end. Step 1 asks for a name. Step 2 asks what
   they sell. Nothing else is on screen at any point.
   CONFIGURATOR_SPEC.md §1a, §1b.

   AND A THIRD SCREEN, WHICH IS OFF THE PATH UNTIL IT IS ASKED
   FOR: open a saved copy. Naming the business is still the
   default answer and still the only thing step 1 draws big.
   But this screen is also where anybody who has just pressed
   CLEAR SHEET arrives, and the only import door in the app was
   on Home's toolbar — behind the gate they had just put
   themselves in front of. A person who cleared the sheet to
   restore a backup could not restore it. See OpenSavedCopy.tsx.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement } from 'react'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { OpenSavedCopy } from './OpenSavedCopy'
import { HelmMark, INDUSTRY_ORDER, INDUSTRY_SYMBOLS } from './symbols'
import './onboarding.css'

/* -- corner registration ticks, the drafting motif --------- */
function Ticks() {
  return (
    <>
      <span className="ob-tick ob-tick--tl" aria-hidden="true" />
      <span className="ob-tick ob-tick--tr" aria-hidden="true" />
      <span className="ob-tick ob-tick--bl" aria-hidden="true" />
      <span className="ob-tick ob-tick--br" aria-hidden="true" />
    </>
  )
}

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
      {/* ONE CARD, TWO COLUMNS — NOT ONE CARD MADE WIDER.

          At 1728 this drew 345px of card in the middle of a window
          eight times that area, because the whole first screen was a
          phone layout that had never been given a desktop opinion.
          The answer is not to stretch a 460px column to 1000px: a
          question and a field both have a measure, and past it they
          stop being easier to read. So the card SPLITS — what is being
          asked on the left, what you do about it on the right — and it
          splits on its OWN width through a container query, so the same
          card is one column inside a narrow window and two inside a
          wide one without a device breakpoint anywhere. */}
      <form
        className="ob-card ob-card--split"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onNext()
        }}
      >
        <Ticks />

        {/* THE GRID IS ONE STEP INSIDE THE CONTAINER. An element cannot
            answer a `@container` query about ITSELF — the query is
            resolved against the nearest ANCESTOR container — so the
            card holds the containment and this holds the columns. */}
        <div className="ob-card-body">
          <div className="ob-card-say">
            <div className="ob-mark">
              <HelmMark />
              <span className="ob-mark-word block-heading">HelmLogic</span>
            </div>
            <div className="ob-rule" aria-hidden="true" />

            <h1 className="ob-ask">What&rsquo;s the name of your business?</h1>
          </div>

          <div className="ob-card-do">
            {/* A REAL LABEL, NOT AN aria-label. The field carried its
              name only in the accessibility tree, so the right-hand
              column began with an unheaded line. 11px mono uppercase is
              the one sanctioned use of capitals — a group caption — and
              it is what gives the two columns a shared top edge. */}
            <label className="ob-field-label" htmlFor="ob-org-name">
              Business name
            </label>
            <input
              id="ob-org-name"
              className="ob-input"
              type="text"
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="Northside Marine"
              autoComplete="organization"
              autoFocus
              maxLength={60}
              spellCheck={false}
            />

            <button type="submit" className="ob-primary" disabled={!ready}>
              Continue
            </button>
            {/* RULE 10 — a control that cannot be pressed says why, where
              it is, rather than sitting grey and silent. */}
            {!ready && (
              <p className="ob-why" id="ob-why-name">
                Type a name and Continue lights up. It goes on every quote you send, and you
                can change it later.
              </p>
            )}

            {/* THE OTHER HONEST ANSWER, kept quiet. Naming the business is
              what almost everybody does here, so this is a text button
              under the primary rather than a second card competing with
              it — but it is on screen, because after CLEAR SHEET this is
              the only import door there is. */}
            <button type="button" className="ob-alt" onClick={onOpenFile}>
              Open a saved copy instead
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

/* -- step 2 ------------------------------------------------ */

/* ============================================================
   WHAT "COMING SOON" IS ALLOWED TO MEAN — AND WHY `other` IS NOT IT.

   `INDUSTRIES[k].available` records one thing: whether HelmLogic ships
   PREPARED DOMAIN KNOWLEDGE for that industry. `TABLE_KINDS` is drawn
   for marine — boat, motor, trailer, accessory, package, dealer — and
   there is no equivalent set for cars or for bikes yet. Stamping those
   two COMING SOON is honest.

   `other` is a different KIND of answer and one boolean cannot tell the
   two apart. Its own blurb reads "Start from a blank sheet and build
   your own tables", and that is not a capability being promised — it is
   the app as it ships today: New table is the ninth item on the dock,
   `createTable` mints a table from any kind, and the custom preset
   exists precisely for "anything the presets do not cover"
   (model.ts, `--kind-custom`). So the stamp was telling anybody reading
   this screen that a shipped path was unbuilt, which is the one thing
   an unavailable mark must never do.

   The reading lives HERE because onboarding is the only surface that
   consumes `available`, and because `src/types/model.ts` is not this
   feature's file to write.
   ============================================================ */

/** Answers that start from a blank sheet rather than from prepared
 *  domain knowledge. The app has always been able to do this. */
const STARTS_BLANK: ReadonlySet<IndustryKey> = new Set<IndustryKey>(['other'])

/** Can this answer be picked today? */
const isReady = (k: IndustryKey): boolean => INDUSTRIES[k].available || STARTS_BLANK.has(k)

function IndustryCard({
  industry,
  delay,
  onPick,
}: {
  industry: IndustryKey
  delay: number
  onPick: (k: IndustryKey) => void
}) {
  const meta = INDUSTRIES[industry]
  const Symbol = INDUSTRY_SYMBOLS[industry]
  const soon = !isReady(industry)

  return (
    <button
      type="button"
      className={`ob-kind${soon ? ' ob-kind--soon' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      disabled={soon}
      aria-disabled={soon || undefined}
      onClick={soon ? undefined : () => onPick(industry)}
    >
      <span className="ob-kind-sym">
        <Symbol />
      </span>
      <span className="ob-kind-label block-heading">{meta.label}</span>
      <span className="ob-kind-blurb">{meta.blurb}</span>
      {soon && <span className="ob-kind-stamp">Coming soon</span>}
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
  return (
    <section className="ob-screen">
      <div className="ob-col">
        {/* BACK USED TO FLOAT. The nav sat above a centred header over a
            grid on a different measure, so the one control on the rail
            had nothing to line up with. Rail, header and grid now share
            one left edge — which is what makes this read as a page and
            not as three things dropped on a field. */}
        <div className="ob-nav">
          <button type="button" className="ob-back" onClick={onBack}>
            <BackArrow />
            Back
          </button>
        </div>

        <header className="ob-head">
          <h1 className="ob-title">What does {org} sell?</h1>
          {/* THE SUB-LINE HAS TO MATCH WHAT THE CARDS NOW OFFER. It read
              "Marine is ready to use today. The rest are still on the
              drawing board" over four cards of which one was pickable;
              two of the four are pickable now and the sentence has to say
              which is which, or it re-tells the fault the stamp did. It
              also stops claiming Marine "arrives ready" — picking either
              answer lands on the same sheet; what Marine gets you is
              table presets already drawn for boats, motors and trailers. */}
          <p className="ob-sub">
            Marine is the one the table presets are drawn for. Other starts you on a blank
            sheet. The rest are still on the drawing board.
          </p>
        </header>

        <div className="ob-grid" role="group" aria-label="Choose an industry">
          {INDUSTRY_ORDER.map((key, i) => (
            <IndustryCard key={key} industry={key} delay={120 + i * 70} onPick={onPick} />
          ))}
        </div>
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
