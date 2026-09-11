/* ============================================================
   THE MODULE DESIGNER — the handles the gear grows.

   IT IS NOT A SCREEN. Pressing SET UP on a module does not navigate
   and does not open a form that represents the module: it grows
   this strip on the page already in front of the person, and
   pressing it again subtracts it. That is the gesture `ViewPage`
   already ships (`ViewPage.tsx:252-266`) and the module inherits it
   rather than reinventing it (MODULE_SYSTEM §4, rule 7).

   FOUR THINGS, IN THE ORDER AN ADMIN ASKS THEM. The fourth is new
   and it is the reason the strip grew: a module now configures the
   RULES governing its own subject, reusing the two engines the app
   already has rather than growing a third (see ModuleRulesPanel).

     1. WHAT MAY BE DONE HERE — the capability strip. Ten verbs,
        drawn as switches. Nine come from the contract; the tenth,
        `configure`, is held in `ruleCapability.ts` with the exact
        line `MODULE_CAPABILITIES` needs, because `model.ts` is not
        this session's to edit. Nothing below the switch handler can
        tell the difference. A verb that cannot be
        switched on says what is missing, in a sentence, naming the
        table the fix lives on. A verb that is ON but which this app
        does not yet perform says so on the switch AND draws a
        disabled control on the page — never a control that looks
        live and does nothing.

     2. WHAT THIS PLACE LISTS — the index. Rows or tiles, which
        tables are in it, and in what order. The index's sections
        ARE its blocks: one per table, in `tableIds` order, so
        adding a table adds a section and moving one moves it.

     3. WHAT ONE ITEM SHOWS — the detail. A module's item page IS a
        view page, so this edits the real `ViewDef` through the
        views feature's own helpers. It does the two things
        `ViewPage` cannot: reorder the blocks, and choose the
        columns each one draws.

     4. THE RULES IT GOES BY — drawn only while `configure` is on,
        which is the affordance that verb promises. Limits, the
        derivations that walk or search these tables, and what the
        price file itself states about this subject with its
        evidence and its measured rate. It assigns nothing: which
        rules reach a module is computed off the columns, so
        pointing the module at another table changes them in the
        same render.

   NOTHING HERE INVENTS DATA. Every column offered is read from
   `EntityDef.fields`; every verb from `MODULE_CAPABILITIES`; every
   table from the sheet. The one thing an admin types — the name and
   the description — starts empty with an instruction in it, never a
   plausible value somebody could mistake for their own words.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Plus,
  Warning,
  X,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  canBeModuleMaster,
  FIELD_TYPES,
  isRetired,
  type EntityDef,
  type ModuleDef,
  type ModuleIndexMode,
  type ViewDef,
} from '@/types/model'
import { ModuleRulesPanel } from './ModuleRulesPanel'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import {
  addBlock,
  createViewFor,
  curatedOnly,
  findJoinTable,
  removeBlock,
  summariseRule,
  updateBlock,
  useViewDef,
} from '@/features/views'
import {
  categoryDrawers,
  DRAWER_FLOOR,
  buildEntries,
  kindPlural,
  listedTables,
  moduleFace,
  moduleTables,
} from './read'
/* THE READING THAT SAYS WHETHER THIS IS ONE PLACE OR A BAG. The owner
   asked for the modules to be split better twice; this is that request
   as a rule the app can apply to a module an admin builds tomorrow,
   rather than as a one-off tidy of the demo's own list. */
import { splitReading } from './split'
/* THE PRIMITIVES. Every panel, every option card, every binding and
   every block is `<Card>`, every panel head is `<SectionHead>`, the
   add-list lines are `<Row>`s and every act is `<Button>`, all from
   src/ui. The local rules that drew them — `.md-panel`,
   `.md-panel-name`, `.md-cap`, `.md-shape-btn`, `.md-bind`,
   `.md-block`, `.md-add`, `.md-add-row`, `.md-add-btn`,
   `.md-icon-btn`, `.md-linkbtn`, `.md-stub` and their states — are
   deleted from modules.css. Three things stay local and are
   reported as gaps: the switch (`.md-switch`), the item-page tabs
   (`.md-tab`) and the column tick list (`.md-col`), which is a
   multi-select and not a `current`-of-a-set. */
