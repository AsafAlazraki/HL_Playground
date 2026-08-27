/* ============================================================
   MODULE SETTINGS — where an admin says what this place IS.

   ONE SURFACE PER MODULE, AND IT ABSORBS THE DESIGNER. `ModuleDesigner`
   is mounted here, whole and unchanged, as this page's middle. It is
   not a second editor beside this one and this is not a second editor
   beside it: every change to a module — its name, its mark, its verbs,
   its tables, its item page, its rules, and who may use it — is made
   on this page and nowhere else.

   WHY ABSORB RATHER THAN SIT BESIDE. The designer used to grow as a
   strip over the catalogue, which bought a live preview of the two
   panels that change what the catalogue draws. Three things made that
   the wrong trade once RBAC, the mark and the attachments existed:

     1. TWO DOORS FOR ONE JOB. "Set up this module" and "module
        settings" are the same sentence. An admin who pressed the gear
        and found no way to add a logo would have to be told the other
        door exists — and told where it is.
     2. TWO OWNERS FOR ONE FIELD. The strip reordered a module's tables
        from its own panel AND from handles on the catalogue's section
        heads; the access grid's columns are the capability list the
        strip's first panel writes. Every one of those pairs is a
        chance for two screens to disagree, and the contract's warning
        is exactly that.
     3. THE PREVIEW WAS ONLY EVER TRUE OF TWO PANELS. Roles, the mark
        and the attachment list have nothing on the catalogue to
        preview, so half a settings page would have been previewing
        and half not.

     Nothing an admin could do has become impossible. The name and the
     description are edited in the first panel here, where the strip
     used to put them over the catalogue; moving and removing a table
     is the designer's own "What this place lists", which is on this
     page. The catalogue is one press away and the control that opens
     this page is the control that closes it.

   THE FIVE PANELS, IN THE ORDER AN ADMIN ASKS THEM:

     1 · WHAT IT IS CALLED — the name and the one line under it. The
         admin's words, never derived: HelmLogic derives its equivalent
         by substring-matching the name and therefore tells every
         trailer and service user they are configuring boat packages.

     2 · ITS MARK — the dealer's own badge for this place, bounded.
         See `logo.ts` for the ceiling and what is said about it.

     3 · WHO MAY DO WHAT — the roles at this dealership, and a grid of
         them against THIS MODULE'S OWN VERBS. Nothing is seeded, the
         open state says it is open, and closing it says so too.

         THE GRID ITSELF IS `AccessGrid` AND IS NO LONGER WRITTEN HERE.
         It moved out whole when the access screen needed the same
         table for whichever place is picked there — one editor for
         `ModuleDef.access`, so a tick means the same thing, prints the
         same sentence and offers the same UNDO on both surfaces. This
         panel keeps what is TRUE OF THIS PAGE — the state of the place
         in a sentence, what is not enforced yet, the empty state and
         the control that names a new job — and the facts that belong
         to the table travel with the table.

     4 · THE DESIGNER — what may be done here, what this place lists,
         what one item shows, and the rules it goes by.

     5 · WHAT IS ATTACHED — everything else this module reaches,
         counted off the project rather than listed in code, each with
         the surface that owns it.

   NOTHING ON THIS PAGE IS INVENTED. No seeded role, no placeholder
   logo, no permission nobody chose, and no count that is not read from
   the store.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { say } from '@/store/notes'
import { accentVar, type ModuleDef, type TableKind } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { useImageDisplay } from '@/lib/imageSources'
import { useConstraints, useSentenceCtx } from '@/features/constraints'
import { useQuotes } from '@/features/quote'
import { AccessGrid } from './AccessGrid'
import { ModuleDesigner } from './ModuleDesigner'
import { rulesPanelId } from './ModuleRulesPanel'
import { useModuleConfiguresRules } from './ruleCapability'
import { censusLine, moduleCensus, moduleTables } from './read'
import { isUnrestricted } from './access'
import { linkedThings, namedFew, type LinkedThing } from './links'
import {
  LOGO_MAX_EDGE,
  logoFromAddress,
  readLogoFile,
  type LogoRead,
} from './logo'
import './modules.css'

export interface ModuleSettingsProps {
  module: ModuleDef
  /** back to this module's catalogue — the control that opened this
   *  page is the control that closes it */
  onDone: () => void
  /** the panel to land on. A door that promised the rules and opened
   *  the top of five panels would not be keeping its promise. */
  focus?: 'rules'
}

