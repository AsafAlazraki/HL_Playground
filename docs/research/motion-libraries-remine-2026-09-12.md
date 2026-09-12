# THE MOTION LIBRARIES, RE-MINED — EVERY COMPONENT NAMED

> Run 2026-09-12 against `docs/specs/DESIGN_SYSTEM.md`, which replaced
> `DESIGN_PRINCIPLES.md`. This supersedes the verdicts in
> `motion-libraries-2026.md` for everything that file did not enumerate. It does
> **not** supersede the Border Beam recipe or the "nothing gets installed" rule,
> both of which are carried forward and used below.
>
> **Nothing here proposes a dependency.** Every PORT is a native rebuild in our
> tokens on `motion` v13, which `package.json` carries at `^13.0.0` and
> `@xyflow/react` at `^12.11.2`. The engine is already here.

---

## 0 · THE ARITHMETIC, CORRECTED TWICE

`motion-libraries-2026.md` claimed 27 reactbits components and 100 magicui
components. The CORRECTION appended 2026-09-12 showed that only 9 and ~15 were
ever named. Enumerated today, **both totals in the original file are also
wrong**:

| library | original file claimed | actually enumerated today | how I counted |
|---|---|---|---|
| **reactbits** | 27, "none fits" | **171** | `https://www.reactbits.dev/llms.txt` §Text Animations/Animations/Components/Backgrounds, cross-checked against `https://www.reactbits.dev/sitemap.xml` — both give 32 + 38 + 45 + 56 = 171, and the per-category counts match exactly |
| **magicui** | 100, "three fit" | **78** | `https://magicui.design/llms.txt` §Components — 78 bullets, 78 distinct `/docs/components/*` URLs; the repo's `apps/www/content/docs/components/` holds 78 `.mdx` files (77 components + `index.mdx`, plus `client-tweet-card` documented inside another page) |

So the earlier run's own denominators were not read either. **171 and 78 are
read numbers.** 249 components are assessed below, every one named.

Excluded from reactbits' count and from assessment: the **React Bits Pro**
catalogue that `llms.txt` also lists (150 Pro Components, 280 Pro Blocks, 300
Pro App UI, 15 Templates, 20 Agent Kit). It is a paid, closed library, so I
cannot read what those components do, and I will not gate a thing I have not
seen — which is the entire defect this run exists to fix.

---

## 1 · THE FILTERS, AS THEY NOW STAND

The old three filters produced the old verdicts. Two of the three are deleted
(`DESIGN_SYSTEM.md` §9.2, §9.4) and the third is narrowed (§9.5). What replaces
them:

1. **Measure, do not cap.** The 6% alpha ceiling is gone. A surface is legal if
   text on it clears 4.5:1 over the full composited ancestor chain (§3).
2. **Material is on.** Glass, gradient, grain, sheen and depth are available
   (§5). "Invisible against a flattened surface" is no longer a verdict — the
   surface was flattened by a bridge stylesheet that is also gone.
3. **Frequency, per register.** The table governs Cockpit in full. It governs
   Showroom only in its top two rows. **A once-per-quote moment is the bottom
   row, and the bottom row is where the budget lives** (§6).
4. **Register.** Showroom *requires* a photographic product stage, depth, a
   choreographed entrance and ≥6× scale contrast. Cockpit *requires* 18 rows at
   1280×800, tabular figures, keyboard parity and **no entrance animation**.
5. **Port, never install.** The question is whether the idea is worth rebuilding
   in tokens.

**One filter that is genuinely ours and did most of the rejecting below.**
`tools/check-contrast.mjs` measures a *static composite* — it walks the ancestor
chain and reports one ratio per text node. **An animated ground has no single
ratio.** A shader that cycles a hue behind reading text cannot be measured by
the guard we have, which means it cannot be shown to clear 4.5:1, which means
under §3 it is not legal. That is not a taste claim about shaders; it is the
measurement §9.2 installed in place of the cap, applied honestly. It is also why
almost every entry in reactbits' 56-strong Backgrounds section is rejected while
the *static* version of the same idea is not.

