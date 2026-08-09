# THE CONFIGURATOR — product reset

> *"We are supposed to be taking a complicated thing and making it super super
> easy."*

The previous build asked people to design a database. This one asks them what
they sell. **Domain knowledge does the work.** A user never sees the words
entity, schema, field type, or reference.

Everything already built stays in the repo and keeps working — the formula
engine, the rule engine, the reviewer, the table editing core. What changes is
what the app *asks the user to do*.

---

## 1. The flow

```
  Create organisation  →  Pick industry  →  Configurator
       (name it)          (Marine only)     (tables on a sheet)
```

### 1a. Create organisation
One screen. One input: the organisation's name. One primary action. Nothing
else on screen. This is the first thing anyone ever sees, so it carries the art
direction completely — the navy blueprint field with the white instrument card
centred on it.

### 1b. Pick industry
Four choices as large cards, each with its own symbol:
**Marine** (live) · **Automotive** · **Motorcycles & ATVs** · **Other**

Only Marine is built. The other three render as designed cards marked
`COMING SOON`, visibly unavailable — not hidden, not broken, not clickable into
a dead end. Picking Marine goes straight to the configurator.

### 1c. Configurator
The blueprint sheet, with the organisation's name and industry in the title
block. Empty state invites the first table.

---

## 2. Tables, not entities

**The canvas draws TABLES by default.** Not schema cards, not ERD boxes. A
table on the sheet shows its type symbol, its name, its columns and its rows,
and you edit the data in place. There is no separate "data view" to switch to.

### Creating a table
Two ways, both landing in the same place:
- **+ CREATE TABLE** button in the left panel.
- **Drag a table type** from the left panel onto the sheet — it lands where
  you drop it.

### The two questions
A short, calm sheet-style dialog. **Two steps, nothing more.**

**Step 1 — What kind of table is this?**
Cards with symbols:

| Kind | Symbol | What it holds |
|---|---|---|
| `boat` | hull profile | The boats you sell |
| `motor` | outboard | Engines |
| `trailer` | trailer frame | Trailers |
| `accessory` | tag | Parts and add-ons |
| `package` | stacked bundle | Boat + motor + trailer sold as a rig |
| `dealer` | map pin | Dealers / locations |
| `custom` | blank sheet | Anything else |

> **CORRECTION FROM GROUND TRUTH** (see `HELMLOGIC_GROUND_TRUTH.md` §1.1).
> Level *count* and level *name* are **per-table properties. There is no
> universal "Range".** The real production data proves it: boats run
> Brand ▸ Range ▸ Model ▸ Variant (4 levels), trailers run
> Brand ▸ Series ▸ Trailer (3), and motors have no taxonomy level at all.
> Therefore the structure step must offer presets as a **starting point you
> can edit**, not a fixed menu: each level's name is editable inline, and
> levels can be added or removed before creating. A dealer whose middle level
> is called "Series" — or "Family", or "Platform" — must not be forced to call
> it Range. This is the single most important correction to this spec.

**Step 2 — How is it structured?**
Structure presets per kind, shown as visual chains (`Brand ▸ Range ▸ Model`),
each with a one-line plain-English caption and a tiny preview of the resulting
nesting. Defaults:

- **boat** — `Brand ▸ Range ▸ Model` *(default)* · `Brand ▸ Model` ·
  `Brand ▸ Range ▸ Model ▸ Variant` · `Flat list`
- **motor** — `Brand ▸ Range ▸ Model` *(default)* · `Brand ▸ Model` · `Flat list`
- **trailer** — `Brand ▸ Model` *(default)* · `Brand ▸ Range ▸ Model` · `Flat list`
- **accessory** — `Category ▸ Product` *(default)* ·
  `Category ▸ Sub-category ▸ Product` · `Flat list`
- **package** — `Flat list` *(default)* · `Brand ▸ Package`
- **dealer** — `Region ▸ Dealer` *(default)* · `Flat list`
- **custom** — `Flat list` only; the user adds their own columns

Then the table appears on the sheet, already carrying the right columns.