export function ModuleSettings({
  module,
  onDone,
  focus,
}: ModuleSettingsProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const tables = useMemo(() => moduleTables(module, entities), [module, entities])
  const census = useMemo(
    () => moduleCensus(module, entities, rowsByEntity),
    [module, entities, rowsByEntity],
  )

  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties
  const primary = tables[0]

  /* LANDING ON THE PANEL THAT WAS ASKED FOR. Once, on arrival: this
     runs after the render that mounted the designer, which is the
     render the panel first exists in. */
  useEffect(() => {
    if (focus !== 'rules') return
    const el = document.getElementById(rulesPanelId(module.id))
    if (!el) return
    const still =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [focus, module.id])

  return (
    <section className="md-set" style={style} aria-label={`Settings for ${module.name}`}>
      <header className="md-idx-head">
        <div className="md-idx-id">
          <span className="mono-label md-set-eyebrow">Settings</span>
          <h2 className="md-idx-name">{module.name}</h2>
          <p className="md-idx-facts mono-label">{censusLine(census)}</p>
        </div>

        {/* SENTENCE CASE, NOT THE GEAR'S MONO STAMP. This is a button
            and a button is one of the four things uppercase is never
            for. `Catalogue` is a noun naming what is on the screen you
            land on, which is the same rule the dock's own items keep. */}
        <button type="button" className="md-set-back" onClick={onDone}>
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>Catalogue</span>
        </button>
      </header>

      <div className="md-set-body">
        <Identity module={module} />
        <Mark module={module} primaryKind={primary?.kind} />
        <Access module={module} />
        {/* 4 · the four panels that were the strip */}
        <ModuleDesigner module={module} />
        <Attached module={module} />
      </div>
    </section>
  )
}

/* ============================================================
   1 · WHAT IT IS CALLED
   ============================================================ */

function Identity({ module }: { module: ModuleDef }): ReactElement {
  const updateModule = useProjectStore((s) => s.updateModule)

  /* THE LAST NAME THAT WAS ACTUALLY A NAME. The field writes straight
     through, so clearing it to retype it writes an empty string — and
     a module with no name is a card on the dashboard nobody can point
     at. Blur restores this rather than inventing a replacement. */
  const lastNamed = useRef(module.name)
  if (module.name.trim() !== '') lastNamed.current = module.name

  return (
    <section className="md-panel">
      <h3 className="md-panel-name mono-label">What it is called</h3>
      <p className="md-panel-say">
        Your words, on the dashboard card and at the top of this place. Nothing here is
        worked out from the name — a module called Yamaha Repower says what you say it
        says.
      </p>

      <label className="md-field">
        <span className="mono-label">Name</span>
        <input
          className="field-input"
          type="text"
          value={module.name}
          spellCheck={false}
          placeholder="Name this place"
          onChange={(e) => updateModule(module.id, { name: e.target.value })}
          onBlur={() => {
            if (module.name.trim() === '') {
              updateModule(module.id, { name: lastNamed.current })
            }
          }}
        />
      </label>

      <label className="md-field">
        <span className="mono-label">One line about it</span>
        <textarea
          className="field-input md-set-desc"
          value={module.description}
          rows={2}
          placeholder="One line about this place, in your own words"
          onChange={(e) => updateModule(module.id, { description: e.target.value })}
        />
      </label>
    </section>
  )
}

/* ============================================================
   2 · ITS MARK
   ============================================================ */

function Mark({
  module,
  primaryKind,
}: {
  module: ModuleDef
  primaryKind: TableKind | undefined
}): ReactElement {
  const updateModule = useProjectStore((s) => s.updateModule)
  const [address, setAddress] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  const take = (read: LogoRead): void => {
    if (!read.ok) {
      setRefusal(read.why)
      setNote(null)
      return
    }
    setRefusal(null)
    setNote(read.note ?? null)
    updateModule(module.id, { logo: read.ref })
  }

  const chooseFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    setReading(true)
    try {
      take(await readLogoFile(file))
    } finally {
      setReading(false)
    }
  }

  const clear = (): void => {
    const before = module.logo
    updateModule(module.id, { logo: undefined })
    setNote(null)
    setRefusal(null)
    say({
      text: `${module.name} is back to its kind symbol.`,
      act: {
        label: 'Undo',
        onPick: () => updateModule(module.id, { logo: before }),
      },
    })
  }

  return (
    <section className="md-panel">
      <h3 className="md-panel-name mono-label">Its mark</h3>
      <p className="md-panel-say">
        The badge you already use for this place — the brand you sell, the workshop’s
        sign. It is optional: a module with no mark shows the symbol for what its tables
        hold, in this module’s colour, which already reads as itself.
      </p>

      <div className="md-mark">
        <span className="md-mark-plate">
          {module.logo ? (
            <MarkPicture src={module.logo.src} alt={`${module.name} mark`} />
          ) : (
            <span className="md-mark-fall">
              <TableKindSymbol kind={kindOf(primaryKind)} size={ICON_SIZE.large} />
            </span>
          )}
        </span>

        <div className="md-mark-doors">
          {/* TWO DOORS IN, THE SAME TWO THE REGISTER'S PICTURE CELL HAS.
              Every picture this business owns is already an address; a
              file chooser on its own would make the common case the
              missing one. */}
          <label className="md-mark-file">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                void chooseFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <span>{reading ? 'Reading…' : 'Choose a file'}</span>
          </label>

          <div className="md-mark-addr">
            <input
              className="field-input"
              type="text"
              value={address}
              spellCheck={false}
              placeholder="…or paste a picture address"
              aria-label={`Picture address for the ${module.name} mark`}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={address.trim() === ''}
              onClick={() => {
                take(logoFromAddress(address))
                setAddress('')
              }}
            >
              Use it
            </button>
          </div>

          {module.logo ? (
            <button type="button" className="md-linkbtn" onClick={clear}>
              Take the mark off
            </button>
          ) : null}
        </div>
      </div>

      {/* WHAT WAS DONE TO SOMEBODY'S FILE, SAID. An app that quietly
          re-encodes artwork has changed a person's file without telling
          them. */}
      {note ? <p className="md-mark-say">{note}</p> : null}

      {/* THE REFUSAL, WHERE IT IS REFUSED. */}
      {refusal ? (
        <p className="md-panel-warn" role="status">
          {refusal}
        </p>
      ) : null}

      <p className="md-set-note">
        A file under 96 KB is stored exactly as it is. Anything larger is redrawn to fit{' '}
        {LOGO_MAX_EDGE} pixels — a mark is drawn at 22 to 56 pixels on screen, and a
        photograph carried whole would travel inside this module through every save and
        every export. An address is stored as an address and costs nothing.
      </p>
    </section>
  )
}

