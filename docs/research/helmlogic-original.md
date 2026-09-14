# The original HelmLogic, read end to end

**What this is.** `github.com/AsafAlazraki/HelmLogic` went public, was cloned, and
three agents read it strictly read-only: the PandaDoc-style document editor, a
full gap inventory against this tree, and every interaction pattern worth
taking. This is the consolidated finding and the migration order.

**What it is.** Next.js App Router + Firebase (Firestore / Auth / Storage) at
**v1.33.1** after 33 releases. ~96,000 lines of TS/TSX under `src/`, 69 route
files, ~155 feature components over a 40-file shadcn set. It is a real product
that a real dealership has been using, and that is the thing to keep in mind
while reading everything below: where it is crude, it is crude in ways that
survived contact with a salesperson.

**The single most valuable artefact in that repo is not code.** Almost every
good interaction in it has a comment above it naming the human who complained
and the bug that caused it:

```
// v1.33 (Bill: "Drag to reorder not working, each section is locked")
// v1.33 (Mark: "selected Medium, can't go back to Simple — it lets me
//        select all three together and I can't undo")
// v1.33 (Mark: "an erroneous price shows immediately")
// FFR-32 (Asaf field bug): consoles like the GT include their seating
```

That list of named complaints is the regression suite for this app's interface.
It is worth reading before designing any screen that has a counterpart there.

---

## 1 · The document editor — what it actually is

Shipped as **v1.7 "Customer-PDF authoring"**, branded **Template Studio →
Company Templates → Document Templates**. It is **not** a free-form block canvas
like PandaDoc. It is a **fixed-slot document composer**: seven named narrative
sections, each authored in TipTap, arranged around four immovable system
sections, with a live side-by-side PDF preview, per-brand and per-quote
overrides, version history, and a `@react-pdf/renderer` output pipeline.

The eleven sections in render order: Cover Page *(locked)* · Salesperson
Message · Why Choose Us · Vessel Configuration *(locked)* · Brand & Model Story
· After-Sales Confidence · Finance & Insurance · Pricing & Investment *(locked)*
· Value Summary · Terms & Conditions · Signatures *(locked)*.

### The three things to copy closest

**The four-layer override cascade.** Per-quote override → brand override → org
default → (T&Cs only) the org's legacy field → a hardcoded default. Evaluated
per block at render time, and **short-circuited when `isLockedForQuotes` is
true**, so an admin lock beats a stale salesperson override. It solves a real
governance problem — legal wants T&Cs untouchable, marketing wants brand-specific
copy, a salesperson wants one personal line — without forking the document. ~400
lines. This is the best idea in the whole repo.

**The preview renders the identical component as production output.** Both the
authoring preview and `renderQuotePdf` instantiate the same
`ProposalPDFDocument`. That one decision eliminates the entire class of "looked
right in the editor, wrong in the PDF" bug. Non-negotiable if we build an
editor.

**The image pipeline**, which is four scars in a trench coat: every URL rewritten
through `images.weserv.nl` for downscale and JPEG normalisation, with a
per-host skip list for Yamaha which 404s the proxy; everything pre-fetched to
base64 data URLs before render (a 21 MB Highfield cover became ~100 KB); a
same-origin server proxy with a host allow-list and a 10 MB cap and a spoofed
UA for hotlink-protected CDNs; and HTML-entity decoding of `src`, because
Firebase Storage URLs arrive as `?alt=media&amp;token=…`. **We will hit the
identical CORS wall the day we render a PDF.**

Also worth taking: version history on every save with **restore-as-a-new-version**
(non-destructive, compare-before-restore); fractional-index ordering
(`(prev.order + next.order) / 2`, one field write per drop); and explicit save
rather than autosave, with the reason recorded — TipTap's `onUpdate` fires per
keystroke.

### What is broken in it, and must not be carried

