/* ============================================================
   ARRIVING AT A STAGE — where the keyboard lands, and what a screen
   reader is told.

   `stageKeys.ts` gave every stage a way OUT on the keyboard. Nothing
   ever gave one a way IN. Ten stage roots bind Escape —
   AdminStage.tsx:202, CustomerStage.tsx:87, DataStage.tsx:138,
   DesignStage.tsx:57, FlowStage.tsx:176, ModuleStage.tsx:237,
   QuoteStage.tsx:171, RulesStage.tsx:28, TableStage.tsx:118,
   ViewStage.tsx:176 — and not one of them moved the focus when it
   opened.

   WHAT THAT COST, read off the code. Every door into a stage is a
   `<button>` in the rail or on a card, so pressing one leaves the
   focus on that button — which is now UNDERNEATH a page that fills
   the window (`.shell-stage > *` is 100% x 100%, shell.css). The next
   Tab therefore walks the navigation again rather than the page that
   was just opened, and nothing is announced at all: the page never
   took the focus, so no assistive technology was ever told a page
   arrived. Ten stages, one omission. Not verified in a browser or with
   a screen reader — this is read from the source, and the fix is
   exercised in stageEntry.test.tsx instead.

   THE STAGE ROOT TAKES THE FOCUS — not its heading, and not its first
   control.

     NOT THE HEADING, because four of the ten do not have one this
     hook could reach. Admin and Data draw theirs inside `PageHead`
     (features/page/PageHead.tsx:74, an `h1` two components away);
     Rules, Design, Flow and View draw `p.shell-view-what` with no
     heading role at all; only TableStage.tsx:222 and
     QuoteStage.tsx:236 declare `role="heading"`. The root is the one
     node every stage has.

     NOT THE FIRST CONTROL, because on nine of the ten it is Back.
     Landing there announces "Back, button" — the way out, named,
     and the place unnamed — and a person who presses Enter on
     arrival, which is the commonest thing to do with a freshly
     focused button, leaves the page they just opened.

   So the root is given `role="region"`, the page's name, and
   `tabIndex={-1}`, and the focus is put on it. A focused named region
   is announced as its name and its role, which is exactly the missing
   fact: WHICH page is now in front. Tab from there reaches Back
   first, because Back is the first control inside it.

   THE NAME AND THE FOCUS COME OUT OF THE SAME CALL, and that is the
   point of returning props rather than a ref. `aria-label` written in
   the JSX and a name passed to a hook are two places to change one
   string; stageKeys.ts:84 makes the same argument about the two keys
   that stop at a stage root — "in one place, so the stages say the
   same thing and can only be changed together". A stage cannot now be
   given the focus without a name, or a name without the focus.

   `role="region"` IS THE ONE THING NOT IN THE SPREAD, and it is left
   in the JSX on purpose. It was folded in first and measured:
   `npx oxlint src/app` went from ONE
   `jsx-a11y/no-static-element-interactions` in the whole directory to
   one per stage root. That rule reads the JSX statically, so a role
   arriving through a spread is a role it cannot see, and every one of
   these roots carries `onKeyDown`. With the literal back it reports
   one again — ActionBar.tsx:417, which is not a stage.

   THAT DOES NOT MAKE THE ROOTS LINT-CLEAN and it would be false to
   say so: a non-interactive role plus a key handler trips
   `no-noninteractive-element-interactions` instead, and src/app
   carries 13 of those today — one for each of the 13 stage roots, and
   none for HomeStage, which declares the role and binds no key. Ten
   of the 13 already declared `role="region"` and were already
   tripping it; the other three (DataStage's and both of ViewStage's)
   have swapped one rule for the other rather than been cleared. A
   page that says what it is costs one warning this linter has always
   drawn here; hiding the role from the linter to silence it would
   cost the name.

   And the literal is not a drift risk the way a NAME is — it is the
   same string in every stage — so the two ends are held by different
   things: the hook enforces the name and the focus, the JSX and the
   linter enforce the role.

   WHEN IT FIRES AGAIN. On a NEW root element (a different window, or
   a stage that handed its box to another stage and took it back), and
   whenever the NAME CHANGES on the same root. The second one is the
   in-stage navigation four of these draw: Modules -> one module
   (ModuleStage.tsx:256), the quote list -> a quote
   (QuoteStage.tsx:181), Admin -> Access & roles, all customers -> one
   customer. Those are page changes with no unmount, and before this
   they were as silent as the stage opening.

   WHAT IT NEVER TAKES:

     1. A FIELD. `isField` is stageKeys.ts's own — rung 2 of the
        Escape order — so "a control the person is typing into" means
        exactly one thing in this app. A table rename on the table
        stage changes the stage's name while the person is mid-word
        in the input that is renaming it; without this guard the
        keystroke that changed the name would take the focus off the
        field.

     2. A CONTROL INSIDE A STAGE THAT HAS JUST MOUNTED. If something
        in the stage autofocuses itself on the way in, it got there
        first and it knows more than this does. Only on a fresh root:
        once a stage is up and its name changes underneath the focus,
        the page has become a different page and saying so is the
        whole job.

   NO MOTION IS ADDED, so `prefers-reduced-motion` has nothing to say
   here. `preventScroll` is passed because these roots are the scroll
   container's ancestor and a focus that scrolls the page a person has
   not read yet is a change they did not ask for.

   THE FOCUS RING IS THE ONE THE APP ALREADY DRAWS. base.css:302 is a
   bare `:focus-visible` rule, and `:focus-visible` does not match an
   element focused programmatically from a MOUSE press — it does match
   when the focus was moved from an element that was itself
   focus-visible. So a keyboard user who pressed Enter on a door sees
   the ring on the page they opened, and a mouse user sees nothing.
   That is the behaviour wanted, for free, with no stylesheet touched.
   Not verified in a browser.
   ============================================================ */

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { isField } from './stageKeys'

