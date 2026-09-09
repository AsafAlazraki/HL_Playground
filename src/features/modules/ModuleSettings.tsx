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
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import { useConstraints, useSentenceCtx } from '@/features/constraints'
import { useQuotes } from '@/features/quote'
import { AccessGrid } from './AccessGrid'
import { ACCESS_ENFORCEMENT, ROLE_IS } from './accessSay'
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
import { brandLogoFor } from './brandLogos'
/* THE PRIMITIVES. Every panel on this page is `<Card>`, every panel
   head is `<SectionHead>`, every act is `<Button>` and the two
   one-line text controls that carry no blur guard are `<Field>`;
   the local rules that drew them are deleted from modules.css.

   TWO TEXT CONTROLS STAY LOCAL, and the reason is a gap in the layer
   rather than a preference: the name and the description restore
   the last real value on BLUR (a module with no name is a card
   nobody can point at), and `<Field>` has no `onBlur` and no
   multi-line form. Reported. */
import { Button, Card, Field, SectionHead } from '@/ui'
import './modules.css'

export interface ModuleSettingsProps {
  module: ModuleDef
  /** back to this module's catalogue — the control that opened this
   *  page is the control that closes it */
  onDone: () => void
  /** the panel to land on. A door that promised the rules and opened
   *  the top of five panels would not be keeping its promise. */
  focus?: 'rules'
  /**
   * Drawn as a TAB of the module's workspace rather than as a page of
   * its own, so the way out is the tab bar and the back control here
   * would be a second one pointing at the same place.
   *
   * THE HEADING STAYS. Set-up is about the MODULE — Boats — and the
   * workspace above it may be standing at one brand inside it, so a
   * page that dropped its own name would be editing "Boats" under a
   * header saying "Highfield Inflatables" with nothing saying which.
   */
  bare?: boolean
}