### What a kind ships with
Each kind provides its hierarchy columns **plus** sensible detail columns, so a
new table is immediately useful and never empty-looking:

- **boat** — Length ft, Weight kg, Min HP, Max HP, Price
- **motor** — HP, Weight kg, Shaft, Price
- **trailer** — Max Load kg, Max Length ft, Axles, Price
- **accessory** — SKU, Price, In Stock
- **package** — Boat, Motor, Trailer (links, when those tables exist), Price
- **dealer** — Suburb, State, Phone
- **custom** — Name only

Detail columns are ordinary columns: renameable, removable, addable.

---

## 3. How a structured table is drawn

Structure is **grouping, not separate tables**. One table holds the rows; the
hierarchy nests them.

```
▾ HIGHFIELD                                    12 models
   ▾ Ocean Master                               4 models
       540        5.4    780    70    115   $32,400
       590        5.9    900   130    175   $41,900
   ▸ Patrol                                     5 models
▸ ZODIAC                                         8 models
```

- Group rows show the level's value, a count of what's inside, and collapse.
- Leaf rows show the remaining detail columns and are directly editable.
- **Adding a row inside a group pre-fills that group's values** — adding a
  model under Highfield ▸ Ocean Master fills Brand and Range for you. This is
  the single biggest reason the hierarchy exists; it must feel effortless.
- Collapsed/expanded state is per table, remembered in the session.
- A `Flat list` table renders as a plain table with no grouping.
- Changing a group value on a leaf row moves it to the correct group.

### Model additions (`src/types/model.ts`)
```ts
export type TableKind = 'boat'|'motor'|'trailer'|'accessory'|'package'|'dealer'|'custom'
export type IndustryKey = 'marine'|'automotive'|'motorcycle'|'other'

export interface OrgProfile { name: string; industry: IndustryKey; createdAt: string }

// on EntityDef:
kind?: TableKind          // drives symbol + presets; absent = custom
hierarchy?: string[]      // ordered fieldIds forming the grouping levels
```
Rows stay flat (`RowData` unchanged) — grouping is a pure view transform, so
nothing about storage, export, formulas or rules changes.

`OrgProfile` lives on `ProjectMeta` so it persists and exports with the project.

---

## 3-zero. ONE TABLE PER BRAND — the kind is the type, the table is the brand

> *"all boat brands have been put in and not just highfield… each brand is in
> its own table - same for trailers - each trailer brand in it's own table but
> we know its of type trailer"*

**A `boat` table is one brand's catalogue.** Highfield, Stacer, Stabicraft,
Surtees, Jeanneau, Haines Signature and Formosa are **seven separate tables**
that all share `kind: 'boat'`. Trailers likewise: REDCO, Dunbier, Mackay, GFAB,
Tinka and NSM Custom are separate `trailer` tables.

**This is what the source data demands, not a preference.** The Boat Module
carries **eight brand-specific header rows re-labelling the same grid**,
because the same physical column means different things per brand:

| Column | Stacer | Highfield |
|---|---|---|
| I | Depth (Mtr) | Tube Dia. |
| K / L / M | LOA inc Engine / LOA on Trailer / HOT | Int Length / Int Width / Deadrise |
| P / Q | Hull Weight (Dry) / Max Main Motor Weight | Max Load / Max People |
| S / T / U | Bottomsides / Topsides / Transom plate | Boat Weight / Air Chambers / *(absent)* |

Merging those into one table forces exactly the untyped, meaning-drifting
column soup this product exists to replace. Separate tables let each brand
carry its own honest columns.

### Therefore: Brand is NOT a hierarchy level
The table **is** the brand, so a brand column would repeat identically on every
row. Levels start below it — `Series ▸ Model ▸ Variant` for a boat brand,
`Series ▸ Model` for a trailer brand. (Levels remain renameable and
addable per table, per §3c.)

### The KIND is what makes rules work across brands
A fitment rule is written once against `boat` and applies to **every** boat
table whatever its columns are called. That is the whole reason `TableKind`
exists as a type separate from the table itself: it is the join between a rule
and the tables it governs.

