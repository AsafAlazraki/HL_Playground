# THE COMPLETENESS CRITIC — what the other eight did not look at

Ninth pass. Brief: assume the eight before me are each competent and each
blinkered; go and use what nobody used; put the app into states nobody put it
in; trace the recovery path; hunt a third lie.

Screenshots: `docs/audit/screens/criticB-*.png` (40).
**Naming note:** an earlier, aborted run of this same lens left ~30 screenshots
in the same folder under the plain `critic-NN-*` prefix, timestamped 13:32–14:04,
with no report. Mine are all `criticB-`. I did not delete theirs and I claim
none of their evidence.

Everything below is either something I did in the browser and measured, or a
`file:line` I read. Where a claim is source-only I say so. Nothing under `src/`
was touched.

---

## HOW I GOT A CLEAN PROFILE WITHOUT DESTROYING THE AUDITED PROJECT

The dev server binds `localhost`. `http://sandbox.localhost:5090/` reaches the
same server on a **different browser origin**, so it has its own IndexedDB and
its own localStorage. Every destructive test — CLEAR SHEET, a first run from a
blank profile, pasting rubbish into cells — was done there, on a made-up
business called *Coastal Marine Centre*. The real Bayside Boats project was only
used for the export/import round trip, and was restored and verified.

**State of the audited project at hand-back** (measured after the last action):
22 tables · 651 rows · 2 flow rules · 4 relationship tables · Highfield 31
columns / 7 bands / 3 levels · Highfield's view page 2 blocks, both curated ·
org "Bayside Boats". Identical to the baseline I recorded on arrival, with one
exception: **`meta.exportCount` is 3, was 1** — I exported twice and the rev
number is cosmetic and monotonic. Two files were downloaded into
`.playwright-mcp/` (`bayside-boats-rev03.json`, my working backup; a copy is in
the scratchpad).

Where a test needed a table, I made one and removed it. `ZZ ONE COL` (0 rows,
0 columns) was **already there when I arrived** — it is the earlier run's, not
mine.

---

# FINDINGS

Ranked by how much of a person's work they destroy and how ordinary the act is
that triggers them.

---

## C1 · Two tabs of the same app silently erase each other's work

**The most ordinary thing a person does with a browser, and it is total,
silent data loss.**

What I did, in one browser, both tabs on `localhost:5090`:

| step | tab | action | result |
|---|---|---|---|
| 1 | B | created a table (a 195-char name, to be unmistakable) | tab B: TABLES **23** |
| 2 | A | still open from before, showing TABLES **22**, knows nothing about it | — |
| 3 | A | created a table "TAB A TEST" | tab A: TABLES 23 |
| 4 | — | read IndexedDB directly | **23 entities on disk, and the only `TAB *` table is `TAB A TEST`** |
| 5 | B | untouched window still reads TABLES **23** and still lists the long-named table — `criticB-15-tabB-ghost.png` | a table that no longer exists |
| 6 | B | reload | TABLES 23, `TAB A` present, **`TAB B` gone.** No message, no conflict, nothing |

Cause, read from source:

- `src/db/repository.ts:48-70` — `saveAll` **clears every table** (`meta`,
  `entities`, `groups`, `rules`, `rows`, `views`) and rewrites the whole
  snapshot inside one transaction. It is not a diff; it is a replace.
- `src/store/useProjectStore.ts:183-189` — every mutation schedules that
  whole-DB rewrite 400 ms later, from **that tab's in-memory copy**.
- Nothing anywhere in `src/` listens for cross-tab change: `grep` for
  `BroadcastChannel`, `addEventListener('storage'`, `visibilitychange` returns
  **zero hits**.

So the last tab to touch anything wins, and it wins by wiping. The loser is
whichever tab has the newer work. A person who opens a second tab to compare two
tables — and then nudges a table in the old one — loses everything they did in
the new one, and the app has no undo and no conflict message.

Not tested: two *windows*, or the same file open on two machines (no sync, so
presumably out of scope).

---

## C2 · The only backup does not round-trip. Import loses every table's kind, its role, its grouping levels and its bands

This is the recovery path. It is also the app's own stated invariant, in the
header of the file that breaks it: *"NOTHING VALID IS LOST … a legitimate set
survives export → import unchanged"* (`src/features/io/envelope.ts:18-24`).

**What I did:** exported the audited project through the real UI (I/O →
Everything), then imported that same file back through the real UI.

