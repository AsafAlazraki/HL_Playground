/* ============================================================
   THE FAST ACTIONS — the row a person aims at without reading.

   WHAT MAKES THIS DIFFERENT FROM THE RAIL. The rail is the
   app's shape and is the same for everybody in the business.
   This row is one person's morning: the table they open every
   day, the module they live in, the one act they perform two
   hundred times. It is theirs to choose, to name in their own
   words, and to order.

   IT IS DRAWN BY THE PRIMITIVES, NOT BY THIS FEATURE. Each fast
   action at rest is a <Button>; while arranging it is a sunken
   <Card> holding a grip, a mark, a <Field> for the name and a
   remove Button. dashboard.css paints none of them — it lays the
   row out and stops. `.dsh-fast-btn`, `.dsh-fast-edit` and the
   dashed `.is-arranging` strip are gone with the rules that drew
   them.

   ONE PRIMARY, AND IT IS "NEW QUOTE" WHEN IT IS THERE. §1: one
   accent, roughly four times a screen. A row of eight accent
   buttons has no primary at all, so the primary tone goes on the
   one act a dealer performs all day and every other button is
   neutral. (This file's earlier note said the primary tone failed
   4.5:1 in dark; it was written against a white `--accent-fg`,
   and the token is `#071522` there now — measured 7.30:1 on the
   dark accent, 6.12:1 on the light one.)

   WHAT THE PRIMITIVE HAS NO SLOT FOR, AND WHAT THAT COST. A fast
   action used to carry a second line — "588 rows" under a table's
   name, drawn only when it was a counted fact. Button is one line
   by design, so that note is not drawn. Reported as the gap it
   is, rather than solved by putting a two-line layout inside the
   primitive's children.

   ARRANGING REPLACES THE BUTTON RATHER THAN DISABLING IT. A
   button that looks pressable and does nothing is the fault rule
   10 exists to prevent, and an <input> inside a <button> is not
   valid markup in any case.

   RENAMING IS COMMITTED ON BLUR, NOT PER KEYSTROKE. A rename is
   undoable, so rule 9 gives it a toast with UNDO — and a toast
   per letter typed is the reason that has to be said out loud.
   Field has no `onBlur` of its own (reported); focus events
   bubble in React, so the wrapper span listens and the Field is
   used exactly as it is.

   THE CAP IS EIGHT AND IT SAYS WHY, WHERE IT IS REFUSED
   (rule 10) — as a sentence in place of the Add control, never
   as a greyed-out control with a tooltip on it.
   ============================================================ */

