# THE QUOTE — what production taught us

From a deep read of HelmLogic's quoting system. This is the layer our Part 1
data model has to feed. Adopt column, avoid column, both evidenced.

---

## 1. The granular association you asked about EXISTS — and is unmaintainable

You asked whether you can associate "a factory option for that motor when on
that boat". The answer from production: **a five-way association already exists
in the data**, and it is the best idea in the whole system.

The MPF's curated motor menu is **13 slots, each 6 columns wide**, hanging off
the **variant** (the exact SKU), not the model:

```
slot | motorName | riggingKit | propPartNo | propDesc | engineHole | recommended
```

Extracted at `slots = [(1,312)] + [(n, 318+6*(n-2)) for n in range(2,14)]`
(`scripts/mpf/extract-boats.py:303-319`). Slot 1 is the recommended package.
So a **specific rigging kit and a specific propeller are attached to a specific
motor on a specific boat SKU** — exactly the grain you described.

**Why it hurts today**, and why this is our single biggest opportunity:
- Every leg is a **display-name string**, resolved at runtime by
  exact → lowercase → contains-after-`" - "` matching
  (`highfield-quote-flow.tsx:2112-2131`). A rename upstream silently orphans it
  and the quote just prices without it.
- **There is no editor.** The only way to author it is to re-import the
  spreadsheet. The column grid is compiled into the extractor, so inserting a
  column in the workbook means a developer rewrites Python.

**Our answer:** that menu is a join table — `Boat Variant × Motor` with
`Rigging Kit`, `Prop`, `Engine Hole` and `Recommended` as columns on the join.
Real links, editable in the grid, no re-import, no string matching.

## 2. ADOPT — battle-tested and correct

1. **Snapshot on commit.** Every price on a finalized quote is frozen. Stated
   three times in code, best in `tasks/ffr33-composition-notes.md`:
   *"rounding is heterogeneous per line — SNAPSHOT stored sells, never
   recompute."* Our exports and any future quote must freeze, not re-derive.
2. **Snapshots carry provenance.** `pricingSource: 'source' | 'override'` plus
   the original figure, so an auditor can compute the delta later without
   re-resolving anything.
3. **Empty means unrestricted.** Empty `applicableVariantIds` = applies to all;
   the five fit-up allowlists AND together, empty at a level = no restriction
   there. Never make a user tick 640 boxes to mean "all".
4. **Curated beats computed — with the computed one as a safety net.** The
   13-slot menu is primary; the min/max HP envelope is the fallback. Two-tier
   fitment is the right model: the business's opinion first, the rule behind it.
5. **Curation fails open, always with an escape hatch.** A 1,791-row pool is
   narrowed to what fits this hull, but "Show all" bypasses everything and
   already-selected items are never hidden.
6. **Never render a missing price as a number.** Unresolvable prices print
   *"Not priced at this level"* in an amber pill, because *"a silent $0 on the
   customer-facing summary is the class stakeholders catch"*.
7. **Hard-gate only the step that sets the price.** One gate — material and
   colour on step 1 — with the reason shown: *"the price is built from that
   exact configuration."* Everything else warns.
8. **Labour is part of the product.** Pre-delivery is a catalogued, tiered,
   snapshot line (boat prep + motor PD + install + rigging labour), not a
   formula bolted on at the end.
9. **Deposit stages are data in the business's words** — Pending Security ·
   Confirmed Deal · Leaving Factory · Notice of Arrival · On Handover.
10. **Three-layer content overrides** (org default → brand → per-quote) with a
    lock flag and real version history. The only override mechanism in the app
    that is a *delta* rather than a document copy — and the only one that has
    never needed a repair script.

## 3. AVOID — the traps, with receipts

1. **A designer nothing renders.** They built a full drag-and-drop WYSIWYG
   template designer with data bindings, writing to
   `organisations/{orgId}/templates`. **The PDF renderer never reads that
   collection.** The customer always gets a hardcoded component.
   → *Our Part 2/3 rule: a designer ships only when the runtime reads it.
   A design surface with no consumer is worse than no design surface.*
2. **A compatibility matrix nothing reads.** `applicableTrailerCodes` has an
   editor, a save handler and a release note promising auto-filtering. A
   repo-wide grep finds it only in the editor and one test. An operator can
   spend an afternoon ticking boxes that change nothing.
3. **A rule engine with no editor.** *"engineering writes rules direct to
   Firestore (Firebase Console). Admin UI deferred to v1.10+"* — shipped at
   v1.34 without one, and warn-only.
4. **No line-item model.** The quote has eight bespoke sub-objects with eight
   different price field names, and **four independent summations of the same
   deal** (running total, two financial builders, PDF line items). Adding a new
   chargeable thing means editing all four.
   → *Ours must have ONE line model: `{source, label, qty, unitPrice, cost,
   sectionRef}`, derived once.*
5. **Governance dropped on the floor.** The margin-override reason is written
   to `window.__marginOverrideAudit` and read by nothing.
6. **Dead features that look alive.** Expiry never set (every quote is
   "no-expiry"); trade-in captured on boat quotes and never subtracted;
   `quote-versioning.ts` has zero callers.
7. **Constants that should be data.** `GST_MULTIPLIER = 1.1` re-hardcoded as a
   bare literal in seven files while `organisation.gstPercentage` sits unused.
   Price levels hardcoded in six places — their own handover doc has a section
   titled *"Price Levels (hardcoded)"*.
8. **Guessed costs driving real gates.** When a cost is missing it is estimated
   at a hardcoded percentage of sell (boat ×0.7, motor ×0.85, dealer fit ×0.6),
   and that guess decides whether the margin gate blocks the quote.
9. **Two pricing conventions chosen by accident.** Whether the running total is
   ex- or inc-GST depends on whether the importer happened to write three
   fields onto that variant — which changes whether a discount lands before or
   after GST.

## 4. What Part 1 must therefore provide

| Need | Part 1 delivers |
|---|---|
| The 13-slot menu, editable | Join tables with columns on the join |
| Two-tier fitment | Join rows first, rule engine as fallback |
| One line model | Sections + typed columns make a line derivable |
| No string joins | Real `reference` columns |
| Prices that are data | Columns, not constants — including GST and price levels |
| Provenance | UID + snapshot-friendly export |
| Labour as product | Just another table with a price column |