**What the file contains** (read from `bayside-boats-rev03.json`): entity keys
are `accent, createdAt, description, displayFieldId, fields, hierarchy, id,
kind, name, position, role, sections, updatedAt`; field keys are `description,
id, name, refEntityId, sectionId, type`. Kinds present: `boat, motor, trailer,
accessory, custom`; roles: `base, join`. **The file is complete.**

**What survives the import** (measured on the imported copy of Highfield
Inflatables, beside the original in the same store):

| | original | imported copy |
|---|---|---|
| `kind` | `boat` | **undefined** |
| `role` | `base` | **undefined** |
| `hierarchy` (grouping levels) | 3 | **undefined** |
| `sections` (bands) | 7 | **undefined** |
| `fields[0].sectionId` | `identity` | **undefined** |
| fields / rows | 31 / 40 | 31 / 40 ✓ |

Cause, exactly: `src/features/io/envelope.ts:578-593` builds the entity from
`id, name, description, accent, fields, displayFieldId, position, groupId,
createdAt, updatedAt` and **nothing else**; the field builder at `:563-576`
copies `id, name, type, description, required, options, refEntityId, formula,
defaultValue` and **not `sectionId`**.

What that costs the person, on screen (`criticB-21-imported-tables-all-custom.png`):

- the left panel filed **all 23 imported tables under `CUSTOM TABLE`** — boats,
  motors, trailers and the four **relationship** tables together, while the
  originals stayed under BOATS 07 / MOTORS 02 / TRAILERS 07;
- the four join tables lost `role: 'join'`, so they are no longer relationships
  — `findJoinTable`, the RELATIONSHIPS group and "what goes with each one" have
  nothing to find;
- the grouping drawers (Series → Model → Variant) and every band
  (IDENTITY / PRICING / MARGIN / …) are gone, which is the entire visual
  grammar of a table in this app.

