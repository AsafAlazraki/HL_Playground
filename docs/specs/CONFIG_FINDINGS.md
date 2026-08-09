# CONFIGURATION — what production taught us

From a deep read of how HelmLogic's catalogue, associations and compatibility
get set up today. This is the layer our configurator replaces.

---

## 1. The per-brand editor problem, measured

The strongest argument for declarative structure is in their own line counts.

| Comparison | Lines | Changed | Identical |
|---|---|---|---|
| Surtees vs Stacer model editor | 234 | **6** | **97.4%** |
| Jeanneau vs Stacer model editor | 249 | 23 (all schema, zero rendering) | 91% |
| Stabicraft vs Stacer model editor | 228 | 20 (all schema) | 91% |
| Structure components (5 brands) | ~400 each | 19–29 | **93–95%** |

The six changed lines between Surtees and Stacer are **three renames**. The real
per-brand difference across all nine components is **five arrays of range names,
one strict-vs-loose motor schema, and a handful of `z.any()` keys** — under 60
meaningful lines, expressed as **2,971**.

Adding a brand today: a 400-line structure component, a 230-line editor, a Zod
schema, three hardcoded switch cases, a build and a deploy. **Formosa (39
models) and Haines Signature (9 models) are live in the data and fall through
to `<p>Editor Not Available</p>`** because nobody wrote their switch case.

Their own repo contains the argument. v1.33 lifted one section out of the
Highfield editor and shared it, with this comment:

> *"the configurator … used to be welded into the Highfield editor only, **so
> every other brand's editor had NO way to author optional-feature headings at
> all.** It's now a shared section mounted by all five brand editors."*

One shared component replaced four brands' complete inability to do a thing.

## 2. Twenty association mechanisms — six of them dead

Operators can spend real time authoring data that nothing reads:

| Mechanism | Editor? | Read by anything? |
|---|---|---|
| `applicableTrailerCodes` boat↔trailer matrix | full editor | **never mounted, never read** |
| `model.rules` "Guardrails" include/exclude | full editor + Sync Series | **no evaluator** |
| `compatibilityRules` forbids/requires | **none** | yes (warn-only) |
| `oftenPairedWith` | editor exists | **doc claims it works; it doesn't** |
| `motorFactoryOptions` | — | **never touched** |
| Stabicraft `packageLevels`/`uDekOptions` | — | **schema keys only** |

Two option-to-option rule systems exist: **one with an editor and no evaluator,
one with an evaluator and no editor.**

## 3. The rule engine worth stealing — and why it died

`fit-up-classification.ts` is the one operator-authored rule engine with the
right shape:

```ts
{ id, name, priority, isActive,
  conditions: [{ field, operator, value }],   // ALL must match
  outputTier }
```

Resolution: filter inactive → sort by **priority desc, then specificity
(= number of conditions) desc** → first full match wins → else a named fallback
heuristic. Returns **`via: 'rule' | 'heuristic' | 'none'`** plus the matched
rule, so "why did I get this answer" is always answerable.

Its card copy states the whole semantics in two sentences:
> *"Operator-authored rules that auto-suggest a fit-up tier from the quote
> context. Highest priority + most-specific wins. No matching rule = the v1.11
> motor-HP heuristic."*

**Why it's dead:** the caller short-circuits it — a helper above it always
returns a tier, so `resolveClassification` is never reached. And of its five
offered fields, `boatLengthM` and `boatRange` are never populated and
`modelCode` is fed a Firestore document id, so a rule saying
`modelCode == 'CL380'` can never fire.

**Adopt:** the shape, priority+specificity resolution, `isActive` over
deletion, fail-to-a-named-default, `via` provenance, and that copy.
**Fix:** generalise `field` over *declared columns* (numeric/string falls out
of the declared type), and **derive the context from the row** rather than
hand-assembling it at one call site — that hand-assembly is exactly what
killed it.

## 4. Adopt — genuinely good, battle-tested

1. **Rules as data with a named rationale.** `RELEVANCE_RULES` ships
   `{id, summary, rationale}`, e.g. *"Tube covers sized in metres only fit hulls
   of that length; ±0.4 m absorbs code-vs-LOA rounding."* Every hidden row is
   attributable to a rule id, and the matcher returns `{visible, rule}` so the
   UI can say **which** rule hid something. Our reviewer hints should work
   exactly like this.
2. **Multi-level AND scoping with a specificity score** — module 1, brand 2,
   range 4, model 8, useCase 16; highest score wins. Org default plus per-range
   and per-model overrides, deterministic, with no drag-to-order UI. The single
   best idea in the codebase, and it generalises to overrides of any kind.
3. **Empty means unrestricted**, applied everywhere, and said in the UI:
   *"Empty list = no filter."*
4. **Rules fail open, with a visible escape hatch.** *"Every rule fails OPEN:
   missing context never hides anything."* Already-selected items are never
   hidden. A filter that silently hides a saleable product is worse than none.
5. **Upsert by natural key, never clear-and-replace**, with a counted toast:
   `N updated · M created · K skipped (no key)`. Their own note: *"Clear-and-
   replace destroys operator edits on every partial upload."*
6. **A real diff before writing.** Paste classifies every row as create /
   update / unchanged / skip-no-key with `changedFields[]` — idempotent by
   construction. **This is the model for our import.**
7. **Dry-run by default, `--apply` to write, before/after JSONL evidence logs.**
   That is an undo story, already proven at scale.
8. **Import-time self-verification** — recompute the landed-cost chain, store
   `landedComputed`/`landedDelta`/`landedVerified`, flag deviations over $1.
   An importer that grades its own homework.
9. **Quarantine, don't coerce.** Any value starting with `#` is rejected;
   193 cached `#N/A`/`#VALUE!` cells are reported, never imported as prices.
10. **"No auto-match is better than a wrong one."** SKU-like codes deliberately
    parse as *nothing* rather than as a 1.13 m hull length.
11. **The importer-registry shape** — `{vendorMatch, columnMap: Record<header,
    dottedPath>, keyColumn, transformer, targetCollection}`. Dormant there;
    exactly the object our column mapper should be.
12. **Orthogonal status enums, each value shipping a one-line description.**

## 5. The cost of "no schema", in their own words

Policy, stated:
> *"Schemas for legacy Firestore data must be fully permissive — every nested
> field `optional().nullable().default()`, every object `.passthrough()`."*
> *"**Don't block the save** — legacy data may have invalid fields."*

The bill arrives here — guessing units on a path that auto-applies a price:
```ts
const norm = v > 1000 ? v / 1000 : v > 30 ? v / 100 : v;
// "Specs may be in mm ('5600') or cm on some imports — normalise."
```

And in presentation: **323 audit findings, 104 high** — including a section
named `HIGHFIELD - Patrol` whose *"100 options render on every Stacer,
Stabicraft, Formosa quote"*, and `### OBSELETE` headings reaching customers.
Their framing sentence: **"faithful MPF import != faithful presentation."**

Custom spec fields exist but are `{label: string, value: string}` — no type, no
unit, no enum, no reuse. **That is precisely the gap our typed columns fill.**

## 6. Security — flagged for the owner, not acted on

`scripts/mpf/import-boats.py` and at least four sibling scripts embed the
Firebase project id, the web API key, and **a named employee's plaintext
password** as module constants, and write to production as that user.

Worth rotating that password and moving those secrets to environment variables
whenever the HelmLogic repo is next touched. Nothing here was modified — this
is a read-only observation from the survey.