- **Drag-to-reorder does not reach the customer PDF.** `pdfSections` is threaded
  into the authoring preview and `renderQuotePdf` never passes it, so every real
  path — Download, Preview, Send, Finalize, SharePoint — falls back to
  `DEFAULT_SECTIONS`. A user drags a section, watches the preview move it,
  downloads the PDF, and gets the old order. One line, shipping broken.
- **Concurrent editing destroys work.** A live snapshot fires an effect that
  calls `setEditMode(false)` and resets the draft, so a colleague saving the same
  block silently discards your in-progress edit and kicks you out.
- **The block set is a closed enum of seven.** You cannot add a section, cannot
  have two, cannot delete one. For a tool positioned as document authoring that
  is the biggest structural limit.
- **HTML→PDF is a regex tokenizer**, not a parser. Link hrefs are dropped;
  tables, blockquotes, nested lists and anything between recognised block tags
  vanish silently. **Store ProseMirror JSON, not HTML** — the converter becomes
  a tree walk and links and tables come free.
- **Style is applied inconsistently**: the salesperson-message and T&Cs branches
  return before the line that reads per-block style, so those two ignore every
  presentation setting.
- **Prices are frozen, prose is live.** Content blocks are re-resolved from
  Firestore on every render, so re-downloading a year-old quote prints today's
  T&Cs. Only the PDF uploaded at send time is a frozen copy.
- Security: `storage.rules` is `allow read, write` on `{allPaths=**}` with no
  auth check; Firestore is `isSignedIn()` everywhere with admin gating delegated
  to the UI, which the rules file says out loud. Migrate the model, never the
  enforcement.

---

## 2 · The gap — ranked by what a dealer would miss

### 1. A real customer-facing document
Ours is a print stylesheet; theirs is a 1,453-line `@react-pdf` document with
SVG gradient work on a full-bleed cover, org branding, dealer-authored prose,
section ordering, and per-brand and per-salesperson variation. **This is the
artefact the business sells from.** Roughly 3,500 lines there.

*Status: half-answered.* The quotation is now a real sheet — paper on screen,
one A4 page, brass rules, the boat as the largest thing on it. What is still
missing is the authored prose: no cover letter, no "why choose us", no T&Cs, no
per-brand copy. That is the content-block system above, and it is the next
large piece of work.

### 2. Stock — "is one on the floor?"
Eight screens, ~3,900 lines, over one flat `inventory/{id}` collection:
stockNumber, status *(Pending · On Order · In Stock · In Stock - Sold · On Order
- Sold)*, location, soldBy, **serialNumber**, material *(Hypalon vs PVC — badged
across the app)*, dateIntoStock, photos, and — when it came from a finalized
quote — the whole frozen `quotePayload`, so a hull on the floor carries its own
spec sheet. Plus **hold requests**: a sub-dealer reserves a specific unit in the
parent's yard for a named end customer, and acceptance flips
`inventory/{id}.organisationId`.

We have none of it. Our `ModuleTab` includes `'stock'` and the tab is labelled
*Catalog* — it is the price list, not physical units. **A salesperson quoting a
boat that is already sold is the most expensive kind of wrong, and we cannot
answer either that or its opposite.**

Almost all of it comes free here: a stock unit is a row in a table with a status
column and a link to the quote it is allocated to. The one genuinely new
contract is the allocation, and it is a real design decision rather than a
field: `freeze.ts` deliberately mints a line **by value**, and an allocation
must be **by reference** and must not be frozen. Their own
`inventory-allocation.ts` has never been called, so nothing is lost by writing
it properly. Their hold request has no `heldBy`, no expiry, and three
non-transactional writes, so two sub-dealers can hold the same hull.

