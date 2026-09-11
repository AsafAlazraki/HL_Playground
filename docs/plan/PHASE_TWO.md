# PHASE TWO — the configurator, not the database

**The verdict on phase one, in the owner's words: "a slight improvement."**
That is the right verdict and this document exists because of it. Phase one
re-skinned a schema. It made a database tool look better. It did not make a
selling tool.

Four reactions were given, and all four were selected:

- it still feels like a database
- it is not beautiful enough
- it does not feel alive
- it is still too complicated

Those are not four problems. **They are one problem with four symptoms**, and
the problem is that the application's information architecture is the data
model. Everything else follows from that: a schema has no hierarchy of
importance, so nothing on screen can be bigger than anything else; a schema has
no narrative, so nothing can move; and a schema has 51 tables, so the rail has
51 doors.

**The reference is the Porsche configurator, chosen deliberately over Linear,
Apple and the marine brands.** Everything below is measured against it.

---

## 0 · THE THESIS

> **HelmLogic is a configurator that happens to be backed by a price file.**
> Today it is a price file that happens to contain a configurator.

That inversion is the whole of phase two. It is not a styling exercise.

### What Porsche actually does — first-hand, not from memory

Driven live (`docs/plan/CONFIGURATOR_PLAYBOOK.md` carries the full study):

| Fact | Measured |
|---|---|
| Shape | **One continuous scrolling page.** Not a wizard. |
| Options in the DOM | ~280–302 inputs, all present at once |
| Groups | 11 accordions, fixed order |
| Progress indicator | **None at all** |
| Left column | The car, **sticky**, filling the height |
| Right column | ~9,700px of option rail scrolling past it |
| Orientation aids | The accordion headings, a pinned search, the running total |
| Price | Always on screen; committed total never moves until you Accept |
| Conflicts | A routed flyout: what you wanted, its price, **the cheapest fix pre-selected**, every alternative priced, `Total price change +$2,480` |
| State | **Every option is in the URL.** A build is a link. |
| Model choice | Happens *before* the configurator, on a separate comparison surface |

### Where we must diverge, and why

**Porsche can put every option on one page because a 911 has eleven groups. A
rig has 2,519 pairings and a 434-trailer shortlist.** Copying the flat list
would produce a 40,000px page. The research said this outright and it is the
one place the reference does not transfer.

So: **take the composition, not the list.**

- The **sticky product on the left** — take it. Exactly.
- The **scrolling option rail on the right** — take it, but each band is a
  *searchable shortlist* rather than every row, because the shortlist is
  computed by the solver and is the product's whole value.
- **No progress indicator** — take it. The six-stop rail goes.
- **The price always on screen** — take it.
- **The conflict flyout** — take it and beat it, because our solver records the
  reason at the moment of removal and theirs reconstructs it server-side.
- **Deep-linkable state** — take it. This is new work; the app has no router.

> **BUILT 2026-09-09 — `src/app/url.ts`.** The paragraph above is kept for its reasoning and is no longer true of the tree. The app has a router: three browser primitives (`history.pushState`, `popstate`, `URLSearchParams`), no library, imported by `Shell.tsx`. Seventeen places are addressable and `queryFor`/`placeFor` are each other’s inverse, walked in both directions by 37 tests in `url.test.ts`. The URL names the WINDOW — so the module tab, the row open inside a module, the Admin panel and the quote picker’s starting place are deliberately NOT addressable, being positions inside a place rather than places. See backlog rows 77, 78 and 80.


---

## 1 · THE INFORMATION ARCHITECTURE

### The correction: what a MODULE actually is

I had this wrong, and it is the reason the IA never came right. I read
"modules are the places in your business" as a *label on a dashboard tile*.

In the original HelmLogic a module is a **typed workspace**, and inside it are
tabs:

```
DASHBOARD   the module's own overview
STOCK       the table — the rows, edited here
QUOTES      the quotes raised from this module
PRICING     the pricing rules that apply to it
SETTINGS    its configuration, its dealer-fit categories, its access
```

And modules have **types**, which change what the workspace does:
`master-price-file` · `motor-brand` · `trailers` · `rego` · `fit-up` ·
`service` · `catalog` · `used-boats` · `website-listings`.

A Motor Brand module is not a Trailers module is not a Rego module. That is
the whole idea and I had flattened it.

