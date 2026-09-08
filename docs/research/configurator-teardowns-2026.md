# CONFIGURATOR TEARDOWNS — PCPARTPICKER AND DELL

> Studied 2026-09-08. Two shipping configurators driven by hand in a real browser,
> to answer one question: when a combination does not work, what does the screen
> actually say? Both sit outside the vehicle set the playbook already covers, and
> both are constraint systems over a real parts catalogue — the same shape as a
> rig over a price file.

## What we already believed

`CONFIGURATOR_PLAYBOOK.md` §5 settled the refusal grammar: the solver records the
reason at the moment of removal, five never-overlapping kinds, at most two priced
fixes, `aria-disabled` never `disabled`, and **never a hide** — the band header
carries the count (`422 of 434`) and names the choice that caused it. The claim
was that no shipping configurator does this. These two teardowns test that claim
against the strongest and the weakest example available.

## What the best in the world do

### PCPartPicker — never blocks, always explains, admits its gaps

Driven live; the deliberately incompatible list built for this study is at
<https://pcpartpicker.com/list/mDF9tC>.

**Four banner states, and the hinge is one word.**

| state | verbatim copy |
|---|---|
| clean | `Compatibility: No issues or incompatibilities found.` |
| info | `Compatibility: See details below.` |
| warning | `Compatibility: Warning! These parts have potential issues. See details below.` |
| incompatible | `Compatibility: Warning! These parts have potential incompatibilities. See details below.` |

"issues" versus "incompatibilities" is the entire severity distinction. The
leading token stays `Warning!` in both — there is no separate error word. The
notes heading below renames itself to match: *Compatibility Notes* → *Potential
Issues* → *Potential Incompatibilities*. Notes are lettered A–E, worst first, and
each letter is an anchor link that jumps to the offending part.

**It never blocks.** With three simultaneous `Problem:`-level incompatibilities,
every control stayed live: Copy Permalink, Save As, per-part Buy, Base Total,
Total, Buy From Amazon. Nothing greyed, no confirm dialog, and no pre-warning on
the product page before adding an AM4 board to a list already holding an AM5 CPU.

**Reason-giving is uneven, and that is the lesson.** Dimensional conflicts carry
both numbers:

> `Problem: The Asus ROG Astral OC GeForce RTX 5090 32 GB Video Card length of
> 357.6 mm exceeds the Fractal Design Terra Mini ITX Desktop Case maximum of
> 322 mm.`

Socket and form-factor conflicts carry none:

> `Problem: The MSI B550M PRO-VDH WIFI Micro ATX AM4 Motherboard and AMD Ryzen 7
> 9800X3D 4.7 GHz 8-Core Processor are not compatible.`

"AM4" and "AM5" appear only incidentally, inside the product names. A first-time
builder learns nothing about why, or what to change. **This is precisely the gap
`FloorVerdict` closes** — our removal carries `{kind:'under', capacity, load}`, so
the sentence cannot be missing.

**It admits what it does not check, in the UI, on every list:**

> `Disclaimer: Some physical constraints are not checked, such as RAM clearance
> with CPU Coolers.`
>
> `Note: Fan compatibility checking is currently not supported.`

That disclaimer is why a one-part list says "See details below" rather than "No
issues found". The honesty has a cost, and they accept it.

**The honesty is warranted.** PCPartPicker runs a public forum category for data
corrections. A user, verbatim, in thread 499007:

> "I purchased ARCTIC Liquid Freezer III Pro 360 … and Asus ROG STRIX X870E-E
> GAMING WIFI ATX AM5 Motherboard together based on PC Part Picker saying they
> were compatible. They are not."

The clash was the pump block against the board's M.2 heatsink — exactly the class
of fine-grained interference the Disclaimer admits is unchecked.

**BIOS awareness — a second-order refusal we have no equivalent of.** Two
mechanisms coexist: a generic chipset template, and per-board minimum-version
data naming an exact build — *"supports the AMD Ryzen 5 5600X … with BIOS version
7C95v28. If the motherboard is using an older BIOS version, updating the BIOS
will be necessary."* It cannot know what is on the board in the box, so it states
a **condition** instead of a verdict.

