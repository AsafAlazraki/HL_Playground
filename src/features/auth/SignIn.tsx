/* ============================================================
   THE SIGN-IN SCREEN — the first thing anybody sees.

   ⚠️ It gates nothing. See `session.ts`: this app is local-first,
   the credential is in the bundle, and no security is claimed or
   provided. What it DOES is establish who is quoting, which the
   quote document needs and the dashboard is built around.

   THE SHAPE IS THE ENTRY FRAME (`features/entry`): the dealer's own
   boat running, and a white column with the one thing being asked.
   Porsche's login, driven live 2026-09-15, is the reference — a
   photograph most of the way across, a light headline, quiet
   fields, a full-width primary, one other way in under an "or".

   A REFUSAL IS A SENTENCE WITH A REASON, IN THE PLACE IT FAILED
   (rule 10). "Invalid credentials" is not a reason. `signIn`
   returns which of the four things went wrong and this draws it
   under the field it belongs to.

   IT OFFERS THE DEMO ACCOUNT rather than making somebody guess.
   A build that ships one seeded operator and then hides its email
   is a locked door with the key taped to the inside.

   THE BUSINESS IS NAMED FROM THE ACCOUNT, not typed here: the
   demo user carries `orgName`, and that is the one place the
   name lives.
   ============================================================ */

import { useState } from 'react'
import type { FormEvent, JSX } from 'react'
import { EntryFrame } from '@/features/entry/EntryFrame'
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
    <EntryFrame
      fileOf={demo.orgName}
      fine="This build signs you in locally. Nothing is sent anywhere, and everything you do stays in this browser."
    >
      <form className="si" onSubmit={submit} noValidate>
        <h1 className="en-head">Sign in</h1>
        <p className="en-sub">{demo.orgName}</p>

        <label className="en-field">
          <span className="en-label">Email</span>
          <input
            className={`en-input${emailWrong ? ' is-wrong' : ''}`}
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

        <label className="en-field">
          <span className="en-label">Password</span>
          <input
            className={`en-input${passWrong ? ' is-wrong' : ''}`}
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
          <p className="en-why" id="si-why" role="alert">
            {problem.say}
          </p>
        ) : null}

        <button type="submit" className="en-go">
          Sign in
        </button>

        <span className="en-or" aria-hidden="true">
          or
        </span>

        {/* THE DEMO ACCOUNT, OFFERED. It fills the form; it does not
            submit, so what is about to happen is on screen first. */}
        <button
          type="button"
          className="en-demo"
          onClick={() => {
            setEmail(demo.email)
            setPassword(demo.password)
            setProblem(null)
          }}
        >
          <span className="en-demo-say">Use the demo account</span>
          <span className="en-demo-who">{demo.email}</span>
        </button>
      </form>
    </EntryFrame>
  )
}