/** The mark, drawn through the same reader every other picture in the
 *  app uses — so a mark on a host that refuses us degrades to the
 *  drawing office's own language rather than to a broken glyph. */
function MarkPicture({ src, alt }: { src: string; alt: string }): ReactElement {
  const display = useImageDisplay(src)
  if (!display.paint) {
    return <span className="md-mark-held mono-label">Held as a link</span>
  }
  return <img className="md-mark-img" src={display.at} alt={alt} />
}

/* ============================================================
   3 · WHO MAY DO WHAT
   ============================================================ */

function Access({ module }: { module: ModuleDef }): ReactElement {
  const roleMap = useProjectStore((s) => s.roles)
  const modules = useProjectStore((s) => s.modules)
  const createRole = useProjectStore((s) => s.createRole)

  const [draft, setDraft] = useState('')

  const roles = useMemo(
    () =>
      Object.values(roleMap).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
      ),
    [roleMap],
  )

  const open = isUnrestricted(module)
  const moduleCount = Object.keys(modules).length

  const addRole = (): void => {
    const made = createRole(draft)
    if (!made) return
    setDraft('')
  }

  return (
    <section className="md-panel">
      <h3 className="md-panel-name mono-label">Who may do what</h3>

      {/* THE STATE OF THE PLACE, IN A SENTENCE, BEFORE ANY CONTROL. A
          person who has never touched this must not be left wondering
          whether they have locked everyone out. */}
      <p className={`md-set-state${open ? ' is-open' : ''}`}>
        {open ? (
          <>
            <strong>{module.name} is open to everyone.</strong> Nothing has been
            restricted here. The moment you tick one box below, only the roles with a
            tick may act in this module — everybody else may do nothing here.
          </>
        ) : (
          <>
            <strong>Only the roles ticked below may act in {module.name}.</strong>{' '}
            Everybody else may do nothing here. Clearing every tick opens it to everyone
            again.
          </>
        )}
      </p>

      {/* WHAT IS NOT TRUE YET, SAID WHERE IT WOULD BE ASSUMED. */}
      <p className="md-set-note">
        Nobody signs in to this build, so nothing here is enforced today. What you set is
        recorded on the module, travels with it, and is what will be enforced the day
        people sign in.
      </p>

      {roles.length === 0 ? (
        <div className="md-set-void">
          <span className="mono-label md-set-void-eyebrow">No roles yet</span>
          <p className="md-set-void-say">
            A role is a job at your dealership, in the words you use for it. A role says
            nothing on its own — it becomes real here, where you say what it may do.
          </p>
          <p className="md-set-void-count">
            You have{' '}
            <strong>
              {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
            </strong>{' '}
            and no roles.
          </p>
          <NewRole draft={draft} onDraft={setDraft} onAdd={addRole} first />
        </div>
      ) : (
        <>
          {/* THE ONE GRID. It is `AccessGrid`, the same component the
              access screen mounts for whichever place is picked there —
              one editor for `ModuleDef.access`, so a tick means the
              same thing and says the same sentence wherever it is
              pressed. Everything this panel used to draw around the
              table is still drawn: the lapsed grants, the orphaned
              ones and the note about the columns travel WITH the grid
              now, because they are facts about the table rather than
              about the page it is on. */}
          <AccessGrid module={module} roles={roles} sayWhereVerbsLive />

          <NewRole draft={draft} onDraft={setDraft} onAdd={addRole} first={false} />
        </>
      )}
    </section>
  )
}

