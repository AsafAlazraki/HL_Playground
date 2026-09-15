# THE SCREENS — every one the shell can show, and what each is for

> Written 2026-09-15, the night the app took one visual language. The
> question that prompted it: *"do we have a knowledge of what screens we
> actually need, and the experience in every screen?"* The honest answer was
> **no, not in one place.** `winKit.tsx` holds the list of stages as a type;
> `REBUILD.md` groups them into phases; `hl-navigation.md` and
> `hl-journeys.md` describe the ORIGINAL HelmLogic's screens, not ours;
> `information-architecture.md` audits our doors; `visual-qa-rebuild.md` is
> the scoreboard. Five documents, none of which says, for each screen: who
> stands in front of it, what they came to do, what it must feel like, and
> where it is today. This one does.

The source of truth for *which screens exist* is the `Stage` union in
`src/app/winKit.tsx`. If a stage is added there and not here, this file is
wrong; fix it in the same commit.

## The two experiences

Every screen belongs to exactly one register (`DESIGN_SYSTEM.md` §1–2), and
the register is the experience:

**SHOWROOM** — somebody is being sold to, and a customer may be looking over
the dealer's shoulder. The product is present, large and photographic; the
price is the largest figure; surfaces have depth; the screen arrives. Since
tonight it also has one concrete reference: Porsche's configurator and its
configuration document, driven live and copied in structure — no cards
around photographs, sections stacked on one rail you scroll, thumbnail rows,
a swatch grid, one blue pill.

**COCKPIT** — somebody is working, all day. Density (≥18 rows at 1280×800),
tabular figures, keyboard parity, no entrance animation, scale contrast
2.5–4×. Since tonight its language is Porsche Finder's list: a title pair,
choices as chips in a card, the list a white card on a 16px radius, every
row led by a mark, sentence case, no mono, one blue pill.

**Status** below is as of the four-stage commit that follows `c81ad0d`. *Done* means re-cut in the language and
measured green on every ruler; *old language* means untouched since the
light-mode turn (`ecb658f`) — working, measured, but still wearing cards,
mono capitals and glass.

## The screens

### Showroom

| stage | who · when | the job | the experience it must give | status |
|---|---|---|---|---|
| `home` — the front door | a dealer, forty times a day | see what they sell, who for, what is out; raise a quote | greeting, four kinds photographed, the brands as a shelf, open quotes as cards — one primary act, "New quote" | **done** — unframed, hero step, brand shelf and foot panes without boxes |
| `start` — the quote picker | a dealer starting a quote | choose the place (brand) to quote from | 18 places photographed on hairline shelves; a question, not a form | **done** |
| `start` at a place — the place screen | same, one step in | choose the model and finish | the models of one brand at their real size; finishes as renders; a floating action card, never a solid bar | **done** |
| `quote` (draft) — the configurator | a dealer, with a customer beside them | build the rig: hull, motor, trailer, dealer fit, who it is for | **Porsche's rail**: the hull full height with a gallery strip; every section stacked on one scrolling rail; thumbnail rows; the finishes as a swatch grid that changes the boat; the price and the one act at the foot of the rail | **done** — `a27e399`, `f9f7778`, plus the foot |
| `quote` (issued) — the document | the dealer, then the customer at home | read what was offered; print it | **Porsche's PDF**: a cover, the price beside who it is for, sections as tables from page two; on screen the same in two columns with Print as the one pill | **done** — `91d5cc9` |
| `table` in the catalogue lens | a dealer showing a range | browse one brand's models | masthead, hairline bays, hulls at 360–520px on white, one-baseline captions | **done** |
| `module` — the places | a dealer choosing what to work in | every place, photographed | shelves of places with the kind glyph as a glyph | **done** |
| `gallery` — every table as cards | (retired lens) | — | the catalogue replaced it; `check-shots` skips it as unreached | **retired** |
| `history` — the diary | a dealer after lunch | resume somebody else's draft; see every quote a customer was given | a diary, not a list: days, then quotes under them | **done** — the harness now routes through a quote |
| onboarding · auth | a new dealer, once | sign in; load the seed or a file | one question per screen, the product visible behind it | **old language** — the sweep does not cover them |

### Cockpit

