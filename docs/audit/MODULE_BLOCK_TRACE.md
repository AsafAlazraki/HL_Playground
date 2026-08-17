# A MULTI-TABLE MODULE AUTO-SEEDS BLOCKS THAT DO NOT RESOLVE

> ## FIXED — 2026-08-17, by option 1. READ THIS BEFORE THE REST OF THE PAGE.
>
> The auto-seed is row-aware now. `createModule` no longer scans every join in the project
> against the module as a set; it walks its own tables and seeds **each table's page from that
> table's own joins**, through `defaultBlocksFor` in `src/features/views/relations.ts` — the same
> derivation a table's page has always used, moved to a store-free file so the two callers cannot
> drift apart again.
>
> **The numbers below are what the OLD seed produced.** After the fix, on the same seed:
> Stacer **4** · Stabicraft **6** · Surtees **5** · Jeanneau **6** · Haines Signature **3** ·
> Highfield **5** · Formosa **4** — every one of them resolving, none of them borrowed from
> another brand. Formosa goes 0 → 4. Surtees never meets the OBSOLETE join at all: the join and
> the table are both retired, so `existingRelations` refuses it twice before `sellable.ts` is
> ever asked. A brand's block count exceeds its join count wherever one join carries three
> reference columns — a Motor Fitment join names the boat, the outboard **and** the rigging kit.
>
> Two corrections to what is written below, both worth knowing:
>
> 1. **The render-time symptom was narrower than §"WHAT THIS MEANS" implies.** `ModuleStage`
>    renders `<ViewStage entityId={item.tableId}>`, which resolves the row's OWN table's view —
>    so a Formosa row never actually drew eleven empty blocks on screen. What it drew was
>    Formosa's page. The damage was to the PRIMARY brand's page, which really did hold eleven
>    blocks, was mirrored to IndexedDB by `viewPersistence.ts`, and came back on reload.
> 2. **The seeded blocks carried no `rule`**, and `relatedRows` with no rule matches every
>    candidate — so each block would have drawn its whole target table (640 rigging kits under
>    one hull). `defaultBlocksFor` seeds `curatedOnly()`, as `createViewFor` always did.
>
> **A stored project keeps its old view.** `viewPersistence.ts` HYDRATE registers saved ViewDefs
> by their stored id, so an IndexedDB holding an eleven-block page keeps it. The fix governs
> modules seeded after it; a browser carrying an older project needs the seed-version refresh.
>
> The guard is `src/features/modules/moduleBlocks.test.ts`, which asserts the per-brand counts
> against the real seed through the real store action, and — structurally, with no brand list —
> that no block is ever bound to a join that does not name its own table.

**Status:** measured, not argued. Traced against the real Northside seed through the real
`createModule`, on 2026-08-17. Recorded here because the module work is paused mid-flight and
this is the finding that decides how it resumes.

**How to reproduce.** The trace was `src/features/modules/ztrace.test.ts` (temporary, deleted
after reading). It built the Northside project, called `createModule` with all seven boat
tables as masters, and printed the resulting ViewDef.

---

## WHAT HAPPENS

`createModule` with `tableIds` = the 7 boat brand tables produces:

```
MODULE Boats  tables=7  index=tiles
VIEW  blocks=11  root=Stacer
```

Eleven blocks. Each one is bound to **one brand's** join table:

| block target | join it was seeded from |
|---|---|
| Yamaha Outboards | Highfield × Yamaha |
| Rigging Kits | Highfield × Yamaha |
| Jeanneau Factory Packages | Jeanneau × Factory Packages |
| Haines Signature Factory Packages | Haines Signature × Factory Packages |
| NSM Custom Trailers | Highfield × NSM Custom |
| Stacer Trailers | Stacer × Stacer Trailers |
| GFAB Trailers | Stabicraft × GFAB |
| Dunbier / Haines BMT Trailers | Haines Signature × Dunbier/Haines BMT |
| Dealer Fit Packages | Highfield × Dealer Fit |
| Parts & Accessories | Highfield × P/D Parts |
| OBSOLETE Trailers | Surtees × OBSOLETE Trailers |

## WHY THAT IS BROKEN

A block seeded from `Highfield × Yamaha` only ever resolves pairs for **Highfield** rows. So
every row of every other brand is handed a block that can never fill. Counted, per brand:

| brand | blocks that resolve | of 11 |
|---|---|---|
| Highfield Inflatables | 5 | Yamaha, Rigging Kits, NSM Custom, Dealer Fit, P/D Parts |
| Haines Signature | 2 | its Factory Packages, its Dunbier/BMT trailers |
| Stacer | **1** | Stacer Trailers only |
| Stabicraft | **1** | GFAB only |
| Surtees | **1** | **OBSOLETE Trailers only** |
| Jeanneau | **1** | its Factory Packages only |
| **Formosa** | **0** | **every block is empty** |

Two consequences worth stating on their own:

- **A Formosa row opens onto eleven empty blocks.** Nothing resolves at all.
- **A Surtees row's only resolving block is the OBSOLETE trailer join** — so the one thing
  that page would show is discontinued stock, which is precisely what
  `src/features/views/sellable.ts` exists to keep off a customer-facing surface.

The brands are not symmetric, and that is real data rather than a seeding gap: 6 brands have
Yamaha motor fitment but Haines and Jeanneau use factory packages instead; only 3 have Dealer
Fit; only Surtees has an obsolete-trailer join. Joins per brand: Stabicraft 5, Surtees 5,
Jeanneau 5, Highfield 4, Stacer 3, Formosa 3, Haines 2.

Note also `root=Stacer` — the minted ViewDef is rooted on a single table, so a module spanning
seven of them is describing itself by one.

## WHAT THIS MEANS FOR THE BUILD

*(Historic — option 1 was taken. See the note at the top of this file.)*

Seeding a multi-table module and shipping it is not viable as the code stands. Whoever resumes
this picks one of:

1. **Make the auto-seed row-aware** — a block resolves against the row's own table, so a
   Highfield row never renders a Stacer block. Fixes it for every future module, not just this
   seed, and is the only option that survives a non-marine org.
2. **Set the module's blocks explicitly** and let each row render only its own. Cheaper, but it
   hardcodes into the demo what should be derived from the data.
3. **Render nothing for a block with no pairs** — necessary either way, but on its own it turns
   a Formosa row into a blank page rather than a wrong one, which is not a fix.

Whatever is chosen, an empty block must not simply render blank: DESIGN_PRINCIPLES rule 10
says anything that cannot be done says why, where it is.
