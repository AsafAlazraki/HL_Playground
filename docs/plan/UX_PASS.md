# THE UX PASS — what the redesign changes that is not a pixel

**Status.** Proposal, to land with the module system rather than before it.
Nothing here is built.

**Sources.** `docs/audit/UX_AUDIT.md` and its eight supporting files;
`docs/plan/MODULE_SYSTEM.md`; and code read directly in this session where a
claim is load-bearing. Every audit finding cited keeps its original number so
the two documents can be read side by side.

**The point of it.** The redesign so far replaces a look. A look was not what
stopped the sales manager in the audit. What stopped them was six processes,
and three of those get *worse* under the module system unless they are designed
now — because a module hands an end user the verbs `edit` and `delete` on a
business's real price file.

---

## 0 · THE AUDIT, TRIAGED AGAINST WHAT IS COMING

Twenty-seven findings. They do not all still exist, and pretending they do
would waste the pass.

| fate | findings | why |
|---|---|---|
| **Dies with the module system** | 1, 14, 16, 17 | Doors below the fold, panel hijack, the fake link, the clipped flow canvas — all are the five-stage shell, which modules retire. No design work needed beyond not rebuilding them. |
| **Dies with the redesign already committed** | 4, 19, 22, 23, 24, 26 | Legibility floor, the 1.14:1 invisible button, FIT COLUMNS, the clipped popover, the mis-named COLLAPSE ALL, the overlapped quantity box. Type system and layout. |
| **Named in the module plan's own phases** | 8, 13 | `__recommended` in the seed (Phase 1), quotes keyed to a project (Phase 3). |
| **Not a design problem** | 5, 21, 27 | Canvas frame rate, the formula-rename call site, the plate/store column disagreement. Engineering. |
| **STILL OPEN, and the module system makes three of them worse** | **2, 3, 6, 7, 9, 10, 11, 15, 18, 20, 25** | The rest of this document. |

The eleven that survive are not leftovers. They are, between them, every
process a person actually performs: **find a thing, get data in, change
something, undo it, trust what you are looking at, and get your work out.**

---

## 1 · UNDO — and the nine apologies it deletes

**This is the largest single UX gain available and it is now a prerequisite,
not a nicety.**

The app contains **nineteen** mentions of undo. Every one of them is the app
apologising for not having it:

```
EntityDesigner.tsx:540   "This app has no undo. The table can only come back
                          from a file you exported"
FieldRow.tsx:287         "…in this margin with no confirmation, and this app
                          has no undo."
FlowStage.tsx:347        "Everything set up on it goes too, and there is no undo."
columnFacts.ts:7         "an app with no undo was made without one value of
                          the data in…"
```

Grep `\bundo\b` over `src/` returns 19 hits and **zero implementations**.

### Why it stops being optional

`MODULE_SYSTEM.md` §5 gives a module the verbs `add`, `edit` and `delete`, off
by default, turned on by an admin. The moment one is turned on, the person
holding them is **not** the person who built the model — it is a salesperson on
the counter. Today the recovery path for a mistake is "the file you exported",
which audit finding 10 records as broken in all three of its parts.

Shipping `edit` to an end user over a dealership's real price file, with no
undo and a broken export, is the one thing in this plan that could lose a
customer their business data.

### The design, and why it makes the app *faster* as well as safer

A command log in the store: every mutation is an invertible entry, `Ctrl/Cmd+Z`
walks it back.

The gain is not only safety. **Undo lets us delete confirm dialogs.** The app
currently has four confirm sheets and a scatter of `window.confirm` calls, and
they exist *because* there is no undo — `ConfirmSheet.tsx:5` says so in its own
header. Every one of them is a full stop in the middle of somebody's work.

> **The rule:** if an act is undoable, it does not get a dialog. It gets a
> toast with UNDO in it. A dialog is reserved for the genuinely irreversible.

