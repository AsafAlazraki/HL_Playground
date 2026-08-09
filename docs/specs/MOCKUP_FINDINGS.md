# MOCKUP FINDINGS — what to take from the v2 boat configurator

> Source studied: `v2.zip` (extracted to scratchpad), 10 JS modules + 1 CSS +
> shell, ~2,400 lines total, plus 66 passing solver tests (`test.js`).
> The loose copies in `%TEMP%` have **shuffled filenames** — ignore them.
> `%TEMP%\README.md` is not a document at all: it is the *built* single-file
> app (`boat-configurator-v2.html`, 156 KB). Correct names come from the zip.
>
> **Filename correction that matters:** the sentence renderer is in
> **`src/13-model.js`** ("MODEL MODE — sentence rendering and entity editing").
> `15-render.js` is a 45-line top-level `render()` + boot. Cite 13-model.js.

---

## 0. Three facts on our side that set the frame

**(a) The user already told us this, in our own docs.** `UX_REWORK.md` §2 records
the verbatim complaint: *"I am not happy with how rules look. just by looking at
the sheet you should be able to understand what is going on without having to
click elsewhere."* The doctrine written in response — *"A rule plate must state
its own logic in full. No plate may summarise itself into something you have to
click to understand"* — is exactly what the mockup implements. The mockup is not
a new direction; it is the direction we already chose, executed further.

**(b) We already have a token model for rule sentences.**
`src/features/rules/describe.ts:918` exports `plateSpec()` returning
`PlateChunk { t: 'stamp'|'field'|'op'|'value'|'word', text, accent?, title? }`
inside `PlateLine` / `PlateRoute` / `PlateChip`. That is the mockup's
`tok a|o|v|j` vocabulary, already typed, already ours, already used to draw
every clause on a plate. **The gap between us and the mockup is one field:
`editable`, plus a typed reference back to the clause.** This materially
lowers the cost of everything in §8.

**(c) None of it is mounted.** `src/app/Shell.tsx` routes onboarding →
configurator only. The rule canvas, palette, inspector and results rail
(`src/features/rules/`, ~7,700 lines) are deliberately off the default path per
`CONFIGURATOR_SPEC.md` §5; `src/features/views/` (the whole VIEW_SPEC
implementation, including `RuleOffer.tsx` and `suggest.ts`) is referenced by
nothing outside its own `index.ts`.

Fact (c) is the one to sit with. `QUOTE_FINDINGS.md` §3.1–3.3 catalogues the
production failures this project exists to avoid: *"a designer nothing renders"*,
*"a compatibility matrix nothing reads"*, *"a rule engine with no editor"* — and
its own conclusion is **"a design surface with no consumer is worse than no
design surface."** We currently have three finished surfaces with no consumer.

The mockup's real lesson is therefore not only the sentence UI. It is that
**every part of it is reachable in one click and visibly connected to every
other part**: edit a word in a rule → the configurator on the right re-solves →
a greyed card changes → clicking that card lands you back on the rule. Nothing
in it is built and unwired. That connectedness is what makes it feel easy.

---

## 1. What the mockup gets right

Five things, in order of how much they matter to "this system has to be easy to use".

### 1.1 A rule is an English sentence, and the sentence is the editor

There is no canvas, no node, no graph, no palette. A rule looks like this:

> **When** `Water` `is` `Salt` **then** `Propeller material` `must be` `Stainless steel`.

Every coloured word is a `<select>`. You change the rule by changing a word in
the sentence. There is no "edit" mode to enter, no inspector to open, no form.
The sentence *is* the form. `13-model.js:63-87`.

This is the single most important idea in the mockup and the answer to the
user's complaint about our flow-chart builder.

### 1.2 Rules are always shown with live state, never as inert config

Every rule card carries, computed on each render (`13-model.js:203, 229-241`):

| State | Source | Shown as |
|---|---|---|
| `fired` | rule id appears in `S.trace` | teal border + **ACTIVE NOW** tag |
| `bad` | rule id appears in `S.problems` | red border + **CONFLICT** tag |
| `off` | `APP.ruleState[id] === false` | card at 45% opacity |
| `edited` | set by `refreshRule()` | violet **EDITED** tag |

A rule you can *see working* is a rule you trust. Our own `QUOTE_FINDINGS.md`
§3.2–3.3 records the opposite failure twice in production: "a compatibility
matrix nothing reads" and "a rule engine with no editor". The **ACTIVE NOW**
tag is the cheapest possible cure for that class of bug.

### 1.3 A rule card has an on/off switch, not a delete button

`13-model.js:231`. Shipped rules cannot be deleted; they can be *turned off*,
and turning one off re-solves immediately. Only user-authored rules (`r.mine`)
get a delete. This makes the model safe to poke at — the entire "ask why →
switch it off → watch the option come back" loop depends on it.

### 1.4 "Ask why" — a greyed option explains itself and offers the fix

A blocked option is not hidden and not silent. It renders as a struck-through
card carrying its own reason in plain English, and clicking it opens the
responsible rule with a **Turn this rule off** button. Full mechanism in §4.

### 1.5 Two tabs, and one of them is a picture of the business

Model mode has exactly two tabs — **Business rules** and **Entities & columns**
(`13-model.js:197-199`). The entities tab opens with a small, static,
hand-positioned diagram of nine tables and their relationships, each box
showing its name and a live column count. It is a *map*, not a workspace. See §6.

---

## 2. SENTENCE RULES — the adoption plan against our model

### 2.1 The mockup's complete rule vocabulary

Five `kind`s. Every one renders as one sentence (`13-model.js:63-87`):

| `kind` | Sentence template | Bi-directional? |
|---|---|---|
| `implies` | **When** ⟨pred⟩ **then** ⟨pred⟩. | yes (+ contrapositive) |
| `excludes` | **Never** ⟨pred⟩ **together with** ⟨pred⟩. | yes |
| `compare` | ⟨col⟩ *op* ⟨col⟩ [**whenever** ⟨pred⟩]. | yes |
| `equals` | ⟨col⟩ **must equal** ⟨col⟩ [**whenever** ⟨pred⟩]. | yes |
| `table` | ⟨col⟩, ⟨col⟩, ⟨col⟩ **must match one of N approved combinations**. | yes |
| `calc` | **Calculate** ⟨col⟩ **from** ⟨cols⟩. | **no** — one way only |

A predicate (`predHTML`, `13-model.js:44-61`) is a recursive tree of
`{attr, op, value}` leaves combined by `all` / `any` / `not`, plus one special
leaf `{attr, op:"isset"}` rendered as "⟨col⟩ **has been chosen**".

Two pieces of craft inside `predHTML` worth copying verbatim:

- **`any` of `==` on the same column collapses to a chip row.** Instead of
  "Steering is Hydraulic **or** Steering is Electric power steer", it renders
  `Steering` **is one of** `[Tiller] [Mechanical cable] [Hydraulic✓] [Electric✓]`
  where every value of the domain is a toggle chip (`13-model.js:48-56`).
  Clicking a chip adds/removes a disjunct. This is dramatically easier than an
  OR-group builder and needs no new operator.