**The Compatibility Filter is on by default** (`Filters 534 Compatible Products`)
but governs only the guided picker. Adding from search results or from a product
page bypasses it entirely. The guardrail is in the browse flow, not the data
model.

**Round-trips:** adding a part is a full page navigation, evaluated server-side.
Browsing and filtering are XHR. Cheap operations are client-side; every
commitment costs a repaint.

### Dell PowerEdge — enforces perfectly, explains nothing

**Scale, measured in the DOM:** 60 configuration groups under 7 accordions, **all
expanded by default**; 45 distinct modules and **237 option inputs rendered
simultaneously** on one page. Only ~31 modules carry a selection. Roughly 25 of
the 60 groups are hardware; the rest are services, licensing, shipping labels,
`Web Tracking`, `OCONUS`, `GSA Purchase Order`.

**Silent cascading edits — measured, not alleged.** A controlled before/after diff
across all 45 modules, changing exactly one control (Chassis Configuration):

| module | before | after |
|---|---|---|
| 1540 RAID Configuration | `C1, No RAID for HDDs/SSDs` | `C20, No RAID with Embedded SATA…` |
| 1541 RAID/Internal Storage Controllers | `PERC H355 Adapter FH` | *(deselected)* |

**No message, no toast, no highlight, no confirmation.** Dell's page *has* message
containers (`.cf-swb-message`, `.cf-opt-message`); their contents were marketing
copy. The only acknowledgement anywhere is one static line that never changes and
never names anything:

> "Selections may result in additional updates to the overall configuration, which
> may impact the price for Support and Services and the total overall price…"

A first-party admission that picking one option rewrites others, leaving the user
to re-read 60 groups to discover which.

**No running total while configuring.** The headline reads `Starting at $5,599.00`
and — verified by direct before/after read — **does not change** as options
change. Every price is a delta (`Dell Price + $35.03`, `- $2.13`) against a moving
baseline, and the deltas themselves shifted after the chassis change ($25.48 →
$23.35, $136.95 → $134.82). Zero elements with `position: sticky` or `fixed`
containing a price. The total lives one click away, behind Review.

**Dependencies are pushed onto the user as label text** — `"Requires Subscription
Selection"` — rather than resolved or enforced. Discontinued options are shown
rather than hidden, labelled inline `| No longer available`.

### The German OEMs — and the sentence that explains the whole industry

Driven in a real browser; where a fetch-only pass disagreed with direct
observation, the browser wins and the disagreement is recorded.

**BMW disclaims validity at the door.** Verbatim, on the USA picker:

> "This is a configurator. While we strive to provide accurate configuration
> options, **not every configuration can be guaranteed**."