That converts the most common destructive acts from *stop, read, decide,
confirm* into *act, glance, carry on* — which is both quicker and less
frightening. It is the rare change that improves speed and safety at once.

### The honesty clause

A partial undo is worse than none, because people trust it. So:

- Every act is either undoable, or **says at the moment it happens** that it is
  not. Never in a spec, never in a tooltip.
- The toast names what it will undo — "Removed 3 columns from Highfield
  Inflatables" — not "Undone".
- Multi-tab (finding 9): a `BroadcastChannel` lock, because a second tab that
  invalidates the log turns undo into a liar. Today two tabs silently erase
  each other's work with no lock of any kind — verified: zero `BroadcastChannel`
  references in `src/`.

**Scope if it must be cut:** cell edits, column removal, row deletion and
module-layout changes, session-scoped. That is roughly a day and covers the
acts that actually lose work. Everything outside it says so out loud.

---

## 2 · ONE SEARCH OVER EVERYTHING

Audit finding 2, and its own §4 change 2. **There is no search in this app at
all** — verified: no `cmdk`, no command palette, no global search of any kind,
against 21 tables and 651 rows.

The module system gives each module's index a search field. That is necessary
and not sufficient, for a specific reason:

> Per-module search assumes you know which module the thing is in. The whole
> problem is that you do not.

A salesperson asked for "an SP560" does not know whether that lives in Boats,
in a package, or in a quote from March. An admin looking for the column
`Tare (kg)` does not know which of seven trailer tables declares it.

### The design

One field, `⌘K` from anywhere, over five kinds of thing at once:

```
⌘K   sp560

MODULES          Boats · 159 rows
ROWS             Highfield SP560 (PVC) W-W-WB      Boats › Highfield ▸ Sport
                 Highfield SP560 (HYP) LG-W-DB     Boats › Highfield ▸ Sport
                 + 13 more in Highfield Inflatables
QUOTES           20260811-01 · Alex Morgan · SP560 (PVC) B-W-B      $54,847
TABLES           Highfield Inflatables             30 columns · 40 rows
COLUMNS          Motor Envelope › Min HP           on 7 boat tables
```

Four rules that decide whether it is any good:

1. **Row labels only, never UIDs, never raw cell values.** The audit's own risk
   note on this change is that a search returning `kb2JYb4GLH` is worse than no
   search. `displayFieldId` and `rowLabel` already exist.
2. **Every result says where it lives**, in the module's language, because
   "where am I / how did I get here" is the wayfinding question the app fails
   worst.
3. **Enter opens the thing**, it does not filter a list behind a dialog.
4. **It respects capabilities.** A result a person cannot open does not appear
   for them.

It also quietly fixes `quote.md` Q16 — the view page always reopening on row 1
of 40 — because arriving by search arrives *at the row*.

---

## 3 · GETTING DATA IN — the process the app does not have

Audit finding 25, and the one with the widest gap between what is promised and
what happens.

The empty-table card advertises *"or paste a block straight from Excel"* and
**mounts no grid**, so the advertised gesture adds zero rows. Press Escape and
it works — but it is positional with no header row, so a pasted header line
became a boat named **"Variant"**, and `Series`/`Model` — the two columns the
preset groups by — are not grid columns at all.

**Every one of these dealers keeps their business in a spreadsheet.** Import is
not a feature of this product, it is the front door to it, and it is currently
a trapdoor.

### The design — four steps, none of them a wizard

```
1  PASTE          the block lands. Nothing is committed.
2  HEADER         "Is the first row a header?"  [ Yes · No ]
                  Detected: 12 columns, 40 rows.
3  MAP            each incoming column, beside where it will go:

                  Variant          →  Variant            txt   ✓ matched
                  Model Code       →  Model code         txt   ✓ matched
                  Tube Dia. cm     →  ( new column )     num   ← inferred
                  Cash             →  Cash price         $     ✓ matched
                  Notes            →  ( skip )                 ← nothing to match

4  PREVIEW        the first three rows, drawn as they will actually appear,
                  with the row label resolved. Then COMMIT — one undoable act.
```