- **`all` and `any` render as the bare words "and" / "or"** styled as a
  `tok j` (transparent, dim) — so the sentence still reads as prose, not as a
  boolean expression.

### 2.2 The operator vocabulary and its English

```js
const OPLBL = { "==":"is", "!=":"is not", ">=":"is at least", "<=":"is at most",
                ">":"is more than", "<":"is less than" };
const OPLIST = ["==","!=",">=","<=",">","<"];                 // 13-model.js:6-8
```

Two additional labels are not in `OPLBL` and are hardcoded where they occur:
`isset` → **"has been chosen"** (`:59`), same-column `any` → **"is one of"**
(`:55`), `equals` → **"must equal"** (`:76`), `table` → **"must match one of N
approved combinations"** (`:80`).

The `then` side of the sentence builder re-labels the *same* operator list into
obligation voice: `"must be " + OPLBL[o].replace("is ","")` → "must be",
"must be at least" (`13-model.js:215`). One list, two grammatical moods. Take this.

The solver's operator set is wider than the editor's — `OPS` also carries
`in` / `notin` (`03-engine.js:104-106`), used by table constraints but never
exposed as an editable token.

### 2.3 How a token becomes editable — the select-inside-span trick

This is the whole visual trick, and it is three lines of CSS.

```js
function tokAttr(rid, path, attr, ro){
  if (ro) return `<span class="tok a">${esc(COLS[attr].display)}</span>`;
  return `<span class="tok a sel"><select onchange="setRuleAttr('${rid}','${path}',this.value)">
    ${attrOptions(attr)}</select>
    <i>${esc(COLS[attr].display)}</i></span>`;      // 13-model.js:24-28
}
```

The `<select>` is stretched over the whole span at `opacity:0`; a plain `<i>`
paints the *label* underneath it. So the user sees prose and gets a native
dropdown (including native mobile pickers and keyboard) on click:

```css
.sentence{line-height:2.35;font-size:13.5px}
.sentence.big{font-size:14.5px;line-height:2.5}
.kw{color:var(--dm2);font-size:12.5px;margin:0 2px}
.tok{display:inline-block;padding:2px 9px;border-radius:6px;font-size:12.5px;
     position:relative;white-space:nowrap}
.tok.a{background:var(--ac2);color:var(--ac);font-weight:600}   /* column  */
.tok.o{background:var(--s3);color:var(--dm)}                    /* operator */
.tok.v{background:#3d3218;color:var(--wn);font-weight:600}      /* value   */
.tok.j{background:none;color:var(--dm2);padding:0 3px}          /* and/or  */
.tok.sel{cursor:pointer;box-shadow:inset 0 -1.5px 0 currentColor}
.tok.sel select{position:absolute;inset:0;width:100%;height:100%;opacity:0;
                cursor:pointer;border:none;background:var(--s3)}
.tok.sel i{font-style:normal;pointer-events:none}
.tok.sel:hover{filter:brightness(1.25)}                    /* 14-style.css:224-245 */
```

Three structural details to keep:
1. **The underline is `box-shadow: inset 0 -1.5px 0 currentColor`**, applied
   only to `.sel`. Editable tokens are underlined; read-only ones are not. That
   single affordance is how the user knows what they can change.
2. **`line-height: 2.35`** on the sentence. Inline pills need the leading or the
   sentence collapses into a blur. This is the difference between "beautiful"
   and "a mess", and it is one number.
3. **Three token colours = three token roles** (column / operator / value).
   Colour carries grammar, so the eye parses the sentence before reading it.

### 2.4 Read-only vs open

One boolean, threaded everywhere: `sentenceHTML(r, ro)`.
`ro = !open` where `open = (APP.editRule === r.id)` (`13-model.js:228, 233`).
The collapsed card shows the *same sentence*, unstyled-for-edit; clicking the
card body sets `APP.editRule` and the same function re-renders it with live
selects. **There is no separate view template and no separate edit template.**
That is why the two can never drift.

Note the deliberate asymmetry: `compare`, `equals` and `table` always pass
`true` (read-only) for their column tokens — you can read them as sentences but
not restructure them inline. Only `implies` and `excludes` are fully editable.
Sensible scoping, worth copying.

### 2.5 Where a token's value list comes from

```js
function valuesFor(attr){
  const c = COLS[attr];
  return c && c.at ? MODEL.attributeTypes[c.at].values : [];   // 13-model.js:15-18
}
```

The mockup separates **attribute type** (a reusable named domain) from
**column**: `AT_PropMaterial: { kind:"choice", values:["Aluminium","Stainless steel"] }`,
and 26 such types shared across 30 columns (`01-model.js:119-146`). Numeric
columns get an explicit finite value list too — `AT_EngineHP: [15,20,25,115,150,175,200,250,300,350]`.
**That finiteness is what makes the solver possible.** `attrsOf()` filters the
picker to `c.at && !c.derived` — you can never write a rule that assigns a
calculated column (`10-app.js:23`).

`coerce(attr, raw)` (`13-model.js:90-94`) converts the select's string back to
the typed domain value by identity-matching against `valuesFor`, falling back to
`+raw` — this is required because HTML select values are always strings.

### 2.6 The "Write a new rule" sentence builder

Top of the rules pane, in a bordered card headed with a plus icon:
**"Write a new rule — It reads as a sentence, and it takes effect the moment you
add it."** (`13-model.js:205-218`). It is one live sentence with six selects
(if-column, if-op, if-value, then-column, then-op, then-value) held in
`APP.draft`, plus an **Add rule** button. On add (`13-model.js:130-146`) it:

- mints an id `MY-n`, `kind:"implies"`, `layer:"Expression constraint"`;
- **auto-names the rule from the columns**:
  `"${then.display} depends on ${if.display.toLowerCase()}"`;
- auto-writes `src: "You, just now"` and a `why` explaining that it behaves
  exactly like the shipped rules, "bi-directional, and it will prune in both
  directions";
- auto-writes the plain-English `human` clause used by "ask why":
  `` `you set ${if.display.toLowerCase()} to ${fmt(...)}` ``;
- opens it for editing and re-solves.

Zero required metadata. The user types nothing but three dropdown choices per
side. **Take this whole pattern, including the auto-generated name and reason.**

### 2.7 Mapping onto OUR model — what maps, what is missing

Our `src/types/model.ts` already has most of the vocabulary.

