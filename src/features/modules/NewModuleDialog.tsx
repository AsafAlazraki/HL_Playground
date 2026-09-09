/* ============================================================
   NEW MODULE — one panel, three clicks, no wizard.

   Click 1 is NEW MODULE on the dashboard, which puts this panel up.
   Click 2 picks a table on the left, which fills the name and the
   description from the table itself and offers its siblings. Click
   3 is CREATE. Ticking siblings is optional and costs one click
   each; nothing else on this panel is required.

   NO TYPE DROPDOWN, NO TEMPLATE GALLERY, NO STEP COUNTER. HelmLogic
   keys its modules off a nine-value type enum and its create form
   has to null one pointer and populate another depending on which
   value you chose. There is no such choice here: a module is the
   table it is about, and everything else — the row label, the
   grouping, the picture, the price — is read off that table when it
   is drawn.

   JOIN TABLES ARE NOT OFFERED, and the panel says why rather than
   just being short one group. `canBeModuleMaster` is the only thing
   that decides; a join is a relationship, not a place to stand, and
   it appears INSIDE a module as a related list.

   THE SIBLING OFFER IS THE WHOLE ARGUMENT FOR ONE MODULE OVER
   SEVEN. The tables are per-brand because the workbook is per-brand,
   and that is right at the table layer. Repeating it at the module
   layer produces seven near-identical modules — the per-brand editor
   mistake, one floor up. So the panel asks once, in the kind's own
   words, and the index groups by brand.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  canBeModuleMaster,
  isRetired,
  TABLE_KINDS,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { hasPictures, hasPrices, kindPlural } from './read'
/* THE OFFER IS THE SPLIT RULE, ASKED ONE MOMENT EARLIER. This panel
   used to build its own sibling list off `e.kind === picked.kind`,
   which reads as the same question and is not: `custom` is the app's
   fallback for a table that declared nothing, so that test made every
   unclassified table a sibling of every other one and put a tick box
   beside it. On this sheet it offered Oils & Consumables and
   Registration Costs the moment somebody picked Labour Rates — the
   exact bag `split.ts` exists to complain about, offered back with a
   tick. One predicate now serves both surfaces. */
import { siblingOffer } from './split'
import './modules.css'

/* The panel groups tables exactly as the left panel does — products
   first, in the order a rig is built. A person who has learned the
   list once must not have to learn it again here. */
const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

interface PickGroup {
  kind: TableKind
  label: string
  items: EntityDef[]
}

/** THE PANEL'S THREE ANSWERS, FILLED IN BEFORE IT OPENS.
 *
 *  The front door proposes modules off what the sheet already
 *  declares — "You have 7 boat tables and 3 motor tables" — and a
 *  proposal a person has read and pressed has ALREADY answered
 *  clicks 1 and 2. Handing that answer over as a seed is what keeps
 *  there being one create path in this application: the proposer
 *  computes, this panel still performs, and the person still reads
 *  the tables and presses Create.
 *
 *  IT IS NOT A SHORTCUT PAST THE PANEL. Everything arrives editable
 *  and visible — the picked row is picked, the siblings are ticked,
 *  the name is in the field — so the third click is the same
 *  deliberate one it was, over a state the person can change or
 *  abandon. See `proposals.ts` in the dashboard for what fills it. */
export interface NewModuleDialogSeed {
  /** the table the module is about. Ignored when it is not one this
   *  panel would have offered — a join, a retired table, or a table
   *  no longer on the sheet — because a seed may not widen what the
   *  panel is willing to build from. */
  tableId: string
  /** siblings to arrive ticked. `create` filters them against the
   *  panel's own offer, so a seed cannot smuggle in a table the
   *  offer would not have listed. */
  alsoIds?: readonly string[]
  /** the name to arrive in the field. Omitted, the table's own. */
  name?: string
  /** the description to arrive in the field. Omitted, the table's
   *  own — which is right when the module IS that table and wrong
   *  the moment it is seven brands, so a proposal over many tables
   *  passes '' rather than borrowing one member's line. */
  description?: string
}

export interface NewModuleDialogProps {
  /** omit it and the panel is up: hosts that mount it on demand need no flag */
  open?: boolean
  onClose: () => void
  /** the module that was made, so the host can open it straight away */
  onCreated?: (moduleId: string) => void
  /** what to arrive filled in, when something already knows the
   *  answer. Absent, the panel opens blank exactly as it always has */
  seed?: NewModuleDialogSeed
}

