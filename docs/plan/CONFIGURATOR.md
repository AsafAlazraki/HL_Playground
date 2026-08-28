# The configurator, the catalogue, and assigning things

**Status: specified, not built.** Written 28 August 2026, after the
owner asked for "insane attention" on this and called it "a big
challenging task to make sure we get right".

This is the part of the application the business runs on. Everything
else — the board, the register, the dashboard — is about quotes that
already exist. This is where one gets made.

---

## What it is today

Three surfaces that only half know about each other.

**The catalogue** (`features/table/Catalogue.tsx`) — a photographic
grid entered by kind. Browse what is for sale.

**The configurator** (`features/quote/QuoteBuild.tsx`, 1,644 lines) —
a subject on the left, and on the right a stack of BANDS: Boats,
Motors, Trailers, Factory Packages, Dealer Fit, Parts, Rigging. Open
a band, pick what goes with the boat, watch the running total move.

**Fitment** (`features/fitment`, `features/constraints`) — 8,649
pairings from the price file saying which motor goes with which hull,
plus a constraint solver that records WHY something was removed.

## The five faults, measured

### 1 · One fact, said four times

Expanding a band with nothing paired draws, in order:

- `0 of 73 NSM Custom Trailers · Highfield × NSM Custom — Trailer
  Fitment names which ones go with this one · holds at 100% across
  the price file (F8)`
- a boxed paragraph repeating it almost verbatim
- a second box, *"Nothing in NSM Custom Trailers is paired with this
  one on the price file. The catalogue is still there."*, with a button
- `NOT OFFERED 73 ›`

Four statements of *nothing here is paired with this boat*. One of
them is right. The **door** — show me all 73 anyway — is the act and
must survive; the other three explanations are the clutter the owner
has complained about three times.

### 2 · A model code drawn as a headline

`Highfield - RU230KAM (PVC) WH` sets at the hero step across four
lines. An identifier is not a headline. The app now has one
page-title step (34px, `PageHead`) and this predates it.

### 3 · The customer cannot be addressed from here

The footer says *"Type the customer name at the top"* and the top of
the screen shows a reference. Either the field is off-screen or it
does not exist. **If a quote cannot be addressed on the screen where
it is built, that is the single biggest fault in the flow** — it
sends a person to the document to do something the build should own.

### 4 · Assigning is a list, not a fitting

Picking a motor for a hull is choosing from a filtered list of names.
The price file knows far more than that — it knows what is *paired*,
what is *left out* and why, what the *share* is (`on 3 of 7`), and
what each choice does to the total. A configurator that is a series
of dropdowns is a spreadsheet with better fonts.

### 5 · The catalogue and the configurator are two apps

You browse in one and build in the other, and the two do not hand
over. A person who finds a boat in the catalogue should be able to
start configuring it without going back to a picker and finding it
again.

---

## What to build

### A · One flow, three moments

**Choose · Configure · Address.** The picker already does *choose*
and does it well (a grid of brands with their own marks). The build
screen does *configure*. Nobody does *address*, and it is a step, not
a footnote — a quote is a rig, a customer and a moment, and the
customer is a third of that.

### B · A band is a fitting, not a list

Each band should say, in this order and once each:

1. what is paired, as things to pick
2. what it does to the total, before you commit
3. what is not offered and **why** — one sentence, with the door
4. the share, where a share is a fact (`on 3 of 7`, never `on 1 of 1`)

The **reason** stays. Rule 10 requires it and the constraint solver
already records it. What goes is saying it three more times.

### C · Assigning, made fast

The owner's words: *"the assigning of things that make it just so
easy to do things"*.

- **Keyboard the whole way.** Open a band, arrow to a choice, Enter.
  A configurator a salesperson uses forty times a day should not need
  a mouse.
- **The consequence before the commitment.** Hovering or arrowing to
  a choice shows what it does to the total; picking it commits.
- **What is already decided stays visible.** A person deep in Dealer
  Fit needs to see the hull and the motor without scrolling up.
- **Undo, by rule 9** — every pick is a toast with UNDO, never a
  confirmation.

### D · The catalogue hands over

A row in the catalogue gets *Configure this one*, which mints the
quote and lands on the build screen with the subject already set.
`createQuoteFromView(viewId, rowId)` already exists; this is a door,
not a mechanism.

### E · It is its own section

The owner asked for this and it is right. Choose → Configure →
Address is a flow with three screens and a running total across all
of them, and it should read as one place rather than three stages
that happen to follow each other.

---

## What must not break

- **A quote FREEZES what it printed.** The subject's name, its specs
  and its prices are copied at mint time and never re-read. Anything
  here that reaches back into the live sheet for something it should
  have frozen is a serious bug, not a refactor.
- **The refusal reasons are the product.** The solver records why a
  row was removed, and the owner has said the original HelmLogic's
  quote flow is the thing stakeholders loved. Cutting prose must
  never cut a reason.
- **8,649 pairings and 15,691 rows.** Every list is capped, every cap
  says what it kept back, and nothing re-filters the whole price file
  on a keystroke.

## Where to start

**Fault 3 first** — find out whether a quote can be addressed from
the build screen. It is one afternoon's work to answer and it decides
whether A is a redesign or a repair.

Then 1 (the repetition), then 2 (the title), then B and C together,
because a band's shape and how it is operated are one design.