import { Button, Card, Row, SectionHead } from '@/ui'
import {
  blockBindings,
  capabilityStates,
  columnCandidates,
  moveId,
  moveViewBlock,
  nextCapabilities,
  tableBindings,
  type BlockBinding,
  type DesignerCapability,
  type TableBinding,
} from './designer'
import './modules.css'

export interface ModuleDesignerProps {
  module: ModuleDef
}

export function ModuleDesigner({ module }: ModuleDesignerProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const updateModule = useProjectStore((s) => s.updateModule)

  const tables = moduleTables(module, entities)
  const bindings = tableBindings(module, entities, rowsByEntity)

  /* ALL TEN VERBS COME FROM ONE PLACE NOW. The tenth lived in a
     browser-local registry for a release, and this component carried
     the only two lines that knew — a hook beside `capabilityStates`
     and a branch in the setter. `ruleCapability.ts` wrote its own
     deletion down; this is it. */
  const configures = module.capabilities.includes('configure')
  const caps = capabilityStates(module, tables, entities)

  const setCapability = (key: DesignerCapability, on: boolean): void => {
    updateModule(module.id, {
      capabilities: nextCapabilities(module.capabilities, key, on),
    })
  }

  return (
    <div className="md-design" role="group" aria-label={`Set up ${module.name}`}>
      <Capabilities module={module} states={caps} onSet={setCapability} />
      <IndexPanel module={module} bindings={bindings} />
      <DetailPanel tables={tables} />

      {/* 4 · THE RULES IT GOES BY — present exactly when the verb that
          promises it is on. A capability that is ON is an affordance
          where a person can act; one that is OFF is absent, and the
          switch above is where it comes back. */}
      {configures ? <ModuleRulesPanel module={module} tables={tables} /> : null}
    </div>
  )
}

/* ============================================================
   1 · WHAT MAY BE DONE HERE
   ============================================================ */

function Capabilities({
  module,
  states,
  onSet,
}: {
  module: ModuleDef
  states: ReturnType<typeof capabilityStates>
  onSet: (key: DesignerCapability, on: boolean) => void
}): ReactElement {
  return (
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">What may be done here</SectionHead>
      {/* THE MIDDLE SENTENCE DESCRIBED THE LIST UNDER IT. "What is
          switched on here is the whole of what this module can do —
          and it is the column list of Who may do what above" is a
          caption for two controls that are both on screen and both
          labelled. The consequence is not: switching a verb off
          reaches into every role that held it, and nothing on the
          screen shows that until it has happened. */}
      <p className="md-panel-say">
        Switching one off takes it from every role that holds it.
      </p>

      <ul className="md-caps">
        {states.map((c) => (
          /* ONE `<Card>` PER VERB. A refused verb takes the sunken tone
             — the well the primitive draws for a slot that holds
             nothing live — and says why beneath its switch. */
          <li key={c.key}>
          <Card tone={c.refused ? 'sunken' : 'flat'} pad="sm">
          <div className="md-stack">
            {/* `aria-disabled`, NOT `disabled`, AND THE SENTENCE
                BELOW IS THE REASON WHY. A refused verb carries
                `.md-cap-why` under this switch — the reason written
                at the moment of the decision, naming the column that
                is missing. `disabled` took the switch out of the tab
                order, so a person moving by keyboard skipped straight
                past both the control and its explanation: the refusal
                was drawn for people who could see that corner of the
                screen and for nobody else. The attribute keeps it
                reachable and `aria-describedby` hands the reason over
                on arrival.

                THE GUARD IS THE HANDLER, never the attribute —
                `aria-disabled` does not stop a click. `onSet` is not
                reached, so a refused verb cannot be switched on by
                pressing Enter on it.

                NOT ON THE `<li>`. Its `listitem` role does not
                support `aria-disabled` and the attribute would be
                dropped in silence; the refused card says so with its
                own ground (`.md-cap.is-refused`) instead. That exact
                mistake was made in `QuoteBuild.tsx` and found there
                the day before this. */}
            <button
              type="button"
              className="md-switch"
              role="switch"
              aria-checked={c.on}
              aria-disabled={c.refused !== undefined}
              {...(c.refused ? { 'aria-describedby': `md-cap-why-${c.key}` } : {})}
              aria-label={`${c.label} — ${c.says}`}
              onClick={() => {
                if (c.refused !== undefined) return
                onSet(c.key, !c.on)
              }}
            >
              <span className="md-switch-track" aria-hidden="true">
                <span className="md-switch-knob" />
              </span>
              <span className="md-cap-id">
                <span className="md-cap-label">{c.label}</span>
                <span className="md-cap-says">{c.says}</span>
              </span>
            </button>

            {/* THE REASON IS WRITTEN AT THE MOMENT OF THE DECISION.
                A greyed switch with no sentence sends an admin looking
                for a setting on the module, and the fix is a column on
                a table. */}
            {c.refused ? (
              <p className="md-cap-why" id={`md-cap-why-${c.key}`}>
                <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                {c.refused}
              </p>
            ) : c.note ? (
              <p className="md-cap-note">{c.note}</p>
            ) : null}
          </div>
          </Card>
          </li>
        ))}
      </ul>

      {module.capabilities.includes('browse') ? null : (
        <p className="md-panel-warn">
          <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          With browsing off this module lists nothing. The switch above is the way back.
        </p>
      )}
    </section>
    </Card>
  )
}