| Mockup | Ours | Status |
|---|---|---|
| `{attr, op, value}` leaf | `Clause { left: FieldPath, op: CompareOp, right?: ValueExpr }` | **maps 1:1** |
| `attr` | `FieldPath { viaFieldId?, fieldId }` | **better than theirs** (one relationship hop) |
| `value` literal | `ValueExpr {kind:'literal'}` | maps |
| column-to-column (`equals`, `compare`) | `ValueExpr {kind:'field', path}` | **maps** — `equals`/`compare` are just clauses with a field RHS. We do not need those two kinds at all. |
| `all` / `any` | `ClauseGroup { combinator:'AND'\|'OR', clauses }` | maps, **but flat** |
| `==` `!=` `>=` `<=` `>` `<` | `eq neq gte lte gt lt` | maps 1:1 |
| `isset` | `notEmpty` | maps (also gives us `isEmpty`) |
| `in` / `notin` | — | not needed: render an OR-group of `eq` as the "is one of" chipset, exactly as `predHTML` does |
| `OPLBL` English | `OP_LABEL` + `OP_MENU` in `src/features/rules/describe.ts:73-104` | **already ours, already English** ("at least", "is yes") |
| `fmt(attr,v)` | `formatCell(v)` `describe.ts:313` | maps |
| `valuesFor(attr)` | `FieldDef.options?: string[]` (`type:'select'`) | maps for `select`; **missing for `number`** |
| `describeClause`/`describeGroup` | `describe.ts:353-386` — already produce English strings | **half the work is done** |
| `betweenPhrase` collapse | `describe.ts:362-378` | **we already have a sentence-collapse idiom they don't** |
| `tok` classes `a`/`o`/`v`/`j` | `PlateChunk.t` = `field`/`op`/`value`/`word` + `stamp`, from `plateSpec()` `describe.ts:918` | **already ours** — same four roles, typed, plus an entity `stamp` they lack |
| `sentenceHTML(r, ro)` | `plateSpec()` → `PlateSpec { lines, routes, chips, footer }` | maps — ours is richer (routes, chips, red-pencil `miss()` lines) but **read-only** |

**What is genuinely missing (the concrete gap list):**

1. **A declarative constraint type.** We have `RuleDef { nodes, edges }` — a
   node graph. There is no shape for "when A then B". Needed:
   ```ts
   export type ConstraintKind = 'implies' | 'excludes' | 'requires' | 'table'
   export interface ConstraintDef {
     id: string; name: string; enabled: boolean
     kind: ConstraintKind
     entityId: string                 // the subject being configured
     if?: ClauseGroup                 // implies / excludes: A
     then?: ClauseGroup               // implies: B   | excludes: B
     table?: { fieldIds: string[]; rows: CellValue[][] }   // tuple whitelist
     why?: string                     // the long rationale
     because?: string                 // the short "ask why" clause (their `human`)
     source?: string                  // provenance ("You, just now")
     createdAt: string; updatedAt: string
   }
   ```
   This is **additive** — it satisfies `PLATFORM_VISION.md` non-negotiable #4,
   and it does not touch `RuleDef`.
2. **Nested groups.** `ClauseGroup.clauses: Clause[]` cannot express
   `all[ any[...], leaf ]`, which rule EC-20 needs. Change to
   `clauses: Array<Clause | ClauseGroup>` (additive at runtime, one type edit),
   or accept depth-1 and defer.
3. **Negation.** No `not`. With the full op set (`neq`, `isEmpty`) the only real
   loss is negating a *group*; the solver needs it for the contrapositive
   (`negate()`, `03-engine.js:110-117`). Add `ClauseGroup.negated?: boolean`.
4. **Finite numeric domains.** `FieldDef` has `options` only for `select`.
   A solver over `number` has no domain to narrow. Add
   `FieldDef.choices?: CellValue[]` usable by `number` too (their `AT_*`
   pattern), or restrict the configurator to `select` + `boolean` at first.
5. **Reusable domains.** No analogue of `attributeTypes`. Low priority — our
   `options[]` per field is fine until two fields must share a list.
6. **Field applicability.** No `FieldDef.when`. This is what makes the
   configurator hide "Shaft length" for an inboard (`01-model.js:194-196`).
   Add `FieldDef.when?: ClauseGroup` + `strict?: boolean` (see §7.4).
7. **Requirement levels.** We have `required?: boolean`; they have
   None / Recommended / ApplicationRequired driving progress. Only needed when
   we build the step flow (Part 3).
8. **Ordering between constraints.** `RuleDef` has no `priority`, and
   `CONFIG_FINDINGS.md` §3 prescribes production's proven scheme — *priority
   desc, then specificity (clause count) desc, first full match wins, else a
   named fallback*. A propagating solver mostly does not need it (removal is
   order-independent and converges to the same fixpoint), but **conflict
   reporting does**: which rule gets named first. Add `priority?: number` and
   sort by `(priority, clauseCount)` when reporting.

### 2.8 The concrete plan

1. Add `ConstraintDef` to `src/types/model.ts` (additive, per §2.7.1).
2. **Extend the existing `PlateChunk` vocabulary — do not invent a second token
   type.** `plateSpec()` already emits exactly the right chunks; they are simply
   inert. Add two optional fields:
   ```ts
   export interface PlateChunk {
     t: PlateChunkKind          // 'stamp' | 'field' | 'op' | 'value' | 'word'
     text: string
     accent?: AccentKey
     title?: string
     /** NEW — what this chunk edits. Absent = read-only prose. */
     edit?:
       | { k: 'field'; clauseId: string; side: 'left' | 'right' }
       | { k: 'op';    clauseId: string }
       | { k: 'value'; clauseId: string; options?: CellValue[] }
       | { k: 'combinator'; groupPath: string }
     /** NEW — for a same-field OR group rendered as toggle chips */
     chips?: { options: CellValue[]; selected: CellValue[] }
   }
   ```
   A **typed reference**, never the mockup's `"then.any.1"` string path (§7.1).
   `describeGroup` keeps returning a plain string for node plates, the effects
   rail and exports — it becomes `chunks.map(c => c.text).join(' ')`, so there
   is still exactly one source of words. Add `constraintSpec(c, ctx): PlateSpec`
   beside `plateSpec(node, …)`.
3. Render `<Sentence spec={…} onEdit={…}/>` in React: any chunk carrying `edit`
   becomes a `<TokenSelect>` — a real `<select>` at `opacity:0` stretched over
   its label per §2.3. Do **not** rebuild it as a custom popover; the native
   control is why theirs feels instant and works on touch and keyboard. Reuse
   the `<Sentence>` component for **both** the constraint list and the existing
   read-only plates, so the canvas and the sentence list can never disagree.
4. Build `RuleSentenceList` + `NewRuleSentence` (the builder) as the default
   rules surface. `CONFIGURATOR_SPEC.md` §5 already promises exactly this:
   *"Fitment rules return later as a plain-language step, built on the existing
   rule engine."* This is that plain-language step.

---

## 3. THE SOLVER — port, extend, or skip

### 3.1 What it actually is

**Arc-consistency propagation over finite domains, run to a fixpoint.** Their
own header comment says so (`03-engine.js:1-10`). The loop:

```js
recompute();                                    // calculated columns first
for (let i=0; i<40; i++){
  let changed = false;
  for (const r of active) if (step(r)) changed = true;
  recompute();
  if (!changed) break;                          // fixpoint
}                                               // 03-engine.js:340-346
```