**So the module is the entrance, and the table lives inside it.** Which means
the schema does not need an "Admin graveyard" at all — the thing I was most
worried about in the first draft of this plan simply dissolves. Editing a table
IS the Stock tab of the module that owns it.

### The modules screen — one card per module, and it does not scroll

**What it does today, and why it is wrong.** It draws NINE cards called Boats,
Motors, Factory Packages, Trailers, Parts & Accessories… — those are
*categories*, and each one says "Highfield Inflatables + 6 more". The actual
modules are hidden inside a grouping nobody asked for.

**What it should be.** One card per module, named for the module:

```
  Highfield    Yamaha      Stacer      Dunbier     GFAB
  ePropulsion  Jeanneau    Stabicraft  REDCO       Mackay
  Surtees      Formosa     NSM Custom  Haines      + New module
```

- **Snap to grid. NO PAGE SCROLL.** The grid fits the viewport and the cards
  size to it. If there are more modules than fit, the GRID scrolls inside its
  own box — the page never does.
- **Filter by type** — a row of chips: All · Boats · Motors · Trailers ·
  Packages · Parts · Rego · Service. Filtering re-flows the grid.
- **New module** is a card in the grid, not a button in a corner, so creating
  one is the same gesture as opening one.
- Each card: the module's own photograph, its name, its type, what it holds
  counted, and its kind hue as a full-height rail.

### The rail

```
  [ search ]                    Ctrl K

  Today                         ← the no-scroll dashboard
  Modules                       ← the grid above

SELLING
  Quotes                    3
  Customers

  [ the person ]                ← sign out, theme, saved configurations
  [ Admin ]                     ← the drawing, rules, access, import/export
```

**Six doors.** The modules are not enumerated in the rail — there are fourteen
of them and they belong on their own screen, which is the point of that screen.

### New quote — small module cards, and I got this wrong twice

The instruction, verbatim: *"that is the flow of how i want it from new quote —
opens popup with small module cards not the way it is now! i thought i made
that clear"*.

It was clear. What shipped is a two-pane picker: a LIST of places down the left
and rows on the right. What was asked for is a **popup of small module cards** —
the same objects as the modules screen, smaller.

```
   What are you quoting?

   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
   │ HF │ │ YA │ │ ST │ │ DU │ │ GF │      ← small cards: logo, name, count
   └────┘ └────┘ └────┘ └────┘ └────┘
   ┌────┐ ┌────┐ ┌────┐ ┌────┐
   │ JE │ │ SU │ │ FO │ │ NSM│
   └────┘ └────┘ └────┘ └────┘

   [ search everything ]
```

Press one → it opens *in place* to that module's rows. Same objects, one layer
deeper, no second column of prose. The modules a quote cannot start from are
still shown and still say why, but as a quiet band beneath rather than as half
the list.

### Brand logos — already built, never surfaced

`ModuleDef.logo` is an `ImageRef` and `features/modules/logo.ts` already has the
size ceiling (512px edge, 96KB kept, 32MB refused), the kind refusal and the
fallback for a logo that cannot be drawn. **The capability exists and nothing
shows it.**

Phase two surfaces it: the logo is the face of a module card, of a small card
in the picker, and of the module's own header — with the crest as the fallback,
which is what the code already does. Upload lives in the module's Settings tab,
where it already is.

### The side menu is not right yet, specifically

Named so it is fixable rather than a feeling:

1. **Collapsed, it is unreadable.** In its 64px state it is a column of
   near-identical grey glyphs — three of them are variations of the same node
   graph. Icons must be distinguishable at 20px or the collapse is a downgrade.
2. **It has no colour.** Every row is the same grey-blue. The modules carry
   kind hues and the rail shows none of them.
3. **It is too tall and too uniform.** Fourteen rows at one weight, one size,
   one colour. Nothing is more important than anything else.
4. **The collapsed state loses the counts**, which are the one thing worth
   keeping when the words go.
5. **264px is too wide** for what it holds once the tree goes.
6. **The sections do not collapse.** DATA and SELLING are headings that cannot
   be shut, so the rail is always its full height whether or not you are using
   that half of it. Every section collapses, the choice is remembered, and the
   section header says how many are inside when it is shut.

**And it is still too complicated even at six doors.** The minimum that is
honest:

```
  [ search ]        Ctrl K

  Today
  Modules
  Quotes                3
  Customers

  [ the person ]
  [ Admin ]
```

