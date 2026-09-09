/* ============================================================
   THE ACTION BAR — what you can DO on this page, floating at the
   foot of the content column.

   THE DIVISION, AND IT HAS TO SURVIVE FIRST CONTACT: the rail is
   where you GO, the action bar is what you DO. If a control could
   plausibly sit in either, it belongs here.

   WHY IT IS DRAWN HERE AND NOT IN THE STAGE. Chrome is charged to
   the page only when it is used. A bar inside the page costs the
   page its height on every screen; a bar floating over the window
   costs it only while there is something on it, and nothing at all
   when there is not. `ActionBar` returns `null` on a page with no
   actions and the shell gives the page the strip back — see
   `actionbar.css`, which owns that reservation in one place.

   EVERY CONTROL ON IT IS A PRIMITIVE. The bar used to declare its
   own button — ground, border, radius, three tones, a latch, an
   inert state, hover, press and focus — a second copy of what
   `src/ui/button.css` draws once for every screen. It writes none
   of that any more: a verb is `<Button>`, a filter chip is a
   `<Button>` that removes itself, the popover is a `<Card>`. What
   this file still owns is the row they stand in, the search field
   (the `Field` primitive draws a visible label above its input and
   a 36px toolbar has no room for one — reported, not forked), and
   the fold.

   THE REFUSAL IS THE PRIMITIVE'S TOO — rule 10, "says why, where it
   is". This bar used to keep its own `why` state, show the sentence
   above the control on hover or focus, and clear it on every
   reflow; forty lines of choreography for a sentence. `Button`'s
   `refusedBecause` draws the reason beneath the control, always,
   and keeps the control in the tab order with `aria-disabled` — so
   a keyboard user and a touch user get the reason without having
   to find a hover. The bar grows a line where a control refuses,
   which is the honest height of a bar with a refusal on it.

   WHAT IT REFUSES TO BE. Not a place for facts — a count is not an
   action. Not a second stylesheet: the vocabulary in `@/lib/actions`
   is closed.
   ============================================================ */
