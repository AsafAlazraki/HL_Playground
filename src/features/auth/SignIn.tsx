/* ============================================================
   THE SIGN-IN SCREEN — the first thing anybody sees.

   ⚠️ It gates nothing. See `session.ts`: this app is local-first,
   the credential is in the bundle, and no security is claimed or
   provided. What it DOES is establish who is quoting, which the
   quote document needs and the dashboard is built around.

   THE SHAPE. Two panels. The left is the product saying what it
   is for — "sell complicated things simply" — because this is a
   sales tool and its first screen should say so rather than
   showing a logo and two fields. The right is the form, and the
   form is four elements: email, password, one primary, one
   refusal line.

   A REFUSAL IS A SENTENCE WITH A REASON, IN THE PLACE IT FAILED
   (rule 10). "Invalid credentials" is not a reason. `signIn`
   returns which of the four things went wrong and this draws it
   under the field it belongs to.

   IT OFFERS THE DEMO ACCOUNT rather than making somebody guess.
   A build that ships one seeded operator and then hides its email
   is a locked door with the key taped to the inside.
   ============================================================ */

import { useState } from 'react'
import type { FormEvent, JSX } from 'react'
import { demoAccount, signIn, type AppUser, type SignInProblem } from './session'

export interface SignInProps {
  onSignedIn: (user: AppUser) => void
}

export function SignIn({ onSignedIn }: SignInProps): JSX.Element {
  const demo = demoAccount()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<SignInProblem | null>(null)

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const out = signIn(email, password)
    if (out.ok) {
      setProblem(null)
      onSignedIn(out.user)
      return
    }
    setProblem(out.problem)
  }

  const emailWrong = problem?.kind === 'no-email' || problem?.kind === 'unknown-email'
  const passWrong = problem?.kind === 'no-password' || problem?.kind === 'wrong-password'

  return (
    <div className="si">
      {/* ---- what this is for -------------------------------- */}
      <aside className="si-say">
        <div className="ds-aurora si-sky" aria-hidden="true" />
        <div className="si-say-in">
          <span className="mono-label si-eyebrow">HelmLogic</span>
          <h1 className="ds-hero si-head">Sell complicated things simply.</h1>
          <p className="si-lede">
            Every boat, motor, trailer and part you sell, the rules that decide what goes
            with what, and the quote at the end of it — in one place, on one screen.
          </p>
        </div>
      </aside>

      {/* ---- the form ---------------------------------------- */}
      <main className="si-form-side">
        <form className="si-form" onSubmit={submit} noValidate>
          <h2 className="si-form-head">Sign in</h2>
          <p className="si-form-note">Northside Marine</p>

          <label className="si-field">
            <span className="si-label">Email</span>
            <input
              className={`si-input${emailWrong ? ' is-wrong' : ''}`}
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              aria-invalid={emailWrong || undefined}
              aria-describedby={emailWrong ? 'si-why' : undefined}
              onChange={(ev) => {
                setEmail(ev.target.value)
                if (emailWrong) setProblem(null)
              }}
            />
          </label>

          <label className="si-field">
            <span className="si-label">Password</span>
            <input
              className={`si-input${passWrong ? ' is-wrong' : ''}`}
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={passWrong || undefined}
              aria-describedby={passWrong ? 'si-why' : undefined}
              onChange={(ev) => {
                setPassword(ev.target.value)
                if (passWrong) setProblem(null)
              }}
            />
          </label>

          {/* THE REASON, WHERE IT FAILED. `role="alert"` so it is
              announced, and it is a sentence rather than a code. */}
          {problem ? (
            <p className="si-why" id="si-why" role="alert">
              {problem.say}
            </p>
          ) : null}

          <button type="submit" className="si-go">
            Sign in
          </button>

          {/* THE DEMO ACCOUNT, OFFERED. It is in the bundle
              already; hiding it only locks out the person it was
              made for. */}
          <button
            type="button"
            className="si-demo"
            onClick={() => {
              setEmail(demo.email)
              setPassword(demo.password)
              setProblem(null)
            }}
          >
            <span className="si-demo-say">Use the demo account</span>
            <span className="si-demo-who">{demo.email}</span>
          </button>

          <p className="si-fine">
            This build signs you in locally. Nothing is sent anywhere, and everything you
            do stays in this browser.
          </p>
        </form>
      </main>
    </div>
  )
}