**Four navigation rows.** Everything else in this application is reached
*through* one of those four, which is what makes them navigation rather than a
menu. If four is still too many, Customers folds into Quotes — they are the two
halves of one job — and it becomes three.

### Inside a module

```
┌────────────────────────────────────────────────────────────┐
│  ◤ Highfield Inflatables                    [ New quote ]  │
│  Dashboard · Stock · Quotes · Pricing · Settings           │
├────────────────────────────────────────────────────────────┤
│   the tab                                                  │
└────────────────────────────────────────────────────────────┘
```

- **Dashboard** — what is in this module, counted, with its photography.
- **Stock** — the catalogue, and the register as a density toggle on it. Where
  the 588 Highfield variants live, and where the table is edited.
- **Quotes** — every quote raised from this module.
- **Pricing** — the price columns, the levels, the rules that price it.
- **Settings** — its configuration, its dealer-fit categories, its access.

"Configure at every level" (brand / range / model) belongs in **Stock**, beside
the rows it writes to.

### The counted strips stop being the subject

"9 Places · 6,074 Things in them · 24 Tables in use" sits top-right of the
modules screen, and the same shape sits on Home and on Business rules.

**AMENDED 2026-09-09 BY `docs/plan/DECISIONS.md` §3, WHICH THE OWNER SETTLED.**
This section said *"Delete them"* while §2.1 asked for them back as a quiet
strip. The owner read both and kept §2.1, on the ground that **§1's objection
was to counts as the SUBJECT of the screen, not to counts existing**. The word
here is therefore **"not as the subject"**, and it is no longer "go".

**Take them out of the strongest position.** This is not a data analytics
system. Putting three big figures top-right of a page says the app is proud of
its schema — which is exactly the impression phase two exists to remove. What
was wrong with that strip was its **size, its weight and its position**; none
of those is the same objection as "a dealer must never be told what the file
holds", and a dealer does want to know the file holds 15,691 rows across 53
tables.

A count belongs **on the thing it counts**: "810 boats across 42 series" on the
Boats module card is useful, because it tells you what is behind that door. The
same three numbers in a **panel of their own** are a dashboard for the person
who built the database, not for the person selling out of it — and that word is
the whole of the surviving rule. A panel is a surface, a heading and a claim on
the page's attention. One caption line on the page ground, beside a greeting,
is none of those.

Where a total genuinely matters it is the **price** — and that has its own
permanent home at the foot of the configurator.

**AND THE STRIP IS BUILT, SMALL.** An earlier pass wrote here that this section
beat §2.1 and that "there is no strip". `DECISIONS.md` §3 overturns that: §2.1
was written knowing §1 and is the later, narrower statement, so it wins. The
dashboard header now carries one line —

> 15,691 rows across 53 tables

— at 12px caption, tertiary ink, on the page ground, with no surface, no
elevation and nothing to press, beside a 33px greeting. It is the **load
toast's own sentence, kept**: `demoLoad.ts:231` says it once when a price file
lands and then it is gone, and this is where that fact lives afterwards. It is
not a new claim and it counts nothing the app was not already counting —
`DataStage.tsx:115-116` prints the same two figures through the same reader.

**And it spends no height, which is the test it had to pass.** Measured at
1280x800 on Northside Marine with the line hidden and shown: header 49.7px both
ways, grid 638.3px both ways, and the modules card still running 975px of tiles
through the same 509px window. Seven of eight sizes are identical to the pixel;
only a 600px column pays, and pays 44px into a grid that already scrolls inside
its own box at that width. See `src/features/dashboard/census.ts` and the
`.dsh-strip` block in `dashboard.css`.

**The empty-state counts stay.** `cards.ts:emptyCount` answers a different
question — a card with nothing in it names the precondition its own act needs —
and neither replaces the other.

---

## 1a · THE APP TALKS INSTEAD OF SHOWING — measured

"Still too cluttered and too bland" is not a mood. It is this, counted on
screen at 1600x1000, where "explanation" is any visible run of twelve words or
more:

| Surface | Words visible | Explanation | Largest type |
|---|---|---|---|
| Business rules | 282 | **79%** | 34px |
| History | 56 | **66%** | 34px |
| Modules | 350 | **63%** | 52px |
| Dashboard | 250 | **56%** | 34px |
| Quotes | 60 | **50%** | 34px |
| Configure | 260 | 12% | 28px |
| All tables | 100 | 15% | 52px |

