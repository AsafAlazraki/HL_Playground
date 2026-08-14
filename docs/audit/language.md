# AUDIT — THE WORDS

**Lens:** every label, button, empty state, error, tooltip, placeholder and
aria-label in the app.
**Run at:** 1280 × 800, Chrome, `http://localhost:5090`, seeded Northside
project (21 tables, 651 rows, 2 flow rules, 1 hand-written sentence rule,
3 draft quotes).
**Date:** 2026-08-14.

## How the corpus was gathered

1. Every `.ts`/`.tsx` under `src/` except `src/demos/` was read, comments
   stripped programmatically, and every string literal / JSX text node
   extracted (146 files, 85 KB of candidate strings). `northside.ts` was read
   with Grep only.
2. **Reachability was then checked against the mount graph**, because a large
   fraction of the raw hits turn out to be behind no door (see
   [§9 Dead strings](#9-dead-strings--do-not-action)). Everything in §1–§8 is
   either verified on screen or is in a file I confirmed is mounted.
3. Where a finding is on screen I give the screenshot; where it is a string I
   read but could not reach with this data I say so in the row.

Nothing below is a paraphrase. Every quoted string is either copied from the
file at the line given or read out of the live DOM.

---

## The table

Ranked by how early it stops a sales manager, not by how much it annoys me.

| # | Finding | Where | Evidence |
|---|---|---|---|
| **L1** | The very first input in the app is pre-seeded with **another real dealership's name** as its placeholder — "Northside Marine", which is also the name of the demo data. A person handed a demo cannot tell whether their name is already filled in. | `src/features/onboarding/Onboarding.tsx:81` | source; **not reproduced on screen** — see note |
| **L2** | The only door out of the app, and the only route to a backup, is labelled **"I/O"**. | `src/features/io/ImportExportMenu.tsx:312` (`aria-label="Import / export"`), visible label `I/O` at `:465` region | `language-8-io-rejected.png` |
| **L3** | The left rail heading says **TABLE TYPES**; the dialog those exact cards open says **TABLE KINDS**. | `src/features/tablekit/TableTypeRail.tsx:74` vs `src/features/tablekit/NewTableDialog.tsx:468` | `language-3-column-setup.png` + `language-7-new-table-preview.png` |
| **L4** | The first column of every table on the sheet is headed **`UID`** with the sub-stamp **`SYSTEM`**. | `src/types/model.ts:963` (`name: 'UID'`) | `language-8-io-rejected.png` |
| **L5** | The same eight column types carry **two different label sets, one click apart**: the sheet offers *Choice* and *Pictures*; the column setup offers *LST · List* and *IMG · Images*. | `src/features/table/columnKinds.ts:25,28` vs `src/types/model.ts:74,77` | both read out of the live DOM (below) |
| **L6** | The type stamp on every column row is a 3-char code — `TXT NUM Y/N DAT LST REF FX IMG` — with **no legend**, while the two chips beside it (GROUPS, band) got one. | `src/types/model.ts:69-78`; legend at `src/features/designer/EntityDesigner.tsx:193,196` | `language-3-column-setup.png` |
| **L7** | The same grouping of columns is called **three things**: `SECTIONS` on the table, "the **band** the column sits in" in the column-setup legend, "**Goes in**" in the add-column popover. | `src/features/table/BandStrip.tsx:35` · `src/features/designer/EntityDesigner.tsx:196` · `src/features/table/AddColumnPopover.tsx:194-195` | DOM reads (below) + `language-8-io-rejected.png` |
| **L8** | A section on all **7** boat tables is named **"Motor Envelope"** — "envelope" — where every other surface calls the same idea *fitment*. | `src/demos/northside.ts` — `name: "Motor Envelope"` ×7 (first at :672) | `language-8-io-rejected.png` |
| **L9** | **The quote calls rows "picked" that nobody picked.** The view page distinguishes *PICKED* (hand-picked) from *FIT* (matched by the rule); the quote flattens both into "were picked for this one". | `src/features/quote/QuoteEditor.tsx:426` + `src/features/quote/freeze.ts:399` (`pickedCount: result.rows.length`) | `language-5-view-fit-vs-picked.png` + `language-4-quote-picked-chosen-starring.png` |
| **L10** | **Five words for one act**: *picked* / *chosen* / *pick* / *starring* / *recommended* — three of them in a single sentence on the quote. | `QuoteEditor.tsx:426-428`; star title `src/features/views/BlockCard.tsx:604`; `src/features/quote/QuoteDocument.tsx:240` | `language-4-quote-picked-chosen-starring.png` |
| **L11** | **The same table object has three names in its own tooltips**: "Show *X* on the sheet", "Drag to move **the sheet**", "Grow this **card** to fill the blueprint". Plus "CLEAR **SHEET**" wipes the whole project. | `LeftPanel.tsx:302` · `EntityTableNode.tsx:578,791` · `WholeTableControls` / `EntityTableNode.tsx:776` · `ImportExportMenu.tsx:463` | DOM read (below) |
| **L12** | The flow builder is built entirely out of programmer words: **NODES**, "Click a **node** on the sheet to **configure** it", "· 4 **NODES**", plus 3-letter tags `RUN FIT IF WHR LNK LOOP DO OUT`. `WHR` is SQL's WHERE. | `src/features/rules/RulePaletteStrip.tsx:132,136`; `RuleInspector.tsx:1140`; `src/types/model.ts:851-901` | `language-2-flow-open-rule.png` |
| **L13** | **"RUN" means two different things on one screen** — the tag on the Start plate, and the button that executes the rule, ~500 px apart. | tag: `src/types/model.ts:854`; button: `src/features/rules/RuleToolbar.tsx` | `language-2-flow-open-rule.png` + DOM read |
| **L14** | Two of the palette chips are **named one thing and tooltipped another**: chip "Route" / tooltip "CONDITION"; chip "Linked" / tooltip "FIND LINKED". | `src/features/rules/RulePaletteStrip.tsx:46-55` vs `src/types/model.ts:866,878` | DOM read (below) |
| **L15** | **"field" reaches the reader ~55 times** in the rules surfaces, in an app whose stated contract is *"table and column, never entity, schema or field"*. F20 converted *entity*; it did not touch *field*. | 23 strings in `src/features/rules/*`, 32 in `src/lib/rules/*` (list below) | extraction + `EntityDesigner.tsx:5-10` (the contract) |
| **L16** | The palette blurb that teaches what a Match is uses a **marine worked example** in a frame the art direction requires to be industry-neutral. | `src/types/model.ts:863` — *"…a boat's min/max HP against every motor's HP."* | DOM read of the palette strip (below) |
| **L17** | The one control that **writes data** from a rule run says **"Apply 12"** — a number with no noun — under a heading **"Effects"**, and confirms with **"12 writes committed to the sheet."** | `src/features/rules/RuleResultsRail.tsx:286,303,313,326` | source; **not exercised** (would write to the real project) |
| **L18** | A number placeholder in a condition is **`"0"`** — indistinguishable from the value zero, in the one control whose whole job is a threshold. | `src/features/rules/ClauseEditor.tsx:217` | source; **not exercised** |
| **L19** | Import refusals name the file by a name the panel never uses, and offer **no next step**: "REJECTED — NOT A HELMLOGIC SHEET FILE" sits under two controls that call the same thing a *copy*. | `src/features/io/envelope.ts:511-654`; panel labels `ImportExportMenu.tsx:381,420` | `language-8-io-rejected.png` (reproduced by uploading a 17-byte `.json`) |
| **L20** | The rules pane calls one source **two things in three lines**: "FROM YOUR **PRICE FILE**" then "6 rules your **workbook** already states". | `src/features/constraints/WorkbookRuleList.tsx:86-93` | live DOM / screen at 1280×800 |
| **L21** | **"Draft"** is a fifth verb for *create*, beside Create / Add / New / Write. | `RulesList.tsx:84,238` · `EntityDesigner.tsx:405` · `FieldTypeEditors.tsx:103,227` · `TableToolbar.tsx:191` | source |
| **L22** | **Delete / Remove / Strike / Take off** are used for the same acts, and one column dialog uses two of them about itself. | `FieldRow.tsx:266-267` says *Delete*, `:623-628` says *Remove*; `TableSheet.tsx:163` "struck" vs `TableToolbar.tsx:184` "Delete rows" | source |
| **L23** | Six of the seven table-kind cards are plural nouns; the seventh is **"Custom table"**, and its blurb uses the app-internal word **"presets"**. | `src/types/model.ts:431` | `language-6-new-table-dialog.png` |
| **L24** | The New Table dialog **pre-fills the table name with the kind's plural** ("Boats") — contradicting the app's own convention that a table is a brand (Stacer, Surtees, Highfield Inflatables). | `NewTableDialog.tsx` name default | `language-7-new-table-preview.png`, DOM: `{value:"Boats", placeholder:""}` |
| **L25** | The New Table **preview** teaches structure using another company's real catalogue — HIGHFIELD / Sport / SP520, SP600 / Patrol / PA460. | `src/features/tablekit/preview.ts:85-101` | `language-7-new-table-preview.png` |
| **L26** | The empty view page says **"Pick a Highfield Inflatables on the left"** — the one sentence in the view module that forgot `singular()` — and it appears beside a rail that has just said there is nothing to pick. | `src/app/ViewStage.tsx:237` (cf. `ViewPage.tsx:367,386` which do use `singular()`) | source; **not reachable with this data** (every seeded table has rows) |
| **L27** | `"has no link (REF) columns yet"` — the raw type code leaks into a sentence. | `src/features/rules/RuleInspector.tsx:563` | source |
| **L28** | `"The engine reported a failure."` — an error that names an implementation the user has never been told exists and offers nothing to do. | `src/features/rules/RuleResultsRail.tsx:232` | source |
| **L29** | The chrome on the Quotes stage uses a marine/trucking word: **"a rig, a customer and a moment"**. | `src/app/QuoteStage.tsx:99` | source (kicker under the QUOTES title) |

---

## 1 · Jargon a sales manager would not use

Only strings I confirmed are reachable. Replacements are suggestions, not
instructions.

| String | File:line | Plain English |
|---|---|---|
| `I/O` (the masthead's only action) | `features/io/ImportExportMenu.tsx` (button label; `aria-label="Import / export"` at `:312`) | **Save & open** — or **Backup** |
| `UID` / `SYSTEM` (first column of every table) | `types/model.ts:963` | **Row ID**, or the app's own existing phrase: *the row's permanent identifier* |
| `TXT NUM Y/N DAT LST REF FX IMG` | `types/model.ts:69-78` | keep the codes, add the legend the GROUPS chip already has |
| `NODES` (palette heading) | `features/rules/RulePaletteStrip.tsx:132` | **Steps** — the rules index already says *"4 steps"* in its own tooltip |
| `Click a node on the sheet to configure it, or drag a new one from the palette.` | `features/rules/RuleInspector.tsx:1140` | "Click a step to set it up, or drag a new one in." |
| `MOTOR FITMENT — HIGHFIELD · 4 NODES` | `RuleInspector.tsx:1123-1141` region | "· 4 steps" |
| `WHR` (the Filter tag) | `types/model.ts:873` | `KEEP` |
| `Repeat the body once per row in a collection.` | `types/model.ts:887` | "Do the steps below once for every row." |
| `Rows leave by BODY once each; the flow continues from NEXT when the loop is done.` | `RuleInspector.tsx:642` | name the two exits in words |
| `Every row will leave by the ELSE handle until you add one.` | `RuleInspector.tsx:440` | "…will fall through to *anything else*" |
| `A branch with no conditions never takes a row — the engine will flag it.` | `RuleInspector.tsx:494` | "…— we will mark it." |
| `The engine reported a failure.` | `RuleResultsRail.tsx:232` | say what to try |
| `has no link (REF) columns yet` | `RuleInspector.tsx:563` | "has no *Link* columns yet" |
| `Effects` / `Apply 12` / `12 writes committed to the sheet.` | `RuleResultsRail.tsx:286,326,303` | **Changes** / **Make these 12 changes** / "12 changes saved." |
| `walks each row of the chosen **entity**` | `types/model.ts:856` | table — *O5 named `:863`, not `:856`* |
| `Find the rows of another **entity** that fit this one` | `types/model.ts:863` | *known: O5* |
| `has no entity to search` / `loops over an entity that no longer exists` / `creates rows in an entity that no longer exists` / `links into a join entity that no longer exists` | `lib/rules/walk.ts:255,381` · `lib/rules/effects.ts:158,175` | table — **O5 scoped itself to `validate.ts` and `model.ts`; these four are outside it** and surface in the results rail's Warnings |
| `Anything the presets do not cover.` | `types/model.ts:431` | "Anything else you sell." |
| `field` ×55 | see §5 | column |

**The contract this breaks is the app's own.** `src/features/designer/EntityDesigner.tsx:5-10`:
*"IT SAYS TABLE AND COLUMN, NEVER ENTITY, SCHEMA OR FIELD."* And
`src/app/LeftPanel.tsx:228-229` says the flow door deliberately avoids
*"node, graph, flow or engine — words nobody selling boats has a use for."*
The stage behind that door is headed **NODES**.

---

## 2 · Placeholders that read as values

A placeholder must be an instruction. These are not.

| Placeholder | File:line | Why it reads as a value |
|---|---|---|
| `Northside Marine` | `onboarding/Onboarding.tsx:81` | A real dealership's name, in the app's first field, and the name of the demo data the reader has probably just been shown. **The single highest-ranked item in this audit.** |
| `0` | `rules/ClauseEditor.tsx:217` | A number input in a threshold condition. "HP Rating ≥ 0" and "HP Rating ≥ *unset*" look identical. |
| `Fitting motors` | `rules/RuleInspector.tsx:969` | Reads as a named result set that already exists. Marine, too. |
| `Nothing fits` | `rules/RuleInspector.tsx:803` | Reads as a flag label already written. |
| `[Price] * 1.1` | `table/AddColumnPopover.tsx:179` | A working formula. Mitigated by the hint below it. |
| `[Price] * 0.9` | `rules/ClauseEditor.tsx:317` | Same, with **no** hint below it. |
| `Short` / `Long` / `Extra long` | `table/AddColumnPopover.tsx:140` | A three-line choice list that reads as three choices already typed. |
| `…` | `constraints/RuleSentence.tsx:243` | Instructs nothing at all. |
| `[Price] * 1.1` cf. `Write an expression — column names in [square brackets]` | `designer/FieldTypeEditors.tsx:486` | The designer gets this right; the popover does not. Same control, two treatments. |

**Correct ones, for contrast** (do not change): `Type a choice, press Enter`
(`FieldTypeEditors.tsx:80`), `Name this column` (`FieldRow.tsx:312`),
`Name this route` (`RuleInspector.tsx:454`), `Paste the address here`
(`ImageCell.tsx:351`), `leave blank to use the price file`
(`QuoteEditor.tsx:623`), `one line each — as it should print on the quote`
(`QuoteEditor.tsx:167`).

**Four search boxes, four phrasings:** `Find one` (`ViewStage.tsx:190`),
`Search rows…` (`TableToolbar.tsx:95`), `Search what is shown…`
(`BlockCard.tsx:793`), `Search every {noun}…` (`AddPanel.tsx:90`).

---

## 3 · Empty states, graded

**A** = says what to do next and how. **B** = says what to do, vaguely.
**C** = states the absence only. Dead-code empty states are in §9 and are not
graded here.

| Empty state | File:line | Grade |
|---|---|---|
| "Nothing on the sheet yet" + *Create your first table* + *Example data — another dealer's price file* + "Or drag a table type from the left onto the sheet." | `app/EmptyState.tsx:63-99` | **A** |
| "No columns yet — *{Table}* has nothing to hold. Add the first column and start typing straight into it." + *Add first column* | `table/EntityTableNode.tsx:667-669` | **A** |
| "Nothing logged yet — The columns are ready. Add the first *{noun}* — or paste a block straight from Excel." + *Add first {noun}* | `EntityTableNode.tsx:677-679` | **A** |
| "Nothing matches — All 40 rows are still here… the column you narrowed simply hides every one." + *Show them all* | `EntityTableNode.tsx:684-686` | **A** |
| "No {Trailers} picked for this {Highfield Inflatable} yet." (view block) | `views/BlockCard.tsx:657` | **A** — verified on screen |
| "Nothing goes with this yet. / Add a table below — or drag one in from the left — and we will work out how it relates to this {boat}." | `views/ViewPage.tsx:364-367` | **A** |
| "Rules are made of your columns / Make a table first. Its columns become the words you write rules with." | `constraints/RulesPane.tsx:164-166` | **A** |
| "No rules yet. Finish the sentence above and it becomes your first." | `RulesPane.tsx:179` | **A** |
| "No conditions yet / Every row will pass until you add one." + *Add condition* | `rules/ClauseEditor.tsx:484-486` | **A** |
| "Nothing fitted yet / Every {Motor} will match every {Boat} until you add a condition." + *Add fitting rule* | `rules/RuleInspector.tsx:333-335` | **A** |
| "Nothing run yet / Press RUN to walk the rule against the rows on the sheet." | `rules/RuleResultsRail.tsx:226-227` | **A** |
| "No columns drafted / Every table needs at least one column — add the first below." | `designer/EntityDesigner.tsx:405-406` | **A** (but "drafted") |
| "This table has no rows yet. Add one on the sheet and it will appear here." | `app/ViewStage.tsx:198` | **A** |
| "No choices on the list yet — draft the first one above." | `designer/FieldTypeEditors.tsx:103` | **B** — "draft" |
| "Nothing to link / Draft another table on the sheet to link to." | `FieldTypeEditors.tsx:226-227` | **B** — "draft" |
| "Nothing to reason about yet / Draft a table on the sheet first — a rule always walks the rows of one." | `rules/RulesList.tsx:82-84` | **B** — "reason about", "draft" |
| "No rules drawn / A rule walks every row of one table and matches, routes or writes from there." | `RulesList.tsx:91-93` | **B** — describes the concept, never says *press + New rule* |
| "No result sets / The flow reached no Output node. Check the connections from Start onwards." | `RuleResultsRail.tsx:236-239` | **B** — actionable only if you know what an Output node is |
| "This view has no columns / Open the Output node and pick columns from both sides…" | `RuleResultsRail.tsx:87-89` | **B** — same |
| "No branches yet / Every row will leave by the ELSE handle until you add one." | `RuleInspector.tsx:438-440` | **B** — "ELSE handle" |
| "No links to follow / *{Table}* has no link (REF) columns yet — add one in that table's column setup." | `RuleInspector.tsx:560-563` | **B** — right instruction, wrong noun |
| "No rule open / Choose a rule in the index to edit it." | `RuleInspector.tsx:1123-1124` | **B** — "the index" is never labelled *Index*; the rail is headed RULES |
| "Nothing selected / Click a node on the sheet to configure it…" | `RuleInspector.tsx:1135-1140` | **B** — verified on screen, `language-2-flow-open-rule.png` |
| "Your tables appear here." | `app/LeftPanel.tsx:272` | **C** — the sheet's own empty state carries the instruction, so this is redundant rather than harmful |
| "This column has no values yet." | `table/FilterMenu.tsx:143` | **C** |
| "Nothing links back" | `RuleInspector.tsx:653` | **C** |
| "No columns picked" | `RuleInspector.tsx:980` | **C** — softened by the *Use the obvious two* button beside it |
| "This table has no columns to compare yet" | `rules/ClauseEditor.tsx:585` | **C** |
| "Nothing from {Table} on this quote yet." | `quote/QuoteEditor.tsx:431` | **C** — deliberate; the >1 branch above it is the A-grade version |

---

## 4 · Errors and refusals

| Refusal | File:line | Says what is allowed? |
|---|---|---|
| `"12/13/2026" is not a date — use DD/MM/YYYY or YYYY-MM-DD` | `table/core/coerce.ts:91` | **Yes** |
| `"maybe" is not yes/no — use true/false, yes/no, y/n or 1/0` | `coerce.ts:148` | **Yes** |
| `"x" is not one of: a, b, …` | `coerce.ts:164` | **Yes** |
| `"{field}" holds pictures — drop image files on the cell` | `coerce.ts:187` | **Yes** |
| `A picture address must start with http://, https://, data:image/ or blob:.` | `table/ImageCell.tsx:167` | **Yes** |
| `A table named "X" is already on this sheet — two tables with one name make every link, export and rule ambiguous.` | `designer/EntityDesigner.tsx:94` | **Yes**, and it gives the reason |
| `"abc" is not a number` | `coerce.ts:52` | **No** — the only coerce message that does not. Low impact; "not a number" is self-evident. |
| `REJECTED — NOT A HELMLOGIC SHEET FILE` | `io/envelope.ts:511` | **No.** The panel above calls its own output a *copy* ("SAVE A COPY", "OPEN A SAVED COPY"), so the refusal names a thing the panel never names. Verified: `language-8-io-rejected.png`. |
| `SAVED BY A DIFFERENT VERSION — EXPECTED V3` | `envelope.ts:515` | **No** — no route forward. |
| `FILE IS DAMAGED — BAD LAYOUT BLOCK` / `BAD RULES BLOCK` / `ROWS ARE NOT GROUPED BY TABLE` | `envelope.ts:519-523` | **No** — internal structure names. |
| `TABLE 3 HAS AN UNSAFE ID` / `UNSAFE COLUMN ID IN TABLE "X"` / `UNSAFE ROW ID` | `envelope.ts:552,559,653` | **No** — "unsafe" is a security check the reader has no model for. |
| `DUPLICATE ID "abc"` | `envelope.ts:553,560,599,615,654` | **No** |
| `The engine reported a failure.` | `rules/RuleResultsRail.tsx:232` | **No** |
| `Formula engine unavailable` | `designer/FieldTypeEditors.tsx:368,432` | **No** |

The nine `envelope.ts` refusals share one fix: a second line saying *"Open a
file you saved from this app with SAVE A COPY."*

---

## 5 · "field" — the word the app promised not to use

`EntityDesigner.tsx:5-10` states the contract: *"IT SAYS TABLE AND COLUMN,
NEVER ENTITY, SCHEMA OR FIELD."* F20 removed *entity* from
`src/features/rules`. *field* was left.

**23 user-visible strings in `src/features/rules`:**

```
ClauseEditor.tsx    82  Pick a field
ClauseEditor.tsx   110  (field removed)
ClauseEditor.tsx   255  A field of the other row
ClauseEditor.tsx   307  ${ariaPrefix} field                     (aria-label)
ClauseEditor.tsx   422  Condition ${n} — field                  (aria-label)
describe.ts    207,477,830,1064  (field removed)
describe.ts        513  Pick a field to write
RuleInspector.tsx  193  (field removed)
RuleInspector.tsx  197  Stop writing ${field?.name ?? 'this field'}
RuleInspector.tsx  515  Fields of both X and Y are in play here…
RuleInspector.tsx  563  … has no link (REF) columns yet
RuleInspector.tsx  571  Link field to follow                    (aria-label)
RuleInspector.tsx  661  Link field pointing at this row         (aria-label)
RuleInspector.tsx  749  Write this field
RuleInspector.tsx  753  Field to write
RuleInspector.tsx  769  … the row that owns the field.
RuleInspector.tsx  865  Join field holding the source row       (aria-label)
RuleInspector.tsx  870  Pick a link field
RuleInspector.tsx  888  Join field holding the matched row      (aria-label)
RuleInspector.tsx  893  Pick a link field
RuleInspector.tsx 1045  Column ${n} field                       (aria-label)
```

**32 more in `src/lib/rules`** — these reach the reader through the toolbar's
NOTES list and the results rail's Warnings: `validate.ts` lines
162, 171, 177, 182, 266, 272, 295, 301, 303, 328, 344, 349, 432, 438, 442,
446, 481, 483, 494, 496; `walk.ts` 303, 307, 394, 398; `evaluate.ts` 436, 458,
462; `effects.ts` 75, 80, 126, 130, 185.

Every one is a straight swap to **column**, except `link field` → **Link
column** and `(field removed)` → **(column removed)**.

---

## 6 · Consistency — one thing, two names

Everything here was measured, not inferred.

| One thing | Its names | Where |
|---|---|---|
| A table's kind | **type** / **kind** | rail heading `TABLE TYPES` (`TableTypeRail.tsx:74`) vs dialog `TABLE KINDS` (`NewTableDialog.tsx:468`) |
| One table object | **table** / **card** / **sheet** | `"Show Formosa on the sheet"`, `"Drag to move the sheet"`, `"Grow this card to fill the blueprint … Stays on the sheet."` — all three read out of the DOM in one pass at 1280×800 |
| "sheet" | **the canvas** / **one table** / **the whole project** | `"Back to the sheet"` · `"Collapse this sheet back to the size it was"` · `"CLEAR SHEET"`, `"NOT A HELMLOGIC SHEET FILE"`, `"Untitled Sheet"` (`db/repository.ts:30`) |
| A group of columns | **Sections** / **band** / **Goes in** | `BandStrip.tsx:35` · `EntityDesigner.tsx:196`, `FieldRow.tsx:247` (`Band: {name}`) · `AddColumnPopover.tsx:194` |
| Column type `select` | **Choice** / **List** | `columnKinds.ts:25` vs `model.ts:74` — DOM: popover offers `Choice`, designer select offers `LST · List` |
| Column type `image` | **Pictures** / **Images** | `columnKinds.ts:28` vs `model.ts:77` — DOM: `Pictures` vs `IMG · Images` |
| Column type hints | **three** parallel sets | `columnKinds.ts:21-28` (table), `EntityDesigner.tsx:50-59` (designer), `model.ts:69-78` (labels only) |
| `condition` node | **Route** (chip) / **Condition** (tooltip + inspector) | `RulePaletteStrip.tsx:49` vs `model.ts:866` |
| `find` node | **Linked** (chip) / **Find linked** (tooltip) | `RulePaletteStrip.tsx:51` vs `model.ts:878` |
| `RUN` | the Start plate's tag / the button that runs the rule | `model.ts:854` vs `RuleToolbar.tsx` — both on screen at once |
| Choosing a row for a boat | **picked** / **chosen** / **pick** / **starring** / **recommended** | `QuoteEditor.tsx:426-428` (three in one sentence), `BlockCard.tsx:604`, `QuoteDocument.tsx:240` |
| Rows matched by a rule | **FIT** on the page / **picked** on the quote | `views/describe.ts:292` vs `QuoteEditor.tsx:426` — **and the quote's word is false** |
| Create | **Create** / **Add** / **New** / **Draft** / **Write** | `Create table` · `Add column` · `+ New rule` · `Draft rule` (`RulesList.tsx:238,244` — the same flow, two labels) · `Write a new rule` (`NewRuleSentence.tsx:160`) |
| Destroy | **Delete** / **Remove** / **Strike** / **Take it off** | `FieldRow.tsx:266-267` (*Delete this column*) opens a sheet headed *Remove column* / *Remove it* (`:623-628`); `TableSheet.tsx:163` "2 rows struck" vs `TableToolbar.tsx:184` "Delete rows"; `BlockCard.tsx:448` "Take it off" |
| The source workbook | **your price file** / **your workbook** | `WorkbookRuleList.tsx:88` and the heading three lines below it |
| Narrowing a table | **Filter** / **narrow** / **Show only some…** / **Narrowed** | `TableToolbar.tsx:143` · `Grid.tsx:1041` · `ColumnMenu.tsx:143` · `EntityTableNode.tsx:616` |
| "rule" | **4 different objects** | (a) a sentence constraint — `RulesPane`; (b) a flow — `RulesList`; (c) a view-block rule — `BlockCard.tsx:406`, `RuleOffer.tsx:186`; (d) a condition inside a Match — *"Add fitting rule"*, `RuleInspector.tsx:335`. Known as **O4** for (a)/(b); **(c) and (d) are additional and were not in O4.** |
| A join table | **Relationships** / **link table** / **join** / **Fitment** / **PAIRING** | `LeftPanel.tsx:160` · `:335` · `RuleInspector.tsx:822` "Link table" · seeded names "× … — Motor Fitment" · the section stamp `PAIRING` |

---

## 7 · Button labels — mechanism vs outcome

**Exemplary, keep:** `Give it to the customer` (`QuoteEditor.tsx:376`),
`Show them all` (`EmptyPlates.tsx:99`), `Put it back` (`BlockCard.tsx:694`),
`Use today's prices` / `Leave them as they are` (`QuoteEditor.tsx:346,349`),
`Keep the 29 that convert` (`FieldRow.tsx:551`), `Use the obvious two`
(`RuleInspector.tsx:987`), `Clear the column and change the type`
(`FieldRow.tsx:568`), `Point it at {Table}` (`FieldTypeEditors.tsx:274`).

**Mechanism, name the outcome instead:**

| Label | File:line | Outcome name |
|---|---|---|
| `I/O` | masthead | **Save & open** |
| `Apply 12` | `RuleResultsRail.tsx:326` | **Make these 12 changes** |
| `Commit 12 writes` (its tooltip) | `RuleResultsRail.tsx:323` | same |
| `Draft rule` | `RulesList.tsx:238` | **Start this rule** — and it is the submit of a button labelled *+ New rule* |
| `Append a row` | `TableToolbar.tsx:191` | **Add a row** — the rest of the app says *Add another {noun}* |
| `Set up` | `ViewPage.tsx:266` | acceptable; the Done state (`:257`) is the clearer half |
| `Restore draft` | `FieldTypeEditors.tsx:508` | **Put it back** — the app's own phrase, already used at `BlockCard.tsx:694` |
| `Discard` | `RuleResultsRail.tsx:313`, `QuoteList.tsx:74` | **Throw it away** — already the tooltip at `QuoteList.tsx:71` |

No `Submit`, no `OK`, no `Confirm` anywhere. That part is clean.

---

## 8 · Industry neutrality

`docs/specs/ART_DIRECTION.md:24-28` bans nautical metaphor "in copy, icon,
texture or motion", and names *"chart", "helm", "aboard", "moor", "voyage"* —
exempting the HelmLogic mark itself. Product **data** being marine is correct.

Grep of the whole extracted corpus for nautical vocabulary, minus the demo
data, the seeded workbook rules and `sample.ts`, returns **three** frame hits:

| Hit | File:line | Verdict |
|---|---|---|
| `Find the rows of another entity that fit this one — **a boat's min/max HP against every motor's HP**.` | `types/model.ts:863` | **Frame.** This is the palette tooltip and the inspector heading — the one instrument whose job is to teach the vocabulary of a multi-industry product, and its only worked example is boats and outboards. (O5 flags the word *entity* on this line; the example is a separate, unlogged issue.) |
| `a rig, a customer and a moment` | `app/QuoteStage.tsx:99` | **Frame.** Marine/trucking. The quotes stage is chrome. |
| `Fitting motors` (placeholder) | `rules/RuleInspector.tsx:969` | **Frame.** Also §2. |

**Boundary cases, called out rather than scored:**

- `features/tablekit/preview.ts:85-101` — the New Table dialog previews your
  structure with **Northside's real SKUs** (Highfield SP520/SP600, PA460,
  PA540 Open; Yamaha F70LB/F115XB/F175XC; "Boat Cover - SP560"). The Custom
  kind gets neutral rows ("Your first row"). Table-kind *symbols* are
  sanctioned by the art direction; another company's part numbers as the
  worked example are a different thing. `language-7-new-table-preview.png`.
- `features/constraints/workbookRules.ts:143-324` — six hard-coded rule
  sentences about boats, motors and props, presented under "6 rules **your**
  workbook already states". Correct for this demo; they are shipped in the app
  binary, not read from a file, so a non-marine business would meet six
  sentences about outboards.
- `types/model.ts` `TABLE_KINDS` is one global record (Boats / Motors /
  Trailers / Accessories / Packages / Dealers / Custom) and is not switched by
  the chosen industry. Only Marine is selectable today
  (`INDUSTRIES.*.available === false` for the other three), so this is not
  currently reachable — but it is the place the frame goes marine the moment a
  second industry ships.
- `EmptyState.tsx:90` "another **dealer's** price file" — generic enough
  across marine/auto/powersports. Not a finding.

**Nothing else.** No compass, no helm, no chart, no anchor in the chrome. F4
(the ship's-wheel favicon) holds.

---

## 9 · Dead strings — do not action

A large share of the raw grep hits are behind no door, and reporting them
would pad the fix list. Verified by following the mount graph:

- **`src/app/Rails.tsx` is imported by nothing.** That takes with it
  `src/app/Inspector.tsx` (and its `Schema` / `Data` tabs),
  `src/features/data/DataGrid.tsx`, `src/features/data/Cell.tsx` and
  `src/features/review/ReviewPanel.tsx`. So *"Draft columns in the SCHEMA tab
  first"*, *"log the first record"*, *"The linked entity no longer exists on
  this board"* and *"Draw an entity and the review starts"* do **not** reach a
  user. `Shell.tsx:23-29` says so deliberately.
- **`Whiteboard.tsx:101` is `const nodeTypes = { ...tableNodeTypes }`** — the
  entity cards and zone frames are not mounted. So `EntityNode.tsx`
  ("No fields drafted", the Schema/Data/Compact card modes, `FindingBadge`)
  and `ZoneNode.tsx` ("3 entities") are dark. DOM check: `.rv-badge` count
  **0** on the seeded sheet.
- **The reviewer has no door (O8)** and neither `<EntityMarks>` nor
  `<FieldMark>` is drawn — `EntityDesigner.tsx:12-13` and `FieldRow.tsx:273-284`
  say so in comments. All ~30 "entity" strings in `src/lib/lint/rules.ts` are
  therefore unreachable today. **They become live the day that door is cut**,
  and every one of them says *entity*, *field* and *record*.
- `RulePalette.tsx` is legacy (`features/rules/index.ts:10`); the live one is
  `RulePaletteStrip.tsx`.
- `features/io/sample.ts` — I did not confirm which control loads it; its
  marine strings are demo data either way.

---

## Notes on method, and what I did not test

- **L1 was not reproduced on screen.** Reaching the onboarding needs a cleared
  profile, and CLEAR SHEET would have destroyed the audited project (21
  tables, 651 rows, 3 quotes, one hand-written rule) with no undo (O12). The
  finding rests on `Onboarding.tsx:76-87`, where `placeholder="Northside
  Marine"` sits on an input whose `value` is the empty draft.
- **L17, L18, L26, L27, L28 are source-read only** — each is marked in its
  row. L17 would have written rows into the real project; L26 needs a table
  with zero rows and every seeded table has rows.
- **Tone, rhythm and length were not scored.** This pass judged vocabulary,
  instruction and consistency only.
- **The masthead, the sheet, the view page, the quote editor, the quote list,
  the business-rules pane, the flow builder, the column setup, the new-table
  dialog and the I/O panel were all opened at 1280 × 800** and read out of the
  live DOM as well as from source.
- **O10 bit four times** during this pass — an open stage closed itself
  mid-read while other work saved files under `src/`. No console errors. It is
  already logged; noting it only so the screenshot timestamps make sense.
- **State left behind:** one extra draft quote may exist from my walk of the
  quote path (the list now shows 3, all DRAFT, two of them the same Coaster
  540). I did not discard anything, because discarding might have taken the
  user's own draft with it. Nothing else was created, renamed or deleted.
  **No file under `src/` was edited.**

## Screenshots

`docs/audit/screens/`

| File | Shows |
|---|---|
| `language-1-flow-nodes.png` | the flow stage's empty state; "Pick a rule on the left…" |
| `language-2-flow-open-rule.png` | **NODES**, the eight chips and their 3-letter tags, "Click a node on the sheet to configure it", "· 4 NODES", RUN-the-tag beside RUN-the-button |
| `language-3-column-setup.png` | TXT / IMG / NUM stamps with no legend; the GROUPS + band legend; "TABLE TYPES" in the rail |
| `language-4-quote-picked-chosen-starring.png` | "4 Yamaha Outboards **were picked** … none was **chosen** … **pick** the one … **Starring** it"; and the same sentence for 26 Parts & Accessories |
| `language-5-view-fit-vs-picked.png` | "0 PICKED", "4 PICKED", "**26 FIT**" — the same 26 the quote calls *picked* |
| `language-6-new-table-dialog.png` | "Custom table" among six plurals; "Anything the presets do not cover." |
| `language-7-new-table-preview.png` | "TABLE KINDS" breadcrumb; HIGHFIELD / SP520 / PA540 as the worked example; TABLE NAME pre-filled "Boats" |
| `language-8-io-rejected.png` | **I/O**; "REJECTED — NOT A HELMLOGIC SHEET FILE" under "SAVE A COPY" / "OPEN A SAVED COPY"; `SECTIONS … MOTOR ENVELOPE 4`; the `UID / SYSTEM` column |