### Consequences for seeding
The Northside set must carry **every brand in the Boat Module**, one table
each, with that brand's own columns — not a single Boats table with a Brand
column. Same for trailers. Row counts from the source: Highfield 7 series / 85
models / 640 variants · Stacer 10 / 91 / 91 · Stabicraft 7 / 40 / 37 ·
Jeanneau 8 / 48 / 27 · Surtees 5 / 21 / 19 · Formosa 1 / 39 / 39 ·
Haines Signature 1 / 9 / 9.

## 3a. Tables are INDEPENDENT — base, join, view

> *"the tables are supposed to be independent and then the rules dictate the
> view tables and join tables to show a relationship which can be sold and
> therefore quoted on. so only boat stuff should be available to be seen in a
> boat table but in the separate view we can see the other stuff that relates
> to it."*

This is the load-bearing rule of the whole model. Three roles, never conflated:

### `base` — one subject, only that subject
A **Boats** table holds boat columns: brand, range, model, variant, length,
weight, HP envelope, its own prices. It has **no motor column and no trailer
column**, because a motor is not a property of a boat. Same for Motors,
Trailers, Parts. A base table is pure and independently useful.

**Only relevant columns.** When seeding from the workbooks, a Boats table takes
the boat-relevant fields — not the whole 678-column MPF row. Motor columns go
to Motors, trailer columns to Trailers, option columns to Parts.

### `join` — the declared relationship, plus what belongs to the pairing
**Boat × Motor** carries the rigging kit, the prop part number, the engine hole
and *recommended* — none of which is a fact about the boat alone or the motor
alone. They are facts about **that motor on that boat**. That is what a join
table is for, and it is exactly the 13-slot menu the MPF already encodes.

Joins are ordinary tables (reference columns + their own columns), so they get
grouping, sections, live editing and rules for free.

### `view` — the sellable thing
A stock rig — this hull, that motor, that trailer, one price — is a **view**,
assembled from base tables through joins.

**Critical:** the MPF brand sheets *look* like tables and are not. A row reading
`N014458 | Highfield - SP560 (HYP) B-W-C | Yamaha - F115XB | REDCO ... TA600-MOB | 89,495`
is a view: three cross-workbook lookups and a rolled-up price. Importing it as
a table would recreate the very problem we are replacing — free-text columns
about other subjects living on one row, joined by string matching.

**Import rule:** split a brand-sheet row into its base rows, express the
associations as join rows, and present the original row as a view.

### What this buys
- A boat is edited once, in one place, with only its own fields in front of you.
- The same motor is reused across every boat that takes it, with the pairing's
  specifics (rigging, prop) held on the join where they belong.
- A rename can never orphan a link, because links are ids, not strings.
- The quote reads the view; the view reads the joins; the joins reference the
  base tables. One direction, no duplication.

## 3b. Column sections — reading a wide table as blocks

> *"a section within a table could be pricing and then you could have all the
> pricing columns but then visually you see its all like that"*

A real price file is 40 columns wide. Reading it as one undifferentiated run is
hopeless. **Sections** are named bands of columns:

```
            │        DIMENSIONS         │            PRICING             │
  MODEL     │ Length  Beam   Weight     │  Cost    MU%    Sell ex   RRP  │
  ─────────────────────────────────────────────────────────────────────────
  CL380     │  12.5    1.9      320     │  2,313   28%     2,960   3,256 │
```

- `ColumnSection { id, name, accent?, collapsed? }` on `EntityDef.sections`;
  each `FieldDef` carries `sectionId?`. A section is the run of consecutive
  columns sharing its id — order comes from the existing field order, so there
  is no second ordering to keep in sync.
- Rendered as a **spanning header row above the column headers**, in the
  section's ink, with a hairline bracket beneath it grouping its columns.
- **Collapsible.** Collapsing Pricing hides its columns and leaves a single
  chip (`PRICING · 4`) — so you can work on specs without 12 money columns in
  the way, and open them again in one click. Collapsed state persists per table.
- Columns with no `sectionId` sit outside any band, drawn plainly.
- Creating a section: select columns → NEW SECTION, or add a column directly
  into an existing band. Renaming and recolouring from the section header menu.