**On five of seven surfaces more than half the words are the app narrating
itself.** Configure and All tables are the two nobody complained about, and
they are the two that are mostly content.

This is the house style taken too far. DESIGN_PRINCIPLES §6 says "say what a
thing does, not what it is" and warns against ad copy — and the answer to that
warning became a paragraph under every heading. Every screen is eyebrow, title,
one paragraph of explanation, sometimes a second, and then the thing.

### The prose budget

| Where | Allowed |
|---|---|
| A stage | its name, and **at most one line** under it |
| A card | a name and **one fact**. Not a name, a subtitle, a two-line description, a count, a qualifier and a row of verbs |
| An empty state | the sentence AND the act — this is the one place prose earns its space |
| A refusal | a sentence, always, wherever it is |
| Everything else | nothing |

The explanation does not disappear; it **moves to where it is needed** — the
first time, on hover, behind a `?`. A dealer on their four-hundredth quote does
not need the paragraph, and they are the person the app is for.

Target: **explanation under 20% on every surface**, measured the same way.

### The worked example

> *"This is the dashboard everybody starts with. Press Arrange to choose what is
> on it, what it is called and what order it goes in."*

Twenty-four words, permanently, on the screen a person sees most often in the
app. It explains a button that is eighteen pixels away and says "Arrange". It
is read once and then read past forever.

**It goes.** The button is the explanation. If Arrange is not
self-evident the fix is a better button, not a paragraph defending it.

Every surface has one of these and they all go the same way. This is the single
highest-value edit in the phase and it is mostly deletion.

### And the blandness has a number too

Nothing on the dashboard is larger than 34px, across 7 sizes and 7 weights.
Seven sizes is not a hierarchy, it is a lack of one — and a screen whose
largest element is 34px has no focal point at all. Phase two's scale rule
(§3) exists because of this row of the table.

---

## 1b · COLOUR — and this needs a rule changed

Said three times now, so it is not a detail.

### What went backwards

Phase one's first draft had the eight kind hues as a **full-height rail on
every card** — indigo boats, rose motors, amber trailers, teal accessories,
violet packages. When the navy chrome arrived the rail took all the colour and
the content area went white-on-white; the hues were demoted to 7px dots. The
app got a coloured *frame* and a colourless *page*, which is backwards.

### The rule that has to change

DESIGN_PRINCIPLES §1 says:

> **One accent.** Kind colour is an eighth-note, not a theme. Use them for a
> 3px rail, a dot, or a glyph — never for a fill behind text, and never for
> chrome.

That rule was written for a calm data tool where the kinds are metadata about
tables. **This is a selling tool, and the kind is not metadata — it is what the
thing IS.** A boat, an outboard, a trailer and a rigging kit are the four
nouns the entire business is made of, and a person should know which one they
are looking at from across the room without reading.

**Amended, and the amendment is narrow:** a kind hue may now carry a
**surface** — a tinted band head, a card rail at full height, a filter chip, a
selected state. It still may not sit behind reading text, and it is still never
chrome. The 4.5:1 floor is untouched: the eight hues are already cut to equal
luminance and measured on both grounds.

### Where each hue appears

| Surface | How colour is spent |
|---|---|
| Rail — module rows | 3px kind rail, and the count in the kind's ink |
| Modules grid card | **full-height kind rail** + the brand's logo + its photograph |
| Catalogue card | the photograph is the colour; the kind is a chip |
| Configurator band head | a tinted band in the kind's hue at wash strength |
| A chosen option | kind-tinted surface, kind rail, ink stays ink |
| A refused option | struck through in `--danger`, the reason in `--ink-soft` |
| A held-back line | `--warning` rail, not grey |
| Filter chips | the kind's hue when active |
| Figures | **never hue.** Always ink. A price is not decorative |
| Body text | never on a hue fill |

### The three colours that are currently wasted

1. **`--danger` and `--warning` are barely used.** A refusal is the most
   important thing the solver produces and it is drawn in grey. Refused,
   discontinued, over-rating and unchecked are four different states currently
   sharing one appearance.
2. **The photography.** 220 real photographs — turquoise water, sunset,
   brushed alloy — reduced to card headers and 32px thumbnails. In a catalogue
   they *are* the palette.
3. **The accent itself.** One blue, used four times a screen, on a navy rail
   where it is barred anyway. On a white page it can do far more work.

