# THE ACTION BAR — the owner's direction, recorded before it is built

**Status:** an instruction, not a proposal. Written down verbatim so it is not paraphrased away
between here and the build.

---

## 0 · WHAT WAS SAID

> "this ui is just not good. we are too confined by the paradigm of tables that we have made it
> very hard to manage in the table view. It should be tables yes, but easier to manage.
> remember, people will export. And than reupload. Reminder again that the bottom bar should
> have all of the actions and things in it. As a secondary bottom bar. think an action bar
> slightly above it with actions relevant to the page you are on when needed. smaller. things
> like delete row or add row or fit or collapse or search within table or basically that whole
> top bar. I don't get the what goes with each one that is just confusing"

Note the word **"Reminder"**. This has been asked for before and not done. It is not a new idea
being floated; it is an outstanding instruction.

---

## 1 · THE PROBLEM, MEASURED ON THE SCREEN THE OWNER SENT

The table page for Highfield Inflatables, at 1920 wide, spends **three stacked bars** before a
single row of data:

| band | what is in it |
|---|---|
| 1 | `← Back` · **HIGHFIELD INFLATABLES · 40 VARIANTS** · `What goes with each one` · `Columns` |
| 2 | `Search rows…` · `COLLAPSE ALL` · `FIT COLUMNS` · `ROWS 40` · `COLUMNS 34` · `DELETE ROWS` · `+ ROW` |
| 3 | `SECTIONS` · Identity 13 · Capacity 3 · Construction 2 · Cost Build 5 · Motor Envelope 4 · Registration 2 · Hull Only Pricing 3 · Source 1 |

Every one of those is charged to every screen, permanently, whether or not the person is using
it. This is the same fault the rail had — the redesign's own commit measured the rail's cost as
"the first table row drawn 608px down a 744px column" and killed it for exactly this reason.
The register then grew three bars back on top.

**The pattern to apply is the one already established:** navigation and actions live in the
floating bottom bar, *on demand*, and the page gets its height back.

---

## 2 · THE INSTRUCTION, AS A SPECIFICATION

### 2.1 A second, contextual bar above the dock

- It sits **slightly above the existing floating dock**, as a second, smaller bar.
- It is **smaller** than the dock — subordinate to it, visibly a different tier.
- It carries **actions relevant to the page you are on**, and **only when needed**. On a page
  with no actions it is not there at all.
- The dock stays what it is: where you *go*. The action bar is what you *do*. That distinction
  must survive first contact — if a control could plausibly sit in either, it belongs in the
  action bar, because the dock is already load-bearing.

### 2.2 What moves into it, from the register

Named by the owner: **delete row, add row, fit, collapse, search within table** — "basically
that whole top bar".

So bands 1 and 2 above empty into the action bar, leaving the page to start at the data. What
remains at the top is the minimum that says where you are and how to leave: the way back and
the subject's name. That is the same rule every stage already follows.

### 2.3 The counts are not actions

`ROWS 40` and `COLUMNS 34` are facts, not buttons, and they are already said in the title block
(`40 VARIANTS`). Do not move a fact into an action bar. Decide where a count belongs and say so
— but it must not be duplicated in three places, which is what happens today.

### 2.4 The sections strip

Band 3 is a different animal: it is a **filter over the columns**, it is per-table, and it is
how a 34-column register becomes readable. It is closer to the data than to the chrome.
Decide deliberately whether it belongs in the action bar, folded behind one control there, or
stays adjacent to the grid — and defend the choice. **Do not delete it**: on a 34-column table
it is the thing that makes the register usable at all.

---

## 3 · "WHAT GOES WITH EACH ONE" IS RENAMED

> "I don't get the what goes with each one that is just confusing"

It is a **question**, and the redesign's own commit `4c4a3e2` already settled that a place is
named with a **noun that says what is on the screen** — never a question, never the shape of
the screen. That commit renamed "What fits what" → **Fitment** on the navigation bar for
precisely this reason, and this control was left behind.

It opens the same thing. **Call it `Fitment`**, so the bar and the button agree.

---

## 4 · EXPORT AND RE-UPLOAD IS A FIRST-CLASS WORKFLOW

> "remember, people will export. And than reupload."

