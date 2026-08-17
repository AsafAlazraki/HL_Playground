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