- Sections are cosmetic-plus-navigational only: they never change storage,
  export, formulas or rules.

Kinds ship with sensible sections — e.g. a Boats table opens with its detail
columns already banded into **Dimensions** and **Pricing** — so a new table
demonstrates the idea without the user having to discover it.

## 3c. Define your own tables and structures

> *"we need to be able to give people the ability to define their own tables and
> table structures"*

Presets are a **starting point, never a cage**:
- Every structure level is renameable inline, at creation and afterwards.
- Levels can be added or removed at any time — including turning a flat table
  into a grouped one, or deepening Brand ▸ Model into Brand ▸ Range ▸ Model.
  Adding a level adds a column and regroups; removing one flattens that level
  and leaves its column as an ordinary column (data is never destroyed).
- The `custom` kind starts empty and is built entirely by the user: name it,
  add levels, add columns, add sections.
- A user-defined table is a first-class citizen — same symbol treatment (pick
  any icon), same grouping, same sections, same everything. Nothing about the
  seven built-in kinds is privileged beyond having sensible defaults.

## 4. Live editing — the whole point

On the sheet, in the table, with no modal:
- Click a cell, type, done. Enter commits and moves down.
- **+ ROW** at the bottom of a table, and **+ ROW** inside any group.
- **+ COLUMN** at the right edge of the header: name it, pick a type from a
  short plain-language list (Text · Number · Yes/No · Date · Choice · Link ·
  Calculated), done.
- Rename a column by clicking its header. Remove from its menu.
- Tables are draggable and resizable on the sheet; positions persist.
- Everything auto-saves. No save button.

Keyboard, paste from Excel, sort/filter/search all keep working — they already
do, and that machinery is reused rather than rewritten.

---

## 4b. Business rules are EDITABLE ENGLISH SENTENCES

> Adopted from the mockup — see `MOCKUP_FINDINGS.md`. This **replaces the
> flow-chart rule builder on the default path.**

A rule reads as one sentence, and every underlined word is a control:

```
When  Water  is  Salt ,   Prop material  must be  Stainless steel
      └─────┘ └──┘ └────┘  └────────────┘ └──────┘ └─────────────┘
       field   op   value      field         op         value
```

- **The sentence IS the editor.** There is no second representation, no
  canvas, no nodes, no handles, no palette. Collapsed it is read-only prose;
  open it, and the same words become dropdowns in place.
- **Operators are English**: `is` · `is not` · `is at least` · `is at most` ·
  `is more than` · `is less than` · `has been chosen` · `is one of`. On the
  right-hand side they take obligation voice — `must be`, `must be at least`.
- **Write a new rule** with the same sentence, six dropdowns and one button:
  *"It reads as a sentence, and it takes effect the moment you add it."*
- **Rules toggle off, they are never deleted** — the experiment is reversible
  and the authoring survives. Cards carry live state: `ACTIVE NOW` when the
  rule is currently firing, plus `CONFLICT`, `OFF`, `EDITED`.

### Ask why — an unavailable option explains itself

**A blocked option is never hidden.** It stays exactly where it was, struck
through in red pencil, carrying a short lower-case clause written to read
after "because":

> ~~Tiller~~  · because a tiller cannot safely handle more than 25 horsepower

Clicking it opens the why panel: the lead sentence, **the responsible rule as
its own English sentence**, where it came from, and two actions — **Turn this
rule off** (re-solves instantly, the option returns) and **Edit this rule**.

The reason is recorded at the *moment of removal*, never reconstructed —
`ConstraintDef.because` + `BlockedValue` in `model.ts`. A hidden option is a
dead end; an explained one is a conversation.

### After every choice, say what happened
A plain-English change note: *"Settled prop material to Stainless steel, and
ruled out Aluminium for blades, plus 2 more."* Empty string when there is
nothing worth saying.

