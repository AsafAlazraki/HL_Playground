> **SUPERSEDED.** This describes "The Chart Room" - the navy blueprint field,
> the Instrument Serif display face, and the glass pass - which was replaced by
> **Quiet Precision** in the redesign. It is kept for history and for the
> reasoning in it, which is still worth reading.
>
> **The current rules are `docs/specs/DESIGN_PRINCIPLES.md`.** Where this file
> and that one disagree, that one wins.

# ART DIRECTION — THE DRAWING OFFICE

> Industry-neutral by requirement. Marine is the first industry built, **not**
> the theme. A motorcycle dealer must never feel they are using a boat tool.

## The concept

The universal visual language of **technical product documentation** — the
engineering drawing, the specification plate, the parts catalogue. Every
manufactured thing on earth is described this way: boats, cars, bikes,
machinery. It is precise, quietly beautiful, and belongs to no single industry.

What this gives us, none of it industry-specific:
- **Construction lines and hairlines** — the discipline of a drawing
- **Dimension marks** — extension lines, arrowheads, the `|—— 540 ——|` notation
- **Registration ticks** — corner crosses where a plate is pinned
- **Spec-plate framing** — a bordered field with a title block
- **Part numbers and mono annotation** — data set as data
- **Exploded-assembly logic** — components that fit together, which is
  literally what a configurator is

## What is BANNED

Anything that reads as one industry:
- Nautical: hull lines, waterlines, compass roses, ship's wheels, anchors,
  portholes, rope, "chart", "helm", "aboard", "moor", "voyage".
- Automotive: chequered flags, speedometers, road markings, tyre tracks.
- Any single-industry metaphor in copy, icon, texture or motion.

The HelmLogic mark is the product's name, not a boat — draw it as a neutral
geometric mark (a dimension bracket, a set of nested plates), never a wheel.

**Industry lives in exactly one place**: the industry symbol, and the table-kind
symbols inside a chosen industry. Those are allowed — indeed required — to be
specific and beautiful. The frame around them stays neutral.

## Palette

Blueprint blue is engineering language, not marine language — it stays, but it
is a *drawing* field, not a sea.

Existing tokens in `src/styles/tokens.css` are correct and stay. What changes is
usage, not values. Rename nothing; the `--canvas-*` family is the drawing field.

One deliberate accent: **carmine** (`--red`), used sparingly — the reviewer's
pencil, a required mark, a live count. Everything else is ink, hairline and
paper. Near-monochrome with one accent is what will make it feel expensive.

## Typography

Three faces, each with one job:

| Role | Face | Use |
|---|---|---|
| Display | **Instrument Serif** | The big moments only: onboarding headline, empty-state title, a plate's name. High contrast, editorial, memorable. Never below 22px. Never for UI chrome. |
| UI | **Archivo Variable** | Buttons, labels, table text. Use the width axis (`'wdth' 118`) + uppercase for stamps and title-block captions. |
| Data | **IBM Plex Mono** | Every number, code, SKU, micro-label, annotation. If it is data, it is mono. |

The display face is the single biggest character change — one beautiful serif
line against a field of precise technical type is the whole look.

## Motion — cinematic but disciplined

Library: **`motion`** (installed). Spring physics, not easing curves.

Rules:
1. **One orchestrated moment per screen.** Onboarding arrival, a table
   materialising, a group expanding. Not five competing animations.
2. **Nothing moves while the user is working.** Once a table has focus, motion
   stops. No ambient animation behind live data entry.
3. **Ambient motion is felt, not watched** — if the user can consciously track
   it, it is too fast or too strong. Reserve it for empty fields (onboarding,
   empty states), never behind content.
4. **Physical, not decorative.** Things arrive with weight and settle. Groups
   expand by pushing their neighbours, not by fading.
5. `prefers-reduced-motion` cuts all of it — already handled globally in
   `base.css`; verify new work respects it.

## Illustration

Hand-authored SVG, drawn as **small technical plates**, not icons:
- Consistent 1.25px hairline stroke matching the chrome.
- Each subject drawn in true profile with real proportions and construction
  detail — a car with a believable roofline, a motorcycle with a real frame
  triangle, a boat with a proper sheer.
- Set on a shared datum line so a set reads as one drawing.
- One dimension annotation per plate where it earns its place.
- `currentColor` throughout so they take the surface's ink.

The bar: each should look like it was traced from a manufacturer's spec sheet.
If it looks like a generic icon set, it has failed.

## Density and space

The previous build was called "unusable" and "cluttered". Therefore:
- Generous negative space is a feature; when unsure, take the larger `--sp-*`.
- One primary action per screen.
- Never more than two panels.
- A screen that feels slightly too empty is correct.

## Definition of done

Show any screen to a motorcycle dealer and a boat dealer. Neither should be
able to tell which industry the app was designed for — until they reach the
symbols for their own products, which should feel drawn specifically for them.
