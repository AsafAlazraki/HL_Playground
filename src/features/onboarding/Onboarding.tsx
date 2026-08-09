/* ============================================================
   Onboarding — the first thing anyone ever sees.
   Two calm screens on the navy blueprint field, under ten
   seconds end to end. Step 1 asks for a name. Step 2 asks what
   they sell. Nothing else is on screen at any point.
   CONFIGURATOR_SPEC.md §1a, §1b.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement } from 'react'
import { INDUSTRIES } from '@/types/model'
import type { IndustryKey } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
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
}: {
  name: string
  onName: (v: string) => void
  onNext: () => void
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
        <Ticks />

        <div className="ob-mark">
          <HelmMark />
          <span className="ob-mark-word block-heading">HelmLogic</span>
        </div>
        <div className="ob-rule" aria-hidden="true" />

        <h1 className="ob-ask">What&rsquo;s the name of your business?</h1>

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
        </button>
      </form>
    </section>
  )
}

/* -- step 2 ------------------------------------------------ */

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
  const soon = !meta.available

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
        <div className="ob-nav">
          <button type="button" className="ob-back" onClick={onBack}>
            <BackArrow />
            Back
          </button>
        </div>

        <header className="ob-head">
          <h1 className="ob-title">What does {org} sell?</h1>
          <p className="ob-sub">
            Marine is ready to use today. The rest are still on the drawing board.
          </p>
        </header>

        <div className="ob-grid" role="group" aria-label="Choose an industry">
          {INDUSTRY_ORDER.map((key, i) => (
            <IndustryCard
              key={key}
              industry={key}
              delay={120 + i * 70}
              onPick={onPick}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* -- the flow ---------------------------------------------- */

export function Onboarding(): ReactElement {
  const setOrganisation = useProjectStore((s) => s.setOrganisation)
  const [step, setStep] = useState<'name' | 'industry'>('name')
  const [name, setName] = useState('')

  return (
    <div className="ob-root">
      {step === 'name' ? (
        <NameStep
          key="name"
          name={name}
          onName={setName}
          onNext={() => setStep('industry')}
        />
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