/* ============================================================
   2 · WHAT THIS PLACE LISTS
   ============================================================ */

const SHAPES: ReadonlyArray<{ key: ModuleIndexMode; label: string; says: string }> = [
  { key: 'rows', label: 'Rows', says: 'a dense list somebody scans' },
  { key: 'tiles', label: 'Tiles', says: 'a catalogue somebody shops, with pictures' },
]

function IndexPanel({
  module,
  bindings,
}: {
  module: ModuleDef
  bindings: TableBinding[]
}): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const updateModule = useProjectStore((s) => s.updateModule)
  const [adding, setAdding] = useState(false)

  const primary = bindings[0]?.entity
  const only = module.tableIds.length === 1

  /* WHICH FACE THE ROWS THEMSELVES ASK FOR — counted, not guessed off
     one table's column list. The control below still writes the stored
     field and an admin's choice still wins; this is the measurement
     that lets them make it. */
  const mine = useMemo(
    () => bindings.map((b) => b.entity).filter((e): e is EntityDef => e !== undefined),
    [bindings],
  )
  const face = useMemo(() => moduleFace(mine, rowsByEntity), [mine, rowsByEntity])

  /* AND HOW MANY HEADINGS A REGISTER WOULD FILE ITSELF INTO, so the
     Rows control can say what pressing it actually produces on THIS
     data rather than describing a list in the abstract. */
  const drawerCount = useMemo(() => {
    const listed = listedTables(module, entities)
    return categoryDrawers(buildEntries(listed, rowsByEntity), listed).length
  }, [module, entities, rowsByEntity])

  /* IS THIS ONE PLACE? See split.ts — the rule is that every table
     agrees on what sort of thing it holds, and that `custom` is the
     absence of a kind rather than a kind two tables can share. */
  const reading = useMemo(() => splitReading(module, entities), [module, entities])

  /* Every table on the sheet that could be a section of this index.
     A join is never offered: it is a relationship, not a place to
     stand, and it appears INSIDE a module as a related block. Tables
     of the picked table's own kind come first — those are the ones a
     brand-per-table workbook splits a catalogue across — and the rest
     follow, because nothing forbids a module that spans two kinds. */
  const taken = new Set(module.tableIds)
  const addable = Object.values(entities)
    /* and never a RETIRED one: a module is a place people are sent to
       browse, and history is not a place. The table stays on the
       sheet so an old quote written against it still resolves. */
    .filter((e) => canBeModuleMaster(e) && !isRetired(e) && !taken.has(e.id))
    .sort((a, b) => {
      const ak = a.kind === primary?.kind ? 0 : 1
      const bk = b.kind === primary?.kind ? 0 : 1
      return ak - bk || a.name.localeCompare(b.name)
    })

  const setTables = (next: string[]): void => {
    if (next === module.tableIds) return
    updateModule(module.id, { tableIds: next })
  }

  return (
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">What this place lists</SectionHead>

      {/* -- is this one place? --------------------------------- */}
      {reading.coherent ? null : (
        <p className="md-panel-warn">
          <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          {reading.say} Take one out with the × beside its name below — the table and its
          rows stay on the sheet — then give it its own card from the dashboard.
        </p>
      )}

      {/* -- the shape ------------------------------------------ */}
      {/* TWO `<Card>`s, ONE OF THEM `current`. The primitive draws
          the chosen one from `aria-current` — the accent line and the
          wash — so the look cannot exist without the announcement. */}
      <div className="md-shape" role="group" aria-label="How the list is drawn">
        {SHAPES.map((s) => (
          <Card
            key={s.key}
            tone="flat"
            pad="sm"
            current={module.index === s.key}
            label={`${s.label} — ${s.says}`}
            onActivate={() => updateModule(module.id, { index: s.key })}
          >
            <span className="md-shape-word">
              {module.index === s.key ? (
                <Check size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              ) : null}{' '}
              {s.label}
            </span>
            <span className="md-shape-say">{s.says}</span>
          </Card>
        ))}
      </div>

      {/* THE MEASUREMENT, NOT AN OPINION. This used to say only that no
          table declared a picture column, which is the right question
          asked of the wrong thing: a column existing is not the same
          fact as the rows carrying anything in it. `moduleFace` counts
          the rows and says what it counted. */}
      <p className="md-panel-say">
        {face.why}
        {module.index === 'rows' && drawerCount >= DRAWER_FLOOR
          ? ` These tables banner their rows under ${drawerCount.toLocaleString('en-AU')} headings, so the list opens onto those and one press narrows it to one of them.`
          : ''}
      </p>

      {/* AND WHAT ELSE WAS COUNTED, AND DID NOT GET A VOTE.
          DESIGN_CONTRACT §7: a surface that decides something for a
          person owes them the basis. Four signals were measured over
          this sheet before any of them was written into a rule —
          pictures, a price, the row count and how long the names run —
          and only the pictures separate a catalogue from a register.
          Parts & Accessories is 99% priced and is emphatically a
          register, so a price gets counted and then gets no vote. The
          whole reading is in `face.ts`; this is the half an admin
          standing in front of the control needs. */}
      {face.alsoCounted === '' ? null : (
        <p className="md-panel-say">{face.alsoCounted}</p>
      )}

      {module.index !== face.mode && face.live > 0 ? (
        <p className="md-panel-warn">
          <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          {module.index === 'tiles'
            ? 'This is set to tiles, so most faces here draw on plain paper. Your choice stands.'
            : 'This is set to rows, so the pictures these rows carry are not drawn. Your choice stands.'}
        </p>
      ) : null}

      {/* -- the sections, one per table ------------------------ */}
      <ul className="md-binds">
        {bindings.map((b, i) => (
          /* A TABLE THAT HAS GONE takes the sunken tone: the slot is
             empty, and the sentence beneath says so. */
          <li key={b.tableId}>
          <Card tone={b.entity ? 'flat' : 'sunken'} pad="sm">
          <div className="md-stack">
            <div className="md-bind-top">
              <span className="md-bind-mark">
                <TableKindSymbol kind={kindOf(b.entity?.kind)} size={ICON_SIZE.small} />
              </span>
              <span className="md-bind-name">{b.entity?.name ?? 'A table that has gone'}</span>
              <span className="md-bind-count mono-label">
                {b.rows} {b.rows === 1 ? 'row' : 'rows'}
              </span>
              {/* THE ENDS OF THE LIST DRAW NO ARROW: there is nothing
                  to move to, so there is no act to refuse. Taking the
                  last table out IS an act somebody may want, so that
                  one stays and says why it cannot be done. */}
              <span className="md-bind-acts">
                {i === 0 ? null : (
                  <Button
                    tone="ghost"
                    size="sm"
                    title="Move it up the list"
                    aria-label={`Move ${b.entity?.name ?? 'this table'} up`}
                    onClick={() => setTables(moveId(module.tableIds, b.tableId, -1))}
                  >
                    <ArrowUp size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  </Button>
                )}
                {i === bindings.length - 1 ? null : (
                  <Button
                    tone="ghost"
                    size="sm"
                    title="Move it down the list"
                    aria-label={`Move ${b.entity?.name ?? 'this table'} down`}
                    onClick={() => setTables(moveId(module.tableIds, b.tableId, 1))}
                  >
                    <ArrowDown size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  tone="danger"
                  size="sm"
                  /* A MODULE MUST KEEP ONE TABLE. Emptying it would
                     leave a card on the dashboard that opens onto
                     nothing, which is indistinguishable from a fault. */
                  title="Take it out of this module"
                  aria-label={`Take ${b.entity?.name ?? 'this table'} out of ${module.name}`}
                  refusedBecause={
                    only
                      ? 'A module is about at least one table — add another before taking this one out.'
                      : undefined
                  }
                  onClick={() =>
                    setTables(module.tableIds.filter((id) => id !== b.tableId))
                  }
                >
                  <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                </Button>
              </span>
            </div>

            {/* WHAT IT IS BOUND TO, IN WORDS. Each of these is
                resolved from the table's own columns, and each says
                "nothing" out loud rather than leaving a gap that
                reads as a rendering fault. */}
            {b.entity && isRetired(b.entity) ? (
              /* THE MODULE STILL NAMES IT AND THE INDEX STILL WILL
                 NOT DRAW IT. Said where the admin can act on it: the
                 fix is on the table, not on the module. */
              <p className="md-bind-facts md-bind-unmapped">
                <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                {b.entity.name} is history rather than stock, so this module lists nothing
                from it. Its rows stay on the sheet and a quote already naming one still
                opens.
              </p>
            ) : b.entity ? (
              <p className="md-bind-facts mono-label">
                <Bound word="Named by" value={b.label?.name} none="its first column" />
                <Bound
                  word="Picture"
                  value={b.image?.name}
                  none="no picture column"
                />
                <Bound
                  word="Price"
                  value={b.price?.label}
                  none="nothing marked as a price"
                />
              </p>
            ) : (
              <p className="md-bind-facts md-bind-unmapped">
                <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                This table is no longer on the sheet, so this module lists nothing from it.
              </p>
            )}
          </div>
          </Card>
          </li>
        ))}
      </ul>

      {/* -- add a table ---------------------------------------- */}
      {adding ? (
        <Card tone="sunken" pad="sm">
          <div className="md-stack" role="group" aria-label={`Add a table to ${module.name}`}>
            <SectionHead
              level="none"
              action={
                <Button tone="ghost" size="sm" aria-label="Close" onClick={() => setAdding(false)}>
                  <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                </Button>
              }
            >
              {primary?.kind
                ? `Which table also belongs here? Your ${kindPlural(kindOf(primary.kind))} first.`
                : 'Which table also belongs here?'}
            </SectionHead>
            {addable.length === 0 ? (
              <p className="md-panel-say">
                Every other table on the sheet is already in this module.
              </p>
            ) : (
              <ul className="md-add-list">
                {addable.map((e) => (
                  <li key={e.id}>
                    <Row
                      dense
                      lead={<TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.small} />}
                      name={e.name}
                      meta={<span className="md-figure">{(rowsByEntity[e.id] ?? []).length}</span>}
                      onActivate={() => {
                        setAdding(false)
                        setTables([...module.tableIds, e.id])
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : (
        <Button
          tone="ghost"
          glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
          onClick={() => setAdding(true)}
        >
          Add a table to this list
        </Button>
      )}

      {/* A VISIBLE STUB, NOT A SILENT GAP. The face of a row or a tile
          is the name, the picture and the price; pointing a module at a
          DIFFERENT picture or price column, or putting extra columns on
          the face, needs a field on the module to remember the choice
          and the contract has none. Drawn refused and said out loud,
          with the thing an admin can actually do today — which is
          exactly the shape `<Button refusedBecause>` exists for: the
          control stays reachable and the reason is beneath it. */}
      <Button
        tone="neutral"
        refusedBecause="Not built yet. Column order and prices are set on the table itself, and every module follows."
      >
        Choose the face
      </Button>
    </section>
    </Card>
  )
}

/** One resolved binding, or the word for having none. NEVER a blank:
 *  a gap where a column name should be is read as a fault, and a
 *  plausible-looking column name nobody chose is worse. */
function Bound({
  word,
  value,
  none,
}: {
  word: string
  value: string | undefined
  none?: string
}): ReactElement | null {
  if (!value && !none) return null
  return (
    <span className={`md-bound${value ? '' : ' is-none'}`}>
      <span className="md-bound-word">{word}</span>
      {value ?? none}
    </span>
  )
}

/* ============================================================
   3 · WHAT ONE ITEM SHOWS
   ============================================================ */

function DetailPanel({
  tables,
}: {
  tables: EntityDef[]
}): ReactElement {
  const [wanted, setWanted] = useState<string | null>(null)

  /* A MODULE SPANNING SEVEN BRANDS HAS SEVEN ITEM PAGES, not one.
     Each table keeps its own columns, its own hierarchy and its own
     related blocks, and `ModuleStage` opens a clicked row against the
     page of the table it actually came from — so this designer edits
     that same page and never the primary's page on a sibling's rows. */
  const chosen = tables.find((t) => t.id === wanted) ?? tables[0]

  return (
    <Card tone="flat" pad="md">
    <section className="md-panel">
      <SectionHead level="h3">What one item shows</SectionHead>

      {tables.length === 0 ? (
        <p className="md-panel-say">
          There is no table left in this module, so there is no item page to set up.
        </p>
      ) : (
        <>
          {tables.length > 1 ? (
            <>
              {/* NO SENTENCE ABOVE THE TABS. "Each table keeps its own
                  item page" is what a row of table-named tabs under
                  the heading "What one item shows" already is. */}
              <div className="md-tabs" role="group" aria-label="Which item page">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`md-tab${t.id === chosen.id ? ' is-on' : ''}`}
                    aria-pressed={t.id === chosen.id}
                    onClick={() => setWanted(t.id)}
                  >
                    <TableKindSymbol kind={kindOf(t.kind)} size={ICON_SIZE.tiny} />
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <ItemPage key={chosen.id} entity={chosen} />
        </>
      )}
    </section>
    </Card>
  )
}

function ItemPage({ entity }: { entity: EntityDef }): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const [adding, setAdding] = useState(false)

  /* IDEMPOTENT BY CONTRACT, and safe inside a render — the registry
     publishes its snapshot synchronously and notifies on a microtask
     for exactly this call (`viewDefs.ts:28-32`). It is also the same
     call `ViewStage` makes when a row is opened, so the page edited
     here is the page that opens. */
  const made = createViewFor(entity.id)
  const view: ViewDef = useViewDef(made.id) ?? made

  const bindings = blockBindings(view, entities)

  const taken = new Set(view.blocks.map((b) => b.tableId))
  const addable = Object.values(entities)
    /* AN ITEM PAGE IS A PAGE A CUSTOMER READS, so a retired table is
       never offered as something that goes with this one. */
    .filter(
      (e) => e.role !== 'join' && e.id !== entity.id && !taken.has(e.id) && !isRetired(e),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <ul className="md-blocks">
        {bindings.map((b, i) => (
          <BlockRow
            key={b.block.id}
            viewId={view.id}
            view={view}
            source={entity}
            binding={b}
            first={i === 0}
            last={i === bindings.length - 1}
          />
        ))}
      </ul>

      {bindings.length === 0 ? (
        <p className="md-panel-say">
          Nothing goes with {entity.name} yet — an item opens onto its own name, picture and
          specs alone.
        </p>
      ) : null}

      {adding ? (
        <Card tone="sunken" pad="sm">
          <div
            className="md-stack"
            role="group"
            aria-label={`Add a list to the ${entity.name} item page`}
          >
            <SectionHead
              level="none"
              action={
                <Button tone="ghost" size="sm" aria-label="Close" onClick={() => setAdding(false)}>
                  <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                </Button>
              }
            >
              What else goes with one of these?
            </SectionHead>
            {addable.length === 0 ? (
              <p className="md-panel-say">Every other table is already on this page.</p>
            ) : (
              <ul className="md-add-list">
                {addable.map((e) => (
                  <li key={e.id}>
                    <Row
                      dense
                      lead={<TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.small} />}
                      name={e.name}
                      onActivate={() => {
                        setAdding(false)
                        /* NO RULE IS INVENTED HERE. An existing join is
                           adopted, and the block arrives curated — showing
                           only what somebody picks on an item's own page.
                           Guessing a rule from column shapes is what
                           `suggest.ts` deliberately only OFFERS, on the
                           page, with the sentence and the three buttons. */
                        const join = findJoinTable(entities, entity.id, e.id)
                        addBlock(view.id, null, {
                          tableId: e.id,
                          ...(join ? { joinTableId: join.entityId } : {}),
                          rule: curatedOnly(),
                        })
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="md-panel-say">
              It arrives empty and curated: nothing is shown until somebody picks it on an
              item’s own page, where the rule can be offered against the two tables.
            </p>
          </div>
        </Card>
      ) : (
        <Button
          tone="ghost"
          glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
          onClick={() => setAdding(true)}
        >
          Add a list to this page
        </Button>
      )}
    </>
  )
}

function BlockRow({
  viewId,
  view,
  source,
  binding,
  first,
  last,
}: {
  viewId: string
  view: ViewDef
  source: EntityDef
  binding: BlockBinding
  first: boolean
  last: boolean
}): ReactElement {
  const [open, setOpen] = useState(false)
  const { block, target, columns, missing } = binding

  const toggle = (fieldId: string): void => {
    const next = columns.includes(fieldId)
      ? columns.filter((c) => c !== fieldId)
      : [...columns, fieldId]
    updateBlock(viewId, block.id, { columns: next })
  }

  return (
    <li>
    <Card tone={target ? 'flat' : 'sunken'} pad="sm">
    <div className="md-stack">
      <div className="md-bind-top">
        <span className="md-bind-mark">
          <TableKindSymbol kind={kindOf(target?.kind)} size={ICON_SIZE.small} />
        </span>
        <span className="md-bind-name">{target?.name ?? 'A table that has gone'}</span>
        <span className="md-bind-acts">
          {first ? null : (
            <Button
              tone="ghost"
              size="sm"
              title="Move it up the page"
              aria-label={`Move ${target?.name ?? 'this list'} up`}
              onClick={() => moveViewBlock(view, block.id, -1)}
            >
              <ArrowUp size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            </Button>
          )}
          {last ? null : (
            <Button
              tone="ghost"
              size="sm"
              title="Move it down the page"
              aria-label={`Move ${target?.name ?? 'this list'} down`}
              onClick={() => moveViewBlock(view, block.id, 1)}
            >
              <ArrowDown size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            </Button>
          )}
          <Button
            tone="danger"
            size="sm"
            /* Nothing is deleted: the join and every pair on it stay
               where they are, so putting the list back brings all of
               it with it. Same promise `BlockCard` already makes. */
            title="Take this list off the item page — nothing picked is lost"
            aria-label={`Take ${target?.name ?? 'this list'} off the page`}
            onClick={() => removeBlock(viewId, block.id)}
          >
            <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </Button>
        </span>
      </div>

      {!target ? (
        <p className="md-bind-facts md-bind-unmapped">
          <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          The table this list showed is no longer on the sheet. Take it off, or put the
          table back.
        </p>
      ) : (
        <>
          <p className="md-bind-facts mono-label">
            <span className="md-bound">
              <span className="md-bound-word">Shows</span>
              {summariseRule(block.rule, source, target)}
            </span>
            <span className={`md-bound${columns.length === 0 ? ' is-none' : ''}`}>
              <span className="md-bound-word">Columns</span>
              {columns.length === 0
                ? 'names only'
                : `${columns.length - missing.length} of ${columnCandidates(target).length}`}
            </span>
          </p>

          {/* BOUND vs UNMAPPED, WHERE THE BLOCK STANDS. A column struck
              from the table leaves a heading with nothing under it; the
              block says which, and offers the one-press repair. */}
          {missing.length > 0 ? (
            <p className="md-bind-unmapped">
              <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {missing.length === 1
                ? 'One column this list shows was deleted from '
                : `${missing.length} columns this list shows were deleted from `}
              {target.name}.
              <Button
                tone="ghost"
                size="sm"
                onClick={() =>
                  updateBlock(viewId, block.id, {
                    columns: columns.filter((c) => !missing.includes(c)),
                  })
                }
              >
                Drop {missing.length === 1 ? 'it' : 'them'}
              </Button>
            </p>
          ) : null}

          <Button tone="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? 'Done with columns' : 'Which columns it shows'}
          </Button>

          {/* THE VOCABULARY IS THE TABLE'S OWN COLUMNS, read from
              FieldDef with its type. Nothing here is a literal list,
              which is the mistake that killed the designer this one
              replaces (MODULE_SYSTEM §4, rule 2). */}
          {open ? (
            <ul className="md-cols">
              {columnCandidates(target).map((f) => {
                const on = columns.includes(f.id)
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`md-col${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(f.id)}
                    >
                      <span className="md-col-tick" aria-hidden="true">
                        {on ? <Check size={11} weight="bold" /> : null}
                      </span>
                      <span
                        className="md-col-type mono-label"
                        style={{ color: FIELD_TYPES[f.type].cssVar }}
                        title={FIELD_TYPES[f.type].label}
                      >
                        {FIELD_TYPES[f.type].tag}
                      </span>
                      <span className="md-col-name">{f.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      )}
    </div>
    </Card>
    </li>
  )
}
