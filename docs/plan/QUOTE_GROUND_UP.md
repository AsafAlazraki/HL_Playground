# THE QUOTE, FROM THE GROUND UP

> Written 2026-09-09, after the owner said the screen is "genuinely awful design"
> and asked for a rebuild on the researched examples rather than more repair.
> This is the design to build to. Every previous pass on this screen fixed a
> defect; none of them designed it.

## The diagnosis, and it is not layout

`PHASE_TWO.md` §2.3 specifies five bands:

```
01  THE HULL            chosen: SP560 (PVC)
02  MOTOR               7 offered · 202 not
03  TRAILER             ▾
04  DEALER FIT          ▾
05  ADMINISTRATION      ▾
```

The shipped screen has **51 bands, one per database table** — *Highfield
Inflatables*, *Yamaha Outboards*, *NSM Custom Trailers*, *GFAB Trailers*,
*Dealer Fit Packages*, *Rigging Kits* … measured at 1280×800 with a real quote
open: 51 present, 2 open.

**The configurator is organised by the data model instead of by the purchase.**
That is the exact fault `PHASE_TWO` opens by naming — "the answer to *feels like
a database*" — still sitting inside the screen written to cure it. A dealer does
not think "now I will open the GFAB Trailers table". They think "it needs a
trailer", and *which* trailer tables can supply one is the app's problem, not
theirs.

Everything else people have called ugly follows from this:

| symptom, measured | cause |
|---|---|
| 51 bands, 2 open — "an accordion of accordions" | one band per table, not per decision |
| two scrollbars side by side (`.qb-product` 524/713, `.qb-scroll` 524/654) | the left column is not sticky, so it competes for scroll |
| the product's `<h1>` sits **below** the line items it names | the pane is a list with a title appended, not an identity |
| ~220px of 800 spent on chrome | two back rows, a number line, tabs, a warning strip, the bar |
| the photograph is 324×182 in a 401px column | §2.3 wants it full height and changing with the build |

## The screen

```
┌────────────────────────────────┬──────────────────────────────────┐
│                                │  [ search this build ]           │
│   THE RIG — sticky, full       │                                  │
│   height, changes with the     │  01  THE HULL              ▾     │
│   build and crossfades         │      Highfield CL260 (PVC)       │
│                                │                                  │
│   name 72–110px                │  02  MOTOR                 ▾     │
│   specs on hairlines           │      7 offered · 202 not offered │
│                                │      [ rows, not cards ]         │
│                                │                                  │
│                                │  03  TRAILER               ▾     │
│                                │  04  DEALER FIT            ▾     │
│                                │  05  ADMINISTRATION        ▾     │
├────────────────────────────────┴──────────────────────────────────┤
│  $8,557 inc GST · $7,779 ex    [Cash|Trade]   Give it to them     │
└───────────────────────────────────────────────────────────────────┘
```

### 1 · Five bands, named for the decision

Bands come from `TableKind`, not from tables. `boat → 01 THE HULL`,
`motor → 02 MOTOR`, `trailer → 03 TRAILER`, `accessory + package → 04 DEALER
FIT`, `custom → 05 ADMINISTRATION`. Fixed order, always, whatever the sheet
holds — a dealer learns the order once.

A band's **sub-line is its state**, and it is the whole reason the band can stay
shut: `chosen: Yamaha F9.9SMHB · $3,448`, or `7 offered · 202 not offered`. Shut
does not mean unknown.

Several open at once (§2.3). Opening one does not shut another — that is a
gate, and §8 rejects gates.

**Where a kind has more than one table**, the table becomes a heading *inside*
the band, in the file's own case with its count — the treatment `Choose` already
uses. Seven trailer tables are seven headings in `03 TRAILER`, not seven bands.

### 2 · Rows, not cards, inside a band

§3, already applied on `Choose` and proven there: selection is an **outline** in
a reserved gap so nothing reflows; hover is the same ring at reduced alpha so it
previews selection; the reserved sub-line stops a row growing when its refusal
appears.

**Refusals stay on screen, struck through, reason beside them** (§2.3). They are
never hidden and never merely greyed — §5's contrast trap: `opacity: 0.55` drags
`--ink-faint` from 5.5:1 to about 2.5:1, which is `--fg-quaternary` territory and
may never carry meaning.

### 3 · The left column is the rig, not a manifest

Today: photo, four line items, then the name. It reads as a receipt.

It should be an identity — name at the display step, the photograph beneath it,
the specs on hairlines — and it **changes as the build changes**, crossfading at
260ms opacity-only (already built: `QuoteBuild.tsx:657-696`). Pick a motor and
the pane becomes the rig. §2.3 calls that "the *alive* the app has none of".

Sticky, full height, one scroll region on the page. Two scrollbars competing for
one wheel is the defect.

### 4 · The price bar, unchanged in behaviour

It already works and it is specified: always on screen, both figures, Cash|Trade,
the issue button. **Money never animates** — Porsche's total simply becomes
`$139,430`. Deltas appear and fade; the total does not count up.

## What this is NOT

- **Not a wizard.** No step rail, no progress, no next-step button (§2.3, and
  §1's whole rejection of McLaren's 9 steps and Malibu's 11).
- **Not a hide.** Every removal is counted and attributed. Sea Ray's seven
  constraint rules are all `hide`; that is the anti-case.
- **Not 3D, not animated money, not a countdown.** §8's reject list stands.

## The order of work

1. **Bands by kind, not by table.** The one change that makes the screen the
   screen. Everything below is cheap once it lands.
2. **The band sub-line states the choice or the count.** Without it, shut bands
   are unknowns and the accordion is a maze again.
3. **The left column: identity first, sticky, one scroll region.**
4. **Table headings inside a band** where a kind has several.
5. **The chrome diet** — one back control, the warning where the thing is.

## What is deliberately left

The cascade sheet's option channel. `optionConflict` has no callers and no
cascade to announce: no pick can invalidate another line
(`freeze.ts:1077-1086`), and `rootRowId` is written once at `freeze.ts:489`.
Recorded in `docs/BACKLOG.md`. Porsche's flyout is the target and the mechanism
must exist before the surface.