This is a statement about how the product is actually used, and it has consequences beyond
adding a menu item:

1. **It must be reachable from where the work is.** A person edits a register, exports it,
   works in Excel, and brings it back. That round trip should start at the table, not only from
   a global menu.
2. **The round trip must not lose anything.** `src/features/io/envelope.ts` already carries the
   contract and its tests, including the image round-trip. Re-uploading must preserve columns,
   sections, hierarchy, images and provenance (`Source` cells like `Boat Module!R829`).
3. **Re-upload must say what it is about to do before it does it** — how many rows matched,
   how many are new, what will be overwritten. A silent merge over a real dealership's price
   file is the worst failure this app could have.
4. It must survive the discontinued contract: a re-upload must not resurrect a retired row as
   live, nor delete rows an old quote was written against.

---

## 5 · WHAT THIS IS NOT

- **Not a re-skin.** The visual language stays exactly as it is — tokens, type, spacing, the
  dock's material. This is a relocation of controls and one rename.
- **Not the removal of any capability.** Every action listed above still exists afterwards, in
  a better place. Deleting a control is not the same as moving it.
- **Not an excuse to stop being a table.** "It should be tables yes, but easier to manage."
  The register stays a register.

---

## 6 · AS BUILT — what actually landed, and the decisions §2.4 asked for

Built on `redesign`. The spec above is the instruction; this section is the record, so nobody
has to re-derive a decision that has already been made.

### 6.1 The mechanism, not the widget

`src/lib/actions.ts` is a module-level register read through `useSyncExternalStore`, exactly
like `rowRevealState` and `tableFitState` — session state, never the project store.
`src/app/ActionBar.tsx` draws it; `src/app/actionbar.css` measures it.

**It is drawn inside `.dk-wrap`**, above `.dk`. That one decision answers §7 of the brief
outright: `.dk-wrap` already carries `data-note-clear`, so `UndoKeys`' measured note floor
clears the new bar at every window width with no new constant and no second attribute. Measured
at 1440 × 900 with a row struck: note 709–743, bar 767–807, dock 817–878. The layering was
solved once, by being inside the thing that had already solved it.

**Any stage can publish.** `useActionBar(owner, groups)`, groups carry a `rank`, and the bar
flattens every publisher's groups into one sorted list. Two publishers per page is normal and
tested (`src/lib/actions.test.ts`, 8 cases): the table STAGE publishes the doors, the SHEET
inside it publishes the register, neither can see the other, and the doors land between the
sheet's two groups because 50 is between 30 and 90.

The item vocabulary is closed — `button`, `search`, `panel`, `chip` — so no page can grow its
own toolbar type. A page needing a fifth shape adds it once, for everybody.

### 6.2 What the register's three bands became

| was | is |
|---|---|
| `Search rows…` | `search` item, rank 10 |
| `SORT` / `FILTER` chips | `chip` items, rank 20, in the one group allowed to scroll |
| `Clear` (buried in the count read-out) | a control of its own, rank 20 |
| `SECTIONS` strip, 32px of every screen | one `panel` control, rank 30 — see 6.4 |
| `COLLAPSE ALL` · `FIT COLUMNS` | rank 30, unchanged, still latching |
| `Fitment` · `Columns` (band 1) | rank 50, published by the stage |
| `DELETE ROWS` · `+ ROW` | rank 90, danger and primary |
| `ROWS 40` · `COLUMNS 34` | **not actions** — see 6.3 |

What is left at the top of a register is the way back and the subject's name. Measured on
Highfield Inflatables: the first column header moved from y 150 to y 52 at 1280 and 1440 — 98px
of page returned, on every register, every time.

### 6.3 The counts (§2.3, answered)

- **Rows** is said once, in the title block, in the dealer's own noun. The sheet reports the
  narrowed figure up (`onCount`) so the same sentence carries it: `199 of 588 variants`.
- **Columns** had no home in the title and is said once, in the sections panel — the one
  surface in the app that is about columns: `33 columns in 8 sections.`
- Neither appears on the action bar. A count is not an act.

### 6.4 The sections strip (§2.4, answered — folded behind one control, and why)