| stage | who · when | the job | the experience it must give | status |
|---|---|---|---|---|
| `quote` (list) — the quotes register | a dealer, twenty times a day | find one quote among many; see how much sits where | title pair; the pipeline as chips in a card; every row led by the hull; stage as a chip | **done** — `6b0b394` |
| `customer` — the register of people | a dealer filing or finding somebody | one book of everybody sold to; mark, open, walk with the keyboard | every row led by the person's initials; one tab stop, arrows, J/K, X, Shift, Ctrl+A | **done** — `290f8e5`; the seed has no register, `tools/shot-customers.mjs` makes one |
| `data` — the register of tables | a dealer or the owner | see the shape of the business: 53 tables, what each holds, how many rows | every row led by the kind's glyph on a disc; the five doors as pills in a card; 21 rows at 1280 | **done** — `aa88209` |
| `rules` — Business rules | the owner, occasionally | read what the price file asserts; write a rule; see what is checked | groups as cards led by their kind; rules as rows on hairlines; the three views as chips | **done** — `0bf4099` |
| `flow` — What fits what | the owner, occasionally | see what one boat may be sold with, and what each brand's rows pair to | one boat at a time with what stops fitting struck through; a card per brand with a bar per pairing kind | **done** — `87a961e`; the harness waits on `.fo-root` |
| `review` — the reviewer | the owner, before a launch | every blocker and advisory over the whole file | a ledger of findings, each with its row | **done** — `f3f6997` |
| `table` — the register of rows | a dealer, all day | the sheet: search, sort, fill, row commands | 18+ rows, tabular, keyboard-first; the workspace under the catalogue | **old language** — the table itself is the app's oldest surface |
| `view` — what goes with each one | the owner | pair rows to rows: which motors fit which hulls | the view page with handles that grow in place | **done** — and its finder said "Find a [object Object]" until tonight |
| `design` — what each column may hold | the owner | column setup | the designer | **done** |
| `levels` — the price ladder | the owner | set a value at brand/range/model, cascade down | a ladder you can read at a glance | **done** |
| `admin` — the organisation | the owner, rarely | who may do what; what is saved; what comes in and goes out | eight doors in one stage, built as a selling screen | **done** — `c0c60d4` |

### Not screens, but every screen has them

- **The shell**: the rail (collapsed by default since `a27e399`), the finder
  (Ctrl K), the window bar with Back, the action bar. The bar's title is hidden
  wherever a page has a masthead of its own — the rule that stopped "Highfield
  Inflatables" printing twice.
- **The sheet underneath** the Data stages (`table`, `view`, `design`, `rules`,
  `review`, `flow`, `levels`) — the whiteboard, frozen while a stage is over it.
- **The cascade sheet** — Porsche's "your build will be adjusted", already
  copied (`cascade-teardown-porsche-live.md`).

## What is still missing, by screen

Not styling — things a person would notice are absent.

- **Onboarding and auth** are the last two surfaces in the old language, and
  the sweep does not cover them; a route for each is the first step.
- **The register of rows (`table`)** is the hardest and the most-used Cockpit
  surface, and it has not been re-cut. It needs its own measurement pass
  before its language changes — density and keyboard parity are guarded there
  by tests that must stay green.
- **The customer register is empty in the seed, and stays empty.** The
  owner's rule (2026-09-15): **no fake data.** A demo that opens on "No
  customer register yet" is the true state of a business that has not filed
  anyone, and a register of invented people would be a lie a stakeholder
  could be told. `tools/shot-customers.mjs` types two people in for a
  photograph and is a harness, not a seed. The same rule covers the trailer
  stop: nothing gets paired to a hull that the price file does not pair.
- **The configurator's trailer stop has nothing paired for most hulls**, so
  the second section a customer sees is a refusal. That is data, not design,
  and it is the single biggest thing a stakeholder will notice.
- **Porsche's cover has a lit scene; ours is a top-down render on white.** The
  assets decide that. Cut-out art would also bring `--photo-drop` back.

## The standard, restated 2026-09-15 (night)

The owner, after twenty screens took one "Porsche language": *"It is not
just Porsche — other boat places have stunning configurators. You have a
habit of being so lazy and reusing things, but I want every new section
genuinely beautiful."* So the language above is a floor, not a design.
From here every section is designed on its own merits from the boat
configurators driven live and photographed in `out/ref/boats/` — Saxdor,
Axopar, Nimbus, Zodiac, Porsche — and **shown as static directions before
it is built**. The reference board and the first three directions (for the
configurator, on the Stacer 529 Assault Pro because it is the boat with
honest on-water photography in the seed) are published artifacts named in
`visual-qa-rebuild.md`.

## How to keep this true

Add a row when a stage is added to `winKit.tsx`. Move a row to *done* only
after the four rulers (`check-collide`, `check-contrast`, `qa-sweep`,
`check:shots --update`) and `npm test` are green and the frame has been
looked at — the scoreboard in `docs/research/visual-qa-rebuild.md` records
each pass with its numbers.