A person restoring last week's backup gets their rows back and their *product
model* destroyed, with no message. Since export is the only undo the app has
(every confirm sheet says *"can only come back from a file you exported
earlier"*), this is the failure of the last resort.

---

## C3 · On the restore screen, the dark primary button doubles your project — instantly, with no confirmation

`criticB-19-import-preview.png` → `criticB-20-after-add-to-sheet-45-tables.png`.

The import preview offers `DISCARD` · `REPLACE` (ghost) · **`ADD TO SHEET`**
(filled, primary). A person opening their own backup presses the primary button.
One click, no dialog:

- tables **22 → 45**
- rows **651 → 1302**
- rules **2 → 4**
- **22 names now appear twice**

`src/features/io/apply.ts:257` — *"additive — nothing on the sheet is touched,
so no confirm"*. True of the existing rows, false of the person's mental model.
And because merge offsets every imported table by only **+80/+80**, each copy
lands *behind* its original: the sheet looks almost unchanged. The only visible
signal is the counter reading 45.

There is no undo. The way back is Replace-from-file, which is C2.

Related, same screen: the preview headed **"This File Holds"** reports
`22 TABLES · 451 COLUMNS · 651 ROWS` and never mentions the **2 rules** the file
also holds and will import.

---

## C4 · THE THIRD LIE — the app tells every dealer that six rules were read out of a spreadsheet they have never owned, and that two of them are being checked

`criticB-35-workbook-rules-in-a-project-with-no-workbook.png`.

Clean profile. Business: *Coastal Marine Centre*. Two tables I made by hand.
Zero flow rules (`store.rules` = `{}`). Business rules → scroll:

> **FROM YOUR PRICE FILE**
> **6 rules your workbook already states**
> Read out of **Boat Module (5).xlsx** — each one traced to the cell that says
> it. **2 of 6 are being checked.** The rest are listed so you know what is *not*
> being checked…
> **CHECKED IN WORK OUT WHAT FITS WHAT · MOTOR FITMENT** — A motor whose
> horsepower exceeds the boat row's Max HP must be rejected.
> *Boat Module (5).xlsx · Boat Module!KV:KW · Min HP / Max HP column pair…*

Measured on that page: **13** occurrences of "Boat Module", 2 × "CHECKED IN WORK
OUT WHAT FITS WHAT", 4 × "NOT CHECKED" — in a project with **0** rules in "Work
out what fits what" and no workbook of any kind.

Source: `src/features/constraints/WorkbookRuleList.tsx:78-79` — the section
renders whenever `WORKBOOK_RULES.length > 0`, which is always (six are hard
coded in `workbookRules.ts` from `C:/Users/AsafA/Downloads/Boat Module (5).xlsx`).
`running` at `:82-84` counts `s.enforcedIn`, a **static property of the seed**,
so "2 of 6 are being checked" is a constant. It is unconditional on project,
data, industry or whether those two flow rules exist.

This is the same class as the two lies the user found this week ("No rules yet"
when six existed; a quote silently dropping four picked motors), and it is
worse: it asserts provenance. It tells a stranger's dealership that their own
price file states six rules, names another company's file and cell ranges as the
source, and claims two checks are running that are not.

---

## C5 · CLEAR SHEET does not clear the business rules — and they come back into the new project, switched ON, unreadable and undeletable

Run in the sandbox, end to end (`criticB-36-rule-survived-clear-sheet.png`):

1. Wrote one business rule → pane reads `1 RULE`; localStorage
   `helmlogic.constraints.v1` = `{ "coastal marine centre": [ … ] }`.
2. I/O → **Clear Sheet** → *"Clear the sheet? Every table, column and row will be
   wiped…"* → **Confirm again — this cannot be undone.** Both accepted.
3. Project wiped (0 tables, back at "What's the name of your business?"). The
   constraint is **still in localStorage**, `enabled: true`.
4. Re-onboarded with the same business name (which a person will, it is their
   business) and made one table.
5. Business rules now reads **`1 RULE`**, switch **ON**, sentence:

> **When *a column that is gone* is PVC, *a column that is gone* must be AUD**
> because material is PVC

A live rule, in a project it does not belong to, about columns that never
existed here. And there is no way to remove it: I enumerated every control in
the pane's root — `because` input, *Add rule*, the *Rule is on* switch, and the
card itself. `anyDelete` over the whole `cn-root` innerHTML: **false**.
(`constraintDefs.ts:232` — "no per-rule delete by design", already logged by the
view-and-rules pass; this is what it costs.)

The source predicted it and nobody wired it: `src/features/constraints/index.ts:63-66`
— *"`resetProject()` should also call `clearConstraints()` … or a wiped project
comes back with the old organisation's rules still in it."* `grep` for
`clearConstraints` outside `features/constraints`: **no callers**.
`useProjectStore.ts:257-270` `resetProject` wipes the repository and the store
slices only.

Two consequences beyond the mess: constraints are keyed on the **lower-cased
business name** (`orgKeyOf`), so renaming the business hides every rule the
business wrote, and two dealers with the same name on one machine share rules.
(Rename path not exercised — source only.)

---

## C6 · Quotes are stored outside the project and outlive it. One is on the user's machine right now

Not a hypothetical — this is the state of the audited project as I found it.

The single quote in `helmlogic.quotes.v1` has `rootTableId: "y54HBdfjKe"`.
The project has 22 entities and **that id is not one of them**; its
`viewId: "NkgPtO1vdj"` is not in `store.views` either. It was minted against a
project that a previous pass wiped.

What the app does with it (`criticB-10`, `criticB-11`):

- the left panel advertises **"Quotes we have made · 1 MADE SO FAR"**;
- the list shows `2026-08-14 · no customer yet · Highfield - SP560 (PVC) W-W-WB
  · GIVEN · $52,053`;
- opening it renders a complete, printable quotation on Bayside Boats
  letterhead — image, spec strip, sectioned lines, totals — headed
  **GIVEN TO THE CUSTOMER · 2026-08-14**.

Nothing anywhere says it belongs to a project that no longer exists. The freeze
design (everything by value) is right and is why it still renders; the *scoping*
is the defect — `quotes.ts:40` `STORE_KEY = 'helmlogic.quotes.v1'`, one global
array, not keyed by project, org or anything else, and `resetProject` does not
touch it. So a wipe leaves live "GIVEN" quotes for products the business does
not sell.

This also sharpens **Q1**: see the correction section — view pages *do* persist
now; it is the id that moves.

---

## C7 · The export card is called "Everything", and it holds neither the business rules nor the quotes

Exported through the real UI and captured the actual bytes: the file has exactly
eight keys — `kind, version, exportedAt, project, entities, groups, rules, rows`
(801 KB). `ProjectExport` in `src/types/model.ts:933-943` is the same eight.

At the moment of that export the audited project also had **3 business rules**
(the pane says `3 RULES · 1 CONFLICT`, `criticB-02`) and **1 quote** (`1 MADE SO
FAR`). Neither is in the file, and the card that produced it says:

> **Everything** — Tables and rows — 22 TABLES · 651 ROWS

"Tables and rows" is honest; **"Everything"** is not, and it is the word in
16px. The sentence every confirm sheet in the app leans on — *"can only come back
from a file you exported earlier"* — is therefore false for business rules and
for quotes.

Also missing from the file: the view pages (`store.views`), which do persist
locally but are not in `ProjectExport`. Take the file to a second laptop and you
get tables and rows, no kinds (C2), no rules, no quotes, no pages.

---

## C8 · "Paste a block straight from Excel" — the empty table advertises it, the empty table cannot do it, and it cannot fill the two columns the table is organised by

Nobody in eight passes mentioned paste. It is the first thing a dealer with a
price file will try.

**Test rig, stated honestly:** I dispatched a real `ClipboardEvent` carrying a
`DataTransfer`, because I cannot load the OS clipboard from here. I verified the
event arrives with its text intact (`hasCD: true`, `text: "A\tB"`, target
`.tb-grid`) and I ran a positive control that **worked** — so a null result
below is a real null result, not a broken harness.

**a. On a table with no rows there is nothing to paste into.** A brand-new
Quintrex table shows: *"NOTHING LOGGED YET — The columns are ready. Add the first
variant — or paste a block straight from Excel."* On that card
`document.querySelectorAll('[role="grid"], [class*="tb-grid"]')` returns **0**.
A paste added **0 rows**, no error, no message. The Grid — which owns the only
paste handler (`Grid.tsx:790`) — is not mounted when `noRows`
(`EntityTableNode.tsx:678`).

**b. Straight after `ADD FIRST VARIANT` a paste is deliberately ignored**, because
that button opens the required cell for typing and `Grid.tsx:791-800` skips the
block paste whenever `editing`. In a real browser the block would go into that
one cell as text.

**c. After Escape, it works, and it works well.** 3 rows created from 3 TSV
lines; the toast is exact and honest — **"5 cells pasted · 2 skipped — see marks
· 1 pictures"**, `tb-toast-warn`, and the skipped cells are marked. Type safety
is real: `Alloy` into a select whose options do not contain it, a URL into an
image column, and `call for price` into a number column were all **refused**,
while `2.4` into a number column landed as the number `2.4`. **I withdraw any
suggestion of silent loss — the paste engine is one of the better things in this
app.**

**d. But it has no header row and no column mapping.** Paste is positional from
the cursor:

- I pasted `Variant⇥Model Code` as the first line, exactly as a person selecting
  a block in Excel would. The app made **a boat called "Variant" with model code
  "Model Code"** (`criticB-31-header-row-became-a-boat.png`). It is now row 01.
- It also part-overwrote the row: two columns took the new values, the third kept
  `Side Console` from the previous paste, so one row now mixes two sources.
- Worse: the Boats preset groups by **Series → Model**, and those two columns are
  **not columns in the grid at all** — they are the drawer headings. A pasted
  catalogue therefore lands entirely under `Name this series` / `Name this model`
  (`criticB-30-paste-landed-wrong-columns.png`), and there is no way to paste
  into them. The New Table preview promised the opposite: *"Add a row inside a
  group and its Series and Model are filled in for you."*

For a sales manager moving a real price file in, (a)+(b)+(d) is the whole first
hour.

---

## C9 · A table can have zero columns, and the sheet then says it has one

- Column setup lets you delete the last column. The confirm is good
  (*"EMPTY IN ALL 0 ROWS · This app has no undo"*), but after it the same page
  says **"NO COLUMNS DRAFTED — Every table needs at least one column"** — a rule
  stated only after it has been broken (`criticB-17`, `criticB-18`).
- The sheet then draws that table as **"0 rows · 1 column"**. Store: `fields: []`.

Cause: the plate counts `whole.totalColumns` = `visibleFields(entity)`, which
prepends the system UID column and drops hidden grouping columns. Full map,
plate vs store, all 23 tables in the merged state:

| delta | tables |
|---|---|
| **0** (agree) | 16 |
| **+1** | 6 — the 4 relationship tables, Formosa, and both 0-column tables |
| **−1** | 1 — Highfield Inflatables (store 31, plate 30) |

So the number on the card is right for two thirds of the tables, off by one
either way for the rest, and for an empty table it is not a rounding error but a
plain falsehood. (S-10 caught one instance at one table; this is the map.)

---

## C10 · Two tables can have the same name, with no warning

Created a second Boats table also called **Quintrex**. Accepted silently; the
panel now lists `QUINTREX 3` and `QUINTREX 0` under BOATS, distinguishable only
by the row count, and the new card lands overlapping the first
(`criticB-33-duplicate-table-name.png`). Anywhere a table is chosen by name — a
rule's "looks at", the view page's add-a-table list, a quote's section heading —
the two are indistinguishable. (The C3 merge produces 22 such pairs at once.)

---

## C11 · Taking a table off a view page and putting it back does not restore the rule it had

The removal confirm is excellent and makes a promise:

> *"Take NSM Custom Trailers off this page? Nothing is deleted — everything you
> picked, dropped or starred is kept in Highfield × NSM Custom — Trailer
> Fitment, so putting NSM Custom Trailers back brings it all with it."*

Removed it; **the removal correctly survived a reload** (see the correction to
Q1 below). Re-added it through `+ ADD A TABLE` and got
(`criticB-23-relating.png`):

> **Show every NSM Custom Trailer.** *Nothing on Highfield Inflatables lines up
> with anything on NSM Custom Trailers, so nothing is narrowed.*
> `SHOW ALL NSM CUSTOM TRAILERS` · `PICK A DIFFERENT RULE` · `CANCEL`

Two problems. The sentence is untrue — a join table between exactly those two
tables, with 15 pairs, exists and is listed in the panel under RELATIONSHIPS.
And the block's original rule ("only the ones I pick") is **not** the default; it
is behind `PICK A DIFFERENT RULE` → `ONLY THE NSM CUSTOM TRAILERS I PICK`. Take
the offered path and you get all 18 trailers against every boat, which is not
what you had. The picks are indeed still there — the promise is kept only if you
decline the first offer.

---

## C12 · Smaller things I observed once each

- **Uncommitted edit lost on reload, empty required row kept.** Typed
  `Renegade 481 Side Console` into the new row's required VARIANT cell
  (on screen, `criticB-37`), reloaded: the row persists with VARIANT empty and
  the typing gone. Losing an uncommitted edit is normal; persisting the row
  without it, in a column the header marks `*`, is what a person will not expect.
- **`GIVE IT TO THE CUSTOMER` has no confirmation.** One click turned a $0 draft
  for "(untitled boats)" into `GIVEN TO THE CUSTOMER · 2026-08-14`, and the only
  route back is `MAKE A NEW VERSION` (the button measured at 1.14:1 by the quote
  pass). The document itself is honest — *"1 line on this quote has no price in
  the price file and is not in the total"* — so this is about the act, not the
  paper.
- **A 195-character table name is handled.** Panel row stays 233 × 35 and
  ellipsises; `documentElement.scrollWidth` 1280 = `innerWidth`. No overflow
  anywhere I looked. No finding.

---

# CORRECTIONS TO THE EIGHT

Each of these is a place where an earlier pass stated something I could not
reproduce, or diagnosed a cause I can now sharpen.

**F-1 "No search. Anywhere."** — there **is** a search. Every view page carries a
`Find one` input over the row list (`criticB-03`, `criticB-04`, `criticB-38`).
F-1's measurement (`querySelectorAll('input,textarea')` → `[]`) was taken on the
**sheet**, where it is still true. The correct statement: there is per-view row
search behind a door; there is no global search and none on the sheet.

**F-2 "`/example|demo|sample/i` matches nowhere in the running app"** — it matches
on the empty sheet, before you click: **`EXAMPLE DATA` / "Load a worked example —
another dealer's price file" / "REAL DATA EXTRACTED FROM NORTHSIDE MARINE'S
MASTER PRICE FILE"** (`criticB-26`). It is said once, clearly, and then never
again once the data is in — which is the actual defect, and a smaller one than
"nowhere".

**Q1's cause is one step off.** View pages **do** persist and rehydrate:
`src/app/viewPersistence.ts` mirrors every ViewDef into `store.views` and
re-registers them on mount. I proved it — I removed a block from Highfield's
page, reloaded, and it stayed removed (`criticB-08`, `criticB-09`). The real
breakage is that the mirror creates the store record with a **new id**
(`store.createView(...)` mints its own, `viewPersistence.ts:70`) while the
feature's registry keeps the id it generated at creation. So a view's id changes
**exactly once**, at the first reload after the page was first opened — and a
quote frozen before that reload keeps the dead id forever, which is precisely
what the machine still shows (`viewId NkgPtO1vdj` vs `store.views["-TXg0Z7xgj"]`).
Fix is one line at the seam, not a store redesign; and no block edits are lost.

**L26 is reachable, and I reached it.** On a 0-row table the view page says, at
the same moment, *"This table has no rows yet. Add one on the sheet and it will
appear here."* on the left and *"Pick a ZZ ONE COL on the left to see what goes
with it."* on the right (`criticB-03`). Told to pick from a list the app has just
said is empty. (The `singular()` bug L26 predicted is invisible here only because
"ZZ ONE COL" happens to read as a singular.)

**L1 reproduced on screen** at last: a clean profile's first input is
placeholdered **"Northside Marine"** (`criticB-25`).

**F-6 reproduced from a clean profile**, not just from the seeded one: a
hand-made *Quintrex* Boats table is created with **31 columns** including
`AUS Sailing`, `Tube Dia. cm`, `HO - MU %`, `BMT - MU %`, `Colourway`, `EX Rate`.
`criticB-27` also shows the structure preview teaching with HIGHFIELD / SP520 /
SP600 / PA460 / PA540 Open (L25) inside a brand-new dealer's project.

---

# AREAS I WENT LOOKING IN AND FOUND NOTHING NEW

Reporting these because "no finding" is a result about coverage.

- **Contradicting rules — handled.** The Business rules pane counts and marks
  them: `3 RULES · 1 CONFLICT`, and the offending card carries a red `CONFLICT`
  chip beside `EDITED` (`criticB-02`). The two rules that contradict on the
  audited project are genuinely contradictory (`Standard = yes → Recommended =
  no` and `Standard = yes → Recommended = yes`). Nothing to add.
- **The paste engine's type safety and its reporting** — see C8c. Good work.
- **Empty and degenerate states in the view page and the quote** — all honest:
  *"(untitled boats)"*, *"Nothing goes with this yet. Press SET UP, then add a
  table."*, *"not priced here"*, *"1 line on this quote has no price in the price
  file and is not in the total."* (`criticB-38`, `criticB-39`, `criticB-40`).
- **The two-click remove confirm on view blocks** — arms, explains, and offers
  *Take it off* / *Keep it*. Right shape.
- **A 195-character name** — no overflow, no clipping without ellipsis.
- **Console errors** — 0 across the entire clean-profile journey (onboarding →
  table → paste → rules → clear sheet → re-onboard → quote → issue). 2 on the
  loaded demo, the documented cross-origin image probes. No regression.

---

# NOT TESTED (say so rather than guess)

- Real mouse drag anywhere (still O7's gap).
- The OS clipboard: all paste evidence is a synthetic `ClipboardEvent`, verified
  to carry its text and to reach the handler, with a working positive control.
- Renaming the business (the constraint-key consequence in C5 is source-only).
- Two browser *windows*, and two machines.
- Import of a hand-edited or hostile file beyond what the language pass already
  did; the refusal list in `envelope.ts` was not exercised further.
- Whether the imported-and-degraded tables can be repaired from inside the app
  (no UI for `kind`/`role`/`hierarchy`/`sections` was looked for).
- 1920×1080 for anything in this pass. Everything above is 1280×800.

---

# THE RECOVERY PATH, IN ONE PLACE

The brief asked for it explicitly. Here are the three worst mistakes available
and what a person can do about each.

| mistake | one gesture away? | way back |
|---|---|---|
| **Clear Sheet** | I/O → Clear Sheet, two `window.confirm`s | Import an earlier export — which loses every kind, role, level and band (**C2**) — and does not restore the business rules or the quotes (**C7**), which instead come back **on their own, into the new project, wrong** (**C5**, **C6**) |
| **Delete a table** | select on the sheet, press Backspace (S-2) | Same file, same losses. `deleteEntity` also strikes every rule rooted on it, permanently |
| **Second tab** | open one, then touch the old one | **None.** No warning before, no message after, and the work was never written (**C1**) |

And the fourth, which is not a mistake at all: **press the primary button when
restoring a backup**, and the project doubles (**C3**).

The honest summary: the app says four times, in four well-written confirm
sheets, *"This app has no undo. It can only come back from a file you exported
earlier."* That file does not carry the rules, does not carry the quotes, and
does not restore the shape of the tables. The sentence is a promise the file
cannot keep.
