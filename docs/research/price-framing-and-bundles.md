# PRICE FRAMING AND BUNDLES — SONOS AND PELOTON

> Studied 2026-09-08. Two consumer brands that sell a multi-component purchase with
> a recurring cost, read for the question the quote flow has to answer: when a
> configuration has parts, a bundle discount and an ongoing obligation, what number
> do you put on the screen? Both fail in ways that are directly instructive,
> because both failures are arithmetic a person can check without leaving the page.

## What we already believed

`DESIGN_PRINCIPLES.md`: nothing is invented — if the app shows a number it came
out of a workbook. `PHASE_TWO.md`: the price bar is always on screen.
`CONFIGURATOR_PLAYBOOK.md` §4: money never animates, and the unpriced rule says
what happens when the file carries no figure. What neither settles is **bundle
arithmetic** — how a saving is computed and whether it stays true.

## What the best in the world do — and where both break

### Sonos: there is no builder, and the savings do not survive a check

**There is no configurator.** `/shop/bundles` and `/shop` serve an identical grid;
`/shop/speaker-sets` narrows it to **38 distinct "Set" SKUs**. Steps to build a
surround set: **one** — pick a pre-built SKU. On a set page the components are
read-only ("Quantity: 1 / Arc Ultra / $1,099", "Quantity: 2 / Era 100 / $219")
with no add, remove or swap. Combinatorics are handled by SKU proliferation, not
by constraint logic. For Arc Ultra alone there are eight sets, distinguished by
names the shopper must decode: Immersive vs Premium Immersive vs Ultimate
Immersive vs Premium Personal Entertainment.

**The good pattern:** each set page carries a **"What's included"** module listing
its components *with their own prices*. That makes the bundle auditable.

**The failure, and it is arithmetic on one screen.** The strikethrough "was" price
is built from **list** prices while those same components are simultaneously **on
sale individually** on the same grid:

| set | bundle | "was" | claimed | components at today's price | real saving |
|---|---|---|---|---|---|
| Sonos Ace + Ray | $528 | $568 | "Save $40" | $309 + $219 = **$528** | **$0** |
| Sonos Ace (Pair) | $618 | $698 | "Save $80" | 2 × $309 = **$618** | **$0** |
| Ultimate Immersive Set | $2,806 | $2,956 | "Save $150" | 1,099 + 899 + 2×459 = **$2,916** | **$110** |

The Ultimate Immersive Set page **contradicts itself on a single screen**: header
says "$2,806 / $2,956 / Save $150" while its own "What's included" sums to $2,916.
Same pattern on four other sets.

**Every one of these errors is a stored number drifting away from a live one.**

**Real constraints live in Support, not in the shop.** The rule that two surrounds
must be the same model — *"two Sonos Ones can be used for surround sound but One
and Play:1 cannot"* — and the material downgrade *"The following features will be
disabled on Sonos products used as surround speakers: AirPlay / Bluetooth audio
playback / Line-in / Subwoofer output"* appear **nowhere in the shop UI**. You buy
two Era 100s as surrounds and lose the Bluetooth and line-in the product page sold
you.

**No financing anywhere.** Zero occurrences of Affirm, Klarna or APR across the
shop. Sonos never converts $2,806 to a monthly figure and sells trust instead —
price match promise, 30-day returns.

### Peloton: the mandatory recurring cost is excluded from the total, by design

**The headline finding, in Peloton's own words** — the cart string shipped with
`/shop/bike`:

> "Monthly membership {membershipPrice}/mo **not included in cart total** and
> begins on device activation."

On the product pages the requirement appears **three times and never with a
number**: a badge ("All-Access Membership separate²"), a footnote, and an
accordion. The Affirm footnote defers it verbally — "(standard monthly pricing)".
The figure is fetched client-side and interpolated only at cart time.