**And one correction to the previous file, measured first-hand.** It records
"Progressive Blur shipped, at `build.css:796`." What is at
`src/features/quote/build.css:796` is a `mask-image: linear-gradient(...)`
bottom fade over the last `--s-5`, with `prefers-reduced-transparency` squaring
it off at :809. It is **not a blur**, and the comment above it argues against
one in terms: *"blur is not what this needs… at the cost of a compositor layer
over a scrolling list of hundreds of rows."* The shipped thing is the §5
scroll-edge fade; magicui's Progressive Blur as such is still unported, and the
file's own argument is the reason to keep it that way on a scrollport.
(Separately: the header comment at `build.css:108` still says *"There is no
`mask-image` left in this file"* — stale since the fade landed at :796.)

---

## 2 · THE PRODUCT PROBLEMS THIS IS BEING MINED FOR

Referenced as **P1–P6** in every table.

| | problem |
|---|---|
| **P1** | 588 Highfield variants distinguished only by colour codes — needs a variant picker that is beautiful and *legible as colour*. (588 is the figure as given in the brief; **not verified against the tree in this run.** The shape of the problem is verified: `docs/audit/access-and-responsive.md:261` records a real row rendering as `Highfield - RU230KAM (HYP) WH`.) |
| **P2** | A 7-step configurator needing orientation and a sense of progress. §9.6 explicitly reverses "no step rail" for this screen. |
| **P3** | The cascade — picking X removes already-chosen Y, and we must show that as **causality**, not as a notice. |
| **P4** | Large product photography as a hero stage. §2 SHOWROOM-1 requires it; we hold **108 seeded photographs** and per-colourway renders (`DESIGN_SYSTEM.md:79`). |
| **P5** | A dense grid — **15,691 rows across 53 tables** (`docs/audit/sheet-and-tables.md:57`) — that must stay fast and legible. |
| **P6** | Stage-to-stage navigation with no transition at all. |

---

## 3 · REACTBITS — ALL 171

Source: `https://www.reactbits.dev/llms.txt`, verified against
`https://www.reactbits.dev/sitemap.xml`. Descriptions are theirs; verdicts are
mine.

### 3.1 · Text Animations — 32

| # | component | verdict | reason |
|---|---|---|---|
| 1 | ASCII Text | REJECT | Renders a name as an ASCII field. `Highfield - RU230KAM (HYP) WH` has to stay a searchable, readable, read-aloud string. |
| 2 | Blur Text | **PORT-SHOWROOM** | Blur→crisp on the variant name as it lands on the stage. This is §5's "materialize, don't fade" applied to type. P1, P4. |
| 3 | Circular Text | REJECT | Nothing in a quote is set on a ring; our only round thing is a progress arc, and that carries a figure, not a word. |
| 4 | Count Up | REJECT | §6: the price figure does not tick — a dealer reads it aloud. The one non-price use (the home strip's "15,691 rows") is already built as deliberately static: `.dsh-strip` argues it in comment. |
| 5 | Curved Loop | REJECT | A marquee on a path. Nothing on a quote screen scrolls sideways without a person pushing it. |
| 6 | Decrypted Text | REJECT | Cycles random glyphs before settling. A SKU half-decoded is a SKU misread, and these are the dealer's own identifiers. |
| 7 | Depth Text | REJECT | Pointer-parallax extruded type over a photograph that already *is* the depth §2 asks for; two depth cues fight. |
| 8 | Echo Text | PORT-MAYBE | Ghosted copies trailing and settling is a legible way to say *this value was replaced by that one* on the cascade. P3. |
| 9 | Falling Text | REJECT | Gravity and bounce. §6 allows overshoot only when the gesture carried momentum; choosing a hull colour carries none. |
| 10 | Fold Text | PORT-MAYBE | Lines unfolding like creased paper is a plausible once-per-quote entrance for the issued quote document. Bottom row. |
| 11 | Fuzzy Text | REJECT | Vibrating type says the value is unstable. No figure on this screen is unstable, and implying it is a lie about the price file. |
| 12 | Glitch Text | REJECT | Same, louder. A glitched total beside a customer is alarming and untrue. |
| 13 | Gradient Text | REJECT | §3: a figure is never a hue, and a name is not the accent. |
| 14 | Masked Heading | **PORT-SHOWROOM** | The boat photograph showing through the marque glyphs, revealed word by word. This is P4 and the ≥6× scale-contrast requirement in one component. |
| 15 | Particle Text | REJECT | An ambient particle field, which §6 names specifically: not because it is expressive, because it sits behind a live price file. |
| 16 | Rotating Text | PORT-MAYBE | Cycling the dealer's nouns on the home hero ("40 boats · 12 motors · 8 trailers", §7). Hides content behind time, so it needs an argument. |
| 17 | Scrambled Text | REJECT | Cursor-driven distortion applied to text the dealer is in the middle of reading. |
| 18 | Scroll Float | REJECT | Needs a long scrolling page. `build.css` argues there is exactly one scrollport on the configurator, and it is the option rail. |
| 19 | Scroll Reveal | REJECT | Same missing trigger. |
| 20 | Scroll Velocity | REJECT | Same, and it scales distortion with scroll speed over rows of prices. |
| 21 | Shiny Text | PORT-MAYBE | A single-pass sheen. The Border Beam lesson (causality is spent after one pass) applied to a word — the "Issued" stamp, once. |
| 22 | Shuffle | REJECT | Characters shuffle before settling: same misreading risk as Decrypted Text, on the same strings. |
| 23 | Split Flap Text | PORT-MAYBE | A departure board is literally a *this replaced that* device, which is P3's job. Noisy; would need to be one flap, not a board. |
| 24 | Split Text | **PORT-SHOWROOM** | Per-word staggered entrance. §2 requires a choreographed entrance and §6 requires a 30–80ms stagger; this is the mechanism for the marque. |
| 25 | Stroke Text | PORT-MAYBE | Outline draws, then floods. A once-per-quote treatment for the total on the issued document. |
| 26 | Text Cursor | REJECT | Leaves copies of text behind the pointer, over a grid where the pointer is aiming at a 32px row. |
| 27 | Text Loop | REJECT | Marquee on an SVG path; §4 says a strip that does not fit scrolls *when pushed*, not on a timer. |
| 28 | Text Pressure | REJECT | Warps glyphs by pointer distance — over proper nouns a dealer reads to a customer. |
| 29 | Text Type | REJECT | The app must never appear to be typing the dealer's data; §8 forbids inventing a figure and a typewriter performs authorship of one. |
| 30 | True Focus | PORT-MAYBE | Blurs every word but the one in focus, in order. That is a description of a 7-step rail reading its current step. P2. |
| 31 | Variable Proximity | REJECT | Continuous restyling by pointer distance; §4 says the type step's weight carries hierarchy, so weight that moves makes the ramp lie. |
| 32 | Warp Text | REJECT | WebGL refraction on type that has to stay measurable by `check:contrast`. |

### 3.2 · Animations — 38

| # | component | verdict | reason |
|---|---|---|---|
| 33 | Animated Content | **PORT-SHOWROOM** | The generic on-mount entrance wrapper with direction/distance/duration. We have the idea in `features/views/stillness.tsx`; this is the shape to finish it into. |
| 34 | Antigravity | REJECT | A 3D particle field repelling the cursor, running continuously on the machine that also renders 53 tables. |
| 35 | Blob Cursor | REJECT | Replaces the pointer the dealer aims with. |
| 36 | Click Spark | PORT-MAYBE | Press feedback is *required* by §6. Sparks are not, at 400 presses a day — but once, on "Issue quote", is the bottom row. |
| 37 | Crosshair | REJECT | Replaces the system cursor; a dealer sharing a screen with a customer loses the pointer they are both looking for. |
| 38 | Cubes | REJECT | A 3D cube cluster where §2 requires the actual product, photographic and large. |
| 39 | Cursor Grid | REJECT | Lights grid cells around the cursor. The one grid we have holds 15,691 rows of the dealer's real prices. |
| 40 | Elastic Mesh | REJECT | A pointer-stretched surface under content that must not move while being read. |
| 41 | Electric Border | REJECT | A border that jitters reads as a validation error on a form full of fields. |
| 42 | Fade Content | PORT-MAYBE | Directional fade/slide wrapper — same family as Animated Content; we need one such primitive, not two. |
| 43 | Ghost Cursor | REJECT | Cursor trail. |
| 44 | Glare Hover | PORT-MAYBE | A moving glare on hover over a variant card. Showroom, but hovered a lot — row two, so near-imperceptible or nothing. |
| 45 | Glow Cursor | REJECT | Shader light trail on the pointer. |
| 46 | Gradual Blur | **PORT-COCKPIT** | The scroll-edge fade §5 requires instead of a hard divider. Extend to the register's sticky header and bottom bar. P5. |
| 47 | Halftone Reveal | REJECT | Resolves content around the cursor, i.e. content is unreadable until pointed at. |
| 48 | Image Trail | REJECT | Cursor image trail; we have 108 photographs and one place they belong, which is the stage. |
| 49 | Laser Flow | REJECT | Full-surface shader light with no state to indicate. |
| 50 | Logo Loop | REJECT | A brand marquee. The dealer does not need our logo and we do not carry theirs. |
| 51 | Magic Rings | REJECT | Ambient decoration with nothing to report. |
| 52 | Magnet | PORT-MAYBE | Elements ease toward the cursor and spring back. On a Cockpit control it moves the target you are aiming at; on a Showroom variant card, arguable. |
| 53 | Magnet Lines | REJECT | Field lines bending to the cursor; ambient. |
| 54 | Meta Balls | REJECT | Ambient liquid blobs. |
| 55 | Metallic Paint | REJECT | A shader over an SVG; our identity is the boat, not a material effect on a mark. |
| 56 | Noise | **PORT-SHOWROOM** | Film grain. We already ship `--grain-opacity`/`.ds-grain` under the *deleted* cap; a photographic hero at marque scale bands without it. §5 material is back on. P4. |
| 57 | Orbit Images | REJECT | Thumbnails in orbit around the subject, where the subject is supposed to be the largest thing on the screen. |
| 58 | Pixel Swap | PORT-MAYBE | Fragments assemble over a cover, swap the content underneath, dissolve. That is a *transition between two renders* — the colourway swap. P1. |
| 59 | Pixel Trail | REJECT | Cursor trail. |
| 60 | Pixel Transition | PORT-MAYBE | Same family, hover-triggered. Same P1 use; needs to be selection-triggered, not hover, because hover here is row two. |
| 61 | Ribbons | REJECT | Physics cursor trail. |
| 62 | Ripple Distortion | REJECT | Warps the content it passes over; the content is a price. |
| 63 | Scroll Expand | **PORT-SHOWROOM** | A rounded media frame growing to full bleed. Drive it by *selection* instead of scroll and it is the variant-card → product-stage move. P4, P6. |
| 64 | Shape Blur | REJECT | A morphing blurred shape with no state behind it. |
| 65 | Splash Cursor | REJECT | Cursor effect. |
| 66 | Star Border | REJECT | Orbiting twinkle. The Border Beam finding was that a wide strip wants one linear pass, not an orbit — twinkle is the orbit plus noise. |
| 67 | Sticker Peel | REJECT | A corner lifting off a price card reads as damage to the document. |
| 68 | Strands | REJECT | Ambient glowing ribbons. |
| 69 | Swarm Cursor | REJECT | Cursor effect. |
| 70 | Target Cursor | REJECT | Four corners locking onto targets is a focus ring, and §6 makes keyboard-initiated motion a disqualifier, not a judgement call. |

### 3.3 · Components — 45

| # | component | verdict | reason |
|---|---|---|---|
| 71 | Accordion Gallery | **PORT-SHOWROOM** | Panels expanding to parallax imagery and captions — a real shape for the 3-series catalogue where each panel is a hull. P1, P4. |
| 72 | Animated List | **PORT-SHOWROOM** | Staggered list entrance; `.ds-rise` with `style={{'--i': index}}` already does this at `shell.css:1409`. Confirmed, not new. |
| 73 | Border Glow | PORT-MAYBE | The Border Beam family, re-opened by §9. Worth re-measuring as a 1px lit edge on the cascade's affected card. P3. |
| 74 | Bounce Cards | REJECT | Bounce on mount, with no gesture momentum to justify overshoot (§6). |
| 75 | Bubble Menu | REJECT | Hides destinations behind an expand. §2 COCKPIT-1: a nav surface shows every destination without scrolling. |
| 76 | Card Nav | PORT-MAYBE | An expandable bar whose panels reveal nested links — a shape for the module switcher, if it can still show everything at rest. |
| 77 | Card Swap | PORT-MAYBE | Cards trading position with a layout transition. P6, if the two stages genuinely share an element. |
| 78 | Carousel | PORT-MAYBE | We need a variant browser; 588 items is not a carousel, but one model's colourways is. P1. |
| 79 | Chroma Grid | **PORT-SHOWROOM** | Grayscale tiles revealing colour. **Invert it** and it is P1 exactly: a grid of colourway renders where colour is the content, not the reward. The single best idea in either library for our worst-named problem. |
| 80 | Circular Gallery | REJECT | An orbit of images; a dealer compares two hulls side by side, and an orbit puts one behind the other. |
| 81 | Counter | REJECT | Same as Count Up — §6 keeps the figure still. |
| 82 | Curved Input | REJECT | An arc-bent input in an app where a dealer types into dense forms all day; the caret follows the curve and so must their eye. |
| 83 | Decay Card | REJECT | Disintegrating content. Nothing in a quote decays, and animating decay over a live line item is a claim about the data. |
| 84 | Depth Carousel | PORT-MAYBE | Notable because it is drag **and keyboard and** auto-advance. Keyboard parity is a §2 COCKPIT requirement; borrow that, not the depth rail. |
| 85 | Dock | PORT-MAYBE | Proximity magnification. Cockpit nav is row two so it must be near-imperceptible; a Showroom module launcher could carry it. |
| 86 | Dome Gallery | REJECT | Projects images onto a hemisphere, which distorts the one thing (the hull) whose shape is the product. |
| 87 | Drift Wall | REJECT | An endless perspective wall. The catalogue is finite, countable and searched, not wandered. |
| 88 | Elastic Slider | PORT-MAYBE | Spring-snapping numeric input. Legal if the spring is critically damped (§6: damping 1.0 by default). |
| 89 | Flowing Menu | **PORT-SHOWROOM** | The active indicator *gliding* between items is the P2 step rail and the Cockpit current-row marker. Take the glide; leave the liquid. |
| 90 | Fluid Glass | REJECT | Refractive distortion over content. §5 allows material and forbids reading through a lens that moves what you are reading. |
| 91 | Flying Posters | REJECT | Infinite scroll-rotated 3D posters; no scroll page and no posters. |
| 92 | Folder | PORT-MAYBE | An opening folder for the quote's line-item groups — but a disclosure that is already solved by a band head with a caret. |
| 93 | Glass Icons | REJECT | §5 is explicit that **bigger surfaces read as thicker**; a 20px frosted icon inverts the rule at the smallest size in the system. |
| 94 | Glass Surface | **PORT-SHOWROOM** | Apple-style glass with lighting. §9.3 deletes "glass is retired" *and* the bridge that zeroed every blur token. The cascade sheet and the floating price bar are the two surfaces that want it. P3. |
| 95 | Gooey Nav | REJECT | The indicator changes shape mid-travel, which makes the target ambiguous at the exact moment the user is aiming at it. |
| 96 | Infinite Menu | REJECT | Endless wrap. A dealer must be able to reach the end of a list of seven stages and know it is the end. |
| 97 | Infinite Spiral | REJECT | Same, in 3D. |
| 98 | Lanyard | REJECT | A swinging 3D badge; there is no badge in a quote and nothing on this screen should keep moving after it arrives. |
| 99 | Line Sidebar | REJECT | Nav rows shift toward the cursor — the row moves while you are aiming at it, in the surface §2 says must show every destination. |
| 100 | Magic Bento | PORT-MAYBE | Home is Showroom and is a tile grid; the dashboard was already redesigned, so this is a comparison, not a gap. |
| 101 | Masonry | **PORT-SHOWROOM** | Animated reflow for the photograph gallery. This is layout, not decoration, and 108 photographs is a masonry-shaped problem. P4. |
| 102 | Model Viewer | REJECT | three.js + orbit controls needs meshes. We hold photographs and per-colourway renders; we do not hold models, and §8 forbids inventing what the data does not carry. |
| 103 | Morph Slider | REJECT | A displacement melt between two images. The colourway swap must read as *the same boat in another colour*; a melt hides the exact difference being shown. |
| 104 | Option Wheel | PORT-MAYBE | A curved picker driven by scroll, drag **or arrow keys**, tilting items away from the selection. The keyboard path and the "selection is the focal point" idea both transfer to P1; the wheel does not. |
| 105 | Pill Nav | **PORT-COCKPIT** | A sliding active highlight with no gooey. The register's lens switcher and the Cockpit nav's current row, at row-two intensity. |
| 106 | Pixel Card | PORT-MAYBE | Pixel-expansion reveal; same family as Pixel Swap and useful for the same P1 render swap. |
| 107 | Profile Card | REJECT | A 3D-tilting person card. There are no people in a quote; the customers module lists companies and contacts in a table. |
| 108 | Reflective Card | REJECT | It reflects the **webcam**. A dealer's camera turning on next to a customer is a privacy incident, not a design decision. |
| 109 | Scroll Stack | PORT-MAYBE | Overlapping cards revealing on scroll — the quote document is the only genuinely long scroll we have. |
| 110 | Specular Button | PORT-MAYBE | A rim light sweeping a glass button. On "Issue quote", once per quote, that is the bottom row. |
| 111 | Spotlight Card | PORT-MAYBE | Cursor spotlight. Stays rejected in Cockpit (hovered hundreds of times a day); re-openable on a Showroom surface touched once per quote — exactly as the CORRECTION left it. |
| 112 | Stack | PORT-MAYBE | A layered swipeable stack; a possible shape for comparing two variants side by side, which is what a dealer actually does. |
| 113 | Staggered Menu | **PORT-SHOWROOM** | Staggered open/close. The picker *arriving* is the canonical bottom-row moment named in §6. P1. |
| 114 | Stepper | **PORT-SHOWROOM** | An animated multi-step progress indicator. §9.6 reverses "no step rail and no progress at all" for the configurator specifically and calls HelmLogic's step rail "the single clearest thing it does better than us". This is P2 and it is the top of the build list. |
| 115 | Tilted Card | PORT-MAYBE | Pointer tilt on a card carrying the product photograph — close to the stage idea, but hovered too often to be free. |

### 3.4 · Backgrounds — 56

The governing reason, stated once: **`tools/check-contrast.mjs` measures a
static composite.** An animated ground has no single ratio, so under §3 (which
replaced the alpha cap with a measurement) it cannot be shown legal. Where the
*static* version of the idea is legal and useful, that is said. Where a reject
has a second, sharper product reason, that is said too.

| # | component | verdict | reason |
|---|---|---|---|
| 116 | Acid Squares | REJECT | Animated ground; unmeasurable under `check:contrast`. |
| 117 | Aero Shards | REJECT | Continuous GPU ground on the same machine that renders 53 tables. |
| 118 | Aurora | PORT-MAYBE | A soft coloured ground behind the picker. §3 now allows Showroom to saturate — legal **static**, or confined to a region carrying no text. |
| 119 | Balatro | REJECT | Animated shader ground. |
| 120 | Ballpit | REJECT | Named in §6 by name: not because it is expressive, because it sits behind a live price file. |
| 121 | Beams | PORT-MAYBE | Crossing light ribbons. §2 SHOWROOM-2 requires light from **one** direction; a static single beam implements that literally. P4. |
| 122 | Color Bends | REJECT | Animated ground. |
| 123 | CRT Warp | REJECT | Curves the content plane; our content is a column of money that lines up on the decimal. |
| 124 | Dark Veil | REJECT | Animated ground with post-processing. |
| 125 | Dither | PORT-MAYBE | Ordered dither is a themable grain with no PNG — a better `.ds-grain` than the one we ship. |
| 126 | Dot Field | REJECT | Cursor bulge, glow and sparkle on a dot field; the cursor belongs to the grid. |
| 127 | Dot Grid | PORT-MAYBE | A static dot ground behind the Showroom hero is legal and measurable. |
| 128 | Evil Eye | REJECT | A procedural eye. There is no reading of a boat quote where this belongs. |
| 129 | Faulty Terminal | REJECT | Performs malfunction. §8: a suggestion that is confidently wrong is worse than none, and a UI that performs a fault is worse still. |
| 130 | Ferrofluid | REJECT | Cursor-magnet fluid ground. |
| 131 | Floating Lines | REJECT | Cursor-reactive 3D lines. |
| 132 | Galaxy | REJECT | Parallax starfield behind a price. |
| 133 | Ghost Fibers | REJECT | Animated ground. |
| 134 | Gradient Blinds | REJECT | Spotlight plus noise distortion, moving, behind text. |
| 135 | Gradient Waves | REJECT | Animated water. Thematically apt and still unmeasurable. |
| 136 | Grainient | PORT-MAYBE | Grain over a gradient is precisely the §5 material ground; freeze it and it is legal. |
| 137 | Grid Distortion | REJECT | Warps a grid to the cursor; ours is the data. |
| 138 | Grid Motion | REJECT | Perspective grid driven by cursor position. |
| 139 | Grid Scan | REJECT | Animated 3D room scan. |
| 140 | Hyperspeed | REJECT | Motion lines on click-hold; a press in this app means "commit to a line item". |
| 141 | Iridescence | REJECT | Shifting hue behind reading text. |
| 142 | Letter Glitch | REJECT | Matrix letters behind a document a customer is reading. |
| 143 | Lightfall | REJECT | Animated ground. |
| 144 | Lightning | REJECT | Flicker behind a form; §6 bars motion that has no state to indicate. |
| 145 | Light Pillar | REJECT | Same idea as Light Rays, and §3 says one accent marks the primary action — two light sources mark nothing. |
| 146 | Light Rays | PORT-MAYBE | Directional volumetric light. Static, behind the product stage, it *is* §2's single light direction. P4. |
| 147 | Light Tunnel | REJECT | Depth tunnel behind a flat document. |
| 148 | Line Waves | REJECT | Animated ground. |
| 149 | Liquid Chrome | REJECT | Animated ground. |
| 150 | Liquid Ether | REJECT | Cursor-driven fluid ground. |
| 151 | Molten Metal | REJECT | Animated ground. |
| 152 | Orb | REJECT | A hovering energy orb with no state behind it. |
| 153 | Particles | REJECT | §6, by name. |
| 154 | Pixel Blast | REJECT | Bursts behind content that must not flash beside a customer. |
| 155 | Pixel Snow | REJECT | Seasonal decoration over a price file. |
| 156 | Plasma | REJECT | Animated ground. |
| 157 | Plasma Wave | REJECT | Animated ground. |
| 158 | Prism | REJECT | Rotating geometry behind the subject. |
| 159 | Prismatic Burst | REJECT | Full-bleed burst; §3 — if everything is accent, nothing is primary. |
| 160 | Radar | REJECT | A sweep implies scanning; nothing in this app searches over time, and a fake progress indicator is the §8 "confidently wrong" failure. |
| 161 | Ripple Grid | REJECT | Continuous ripple behind reading text. |
| 162 | Scanner | REJECT | Same false-progress claim as Radar, calmer. |
| 163 | Shape Grid | REJECT | Duplicate of Dot Grid with more shapes; one ground is enough. |
| 164 | Side Rays | REJECT | Duplicate of Light Rays from the edge; the stage needs one light. |
| 165 | Silk | PORT-MAYBE | Soft waves with soft lighting — the most defensible animated ground in the section, and still only legal frozen or behind nothing textual. |
| 166 | Sliced Waves | REJECT | An equalizer implies audio levels we do not have. |
| 167 | Soft Aurora | REJECT | Duplicate of Aurora. |
| 168 | Threads | REJECT | Animated ground. |
| 169 | Topography | PORT-MAYBE | A contour map. For a marine dealer this is the one background whose *subject* is right; static, at low contrast, behind the hero. P4. |
| 170 | Waves | REJECT | Animated water behind a live price file is the ball-pit argument with better taste. |
| 171 | Web Threads | REJECT | Animated ground. |

---

## 4 · MAGICUI — ALL 78

Source: `https://magicui.design/llms.txt` §Components, cross-checked against
`apps/www/content/docs/components/*.mdx` in `magicuidesign/magicui`.

| # | component | verdict | reason |
|---|---|---|---|
| 1 | Android | REJECT | A device mockup. We sell boats; there is no phone in the quote. |
| 2 | Animated Beam | **PORT-COCKPIT** | A travelling line between two elements. Two uses: the relationship canvas (`@xyflow/react` is already a dependency), and **P3** — a line from the option you picked to the option it removed. Causality drawn, once. |
| 3 | Animated Circular Progress Bar | PORT-MAYBE | The 7-step completeness as a ring beside the step rail. P2, if the rail does not already say it. |
| 4 | Animated Gradient Text | REJECT | §3: a name is not accent, a figure is never a hue. |
| 5 | Animated Grid Pattern | REJECT | Animated ground; no static ratio to measure. |
| 6 | Animated List | **PORT-SHOWROOM** | Already built as `.ds-rise`. Confirmed. |
| 7 | Animated Shiny Text | PORT-MAYBE | One-pass sheen on the "Issued" stamp. |
| 8 | Theme Toggler | **PORT-COCKPIT** | View Transitions plus an animated clip-path mask. We ship both themes; a theme switch happens once a session, which is the bottom row even in Cockpit terms, and the technique is the same one P6 wants. |
| 9 | Aurora Text | REJECT | §3, as above. |
| 10 | Avatar Circles | PORT-MAYBE | Overlapping avatars for the pipeline board's owners — real, small. |
| 11 | Backlight | **PORT-SHOWROOM** | A glow behind an image or SVG. §2 SHOWROOM-2 requires depth with light from one direction, and a cut-out render on a lit ground is that in one move. P4. |
| 12 | Bento Grid | PORT-MAYBE | Home layout; already redesigned, so a comparison not a gap. |
| 13 | Blur Fade | **PORT-SHOWROOM** | Blur and opacity together on enter. §5 says "materialize, don't fade" and this is the primitive that does it. |
| 14 | Border Beam | **PORT-SHOWROOM** | Re-opened by §9. The 2026-09-10 deletion measured it as a **9–15% wash** over an already-washed head; it was never measured as a **1px luminance edge**, which is what it is. Re-port as a one-pass linear sweep (not a conic orbit — the 773×56 finding stands) on the cascade's affected card. P3. |
| 15 | Client Tweet Card | REJECT | Renders a tweet. |
| 16 | Code Comparison | REJECT | Diffs two code snippets; our diffs are price rows and the register already shows them with tabular figures. |
| 17 | Comic Text | REJECT | A comic treatment on a document a customer signs. |
| 18 | Confetti | REJECT | A quote for a six-figure boat is a commitment, not a win screen — and §6 bars ambient particles over a live price file. |
| 19 | Cool Mode | REJECT | Emits particles from a button a dealer presses hundreds of times a day. |
| 20 | Dia Text Reveal | PORT-MAYBE | A colour band sweeping across text and settling to base colour — a one-pass, legible *this line changed* for P3. |
| 21 | Dock | PORT-MAYBE | As reactbits Dock. |
| 22 | Dot Pattern | PORT-MAYBE | A static SVG dot ground: legal, themable, measurable. |
| 23 | Dotted Map | PORT-MAYBE | The customers module has locations; weak, but it is real data rather than decoration. |
| 24 | File Tree | PORT-MAYBE | A tree of structure. We have tables, columns and joins, and a canvas that already draws them. |
| 25 | Flickering Grid | REJECT | Animated ground, and the word "grid" here means ours holds 15,691 rows. |
| 26 | Floating 3D Particles | REJECT | §6, by name. |
| 27 | Glare Hover | PORT-MAYBE | As reactbits Glare Hover — row two. |
| 28 | Globe | REJECT | A WebGL globe. A quote has no geography; the dealer sells in one market. |
| 29 | Glyph Matrix | REJECT | An animated grid of shifting glyphs behind a screen whose subject is a grid of real values. |
| 30 | Grid Pattern | PORT-MAYBE | Static ground; legal. |
| 31 | Hero Video Dialog | **PORT-SHOWROOM** | Swap video for photograph and this is "press the stage, get the full-bleed render" — P4, and the one dialog on a Showroom screen that earns a scrim (§5: dim to focus). |
| 32 | Hexagon Pattern | PORT-MAYBE | Static ground; weaker than dots, same legality. |
| 33 | Highlighter | **PORT-SHOWROOM** | A marker stroke that mimics a human hand. **P3**: strike the removed line the way a person would, over 260ms, once. We already have a refusal strike; this is the ported upgrade. |
| 34 | Hyper Text | REJECT | Scrambles letters before revealing; a variant name half-scrambled is a name misread. |
| 35 | Icon Cloud | REJECT | A 3D tag cloud, where §4 bars uppercase labels as names and this is a ball of them. |
| 36 | Interactive Grid Pattern | REJECT | Cells light under the cursor; ours carry the dealer's prices. |
| 37 | interactive-hover-button | PORT-MAYBE | A hover treatment on a button; we have `--button-h-md` and a press spec already, so this is a comparison. |
| 38 | iPhone | REJECT | Device mockup. |
| 39 | Kinetic Text | REJECT | Animates **font weight** on hover. §4: size, weight, leading and tracking travel together as a step — weight that moves makes the ramp lie about hierarchy. |
| 40 | Lens | **PORT-SHOWROOM** | Zoom into an image. **P1**: 588 variants told apart by a code, where the difference is a hull/tube colour join two inches wide in the render. A lens on focus is the difference made visible. |
| 41 | Light Rays | PORT-MAYBE | Static, as reactbits Light Rays. P4. |
| 42 | Line Shadow Text | REJECT | A moving shadow on display type that sits over a photograph already lit from one direction; two light sources, one stage. |
| 43 | Magic Card | PORT-MAYBE | Cursor spotlight — stays rejected in Cockpit, re-openable on a once-per-quote Showroom surface. |
| 44 | Marquee | PORT-MAYBE | §4 says a strip that does not fit **scrolls**; a marquee is one way, but ours should scroll when pushed rather than on a timer. |
| 45 | Meteors | REJECT | Ambient. |
| 46 | Morphing Text | REJECT | Morphs one string into another; both are the dealer's values and the midpoint is neither. |
| 47 | Neon Gradient Card | REJECT | §3: one accent marks the primary action. |
| 48 | Noise Texture | **PORT-SHOWROOM** | `feTurbulence` grain with desaturation and contrast controls — a themable, resolution-free replacement for the grain we ship, which §5 has now switched back on. |
| 49 | Number Ticker | REJECT | §6, unchanged and restated there: the price does not count up because a dealer reads it aloud. |
| 50 | Orbiting Circles | REJECT | Orbit with nothing in the centre that needs orbiting. |
| 51 | Particles | REJECT | §6, by name. |
| 52 | Pixel Image | **PORT-SHOWROOM** | A pixelated image resolving. Used as a low-quality placeholder it is the honest loading state for 108 photographs on a stage that must not pop. P4. |
| 53 | Pointer | REJECT | Replaces the cursor. |
| 54 | Progressive Blur | PORT-MAYBE | The idea is right and the shipped answer at `build.css:796` is a **mask fade, not a blur** — the file argues blur costs a compositor layer over hundreds of scrolling rows. Keep the fade on scrollports; the blur is arguable only on the *static* chrome edge. P5. |
| 55 | Pulsating Button | REJECT | A control that pulses forever is a nag with no sentence. §7: a refusal or a prompt is a sentence with a reason, in the place where it applies. |
| 56 | Rainbow Button | REJECT | §3: if everything is accent, nothing is primary. |
| 57 | Retro Grid | REJECT | Animated ground. |
| 58 | Ripple | REJECT | Ambient ripple behind an element with no state to indicate. |
| 59 | Ripple Button | **PORT-COCKPIT** | Press feedback is *required* by §6 — including under reduced motion, where "a press that stops confirming itself is a worse interface". Port as the one press primitive: pointer-down, 100–160ms, transform and opacity only. |
| 60 | Safari | REJECT | Browser mockup. |
| 61 | Scroll Based Velocity | REJECT | No scroll page to drive it. |
| 62 | Scroll Progress | PORT-MAYBE | The issued quote document is the one genuinely long scroll we have. |
| 63 | Shimmer Button | PORT-MAYBE | Perimeter light travelling — the Border Beam family on the primary action, once. |
| 64 | Shine Border | PORT-MAYBE | Same family, simpler; the cheapest honest test of the re-opened Border Beam question. |
| 65 | Shiny Button | PORT-MAYBE | Same family again; we need one, not three. |
| 66 | smooth-cursor | REJECT | Physics-smoothed cursor, in an app where the pointer must land on a 32px row inside 15,691 of them. |
| 67 | Sparkles Text | REJECT | Continuous sparkle over reading text. |
| 68 | Spinning Text | REJECT | Circular type; nothing here is set on a ring. |
| 69 | Striped Pattern | PORT-MAYBE | Static ground; legal and measurable. |
| 70 | Terminal | REJECT | §7 bars jargon in chrome, and a terminal is jargon made into a surface. |
| 71 | Text 3D Flip | REJECT | Per-letter 3D flip on hover, over names. |
| 72 | Text Animate | **PORT-SHOWROOM** | A general text-entrance component with selectable variants — the primitive behind the marque's arrival, and the place to encode our 30–80ms stagger once. |
| 73 | Text Reveal | REJECT | Scroll-driven; no trigger. |
| 74 | Tweet Card | REJECT | Renders a tweet. |
| 75 | Typing Animation | REJECT | The app performing authorship of the dealer's data. |
| 76 | Video Text | REJECT | We hold photographs, not video — and the boat is the subject, not the word it is showing through. |
| 77 | Warp Background | REJECT | Animated warping ground. |
| 78 | Word Rotate | PORT-MAYBE | Vertical word rotation for the home hero's dealer nouns (§7). Hides content behind time, so it needs an argument. |

---

## 5 · THE TALLY

Counted off the tables above, not estimated.

| verdict | reactbits | magicui | total |
|---|---|---|---|
| PORT-SHOWROOM | 14 | 10 | 24 |
| PORT-COCKPIT | 2 | 3 | 5 |
| PORT-MAYBE | 37 | 23 | 60 |
| REJECT | 118 | 42 | 160 |
| **total** | **171** | **78** | **249** |

reactbits by its own four sections: Text Animations 3 / 0 / 7 / 22 · Animations
3 / 1 / 6 / 28 · Components 8 / 1 / 16 / 20 · Backgrounds 0 / 0 / 8 / 48.

The headline finding is not that the old verdicts were wrong about what they
looked at. It is that **29 components across the two libraries are worth
porting outright and 60 more are worth an argument**, and almost none of them
were in the nine and the fifteen that were examined. "None fits" and "three fit"
were findings about cursor effects and animated backgrounds, and those two
families are still exactly where the rejections land — **76 of the 94 entries in
reactbits' Animations and Backgrounds sections reject**, while its Components
section, which nobody had opened, yields 8 outright ports including the two best
ideas in this document. The verdict was right about the sample and the sample
was the wrong half of the library.

---

## 6 · RECENT.DESIGN — TYPOGRAPHY AND MOTION, ACTUALLY LOOKED AT

`https://recent.design/` (formerly godly.website). Categories filter by query
param: `https://recent.design/?category=typography`. Facet counts read from the
page's own payload on 2026-09-12:

| category | posts |
|---|---|
| Motion | **237** |
| Interface | 133 |
| Web | 102 |
| Branding | 89 |
| Print | 71 |
| Illustration | 41 |
| Product | 12 |
| Typography | **3** |
| Editorial | 3 |
| Packaging | 3 |

### 6.1 · Typography — all 3, in full

There are three. Not a sample; the whole category.

| entry | what it is | transfers? |
|---|---|---|
| **Leading and Measure** (`/i/...`) | "A clean typographic explainer pairs body text with an **interactive spacing chart** to show how line length affects leading." | **Yes.** This is the only one, and it is directly ours: it is a *tool* about type, not type as a picture. §4 says the step is a set — size, weight, leading and tracking travel together — and `/design.html` already draws every surface. An interactive leading/measure chart is what `/design.html` is missing for the ramp. |
| **Typography Series** | "A minimalist kinetic typography series exploring Japanese words through varied experimental letterforms and textures on a clean white background." | No. Letterforms as artwork; our strings are the dealer's data. |
| **Six Bespoke Typefaces** | "A refined typography specimen series with glyph construction, character sets, and brand preset layouts presented in a clean editorial grid." | Partly. The **specimen-grid form** transfers to `/design.html` — showing every step of the ramp at once, with its tracking and leading, is how you catch the 56px hole §4 exists to fix. |

The previous run dismissed this category as "not software". Two of the three
are not software. **The third is a tool, and it is about the exact thing §4 is
about.**

### 6.2 · Motion — all 237 enumerated, and what is actually in there

All 237 titles were captured by driving the category feed to the end of its
infinite scroll in real Chromium. The previous run's "not software" is
**directionally right and materially incomplete**: the category is dominated by
motion-graphics reels, character animation, 3D loops and brand idents — but
**85 of the 237 are interface microinteractions**, by my hand classification of
the titles and descriptions (that split is a judgement; the 237 is a count).

What is actually there, and what transfers:

**Transfers directly to a problem we have:**

| entry | why |
|---|---|
| **Status Picker Interaction** — hovering an avatar reveals animated status options that snap back to a colour-coded badge on selection | **P1.** A colour-coded badge that *is* the selection, with the options fanning out and collapsing back into it. That is a variant picker for 588 colourways in one gesture. |
| **Credits Stepper Microinteraction** | **P2.** A stepper whose state is the subject. |
| **AI Task Progress Pills** | **P2.** Progress as a row of pills rather than a bar — survives a dealer leaving and returning, which §9.6 says is the reason the rail is back. |
| **Playful Delete Interaction** / **Delete Confirm Microinteraction** / **Particle Text Deletion** / **Cookie Banner Destruction** | **P3.** Four separate published takes on *showing a thing being removed*. That is the cascade's job, and §8 says an undoable act gets a toast with UNDO — these are what the removal itself should look like before the toast arrives. |
| **Journal App Detail Transition** / **Portfolio Theme Transition** / **SwiftUI Ripple Transition** / **Genie Effect** ("genie effect for the web") | **P6.** Four shipped approaches to stage-to-stage movement, which we currently do not do at all. The Genie effect in particular is the shared-element expansion in its most legible form. |
| **Floating Preview Chips** | **P1/P5.** A preview that floats beside the row without leaving the list — the "peek" pattern `dense-tables-and-selection.md` already researched. |
| **Scrollbar BUT Cooler** / **CSS Anchor Filter Dot** / **SVG Highlighted Navigation** | **P5/P2.** Three takes on the active-position indicator: the first on a scrollport, the last two on a nav. All three are the Flowing Menu/Pill Nav idea again, arriving from a different direction. |
| **Realistic Button** / **Skeuomorphic CSS Button** / **Glossy Toggle** / **Jelly Switch** | Press feedback with real depth. §6 requires press on pointer-down at 100–160ms; these are what that can look like now that §5 has material back on. |
| **Glass Toolbar** / **Liquid Glass Design System** / **Shader Glass Buttons** | §9.3 deleted "glass is retired". This is what the rest of the field did with the year we spent with every blur token set to `0px`. |
| **Animated Number Concepts** / **CSS Count Up Animations** | Worth naming because they are the thing §6 still rejects — the price does not tick. Recorded so the next session sees that it was looked at, not skipped. |

**Does not transfer, and this is most of the category:** motion-graphics reels
(The New Normal, AI Vision), character and mascot animation (Sneezing
Character, Winged Archer, Blue Mascot, Zoah Logo Character, AI Desktop
Companion), 3D loops and studies (Minesweeper Spill, Recursive Cube Loop,
Rotating Torus Loop, 3D Knot, Particle Cube), brand idents (Grok Bot, SpaceX AI
Logo Reveal, Vercel for Retail, Obsession Studio, Composio), app-icon animation
(Figma Motion App Icons, Animated App Icons, MyVinyl, Milana), poster and
editorial motion (Wild Week Poster, Rosso Corsa, Lecture Poster), and a long
tail of kinetic-type reels (YES, Living Letters, Kinetic Letterform, Gooey
Letter Morph, Tornado Text Reveal, Airbrush Typography, Refracted Type Motion).

**The structural point the previous run was reaching for and overstated:** a
gallery optimises for the screenshot, and a tool is judged on the four-hundredth
press. That is still true. It is not a reason to skip the category — the hit
rate is roughly one in three for the interface subset, and three of our six open
problems have published, dated, named prior art sitting in it.

**Worth a separate run:** the **Interface** category holds **133** posts and
nobody in this repo has ever opened it. That is the category whose entire
subject is operable software.

---

## 7 · BUILD THESE FIRST — RANKED, WITH THE PORT

Every one of these is a native rebuild in `src/styles/system.css` tokens on
`motion` v13. No installs. Durations and curves are §6's; none is invented.

### 1 · The step rail — P2

*From: reactbits **Stepper**, reactbits **Flowing Menu**, magicui **Pill Nav**,
recent.design **Credits Stepper** and **AI Task Progress Pills**.*

§9.6 reverses "no step rail and no progress at all" for the configurator
specifically, and calls the original HelmLogic's rail the single clearest thing
it does better than us. **Port:** seven `<li>` in a `<nav>`, current marked
`aria-current="step"`, each step reachable by keyboard with the shortcut
rendered inline (§2 COCKPIT-3, which a Showroom screen should still honour). The
travelling indicator is **one** absolutely-positioned element moved with
`layoutId`, written as a full `transform` string — §6 says the `x`/`y`/`scale`
shorthand is not hardware-accelerated. 200ms on `--ease-out`, damping 1.0, **no
overshoot**: pressing "next" carries no momentum. Reduced motion: the indicator
jumps and the colour stays.

### 2 · The variant picker — P1

*From: reactbits **Chroma Grid** (inverted), magicui **Lens**, reactbits
**Option Wheel** (keyboard only), recent.design **Status Picker Interaction**.*

**Port:** a CSS grid of colourway tiles at `--r-card`, each carrying its
per-colourway render, the code (`(HYP) WH`) set beneath in IBM Plex Mono at
`--t-caption` so the dealer's own identifier is never uppercased or truncated
(§4). Chroma Grid's mechanic inverted — colour is the *content*, not the hover
reward; hover does nothing, because a Showroom grid is still hovered a hundred
times a session (row two). **Selection** is what animates: the chosen tile takes
`--kind` as a rail and the render scales 1 → 1.04 over 180ms. Arrow-key
navigation from Option Wheel, without the wheel. **Lens** on focus or press:
2× over the hull/tube join, which is the only part of the render that differs
between two codes. Entrance is Staggered Menu's: 40ms stagger, once, bottom row.

### 3 · The cascade, drawn as causality — P3

*From: magicui **Animated Beam**, magicui **Highlighter**, magicui **Border
Beam** (re-opened), recent.design's four delete interactions.*

**Port:** on the cascade sheet, an SVG path from the option just picked to the
option being removed, drawn once with `stroke-dasharray`/`stroke-dashoffset`
over 420ms on `--ease-out`. Then **Highlighter**'s hand-drawn marker stroke
lands on the removed line over 260ms and **stays** — the strike is state, the
beam is the explanation, and the explanation is spent after one pass (the Border
Beam finding, carried forward intact). The affected card takes a **one-pass
linear sweep**, not a conic orbit: the 2026-09-10 measurement that the light
crawls the long edges of a 773×56 strip is correct and kept. What is re-opened
is the *deletion*: that sweep was measured as a 9–15% **wash** over an
already-washed head, and never as a **1px luminance edge**, which is what it is.
Measure the edge, on the real surface, before deciding again.

### 4 · The hero stage — P4

*From: magicui **Backlight**, magicui **Blur Fade**, magicui **Pixel Image**,
reactbits **Masked Heading**, reactbits **Split Text**, reactbits **Noise** /
magicui **Noise Texture**, reactbits **Scroll Expand**.*

**Port:** the render sits on a radial glow derived from `--kind`, one light
direction, §2 SHOWROOM-2. It arrives with **blur 12px → 0 and scale 0.96 → 1
animated together** — §5's "materialize, don't fade", and §6's ban on
`scale(0)`. `feTurbulence` grain over the top at whatever alpha measures clean,
now that the 6% cap is deleted and the test is the measurement. Before the
photograph resolves, Pixel Image's low-quality placeholder rather than a pop.
The marque takes Split Text: per word, 40ms stagger, `--ease-out`, up to 620ms
total for a Showroom scene change. Masked Heading — the photograph showing
through the glyphs — is the catalogue hero specifically, where the marque and
the stage are the same object.

### 5 · Stage-to-stage — P6

*From: reactbits **Scroll Expand** (selection-driven), reactbits **Card Swap**,
magicui **Theme Toggler**'s View Transitions, recent.design **Genie Effect** and
**Journal App Detail Transition**.*

**Port:** `view-transition-name` on the shared element — the variant card's
render becoming the stage's render — at 320ms on `--ease-in-out`, with motion's
`layoutId` as the fallback where View Transitions are unavailable. **Exit faster
than enter** (§6). Never lock input during it; animate from the presentation
value so an interrupted transition does not jump. Cockpit stages still paint —
§2 COCKPIT-4 is not relaxed by this.

### 6 · The grid's edges — P5

*From: reactbits **Gradual Blur**, magicui **Progressive Blur**.*

**Port:** the mask fade already at `build.css:796` generalised into a token and
applied to the register's sticky header edge and its bottom action bar — §5
requires a scroll-edge fade where floating chrome overlaps content, "not a 1px
border". Keep it a **mask, not a blur**: `build.css`'s own comment is right that
a compositor layer over hundreds of scrolling rows is the wrong trade, and 53
tables at 15,691 rows is the reason. Fix the stale comment at `build.css:108`
while there.

### 7 · Glass, switched back on

*From: reactbits **Glass Surface**, recent.design **Glass Toolbar** and **Liquid
Glass Design System**.*

**Port:** `backdrop-filter` on the cascade sheet and the floating price bar,
with the blur radius scaled by surface size (§5: bigger surfaces read as
thicker). Never stacked on another translucent surface. A blocking sheet gets a
scrim and pushes the ground back; a parallel panel gets offset and **no** scrim.
Colour goes on a solid layer beneath, never the translucent foreground; text on
it goes up a weight step. `prefers-reduced-transparency` turns it opaque.
`check:contrast` measures it before it ships.

### 8 · One press primitive

*From: magicui **Ripple Button**, recent.design **Realistic Button** and
**Glossy Toggle**.*

§6 already requires press feedback on pointer-down at 100–160ms, and requires it
to survive reduced motion. 295 distinct button treatments existed before the
rebuild, 137 missing at least one of hover/press/focus. **Port once, into
`src/ui/Button`,** transform and opacity only, and let `--button-h-md` carry the
rest.

### 9 · The leading-and-measure chart on `/design.html`

*From: recent.design **Leading and Measure**, **Six Bespoke Typefaces**.*

The one genuinely useful thing in the Typography category. `/design.html` draws
every surface but does not draw the **ramp against itself** — and §4's whole
argument is that the 56px hole made eleven of twelve screens bimodal, which
`check:styles` now ratchets. A specimen grid showing all ten steps with their
size, weight, leading and tracking, plus an interactive measure/leading chart,
is the reference that would have caught it by eye.

---

## 8 · WHAT I DID NOT VERIFY

Stated plainly, because the defect this run exists to fix was a verdict quoted
past its evidence.

- **588 Highfield variants** is the figure in the brief. I did not find it in
  the tree or the docs in this run. The *shape* of the problem is verified —
  `docs/audit/access-and-responsive.md:261` shows a real row rendering as
  `Highfield - RU230KAM (HYP) WH`.
- **No component was run.** Every verdict above is from the published
  description and, where it mattered, the component's stated mechanism. Nothing
  here was driven in a browser except recent.design's feed.
- **React Bits Pro is not assessed** (150 + 280 + 300 + 15 + 20 items by their
  own count). It is paid and closed; I cannot read what those do and will not
  gate what I have not seen.
- **The magicui total moved from 100 to 78** between the two runs. I did not
  establish whether components were removed or whether 100 was never read.
- **Nothing here has been measured for contrast**, because nothing has been
  built. Every PORT above is conditional on `check:contrast` clearing 4.5:1 on
  the real surface — that is the replacement for the deleted cap, and it is a
  measurement, not a promise.

---

## 9 · SOURCES

- `https://www.reactbits.dev/llms.txt` — the component index, 171 entries in
  four categories
- `https://www.reactbits.dev/sitemap.xml` — independent confirmation of the same
  171 and the same per-category split
- `https://magicui.design/llms.txt` — 78 components
- `https://github.com/magicuidesign/magicui` → `apps/www/content/docs/components/`
  — 78 `.mdx`, confirming the same set
- `https://recent.design/?category=typography` — 3 entries
- `https://recent.design/?category=motion` — 237 entries, enumerated by driving
  the feed to the end of its infinite scroll
- `docs/specs/DESIGN_SYSTEM.md` §1, §2, §3, §4, §5, §6, §9 — the filter
- `docs/research/motion-libraries-2026.md` and its CORRECTION — what this
  re-runs
- `src/features/quote/build.css:108, 786–812` — the shipped scroll-edge fade,
  read first-hand
- `docs/audit/sheet-and-tables.md:57` — 53 tables, 15,691 rows
- `docs/audit/access-and-responsive.md:261` — a real variant name with its
  colour code
- `package.json` — `motion@^13.0.0`, `@xyflow/react@^12.11.2`
