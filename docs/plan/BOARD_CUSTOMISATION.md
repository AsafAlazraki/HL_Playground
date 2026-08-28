# The board, made yours

**Agreed 28 August 2026.** The sales board shipped with five stages a
dealership can rename, recolour and reorder. This is the rest of what
was asked for, written down before it is built so the shape is argued
once rather than discovered five times.

---

## 1 · Full customisation of a column

Today a stage carries `name`, `tone` (one of six accents), `closed`
and its order. What is missing:

- **The accent and the background are one choice and should be two.**
  `tone` currently drives the 3px cap and the column name. A dealer
  should also be able to say how strongly the column itself is
  tinted — none, soft, or the full wash — because a board where every
  column is washed is a board where none of them stands out, and that
  is a judgement about their own pipeline rather than ours.

- **A label is not only a name.** "Awaiting deposit" is a name;
  a dealer may also want a short caption under a column head saying
  what belongs in it. `StageDef.empty` already holds a sentence for
  the empty case; a caption is the same words when the column is
  full, and the two should not be separate fields.

**The rule that must survive all of it:** `draft` and `issued` are
anchors. A quote nobody has moved derives its column from the
document itself, so those two ids must always exist. Rename, recolour
and move them freely; they cannot be removed. See `stages.ts`.

**Contrast is the trap.** Six named tones exist rather than a colour
well precisely because a free picker invites a choice that fails
4.5:1, and no guard in this repo can see contrast. Adding a
background wash multiplies the problem: the column name sits ON that
wash. Any new tone or wash must be measured in both themes before it
ships, and the pairing — not the colour — is what gets measured.

## 2 · What goes on a card

A deal card draws the reference, the customer, the subject, the money
and the date. Different dealerships want different things, and the
card is small enough that four facts is already the ceiling.

So: a **field picker**, storing a chosen subset per person per
organisation — the same shape `tileOrder.ts` already uses for the
dashboard's module tiles, and for the same reason (this is one
person's preference, not the business's structure).

Candidates, all of which the app can already answer: reference,
customer, subject, total, when it was last touched, who prepared it,
how long it has been in this stage, how many notes are on it, and
what type of thing is being sold.

**A cap, not a free-for-all.** A card that draws nine facts is a card
nobody can scan. Four visible at once, and the picker should say so
when a fifth is chosen rather than silently drawing a wall of text.

## 3 · The deal, as an overview

Clicking a card should open a **popup overview of the whole deal** —
and this is not a contradiction of "no popup for New quote". Starting
a quote IS the work and deserves a page; glancing at a deal is a
glance, and a glance that costs you your place on the board is not a
glance. The board stays visible behind it.

It carries: the subject and its photograph, the specification, the
money, the stage, the customer, the notes thread, and the links and
attachments below.

Behind it, **a dedicated deal page** for the full record — every
note, every attachment, the stage history, and the document itself.
The overview is the glance; the page is the file.

## 4 · Attachments and links

**Links first, because they are free.** A label and a URL, stored
beside the deal like its notes. No storage question at all.

**Files are a real storage decision and the answer is IndexedDB.**
Everything per-deal today lives in `localStorage`, which a
dealership's photographs will exhaust inside a week — the quota is
5–10MB for the whole origin, shared with the arrangement, the
pipeline, the tile order and the activity log. Dexie is already in
this application for the project itself, and IndexedDB holds orders
of magnitude more.

So: attachments go in IndexedDB, keyed per organisation and per
deal, with a per-file ceiling and a refusal that says the number
rather than failing silently. `features/modules/logo.ts` already
does exactly this for a module's mark — a size plan, a refusal
sentence, and a note saying what was done to somebody's file. Follow
it rather than inventing a second answer.

## 5 · Every dropdown

The board's sort and the register's sort are native `<select>`
elements. A native select draws the operating system's own menu:
its own type, its own metrics, its own focus ring, in the middle of
a screen built to a design system. It is the one control in this
application that ignores every rule the rest of it keeps.

One styled listbox component, used by both — and by anything that
grows a third. It must keep what the native control gives free:
keyboard (arrows, Home/End, type-ahead, Escape), `aria-expanded`,
`role="listbox"`/`role="option"`, focus returned to the trigger on
close, and a click outside that dismisses.

## 6 · Filter the board by module

The board filters by TYPE — boat, motor, trailer. It should also
filter by **module**, which is what a dealer actually asks: "show me
Highfield".

A quote points at a table through `rootTableId`; a table belongs to
a module. `placesOf` already resolves that pairing for the modules
grid and the dashboard tiles, and the answer must come from there
rather than a fourth reading of the same relationship.
