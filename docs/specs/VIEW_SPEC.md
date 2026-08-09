# VIEWS — the configurable page

> *"i can't stress enough how easy this system has to be to use"*

Everything below is judged against that sentence. If a step needs explaining,
it is wrong.

## What a view is

A **view** answers one question: *"for this thing, what else can go with it?"*

For a boat: which motors fit, which trailers carry it, which accessories suit
it. That is the page a salesperson lives on, and the thing a quote is built
from. It reads off the base tables through joins — it never stores its own copy
of anything.

## The one mental model

> **The rule proposes. The human disposes.**

That single sentence is the whole feature. A rule suggests what belongs; a
person keeps, removes or adds. Nobody has to author a rule to get value, and
nobody is ever stuck with what the rule decided.

Learned from production: their curated 13-slot motor menu is primary and the
HP envelope is only the fallback — *the business's opinion outranks the
computed answer*. We keep both, and make the override the easy part.

## The page

```
┌────────────────────────────────────────────────── ⚙ ──┐
│  ▾ HIGHFIELD  ▸ Sport Series                          │
│     SPORT 560            5.66 m · 581 kg · 90–115 HP  │
│     ┌───────────────────────────────────────────────┐ │
│     │ MOTORS          6 fit · 1 removed · 1 added   │ │
│     │  ✓ Yamaha F90XB      90 HP   XL    $14,190    │ │
│     │  ✓ Yamaha F115XB    115 HP   XL    $17,640    │ │
│     │    …                                          │ │
│     └───────────────────────────────────────────────┘ │
│     ┌───────────────────────────────────────────────┐ │
│     │ TRAILERS        2 fit                         │ │
│     └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

Read mode is the default and is **completely clean** — no handles, no chrome,
no affordances. Just the boat and what goes with it.

## The settings button — one control, top right

A single ⚙ in the top-right corner flips the page into **configure mode**.

Configure mode does **not** open another screen. It reveals handles on what is
already in front of you:
- each related block grows a header strip (rule · filter · remove)
- an empty drop target appears at the bottom: *"drag a table here"*
- rows grow a ✓/✗ toggle so you can keep or drop individual items

Leaving configure mode returns to the clean page. **The user never leaves the
page they are configuring**, and never sees a form that represents it.

## Adding a related table — drag it in

Drag **Motors** from the left panel onto the view. That is the whole gesture.

On drop, we look at both tables and **offer a rule in plain English**, because
we can see Boats has `Min HP` / `Max HP` and Motors has `HP`:

> **Show motors where HP is between this boat's Min HP and Max HP.**
> `[ Use this ]  [ Show all motors ]  [ Pick a different rule ]`

- Accept and it just works — one click, no rule editor.
- Decline and every motor shows; narrow it later if ever.
- The suggestion is a **guess offered**, never a rule silently applied.

Suggestion rules, in priority order:
1. A `reference` column already links the two tables → use it.
2. A numeric range pair on one side matching a single numeric on the other
   (`Min X`/`Max X` vs `X`) → the between-rule above.
3. Matching column names on both sides → equality.
4. Nothing found → *"Show all motors"* plus an offer to pick two columns.

## Nesting — drag onto what is already there

Drag **Accessories** onto the **Motors** block (not onto the page) and it nests
under each motor. Same suggestion flow. Depth is capped at **three** levels
(boat → motor → accessory); a deeper drop is refused with a plain sentence, not
a silent no-op.

## Curation — keep, remove, add

Per row, in configure mode:
- **✗ Remove** — this motor never shows for *this boat*. Removed items collapse
  into a `1 removed` chip that reopens to restore them. Nothing is deleted.
- **+ Add** — search the full Motors table and pin one in, even if the rule
  excludes it. Added items show a small `added` tick so it is obvious why an
  out-of-range motor is there.
- **Recommend** — star one as the default (the MPF's slot 1). At most one.
- **Reorder** — drag rows; order is the order the salesperson sees.

Every override is scoped to **the row you are on** — this boat, not all boats —
which is the "very very dynamic, per model" requirement. An override made at
the *Model* level cascades to its variants unless a variant overrides it in
turn; the header says which level you are editing, always.

**Many motors per boat is the default**, not a special case. A boat has as many
motors as survive the rule plus whatever was added — 2, 4, ten. The count chip
says `6 fit · 1 removed · 1 added`, so the arithmetic is never a mystery.

## Filter and search — the same controls as the table

The block header carries the table's own search and filter. Filtering a block
is a **view setting**, not a rule: it changes what this page shows without
touching the join. Two different things, never conflated:
- **rule** = what is *related* (structural, stored on the join)
- **filter** = what is *shown right now* (cosmetic, stored on the view)

## Where it is stored

- The join rows (boat ↔ motor, with rigging kit / prop / recommended as
  columns on the join) live in a **join table** — an ordinary table, editable
  in the grid like any other. The view is a lens on it.
- Removals and additions are **join rows** too: a removed pair is a join row
  flagged excluded, not an absence. That way "why is this missing?" is always
  answerable, and restoring is one click.
- The view's own config (which tables, in what order, filters, layout) lives on
  a `ViewDef` — see the model note below.

## Model additions (orchestrator writes these)

```ts
export interface ViewBlock {
  id: string
  tableId: string            // the related table
  joinTableId?: string       // the join carrying the pairs
  rule?: ClauseGroup         // what is related; absent = show all
  filters?: ColumnFilter[]   // what is shown (cosmetic)
  columns?: string[]         // which columns to show, in order
  children?: ViewBlock[]     // nesting, max depth 3
}

export interface ViewDef {
  id: string
  name: string
  rootTableId: string
  blocks: ViewBlock[]
  createdAt: string
  updatedAt: string
}
```

`EntityDef.role: 'view'` already exists; a `ViewDef` is what a view table
carries.

## Definition of done

Someone who has never seen the app can, without help: open a boat, press ⚙,
drag Motors in, accept the suggested rule, untick two motors they do not sell,
star one as recommended, and leave configure mode — and the page they end on is
one they would happily quote from.

**And the read-mode page must be beautiful enough to show a customer.**