export function ModuleSettings({
  module,
  onDone,
  focus,
  bare,
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
      <header className="md-idx-head md-set-head">
        {/* THE WAY BACK LEADS, IT DOES NOT TRAIL.

            It was pinned to the far right of the header, which at 1440
            was a reasonable 700px from the title and at 2560 was 2,000
            — a lone 100px control at the opposite end of an empty
            rule, and the first thing a person looks for on a settings
            page they opened by accident. Above the name it reads as
            what it is: the step back up, then where you are.

            SENTENCE CASE, NOT THE GEAR'S MONO STAMP. This is a button
            and a button is one of the four things uppercase is never
            for. `Catalogue` is a noun naming what is on the screen you
            land on, which is the same rule the dock's own items keep. */}
        {bare ? null : (
          <Button
            tone="neutral"
            glyph={<ArrowLeft size={ICON_SIZE.small} />}
            onClick={onDone}
          >
            Catalogue
          </Button>
        )}

        <div className="md-idx-id">
          <span className="mono-label md-set-eyebrow">Settings</span>
          <h2 className="md-idx-name">{module.name}</h2>
          <p className="md-idx-facts mono-label">{censusLine(census)}</p>
        </div>
      </header>

      {/* TWO COLUMNS, AND THE SPLIT IS THE SENTENCE THE PAGE MAKES.

          WHAT IT WAS. Five panels stacked full width. On a 2560px
          window that is a 1,700px-wide text box holding the word
          "Boats", a one-line description field the width of a
          billboard, and help sentences running seventy-five words to
          the line — three times a readable measure. Nothing was
          broken and everything was stretched.

          WHAT DECIDES WHICH SIDE. The left is what this module IS —
          its name, its sentence, its mark. Those are short fields and
          a 96px plate, and they are done being read at 340px, so they
          take a column suited to them and stop. The right is what
          this module ALLOWS and what HANGS OFF it — the role grid,
          the nine capability switches, the list of what is attached.
          Those are the things that genuinely want a wide table, and
          they now get the whole of the width the left column is no
          longer wasting. */}
      <div className="md-set-body">
        <div className="md-set-aside">
          <Identity module={module} />
          <Mark module={module} primaryKind={primary?.kind} />
        </div>
        <div className="md-set-main">
          <Access module={module} />
          {/* 4 · the four panels that were the strip */}
          <ModuleDesigner module={module} />
          <Attached module={module} />
        </div>
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
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">What it is called</SectionHead>
      {/* THE PARAGRAPH THAT STOOD HERE IS GONE. It explained that a
          name is your words and is not worked out from anything —
          which is what a text field labelled Name already says, 18px
          below it. Measured on this surface: 74% of its visible words
          were the app narrating itself, and three paragraphs like
          this one were most of that. */}
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
    </Card>
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
  /* WHAT THIS MODULE IS DRAWN WITH WHEN IT HAS NO LOGO OF ITS OWN.
     `brandLogos.ts` matches the module's name against the marks that
     are really in `modules/marks/`, and TODAY THAT DIRECTORY IS
     EMPTY, so this is undefined for every module in the Northside
     seed. It stays here because the moment a mark is dropped in, this
     panel has to show it rather than tell the admin they have none.
     Eight brands are declared there; none of their files were ever
     committed — see that file's header. */
  const bundled = brandLogoFor(module.name)
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
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">Its mark</SectionHead>
      {/* No paragraph: the plate beside the control already shows
          what a module with no mark looks like, which is the whole of
          what the sentence here used to say. */}
      <div className="md-mark">
        <span className="md-mark-plate">
          {module.logo ? (
            <MarkPicture src={module.logo.src} alt={`${module.name} mark`} />
          ) : bundled ? (
            /* THE PLATE MUST SHOW WHAT THE APP IS ACTUALLY DRAWING.
               A module with a bundled mark (`brandLogos.ts`) is not
               markless, and a plate showing the kind symbol here
               would be this screen disagreeing with every other
               screen about what this module looks like — the person
               would replace a mark they never knew they had. It is
               labelled as supplied, below.

               THIS BRANCH HAS NEVER RUN, and that is the finding
               rather than the design. It reads `bundled`, which is
               now the marks that are really on disk, and none are:
               the previous version of this comment claimed "the
               dashboard and the modules grid have been showing
               Highfield's wordmark all along", which was measured
               false on 2026-09-09 — those addresses returned
               `200 text/html` and drew nothing. Drop a file in
               `modules/marks/` and this is the branch that lights. */
            <MarkPicture src={bundled.src} alt={`${module.name} mark`} />
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
            <Field
              type="url"
              label={`…or paste a picture address for the ${module.name} mark`}
              value={address}
              onChange={setAddress}
              placeholder="https://"
              inputMode="url"
            />
            {/* REFUSED UNTIL THERE IS SOMETHING TO USE, and it says so
                beneath the control rather than greying out (rule 10). */}
            <Button
              tone="neutral"
              refusedBecause={address.trim() === '' ? 'Paste an address first.' : undefined}
              onClick={() => {
                take(logoFromAddress(address))
                setAddress('')
              }}
            >
              Use it
            </Button>
          </div>

          {module.logo ? (
            <Button tone="ghost" size="sm" onClick={clear}>
              Take the mark off
            </Button>
          ) : bundled ? (
            /* NOT A BUTTON. There is nothing to take off — the mark
               is supplied rather than stored, and "Take the mark off"
               would have to mean "store an emptiness", which is a
               state this model does not have and should not grow one
               for. Choosing a file replaces it, which is the act a
               person actually wants. */
            <p className="md-mark-say">
              This mark comes with the app. Choose a file or paste an address to use your
              own instead.
            </p>
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

      {/* THE CEILING IS SAID WHERE IT BITES, NOT IN ADVANCE. This was
          a standing four-line paragraph about 96 KB and 512 pixels,
          on screen whether or not anybody had ever picked a file.
          `shrinkNote` says what actually happened to the file that
          was chosen, and `sizeSay` says why one was refused — both
          above, both at the moment they are true. The bound itself is
          on the control, for a person who wants it before they pick. */}
      <p className="md-set-note mono-label">
        Under 96 KB kept as is · larger redrawn to {LOGO_MAX_EDGE}px
      </p>
    </section>
    </Card>
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
  return (
    <img
      className="md-mark-img"
      src={display.at}
      alt={alt}
      /* THE VERDICT IS REPORTED FROM HERE TOO, and it was not before.
         `useImageDisplay` only knows an address is dead because
         something TOLD it, and this plate was the one picture in the
         app that asked the question without ever answering it: an
         address that fails here stayed `paint: true` for as long as
         the page was open, so the panel showed the browser's broken
         glyph — beside a paragraph telling the admin they already
         had a mark — while `PlaceMark` drew the same address
         cleanly two screens away. Found on 2026-09-09 chasing eight
         bundled marks whose files were never committed; the plate
         only looked right because the modules screen had already
         condemned those addresses on its way past. Same two calls
         `PlaceMark` makes, so one surface cannot believe a mark that
         another has buried. */
      onLoad={() => noteImageLoaded(src)}
      onError={() => noteImageFailed(src)}
    />
  )
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
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">Who may do what</SectionHead>

      {/* THE STATE OF THE PLACE, IN A SENTENCE, BEFORE ANY CONTROL. A
          person who has never touched this must not be left wondering
          whether they have locked everyone out. */}
      <p className={`md-set-state${open ? ' is-open' : ''}`}>
        {open ? (
          <>
            <strong>{module.name} is open to everyone.</strong> Ticking a box narrows it
            to those roles.
          </>
        ) : (
          <>
            <strong>Only the roles ticked below may act in {module.name}.</strong>{' '}
            Clearing every tick opens it again.
          </>
        )}
      </p>

      {/* WHERE THESE TICKS BITE AND WHERE THEY DO NOT, SAID WHERE IT
          WOULD BE ASSUMED — and in the same words Access & roles
          uses, from `accessSay.ts`. It was two wordings of one fact
          on two screens that set the same thing. */}
      <p className="md-set-note">{ACCESS_ENFORCEMENT}</p>

      {roles.length === 0 ? (
        <Card tone="sunken" pad="md">
          <div className="md-stack">
            <SectionHead level="none">No roles yet</SectionHead>
            <p className="md-set-void-say">{ROLE_IS}</p>
            <p className="md-set-void-count">
              You have{' '}
              <strong>
                {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
              </strong>{' '}
              and no roles.
            </p>
            <NewRole draft={draft} onDraft={setDraft} onAdd={addRole} first />
          </div>
        </Card>
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
    </Card>
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
      <Field
        label="What this role is called"
        value={draft}
        onChange={onDraft}
        placeholder={first ? 'The first job at your dealership' : 'Another job'}
        autoComplete="off"
      />
      <Button
        type="submit"
        tone="primary"
        glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
        refusedBecause={draft.trim() === '' ? 'Give the job a name first.' : undefined}
      >
        Add role
      </Button>
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
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">What is attached to it</SectionHead>
      {/* No paragraph. Every line below is a counted fact off the
          sheet, and a list of counted facts does not need to be
          introduced as one. */}
      <ul className="md-atts">
        {things.map((thing) => (
          <Attachment key={thing.key} thing={thing} />
        ))}
      </ul>
    </section>
    </Card>
  )
}

function Attachment({ thing }: { thing: LinkedThing }): ReactElement {
  const { shown, more } = namedFew(thing)
  return (
    <li>
      <Card tone="flat" pad="sm">
      <div className="md-stack">
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
      </div>
      </Card>
    </li>
  )
}