function NewRole({
  draft,
  onDraft,
  onAdd,
  first,
}: {
  draft: string
  onDraft: (next: string) => void
  onAdd: () => void
  first: boolean
}): ReactElement {
  return (
    <form
      className="md-role-new"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd()
      }}
    >
      <input
        className="field-input"
        type="text"
        value={draft}
        spellCheck={false}
        placeholder={first ? 'The first job at your dealership' : 'Another job'}
        aria-label="What this role is called"
        onChange={(e) => onDraft(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={draft.trim() === ''}>
        <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
        Add role
      </button>
    </form>
  )
}

/* ============================================================
   5 · WHAT IS ATTACHED
   ============================================================ */

function Attached({ module }: { module: ModuleDef }): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const views = useProjectStore((s) => s.views)
  const rules = useProjectStore((s) => s.rules)
  const roleMap = useProjectStore((s) => s.roles)
  const constraints = useConstraints()
  const ctx = useSentenceCtx()
  const quotes = useQuotes()
  const configures = useModuleConfiguresRules(module.id)

  const things = useMemo(
    () =>
      linkedThings({
        module,
        entities,
        views,
        rules,
        constraints,
        conceptIndex: ctx.index,
        quotes,
        roles: Object.values(roleMap),
        configures,
      }),
    [module, entities, views, rules, constraints, ctx.index, quotes, roleMap, configures],
  )

  return (
    <section className="md-panel">
      <h3 className="md-panel-name mono-label">What is attached to it</h3>
      <p className="md-panel-say">
        Everything this place reaches, counted off your own sheet rather than filled in on
        a form. Point the module at another table and every line here moves with it.
      </p>

      <ul className="md-atts">
        {things.map((thing) => (
          <Attachment key={thing.key} thing={thing} />
        ))}
      </ul>
    </section>
  )
}

function Attachment({ thing }: { thing: LinkedThing }): ReactElement {
  const { shown, more } = namedFew(thing)
  return (
    <li className="md-att">
      <p className="md-att-top">
        <span className="md-att-count mono-label">{thing.count}</span>
        <span className="md-att-name">{thing.name}</span>
      </p>
      <p className="md-att-says">{thing.says}</p>
      {shown.length > 0 ? (
        <ul className="md-att-names">
          {shown.map((name) => (
            <li key={name} className="md-att-one">
              {name}
            </li>
          ))}
          {more > 0 ? (
            <li className="md-att-more mono-label">and {more} more</li>
          ) : null}
        </ul>
      ) : null}
      {/* WHERE IT IS CHANGED, AND WHETHER IT IS CHANGED HERE. A row
          this page owns reads as an instruction; one owned somewhere
          else, or owned nowhere yet, is set apart so a person does not
          go looking on this page for a control that is not on it. */}
      <p className={`md-att-where${thing.home === 'settings' ? '' : ' is-away'}`}>
        {thing.where}
      </p>
    </li>
  )
}