`BandStrip`'s own header calls it **a map**. A map is consulted, not watched, and this one was
charging every register 32px of permanent height for a thing used a few times an hour — the
same trade the rail lost. So it is **one control on the action bar** that opens the whole strip
in a popover: every chip, every count, the folded state, the "in view" line, nothing removed.

The one answer a map owes at a glance — *which band am I in* — is **not** behind the press. It
is the second word on the closed control: `Sections · Capacity`, live, at zero cost to the page.

The component is not forked. `BandStrip` still draws itself on the blueprint's expanded card,
which is not a stage and has no action bar; the popover re-lays it from its own scope, which is
the arrangement `WholeTableControls.tsx` already states for these shared pieces.

### 6.5 Generalisation (§5 of the brief)

The **fitment page** is the second surface: "Quote this one" was the whole of its track 3, a
small pill in the far corner, and is now the primary on the action bar — the most consequential
press on the page, in the place a salesperson's hand already is. Its aside also stopped saying
"what goes with each one"; it says `fitment for this one`, and the last copy of that phrase in
the app (the quote editor's empty-picker note) now points at "the table's Fitment page".

Home, the data model, modules, business rules, quotes and the column setup publish nothing, so
they have no bar at all and the page keeps its 132px. That is the point.

### 6.6 Measurements

- bar 40px against the dock's 60; controls 28px at 7px radius; bar radius 18px; 10px above the
  dock, which is `.dk-wrap`'s own `gap`.
- the strip: `.shell-root.has-acts .shell-stage { inset: 0 0 132px 0 }`, one owner, one rule.
  132 is exact (22 + 60 + 10 + 40) rather than the dock's 78-for-82, because this bar's bottom
  edge would otherwise land on the register's horizontal scrollbar.
- width at 1280 with every control up: **985px**, no overflow, 147px clear each side.
- contrast, composited through the full ancestor chain: labels 7.60:1, lit control 5.17:1,
  danger hover 5.16:1, placeholder 6.84:1, refusal note 7.65:1, separator 4.69:1. Minimum 4.69.
  **Two failures were found and fixed by measuring**: `--ink-faint` on the lit control's
  `--blue-wash` at 4.13:1, and `--red` on `--red-wash` at **4.49:1** — the delete control, one
  hundredth under the floor.

---

## 7 · §4 AS BUILT — the round trip, and what running it into Excel found

Built after the bar, on `redesign`. `src/features/io/tableCsv.ts` is the trip,
`src/features/io/TableRoundTrip.tsx` is the two controls and the preflight,
`src/features/io/csv.ts` is the file wrapper.

### 7.1 Where it lives (§4.1)

**Rank 40 on the action bar the register already publishes** — between "see all of it" (30)
and the doors (50), which is where "take it away and bring it back" reads. `Export` ·
`Re-upload`, on every table page. No second menu, no new bar. The whole-sheet envelope keeps
its own door on Home; the two are different acts on different things, and 7.5 says why.

**What leaves is what the register is showing.** Narrow 588 variants to 12 and the file has
12, said out loud in the note that follows. It is safe to be either, because the merge never
deletes: the other 576 are counted as untouched and left alone.

### 7.2 The preflight is the product (§4.3)

`planTableUpload` **writes nothing**. It answers in counts a person can check — how many lines
matched, how many are new, exactly which cells would change and from what to what — and every
refusal as its own sentence. Only a deliberate press of the house confirm applies it, and the
apply is a loop over the plan that cannot write anything the plan did not name.

Measured in the app, on Highfield Inflatables, after two prices were changed and one row added
in real Excel:

> 588 rows matched, 2 of them are overwritten across 2 cells, 1 row is new.
> `589 IN FILE · 588 MATCHED · 2 OVERWRITTEN · 1 NEW · 588 HERE`
> `Highfield - RU230KAM (PVC) WH  CASH  2̶7̶7̶0̶ → 71990`
> `Highfield - RU230KAM (HYP) WH  CASH  5̶3̶2̶0̶ → 72990`
> NEW ROWS · `Highfield - RU999KAM (PVC) WH`

And it is still undoable: the apply writes in one turn of the event loop, so the store records
**one** history step for the whole merge. One Ctrl+Z took 589 variants back to 588.

### 7.3 The contracts it keeps (§4.4)

- **Nothing is deleted.** A row with no line in the file is left alone and counted, because a
  quote already given may have been written against it.
- **Nothing is resurrected.** Discontinued → live is refused, named and counted; live →
  discontinued goes through, because that direction only ever withdraws stock.
- **No column is added or removed.** Structure travels in the envelope; rows travel here.
- **Calculated and picture columns are exported to read and never written back**, said out loud
  rather than silently dropped.

### 7.4 Excel is the real other end, and running it there found four faults (§4.2, §4.6)

The trip was measured against Excel 16 through its own automation — write a file, open it,
press its own Save, read the bytes back — on three real registers totalling **3,757 rows**.
Four things were wrong, and none of them was reachable from a hand-written fixture.

| found | why | fixed by |
|---|---|---|
| a row key beginning `-` came back as `#NAME?` | Excel enters formula mode on `= + - @`; a `nanoid(10)` key starts with `-` about **one time in sixty-four**, which is 9 rows of a 588-row register | a leading-tab guard, on at the seam and off at the seam — the only candidate that measured clean **in both directions** |
| `3-4` came back `3-Apr`, `007` came back `7` | Excel re-reads codes as dates and eats leading zeros | the same guard, applied by what the text looks like — a plain number is never guarded, so a price list can still be totalled |
| an **untouched** export re-uploaded as **523 of 588 rows overwritten** | `formatNumber` rounds `1671.4285714285713` to `1671.4286` to be read; comparing the values made every rounded cell look edited — and pressing it would have written the rounded figure over the exact one | "unchanged" is asked in **text** first: the same word back is no edit |
| `Trade Price 703 → 0` on every rigging kit | `Rigging Kits` carries `Trade Price` **twice** and `Dealer Fit Packages` carries `Code` and `CTD` twice — four pairs straight out of the workbook — and one map from name to column let the second field win the name, so the first column's figures were written into it | a shared name is **refused by name** and nothing is written to either. Matching by position was rejected: it is right only while nobody moves a column in Excel |

After the fixes, all three registers re-upload with **zero** changes reported and **zero**
written, and two cells typed into Excel are still reported as exactly two.

One measurement went the other way and is worth recording: because the file opens with a UTF-8
BOM, **Excel reports it as `xlCSVUTF8` and its own Save writes UTF-8 back** — `—`, `"` and `Ø`
all returned byte-identical. The three bytes are not just how the file is read; they are how it
is written.

### 7.5 Can a person really "work in Excel" with this? (§4.6)

**Yes, for a register, and that is the trip the instruction describes.** A `.csv` is opened by
Excel on a double-click, edited, and saved with Ctrl+S, and the four faults above were the
things standing between that sentence and the truth.

**The whole-sheet envelope stays JSON, and that is the right split.** It carries columns,
sections, hierarchy, rules, pages, modules, quotes and images by id — none of which is a
spreadsheet, and no dealer will ever open it in Excel. It is the backup, not the editing
surface.

What a real `.xlsx` would add, honestly, and is **not** built: typed cells (so no guard would
be needed at all), several registers in one file, frozen headers, and read-only columns
actually locked. It needs a spreadsheet-writing dependency, which is a decision for the owner
rather than a thing to add quietly. Two known limits are written down instead: a regional Excel
that defaults to a semicolon delimiter opens the file in one column, and a leading-zero or
date-shaped value in a column somebody added by hand is guarded by shape rather than by type.

### 7.6 Identity through the envelope (§4.2)

A round trip that renames what it touches is not a round trip. Tables, columns and rows already
kept their ids on a replace; **pages and modules did not**, because `restoreDesign` put them
back through `createView` / `createModule`, which mint. A quote keeps exactly two ids and
`viewId` is one of them, so restoring a backup left every quote's "make another like this one"
pointing at a page id that no longer existed.

`createView` and `createModule` now take a `keepId` used only by restore, and ignore it if it
is already taken. **A replace keeps ids; a merge still reissues them** — on a merge the file is
added *beside* work already here, and the case it has to survive is the same backup merged
twice. Both directions are pinned in `envelope.fullTrip.test.ts`.
