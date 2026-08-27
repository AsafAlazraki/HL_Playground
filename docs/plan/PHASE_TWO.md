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

### The counted strips go

"9 Places · 6,074 Things in them · 24 Tables in use" sits top-right of the
modules screen, and the same shape sits on Home and on Business rules.

**Delete them.** This is not a data analytics system. Nobody selling a boat
needs to know how many tables are in use, and putting three big figures in the
strongest position on the page says the app is proud of its schema — which is
exactly the impression phase two exists to remove.

A count belongs **on the thing it counts**: "810 boats across 42 series" on the
Boats module card is useful, because it tells you what is behind that door. The
same three numbers in a panel of their own are a dashboard for the person who
built the database, not for the person selling out of it.

Where a total genuinely matters it is the **price** — and that has its own
permanent home at the foot of the configurator.

---

## 1b · COLOUR — I went backwards and this is the fix

**The regression, named.** Phase one's first draft had the eight kind hues on
every card as a full-height rail: indigo boats, rose motors, amber trailers,
teal accessories, violet packages. When the navy chrome arrived I pushed those
down to 7px dots and made the content area white-on-white. The rail got the
colour and the *content* lost it. That is the "gone backwards".

**The rule for phase two:**

| Surface | Colour |
|---|---|
| The rail | navy, and the module rows carry their kind hue as a 3px rail |
| A module card | its kind hue as a full-height left rail, and its photograph |
| A catalogue card | the photograph IS the colour |
| A configurator band | its kind hue on the band head |
| A figure | ink, always — never hue |
| Text | never on a hue fill |

The eight hues are already cut to equal luminance and measured on both grounds.
They exist. They are simply not being spent.

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

- **The continue strip.** Drafts in progress, resumable in one press. This is
  the single most valuable thing on the screen and it is currently four levels
  down.
- **The catalogue, entered by kind.** Four large photographic doors — Boats,
  Motors, Trailers, Parts — each showing what is in it, counted.
- **Recent and pinned.** What this person actually opens.
- The counted figures stay, but as a quiet strip, not as the subject.

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
| 7 | **URL state** | Deep-linkable builds. New: the app has no router. | Medium |

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