import { Fragment, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { usePageActions } from '@/lib/actions'
import type { ActionButton, ActionChip, ActionItem, ActionPanel, ActionSearch } from '@/lib/actions'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { Button, Card } from '@/ui'
import './actionbar.css'

const MARK = ICON_SIZE.tiny

export function ActionBar(): JSX.Element | null {
  const groups = usePageActions()
  const rootRef = useRef<HTMLDivElement | null>(null)

  /* at most one panel open, and it is closed by anything that means
     "somewhere else": Escape, a press outside, or the page changing
     under it */
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  /* Every id currently on the bar. A panel whose control has gone —
     the page changed, or the sheet stopped having sections — must not
     leave its popover standing over the page. */
  const ids = groups.flatMap((g) => g.items.map((i) => i.id)).join('|')
  useEffect(() => {
    setOpenPanel((cur) => (cur !== null && !ids.split('|').includes(cur) ? null : cur))
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

  if (groups.length === 0) return null

  /* the fold window, in ActionGroup.rank's own scale — see the note
     at the fold below */
  const FOLD_FROM = 30
  const FOLD_TO = 49
  const FOLD_ID = 'ab-fold'
  const shown = groups.filter((g) => g.rank < FOLD_FROM || g.rank > FOLD_TO)
  const folded = groups.filter((g) => g.rank >= FOLD_FROM && g.rank <= FOLD_TO)

  /* `inMenu`: inside the fold a control is a full-width row of a
     menu rather than a chip in a strip */
  const renderItem = (item: ActionItem, inMenu = false): JSX.Element => {
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
        return <ButtonItem key={item.id} item={item} block={inMenu} />
    }
  }

  return (
    /* the note layer measures this, so a toast can never cover the bar */
    <div className="pagebar" data-note-clear="">
      <div className="ab-shell">
        <div className="ab" role="toolbar" aria-label="What you can do here" ref={rootRef}>
          {shown.map((g, i) => (
            <Fragment key={g.id}>
              {i > 0 ? <span className="ab-sep" aria-hidden="true" /> : null}
              {/* THE ONE GROUP ALLOWED TO SCROLL. Chips carry the
                  dealer's own words, so this group is the only part of
                  the bar whose width is not knowable in advance. It is
                  capped and scrolls inside itself; everything else on
                  the bar keeps its full width so the primary never
                  moves. */}
              <div
                className={
                  'ab-grp' + (g.items.some((it) => it.kind === 'chip') ? ' ab-grp--chips' : '')
                }
              >
                {g.items.map((item) => renderItem(item))}
              </div>
            </Fragment>
          ))}

          {/* ============================================================
              WHAT DOES NOT FIT ON A BAR, FOLDED BY RANK.

              The fold is not a width calculation and not a per-page
              list. `ActionGroup.rank` already carries the scale, in its
              own words: 10 narrow it · 20 what is narrowing it · 30 see
              all of it · 40 the round trip · 50 go somewhere · 90 change
              it. Ranks 30 and 40 are the ones a person reaches for
              occasionally and looks past the rest of the time. They
              fold; the search, the chips, the doors and the acts stay
              out. FOLD_FROM/FOLD_TO are the whole policy.
              ============================================================ */}
          {folded.length > 0 ? (
            <>
              <span className="ab-sep" aria-hidden="true" />
              <div className="ab-grp">
                <span className="ab-hold">
                  <Button
                    tone={openPanel === FOLD_ID ? 'neutral' : 'ghost'}
                    size="sm"
                    aria-haspopup="menu"
                    aria-expanded={openPanel === FOLD_ID}
                    onClick={() => setOpenPanel((c) => (c === FOLD_ID ? null : FOLD_ID))}
                  >
                    View
                  </Button>
                  {openPanel === FOLD_ID ? (
                    <div className="ab-panel ab-panel--fold" role="menu" aria-label="View">
                      <Card tone="raised" pad="sm">
                        {folded.map((g) => (
                          <div className="ab-fold-grp" key={g.id}>
                            {g.items.map((item) => renderItem(item, true))}
                          </div>
                        ))}
                      </Card>
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

function ButtonItem({ item, block }: { item: ActionButton; block: boolean }): JSX.Element {
  const Mark = item.icon
  /* THE TONE. A page's one primary and its one destructive act keep
     their tones; a latched verb (`pressed`) takes the neutral ground
     so the latch reads, and a plain verb is a ghost on the bar. The
     primitive has no latch state of its own — that is reported. */
  const tone =
    item.tone === 'primary'
      ? 'primary'
      : item.tone === 'danger'
        ? 'danger'
        : item.pressed === true
          ? 'neutral'
          : 'ghost'
  return (
    <Button
      tone={tone}
      size="sm"
      block={block}
      /* a latch says so; a plain verb must not claim a state it has
         no opinion about */
      aria-pressed={item.pressed}
      aria-label={item.say}
      /* NOT `disabled`. The primitive keeps a refused control in the
         tab order, marks it `aria-disabled`, blocks the press and
         draws the sentence beneath it — see the note on `refusal` in
         @/lib/actions for why a disabled control would take its own
         explanation with it. */
      refusedBecause={item.refusal}
      glyph={Mark ? <Mark size={MARK} weight={weightFor(MARK)} /> : undefined}
      onClick={item.onPick}
    >
      {item.label}
    </Button>
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
        <Button
          tone="ghost"
          size="sm"
          aria-label="Clear the search"
          onClick={() => item.onChange('')}
        >
          <X size={MARK} weight="bold" aria-hidden="true" />
        </Button>
      ) : null}
    </label>
  )
}

/* A CHIP IS WHAT IS NARROWING THE PAGE, and pressing it stops that.
   The key is the column, in sentence case — rule 3 bars uppercase on
   a button, and this is one — and the value is the dealer's own
   words exactly as typed. */
function ChipItem({ item }: { item: ActionChip }): JSX.Element {
  return (
    <Button tone="neutral" size="sm" aria-label={item.hint} onClick={item.onRemove}>
      <span className="ab-chip-key">{item.key}</span>
      <span className="ab-chip-val">{item.value}</span>
      <X size={MARK} weight="bold" aria-hidden="true" />
    </Button>
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
      <Button
        tone={open ? 'neutral' : 'ghost'}
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        glyph={Mark ? <Mark size={MARK} weight={weightFor(MARK)} /> : undefined}
        onClick={onToggle}
      >
        {item.label}
        {item.at !== undefined ? (
          <>
            <span className="ab-btn-sep" aria-hidden="true">
              ·
            </span>
            {/* the live half of a map control — "Sections · Capacity".
                A name, so it is sentence case and never a stamp, and it
                is never cut mid-word (§3). */}
            <span className="ab-btn-at">{item.at}</span>
          </>
        ) : null}
      </Button>

      {open ? (
        <div className="ab-panel" role="dialog" aria-label={item.panelLabel}>
          <Card tone="raised" pad="sm">
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
                 contents belong to whoever published them. A press that
                 was refused (`aria-disabled`) leaves the panel standing,
                 so the chip that says "already in view" can say it; a
                 control that advances a panel rather than finishing with
                 it marks itself `data-ab-keep-open`. */
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
          </Card>
        </div>
      ) : null}
    </span>
  )
}
