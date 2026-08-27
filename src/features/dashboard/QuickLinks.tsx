/* ============================================================
   THE FAST ACTIONS — the row a person aims at without reading.

   WHAT MAKES THIS DIFFERENT FROM THE RAIL. The rail is the
   app's shape and is the same for everybody in the business.
   This row is one person's morning: the table they open every
   day, the module they live in, the one act they perform two
   hundred times. It is theirs to choose, to name in their own
   words, and to order.

   ONE PRIMARY, AND IT IS "NEW QUOTE" WHEN IT IS THERE. §1: one
   accent, roughly four times a screen. A row of eight accent
   buttons has no primary at all, so the accent goes on the one
   act a dealer performs all day and every other button is a
   surface with ink on it.

   ARRANGING REPLACES THE BUTTON RATHER THAN DISABLING IT. A
   button that looks pressable and does nothing is the fault rule
   10 exists to prevent, and an <input> inside a <button> is not
   valid markup in any case — so while the row is being arranged
   each entry is a grip, a mark, a name FIELD and a remove, and
   there is no button on it to press by mistake.

   RENAMING IS COMMITTED ON BLUR, NOT PER KEYSTROKE. A rename is
   undoable, so rule 9 gives it a toast with UNDO — and a toast
   per letter typed is the reason that has to be said out loud.
   Typing does not write; leaving the field does.

   THE CAP IS EIGHT AND IT SAYS WHY, WHERE IT IS REFUSED
   (rule 10) — as a sentence in place of the Add control, never
   as a greyed-out control with a tooltip on it.
   ============================================================ */

import { useState } from 'react'
import type { JSX } from 'react'
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
        {reorder.order.map((original, slot) => {
          const link = links[original]
          if (!link) return null
          const primary = link.target.kind === 'new-quote'
          return (
            <motion.div
              layout
              transition={spring}
              key={link.id}
              data-dsh-link=""
              className={`dsh-fast-item${arranging ? ' is-arranging' : ''}${
                reorder.held === slot ? ' is-held' : ''
              }`}
            >
              {arranging ? (
                <>
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
                  <span className="dsh-fast-say">
                    <input
                      className="dsh-fast-edit"
                      value={drafts[link.id] ?? link.label}
                      aria-label={`What to call ${link.subject}`}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [link.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                      onBlur={(e) => {
                        const typed = e.target.value
                        setDrafts((d) => {
                          const next = { ...d }
                          delete next[link.id]
                          return next
                        })
                        if (typed.trim() !== link.label) {
                          onRename(link.id, typed, link.label)
                        }
                      }}
                    />
                    <span className="dsh-fast-note ds-caption">{link.subject}</span>
                  </span>
                  <button
                    type="button"
                    className="dsh-drop"
                    aria-label={`Take ${link.label} off the dashboard`}
                    onClick={() => onRemove(link.id, link.label)}
                  >
                    <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`dsh-fast-btn${primary ? ' is-primary' : ''}`}
                  onClick={() => runLink(link.target, acts)}
                >
                  <span className="dsh-fast-mark" aria-hidden="true">
                    <LinkMarkGlyph mark={link.mark} />
                  </span>
                  <span className="dsh-fast-say">
                    <span className="dsh-fast-name">{link.label}</span>
                    {/* ONLY WHEN IT IS A COUNTED FACT. See
                        `ResolvedLink.counted` — "588 rows" earns its
                        line, "Pick what you are selling" is the app
                        explaining a button that already says New
                        quote. */}
                    {link.counted && link.note ? (
                      <span className="dsh-fast-note ds-caption">{link.note}</span>
                    ) : null}
                  </span>
                </button>
              )}
            </motion.div>
          )
        })}

        {arranging && !full ? (
          <button type="button" className="dsh-fast-add" onClick={onAdd}>
            <Plus size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
            Add a fast action
          </button>
        ) : null}

        {arranging && full ? (
          <p className="dsh-fast-full ds-caption">
            Eight is as many as this row holds — past that it is a list to read
            rather than a row to aim at. Take one off to add another.
          </p>
        ) : null}

        {!arranging && links.length === 0 ? (
          <p className="dsh-fast-empty ds-small">
            No fast actions yet. Press Arrange to put the places you use most up here.
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
