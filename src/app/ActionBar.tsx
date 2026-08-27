/* ============================================================
   THE ACTION BAR — a second, smaller bar, slightly above the dock.

   THE DIVISION, AND IT HAS TO SURVIVE FIRST CONTACT: the dock is
   where you GO, the action bar is what you DO. If a control could
   plausibly sit in either, it belongs here, because the dock is
   already load-bearing — nine items and a nested menu of fifty
   tables. Nothing is added to it by this file.

   WHY IT IS DRAWN HERE AND NOT IN THE STAGE. Chrome is charged to
   the page only when it is used. A bar inside the page costs the
   page its height on every screen; a bar floating over the window
   costs it 50px only while there is something on it, and nothing at
   all when there is not. `ActionBar` returns `null` on a page with no
   actions and the shell gives the page its 50px back — see
   `actionbar.css`, which owns that reservation in one place, beside
   the dock's own 78px.

   IT IS SMALLER THAN THE DOCK, VISIBLY AND MEASURABLY. 40px against
   the dock's 60, controls at the contract's 28px against the dock's
   44px items, 18px radius against 20px. Subordinate, and of the same
   family: it is the same material, because it is furniture floating
   over the same page, and a second material here would read as a
   second app.

   THE LAYERING IS SOLVED ONCE, BY BEING INSIDE THE THING THAT ALREADY
   SOLVED IT. A previous round found toasts painted across the dock,
   fixed it with an 84px constant, and then found the same toasts
   across the Fitment palette. `UndoKeys` answers that by MEASURING:
   anything that floats over a page and must never be covered marks
   itself `[data-note-clear]`, and the note layer floors itself above
   the highest such thing. This bar is a child of `.dk-wrap`, which
   already carries that attribute, so a note gets out of its way at
   every window width with no new arithmetic and no second attribute
   to remember. It is also inside `.dk-wrap`'s `pointer-events` rule,
   so it takes its own presses and nothing else's.

   WHAT IT REFUSES TO BE. Not a place for facts — a count is not an
   action, and DESIGN_CONTRACT's title block is where a page says what
   is in it. Not a second stylesheet: the vocabulary in
   `@/lib/actions` is closed, and every size, weight and state below
   is written once for every page that will ever use it.
   ============================================================ */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { usePageActions } from '@/lib/actions'
import type { ActionButton, ActionChip, ActionItem, ActionPanel, ActionSearch } from '@/lib/actions'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import './actionbar.css'

const MARK = ICON_SIZE.tiny