Not a search, not backtracking, no CSP library. It never guesses; it only ever
*removes* values that no rule can permit. 40 iterations is a safety cap; real
models converge in 2–4. ~220 lines of solver in total, and 66 tests cover it.

### 3.2 What is in `S` (the returned solve state)

`03-engine.js:358` — `{ dom, fixed, blocked, trace, problems, applicable, assign, ruleState, backprop }`

| Field | Shape | Meaning |
|---|---|---|
| `dom` | `Record<attr, Set<value>>` | **the answer** — the values still possible for every column. `size===1` ⇒ decided. |
| `fixed` | `Record<attr, true>` | the user *chose* this, vs the solver deduced it |
| `blocked` | `Record<attr, Record<String(value), {rule, ruleName, note}>>` | **why each removed value is gone** — the "ask why" index |
| `trace` | `Array<{rule, ruleName, attr, removed[]}>` | append-only log of every removal, in order |
| `problems` | `Array<{kind:'violation'\|'contradiction', rule, ruleName, attr, msg, detail, counter, note, fix}>` | conflicts, in prose |
| `applicable` | `Record<attr, boolean>` | which columns are even relevant now |

Everything the UI does — greying, reasons, progress, conflict notes, the change
summary, the "N rules shaped this build" roll-up — is read from this one object.
**No component computes anything about rules itself.** That is the architectural
lesson, independent of the algorithm.

### 3.3 How a rule narrows a domain

Every narrowing funnels through one function (`03-engine.js:160-187`):

```js
function prune(attr, keepFn, rule, note){
  const removed = [...dom[attr]].filter(v => !keepFn(v));
  if (!removed.length) return false;              // no change
  if (removed.length === d.size){ /* would empty the domain → problems.push */ }
  removed.forEach(v => d.delete(v));
  record(attr, removed, rule, note);             // → blocked + trace
  return true;                                   // "something changed"
}
```

`record` is what makes the whole UX possible: **attribution is written at the
moment of removal, by the code doing the removing.** Nothing is reconstructed
afterwards. `note` is a short phrase ("antecedent holds", "mutually exclusive",
"no surviving row of the propeller fitment matrix permits it") that gets stored
per blocked value.

Three-valued predicate evaluation makes this sound: `evalPred` returns
`"T"` / `"F"` / `"M"` (maybe) by counting how many values in a domain satisfy
the test (`03-engine.js:119-134`). Nothing fires on a "maybe".

### 3.4 Bi-directionality and the contrapositive

For `implies` (`03-engine.js:263-266`), two lines:

```js
if (evalPred(rule.if,   dom) === "T") enforce(rule.then,          rule, "antecedent holds");
if (evalPred(rule.then, dom) === "F") enforce(negate(rule.if),    rule, "consequent is impossible");
```

The second line is the entire "constraints run both ways" demo. `negate()`
applies De Morgan over the predicate tree and flips leaf ops via
`NEG = { "==":"!=", ">=":"<", ... }`. `isset` negates to `{__never:true}` —
correctly refusing to invert "has been chosen".

Rule-level `when` guards get the same treatment via `satisfiable(rule)`: if the
guard is *maybe* true but the guarded constraint provably cannot hold, the guard
itself is negated (`03-engine.js:330-338`). That is how "trailer GVWR must carry
the rig" reaches back and rules out engines.

An `any` group only prunes when every surviving alternative tests the *same*
column, in which case it keeps the union (`03-engine.js:225-232`). Honest and
correct — a general disjunction is not arc-consistent without search, and they
declined to fake it.

