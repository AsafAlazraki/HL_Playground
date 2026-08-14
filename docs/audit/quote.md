# JOURNEY FOUR — QUOTING

**Lens:** a sales manager with a customer in front of them asking for a price on
a Highfield SP560 with a 115hp Yamaha.
**Run at** 1280×800, Chromium via Playwright, dev server on :5090.
**Profile** wiped twice during the pass (localStorage + IndexedDB) so that
"cold" means cold. Screenshots in `docs/audit/screens/`, prefix `quote-`.

**Console errors: 7 across the whole session, all one class** — cross-origin
image probes at `northsidemarine.com.au` blocked by
`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`. That is the documented baseline (≤2
per load). **Zero JavaScript errors were produced by anything in this journey**,
including issuing, versioning, printing and reloading.

---

## The short answer

The quote itself is the best-finished thing I have seen in this app. The
document is genuinely handsome, the arithmetic is right in every case I
checked, every price is frozen with its provenance, and the total is never off
screen. Two things spoil it, and both of them are about **coming back**:

- **the day after, you can no longer add anything to a quote** (Q1), and
- **the one control that lets you change a given quote is invisible** (Q3).

A quote you can produce but cannot amend is a quote you produce twice.

---

## Could I find quoting at all?

**No — not from where I was standing.** After `Load a worked example`, I
searched the whole rendered page for the string "quot", case-insensitive, via a
TreeWalker over every text node:

```
hits: []          // zero occurrences anywhere in the DOM
```

The masthead has `I/O`. The left panel has *Create table*, seven table types,
*Work out what fits what*, *Business rules*, and 21 tables. Nothing says quote,
price, customer or sell. **`quote-01-loaded-fresh.png`**

Where I looked first, in order: the masthead (nothing), then the two doors in
the left panel — *Work out what fits what* sounds like the fitment question a
customer is actually asking. Neither leads to a price. What works is: click the
boat table → the two doors that appear under it → **What goes with each one?**
→ and only there, top right, `QUOTE THIS ONE` (144×28px at x=1120,y=65).
**`quote-03-viewpage.png`**

The panel's *Quotes we have made* door is gated on `quoteCount > 0`
(`src/app/LeftPanel.tsx:191`), so on the first day it does not exist. And the
one place in the app that explains how to make a quote — `QuoteList`'s empty
state, *"Open a table, press What goes with each one?, pick one and press Quote
this one"* (`src/features/quote/QuoteList.tsx:33-38`) — lives behind that door,
so it can only be read by someone who has already worked it out.

## Counting the clicks

Cold profile → a document in the customer's hand, knowing exactly where to go:

| # | click | note |
|---|---|---|
| 1 | Continue | after typing the business name |
| 2 | Marine | |
| 3 | Load a worked example | |
| 4 | HIGHFIELD INFLATABLES (left panel) | at rest its top is y=717, on screen |
| 5 | What goes with each one? | the doors appear at y=448 / y=484 |
| 6 | the SP560 row | after typing `SP560` in *Find one* |
| 7 | QUOTE THIS ONE | boat **and** trailer come across; motor does not |
| 8 | ADD FROM YAMAHA OUTBOARDS | |
| 9 | Yamaha - F115XB | then type the customer's name |
| 10 | GIVE IT TO THE CUSTOMER | no confirmation step |

**10 clicks and 3 typed fields.** With the data already loaded (the normal
day) it is 7. That is a good number. The hesitations, in the order they hit:

1. **before click 4** — nothing is named quote, so the route has to be guessed;
2. **at click 7** — 14 SP560 variants in the finder, several truncated at the
   character that distinguishes them (Q14);
3. **just after click 7** — the sentence explaining the missing motor is half
   hidden behind the total bar (Q5);
4. **at the trailer line** — I could not see a quantity anywhere (Q4).

---

# FINDINGS, ranked by how early they stop someone

## Q1 · BLOCKER — the day after, every "Add from…" says nothing goes with this boat

**What I did.** Fresh profile → onboard → Load a worked example → Highfield →
What goes with each one? → SP560 (PVC) W-W-WB → **Quote this one**. The quote
mints correctly: boat, trailer, and the motor section saying *"4 Yamaha
Outboards were picked for this one…"*. Then **reload the page** (the "find it
again tomorrow" step), open the quote from *Quotes we have made*, and press
**ADD FROM YAMAHA OUTBOARDS**.

