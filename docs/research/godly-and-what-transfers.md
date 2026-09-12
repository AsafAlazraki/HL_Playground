# GODLY, AND WHAT TRANSFERS TO A TOOL PEOPLE USE ALL DAY

> Studied 2026-09-10, driven in real Chromium. Asked for by name as a source of
> visual inspiration. The question this answers is narrower than "is it
> beautiful": **which of what the best-looking sites in the world do survives
> contact with a dealer, a customer beside them, and a 15,691-row price file.**

## What we already believed

`CONFIGURATOR_PLAYBOOK.md` §8 — WHAT TO REJECT — is the densest thing in this
repo and it already refuses most of what a beautiful marketing site would tempt
anyone into. In its own words and with its own numbers: **a 3D stage** (McLaren's
cold preload was ~90 seconds of spinner before the first pixel of product);
**marketing prose in the option row** (*"the outgoing build wrote door captions as
ad copy and it read as a brochure, not a tool"*); **an animated progress bar**
(GOV.UK measured no change removing a 12-step indicator; the *"300% more
conversions"* claim traces only to form-vendor blogs that contradict each other);
**hiding navigation to show the product**; **greying out with no reason**
(*"dimming is what you do when you have given up on explaining"*).

`DESIGN_PRINCIPLES.md` adds the constraint that decides most of this file: §4b
caps the entire expressive layer under **6% alpha**, measured, so text keeps the
contrast ratio the ink ramp was measured at. A visual idea that needs a stronger
wash to be seen is asking to invalidate that table.

## What the best in the world do

**`godly.website` now redirects to `recent.design`.** Worth recording, because
the ask named the old address.

It is a masonry gallery sorted into **eleven categories**: All, Web, Interface,
Branding, Product, Typography, Motion, Illustration, 3D, Editorial, Print,
Packaging. **One of those eleven is software people operate.** The rest are
branding marks, illustration, packaging and print — beautiful, and not about a
screen anybody works in.

Filtered to **Interface**, what is actually featured (2026-09-10, first screen):

| what | observed |
|---|---|
| a film-stock picker | a horizontal row of chips — Gold, Tungsten, Mono X, Royale — where each option is identified by **its own product colour**, not by reading its name |
| an iOS progress ring | `100%` set large inside a ring, over a photographic ground |
| an NFL scoreboard | dense figures, dark ground, two teams and a field diagram |
| a finance screen | `$1,628.89` as the subject of the screen |
| a synth / knob panel | dark, numeric readouts under direct-manipulation knobs |
| an agent status pill | *"Reproducing the failure in a sandbox · 5m 12s"* — a long operation naming what it is doing and how long it has been doing it |
| a progress card | *"Updating Grok Bot — your agents keep running the whole time · 14%"* |
| a typographic list | San Francisco 2026 / Los Angeles 2027 — big type, no chrome, no surface |

**The honest summary: the yield is low, and the reason is structural.** A gallery
optimises for the screenshot. Every item above is a single frame designed to look
good in a grid of other single frames. A dealer tool is judged over a day, on the
four-hundredth press. Those are different problems, and craft that wins the first
does not automatically survive the second — which is the same conclusion
`motion-libraries-2026.md` reached about magicui by a different route.

## The map — practice against this repo

| practice | who does it | do we? | evidence in this repo | verdict |
|---|---|---|---|---|
| Pick a variant by its **appearance**, not its code | the film-stock picker | **yes, and better** | the picker draws the row's own photograph — `QuoteStart.tsx`, `PictureWell`, and 108 seeded photographs held in-repo | **already do it** |
| Colour swatches for variants | the film-stock picker | **no — and cannot** | see below | **reject** |
| A long operation says what it is doing and for how long | the agent pill | partly | `demoLoad.ts` argues the case at length — *"a door that looks pressed and does nothing is the worst reading of that moment"* — and names the fetch; it does not carry elapsed time | **adapt** |
| A figure as the subject of the screen | the finance screen | yes | `.ds-figure-xl` on the price bar; `flow.tsx:295` | **already do it** |
| Big type, no chrome, no surface | the typographic list | yes | `.dsh-strip` — tertiary ink on the page ground, no surface, no rule, no elevation | **already do it** |
| A percentage on a ring | the iOS progress ring | no | playbook §8 rejects progress indicators with three independent sources | **reject** |
| Dark ground for a dense panel | the synth, the scoreboard | no | `ds.css` ships both themes; the light one is the product's | **reject** — a theme is a preference, not an improvement |

### Why the swatches are rejected, in detail — because it was the best idea here

It is the one item on that screen that speaks directly to this app's actual
problem. Highfield ships **588 variants** in the seeded file and they differ
almost entirely by a colour code: `ADV7 (HYP) B-G-B` against `B-G-LB` against
`B-G-WB`. Making a person read three letter-pairs to tell two boats apart is
exactly the "complex configuration" this product exists to simplify, and a row of
swatches is the obvious answer.

**The data does not support it.** Searched `tools/seed/extracts/b2_headers.json`
— the real workbook headers — for any colour-bearing column: the only near
matches are `Landed Hull Cost` and `App. Dry Hull Weight`. There is **no colour
column**. The colour is inside the *name*, as a code.

Rendering swatches would therefore mean **parsing `B-G-B` and asserting it means
black tube, grey deck, black console** — inferring meaning from a naming
convention. That is the guess §7 forbids: *"a suggestion that is confidently
wrong is worse than no suggestion."* It would also be wrong the first time a
brand used the same letters differently, and nothing in the file could catch it.

**And the problem is already solved better.** Every variant carries its own
photograph, and a photograph of the actual boat beats a decoded swatch on every
axis: it cannot be wrong, it needs no convention, and it shows the hull as well
as the colour. The film-stock picker uses colour because film has no photograph
of itself. We have the photograph.

## What we adopt, and in what order

1. **Elapsed time on a long operation.** The agent pill's *"· 5m 12s"* is the one
   idea here we do not have and could use. `demoLoad.ts` already argues that the
   moment between a press and a megabyte of price file arriving is the one worth
   designing for; it names the operation and does not say how long it has been
   going. On a phone in a boat shed that is the difference between waiting and
   pressing again. *Not built in this pass.*

## What we reject, and why

- **Colour swatches for variants** — the data has no colour column and decoding
  the name would be a guess. The photograph already does the job.
- **A progress ring or percentage** — three independent sources in playbook §8,
  and no counter-evidence.
- **A dark ground because it photographs well.** Both themes ship; the light one
  is the product's, and a gallery preferring dark is a fact about galleries.
- **The other ten categories.** Branding, Illustration, 3D, Editorial, Print and
  Packaging are not software. Web is marketing sites, which the playbook has
  already been through with Porsche, McLaren and Malibu.

## Sources

- `https://godly.website/` — **redirects to** `https://recent.design/?ref=godly`
- `https://recent.design/?ref=godly&category=interface` — the one category of
  eleven that is operable software
- `tools/seed/extracts/b2_headers.json` — the real workbook headers, searched for
  a colour column
- `docs/plan/CONFIGURATOR_PLAYBOOK.md` §8; `docs/specs/DESIGN_PRINCIPLES.md` §4b, §7
- `docs/research/motion-libraries-2026.md` — the same conclusion by another route

**Not verified:** whether `recent.design` and the old `godly.website` curate the
same pool, or whether the redirect merged two galleries. The categories and the
items are what the live site served on the date above.

---

## CORRECTION — 2026-09-12: the swatch rejection was wrong on a checkable fact

The section above rejects colour swatches for Highfield's 588 variants on this
premise:

> "Searched `tools/seed/extracts/b2_headers.json` ... There is **no colour
> column**. The colour is inside the *name*, as a code. Rendering swatches would
> therefore mean **parsing `B-G-B` and asserting it means black tube, grey deck,
> black console** ... That is the guess §7 forbids."

**The decode map exists, in this repo, and the production app ships it.**

`docs/specs/HELMLOGIC_GROUND_TRUTH.md` §1.3 records it verbatim from the
production sources, citing `HIGHFIELD_DATA_REVIEW.md:3265-3279` and
`scripts/reseed-correct-vendor.py:57-71`:

> "Colour codes are compound tokens decoded through a ~15-entry part map —
> `B-G-DG`, `W-W-WD`, `LG-W-LB`, `I-B-C` — where `W`=White, `B`=Black, `G`=Grey,
> `DG`=Dark Grey, `LG`=Light Grey, `LB`=Light Blue, `WD`=Wood, `MB`=Military
> Black, `C`=Carbon."

And the original HelmLogic renders it. Its Step 1 variant cards read
**"SP560 — DARK GREY / GREY / MILITARY BLACK"**, **"SP560 — BLACK / BLACK / DARK
BLUE"**, **"SP560 — IVORY / BLACK / CARBON"**, each over a per-colourway render
of that exact boat. Evidence:
`tasks/test-evidence/ffr33-sp560-proof/s1-variant.png` in the production repo.

**What went wrong, and it is worth naming because it is repeatable:** the
session searched one extract file for a *column*, did not find one, and stopped.
It did not check the ground-truth document in the same repo that answers the
question directly. A negative result from one file was reported as a fact about
the domain.

**What is true after the correction:**

- Decoding `B-G-B` is not a guess. It is a documented mapping, sourced from the
  business's own importer, already in `docs/specs/`.
- The swatch and the photograph are not competitors. The original ships **both**
  — a decoded name *and* a colourway render — and that is better than either.
  The photograph proves the boat; the decoded name makes 588 variants
  sortable, filterable and speakable over a phone.
- The one caveat the original section raised that still stands: a brand using
  the same letters differently would break the map. So the decode is **per
  brand**, it is **data not code**, and an unmapped token renders as the raw
  code rather than a wrong word.

The rebuild builds this. See `docs/specs/DESIGN_SYSTEM.md` §9.8.