That single sentence explains the behaviour measured everywhere else in this
study. BMW's cascade is silent — reverting a package dropped **$4,000 with no
dialog** — because BMW never claimed to enforce validity. The dealer is the
backstop. Ford says the same thing (*"Not all Options or Option Packages are
available on all vehicles. See your local dealer"*), and so does John Deere
(*"All items listed below are optional"*). **Three industries, one identical
retreat.**

This is the behaviour a dealer-facing tool cannot copy, because here there is no
dealer downstream to catch it. We *are* the dealer.

**Mercedes shows a total and excludes the fees from it.** `MSRP as Built:
$45,350` on a CLA 220 (56 options in 13 groups; GLE 350 is 71 in 10), with —
verbatim — *"The Total Build Price excludes destination and delivery charges and
government mandated fees"*, *"The Total Build Price displayed is an estimate"*,
*"Dealer sets the final price."* Monthly payment sits alongside the total with
disclosed defaults (lease 36mo/7% down/10k miles; finance 72mo/24% down).

**Conflict copy across the whole Mercedes builder, after two keyword sweeps of
CLA and GLE, is one sentence:** *"Some items may require other options or
packages at additional cost."* That is the entire constraint vocabulary.

**The `aria-disabled` finding, which is the one that matters most to us.**
Across eight configurators, exactly one exposes unavailability programmatically:

| product | shareable build state | programmatic unavailable state |
|---|---|---|
| **Audi** | yes — readable `?pr=` URL param | **yes — `aria-disabled="true"`** |
| Mercedes | yes — `Copy Link to Build` + `Download Build PDF` | none |
| BMW | no — opaque rotating server id behind a hash route | 22 native `disabled`, **empty accessible names** |
| Brunswick | **broken** — shared links soft-404 with HTTP 200 | none |
| Tesla / Lucid | not verified / local only | none / 18 present but all `false` |

`CONFIGURATOR_PLAYBOOK.md` §5 already requires `aria-disabled` never `disabled`.
**One product in eight does it, and BMW's 22 native `disabled` controls carry
empty accessible names** — a screen reader is told something is unavailable and
not what it is. The rule was right and the field is worse than assumed.

Also worth knowing: **`configure.bmw.co.uk` renders as an entirely shadow-DOM
document** — a real deep-link and assistive-technology risk — and BMW runs
*buy-online* as a **separate product** (Build Your Deal → Credit Application →
Finalize, "available at select dealers"), so design and transaction have a visible
seam between them. Mercedes' `Copy Link to Build` + PDF is the dealer leave-behind
artefact we do not have.

**Recorded as unverified rather than repeated:** whether Audi filters incompatible
options at all (its empty state — *"Sorry, there are no items matching your filter
criteria"* — most likely fires from its own user-facing `Filter by 18"/19"` chips,
not from compatibility); per-selection round-trips for Audi and Mercedes; whether
any of the three throws a modal on an actually conflicting click. A fetch-only
pass reported Audi rendering a `Total price` label with no value and a `Step 2
from 6` localisation bug; direct observation showed **$54,790** and `Step 1 of 6`,
so both are treated as proxy artefacts and are **not** repeated as findings.

### CORRECTION — 2026-09-08, later the same day

An earlier version of this file ended: *"the brief expected to find 'your build
will be adjusted' copy somewhere in this cohort. After eight teardowns, it does
not exist. Nobody announces a cascade."*

**That was wrong, and this repo already knew it.**
`CONFIGURATOR_PLAYBOOK.md` line 297 records Porsche doing exactly this, with the
phrase verbatim:

> **Porsche** — A routed flyout: *"Your build will be adjusted."* → the option
> you wanted with its price → **Required selection** with the cheapest fix
> pre-selected and every alternative priced → footer: `Total price change
> +$2,480`. Committed total never moves until Accept. — **The one to beat.**

The teardowns in this file studied BMW, Audi, Mercedes, Tesla, Lucid, Brunswick,
PCPartPicker and Dell. **Porsche was not among them**, because the playbook had
already done it. Concluding "nobody" from a cohort that deliberately excluded the
one product that does it is the exact failure this whole reconciliation exists to
stop: trusting a fresh pass over what the project already established.

**What is actually true, and it is stronger:** Porsche announces the cascade and
prices every alternative. Eight further configurators — including three premium
German OEMs sharing a segment with Porsche — do **not**. Dell rewrites two
modules in silence. BMW disclaims validity at the door. So the pattern is not
unknown; it is known, singular, and unimitated. The playbook's verdict — "the one
to beat" — stands, and the design to beat it is already written down.

## The map — practice against this repo

| practice | who does it | do we? | evidence here | verdict |
|---|---|---|---|---|
| Never block an invalid combination | PCPartPicker | yes | `FitmentResult` splits rather than gates | **already do it** |
| Name both sides of the conflict | PCPartPicker, always | yes | `PartnerVerdict` names marque and series verdict | **already do it** |
| Give the physical reason with both numbers | PCPartPicker, dimensional only | yes, always | `FloorVerdict {kind:'under', capacity, load}` | **already do it, and better** |
| Never hide a removed option | both fail differently | yes | `LeftOutList.tsx` draws what is deliberately not held | **already do it** |
| State what the checker does **not** check | PCPartPicker, in the UI | **no** | no equivalent surface | **adopt** |
| A conditional refusal — "works *if* X is true" | PCPartPicker BIOS notes | **no** | our five kinds are all verdicts | **adapt** |
| Running total always on screen | neither | planned | PHASE_TWO: price bar always on screen | **adopt** |
| Announce a cascading auto-change | **Porsche, alone** (playbook l.297) | **no** | `optionConflict` exists, has zero callers | **adopt — the design is already specified** |
| Severity carried by the copy, not colour | PCPartPicker | partly | five kinds exist; wording not graded | **adapt** |
| Compatibility filter that browse can bypass | PCPartPicker | n/a | — | **reject** |
| All groups expanded, 237 controls at once | Dell | no | playbook §1 already rejects it | **reject** |
| Deltas against a moving baseline, no total | Dell | no | — | **reject** |

## What we adopt, and in what order

1. **Announce the cascade — to the shape the playbook already specifies.**
   Neither system here does it and Dell's silence is the worst behaviour
   observed anywhere in this study, but Porsche does: a routed flyout saying
   *"Your build will be adjusted"*, the option you wanted with its price, a
   **Required selection** with the cheapest fix pre-selected and every
   alternative priced, and the committed total frozen until Accept.

   That is not a gap in the research — it is a finished design sitting in
   `CONFIGURATOR_PLAYBOOK.md` §5 waiting to be built, and our solver already
   holds the reason at the moment of removal, which is the one thing Porsche
   reconstructs server-side. What is missing is code, not knowledge: `Conflict`
   has no `alternatives` field and `optionConflict` has no callers.
2. **A conditional refusal kind.** PCPartPicker's BIOS note is a sixth shape our
   five do not cover: not "removed", but "available if a fact we cannot see is
   true". `Unchecked` is the nearest existing kind and it is not the same thing.
3. **Say what we do not check.** PCPartPicker ships its disclaimer on every list.
   `CLAUDE.md` already names the guards' blind spots to developers; the app names
   none to the person using it.

## What we reject, and why

- **A compatibility filter on browse.** PCPartPicker's is on by default and
  bypassed by two of its own paths, which is worse than not having one: it
  teaches a trust it cannot honour. Our answer is already better — show
  everything, mark what does not fit, say why.
- **Dell's whole information architecture.** 237 controls with no progressive
  disclosure, procurement paperwork outranking hardware, and a headline price
  that never moves.
- **Blocking.** Neither of these blocks, and they are right not to.

## Sources

- <https://pcpartpicker.com/list/mDF9tC> — the incompatible list built for this study
- <https://pcpartpicker.com/guide/mwv6Mp/> — warning state and BIOS-version notes
- <https://pcpartpicker.com/product/PDsnTW/> — per-product "View Compatible …" filters
- <https://pcpartpicker.com/forums/topic/499007-arctic-liquid-freezer-iii-pro-360-77-cfm-liquid-cpu-cooler-and-asus-rog-strix-x870e-e-gaming-wifi-atx-am5-motherboard-are-not-compatible> — a false negative that cost a user money
- <https://www.dell.com/en-us/shop/servers-storage-and-networking/poweredge-t360/spd/poweredge-t360/pe_t360_tm_vi_vp_sb?view=configurations> — the 60-group configurator
- <https://www.dell.com/en-us/shop/dell-laptops/dell-pro-precision-7-series-16-laptop/spd/dell-pro-precision-pw716260-laptop/xcto_pw716260_usx> — 27 groups, same delta pricing

**Not verified:** PCPartPicker's yellow/red palette for warning versus
incompatibility. The severity distinction is provable in the copy and the
headings; the colour treatment is not, from the evidence gathered. Reddit and
ServeTheHome were unreachable (bot protection), so community evidence comes from
PCPartPicker's own forums instead.