/** What a stage root spreads. One decision in three parts — the page
 *  has a name, the named thing can be focused, and this hook focuses
 *  it — so they travel together and cannot be half-applied. The
 *  landmark ROLE that makes the name announceable is written in the
 *  JSX beside this; the paragraph above says why. */
export interface StageEntry {
  ref: RefObject<HTMLDivElement | null>
  'aria-label': string
  tabIndex: -1
}

/** Where this hook last put the focus. Both halves matter: the
 *  element, so a stage that unmounted and came back is a fresh
 *  arrival; the name, so a page change inside a stage is one too. */
interface Landing {
  el: HTMLElement | null
  name: string
}

/**
 * `name` is the page, in the words the page uses about itself — the
 * same string that becomes its `aria-label`. It is allowed to change:
 * that is how in-stage navigation announces itself.
 */
export function useStageEntry(name: string): StageEntry {
  const ref = useRef<HTMLDivElement | null>(null)
  const landed = useRef<Landing>({ el: null, name: '' })

  /* NO DEPENDENCY ARRAY, DELIBERATELY. The two things that decide
     whether to move the focus are the root ELEMENT and the name, and
     the element is only knowable after the commit that attached it —
     `[name]` would miss a remount that kept the name, which is
     exactly the module-list -> item -> module-list round trip
     (ModuleStage.tsx:265 hands its whole box to a ViewStage and takes
     it back). The body below is a reference compare and a string
     compare on all but the render that actually moves the focus. */
  useEffect(() => {
    const root = ref.current
    if (!root) {
      /* the stage is drawing nothing of its own this render — a
         subject went away, or another stage has the box. Forget where
         we landed, so coming back counts as arriving. */
      landed.current = { el: null, name: '' }
      return
    }
    const was = landed.current
    if (root === was.el && name === was.name) return

    const fresh = root !== was.el
    landed.current = { el: root, name }

    const active = document.activeElement
    /* guard 1 — never out of a field */
    if (isField(active)) return
    /* guard 2 — on the way in only, never out of something that
       autofocused itself */
    if (fresh && active instanceof HTMLElement && active !== root && root.contains(active)) return

    root.focus({ preventScroll: true })
  })

  return { ref, 'aria-label': name, tabIndex: -1 }
}