### What stays disciplined

Not a rainbow. The hues are **identity**, not decoration: a hue only ever
appears on something that HAS that kind. Two things of the same kind are the
same colour everywhere in the app, always. That is what makes it legible rather
than loud — and it is the difference between colour and colouring in.

---

## 1c · NOTHING SCROLLS THAT SHOULD NOT

**Two screens must fit the viewport exactly: the dashboard and the modules
grid.** Both are overviews. An overview you have to scroll is a list.

- The dashboard sizes its cards to the space it has, rather than stacking a
  fixed-height grid and overflowing.
- The modules grid snaps: the cards get bigger with fewer modules and smaller
  with more, and the grid — not the page — scrolls if it truly cannot fit.
- Everything else (catalogue, register, configurator, quote) scrolls, because
  those are content.

---

## 1d · RESPONSIVE, ON EVERY SIZE — this is a requirement, not a pass

The instruction was: **"THIS WHOLE APP NEEDS TO BE RESPONSIVE ON EVERY SCREEN
SIZE."** It currently is not, and no phase-two screen ships until it is.

| Width | What the app must do |
|---|---|
| ≥1600 | the full composition |
| 1440 | the same, tighter gutters |
| 1280 | rail narrows; configurator keeps the split |
| 1024 | rail collapses to icons by default; the split becomes stacked |
| 768 | rail becomes a top bar; one column; the configurator's product goes above its options |
| ≤600 | one column, the price bar stays pinned, the register scrolls in its own box |

Rules that hold at every width: **nothing under 11px**, nothing truncates
mid-word, a strip that does not fit **scrolls rather than being cut**, and no
horizontal scroll on `body` — ever.

This is tested by driving every breakpoint, not by adding media queries and
hoping.

## 2 · THE FIVE SCREENS

### 2.1 · Landing — "what are you selling today"

Replaces the dashboard-of-counts. The dashboard was honest and thin; the reason
it was thin is that counting tables is not a salesperson's day.

**ONE quotes card, not three.** Today the dashboard draws "My quotes",
"Quotes by state" and "Where I have been" as three separate boxes saying three
versions of nothing. It is one card: the quotes, **with its filters inside it**
(mine / drafts / issued / by customer), and a link to the full Quotes page for
everything else. One card that works beats three that announce.

- **Drafts first inside that card.** A resumable draft is the most valuable
  thing on the screen and is currently four levels down.
- **The catalogue, entered by kind.** Four large photographic doors — Boats,
  Motors, Trailers, Parts — each showing what is in it, counted.
- **Recent and pinned.** What this person actually opens.
- **The counted figures stay, but as a quiet strip, not as the subject.**
  **SETTLED 2026-09-09 BY THE OWNER IN FAVOUR OF THIS CLAUSE** — see
  `DECISIONS.md` §3, and the correction below. **Built.**

#### The strip: §1 said delete, §2.1 said keep it quiet, and the owner chose §2.1

`docs/BACKLOG.md` recorded this as one of the questions only a person could
answer — *"§1 deletes the counted strip and §2.1 asks for it back. Today neither
exists."* **A person has now answered it: `DECISIONS.md` §3, 2026-09-09.**

**§2.1 wins.** It was written knowing §1 and is the later, narrower statement,
and §1's objection was to counts as the *subject* of the screen rather than to
counts existing. §1 is amended to say "not as the subject" rather than "go".

##### The case an earlier pass made for §1, and why it does not hold

That pass argued the strip had nothing left to carry, and tabulated it:

| figure a strip would print | where that pass said it already is | what is true |
|---|---|---|
| 25 places | 25 tiles on the modules card | true, and the strip does not print it |
| 15,691 things in them | on each tile — `588`, `209` | **never summed anywhere on this screen**; a person reading 25 tiles is not told the total |
| 53 tables | the rail's own Data row, `53` | a bare numeral in chrome with no noun beside it |
| quotes out | on the tile they were raised against | true, and the strip does not print it |

Two of the four rows were the argument's own answer to a figure the strip was
never going to carry. Of the two that remain, one is a total the screen states
nowhere and the other is a digit in the navigation.