export function NewModuleDialog({
  open: openProp,
  onClose,
  onCreated,
  seed,
}: NewModuleDialogProps): ReactElement | null {
  const open = openProp ?? true
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const createModule = useProjectStore((s) => s.createModule)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const firstRowRef = useRef<HTMLButtonElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  /* A SEED MAY NOT WIDEN WHAT THIS PANEL BUILDS FROM. The same two
     predicates `offered` below is built on, asked of the seed before
     it is honoured — so a proposal naming a table that has since
     been retired, turned into a join or deleted opens the blank
     panel rather than one standing on a table it refuses to list. */
  const asked = seed ? entities[seed.tableId] : undefined
  const start = asked && canBeModuleMaster(asked) && !isRetired(asked) ? asked : undefined

  /* THE SEED IS READ AT MOUNT, WHICH IS WHY IT IS AN INITIAL STATE
     AND NOT AN EFFECT. An effect over a prop object would re-run
     whenever a host rebuilt `{ tableId, alsoIds }` inline and wipe
     the name field under somebody typing in it. A host that changes
     the seed while the panel is up gives it a `key` — remounting is
     what "a different answer" means here, and it is one word at the
     call site instead of a resynchronising effect in this file. */
  const [pickedId, setPickedId] = useState<string | null>(start?.id ?? null)
  const [name, setName] = useState(start ? (seed?.name ?? start.name) : '')
  const [description, setDescription] = useState(
    start ? (seed?.description ?? start.description ?? '') : '',
  )
  const [alsoIds, setAlsoIds] = useState<string[]>(start ? [...(seed?.alsoIds ?? [])] : [])

  /* Every opening starts clean. A panel that remembers the last
     answer is a panel you have to check before you trust it — and a
     SEEDED panel is not remembering, it is holding the answer that
     was just pressed, so it is the one opening this does not undo. */
  useEffect(() => {
    if (!open) return
    if (seed) return
    setPickedId(null)
    setName('')
    setDescription('')
    setAlsoIds([])
  }, [open, seed])

  useEffect(() => {
    if (!open) return
    firstRowRef.current?.focus()
  }, [open])

  /* focus goes into the panel and comes back out to whatever opened it */
  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    return () => {
      if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
        returnTo.focus()
      }
    }
  }, [open])

  /* The panel owns the keyboard while it is up. Escape closes it, Tab
     cycles inside it, and Delete/Backspace never reach the canvas's
     window listener — the whiteboard is still mounted underneath and
     a Backspace there offers to delete the selected table. */
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current
      if (!root) return
      const inside = event.target instanceof Node && root.contains(event.target)

      if (event.key === 'Tab') {
        if (!inside && document.activeElement !== document.body) return
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!active || !root.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        event.stopPropagation()
        return
      }

      if (!inside) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  const tables = useMemo(() => Object.values(entities), [entities])

  /* WHAT MAY BE A MASTER, and nothing else. One predicate, owned by
     the model — this panel does not get its own opinion about joins.

     A RETIRED TABLE IS NEVER A MASTER EITHER. A module is a place a
     person is sent to browse, and history is not a place: the table
     and its rows stay on the sheet so an old quote still resolves,
     and the absence is explained below rather than merely arranged. */
  const offered = useMemo(
    () => tables.filter((e) => canBeModuleMaster(e) && !isRetired(e)),
    [tables],
  )
  const joinCount = tables.filter((e) => !canBeModuleMaster(e)).length
  const retiredCount = tables.filter((e) => canBeModuleMaster(e) && isRetired(e)).length

  const groups = useMemo<PickGroup[]>(() => {
    const byKind = new Map<TableKind, EntityDef[]>()
    for (const e of offered) {
      const key = kindOf(e.kind)
      const bucket = byKind.get(key)
      if (bucket) bucket.push(e)
      else byKind.set(key, [e])
    }
    const out: PickGroup[] = []
    for (const kind of KIND_ORDER) {
      const items = byKind.get(kind)
      if (!items || items.length === 0) continue
      out.push({
        kind,
        label: TABLE_KINDS[kind].label,
        /* by NAME inside a group: once the list is cut into kinds, a
           person is looking for a brand, and a brand is found A→Z */
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
    return out
  }, [offered])

  const picked = pickedId ? entities[pickedId] : undefined

  /* The other tables that hold the SAME SORT OF THING — and, when
     there are none because the picked table declares no kind, the
     sentence that says so. A table with no kind has no siblings by
     definition: two tables the app cannot classify have not agreed
     about anything, and bundling them is how a register of hourly
     rates ends up filed beside a schedule of government fees. */
  const offer = useMemo(
    () => (picked ? siblingOffer(picked, offered) : { siblings: [], why: '' }),
    [picked, offered],
  )
  const siblings = offer.siblings

  /* CLICK 2. Picking fills the name and the description FROM THE
     TABLE — there is exactly one place a module's description comes
     from, and it is a field somebody typed. HelmLogic derives its
     equivalent by substring-matching the name, and therefore tells
     every trailer and service user they are configuring boats. */
  const pick = useCallback(
    (entity: EntityDef) => {
      setPickedId(entity.id)
      setName(entity.name)
      setDescription(entity.description ?? '')
      setAlsoIds([])
    },
    [],
  )

  const toggleSibling = useCallback((id: string) => {
    setAlsoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  /* CLICK 3. */
  const create = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (!picked) return
      /* the primary is first, and the siblings follow in the order the
         list drew them — `tableIds[0]` is the contract */
      const ordered = [picked.id, ...siblings.filter((s) => alsoIds.includes(s.id)).map((s) => s.id)]
      const made = createModule(ordered, name, description)
      if (made) onCreated?.(made.id)
      closeRef.current()
    },
    [picked, siblings, alsoIds, createModule, name, description, onCreated],
  )

  if (!open || typeof document === 'undefined') return null

  const style = {
    '--md-accent': picked ? accentVar(picked.accent) : 'var(--ink)',
  } as CSSProperties

  return createPortal(
    <div
      className="md-overlay"
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) closeRef.current()
      }}
    >
      <div className="md-scrim" aria-hidden="true" />
      <div
        className="md-dialog"
        ref={rootRef}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-dlg-q"
      >
        <header className="md-dlg-head">
          <div className="md-dlg-head-top">
            <span className="mono-label md-dlg-eyebrow">New module</span>
            <button
              type="button"
              className="md-dlg-close"
              onClick={() => closeRef.current()}
              aria-label="Close without making a module"
              title="Close (Esc)"
            >
              <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <h2 className="block-heading md-dlg-q" id="md-dlg-q">
            What is this module about?
          </h2>
        </header>

        <form className="md-dlg-body" onSubmit={create}>
          <div className="md-pick" role="group" aria-label="Your tables">
            {/* THE REFUSAL NAMES A CONTROL THAT EXISTS. "Draw one on the
                sheet first" meant dragging a type out of the left panel's
                palette, and that panel has been imported by nothing since
                the masthead went. New table on the dock is the route now.
                The dashboard behind this panel also refuses to open it
                with no tables (Dashboard.tsx), so this is the second line
                of defence rather than the first. */}
            {groups.length === 0 ? (
              <p className="md-none">
                There are no tables to make a module from yet. Start one from{' '}
                <em>New table</em> on the bar first.
              </p>
            ) : (
              groups.map((group) => (
                <div className="md-pick-grp" key={group.kind}>
                  <div className="md-pick-grp-head">
                    <span className="mono-label">{group.label}</span>
                    <span className="md-pick-grp-count mono-label">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="md-pick-list">
                    {group.items.map((e, i) => {
                      const rows = rowsByEntity[e.id]?.length ?? 0
                      const isPicked = pickedId === e.id
                      return (
                        <li key={e.id}>
                          <button
                            type="button"
                            ref={
                              group.kind === groups[0].kind && i === 0
                                ? firstRowRef
                                : undefined
                            }
                            className={`md-pick-row${isPicked ? ' is-picked' : ''}`}
                            style={{ '--row-accent': accentVar(e.accent) } as CSSProperties}
                            /* NAMED AND PRESSED EXPLICITLY, the same
                               line the left panel's rows carry: the
                               label is two spans, one of them a 10px
                               aside, and a reader announcing them run
                               together is not a name. */
                            aria-label={`Make a module about ${e.name}`}
                            aria-pressed={isPicked}
                            onClick={() => pick(e)}
                          >
                            <span className="md-pick-glyph">
                              <TableKindSymbol kind={kindOf(e.kind)} size={17} />
                            </span>
                            <span className="md-pick-name">{e.name}</span>
                            {/* WHAT THIS TABLE BRINGS, in words. Pictures
                                decide whether the index draws tiles or
                                rows, and prices decide whether a face can
                                carry a number — so both are stated before
                                the choice, not discovered after it. */}
                            <span className="md-pick-facts mono-label">
                              {rows} {rows === 1 ? 'row' : 'rows'}
                              {hasPictures(e) ? ' · pictures' : ''}
                              {hasPrices(e) ? ' · prices' : ''}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}

            {/* THE ABSENCE IS EXPLAINED, not merely arranged. A person
                who has four link tables in the panel behind this one
                must not be left wondering whether the app lost them. */}
            {joinCount > 0 ? (
              <p className="md-pick-note">
                {joinCount === 1 ? 'One link table is' : `${joinCount} link tables are`}{' '}
                not offered here. A link table records which rows go with which, so it
                belongs inside a module as a related list rather than being a place of
                its own.
              </p>
            ) : null}

            {/* THE OTHER ABSENCE, EXPLAINED THE SAME WAY. A person who
                can see the table on the sheet must not be left
                wondering whether the app lost it. */}
            {retiredCount > 0 ? (
              <p className="md-pick-note">
                {retiredCount === 1 ? 'One table is' : `${retiredCount} tables are`} history
                rather than stock and {retiredCount === 1 ? 'is' : 'are'} not offered here.
                A module is a place people are sent to browse, and nothing that is no longer
                sold belongs in one. The {retiredCount === 1 ? 'table stays' : 'tables stay'}{' '}
                on the sheet, and a quote already written against{' '}
                {retiredCount === 1 ? 'it' : 'one'} still opens.
              </p>
            ) : null}
          </div>

          <div className="md-form">
            {!picked ? (
              <p className="md-form-void">
                Pick a table on the left. Its name and description fill in here, and the
                module is ready to create.
              </p>
            ) : (
              <>
                <label className="md-field">
                  <span className="mono-label">Module name</span>
                  <input
                    className="field-input"
                    value={name}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="md-field">
                  <span className="mono-label">One line about it</span>
                  <input
                    className="field-input"
                    value={description}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="What people will find in here"
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                {/* WHY NOTHING IS OFFERED, WHERE IT WOULD HAVE BEEN.
                    DESIGN_CONTRACT §10: a thing that cannot be done
                    says why, in place. An empty space under the
                    description tells a person nothing at all, and the
                    thing they cannot do here — bundle this with the
                    other tables that declare no kind — is a thing the
                    panel was doing for them a commit ago. The count in
                    it is counted off their own sheet. */}
                {offer.why !== '' ? (
                  <p className="md-sibs-why" role="note">
                    {offer.why}
                  </p>
                ) : null}

                {siblings.length > 0 && picked.kind ? (
                  <div className="md-sibs" role="group" aria-label="Tables of the same kind">
                    <p className="md-sibs-say">
                      These are also {kindPlural(picked.kind)}. Tick any that belong in
                      the same module and people will browse them together, brand first.
                    </p>
                    <ul className="md-sib-list">
                      {siblings.map((s) => {
                        const rows = rowsByEntity[s.id]?.length ?? 0
                        return (
                          <li key={s.id}>
                            <label className="md-sib">
                              <input
                                type="checkbox"
                                /* the row count beside the name is a
                                   mono aside, so the box states which
                                   table it is rather than reading
                                   "ePropulsion Outboards 14" */
                                aria-label={`Include ${s.name}`}
                                checked={alsoIds.includes(s.id)}
                                onChange={() => toggleSibling(s.id)}
                              />
                              <span className="md-sib-name">{s.name}</span>
                              <span className="md-sib-rows mono-label">{rows}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}

            <footer className="md-dlg-foot">
              <p className="md-dlg-foot-say">
                {picked
                  ? 'Nothing else to configure — the list, the grouping, the pictures and the price all come from the table.'
                  : ''}
              </p>
              <button type="submit" className="btn btn-primary" disabled={!picked}>
                Create module
              </button>
            </footer>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