### 3. Everything after "issued"
Our quote has two states and after issue the only act left is "make a new
version". Theirs continues: **Convert to Contract** (`pending-signature → signed
→ cancelled`, write-once line snapshot, `CON-{ORG}-{YYYYMMDD}-{seq}`);
**deposits** with receipts; a **payment schedule** (deposit % + N milestones + a
"Balance on delivery" line carrying the arithmetic remainder, so the schedule
reconciles to the contract total exactly however the percentages round — take
that trick verbatim); **variations** as priced change orders with signed deltas;
a **public accept-and-sign page** at a 32-hex token where the customer signs on
a canvas; **factory order tracking** (`ordered → in-production → shipped →
arrived → delivered`, which is the "where is my boat" answer on a three-to-six
month lead time); and **acceptance capture**.

Honesty, both ways: `acceptance.ts`, `final-invoice.ts`, `variation-order-doc.ts`,
`comms-log.ts`, `inventory-allocation.ts`, `trade-in.ts` and
`quote-versioning.ts` have **zero production call sites** — several exist only to
satisfy Playwright specs asserting the file contains a given string. The
variation editor mints an accept token and never shows anyone the URL, so the
public signing page is effectively unreachable. Every deposit receipt is
hardcoded `receiptNumber: 1`. **Migrate the schemas and the reasoning; the
wiring was never finished.**

### 4. Other people
Firebase Auth with invite flow, org-defined role trees edited as a ReactFlow org
chart, an **11-flag permission matrix**, per-module named roles, and a
**sub-dealer network** — a child org with `parentOrganisationId` inheriting
module and vendor entitlements and a `hull_subdealer` price tier the parent
grants and revokes, down to redacting individual stock columns from its
children.

Ours: a sign-in screen, an `AppUser` with a `roleId`, and `role.ts` saying in
its own header that **no production surface calls `mayDo` yet**. More
fundamentally we are one browser: quotes in `localStorage`, project in Dexie,
`ProjectMeta.id` the literal `'default'`. A colleague cannot open your quote.

Take their vocabulary as a starting list but make it **data, not an enum** —
theirs is a fixed array of eleven and one of them, `can_edit_boat_data`,
hardcodes the industry in its own name. Take the sub-dealer shape, because it is
how this business actually works. Take none of the enforcement: their
`/signup` page ships a checkbox that writes `appRole: 'HelmLogic Admin'` onto
the user's own document and the rules permit it.

### 5. Quote depth
`quote-lock.ts` auto-locks on first successful send, supports admin unlock and
fork-on-edit with `parentQuoteId`, and is **genuinely enforced server-side** —
the one real business rule in their rules file. `quote-audit-log.ts` records
eleven event types per quote. `quote-lifecycle.ts` adds a seven-state sales
journey kept deliberately orthogonal to both the lock and the quote type.

We have issue-locking and `supersedesId`, and an org-wide activity log built on
the toast bus — which is a clever foundation (it cannot miss an act that raises a
toast and cannot invent one) but it is not per-document, and a dealer's question
is "what happened to *this* quote".

### 6. Money beyond the basics
**Discounts** we already do better — every adjustment is a signed visible row,
never folded into a subtotal, where production sums the deal in four places from
five field chains, three of which resolve to `$0` on live screens.

Genuine gaps:

- **The margin gate** — 66 lines of pure function plus a threshold card. Below
  the org's threshold, finalize is **blocked** unless the role carries the
  override; the override demands a typed reason (minimum six characters, not
  just non-empty) and writes a `margin-override` audit event, then re-fires the
  original action so nobody clicks twice. The only hard commercial guardrail
  either app has. Caveat: their margins are often fiction, because
  `quote-financials.ts` falls back to hardcoded cost guesses (boat 70% of sell,
  motor 85%, dealer fit 60%) when a real cost is missing.
- **Landed cost, FX and freight** — base cost in USD → factory discounts →
  ÷ exchange rate → duty → charges (Boat Prep, Base Freight, Documentation,
  **Fumigation**, Ocean Freight, Fuel Surcharge) → road freight → landed AUD,
  with a **recompute-delta badge that self-audits the stored figure**. The FX
  manager **refuses to save a rate change without a note**, which is right: an
  FX move silently repricing the whole imported fleet is exactly the change that
  needs a why. Freight priced per linear metre of boat plus a buffer %.
- **Price levels** — ours has two rungs. Their MPF ladder is five: trade /
  sub-dealer / sub-exclusive / AUS Sailing / warranty, each inc-GST with ex-GST
  in parentheses, plus `hull_commercial` and `hull_boating_alliance` in the
  importer column map.
- **Tax** — our header already names their trap (`1.1` hardcoded in seven files
  while `organisation.gstPercentage` sat unread; confirmed). What we lack is the
  **two-convention machine**: `quote-financials.ts` branches on
  `pricingConvention` because `display-sheet-v2` quotes sum GST-INCLUSIVE money
  and back-derive ex-GST, since the dealer's own price file column is titled
  "RRP + Freight Inc GST". Older quotes keep their original convention forever.
  **That reconciliation was worth $4,619 on one field-tested boat.**
- **Promotions and rebates** — `fixed-amount | per-hp | percentage |
  category-discount`, scoped to motor / rigging / propeller / accessories /
  total, date-windowed, with a flyer image and PDF that attach to the quote.
  **`per-hp` is specifically marine** — outboard rebates quote per horsepower —
  and exists nowhere else. Their v1.34 design is the shape to take: a rebate
  stamps a **temporary new price** onto selected rows, un-stamps them when it
  ends, and keeps the sales history forever. That is a time-bounded override of
  a column, a shape our table has no word for yet.
- **Trade-ins** — we have the adjustment line. They additionally model make,
  model, year, hull identifier, condition, allowance, **payout owing**, and net
  equity that can go negative for an upside-down trade. Schema-only stub; what
  ships is two free-text fields that do not move the total. Take the idea.
- **Registration as a priced line** — bands per authority with sell and cost
  ex-GST and `appliesTo: boat | trailer | both | sticker | fee`, auto-matched by
  hull length or trailer ATM. `rego-automatch.ts` is 110 lines and the
  best-reasoned small file in the original: it refuses to parse a part-number
  SKU like `HBS113` as 1.13 m — *"no rego auto-match is better than a wrong
  one"* — prefers MPF bands over legacy seeds, and scores pensioner bands at −1
  so they are never auto-applied.

### 7 – 10, briefly
**CRM depth**: their schema has `source`, `lifecycleStage`, a **secondary
buyer** (routine in boat sales), a trade-in reference and typed documents —
none of which has an authoring UI anywhere, and `customerId` is written only in
stock mode, so "Linked quotes" renders zero for every real proposal. **Neither
app has follow-up scheduling of any kind.** Our pipeline, history ledger and
customer page are already the better architecture.

**Service** — a second complete quote product for the workshop, ~2,750 lines,
with its own catalogue, wizard, status machine, PDF and send pipeline, plus
engine service schedules that turn "your F250 is due its 300-hour service" into
a priced quote in two clicks.

**Handover** — a delivered-deals register capturing motor serials separately
from hull serials, with five flags including Warranty Registered. **Warranty
itself is not a subsystem in either app** and appears there in four unrelated
guises; do not migrate a warranty feature, because there isn't one.

**Reporting and telemetry** — four metrics and a sortable list (which pulls
every quote in the org into the browser and caps the table at 100 rows with no
indicator), plus a from-scratch client analytics engine whose coverage matrix —
people × app areas, red dash meaning never been there — their own release notes
call *"the 'they clearly don't use it' receipt"*.

**Integrations** — **SharePoint** push of the rendered PDF on a path mirroring
the quote hierarchy is production-quality and dormant behind an env flag. The
**image proxy** we will need. The catalog XLSX round-trip and paste-from-
spreadsheet are both good. Shopify is a 286-line dry-run spike with zero
consumers; `importer-registry.ts` has no callers and its test asserts on source
text via regex.

**AI** — 698 lines total, Genkit + Gemini 2.5 Flash, no API key anywhere in the
tree. The one real flow is a tool-calling assistant with a genuinely good
hierarchical search protocol (Brand → Range → Model, never recommend a motor
over the hull's max HP) — and it is **unreachable**: `chat-bot.tsx` has an
unconditional `return null` with the comment *"chat functionality temporarily
hidden globally per Asaf"*. The rest is Firebase Studio template residue.
`agent-team-dashboard.tsx`, despite its subtitle, is 100% hardcoded static
arrays. **There is essentially nothing AI-driven worth migrating.**

---

## 3 · What we already do better

Worth stating, because the gap list is long and one-directional by construction.

- **One money model, frozen at pick time.** `freeze.ts` mints a line the instant
  it is picked and `QuoteLine.levels` captures *every* rung, so switching
  cash→trade on Friday is arithmetic on Tuesday's data. Production answers "what
  is this quote worth" with five field chains.
- **A draft that cannot be lost, structurally.** A repo-wide grep of their
  `src/` for `localStorage|sessionStorage` returns **zero hits**, with no
  `beforeunload`; a refresh on step 6 of their seven-step wizard destroys the
  build. Their own docs call it *"the single most damaging friction"*.
- **Rules measured out of the price file** rather than typed into a form —
  `discover.ts` reports which shapes a project holds, at what rate, over what
  denominator, with exceptions named, and never presents a discovered pattern as
  a rule the business stated. They shipped two rule editors with no evaluator,
  one evaluator with no editor, and one working engine three of whose five
  offered fields can never match.
- **A constraint solver they have nothing like**, and `trailerFitment.ts`
  recording the reason **at the moment of removal**.
- **A general table substrate** — designer, views, grouping, filters, levels,
  whiteboard, rule graph — against their nine-value module enum driving seven
  early returns in a 2,058-line page.
- **Undo instead of confirmation.** Their only `undo` is TipTap's; sixteen
  components reach for `AlertDialog`, and *"this action cannot be undone"*
  appears in about fifteen.
- **A guard suite.** They commit `ts-errors.txt` and `lint-out*.txt` at the repo
  root and set `typescript.ignoreBuildErrors: true`.
- And bluntly: we are not a security liability.

---

## 4 · Interaction patterns to steal outright

These are cheap, proven, and mostly independent of the feature work above.

**Inline edit-in-place** (`inline-edit-cell.tsx`, 168 lines — the best-designed
component in that repo). Read state is a real `<button>`, so keyboard reach is
free. Hover shows an amber ring using `px-1 -mx-1` so the ring does not shift
the text. Focus-and-select deferred a tick because the input has not mounted.
Enter and blur commit, Escape cancels; a blur without a change writes nothing.
Saving shows an in-cell pip, never a blocking spinner. Errors render as an
absolutely-positioned pill below the cell — *"Not a number"*, *"Positive
number"* — **never a toast**. And it is deliberately decoupled: the write is the
caller's job.

**Import with a diff preview.** Paste TSV straight out of Excel; the delimiter
is sniffed, the key column auto-detected against a priority list, and a live
four-way diff shown before anything writes — *N new · N updated · N unchanged ·
N skipped* — with the commit button counting the actual writes: **`Apply (23
writes)`**. The full version adds per-row checkboxes and per-field
before→after diffs inline, and names what it did **not** touch: *"Sheets not
committed: Exchange Rates (export-only) · Service Parts (not in upload)"*.
Result toast: *"14 created · 9 updated · 31 unchanged · 2 skipped (no key) in
motors."* **This is the pattern a CPQ should be built around.**

**Relevance curation with a mandatory escape hatch** — their Step 5, and the
single interaction in either journey that is unambiguously right. The problem
statement is worth quoting: *"a CLASS of problem: data-consistent but
product-senseless presentation. The MPF Dealer Fit sheet imports verbatim as 93
sections × 1,791 rows; without curation a CL380 tender sees eight identical $813
per-SKU pre-delivery packs, F300 cowl covers, 7-metre tube covers, workshop
job-card sub-items and 'Engine Removal' lines on a NEW-boat quote."* The
governing rule: every rule is listed with a rationale, **fails OPEN** when
context is missing, and is bypassed by a *Show all* toggle — *"narrowing must
never hard-block a legitimate sale"*. Ten named rules, each with a summary and a
reason, including `R-SIZE-TV` (*"a fixed television needs a cabin bulkhead;
sub-7 m open boats and RIBs have nowhere to mount one"*). The UI's toggle
`title` explains the rules themselves, and the honesty line renders only when
something is hidden: **"14 items hidden as not relevant to this build — use
'Show all items' to reveal"**. Raw supplier headings are prettified for display
with the original kept in a `title` *"for traceability"*.

> Narrow by default · name the rule and its reason in the operator's words ·
> count what you hid · always offer the escape hatch · keep the raw value in a
> tooltip.

**Drag doctrine**: `PointerSensor` with a 5px activation distance so a click
still opens the detail; fractional indices, never array rewrites; an optimistic
override map with rollback and a destructive toast on failure; per-column sort
disables drag in non-manual modes; and **listeners on the whole row, not the
grip** — which is the v1.33 Bill fix. Empty Kanban columns are their own
`useDroppable` so they still accept a drop. `roadmap-view.tsx` adds a genuinely
novel pattern: a **consequence toast fired after the write succeeds** —
*"{release} is overloaded — {n} pts (red — likely impossible to ship)"*.

**Scale, when a list is long**: `RENDER_CAP = 50` and `MIN_SEARCH_CHARS = 2`,
with real copy at both ends — **"Type at least 2 characters to search 26,345
dealer fit."** and **"Showing the first 50 of 1,791 matches — refine your
search."** The contrast is the lesson: another dialog applies the same
`.slice(0, 50)` **silently**. (Their scale strategy otherwise should not be
copied: zero virtualization, zero debouncing, a bare `onSnapshot` with no
`limit()` subscribing to all 26,345 service parts, and un-debounced search
across every column of every row.)

**Degrade the tab, not the app** — a denylist of non-essential read paths whose
permission errors log to console instead of throwing to the global boundary,
*"because we don't want a missed publish to take down the app for every Bill
Hull who refreshes /manage"* — and critically, **reads degrade but writes still
throw**, since *"bulk markup / item save should never fail silently"*.

**Lock-on-send, pre-announced.** Before you send: 🔒 *"First send — this quote
will lock after delivery. Future edits require a new version."* After: every
edit path refuses consistently and names the remedy — *"Quote is locked —
Discounts can't be changed on a locked quote. Create v2 to make changes."* The
lock badge's tooltip reconstructs the history. Manual unlock is admin-only and
its dialog is a model of consequence-disclosure, listing what happens after.

**The toast voice** is their best writing: an arithmetic receipt plus a named
next action. *"Could not find a 'Motor Library' sheet. Available sheets: Boats,
Trailers, Rigging"* · *"CSV must contain __itemId column. Export first, then
reimport."* · *"Use JPG or PNG (got image/webp). SVG / WebP / GIF do not render
in the customer PDF."* · *"Stock item was created but the proposal PDF could not
be generated. You can re-generate it from the stock detail panel."*

**Column-header help**: *"ATM = Aggregate Trailer Mass — fully loaded weight.
Drives rego band selection at quote time."* · *"Margin: (Sell − Cost) / Sell ×
100. Red < 15% · amber < 25% · emerald ≥ 25%."* Shipped for Motors and Trailers;
never shipped for Boats.

**The read-only contract framing**, repeated across managers and worth adopting
wholesale: *"Only the basics (key, markup %, margin %, notes) are editable here;
trade tiers round-trip via the MPF import."*

**Empty states that teach**: *"No catalog audits yet. Run a Catalog Import or
edit a Fit-Up item and a record will land here."* · *"No events recorded inside
this session (it may predate event capture, or the range clipped them)"* —
explaining **both** plausible causes. And the filter-aware ones correctly
distinguish zero-data from zero-results.

**And two hard-won rendering lessons encoded as libraries**: `hero-carousel.ts`
exists because a field video showed *"clicking a motor on Step 3 made the hero
carousel show the REDCO TRAILER image"* (no fallback chain, plus Embla retaining
a numeric index when the slide array shrinks); `image-preload.ts` exists because
`@react-pdf` fetches from inside an iframe and vendor CDNs return no CORS
headers, so images silently render as nothing. **Both are the kind of thing a
naive rewrite breaks on day one.**

---

## 5 · Do not build

Feature tracking (2,503 lines of Jira substitute shipped to dealers), roadmap,
backlog, release notes, the suggestion queue, the fake agent-team dashboard, the
commercial-shipping template residue (`/route-optimization`,
`/real-time-tracking`'s permanently-empty "Global Fleet Map", the lorem-ipsum
`/highfield` page, `data-connect`'s three files that each `return null`), quote
comparison *as built* (it shows `$0` for every quote and labels each by hull
colour), and the orphaned 1,232-line WYSIWYG template designer with its data
binding to nine hand-typed strings. That last one is the lesson their own docs
already drew: **the dynamic canvas with a hand-typed vocabulary died; the
fixed-slot blocks shipped.** We already own what it lacked — declared, typed,
admin-named columns.

Also note their splash screen still reads **"Synchronizing maritime data
sets..."** on every cold start of a recreational boat dealer's quoting tool.

---

## 6 · The order to do it in

1. **Authored prose on the document** — the four-layer cascade, the admin lock,
   version history. The sheet exists now; it has nothing on it that a dealer
   wrote. *Large.*
2. **Stock as rows, with a quote↔unit allocation by reference.** *Medium* — most
   of it is the table substrate we already have; the allocation is the real
   design work.
3. **A person in the model, and roles that gate something.** *Large.* Unblocks
   half of everything else: who changed this price, whose quote is this,
   approval of any kind.
4. **Contract, deposit and payment schedule.** *Large*, but `freeze.ts` and
   `totals.ts` need no change — a contract is a second frozen document citing
   the first.
5. **Per-quote audit trail**, and the lock discipline with fork-on-edit. *Medium.*
6. **The margin gate.** *Small*, and it is the pattern this app's own principle
   10 asks for applied to money: a gate, a stated refusal, a reasoned override,
   a record.
7. **Registration as a priced line**, with `rego-automatch`'s reasoning. *Small
   to medium.*
8. **Landed cost, FX with a mandatory note, per-metre freight.** *Medium.*
9. **The nine reference managers as nine tables.** *Small, collectively* — they
   are windows onto imported reference data, which is the shape our sheet gives
   for free. The only real work is whether a computed column may reference
   another table; `FieldDef.formula` already exists.
10. **Promotions as a time-bounded column override**, including `per-hp`.
    *Medium*, and the shape would serve several other features once it exists.

Just outside: service quoting as a second document kind; the customer schema's
secondary buyer and typed documents; the org's own settings surface (`OrgProfile`
has three fields and no id, so renaming the business orphans its constraints);
and the SharePoint push.

---

## 7 · What is not known

Nobody ran the original or signed into its Firestore, so anything depending on
deployment config is inference: whether `NEXT_PUBLIC_EMAIL_SEND_ENABLED` or
`NEXT_PUBLIC_SHAREPOINT_ENABLED` are set, whether a Gemini key exists, whether
the Trigger Email extension is installed. From the repo alone all three appear
unset — which would mean **nobody at the dealership is sending a quote from
HelmLogic today either**, and that lowers the urgency of "send" considerably
relative to its apparent size. `CLAUDE.md` there says Next.js 14; a
`package.json` read reported 15.5.9.