What earns its place:

- **Type is inferred and shown, not assumed silently.** A column of `1,500` is
  offered as a number; the person can refuse.
- **"New column" is a first-class outcome**, not a failure. A dealer's
  spreadsheet has columns we have never heard of and that is normal.
- **Skip is explicit.** Data silently dropped is the thing that destroys trust
  in an importer.
- **The preview resolves the row label**, so "a boat named Variant" is visible
  before it exists rather than after.
- **The whole commit is one undo entry** (§1).

---

## 4 · NOTHING WEARS YOUR NAME THAT IS NOT YOURS

Audit findings 3, 11 and 20 are one problem with three faces, and it is a trust
problem, which is the most expensive kind.

- **3** — another dealer's price file loads under *your* business name with
  nothing saying it is an example.
- **11** — a brand-new business with two hand-made tables and zero rules is
  told *"FROM YOUR PRICE FILE — 6 rules your workbook already states — Read out
  of Boat Module (5).xlsx"*, with **13 mentions of another company's file on one
  page**.
- **20** — the "Boats" preset is Highfield's schema. A self-made *Quintrex*
  table is born with **31 columns** including `AUS Sailing`, `HO - MU %` and
  `Tube Dia. cm`.

A dealer who sees another dealer's file named on their own screen learns that
this app does not know whose data is whose. Nothing recovers from that.

### The design

1. **Provenance is a property of a table, and it is visible.** A seeded table
   wears an `Example` chip on its card, in the nav, and on its module. Not a
   banner that is dismissed once and forgotten — a mark that travels with the
   thing.
2. **One control removes all of it**, states the count, and is undoable:
   *"Remove the 21 example tables and 651 example rows."*
3. **No surface may name a file the user did not import.** Gate every one of
   those thirteen mentions on real import provenance. Where there is none, the
   sentence does not render.
4. **Presets are neutral, or they are not presets.** A `Boats` preset ships the
   columns every boat has — identity, dimensions, capacity, price — and *not*
   `AUS Sailing`. Brand-specific columns are what the import in §3 is for.

---

## 5 · STRUCTURE IS NEVER A SIDE EFFECT

Audit finding 14, which is the sharpest process defect in the app:

> One click on an accessory, on a view page, **moved the selection onto a
> brand-new join table, made both doors vanish, and took TABLES 21 → 22.**

A browse gesture created a schema object. Removing the block afterwards leaves
the join table orphaned.

Under modules this becomes acute: `relate` is a capability handed to a
salesperson, and `MODULE_SYSTEM.md` §5 defines it as *"pin and unpin rows
inside related blocks"*. Pinning must not be able to author schema.

**The rule, for the whole app:** a structural change — a new table, a new
column, a new join — is never a side effect of a browsing or picking action. It
is *offered*, in a sentence that names it, and it is undoable.

```
    ⚠  These two tables have never been linked.
       Pinning this motor will create a link table, Boats ↔ Motors.
       [ Create it and pin ]   [ Cancel ]
```

Finding 15 is the same principle from the other end: the rules pane opens with
the draft **already complete and ADD RULE already enabled** — the app has
pre-written a committable business rule the person did not author, and
`constraintDefs.ts:232` records that there is *"no per-rule delete by design"*.
A thing that can be created in one click and never deleted is not a feature.

Finding 18 is the third: the guided path *USE THE OBVIOUS TWO* picks the first
column of each table, which on the real data is `Series` on both sides — 193
rows naming neither the boat nor the motor. **A suggestion that is confidently
wrong is worse than no suggestion.** Prefer `displayFieldId`; where the guess is
weak, say it is a guess.

---

## 6 · WEIGHT PROPORTIONAL TO BLAST RADIUS

Audit finding 7: *"the everyday acts cannot be undone, and the fastest gestures
carry the weakest warnings."* The two halves are the same bug. Today a confirm
is a fixed sentence regardless of what is about to be destroyed.