### Constraints run both ways
Picking a 300 hp motor first must narrow the **hull** list, not just the other
direction. The contrapositive is not a bonus feature; it is what makes the
tool feel like it understands the product. Lives in a new
`src/lib/configure/` — arc-consistency propagation over finite domains —
beside (not inside) `src/lib/rules/`, which answers a different question.

## 5. What gets hidden

Kept in the codebase and working, but **off the default path**:
- The ERD / relationship canvas and its layer switcher.
- The rule builder canvas, palette and flow plates.
- The red-pencil review panel as a rail.

The reviewer survives as **quiet inline hints** only (a small mark on a column
that needs attention, with the plain-language why on hover) — no rail, no
score, no marks count in the title block.

Fitment rules return later as a plain-language step ("which motors fit which
boats"), built on the existing rule engine. Not in this pass.

Nothing is deleted. Anything removed from the default path stays reachable in
code so it can be reintroduced deliberately.

---

## 6. Art direction

**See `ART_DIRECTION.md` — it supersedes everything previously written here.**

Headline: the direction is **THE DRAWING OFFICE** — the industry-neutral
language of technical product documentation. Marine is the first industry
built, **not** the theme. Nautical metaphors (hulls, compass roses, ship's
wheels, "chart room", "helm" as a metaphor) are BANNED from the frame; a
motorcycle dealer must never feel they are using a boat tool.

Industry-specific beauty is confined to the industry and table-kind symbols.
Everything around them stays neutral: hairlines, dimension marks, registration
ticks, spec-plate framing, mono annotation.

Typography is now three faces — **Instrument Serif** for display moments only,
**Archivo** for UI, **IBM Plex Mono** for all data. Motion uses the `motion`
library with spring physics, one orchestrated moment per screen, and nothing
moving while the user is working.

**Symbols are new and matter.** Each table kind needs a crisp line-drawn glyph
(hull profile, outboard, trailer frame, tag, bundle, pin, blank sheet) in the
kind's accent ink, drawn as inline SVG at 1.25px stroke to match the hairline
language. They appear on the table header, on the type-picker cards, and in the
left panel. They are how a user identifies a table at a glance.

## 6b. Starting data — REAL, or none at all

### Where data comes from — one source only

**The Excel workbooks are the ONLY data source.** The four Modules (Boat,
Motor, Trailer, Parts) plus `MASTER PRICE FILE.xlsx`.

**The HelmLogic application is NOT a data source.** Its contents are a lossy
derivation of those same workbooks — imported by column position, per-brand
re-labelled, quarantined, and repaired by script three times over. Reading a
price or a spec out of it would launder a copy-of-a-copy into our tables.

Use `HELMLOGIC_GROUND_TRUTH.md`, `QUOTE_FINDINGS.md` and `CONFIG_FINDINGS.md`
for **structure and lessons only** — level names, patterns worth adopting,
mistakes to avoid. Never for values.

Rule for every seed row: **traceable to a cell**, or the cell stays empty.


> *"I dont want demo mode anymore please. Unless you are able to do it with like
> a sport 560 highfield from the actual dataset and stuff and all of the other
> stuff associated to it."*

**Invented sample data is banned.** The `fitment` demo (made-up Highfield /
Yamaha / Redco figures) and the `dealership` demo are both retired and must be
removed from every offered choice. There are exactly two ways to start:

1. **An empty sheet** — name the organisation, pick Marine, build your own
   tables. This is the default and the honest one.
2. **Northside Marine (real)** — seeded from the actual Master Price File
   workbooks: the genuine Highfield **Sport 560** with its real variants, SKUs,
   colours, dimensions and prices; the real Yamaha motors that fit it; the real
   trailers that carry it; the real parts associated with it. **Every number
   traceable to a cell in the source workbook.** Where the source has no value,
   the cell stays empty — nothing is invented to fill a gap. Lives in
   `src/demos/northside.ts`, documented with the workbook and sheet each table
   came from.

## 7. Definition of done

A person who has never seen the app can, without help or documentation:
name their organisation, choose Marine, create a Boat table structured
Brand ▸ Range ▸ Model, type in three boats across two brands, add a column, and
see their data nested correctly — and at no point encounter the words entity,
schema, field, or reference.
