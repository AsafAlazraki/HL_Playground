# PLATFORM VISION — what this becomes

> *"this thing we are building is just part 1 of a massive piece of application
> we are building."*

Part 1 must not paint Part 2 into a corner. This document exists so every
decision made now is checked against where it is going.

## The shape of the whole thing

Three layers, each **designed by an admin** and then **used by everyone else**.
Nothing is hardcoded per organisation, per industry, or per module.

```
   ┌──────────────────────────────────────────────┐
   │  1. DATA MODEL      tables · structures ·    │   ← PART 1 (now)
   │                     columns · sections ·     │
   │                     joins · rules · data     │
   ├──────────────────────────────────────────────┤
   │  2. MODULE DESIGN   what a table DOES:       │   ← later
   │                     catalogue pages, detail  │
   │                     layouts, which columns   │
   │                     show where, images       │
   ├──────────────────────────────────────────────┤
   │  3. FLOW DESIGN     the quote flow itself:   │   ← later
   │                     steps, order, what each  │
   │                     step asks, drag-and-drop │
   │                     (OutSystems-Studio-like) │
   └──────────────────────────────────────────────┘
```

An admin clicks a module/table and adds functionality to it. A *different or
the same* admin fills in the data. End users then work inside what was
designed — and can edit in either the **table view** or the **visual view**.

## Non-negotiables that follow from this

1. **Everything is data, nothing is code.** A structure, a column, a section, a
   join, a rule, a page layout, a flow step — all are rows in a store, editable
   at runtime. The moment something requires a developer, we have rebuilt the
   thing we are replacing. (The production app has five hardcoded per-brand
   editors precisely because structure was not data.)
2. **Organisation- and industry-scoped.** `ProjectMeta.org` carries name +
   industry today. Everything designed later hangs off the organisation, so two
   organisations in the same industry can diverge completely.
3. **Design-time vs run-time are different modes over the same objects.** Not
   different apps, not different data. Part 1's table view is already the
   run-time editing surface; the visual sheet is the design-time one.
4. **Additive model changes only.** Part 2 and 3 add to `EntityDef` (a layout,
   a flow) rather than reshaping it. Rows never change shape.

## Part 1 decisions that serve Part 2 and 3

| Part 1 thing | Why Part 2/3 needs it |
|---|---|
| `TableKind` + symbol | A module needs an identity in the admin nav |
| `hierarchy` (nameable, editable levels) | Catalogue pages nest by the same levels |
| `ColumnSection` | Detail pages render section-by-section for free |
| `FieldDef.type: 'image'` | Catalogue tiles and quote headers need a picture |
| Join tables as ordinary tables | The quote reads associations straight off them |
| Rule engine already built | Fitment and step conditions reuse it |
| `UID` system column | Stable ids for deep links and flow state |

## Images — implemented now

A column of type **Images** holds an ordered `ImageRef[]`.

- **Order is meaning: index 0 is the primary.** Reordering re-elects it. There
  is deliberately no `isPrimary` flag to drift out of sync with the order.
- Users name the column whatever they like — "Cover Image", "Gallery",
  "Hero" — there is no privileged system column. A catalogue page later picks
  *which image column* to use; it does not assume a name.
- Cell UI: a thumbnail strip. Drag to reorder, first slot marked PRIMARY, click
  to enlarge, drop files to add, remove per image.
- Search/sort/copy/export use `imageCellText` (a count), never a blob of URLs.
- Local-only for now: `src` is an object/data URL. When a backend lands it
  becomes a storage path and no consumer changes.

## The quote flow — the thing all of this is for

> *"the flow of the quotes is important."*

Today, in the spreadsheet, a rig is one row: boat variant + motor + trailer +
options, with a price. In HelmLogic it is a coded flow. In our system it must
become:

1. Associations are **rows in join tables** the admin defines — including
   granular ones ("this factory option, for this motor, when on this boat").
2. A quote **reads those joins**: pick a boat, and the valid motors, trailers
   and options are whatever the joins say — no code, no hardcoded menu.
3. The **flow itself is designed**, per module, as steps an admin arranges
   visually. Which step asks what, in what order, with what conditions.
4. What the customer sees is a **designed page**, not a fixed template.

Part 1's job is to make (1) real and editable, and to keep (2)–(4) cheap to add.

## What we do NOT build yet

Catalogue pages, the module-functionality admin, the flow designer, the
customer-facing output. Named here so they are designed *for*, not *around*.
Anything Part 1 ships must be something Parts 2 and 3 would have asked for
anyway.
