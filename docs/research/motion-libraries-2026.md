# THE MOTION LIBRARIES, WALKED — MAGICUI AND REACTBITS

> Driven 2026-09-10 in real Chromium with `tools/teardown/drive.mjs`. The
> inventories below are what the sites actually list, not a recollection of
> their landing pages. Asked for by name, so each is answered by name.

## The short answer

| library | verdict |
|---|---|
| **magicui** | 100 components. **Three** fit a tool used all day over a real price file. |
| **reactbits** | 27 components, overwhelmingly decorative. **None** fits. |
| **threlte** | **Cannot be used.** It is Svelte. The React equivalent is `@react-three/fiber`, and 3D needs models we do not have. |
| **vectory** | Sells 3D assets. Nothing to integrate without licensing them. |
| **jitter** | Exports Lottie. Would need `lottie-web` plus hand-authored motion files. |

**We already have the engine.** `motion` v13 is a dependency and is already used
(`features/views/stillness.tsx` — `SPRING`, `SPRING_QUICK`, `transitionFor`,
`useStillness`). That is the same runtime magicui and reactbits are built on, so
anything worth taking can be built natively in tokens. Nothing needs installing.

## Why almost all of it is rejected, and the rule that does the rejecting

Three filters, in order. A component has to survive all three.

1. **`DESIGN_PRINCIPLES` §5** — one accent, roughly four appearances per screen.
   Anything that paints colour to be interesting fails here.
2. **`DESIGN_PRINCIPLES` §4b** — the expressive layer adds *no ink and no
   meaning*, and every token in it is capped under 6% alpha so text keeps the
   contrast ratio the ramp was measured at. Anything needing a stronger wash to
   be visible is asking to invalidate that table.
3. **emil's frequency table** (`.claude/skills/emil-design-eng`) — 100+ times a
   day: never animate. Tens of times a day: reduce or remove. This is a tool a
   dealer is inside all day, so almost everything here lands in the second row.

That third filter is the one that kills most of magicui, and it is not a matter
of taste: their components are built for a landing page, which a person sees
once.

## magicui — the three that survive

- **Border Beam** → adapted, then **rejected on measurement**. See below.
- **Progressive Blur** → *not yet built.* The option rail is the one scrollport
  on the configurator (`build.css` §THE PRODUCT argues why there is exactly
  one), and its content currently runs under the price bar with a hard cut. A
  soft edge is the one place on this screen where the answer is genuinely a
  gradient.
- **Animated Beam** → *not yet built.* It draws a travelling line between two
  elements. The app has a node canvas (`@xyflow/react`) whose entire subject is
  which table relates to which, and a relationship that draws itself once when a
  rule is created is the same causality argument that got the refusal strike
  built.

## What was rejected and why, so nobody re-adds it

- **Number Ticker** on the price. `PHASE_TWO` §4.3 already rejected it, in
  writing: *"the figure does NOT count up (a dealer reads it aloud)"*. This is
  the single most obvious component to reach for here and the repo had already
  thought past it.
- **Magic Card** (cursor-tracked spotlight) on the option cards. A dealer hovers
  these hundreds of times a day — emil's first row.
- **Meteors, Confetti, Particles, Sparkles Text, Aurora Text, Rainbow Button,
  Neon Gradient Card, Retro Grid, Comic Text, Cool Mode.** Decoration with no
  state to indicate.
- **Dot / Grid / Noise patterns.** Already present and already capped:
  `ds.css` ships `--grain-opacity` and `.ds-grain` under §4b.
- **Animated List stagger.** Already built — `PHASE_TWO` §4.5 asks for a 26ms
  stagger once, and `.ds-rise` with `style={{'--i': index}}` is it.
- **reactbits in full** — Ballpit, Splash Cursor, Blob Cursor, Pixel Trail,
  Aurora, Balatro, Magnet Lines, Ribbons, Metallic Paint. These are cursor
  effects and animated backgrounds. There is no reading of this product where a
  ball pit belongs behind a price file.

## THE BORDER BEAM, BUILT AND THEN REMOVED — the useful failure

Worth recording in full, because it is the pattern for porting anything else.

**The port.** A conic gradient with its angle registered through `@property`
(without which the angle is not animatable), masked to a 1px border with
`mask-composite: exclude`. Verified in the browser rather than assumed:
`mask-composite` supported, `conic-gradient` supported, `::before` present,
`animation: qb-beam-run 0.42s` running. It worked.

**Two changes it needed immediately.**

*It ran once, not forever.* magicui loops it. The purpose here is not "this band
is open" — the caret, the kind tint and the squared bottom corners say that, and
they keep saying it while you read. The purpose is **causality**: your press did
this, and this is what changed. That is spent after one pass.

*It became a sweep, not an orbit.* The band head is **773 × 56**. A conic
gradient advances its angle at a constant rate, so on a strip fourteen times
wider than it is tall the light crawls along the long edges and snaps around the
short ones. An orbit is a component for a squarish card; on a wide strip the
same idea is a linear sweep — and half the machinery, with no registered
property and no mask.

**Then it was removed, and this is the measurement that did it.** The wash
tokens are `--accent-wash` at `rgba(10,95,194,0.09)` and `--accent-wash-strong`
at `0.15`. The band head **already carries its kind hue** — `Card` mixes 6% of
`--kind` into the ground and `.k-band` puts 10% on the head, which §1 explicitly
allows for a thing that HAS that kind. A 9–15% blue wash moving across a surface
that is already washed is not perceptible. Making it perceptible means pushing
past §4b's cap, which invalidates the measured contrast table.

**So the band head already had four signals** — kind tint, caret, squared
corners, expanded body — and the fifth was invisible. A component that cannot be
seen without breaking a contrast guarantee has not earned its place.

## What this says about the ask

The libraries are worth mining and were mined. What they mostly prove is that
this app's own design system already answers, deliberately and with
measurements, most of what they offer decoratively — the stagger, the grain, the
price behaviour, the hue-on-a-surface rule. The two genuinely open ones,
**Progressive Blur** on the rail edge and **Animated Beam** on the node canvas,
are open because they solve problems this app actually has rather than because
they look good in a demo.

## Sources

- `https://magicui.design/docs/components/marquee` — the component index
- `https://www.reactbits.dev/`
- `.claude/skills/emil-design-eng/SKILL.md` — the frequency table
- `docs/specs/DESIGN_PRINCIPLES.md` §1, §4b, §5
- `docs/plan/PHASE_TWO.md` §4
