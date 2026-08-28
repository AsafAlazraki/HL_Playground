/* ============================================================
   THE PERSON, AT THE FOOT OF THE RAIL.

   THREE GAPS, ONE SURFACE.

   1. THERE WAS NO WAY OUT. A sign-in screen shipped with no sign
      out — the app knew who you were and gave you no way to stop
      being them. On a shared dealership machine that is not a
      missing nicety, it is the whole point of having signed in.

   2. THE DARK THEME WAS UNREACHABLE. `ds.css` carries a complete,
      measured dark palette — every ink, every kind hue, its own
      elevation — and `data-theme` was written in exactly one
      place in the repository: the /design.html reference page.
      Nobody using this app could ever see it. It is not switched
      on by default, because "blue and white" was the brief; it is
      offered, and remembered.

   3. YOU COULD NOT SEE WHO YOU WERE. The rail said the business.
      A quote is prepared BY somebody and that name reaches the
      customer's document, so the person doing it should be able
      to check it without opening a quote.

   WHY IT IS A MENU AND NOT THREE ROWS. The foot of the rail is
   the one place a person looks for "me", and the acts there are
   rare — you sign out at the end of a shift and you choose a
   theme once. Rare acts behind one press; the press itself is
   always visible.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { AppUser } from './session'

const THEME_KEY = 'hl.theme'
export type ThemeChoice = 'light' | 'dark'

/** Read once, at module load, so the first paint is already right
 *  and nothing flashes. */
export function readTheme(): ThemeChoice {
  try {
    return globalThis.localStorage?.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(t: ThemeChoice): void {
  try {
    document.documentElement.setAttribute('data-theme', t)
    globalThis.localStorage?.setItem(THEME_KEY, t)
  } catch {
    /* a browser refusing storage still gets the attribute */
  }
}

export interface WhoChipProps {
  user: AppUser
  /** narrow rail: the words go, the initials stay */
  collapsed: boolean
  onSignOut: () => void
  /** the saved configurations of this organisation */
  onOpenConfigurations: () => void
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

export function WhoChip({
  user,
  collapsed,
  onSignOut,
  onOpenConfigurations,
}: WhoChipProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)
  const root = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  /* closed by anything that means "somewhere else" */
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent): void => {
      if (root.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])

  return (
    <div className="who" ref={root}>
      <button
        type="button"
        className={`who-chip${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? `${user.name} — account` : undefined}
        title={collapsed ? user.name : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="who-mark" aria-hidden="true">
          {initialsOf(user.name)}
        </span>
        <span className="who-say">
          <span className="who-name">{user.name}</span>
          <span className="who-role">{user.title}</span>
        </span>
        <span className="who-wedge" aria-hidden="true" />
      </button>

      {open ? (
        <div className="who-menu" role="menu" aria-label="Account">
          <p className="who-menu-head">
            <span className="who-menu-name">{user.name}</span>
            {/* an address is an identifier, so it is mono (§2) */}
            <span className="who-menu-mail">{user.email}</span>
          </p>

          <div className="who-menu-band">
            <p className="mono-label who-menu-lab">Appearance</p>
            <div className="who-themes" role="group" aria-label="Appearance">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`who-theme${theme === t ? ' is-on' : ''}`}
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                >
                  {t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>

          <div className="who-menu-band">
            <button
              type="button"
              className="who-act"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onOpenConfigurations()
              }}
            >
              Saved configurations
            </button>
            <button
              type="button"
              className="who-act who-act--out"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
            >
              Sign out
            </button>
          </div>

          {/* THE FIRST SENTENCE IS THE SIGN-IN SCREEN'S PROMISE, word
              for word (`si-fine`). What this menu owes is the half
              about the button directly above it. */}
          <p className="who-fine">Signing out does not delete anything in this browser.</p>
        </div>
      ) : null}
    </div>
  )
}