With undo (§1) most confirms disappear. The ones that remain should **compute
and state what they are about to take**:

> Delete the column **Min HP**?
> It is named by **3 business rules** and **1 formula**, and holds a value on
> **38 of 40 rows**.

`dependents.ts` and `columnFacts.ts` already compute exactly this — the
designer surfaces it. It belongs wherever the act is offered, not only there.

---

## 7 · READING A PRICE WITHOUT LOSING THE PRODUCT

Audit finding 6 and §4 change 3. Scroll right to a price and the product's name
leaves the screen, so the number on screen belongs to nothing.

Modules fix this for *browsing* — the detail surface shows one row, so the name
is never lost. The **grid** still needs the display column pinned left, always,
and it is the harder half: pinning inside a virtualised grid with band-spanning
headers is where sticky layouts break. Test against the 7-band Highfield table
specifically.

The related consolidation stands: four verbs for "let me see more of this"
(click the plate · EXPAND · FOCUS · FIT COLUMNS) become two, and `FIT COLUMNS` —
which puts 30 columns into 1,016px, a 3px value box, every header cut to one
letter — is retired rather than fixed.

---

## 8 · ONE IMPROVEMENT TO THE MODULE PLAN ITSELF

`MODULE_SYSTEM.md` §3 is proud of **three clicks** to a working module, and it
should be. For the first module it can be **one**, because the app already
knows everything the three clicks ask.

On an empty dashboard the store already holds every table, its `kind`, its
`hierarchy`, its row count, whether it has an image column and whether it has
resolvable prices. That is precisely the input to the create flow. So propose
the answer instead of asking the question:

```
   NO MODULES YET

   From your 21 tables, these look like places in your business:

   ┌ Boats ─────────────────┐ ┌ Trailers ──────────────┐ ┌ Parts ───────┐
   │ 7 brands · 159 rows    │ │ 7 brands · 96 rows     │ │ 26 rows      │
   │ pictures · cash prices │ │ prices                 │ │ prices       │
   │        [ Create ]      │ │        [ Create ]      │ │  [ Create ]  │
   └────────────────────────┘ └────────────────────────┘ └──────────────┘

   [ Create all three ]        or  [ pick a table myself ]
```

Grouping is by `kind`, which is the axis the panel already groups on and the
axis a dealer thinks in. The escape hatch stays one click away, so nothing is
taken from the person who wants to choose.

This is the difference between an empty app that asks you to understand a new
concept, and one that shows you it already understands your business.

---

## 9 · WHAT THIS IS WORTH, AND IN WHAT ORDER

Ordered by ease gained per hour, which is not the order of difficulty.

| # | change | effort | unlocks |
|---|---|---|---|
| 1 | Example-data provenance (§4) | hours | trust, and it is nearly free |
| 2 | Structure never a side effect (§5) | hours | stops the app authoring schema behind people |
| 3 | Confirms state blast radius (§6) | hours | reuses `dependents.ts` |
| 4 | Propose modules on the empty dashboard (§8) | ~1 day | the first-run moment |
| 5 | `⌘K` over everything (§2) | ~1 day | the audit's #2 finding, and wayfinding |
| 6 | Pinned display column (§7) | ~1 day | every price-reading task |
| 7 | **The fit sentence (§11)** | ~2 days | retires the app's hardest screen |
| 8 | Paste with header mapping (§3) | ~2 days | the front door to the product |
| 9 | **Undo + multi-tab lock (§1)** | **~3 days** | **everything above it gets safer, and nine dialogs get deleted** |

Undo is last by cost and first by value. If the module system ships `edit` or
`delete` to an end user before §1 exists, that capability should stay off by
default with the refusal sentence saying why — which is a mechanism
`MODULE_SYSTEM.md` §5 already has.

---

## 10 · THE ONE QUESTION THIS PASS CANNOT ANSWER