The arithmetic Peloton never performs: Bike Basics $1,445 + 24 months of
membership = **$1,445 + $1,056** (at the site's own $44) — the recurring cost
overtakes ~73% of the hardware price inside two years, and appears in no displayed
figure.

**Three defects in the financing copy, each checkable:**

1. **`/financing` pairs the sale price with the full-price monthly.** "Cross
   Training Bike — From $1,445 or $141.25/mo at 0% APR for 12 mos". $1,445/12 =
   $120.42; the footnote on the same page says $141.25 is "Based on a price of
   $1,695." Every row does it, overstating the monthly by 12–20%. The product
   pages get it right ($121); `/financing` does not.
2. **The same footnote gives two different prices for the same SKU** across pages
   of the same site — Refurbished Bike+ at "$166.25/mo … based on $1,995" on the
   package pages, "$116.25/mo … based on $1,395" on the product pages.
3. **A stale offer block in production** — `/financing` says the offer ended
   *August 18*; every product page says *September 8*.

**The bundle ladder is the good part.** Three named tiers — **Basics / Starter /
Ultimate** — with real per-tier discounts ($250 / $300 / $350 off), and *inside* a
tier only genuine variant choices that do not move price ("Light Weights — Select
1: 1 lb / 2 lb / 3 lb", "Dumbbells — Select 3"). Compare Sonos's 38 opaque names.

**And the rental page is the honest one.** `/bike/rentals`: *"$124.99/mo plus $150
one-time delivery fee. Cycling shoes and Peloton Rental Membership included"* —
*"Membership cost included"* — with a full buyout ladder by tenure ($1,245 at 0–3
months down to $695 at 36+). **The only place on the site where the monthly figure
is genuinely all-in.**

## The map — practice against this repo

| practice | who | do we? | verdict |
|---|---|---|---|
| Show the bundle's components with their own prices | Sonos "What's included" | partly | **adopt — but compute live** |
| Compute the saving from live prices, never a stored figure | **neither** | n/a | **adopt — this is the whole lesson** |
| Named tiers with real per-tier discounts | Peloton Basics/Starter/Ultimate | levels exist (`src/features/levels`) | **already do it — check it holds** |
| Variant choices inside a tier that do not move price | Peloton | partly | **adapt** |
| Include a mandatory recurring cost in the displayed total | **only Peloton's rental page** | n/a today | **adopt if we ever price service** |
| State a feature loss at the moment of selection | **neither** (Sonos buries it in Support) | `PartnerVerdict` could | **adopt** |
| Running total always on screen | neither | planned | **adopt** |
| Combinatorics by SKU proliferation | Sonos, 38 sets | no | **reject** |
| A "was" price from list while components are on sale | Sonos | no | **reject — it is the defect** |
| A countdown timer on the price | Peloton | no | **reject** |
| Costs that surface only in FAQ prose | Peloton (assembly, haulaway) | no | **reject** |

## What we adopt, and in what order

1. **Every saving is computed, never stored.** All five Sonos errors are one bug:
   a number written down once and never recomputed. Our seed already forbids
   invented figures; this extends the same rule to derived ones. A bundle's
   "saving" must be a function of the live component prices at render time, and if
   it computes to zero it says zero.
2. **Show the components with their prices, so the total is auditable.** Sonos's
   "What's included" is the right shape and it is what exposes their own error.
3. **State a downgrade at the moment of selection.** Sonos knows surrounds lose
   AirPlay, Bluetooth and line-in, and says so only in Support. A refusal grammar
   that can say *why an option is unavailable* can equally say *what this choice
   costs you* — the same object, one more kind.

## What we reject, and why

- **SKU proliferation instead of a builder.** 38 sets whose names carry the
  configuration is a taxonomy the shopper has to learn. We already reject this by
  having a configurator at all.
- **Deferring a mandatory cost out of the total.** Peloton's own string says it
  plainly; their own rental page shows the honest alternative.
- **Urgency furniture** — countdown timers, stale offer blocks, three variants of
  one financing sentence across five pages.

## Sources

- <https://www.sonos.com/en-us/shop/bundles>, `/shop/speaker-sets`, and the individual set pages (read via text proxy — sonos.com returns 403 to direct fetch)
- <https://support.sonos.com/en-us/article/surround-sound-guidelines-and-limitations> — the same-model rule and the disabled-features list
- <https://www.onepeloton.com/shop/bike>, `/shop/bike/starter-package`, `/shop/bike/ultimate-package`, `/financing`, `/bike/rentals`
- <https://arstechnica.com/gadgets/2024/08/app-redesign-blowback-will-cost-sonos-up-to-30-million-ceo-says/> — the cost of a redesign that removed working features

**Not verified:** whether Sonos offers BNPL at checkout (a cart could not be
built; Klarna publishes a Sonos merchant page, which is a third-party claim). The
All-Access membership price a US shopper is charged today — Peloton's own site
string says **$44/mo**, CBS and CNBC reported a rise to **$49.99** on 2025-10-01,
and the support article that would settle it is JS-gated. No regulator action on
Peloton's price advertising was found, but both ASA and BBB National Programs
search endpoints are JS-gated, so treat that as unverified rather than absent.
