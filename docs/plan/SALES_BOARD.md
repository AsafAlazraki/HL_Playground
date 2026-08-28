# The sales board

**Status: agreed, not started.** This is the backlog entry asked for on
28 August 2026. Nothing in it is built; the quotes screen today is a
list, and this describes what replaces it.

---

## What it is

The Quotes screen becomes a **deal board**: lifecycle stages across the
top, deals as cards under them, dragged from one stage to the next.

Today a quote has a `state` (`draft` / `issued`) and that is the whole
of its lifecycle. A dealership's actual pipeline is longer than two
words, and the thing a sales manager wants on a Monday is not a list
sorted by date — it is *where is everything, and what is stuck*.

## The pieces, in the order they are worth building

### 1 · Stages

A named, ordered set of lifecycle stages, stored per organisation so a
dealership can name its own. `QuoteState` today is a closed union of
two; this replaces it with a reference to a stage the business defines.

**The migration is the hard half, not the board.** Every existing quote
carries `state: 'draft' | 'issued'`, `quoteTotals` branches on it, the
dashboard's four filters are written in terms of it, and the history
diary records transitions between the two. A stage model that does not
map those cleanly onto their new equivalents breaks the quotes card,
the filters and the diary in one commit. Do the mapping first, with a
test that every stored quote lands somewhere, and only then draw a
board.

### 2 · Swimlanes

Rows across the board, cutting the same deals a second way — by
salesperson, by brand, by month. A lane is a grouping, not a second
axis of truth: a deal is in exactly one stage and appears in exactly
one lane.

Brand is the lane that matters most, and it is already available:
`quotesPerPlace` (`features/dashboard/cards.ts`) resolves a quote to a
place through `rootTableId`, which is what makes "Highfield's pipeline"
a real question the data can answer.

### 3 · Drag and drop between stages

The board's whole point. Reuse `features/dashboard/reorder.ts` — it
already does pointer capture, slot measurement, keyboard moves and a
held state, and it was written generically enough to move tiles and
cards. What it does not do yet is move an item **between containers**,
which is the one capability to add.

**Moving a deal must be undoable**, and by rule 9 that is a toast with
UNDO rather than a confirmation dialog. It is also an audit entry: the
log already listens to the note bus, so a move that announces itself is
a move the log records with no extra work.

### 4 · What a stage change *does*

The user's words: *"when things get to those stages it changes
everything accordingly"*. Stage entry becomes a trigger — reassign the
owner, lock the pricing, require a deposit field, notify somebody. This
is the largest and least specified piece and should be designed only
once stages exist and somebody has used them for a fortnight.

### 5 · A deal is a conversation

Comments, notes, photographs, uploads, and reassignment to another
salesperson — attached to the deal, in order, with who and when. The
activity log already answers "what changed"; this is the other half,
which is "what did we say about it".

Photographs and uploads mean a **storage decision this app has not made
yet**: everything today is IndexedDB and localStorage, both of which
have limits a dealership's photo attachments will reach. Decide that
before building the upload control, not after.

---

## What this must not break

- **The quotes card on the dashboard.** Its four filters are the four
  questions a salesperson asks; if stages replace states, the filters
  become stage-shaped and must keep answering the same questions.
- **Frozen quote documents.** A quote's printed form is frozen by
  design — the subject's name, its specs, its prices. A stage is
  metadata *about* the deal, not part of the document, and changing a
  stage must never alter what was quoted.
- **The 4.5:1 floor on every stage colour.** A board is a coloured
  thing and stage colours are the temptation; they are labels on a
  tint, and a tint counts (rule 4).