**`backprop` (off by default)** — `backPropagate` (`:192-209`) inverts a
*calculation* by brute force: enumerate the cartesian product of the inputs
(capped at 4,000 tuples), keep every input value that produced an acceptable
output, prune the rest. It is a deliberate teaching toggle ("the clearest way to
see what that design choice costs you"), not a default.

### 3.5 Conflicts

Detected in exactly one place — `prune` about to empty a domain — and
distinguished by whether the user chose the value:

- `fixed[attr]` ⇒ **violation**: *"Propeller material = Aluminium is rejected by
  EC-08."* Carries `fix: attr` so the UI can offer **Undo propeller material**.
- otherwise ⇒ **contradiction**: *"EC-08 leaves no valid value for Propeller
  material."*

Both carry `detail` naming the *other* rule that had narrowed the set (`counter`,
found by walking `trace` backwards for the last touch on that attribute) — so a
conflict names both culprits, not one. The configurator prints these with the
rule-id prefixes stripped, plus the `human` clause, plus two buttons
(`12-configure.js:49-56`).

### 3.6 Verdict: **PORT the algorithm as a new sibling module. Do not extend `src/lib/rules/`.**

Our `src/lib/rules/` solves a **different problem**, and the two must not be
merged:

| | `src/lib/rules/` (ours) | `03-engine.js` (theirs) |
|---|---|---|
| Input | *all rows* of *all tables* | *one* partial assignment |
| Unit of work | a `(source, match)` row pair | a value in a field's domain |
| Direction | forward through a node graph | fixpoint, both directions |
| Output | `views`, `effects`, `traces`, `nodeHits` (`src/lib/rules/types.ts`) | `dom`, `blocked`, `problems` |
| Question answered | "which motors fit **every** boat?" | "given these three answers, what can this one boat still be?" |
| Mutates | nothing (`PendingEffect` describes writes) | nothing |

Ours is a batch catalogue/join builder. Theirs is an interactive configuration
solver. Extending ours into theirs would mean giving `RunPair` a domain, which
is a rewrite wearing a refactor's clothes.

**Recommendation:** add `src/lib/configure/` — `solve(assign, constraints, ctx)`
returning our own typed `SolveState`. Port the algorithm structure directly
(`prune` / `record` / `enforce` / `negate` / `evalPred` / fixpoint) because it is
small, correct, dependency-free and *already has 66 tests we can transliterate*.
Skip on day one: `backprop` (their own default is off) and the cartesian
`weightRange` aggregate. Keep `src/lib/rules/` exactly as it is — it remains the
right engine for fitment joins, and `QUOTE_FINDINGS.md` §2.4 ("curated beats
computed, with the computed one as a safety net") wants both tiers anyway.

**The mapping is unusually clean:** their `kind:"table"` tuple whitelist *is* our
curated join table. A join table's rows, read as tuples over its reference
columns, are a table constraint. So the solver needs one constraint kind we
already store as data, and `matrixHTML` (`12-configure.js:160-169`) becomes a
view of a join table with dead rows struck through.

---

## 4. "ASK WHY" — adoption plan

The most user-friendly idea in the mockup. Four cooperating parts.

### 4.1 The reason is written when the value is removed

`blocked[attr][String(value)] = { rule, ruleName, note }` — set inside `record`,
called only from `prune` (`03-engine.js:154-158`). A blocked value therefore
*always* knows its rule. Nothing is inferred later, nothing can be missing.
Note `String(v)` — the key is stringified so `true`/`4`/`"Salt"` all index.

### 4.2 A blocked option renders its own reason, in place

```js
const b = S.blocked[c.logical][String(v)];
const r = b ? RULEBY[b.rule] : null;
h += `<button class="card off" onclick="openRule('${b?b.rule:""}','${c.logical}',${jsArg(v)})">
  <span class="cico">${ico("lock")}</span>
  <span class="cbody"><b>${esc(fmt(c.logical,v))}</b>
  <span class="reason">${r?esc(cap1(r.human)):"Not available with your current choices"}</span>
  </span></button>`;                                       // 12-configure.js:106-113
```

Three decisions to copy exactly:

1. **The option is never hidden.** It stays in place, dashed, 50% opacity, label
   struck through in red (`14-style.css:126-130`), so the user sees the shape of
   what is possible. `cursor:help`. This matches `QUOTE_FINDINGS.md` §2.5
   ("curation fails open").
2. **The reason is a short lower-case clause, sentence-capitalised at the point
   of use** (`cap1`). `HUMAN` in `02b-copy.js:131-163` is a flat map of
   rule-id → clause, written to read after "because…":
   *"an aluminium propeller corrodes away in salt water"*,
   *"a tiller cannot safely handle more than 25 horsepower"*,
   *"radar overlay is unreadable on a screen under 12 inches"*.
   Not the rule name. Not the expression. **A reason.**
3. **Fallback is graceful**: "Not available with your current choices".

### 4.3 The card is a link to the rule

`openRule(id, attr, val)` sets `APP.lastWhy` and slides in a 430px right-hand
sheet (`12-configure.js:130-157`) containing, in order:

1. **The lead sentence, built from the click context:**
   `` `${fmt(attr,val)} isn't available because ${r.human}.` `` — e.g.
   *"Tiller isn't available because a tiller cannot safely handle more than 25
   horsepower."*
2. **The rule itself as its English sentence** — `sentenceHTML(r, true)` in a
   framed `.plain` block. The same renderer as the editor. The user sees, in the
   configurator, the exact object they can edit in the model.
3. `r.why` — the long rationale (2–3 sentences of real engineering).
4. `r.id` + `r.src` in mono — provenance ("33 CFR 183.53", "You, just now").
5. The live matrix, for table constraints — *"**7** of 22 approved combinations
   still fit"* with dead rows struck through.
6. **Two actions:** `Turn this rule off` (re-solves instantly; the greyed card
   comes back) and `Edit in the model builder` — which sets
   `APP.mode='model'; APP.modelTab='rules'; APP.editRule=r.id` and lands the
   user on that rule, open for editing.

`Escape` closes the sheet (`15-render.js:41`).

### 4.4 The same door from three other places

- Calculated rows carry a mono rule-id chip linking to the calculation
  (`12-configure.js:81`) — three hops of derivation stay traceable.
- Conflict notes carry **See the rule** (`:55`).
- The summary ends with *"N rules shaped this build"* — a grid of chips, one per
  fired rule, each opening the sheet (`12-configure.js:210-214`).

### 4.5 Our adoption plan

**Our own docs already specify this data shape — twice.** `model.ts:675-679`:
*"How a single related row was decided, so the page can always answer 'why is
this here?' / 'why is this missing?'"* with `PairOrigin = 'rule'|'added'|'removed'`.
And `CONFIG_FINDINGS.md` §3 / §4.1, from production code that works: the
classifier returns **`via: 'rule' | 'heuristic' | 'none'` plus the matched rule,
"so 'why did I get this answer' is always answerable"**, the relevance matcher
returns **`{visible, rule}`** so the UI can say *which* rule hid something, and
each rule ships a named `rationale` — *"Tube covers sized in metres only fit
hulls of that length; ±0.4 m absorbs code-vs-LOA rounding."* That `rationale` is
the mockup's `HUMAN` clause under another name. `CONFIG_FINDINGS.md` ends that
section with *"Our reviewer hints should work exactly like this."*

So "ask why" is not a new idea to evaluate — it is a promise made in three of
our documents, and the mockup shows what it looks like when delivered.

Two related doctrines already written down that this must respect:
`CONFIG_FINDINGS.md` §4.4 — *"Rules fail open, with a visible escape hatch;
missing context never hides anything"* (so a field with no constraint data shows
everything, never nothing), and `QUOTE_FINDINGS.md` §2.6 — never render an
unresolved value as a number; say why in an amber pill.

1. `SolveState.blocked: Record<fieldId, Record<string, {constraintId, note}>>`,
   written at removal time. Non-negotiable — never reconstruct a reason.
2. Add `ConstraintDef.because` (their `human`): a short lower-case clause
   authored beside the rule. Auto-generate a serviceable one from the sentence
   when the author leaves it blank ("…because water is salt"), and let them
   improve it. **This field is the product.** A rule with a good `because` is
   worth ten with good names.
3. `<WhyPanel>` — our existing right rail, not a new floating sheet: lead
   sentence, the constraint's own `<Sentence readOnly>`, `why`, provenance,
   `Turn this off` + `Edit this rule`.
4. Unavailable options stay visible, struck through, reason inline, red pencil
   (`--red` carmine) — which is exactly what our art direction reserves carmine
   for ("the reviewer's pencil").

---

## 5. THE ENTITIES HIGH-LEVEL VIEW

What the user singled out as "the entities like high level view".
`entitiesPane()`, `13-model.js:258-330`.

### 5.1 The map

A single **466×310 SVG**, hand-positioned:

```js
const EPOS = { mrn_hull:[14,10], mrn_engine:[176,10], mrn_propeller:[338,10],
  mrn_enginecompat:[95,84], mrn_boat:[176,164], mrn_trailer:[14,164],
  mrn_helm:[338,164], mrn_electronics:[338,232], mrn_boatpart:[176,258] };
```

Nine boxes, 112×38, `rx=7`. Each shows **the table name** and **a live column
count** ("7 columns"). Relationships are single quadratic Béziers, colour-coded
by semantics with a legend beneath: teal solid = **parental** ("children are
deleted with the parent"), grey = referential, red dashed = many-to-many
("unused: it can't carry a quantity"). The configuration root and the junction
table get their own fills (`.eb.root`, `.eb.jn`).

**Why it works, and it is worth being blunt about this:** it is *small*,
*static*, *non-interactive except for selection*, and **hand-laid-out**. It is a
legend to the model, not a workspace. Ours is a pannable, zoomable React Flow
canvas — the user gets lost in it. Nine boxes you can see at once beat nine
boxes you have to navigate to.

Clicking a box sets `APP.selTable` and the panel below fills in.

### 5.2 The table card

Header: display name, `mrn_hull` in mono, ownership badge, junction badge.
Then the table's one-line `desc` — written in business language, not schema
language: *"The moulded platform. Owns the physical dimensions that drive the
USCG capacity rating."*

Then one `.ccard` per column:

- name in an inline `<input>` (rename in place; **disabled for calculated
  columns**);
- logical name in dim mono;
- a `calculated` badge where applicable;
- **a live domain counter: `"2 of 4 left"`** — `d.size` of the attribute type's
  total. The design-time view shows the run-time consequence of the model. This
  is the single best small idea in the pane.
- **Required level** as a 3-option select with a plain-English gloss —
  "enforced by the app, not the platform" / "optional";
- **the value list as removable chips**, with values the solver has ruled out
  shown struck through at 40% (`.vtag.gone`), plus an inline
  `add option…` input committing on Enter (`13-model.js:310-313`).

So *the option list, the current domain, and the editor are the same widget.*

### 5.3 "Add a column" — and how it reaches the configurator

```
┌ + Add a column ────────────────────────────────────────────────────────┐
│ It will appear in the configurator immediately. Nothing is recompiled — │
│ the interface is generated from this metadata.                          │
│ [Column name, e.g. Bimini top] [Options, comma separated: None, Fold…] │
│ [group ▾] [Add]                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

Two text inputs, one group select, one button (`13-model.js:318-328`). The group
select is populated from `STEPS.filter(s=>s.group)` — **you choose which step of
the configurator the column appears in**, and nothing else.

`addColumn()` (`13-model.js:155-171`):
1. splits `values` on commas, requires a name and ≥2 options;
2. derives a logical name and de-duplicates it with a numeric suffix;
3. **creates a new attribute type** `AT_<Name>` holding the values;
4. pushes a `column` row onto `MODEL.columns` and into the `COLS` index;
5. `resolve(); render();`

**Why it appears with no code change:** the configurator never mentions a column
by name. `stepCols(i)` filters `MODEL.columns` by `group` and applicability
(`10-app.js:45-48`); `fieldHTML` reads `MODEL.attributeTypes[c.at].values` and
the solver's `dom`. The solver builds `dom` by iterating `MODEL.columns`
(`03-engine.js:142-145`). Add a metadata row, and every layer picks it up on the
next render. `renderModelMode`'s side note states the principle: *"Nine tables,
and not one of them is compiled into this interface."*

**We are already built this way** — `visibleFields(entity)`, `FieldDef.options`,
`ColumnSection`, and `AddColumnPopover.tsx`/`useColumnCommands.ts` exist. What we
lack is not the mechanism but **the sentence that tells the user it happened**,
and the live domain counter that proves it.

### 5.4 Our adoption plan

1. A **Model overview** surface: a compact, non-zooming SVG map of tables
   drawn as **spec plates** with a live column count and a live row count,
   edges labelled in words ("a boat has many variants"), one legend line.
   Small enough to see at once. This is our existing ERD, deliberately shrunk —
   `CONFIGURATOR_SPEC.md` §5 already put the pannable canvas off the default path.
2. Below it, the selected table's card: description in business language, then
   per-column rows carrying name, type tag, required level, options-as-chips,
   and — during a configure session — **`n of m left`**.
3. Keep our existing `+ COLUMN` flow; add the reassurance copy and, once a
   configurator exists, the section/step picker.

---

## 6. STRUCTURAL IDEAS WORTH TAKING

Ideas independent of the mockup's look. **Our art direction is unchanged.**

### 6.1 `describeChange` — say what the last click just did

`10-app.js:155-173`, the sweetest 18 lines in the mockup. After every choice,
diff the previous `dom` against the new one and narrate it:

```
"Settled prop material to Stainless steel, and ruled out Aluminium and
 3-blade for blades, plus 2 more."
```

The phrasing rules, precisely:

1. **Skip** the column the user just touched, non-`at` columns, `derived`
   columns, and anything not `applicable`. (Never report the obvious, never
   report the invisible.)
2. For each remaining column, compute `gone = before \ after`; skip if empty.
3. `after.size === 1 && before.size > 1` → **settled** bucket:
   `` `${display.toLowerCase()} to ${fmt(k, value)}` ``
4. otherwise → **ruled out** bucket: at most **two** removed values joined with
   `" and "`, then `` ` for ${display.toLowerCase()}` ``
5. Prefix each bucket ("settled …", "ruled out …"), cap each at **two** items,
   join the buckets with `", and "`, `cap1` the result, and count the remainder
   as `` `, plus ${extra} more.` ``
6. **Return `""` when nothing changed** — no note is rendered at all. Silence
   when there is nothing to say is why the note keeps its authority.

Column display names are lower-cased mid-sentence; values keep their formatting
(`fmt` supplies units: "20″", "Twin", "5,200 lb"). It is rendered once, as a
dismissable info note at the top of the step (`12-configure.js:58-59`), and
cleared on the next choice.

**Take this whole function.** It is the thing that makes a propagating engine
feel helpful rather than spooky, and it is ~20 lines against our existing
`formatCell` + a domain diff.

### 6.2 One solve, one render, everything derived

`setVal → resolve() → render()` (`10-app.js:27-42`). Every panel is a pure
function of `S`. No component holds rule state. Even the transient highlight is
derived: `setVal` diffs domain sizes before/after and builds `APP.pulse`, a
`Set` of *drawing part ids*, cleared by a 1,300 ms timeout. In React this is
`useMemo(() => solve(assign, constraints), [assign, constraints])` — which is
where we should land regardless of anything else here.

### 6.3 Progress computed from the model, never stored

`10-app.js:45-62`. Nothing about progress is persisted; it is all derived:

| Function | Definition |
|---|---|
| `stepCols(i)` | columns whose `group` matches the step **and** `S.applicable[c]` |
| `stepDone(i)` | every `ApplicationRequired`, non-derived column in the step has `dom.size === 1` — **vacuously true when nothing is required** |
| `stepOpen(i)` | count of required columns not yet resolved → *"3 to choose"* |
| `stepTouched(i)` | any column in the step has an explicit `APP.assign` entry |
| `allDone()` | every step but the last is `stepDone` **and** `S.problems.length === 0` |
| `requiredIn(i)` | how many required columns the step has at all |

**"Required" means `req === "ApplicationRequired"`** — a per-column metadata
value, not a hardcoded list. And the tick mark is careful:
`done = stepDone(i) && (stepTouched(i) || (stepOpen(i)===0 && requiredIn(i)>0))`
(`12-configure.js:19`) — an all-optional step is not ticked until the user has
actually made a choice in it. The rail label degrades honestly:
`"3 to choose"` → `"complete"` → `"optional"`, and the final Summary step reads
`"ready"` / `"not yet"`.

Note `dom.size === 1` counts as done **whether the user chose it or the solver
deduced it**. A field decided by a rule shows a green **DECIDED FOR YOU** pill
(`auto = d.size===1 && chosen===undefined`, `12-configure.js:87-91`) and a dashed
green border. That pill is excellent and free.

Not to be built yet — `PLATFORM_VISION.md` puts the flow designer in Part 3 —
but this is the model to build then, and it costs nothing to make `ConstraintDef`
and `FieldDef` compatible with it now.

### 6.4 Three separated layers of metadata

`01-model.js` (structure) · `02-data.js` (catalogue rows + constraints) ·
`02b-copy.js` (**presentation only** — one-line option descriptions, price
deltas, icon names, and the `HUMAN` reason clauses). The header states the rule:
*"Kept separate from the constraint model on purpose — the solver never reads
any of this."* Our equivalent discipline: keep `because`/`why`/help text on the
`ConstraintDef` and `FieldDef` as authored copy, and keep `src/lib/configure/`
blind to all of it.

### 6.5 Option cards, not dropdowns, for the end user

`12-configure.js:96-114`. Each value is a card: icon tile, bold label, a
one-line human description, a price delta (`+$780`, or "included" for zero), and
a tick when chosen. **The description is what makes the choice make sense** —
*"Five times more durable, thinner blades, more speed. Essential in salt."*
Design-time gets dense sentence rows; run-time gets generous cards. Same data.

### 6.6 A live spec bar of derived numbers

`stageBarHTML` (`12-configure.js:30-43`) — pill chips of the numbers that matter
right now (Length, Power, Legal max, Rig weight, Parts count), each appearing
only when it resolves, ranges shown as ranges ("3,412–3,908 lb"). Our title
block wants exactly this.

### 6.7 Preset scenarios in the header

Four named presets (`Flats skiff`, `Bay boat`, `Offshore twin`, `Diesel inboard`)
each a flat `Record<attr, value>` that loads a complete configuration and jumps
to the summary (`10-app.js:73-111`), plus **Start over**. Anyone can see the
system work in one click, before understanding it. Cheap; take it.

### 6.8 A calculated value shows its working while it is still a range

`derivedHTML` (`12-configure.js:69-82`): a calculated column renders as one
quiet row. Decided ⇒ green mono value. Still a range ⇒ amber, dashed border,
`"250 – 420"` plus the word *"narrowing"*. Plus a chip linking to the
calculation. Formula columns *narrowing in public* is a beautiful idea and we
already have `src/lib/formula`.

---

## 7. WHAT TO REJECT, AND WHY

### 7.1 The entire rendering approach

`innerHTML` string concatenation on every state change, with global mutable
`APP`, `MODEL`, `RULES`, `RULEBY`, `COLS`, `APP.S`, and inline `onclick="…"`
handlers calling globals. It is right for a 2,400-line single-file demo and
wrong for us. Specific consequences we must not import:

- **`jsArg = v => esc(JSON.stringify(v))`** (`10-app.js:21`) — hand-rolled
  escaping so JSON survives an HTML attribute. Every value round-trips through
  a string and back through `coerce()`. In React values stay typed. Delete the
  concept.
- **`at(rule, path)`** (`13-model.js:10-14`) — string paths like
  `"then.any.1"` walked with `split(".")`, untyped, unchecked. Our token model
  must carry a **typed reference** (clause id + side), not a path string.
- **Direct mutation of the rule object** — `setRuleAttr` writes `p.attr = v`
  straight into `RULEBY[rid]` and calls `render()`. Ours goes through a store
  action so undo, autosave and export keep working.
- `$("#stage").innerHTML = …` from a `setTimeout` to clear the pulse
  (`10-app.js:41`) — a second, hidden render path. React state + a timer.

### 7.2 `mrn_` naming and the D365/Dataverse framing

Every column is `mrn_propmaterial`; tables carry `ownership:"UserOwned"`,
`cascade:{Delete:"Restrict"}`, `altKey`, `navOne`/`navMany`. The rules pane
groups by `layer: "Expression constraint" | "Table constraint" | "Calculation"`,
each rule carries an `oml` string (`Implies[ Water == "Salt", … ]`) regenerated
by `omlOf()`, and the side notes explain Dataverse's one-parental-leg rule.

**Reject all of it.** It is a Dynamics 365 pitch artefact. Our ids are opaque
(`FieldDef.id`) and our labels are whatever the user typed —
`CONFIGURATOR_SPEC.md` §2 is titled "Tables, not entities" for this reason.
A publisher prefix, an ownership model, cascade presets and an OML echo would
each be a term the user has to learn. The `layer` grouping *is* worth keeping as
a user-facing idea, in our own words: **"Rules"** / **"Approved combinations"**
/ **"Calculations"**.

### 7.3 Everything marine

`09-boat.js` is 230 lines of boat: `sheerT`, `keelT`, chine, gelcoat colour map,
per-family engine glyphs, radar arch, trolling motor, prop blade geometry, and a
water gradient. `uscgMaxHp()` hardcodes 33 CFR 183.53 in the *engine*
(`03-engine.js:32-47`), and `UNITS`/`PRICE`/`WEIGHT`/`fill()` are hardcoded maps
keyed by `mrn_*` columns.

`ART_DIRECTION.md` bans exactly this: *"Nautical: hull lines, waterlines… Any
single-industry metaphor in copy, icon, texture or motion."* A motorcycle dealer
must never feel they are using a boat tool.

**But do not throw away the idea.** ART_DIRECTION also says *"Industry lives in
exactly one place: the industry symbol, and the table-kind symbols inside a
chosen industry. Those are allowed — indeed required — to be specific and
beautiful."* The generalisable core of `09-boat.js` is this:

- an **assembly drawing** composed of named parts;
- each part drawn only when its field resolves, and drawn as a **ghost**
  (`opacity:.33`) while undecided, so *"the drawing is never empty and never
  lies about what is decided"*;
- `PART_OF: Record<fieldId, partId>` (`09-boat.js:221-230`) — a plain metadata
  map from field to drawn part, which is what drives the highlight;
- a caption assembled from resolved values, falling back to *"nothing chosen yet
  — the outline is a placeholder"*.

That structure is industry-neutral. The correct HelmLogic form is a **live spec
plate**: a technical assembly drawn per `TableKind` at 1.25px hairline in
`currentColor`, ghosted where undecided, with `PART_OF` as data on the field.
Marine ships first; a motorcycle plate slots in beside it. Never a hero boat,
never water, never a gelcoat colour picker driving a fill.

### 7.4 Two mechanisms to take only with care

- **`when` on a column** (`applicable`) is genuinely good — "Shaft length"
  vanishes for an inboard. Note the deliberate two-mode design
  (`03-engine.js:348-356`): `strict` gates appear only once the gate is
  *definitely* true (for toggles: no thrust field until "Trolling motor = Yes"),
  while loose gates stay visible while the gate is still open **"so the user can
  answer the questions in any order they like"**. Take both modes and that
  reasoning. But a field that appears and disappears is a jarring UI — pair it
  with our motion rules (settle, don't flicker).
- **`backprop`** — leave it off, and probably do not ship the toggle at all. It
  is a teaching device with a 4,000-tuple brute-force cost.

### 7.5 Small things to skip

`alert()` for validation (`13-model.js:132, 159`); the `threshold` slider
metadata on EC-05 that nothing renders; `.fhelp{display:none}` (a `?` button
styled out of existence, with `.fhelp-t` printing the text unconditionally
instead) — dead code left behind; the 40-iteration magic cap without a
diagnostic if it is ever hit.

### 7.6 Styling: adopt nothing

For the record, so no one is tempted. Theirs: dark slate (`--bg:#0b1014`,
five `--s*` surfaces), **teal** accent `#4fd0d4`, four semantic inks
(`--ok #79d494`, `--wn #f0b463`, `--er #f0837b`, `--vi #b99ae8`), system sans +
system mono, one radius `--r:10px`, one shadow, ~14 font sizes from 9.5px to
21px, transitions pinned at `.14s`, and `@keyframes glow` (**the class is
`.pulse`, the animation is `glow`** — 1.25s `drop-shadow` + `brightness(1.16)`,
`14-style.css:69-70`).

Ours is **THE DRAWING OFFICE** (`src/styles/tokens.css`): paper `--paper #f2f6fb`
on white panels, ink `--ink #12283f`, the pen `--blue #1d55c4`, one accent
`--red #c2402f` (carmine, "the reviewer's pencil"), the blueprint field
`--canvas-bg #123252` with `--canvas-ink #d9e6f7` and hairlines at
`rgba(217,230,247,0.22)`; `--radius: 3px` (not 10px); a fixed `--sp-*` scale of
4/8/12/16/24/32; Instrument Serif ≥22px for display moments only, Archivo for
chrome, **IBM Plex Mono for every number**; and spring motion via `motion` under
the rule *"nothing moves while the user is working."*

Their teal-on-slate, 10px-radius, 14-size look would fight all of it. The `glow`
pulse violates our motion rule 2 directly — if we want that feedback, it is a
**hairline that thickens once and settles** on the spec plate, never a glow
behind live data entry. Our token roles already have inks to use instead:
`--type-select` violet for a value token, `--type-number` blue for a field
token, `--ink-soft` for operators, and carmine reserved for the blocked/removed
state.

Take from their CSS exactly four **structural** measurements, no colours:
`line-height: 2.35` on a token sentence (the single most important number here);
the `box-shadow: inset 0 -1.5px 0 currentColor` underline meaning "editable";
distinct backgrounds for three grammatical roles; `min-height: 64px` for a
two-line option card. Everything else stays ours.

Housekeeping spotted in passing: `src/styles/tokens.css` line 3 still reads
`Art direction: THE CHART ROOM` with comments about "white nautical panels" and
"nautical blue (the pen)" — stale header text for a name `ART_DIRECTION.md` now
bans. Values are right; the labels need a pass.

---

## 8. WHAT TO BUILD FIRST — ranked

Each item is shippable on its own and visibly better than what it replaces.

**1. `<Sentence>` — the editable token renderer, built on `PlateChunk`.**
Add `edit?` + `chips?` to `PlateChunk` and a `constraintSpec()` beside
`plateSpec()`; re-implement `describeGroup` as `chunks.map(c=>c.text).join(' ')`
so one function still owns the words. Build `TokenSelect` (native `<select>` at
`opacity:0` over its label, `inset 0 -1.5px 0 currentColor` underline) and use
`<Sentence>` for the read-only plates too. *Nothing else on this list works
without it,* and because `plateSpec` already exists this is the smallest item
here, not the largest.

**2. `ConstraintDef` + the sentence rules list — and mount it.**
Additive type per §2.7.1. A list of sentence cards: on/off switch (not delete),
collapsed = read-only sentence, expanded = live tokens, `why` + source beneath.
Reachable from the left panel on the default path — per §0(c) this is the item
that matters most, because a surface nobody can reach is the exact failure
`QUOTE_FINDINGS.md` §3.1 tells us to avoid. The node canvas stays in the
codebase, off the default path, exactly as `CONFIGURATOR_SPEC.md` §5 says.

**3. "Write a new rule" — the sentence builder.**
One live sentence, six selects, one **Add rule** button, the auto-generated
name/`because`/source from `addRule()`, and the caption *"It reads as a
sentence, and it takes effect the moment you add it."* This is the moment the
user's complaint goes away.

**4. `src/lib/configure/solve.ts` — the ported solver.**
`solve(assign, constraints, ctx) → { dom, fixed, blocked, trace, problems, applicable }`.
Port `prune`/`record`/`enforce`/`negate`/`evalPred` + the fixpoint loop. Start
with `select` and `boolean` fields only, and `implies` + `excludes` + `table`
(a join table read as tuples). Skip `backprop`. Transliterate their 66 tests —
they are the specification. Inherit the contract our own engine already keeps
(`src/lib/rules/`): pure, store-free, **bounded** (their 40-iteration cap becomes
an explicit budget that *warns naming the constraint* rather than silently
stopping) and **never throws for any input**.

**5. Live state on every rule card: ACTIVE NOW / CONFLICT / OFF / EDITED.**
Reads `trace` and `problems` from (4). This is what kills the
"a compatibility matrix nothing reads" failure recorded in `QUOTE_FINDINGS.md`.

**6. "Ask why" — blocked options that explain themselves, and the why panel.**
`blocked` written at removal time; unavailable options stay visible, struck
through in carmine with their `because` clause inline; clicking opens the right
rail with the lead sentence, the rule's own sentence, provenance, **Turn this
off** and **Edit this rule**.

**7. `describeChange` — the plain-English change note.**
~20 lines against `formatCell` and a domain diff, with the phrasing rules in
§6.1 followed exactly, including returning `""` when there is nothing to say.

**8. The model overview map + the table card with live domain counts.**
Small static SVG of spec plates with live column/row counts and worded edges;
selected table below with options-as-chips and `n of m left`. Shrink the ERD;
do not extend it.

**9. Later, with Part 3: the step flow and the live spec plate.**
Derived progress per §6.3 (`ApplicationRequired`, `dom.size===1`, `applicable`),
option cards with descriptions and price deltas, the derived spec bar, preset
scenarios, and a per-`TableKind` hairline assembly plate with ghosted undecided
parts driven by a `PART_OF` map. Design for it now; build it when Part 3 opens.

### One thing already built that this plan should reach for

`src/features/views/` contains `RuleOffer.tsx` and `suggest.ts` — a rule proposed
as **one English sentence with three buttons** (*"Show motors where HP is between
this boat's Min HP and Max HP." · Use this / Show all motors / Pick a different
rule"*), with a four-tier suggestion heuristic and a `BOOKKEEPING` stop-list so a
bad guess is never offered. That is the same sentence grammar as items 1–3,
already written, and `VIEW_SPEC.md`'s *"the rule proposes, the human disposes"*
is the same philosophy as the mockup's *"turn this rule off"*. Whatever
`<Sentence>` becomes, `RuleOffer` should render through it — one grammar for
proposing a rule, reading a rule, and explaining why an option is gone.