The second half of that argument was that the strip *"would sit in the one
position on the page that has nothing else in it, which is precisely the
strongest position"*. That conflates **empty** with **strong**. Measured at
1280x800: the header band is 992px wide and holds a 290px greeting and a 90px
button, and the ~600px between them is the quietest space on the page, not the
loudest. The strip sits there, bottom-aligned on the greeting's line, at 12px
against 33px.

##### What was built

The dashboard header carries one line — **15,691 rows across 53 tables** —
tertiary ink on the page ground, no surface, no elevation, nothing pressable,
counted at paint off the store (`src/features/dashboard/census.ts`). It is the
**load toast's own sentence, kept**: `demoLoad.ts:231` says it once when a
price file lands and then it is gone. It introduces no noun and no reader the
app was not already using — `DataStage.tsx:115-116` prints the same two
figures the same way.

**It spends no height.** Measured at eight sizes with the line hidden and
shown: at 1600x1000, 1440x900, 1280x800, 1600x760, 1024x768, 900x800 and
768x900 the header, the grid and the modules card's tile window are identical
to the pixel — at 1280x800, header 49.7px, grid 638.3px, tiles 975px of content
through a 509px window, before and after. Only a 600px column pays, 44px, into
a grid that already scrolls inside its own box at that width.

**What §2.1 was protecting is ALSO kept, and it is kept where it is
load-bearing.** The strip does not replace it and neither replaces the other.
The clause exists so a person who has just loaded a real price file does not
land on a screen that looks empty. That is a real risk and it was real here:
measured at 1280x800 one second after loading Northside Marine — 15,691 rows
across 53 tables in 25 places — the quotes card said *"No quotes have been
raised here yet."* over 111.5px of nothing, 42.6% of its body, and 174.7px
(44.9%) at 1920x1080.

So the figures went into the **empty states**, where DESIGN_CONTRACT §6 was
already asking for them and this dashboard was not drawing them: *"Read the
real count from the store. Never write a blank screen at a person who has
data."* The quotes card now reads

> NO QUOTES YET
> A quote is what a customer is handed — the boat, what goes with it, and the price.
> You have **25** places to quote from.
> [ New quote ]

— which is §1's rule (the count is on the card whose act it makes possible) and
§6's four-part shape. `cards.ts:emptyCount` is the whole of it and it returns
**null** where a card has no precondition to count, so no card ever prints a
figure to fill a hole.

The strip and the empty states answer two different questions — *what does this
file hold* and *what does this card need before it can do anything* — and the
dashboard now answers both.

### 2.2 · The catalogue — browse what you sell

The screen that does not exist today and should be the most-used in the app.

- Photographic grid. Real boats, large, 3:2, the ratio the seed was shot at.
- Filter by brand, series, length, HP envelope, price — **from the columns that
  actually exist**, never invented.
- Search that reaches every row.
- Density control: gallery ↔ list. The list is the register, which is where the
  spreadsheet earns its place — as a *view*, not as the front door.

### 2.3 · The configurator — the Porsche screen

**This is the screen the phase is named for.**

```
┌──────────────────────────────┬─────────────────────────────┐
│                              │  [search this build]        │
│                              │                             │
│      THE BOAT, STICKY        │  01  THE HULL          ▾    │
│      full height             │      chosen: SP560 (PVC)    │
│      the photograph          │                             │
│                              │  02  MOTOR             ▾    │
│      name at 72–110px        │      7 offered · 202 not    │
│      the specs, hairline     │      [ shortlist cards ]    │
│                              │                             │
│                              │  03  TRAILER           ▾    │
│                              │  04  DEALER FIT        ▾    │
│                              │  05  ADMINISTRATION    ▾    │
├──────────────────────────────┴─────────────────────────────┤
│  $88,715 inc GST · $80,650 ex   [Cash|Trade]   Give it over │
└─────────────────────────────────────────────────────────────┘
```

- **No step rail. No progress. No next-step button.** One page, scrolled.
- Bands are accordions in a fixed order; open several at once.
- The **left column changes with the build** — pick a motor and the render
  becomes the rig, crossfading. That is the "alive" the app has none of.
- The **price bar never leaves.**
- **Refusals stay on screen, struck through, with the reason beside them.** Our
  differentiator, and Porsche's weakest area is our strongest.

### 2.4 · The conflict sheet

When a choice removes something already chosen — the case McLaren silently
swapped and Sea Ray silently hid:

