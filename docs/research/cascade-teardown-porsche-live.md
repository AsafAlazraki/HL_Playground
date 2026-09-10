# THE CASCADE, CAPTURED LIVE — PORSCHE, AND THE BOAT COHORT

> Driven 2026-09-10 in real Chromium against the shipping sites, with
> `tools/teardown/drive.mjs`. Re-run it and the captures land in
> `tools/teardown/out/`, which is gitignored because a run is megabytes; the
> four frames the argument rests on are kept in `docs/research/img/`. This
> supersedes nothing — it *closes* the open question in
> `configurator-teardowns-2026.md`, which had the Porsche cascade only
> second-hand from `CONFIGURATOR_PLAYBOOK.md:297`.

| | |
|---|---|
| ![Porsche's feasibility sheet](img/porsche-cascade.png) | ![ours, on the Northside file](img/ours-cascade.png) |
| **Porsche.** Two cards, a chip on each, `Standard Equipment` kept apart from `$0.00` — and not one removed row saying why. | **Ours.** The same shape, every row carrying the reason the channel recorded: *"no Trade column — stays at Sell inc Rego"*. |

## Why this run happened

`configurator-teardowns-2026.md` recorded Porsche as **"the one to beat"** on
one line quoted out of the playbook, and its own cohort of eight never included
Porsche. So the design we were told to beat had never actually been seen by
anyone working on this repo. It has now.

The first attempt saw **nine controls on a page with hundreds**: Porsche renders
through web components and a flat `querySelectorAll` cannot see into an open
shadow root. `drive.mjs` walks `el.shadowRoot` on every node. Any future pass at
this cohort must do the same or it will report an empty page and believe it.

## THE CASCADE — what it actually is

Selecting *Heritage Design Package Pasha* on a 911 Carrera navigated to:

```
/feasibility-notification
  ?optionAdded=04P
  &options=<the whole resulting build, dot-separated codes>
  &feas-return=options%3D<the build to go back to>
```

**It is a route, not a modal.** That is the finding, and it is worth more than
the layout. The URL carries three separate facts: the option asked for, the
build that results, and **the build to restore if the person declines**. The
committed state is not held in a component — it is in the address bar, so the
back button, a refresh and a shared link all behave.

### The screen, verbatim

A sheet occupying the right ~70%, over a **blurred** stage. The blur is load-
bearing: it says the configurator is still there and frozen, not replaced.

| element | copy |
|---|---|
| headline | `Your configuration is being adjusted.` |
| subhead | `The selected option requires an adjustment to your current configuration.` |
| eyebrow | `Your selected option` — then a **thumbnail**, name, ⓘ, and `$24,340.00` |
| card 1 head | `Newly added` / `These options will be added.` · chip `+$2,120.00` |
| card 2 head | `Removed` / `These options are not compatible with your selection and will be removed.` · chip `$0.00` |
| footer | black `Accept changes`, grey `Cancel selection`, right-aligned `Total price change` / **`+$26,460.00`** |

**The arithmetic is the design.** $24,340 (the option) + $2,120 (what it forces)
= $26,460. The footer prices *the decision*, not the thing clicked. A person who
reads only the sticker is off by $2,120; a person who reads only the footer is
never wrong.

**Rows that cost nothing say why they cost nothing.** Removed rows read
`Standard Equipment`, not `$0.00`. Free-because-included and
free-because-standard are different facts and Porsche keeps them apart.

**Every row name is a link with an ⓘ.** You can interrogate anything the
cascade touched without losing the sheet.

### Where Porsche is beatable, precisely

1. **No removed row says why.** Every one of them reads the same sentence —
   *"not compatible with your selection"* — with no mention of which selection,
   or what about it. This is the identical gap `configurator-teardowns-2026.md`
   pinned on PCPartPicker's socket conflicts. **Our solver records the reason at
   the moment of removal** (`prune()` → `explain()`, read by `optionConflict`
   into `Removal.because`), so our rows can carry a sentence Porsche's
   architecture cannot reconstruct.
2. **No alternatives on this shape.** The playbook's line — *"Required selection
   with the cheapest fix pre-selected and every alternative priced"* — describes
   a **different** flyout, the one that fires when a choice leaves a hole. What
   fires on a removal is the two-card shape above, and it offers nothing. So
   there are **two shapes**, and the playbook conflated them.
3. **Two options are natively `disabled` with a bare code as the accessible
   name** (`1G8`, `3UG`). `DESIGN_PRINCIPLES.md` §5 requires `aria-disabled` and
   a reason; the teardown's finding that only Audi manages this holds, and
   Porsche is not the exception.

### What else the configurator does that we do not

- **A search field over the options** (`Search equipment options`). At 200+
  options this is the primary navigation, not a convenience.
- **A selected-count badge on every collapsed group** — `Exterior 3`,
  `Steering wheel, Gearshift 2`. You can see where your money went without
  opening anything.
- **Price at the group level** — `Legends $7,870.00` on the *family* of paints,
  so the cost is known before the swatches are read.
- **The accessible name carries the price**: `Guards Red, Price: $0.00`.
- **The stage answers the rail.** Choosing an interior option swings the render
  to an interior camera. Ten cameras in a filmstrip under the stage.
- The header price reads `$0.00 / Price for equipment` — the *delta*, not the
  car. The car's total lives behind `Summary`.

## THE BOAT COHORT — the floor we actually compete against

| brand | what it is | notable |
|---|---|---|
| **Boston Whaler** | a real configurator | numbered stage rail (`1. Colors` … `5. Options`) as circular icons beside the render; **a price under every single swatch** (`$425`, `$0`); `NEXT CATEGORY` / `FINISH BUILD`; `DETAILS / SPECS / SUMMARY` tabs under the stage |
| **Sea Ray** | a builder | 59 controls; the playbook's earlier finding — seven constraint rules, all seven silent hides — is the behaviour to reject |
| **Malibu** | a builder on its own subdomain | thin; 18 controls at landing |
| **Grady-White** | **not a configurator** — a chooser | serif headline *"Where Vision Meets Vessel."*, a ghosted `BUILD YOURS` watermark, model cards by hull type |
| **Chaparral** | a builder inside a PHP tab | 15 controls |
| Stabicraft, Highfield | **no configurator at all** — brochure sites | both are rows in our own price file |

**Boston Whaler prices every option; Porsche prices every group.** Whaler's is
better for a dealer and worse for a showroom, and we are a dealer tool.

The two brands whose boats we actually sell ship no configurator whatsoever.
That is the size of the opening.

## What we build, and in what order

1. **The cascade sheet, as a route, with reasons.** Porsche's two-card shape —
   *Newly added* / *Removed* — with our `because` sentence on every removed row,
   which is the thing they cannot do. Committed total frozen until Accept;
   the footer prices the decision, not the click.
2. **The second shape: required selection.** When a pick leaves a hole,
   every alternative priced and the cheapest pre-selected. `Conflict` needs an
   `alternatives` field; `optionConflict` already computes the cheapest to set
   the proposed total but throws the list away.
3. **`Standard` is not `$0.00`.** A line included in a package and a line that
   is standard equipment are different facts. Our `ConflictLine.to` is
   `number | null` and `null` already means "not priced here" — the sheet must
   render that distinction rather than a dash.
4. **Search over options, and a count on every collapsed band.** Both are
   Porsche's answer to scale, and our price file is larger than a 911's.

## Sources

- `https://configurator.porsche.com/en-AU/mode/model/9921B2` — the 911 Carrera
- `https://www.bostonwhaler.com/us/en/boat-configurator.13SPT`
- `https://www.searay.com/global/en/build`, `https://build.malibuboats.com/`,
  `https://www.gradywhite.com/build/`

**Not verified:** whether Porsche's *required selection* shape exists in the AU
market build (the removal shape is what fired); MasterCraft, which served an
empty document to a real browser and is recorded as unreached rather than
studied.