import { useState } from 'react'
import type { FocusEvent, JSX, KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import {
  DotsSixVertical,
  FileText,
  Graph,
  MagnifyingGlass,
  Plus,
  Scales,
  SquaresFour,
  Storefront,
  Table,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { SPRING, transitionFor, useStillness } from '@/features/views/stillness'
import { Button, Card, Field } from '@/ui'
import type { LinkTarget, QuickLink } from './arrangement'
import { LINK_LIMIT } from './arrangement'
import type { LinkMark, ResolvedLink } from './links'
import { useReorder } from './reorder'
import type { DashboardActs } from './acts'

const MARK = ICON_SIZE.small
const MARK_WEIGHT = weightFor(MARK)

export const LINK_ICON: Record<LinkMark, Icon> = {
  quote: Plus,
  find: MagnifyingGlass,
  quotes: FileText,
  customers: UsersThree,
  rules: Scales,
  drawing: Graph,
  modules: SquaresFour,
  table: Table,
  module: Storefront,
}

export function LinkMarkGlyph({ mark }: { mark: LinkMark }): JSX.Element {
  const Glyph = LINK_ICON[mark]
  return <Glyph size={MARK} weight={MARK_WEIGHT} />
}

/** Where each target lands. Written once, here, so a button and
 *  the tray entry that made it can never disagree about what
 *  pressing it does. */
export function runLink(target: LinkTarget, acts: DashboardActs): void {
  switch (target.kind) {
    case 'new-quote':
      acts.onNewQuote()
      return
    case 'find':
      acts.onFind()
      return
    case 'quotes':
      acts.onOpenQuotes()
      return
    case 'customers':
      acts.onOpenCustomers()
      return
    case 'rules':
      acts.onOpenRules()
      return
    case 'data-model':
      acts.onOpenDataModel()
      return
    case 'modules':
      acts.onOpenModules()
      return
    case 'table':
      acts.onOpenTable(target.entityId)
      return
    case 'module':
      acts.onOpenModule(target.moduleId)
  }
}

export interface QuickLinksProps {
  links: ResolvedLink[]
  /** the ones whose subject is gone — named, never drawn as buttons */
  stranded: QuickLink[]
  arranging: boolean
  acts: DashboardActs
  onMove: (from: number, to: number) => void
  onRemove: (id: string, label: string) => void
  onRename: (id: string, name: string, was: string) => void
  onAdd: () => void
}

export function QuickLinks({
  links,
  stranded,
  arranging,
  acts,
  onMove,
  onRemove,
  onRename,
  onAdd,
}: QuickLinksProps): JSX.Element {
  const { still } = useStillness()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const reorder = useReorder({
    count: links.length,
    onMove,
    slotAttr: 'data-dsh-link',
  })

  const spring = transitionFor(still || reorder.instant, SPRING)
  const full = links.length + stranded.length >= LINK_LIMIT

  return (
    <section className="dsh-fast" aria-label="Fast actions">
      <div className="dsh-fast-row" ref={reorder.containerRef}>
        {reorder.order.map((original) => {
          const link = links[original]
          if (!link) return null
          const primary = link.target.kind === 'new-quote'
          return (
            <motion.div
              layout
              transition={spring}
              key={link.id}
              data-dsh-link=""
              className="dsh-fast-item"
            >
              {arranging ? (
                <Card tone="sunken" pad="sm">
                  <span className="dsh-fast-strip">
                    <button
                      type="button"
                      className="dsh-grip"
                      aria-label={`Move ${link.label}. Arrow keys move it.`}
                      {...reorder.handleProps(original)}
                    >
                      <DotsSixVertical size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </button>
                    <span className="dsh-fast-mark" aria-hidden="true">
                      <LinkMarkGlyph mark={link.mark} />
                    </span>
                    {/* THE FIELD IS THE PRIMITIVE, UNTOUCHED. Enter
                        leaves the field; leaving the field writes.
                        Both listeners sit on this span because focus
                        and key events bubble, and Field takes
                        neither. */}
                    <span
                      className="dsh-fast-field"
                      role="presentation"
                      onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
                        if (e.key === 'Enter' && e.target instanceof HTMLElement) e.target.blur()
                      }}
                      onBlur={(e: FocusEvent<HTMLSpanElement>) => {
                        const field = e.target
                        if (!(field instanceof HTMLInputElement)) return
                        const typed = field.value
                        setDrafts((d) => {
                          const next = { ...d }
                          delete next[link.id]
                          return next
                        })
                        if (typed.trim() !== link.label) {
                          onRename(link.id, typed, link.label)
                        }
                      }}
                    >
                      <Field
                        label={`What to call ${link.subject}`}
                        value={drafts[link.id] ?? link.label}
                        onChange={(v) => setDrafts((d) => ({ ...d, [link.id]: v }))}
                      />
                    </span>
                    <Button
                      tone="danger"
                      size="sm"
                      aria-label={`Take ${link.label} off the dashboard`}
                      onClick={() => onRemove(link.id, link.label)}
                    >
                      <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </Button>
                  </span>
                </Card>
              ) : (
                <Button
                  size="lg"
                  tone={primary ? 'primary' : 'neutral'}
                  glyph={<LinkMarkGlyph mark={link.mark} />}
                  onClick={() => runLink(link.target, acts)}
                >
                  {link.label}
                </Button>
              )}
            </motion.div>
          )
        })}

        {arranging && !full ? (
          /* the id is where the keyboard lands after a remove — see
             `dropLink` in Dashboard.tsx */
          <Button
            id="dsh-fast-add"
            tone="ghost"
            size="lg"
            glyph={<Plus size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />}
            onClick={onAdd}
          >
            Add a fast action
          </Button>
        ) : null}

        {arranging && full ? (
          <p className="dsh-fast-full ds-caption">
            Eight is as many as this row holds — past that it is a list to read
            rather than a row to aim at. Take one off to add another.
          </p>
        ) : null}

        {!arranging && links.length === 0 ? (
          <p className="dsh-fast-empty ds-small">
            No fast actions yet. Press Edit to put the places you use most up here.
          </p>
        ) : null}
      </div>

      {arranging && stranded.length > 0 ? (
        <p className="dsh-stranded ds-caption">
          {stranded.length === 1
            ? 'One fast action is not drawn: what it opened is no longer in this project.'
            : `${stranded.length} fast actions are not drawn: what they opened is no longer in this project.`}
        </p>
      ) : null}
    </section>
  )
}