**Is the person using a module the person who built it?**

The module plan is explicit that there are no roles and that admin/user are two
modes of one person (§5). That is honest about today's code. But §1 of this
document assumes a salesperson holds `edit` on a counter machine, and §2
assumes search results can be filtered by capability — both of which quietly
want a second person to exist.

Nothing here needs roles to ship. But if the answer is "yes, a different
person", then undo, provenance and the refusal sentences are not polish, they
are the product's safety story, and they should be built at that weight.


---

## 11 · THE FLOW JOURNEY — a sentence, not a graph

Added after the owner said the flow journey *"isn't as simple as it should be."*
It is not, and the data says how much.

### The measurement

| | |
|---|---|
| Fitment flows in the real seed | **2** |
| Shape of both | `start → match → output` — 3 nodes, 2 edges, linear |
| Comparison clauses in each | **2** |
| Node kinds the builder offers | **8** |
| `condition` / `loop` / `filter` / `find` / `action` nodes in the real data | **0** |
| The builder | **19 files, 5,236 lines** |

Both flows come out of a single factory — `northside.ts:2349`, `mkRule` — which
can only *emit* that one shape. There is no branch anywhere in the real data,
because fitment does not branch: it is a filter with a name.

Meanwhile audit finding 3 measured the canvas at 1280: **524px wide, opening
scale 0.68, plate type 5.4–7.1px, the Output plate 123 of its 190px
off-canvas.** A *two*-plate rule does not fit. You can never see the whole of
even the simplest rule.

**A graph is the right tool for a thing that branches. Nothing here branches.**

### The design

The default path becomes the sentence — which is what the rule already is when
read aloud, and which is the surface the constraints module already uses:

```
For every  [Highfield Inflatables]  variant,
find the   [Yamaha Outboards]  where
      │  [HP Rating]  [is at least]  [Min HP]
      │  [HP Rating]  [is at most ]  [Max HP]
      │  + add a comparison
Show  [Boat] [Min HP] [Max HP] [Motor] [HP Rating]  + column
When nothing fits, [skip the boat]
```

Measured in the preview at 1280: sentence **610px**, live result **420px**,
side by side, **zero clipped children**, smallest type **11.5px**.

Four things it does that the canvas could not:

1. **One door instead of two.** Constraints and fitment become one surface with
   two verbs — *a limit* and *a fit* — each explained by a real sentence from
   the dealer's own data. This closes finding 5: "motors must never exceed max
   HP" reads as a limit, sends you to Business rules, and there is no refusal
   sentence and no pointer to where it does live.
2. **It runs while you build.** Finding 18's guided path produced 193 rows with
   two columns both headed `Series`, and the person only found out after
   pressing RUN. With the answer permanently on screen that is a mid-sentence
   correction rather than a wasted journey.
3. **It refuses to be confidently wrong.** Two fixes, not one: prefer
   `displayFieldId` over "the first column", *and* notice a result that names
   neither side and offer the repair.
4. **Each side is tinted by its table**, so `HP Rating` vs `Min HP` cannot be
   misread as two columns of one table.

### Where it lives

Not on a page you visit. Under modules a fitment flow **is** the Related block
on a boat's detail surface, so the sentence opens from the one line that
explains the list — *"Worked out by Motor fitment: HP between Min HP and Max
HP"*. Design-time and run-time stay the same screen, which is the promise
`ViewPage` already makes and keeps. Most people never open a rules list at all.

### What happens to the 5,236 lines

**Keep the engine, demote the canvas.** The execution engine is pure TS, is
correct, and the sentence compiles straight into the same `RuleDef` — this is a
new authoring surface over an unchanged model, not a new engine.

The canvas stops being the default path and stops being advertised. It is not
deleted yet, because deleting it is a one-way door and the argument for it is
"nobody has branched *so far*". Revisit once real usage says whether anyone ever
does. If in six months the `condition` node still has zero uses outside a
demo, that is the answer.