**Expected.** The four Yamahas, one of them the 115.

**What happened.**

> **Nothing from Yamaha Outboards goes with this one yet. Set that up on the
> page that says what goes with each one.**

**`quote-25-day2-picker-dead.png`.** And 40px above it, in the same section,
the app still says *"4 Yamaha Outboards were picked for this one, so none was
chosen for you — pick the one you are quoting."* Two statements about the same
four rows, contradicting each other, one of them false — and the false one is
the one giving instructions. The instruction cannot be followed, because it has
already been done: the view page shows the four motors the whole time.

Same for the trailer section on an older quote (**`quote-24-picker-contradiction.png`**:
the REDCO trailer is printed on the line directly above *"Nothing from NSM
Custom Trailers goes with this one yet"*).

**Reproduced deterministically from a wiped profile.** Measured ids at each
step:

```
after opening the view page   store.views = ["QaUXlc0w_X"]
after "Quote this one"        quote 20260814-01 . viewId = "NkgPtO1vdj"   ← different
after a reload                store.views = ["QaUXlc0w_X"], picker empty
```

**Cause, from the source.** `src/features/views/viewDefs.ts:1-12` says it out
loud:

> *"TEMPORARY HOME. The project store has no action for a ViewDef yet and this
> feature may not add one, so definitions live in module state"*

`createViewFor` mints a `newId()` into a module-level `Map`. The quote freezes
**that** id (`quote.viewId`), and `candidatesFor` opens with
`const view = getViewDef(quote.viewId)` … `if (!view || …) return []`
(`src/features/quote/freeze.ts:465-469`). Module state dies with the tab, the
next session mints a different id, and the quote's id can never resolve again.
`candidatesFor` returning `[]` is then rendered as the "nothing goes with this
one" sentence (`src/features/quote/QuoteEditor.tsx:448-452`) — the empty state
cannot tell "this boat has no relations" from "I cannot find the page".

**Consequences.** After a reload, an existing quote can be printed, re-priced
per line, discounted and re-issued, but **nothing can be added to it**. The
only remaining route to put a motor on it is *Add a line* — a free-typed label
with a hand-typed price, i.e. exactly the class of thing this whole data model
exists to abolish. Note the quote is otherwise fine: the frozen lines,
provenance, and document all survive the reload perfectly
(**`quote-22-reopened-after-reload.png`**).

**Not tested:** whether a quote made *after* a view id has been persisted once
survives (quote `20260814-03`, minted in a session where the store already held
the matching id, still worked after a reload). The failing case is the one every
first-time user hits: the first quote, on the first day.

---

## Q2 · The word "quote" does not exist until you are already inside quoting

Evidence and route above. This costs a first-timer their first minute and there
is nothing to recover with — the door that would teach them appears only after
they have succeeded without it. The fix is cheap: the boat table's door pair
could carry a third door, or the sheet's table card could offer *Quote one of
these*.

Ranked below Q1 only because a determined person does find it: with a table
selected there are exactly two doors, and one of them is right.

---

## Q3 · The only way to change a quote you have given out is invisible

After **GIVE IT TO THE CUSTOMER** the document appears with a bar above it:
`GIVEN TO THE CUSTOMER · 2026-08-14`, a white `PRINT` button, and — at
x=1021..1205 — **MAKE A NEW VERSION**.

Measured on that button:

```
enabled: true          color: rgb(18, 40, 63)      background: transparent
ground:  rgb(18, 50, 82)                           font-size: 11px
contrast ratio: 1.14 : 1
```

**`quote-17-invisible-new-version.png`** is a crop of that bar; the label is a
faint smudge. Cause: `.btn` carries the ink colour of a control on white paper,
and `.btn-ghost` removes the white, leaving that ink on the dark navy stage.
`PRINT` reads only because it kept its background.

This is the answer to "go back and change the quote". The frozen/live boundary
itself is stated well — `GIVEN TO THE CUSTOMER · date`, no editable fields, a
list row marked `GIVEN`, and issued quotes deliberately cannot be discarded
(`QuoteList.tsx:64-66`). It is only the escape hatch that cannot be seen.
Pressing it works perfectly: a new draft `20260814-02` carrying customer,
contact, lines and adjustments, listed as `DRAFT · NEW VERSION`
(**`quote-20-new-version.png`**, **`quote-21-all-quotes.png`**).

---

## Q4 · The quantity box is underneath the price

On the trailer line, the quantity input and the amount overlap:

```
qty input   x 910 → 956   (46 × 32)
amount span x 928 → 974   "$10,713", painted on top
elementFromPoint(935, 304) = SPAN.qt-line-amount      // not the input
clickable width of the qty field: 19px of 46
```

**`quote-08-qty-overlap.png`** — the box appears to be drawn around the "$10"
of the price, and the quantity `1` inside it is completely hidden. On the boat
line the same two boxes sit apart (input 780→826, amount 928→974) because the
name is shorter; the row is a flex line with no reserved column for the
quantity, so it fails on exactly the long product names the real price file is
full of. Changing a quantity does work when you hit the 19px sliver, and the
maths is right (motor qty 2 → line $33,738, total $86,641 → back to 1 →
$67,772).

---

## Q5 · The sentence that explains the missing motor is behind the total bar

On arrival at a fresh quote, with no scrolling:

```
explanation paragraph  y 622 → 673   (3 lines)
sticky .qt-foot        y 647 → 704   (opaque)
```

Two of the three lines are covered — including *"pick the one you are quoting"*
and the whole sentence about starring. **`quote-06-editor-fresh.png`** (covered)
vs **`quote-07-editor-scrolled.png`** (scrolled clear). The text is reachable by
scrolling, but this is the one paragraph in the feature that a first-timer must
read, and it is the one paragraph the furniture is sitting on.

---

## Q6 · An A4 print of a three-line quote is two pages

`page.pdf({format:'A4', margin:12mm})` on the issued document produces a PDF
whose page tree reads `/Count 2` — verified by reading the file
(**`quote-18-print-a4.pdf`**). What lands on page 2 is the tail: the totals
block, the tax sentence and the footer — the part the customer looks at.

Measured under `emulateMedia({media:'print'})` at 794px (A4 at 96dpi):

```
.qt-doc height    1010px  ≈ 267mm
.qt-doc top       161px   ≈ 42.5mm of nothing above the letterhead
A4 printable height at 12mm margins ≈ 273mm
```

The document alone fits. The 42.5mm of dead space is what pushes it over.
Cause: `.qt-doc` is pinned with `position:absolute; top:0`
(`src/features/quote/quote.css:773-776`), which resolves against the nearest
positioned ancestor — and `.qt-root` is **still `position: relative` with
`padding-top:24px`** in print, and its own top is 161px down the page because
the chrome above it is hidden with `visibility:hidden` (quote.css:761-766) and
keeps its layout boxes. `src/app/shell.css:1149-1163` stands down
`.shell-root`, `.shell-stage` and `.shell-viewstage` for precisely this reason,
with a comment explaining it; `.qt-root` was not on the list.

Otherwise the print stylesheet is careful and it shows: chrome gone, 10pt type,
hairlines darkened to survive a laser. **`quote-19-print-media-a4.png`** is the
page as it renders. One smaller note visible there: `.qt-doc` has `padding: 0`
in print, so the boat photo runs flush to the edge of the printable area — only
the browser's own page margin keeps it off the paper edge.

---

## Q7 · DISCARD deletes a draft with no confirmation, and it is 15px tall

In *Quotes we have made*, every draft row carries `DISCARD` at its right edge:

```
row-open button   x 331 → 1143   (height 53)
DISCARD           x 1143 → 1209  (66 × 15)   gap between them: 0px
opacity 1, pointer-events auto — always live, not hover-gated
```

`onClick={() => discardDraft(q.id)}` — straight to the store, no sheet, no undo
(`src/features/quote/QuoteList.tsx:67-76`). A 15px-tall target with no gap
against the 53px target that opens the quote, in an app whose four other
destructive acts all got a `ConfirmSheet` (F24–F27) and which says out loud that
it has no undo (O12). I did not click it — a draft I had just built was on the
other side.

---

## Q8 · There is no way to put a real accessory on a quote

The project has *Parts & Accessories*, 26 products, with Supply and Fitted
pricing. The quote for the SP560 has three sections — the boat, NSM Custom
Trailers, Yamaha Outboards — because the quote's sections come from the view
page's blocks, and the Highfield × Parts & Accessories join has one row that is
not for this hull. The only way to add a cover is **ADD A LINE**: a free-text
label and a typed amount (**`quote-11-add-a-line.png`**). I typed "Boat cover"
and "850", and it landed on the customer's document as a line with no part
number, no source and no provenance — everything the frozen lines have and this
one cannot.

That is QUOTE_FINDINGS §3.4's "no line-item model" arriving through the side
door. Adding the block on the view page (SET UP → drag the table in) would fix
it for that hull, but nothing anywhere says so at the moment a salesperson wants
an accessory.

---

## Q9 · The picker cannot be searched, and has no way out to the rest of the table

`PICK FROM YAMAHA OUTBOARDS` lists exactly the curated rows for that hull — 4
of the 43 Yamahas — with no search box and no "show all" (`quote-09-add-motor-picker.png`).
If the customer wants an F150 that nobody has paired to this hull, the quote
cannot price one; you get the free-typed line of Q8. QUOTE_FINDINGS §2.5 names
this exactly: *"Curation fails open, always with an escape hatch."* Here it
fails closed.

The same picker is also where the false "nothing goes with this one" sentence of
Q1 appears. `candidatesFor` does keep already-added rows and marks them
`on the quote` (`freeze.ts:483-505`, `QuoteEditor.tsx:485-487`) — that part is
right; I never saw it in a working state because the sessions where the picker
worked had nothing already added.

---

## Q10 · "Starring it" names a control you cannot see

The motor section's explanation ends: *"Starring it on the page makes it come
across on its own next time."* On the view page, at rest, a motor row contains
**no buttons at all** — I enumerated them: `btns: []`. Hovering the row changes
nothing (**`quote-26-star-on-hover.png`**). The star only renders when the block
is `configuring`, i.e. after pressing **SET UP** on the view page
(`src/features/views/BlockCard.tsx:597-608`), and there it is titled
*"Recommend this one"* — the word "star" is never used where the star is
(**`quote-27-setup-star.png`**: hollow star + ×, 24×24, per row).

So the advice is actionable — SET UP → star → DONE, two extra clicks — but the
sentence names neither the mode you must enter nor the word the control uses.

---

## Q11 · The price file already says which motor is recommended, and the quote ignores it

The join carries the MPF's own curation: the picker prints
`Slot 1 · Recommended Yes` against Yamaha F90XB. The quote's auto-carry rule
reads a *different* recommendation — the system pair field the star writes
(`freeze.ts:375-377`, `pairs.ts:238`) — so a business whose imported data
already states its recommended package is told *"none was chosen for you"* and
asked to star one by hand. Two notions of "recommended", one imported and
decorative, one hand-set and load-bearing. QUOTE_FINDINGS §2.4 wanted the
business's opinion first.

---

## Q12 · The curated motor menu is not in slot order, and it changed between sessions

Same boat, same data, three readings:

```
session 1, view page + picker   F90XB(1)  F90XB2(2)  F115XB(3)  F115XB2(4)   quote-05
session 2, picker               F115XB2(4) F115XB(3) F90XB2(2)  F90XB(1)
session 3 (fresh profile), view F115XB2   F90XB2    F90XB      F115XB        quote-26
```

Rows are sorted by `pair.order ?? UNORDERED + index` (`pairs.ts:399-403`), so
with no explicit order the sequence falls back to row index and is not the slot
order the business wrote. **Cause of the change between sessions not
established** — I altered no view setting between readings. The consequence
that matters for quoting: the recommended slot-1 package is not at the top of
the menu, and in two of three readings it was last.

---

## Q13 · Two quotes for one customer are indistinguishable in the list

The list row is date · customer · subject · state · total
(**`quote-21-all-quotes.png`**). It does not carry the **reference** — the one
identifier printed on the document and quoted back over the phone. My two rows
read identically except for `GIVEN` vs `DRAFT · NEW VERSION`:

```
2026-08-14 | Mr J. Halloran | Highfield - SP560 (PVC) W-W-WB | DRAFT · NEW VERSION | $67,772 | DISCARD
2026-08-14 | Mr J. Halloran | Highfield - SP560 (PVC) W-W-WB | GIVEN                | $67,772
```

---

## Q14 · Picking the right SP560 out of 14 means reading truncated names

`Find one` → `SP560` returns 14 variants in a 205px column. Measured overflow
on the name span: `scrollWidth 197 vs clientWidth 185` etc. — the ellipsis eats
the colour code, which is the only thing that differs between them. Two adjacent
rows both render as **"Highfield - SP560 (PVC) LG-W…"** while the underlying
values are `LG-W-WB` and `LG-W-DB` (**`quote-04-find-sp560.png`**, rows 2 and 3).
The variant decides the price, and the salesperson is choosing between two rows
that read the same.

---

## Q15 · Two small targets and one clipped placeholder

- the per-line price control (the chevron beside the amount) is **22 × 22px**,
  under the 24px floor, and is a naked chevron;
- `OVERRIDE THE PRICE` shows its placeholder as *"leave blank to use the pric"*
  — clipped in a 162px input (**`quote-23-line-price-open.png`**);
- `RE-READ TODAY'S PRICES` is a real button rendered as 11px ghost text with no
  border, indistinguishable from the section labels around it
  (**`quote-14-reference-tax.png`**).

---

## Q16 · Coming back to the view page always lands on the first row

After quoting the SP560 and returning to *What goes with each one?*, the page
opens on `RU230KAM` — the first row of 40 — not the boat I was just quoting. On
a 40-row table that is the search box, again, every time.

---

# What is right, and should not be broken

Recording these because they are the load-bearing parts and they work.

1. **The document.** `quote-16-document-top.png`. Letterhead, date, reference,
   *Prepared for* with the contact as typed, the boat's photo and specs,
   sectioned lines with qty and amount, a Package/adjustments/Total block, and
   *"The amounts above are inclusive of tax unless otherwise stated."* I would
   hand this to a customer.
2. **The total is never off screen and is always right.** The sticky footer held
   at every scroll position I tried, and every number it produced checked out by
   hand: 52,053 → 68,922 (motor) → 69,772 (accessory) → 86,641 (qty 2) →
   67,772 (qty back to 1, less a $2,000 discount).
3. **The freeze is real and carries provenance.** Every stored line has
   `unitPrice`, `priceFieldId`, `priceColumnName`, **every** price level with its
   value, `sourceNote` (`"Boat Module!R829"`, `"Motor Library!R90 · Boat
   Module!R829 LL..LP"`), the join's `pairFacts` and the image — copied by value.
   This is QUOTE_FINDINGS §2.1 and §2.2 delivered.
4. **The per-line price panel.** *"read from Cash · Boat Module!R829"*, then
   `PRICE THIS LINE AT Cash $41,340 / Trade $39,273 / Warranty $27,453`, then
   `OVERRIDE THE PRICE — leave blank to use the price file`. Nothing else in the
   app explains a number this well. Note it offers a **third** level (Warranty)
   that the quote-wide `PRICED AT` chips do not.
5. **Price levels switch cleanly.** Cash → Trade moved boat 41,340 → 39,273 and
   motor 16,869 → 16,633, left the trailer alone (it has one level), and the
   total followed.
6. **Nothing is required that a salesperson would not have to hand.** Customer
   name is free text, contact is one textarea *"one line each — as it should
   print on the quote"*, *Prepared by*, *Reference* (pre-filled), *Tax rate %*
   (*"leave blank if the total is tax-inclusive"*) and a note are all optional,
   and `GIVE IT TO THE CUSTOMER` is not gated on any of them.
   **`quote-13-contact-details.png`**
7. **Quotes survive a reload** and the door carries a count (*3 made so far*),
   which is the right thing for someone coming back on Tuesday.
8. **An issued quote cannot be deleted** — deliberate, and stated in the source.

---

# Not tested / not verified

- 1920×1080. Everything above is 1280×800 only.
- A real printer, and any paper size but A4.
- Keyboard-only and touch. The 15px DISCARD and the 22px chevron are measured,
  not tried with a finger.
- `ADD A REBATE` and `ADD A TRADE-IN` — only *Add a discount* and *Add a line*
  were exercised.
- The `N not priced` state in the footer (`totals.unpricedCount`): no unpriced
  row was encountered, so the amber-pill behaviour QUOTE_FINDINGS §2.6 asks for
  is **unverified**.
- A quote long enough to need two pages on purpose.
- **I/O and quotes.** `grep -i quote src/features/io` returns **no matches**, so
  an exported project file carries no quotes and an import cannot bring any back.
  Code-read only — I did not exercise export/import against a quote, and I have
  not checked what an import of a *different* project does to the quotes already
  in `localStorage` (they key off entity and row ids, so the dangling case looks
  possible; not verified).
- Whether Q12's ordering change is deterministic. Observed three orders, cause
  not established.