> **Changing to the SP660 affects your build.**
> The Yamaha F40LA is rated to 60 hp; this hull needs 90–150.
>
> - ◉ Yamaha F90XB — *+$9,336* (nearest by hp)
> - ○ Yamaha F115XB — *+$14,110*
> - ○ Leave the motor off
>
> `Total change +$9,336` · **[Accept] [Cancel]**

The committed total does not move until Accept. This is Porsche's pattern with
our reasons in it.

### 2.5 · The quote document

Unchanged in substance, raised in craft. The one artefact that leaves the
building. Plus: **what was held back travels with it** — a customer should be
able to see what was not offered and why.

---

## 3 · WHAT MAKES IT BEAUTIFUL

Named concretely, because "more beautiful" is not a task.

| Move | Now | Phase two |
|---|---|---|
| Scale contrast | 52px hero, 14px everything | **72–110px** product names against 12px labels |
| Imagery | card headers, thumbnails | **full-height, sticky, full-bleed** |
| Hierarchy | every card equal | one thing dominates per screen |
| Density | sparse, floating | either dense-and-crisp or generous-and-empty, never in between |
| Colour | navy chrome, white page | navy chrome, **photography as the colour** |
| Corners | 10px everywhere | square on large surfaces (Stabicraft has none) |
| Motion | tokens, unused | the render crossfade, the price roll, the refusal strike-through, the accordion |

---

## 4 · WHAT MAKES IT ALIVE

Every one inside the motion budget; nothing keyboard-initiated animates.

1. **The render crossfades** when the build changes — 260ms, opacity only.
2. **Options strike through in place** when the solver removes them — 200ms.
3. **The price re-totals** — the figure does *not* count up (a dealer reads it
   aloud), but the delta appears and fades.
4. **The accordion** opens on a spring the person can interrupt.
5. **The catalogue arrives** in a 26ms stagger, once.
6. **The conflict sheet** scales from the option that caused it.

---

## 5 · WHAT MAKES IT SIMPLER

- **14 rail doors → 7.**
- **Six stops → zero.** One scrolling page.
- **51 table doors → 4 catalogue doors.**
- The register stops being the front door and becomes a view.
- One search, reaching everything, on `Ctrl+K` and on every catalogue.

---

## 6 · THE ORDER OF WORK

| # | Phase | Why first | Risk |
|---|---|---|---|
| 1 | **The rail and Admin** | Nothing else can be judged while the first word on screen is DATA. Cheap: moving doors, not rewriting screens. | Low |
| 2 | **The catalogue** | The screen that does not exist and is the answer to "feels like a database". | Medium |
| 3 | **The configurator** | The reason for the phase. Replaces the six-stop deck. | **High** |
| 4 | **The conflict sheet** | Needs 3 in place. The differentiator. | Medium |
| 5 | **Landing** | Cheap once 2 exists — it is mostly the catalogue's doors plus drafts. | Low |
| 6 | **Motion and scale pass** | Last, over finished screens. Doing it earlier polishes things that are about to move. | Low |
| 7 | **URL state** | Deep-linkable builds. ~~New: the app has no router.~~ **BUILT 2026-09-09, `src/app/url.ts`** — see the note above. | Medium |

**1 and 2 together are the test.** If the app still feels like a database after
those two, the diagnosis in this document is wrong and we stop and re-plan
rather than building 3 on a bad foundation.

---

## 7 · WHAT I AM NOT DOING, AND WHY

- **Not deleting anything.** Every capability survives; the schema moves, it
  does not go. "All of the same functionality, presented beautifully."
- **Not copying Porsche's flat option list.** 2,519 pairings is not eleven
  groups. Composition yes, list no.
- **Not making it dark.** Blue and white was the instruction and it stands.
- **Not counting figures up.** Animated numbers on real money read as
  untrustworthy.
- **Not animating anything reached by a key.**

---

## 8 · WHAT COULD GO WRONG

1. **Admin becomes a graveyard.** The schema work is genuinely good and burying
   it badly is the biggest risk here. Admin gets the same craft as Sell.
2. **The catalogue is only a prettier grid.** If filtering is not genuinely
   better than the register, nothing has been gained.
3. **The one-page configurator is too long.** 2,519 pairings must be shortlists,
   not lists. If a band cannot be shortlisted honestly it stays a picker.
4. **Deep-linking is bigger than it looks.** No router today. Deliberately last.
5. **I guess wrong again.** Which is why 1 and 2 ship before 3 starts.