export function ActionBar(): JSX.Element | null {
  const groups = usePageActions()
  const rootRef = useRef<HTMLDivElement | null>(null)

  /* at most one panel open, and it is closed by anything that means
     "somewhere else": Escape, a press outside, or the page changing
     under it */
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  /* THE STANDING REFUSAL — rule 10. A control that cannot act says
     why, in the bar, the moment it is reached for by pointer or by
     keyboard, and on a press that could not land. It is not a
     `title`: DESIGN_CONTRACT §6 rules that out by name, and a tooltip
     never appears for a Tab. */
  const [why, setWhy] = useState<{ id: string; text: string } | null>(null)

  /* Every id currently on the bar. A panel whose control has gone —
     the page changed, or the sheet stopped having sections — must not
     leave its popover standing over the page. */
  const ids = groups.flatMap((g) => g.items.map((i) => i.id)).join('|')
  useEffect(() => {
    setOpenPanel((cur) => (cur !== null && !ids.split('|').includes(cur) ? null : cur))
    /* THE REASON GOES THE MOMENT THE BAR CHANGES SHAPE, not only when
       its control disappears. The bar is centred, so one control
       arriving slides every other control sideways — and a button that
       moves out from under a stationary pointer does not reliably fire
       `pointerleave`. Measured: type one letter into the search, the
       Clear control appears, and the note explaining why Delete rows
       cannot act is left standing over a button the pointer is no
       longer on. A refusal is transient by nature; it comes straight
       back the instant the control is reached for again. */
    setWhy(null)
  }, [ids])

  useEffect(() => {
    if (openPanel === null) return
    const onDown = (e: PointerEvent): void => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpenPanel(null)
    }
    /* ESCAPE STOPS HERE. It closes the panel and goes no further: a
       stage binds Escape to its own way out (see stageKeys.ts), and
       one press should not both shut a popover and leave the page. */
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpenPanel(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [openPanel])

  const clearWhy = useCallback((id: string) => {
    setWhy((cur) => (cur?.id === id ? null : cur))
  }, [])

  if (groups.length === 0) return null

  /* the fold window, in ActionGroup.rank's own scale — see the note
     at the call site below */
  const FOLD_FROM = 30
  const FOLD_TO = 49
  const FOLD_ID = 'ab-fold'
  const shown = groups.filter((g) => g.rank < FOLD_FROM || g.rank > FOLD_TO)
  const folded = groups.filter((g) => g.rank >= FOLD_FROM && g.rank <= FOLD_TO)

  const renderItem = (item: ActionItem): JSX.Element => {
    switch (item.kind) {
      case 'search':
        return <SearchItem key={item.id} item={item} />
      case 'chip':
        return <ChipItem key={item.id} item={item} />
      case 'panel':
        return (
          <PanelItem
            key={item.id}
            item={item}
            open={openPanel === item.id}
            onToggle={() => setOpenPanel((cur) => (cur === item.id ? null : item.id))}
          />
        )
      default:
        return (
          <ButtonItem
            key={item.id}
            item={item}
            /* THE REASON STANDS OVER THE CONTROL THAT REFUSED, not
               over the middle of the bar. Rule 10 is "says why, WHERE
               IT IS", and a sentence 360px away from the button it is
               about is a sentence about the bar. */
            why={why?.id === item.id ? why.text : null}
            onRefused={(text) => setWhy({ id: item.id, text })}
            onLeave={() => clearWhy(item.id)}
          />
        )
    }
  }

  return (
    <div className="pagebar">
      <div className="ab-shell">
      <div className="ab" role="toolbar" aria-label="What you can do here" ref={rootRef}>
        {shown.map((g, i) => (
          <Fragment key={g.id}>
            {i > 0 ? <span className="ab-sep" aria-hidden="true" /> : null}
            {/* THE ONE GROUP ALLOWED TO SCROLL. Chips carry the
                dealer's own words — a filter can read "Series: 4
                values" — so this group is the only part of the bar
                whose width is not knowable in advance. It is capped
                and scrolls inside itself, which is the contract's rule
                for a strip that does not fit; everything else on the
                bar keeps its full width so the primary never moves. */}
            <div
              className={
                'ab-grp' +
                (g.items.some((it) => it.kind === 'chip') ? ' ab-grp--chips' : '')
              }
            >
              {g.items.map(renderItem)}
            </div>
          </Fragment>
        ))}

        {/* ============================================================
            WHAT DOES NOT FIT ON A BAR, FOLDED BY RANK.

            The register published nine controls and a search field,
            and the bar it stood on measured 1188 x 99 at 1600 wide —
            74% of the window and a tenth of its height, floating over
            the rows somebody came to read.

            The fold is not a width calculation and not a per-page
            list. `ActionGroup.rank` already carries the scale, in its
            own words: 10 narrow it · 20 what is narrowing it · 30 see
            all of it · 40 the round trip · 50 go somewhere · 90 change
            it. Ranks 30 and 40 are, by that definition, the ones a
            person reaches for occasionally and looks past the rest of
            the time. They fold; the search, the chips, the doors and
            the acts stay out.

            So the rule is the SCALE's, not this component's, and a new
            page that ranks its groups honestly gets the same bar for
            free. FOLD_FROM/FOLD_TO are the whole policy.
            ============================================================ */}
        {folded.length > 0 ? (
          <>
            <span className="ab-sep" aria-hidden="true" />
            <div className="ab-grp">
              <span className="ab-hold">
                <button
                  type="button"
                  className={'ab-btn' + (openPanel === FOLD_ID ? ' is-on' : '')}
                  aria-haspopup="menu"
                  aria-expanded={openPanel === FOLD_ID}
                  onClick={() => setOpenPanel((c) => (c === FOLD_ID ? null : FOLD_ID))}
                >
                  <span>View</span>
                </button>
                {openPanel === FOLD_ID ? (
                  <div className="ab-panel ab-panel--fold" role="menu" aria-label="View">
                    {folded.map((g) => (
                      <div className="ab-fold-grp" key={g.id}>
                        {g.items.map(renderItem)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </span>
            </div>
          </>
        ) : null}
      </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* one control                                                */
/* ---------------------------------------------------------- */

function ButtonItem({
  item,
  why,
  onRefused,
  onLeave,
}: {
  item: ActionButton
  /** the reason, while it is standing for THIS control */
  why: string | null
  onRefused: (text: string) => void
  onLeave: () => void
}): JSX.Element {
  const refused = item.refusal !== undefined
  const Mark = item.icon
  const tone = item.tone ?? 'plain'

  return (
    <span className="ab-hold">
      {/* A rendered line with its own type and its own live region,
          not a `title` — DESIGN_CONTRACT §6 rules that out by name,
          and a tooltip never appears for a Tab. `pointer-events:
          none`, so a sentence can never take a press from the page it
          floats over. */}
      {why !== null ? (
        <p className="ab-why" role="status" aria-live="polite">
          {why}
        </p>
      ) : null}
      <button
        type="button"
        className={
          'ab-btn' +
          (tone === 'primary' ? ' ab-btn--primary' : '') +
          (tone === 'danger' ? ' ab-btn--danger' : '') +
          (item.pressed === true ? ' is-on' : '') +
          (refused ? ' is-inert' : '')
        }
        /* a latch says so; a plain verb must not claim a state it has
           no opinion about */
        aria-pressed={item.pressed}
        /* NOT `disabled`. See the note on `refusal` in @/lib/actions:
           a disabled control leaves the tab order and takes its own
           explanation with it. */
        aria-disabled={refused ? true : undefined}
        aria-label={
          refused
            ? `${item.say ?? item.label} — ${item.refusal ?? ''}`
            : item.say
        }
        onPointerEnter={() => {
          if (refused) onRefused(item.refusal ?? '')
        }}
        onPointerLeave={onLeave}
        onFocus={() => {
          if (refused) onRefused(item.refusal ?? '')
        }}
        onBlur={onLeave}
        onClick={() => {
          /* the press that cannot land does nothing and says why — the
             same shape `BandStrip` uses for a chip that is already in
             view */
          if (refused) {
            onRefused(item.refusal ?? '')
            return
          }
          item.onPick()
        }}
      >
        {Mark ? <Mark size={MARK} weight={weightFor(MARK)} aria-hidden="true" /> : null}
        <span className="ab-btn-label">{item.label}</span>
      </button>
    </span>
  )
}

function SearchItem({ item }: { item: ActionSearch }): JSX.Element {
  return (
    <label className="ab-find">
      <span className="ab-find-mark" aria-hidden="true">
        <MagnifyingGlass size={MARK} weight={weightFor(MARK)} />
      </span>
      <input
        className="ab-find-input"
        type="text"
        value={item.value}
        spellCheck={false}
        placeholder={item.placeholder}
        aria-label={item.label}
        onChange={(e) => item.onChange(e.target.value)}
        onKeyDown={(e) => {
          /* Escape empties the field, and only then. With the field
             already empty it belongs to the stage, which uses it to
             leave — stealing it here would strand somebody on a page
             because their cursor happened to be in a search box. */
          if (e.key === 'Escape' && item.value !== '') {
            e.stopPropagation()
            item.onChange('')
          }
        }}
      />
      {item.value !== '' ? (
        <button
          type="button"
          className="ab-find-x"
          aria-label="Clear the search"
          onClick={() => item.onChange('')}
        >
          <X size={11} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  )
}

function ChipItem({ item }: { item: ActionChip }): JSX.Element {
  return (
    <button
      type="button"
      className="ab-chip"
      aria-label={item.hint}
      onClick={item.onRemove}
    >
      <span className="ab-chip-key">{item.key}</span>
      <span className="ab-chip-val">{item.value}</span>
      <X size={11} weight="bold" aria-hidden="true" />
    </button>
  )
}

function PanelItem({
  item,
  open,
  onToggle,
}: {
  item: ActionPanel
  open: boolean
  onToggle: () => void
}): JSX.Element {
  const Mark = item.icon
  return (
    <span className="ab-hold">
      <button
        type="button"
        className={'ab-btn ab-btn--panel' + (open ? ' is-on' : '')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        {Mark ? <Mark size={MARK} weight={weightFor(MARK)} aria-hidden="true" /> : null}
        <span className="ab-btn-label">{item.label}</span>
        {item.at !== undefined ? (
          <>
            <span className="ab-btn-sep" aria-hidden="true">
              ·
            </span>
            <span className="ab-btn-at">{item.at}</span>
          </>
        ) : null}
      </button>

      {open ? (
        <div className="ab-panel" role="dialog" aria-label={item.panelLabel}>
          <div className="ab-panel-head">
            <span className="ab-panel-name">{item.panelLabel}</span>
            {item.panelSay !== undefined ? (
              <span className="ab-panel-say">{item.panelSay}</span>
            ) : null}
          </div>
          <div
            className="ab-panel-body"
            /* A MAP CLOSES ONCE IT HAS PUT YOU SOMEWHERE. Delegated
               rather than wired into every control inside, because the
               contents belong to whoever published them — `BandStrip`
               is shared with the blueprint's expanded card and must not
               learn that a popover exists. A press that was refused
               (`aria-disabled`) leaves the panel standing, so the chip
               that says "already in view" can say it.

               A PANEL WITH A STEP IN IT SAYS WHICH PRESSES ARE THE
               STEP. `closeOnAct` reads every button as the act, which
               is right for a map — every chip on it is a destination.
               It is wrong for a panel whose first press only ASKS the
               second question: the rule builder's "Relate two things"
               picks a pair, and then offers the columns that bind it,
               and a panel that shut on the first press would put a
               person back where they started every time. So a control
               that advances a panel rather than finishing with it
               marks itself `data-ab-keep-open`, and the delegate
               leaves the panel standing. The vocabulary stays closed:
               this is one attribute the bar owns, not arbitrary JSX. */
            onClick={
              item.closeOnAct === true
                ? (e) => {
                    const hit = (e.target as HTMLElement).closest('button')
                    if (!hit) return
                    if (hit.getAttribute('aria-disabled') === 'true') return
                    if (hit.closest('[data-ab-keep-open]') !== null) return
                    onToggle()
                  }
                : undefined
            }
          >
            {item.content}
          </div>
        </div>
      ) : null}
    </span>
  )
}
