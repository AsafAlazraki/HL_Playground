# EXPLAINING A REFUSAL — WHAT DEPENDENCY RESOLVERS SAY WHEN NOTHING FITS

> Studied 2026-09-08. Seven package managers, chosen because they solve exactly
> our problem in a different domain: a constraint system that must tell a person
> why no valid combination exists. This is the most mature body of prior art for
> `CONFIGURATOR_PLAYBOOK.md` §5, and almost none of it has been looked at by
> people building product configurators.

## What we already believed

The playbook settled that the solver records the reason at the moment of removal,
in five never-overlapping kinds, with at most two priced minimal fixes. What it
did not settle is **the grammar of the sentence** — how a chain of causes becomes
prose a person can act on. Package managers have been iterating on exactly that
for eight years, and one algorithm has won.

## What the best in the world do

### PubGrub — the causal chain in plain sentences

Natalie Weizenbaum's PubGrub (Dart, 2018) is now used by **uv, Poetry, Bundler,
Dart's pub, and is the designated replacement for Cargo's solver**. Its defining
property is that the *explanation* is a first-class output of the algorithm, not
a message bolted on afterwards.

The canonical example, from the pubgrub-rs README:

> "Because dropdown >=2.0.0 depends on icons >=2.0.0 and root depends on icons
> <2.0.0, dropdown >=2.0.0 is forbidden. And because menu >=1.1.0 depends on
> dropdown >=2.0.0, menu >=1.1.0 is forbidden. And because menu <1.1.0 depends on
> dropdown >=1.0.0 <2.0.0 which depends on intl <4.0.0, every version of menu
> requires intl <4.0.0. So, because root depends on both menu >=1.0.0 and intl
> >=5.0.0, version solving failed."

Three structural moves worth stealing:

1. **"Because … and … , X is forbidden."** Every step names both operands and the
   conclusion. Nothing is implied.
2. **"And because …"** chains steps so the reader can follow the derivation
   without holding state.
3. **"So, because …"** closes on the *user's own* declared requirements — the
   thing they can actually change.

uv's rendering of the same idea, verbatim:

```
  × No solution found when resolving dependencies:
  ╰─▶ Because only httpx<=1.0.0b0 is available and your project depends on
      httpx>9999, we can conclude that your project's requirements are
      unsatisfiable.
```

Poetry's (same lineage, most readable prose):

```
Because foo (1.0.0) depends on shared (>=2.0.0 <3.0.0)
 and no versions of shared match >=2.9.0,<3.0.0, foo (1.0.0) requires shared (>=2.0.0,<2.9.0).
And because bar (1.0.0) depends on shared (>=2.9.0 <4.0.0), bar (1.0.0) is incompatible with foo (1.0.0).
So, because myapp depends on both foo (1.0.0) and bar (1.0.0), version solving failed.
```

**The shared weakness, and it is ours to beat:** PubGrub explains *why* and never
proposes *what to change*. uv's own issue tracker (#309, #9861) collects
complaints that the chain can also print conclusions before premises.

### Nix — the only one that ranks concrete fixes

`nix profile`'s collision error is the best single message found anywhere in this
study, because it names both sides, shows the exact colliding artefact, and then
offers **three ranked, copy-pasteable commands**:

```
error: An existing package already provides the following file:
  /nix/store/s5z281h1xn24wzfwmdr6699lbdc4xbdi-foo-a/foo
This is the conflicting file from the new package:
  /nix/store/7dlry4dhs100izx3mdjvbvmzq7mkdfgj-foo-b/foo

To remove the existing package:
  nix profile remove path:/home/dermetfan/x
The new package can also be installed next to the existing one by assigning a
different priority. The conflicting packages have a priority of 5.
To prioritise the new package:
  nix profile install path:/home/dermetfan/x --priority 4
To prioritise the existing package:
  nix profile install path:/home/dermetfan/x --priority 6
```

**This is the shape `CONFIGURATOR_PLAYBOOK.md` §5's "at most two priced minimal
fixes" is reaching for**, and it is proof the shape works in production.

### Cargo — the causal chain as an indented trace, and a fix that prices itself

Cargo names the requirement chain rather than writing prose:

```
error: failed to select a version for `diesel`.
    ... required by package `infer_schema_internals v1.3.0`
    ... which is depended on by `infer_schema_macros v1.3.0`
    ... which is depended on by `diesel_tests v0.1.0`
versions that meet the requirements `~1.3.0` are: 1.3.3, 1.3.2, 1.3.0
all possible versions conflict with previously selected packages.
  previously selected package `diesel v1.4.0`
```

RFC 3537's proposed MSRV lint goes further than anything shipping, and states the
remedy with its cost:

```
error: clap 5.11.0 requires Rust 1.93.0 while you are running 1.92.0
note: downgrade to 5.10.30 for a version compatible with Rust 1.92.0
note: set `package.rust-version = "1.92.0"` to ensure compatible versions are selected in the future
```

### The rest, briefly

- **npm ERESOLVE** names both sides with a full `from the root project` path for
  each, and ends with a fix menu (`--force`, `--legacy-peer-deps`) — but does not
  say which is safer. Verbose and alarming; complete.
- **pnpm** renders a tree with `✕ unmet peer @angular/core@21.2.0: found 19.2.19`
  — the most scannable format for a non-expert.
- **yarn berry (YN0060)** is one dense line per conflict: who provides what, who
  wanted what. Complete but not chain-formatted.
- **conda's classic solver** lists the two conflicting specs flatly and tells you
  to go run `conda search --info` yourself. **libmamba** replaced it with a real
  tree (`└─ … which requires … which is missing on the system`) — a large step up
  and the clearest evidence that the industry is converging on causal chains.
- **apt/dpkg** name the broken package and each unmet `Depends:` line, one level
  deep, with no chain and no ranked fix. The most "list the facts and stop" style
  in the set.

### And what consumer products say — a much lower bar, with five exceptions

Package managers are the mature end. Consumer software is mostly the cop-out end,
which is useful: it shows exactly what our refusals must not degrade into.

**The five worth copying:**

- **Steam Deck Verified** publishes numeric, falsifiable, per-criterion rules that
  drive the consumer badge directly: *"the smallest on-screen font character
  should never fall below 9 pixels in height at 1280x800"*, *"30fps at 800p"*.
  Four grades — Verified / Playable / **Unsupported** / **Unknown** — and
  *Unknown* is the one most systems omit: "this has not completed review", which
  is honest about absence rather than implying a verdict. **We have `Unchecked`;
  this is proof the grade earns its place.**
- **GOV.UK Design System** codifies the house style we already half-hold:
  *"Error messages should directly include language from the question or fieldset
  label"*, no "please", no "sorry", no "valid/invalid", and *"Read the message out
  loud to see if it sounds like something you would say."* Its worked example
  states rule and fix in one clause — *"Name must be 35 characters or less"*.
- **Google Calendar** publishes six separately-named reasons a room declines,
  instead of one "declined": already booked, recurring-event threshold
  (*"available for at least half of the events, and isn't unavailable more than
  8 times"*), auto-release, no permission, manager removal, UTC/all-day.
- **Delta** distinguishes two different unavailabilities on one seat map:
  *"Seats that are shown as unavailable … may be reserved to accommodate family
  seating, passengers with disabilities and crew members"* versus *"If a seat is
  labeled as 'occupied,' this means the seat has already been selected by another
  passenger."* Same greyed seat, two different reasons, both stated.
- **JetBlue's exit row** ships the full capability checklist rather than
  "restricted": age, mobility in both arms and legs, freedom from a walking aid,
  from caring for another passenger, from a service animal — and names who makes
  the final call.

**The five cop-outs, which are the failure mode to name:**

1. Google Docs — **"You need access" / "Request access"**, identical copy whether
   you were never invited, were removed, or are signed in as the wrong account.
2. Notion — **"No access"**, a button label standing in for an explanation.
3. Figma — **"You don't have access to the file"**, same for every cause.
4. Shopify's Dawn theme, from the shipping source
   (`locales/en.default.json`): `"value_unavailable": "{{ option_value }} -
   Unavailable"` → *"Red - Unavailable"*. **This is the closest thing in
   e-commerce to what we do, and it names the offending choice while never naming
   the rule or the fix.** It is precisely the sentence `PartnerVerdict` exists to
   beat.
5. Exchange resource mailboxes — the decline reason is not a fixed string at all
   but an admin-configurable field (`AdditionalResponse`), so "why" is whatever
   IT typed, or nothing.

## The map — practice against this repo

| practice | who does it | do we? | verdict |
|---|---|---|---|
| Name both operands in every step | PubGrub family, npm | yes | **already do it** |
| Close the chain on the user's own choice | PubGrub ("So, because root depends on…") | partly | **adopt** |
| A multi-step derivation, not one fact | PubGrub, Cargo, libmamba | **no** — our verdicts are single-hop | **adapt** |
| Rank concrete fixes with their consequence | Nix, Cargo RFC 3537 | planned, unbuilt | **adopt** |
| Price the fix | Cargo RFC ("downgrade to 5.10.30") | planned (§5 "two priced minimal fixes") | **adopt** |
| Offer an escape hatch that says it is unsafe | npm (`--force`, "potentially broken") | **no** | **adapt** |
| Simplify derived terms before printing | pubgrub `collapse_no_versions()` | n/a | **adopt if we chain** |
| Tell the user to go run another command | conda classic, apt | no | **reject** |
| Print conclusions before premises | uv (a known bug) | no | **reject** |

## What we adopt, and in what order

1. **Close on the user's own choice.** Our refusals state a fact about the option
   and a fact about the rig. PubGrub's final clause always returns to *what the
   person asked for* — "So, because root depends on both menu and intl". A
   refusal that ends on the user's own last pick tells them what to undo.
2. **Rank the fixes and price them.** Nix proves the three-option form works;
   Cargo's RFC proves stating the cost alongside works. §5 already specifies "at
   most two priced minimal fixes" — this is the prior art that says build it.
3. **Chain, when the cause is more than one hop.** A trailer removed because of a
   hull that was chosen because of a series is a two-hop story, and we currently
   tell the last hop only. Adopt the "Because … And because … So, because …"
   grammar, with pubgrub's term-collapsing so the chain does not become noise.

## What we reject, and why

- **Sending the person somewhere else to find out.** conda's `conda search --info`
  and apt's `--fix-broken` are both "the answer exists, go get it". Rule 10 of
  `DESIGN_PRINCIPLES.md` already forbids this: anything that cannot be done says
  **why, where it is**.
- **An unranked escape hatch.** npm's `--force | --legacy-peer-deps` menu without
  guidance on which is safer moves the decision without informing it.
- **The flat two-line conflict.** conda's classic solver is what our refusals look
  like today if we stop improving them.

## Sources

- <https://github.com/pubgrub-rs/pubgrub> — canonical example and design statement
- <https://docs.rs/pubgrub/latest/pubgrub/> — `collapse_no_versions()` term simplification
- <https://lib.rs/crates/pubgrub> — confirms uv / Cargo / Dart / Bundler / Poetry lineage
- <https://docs.astral.sh/uv/concepts/resolution/> and <https://docs.astral.sh/uv/reference/internals/resolver/>
- <https://raw.githubusercontent.com/python-poetry/poetry/master/tests/mixology/version_solver/test_unsolvable.py> — Poetry's own expected strings
- <https://rust-lang.github.io/rfcs/3537-msrv-resolver.html> — the priced-fix lint
- <https://github.com/rust-lang/cargo/issues/6584> — real Cargo chain output
- <https://raw.githubusercontent.com/NixOS/nix/master/src/nix/profile.cc> — the ranked-fix template
- <https://github.com/npm/cli/blob/latest/tap-snapshots/test/lib/utils/explain-eresolve.js.test.cjs> — npm's ground-truth ERESOLVE format
- <https://github.com/conda/conda-libmamba-solver/issues/483> — libmamba's tree output
- <https://github.com/Debian/apt/blob/main/apt-private/private-output.cc> — APT's own canonical example

Consumer set:

- <https://partner.steamgames.com/doc/steamhardware/compat> — the four grades and the numeric criteria
- <https://design-system.service.gov.uk/components/error-message/> and `/patterns/validation/` and `/components/error-summary/`
- <https://support.google.com/calendar/answer/16107253> — six named decline reasons
- <https://www.delta.com/us/en/need-help/support-seats> — "unavailable" vs "occupied"
- <https://www.jetblue.com/help/emergency-exit-rows> — the capability checklist
- <https://github.com/Shopify/dawn/blob/main/locales/en.default.json> — `value_unavailable`, from shipping source
- <https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/set-calendarprocessing> — `ConflictPercentageAllowed`, `AdditionalResponse`

**Not verified:** American, United, Southwest, Ryanair and Lufthansa seat-map copy
(bot protection returned 403/timeout on every attempt); the literal in-app strings
of Windows 11 PC Health Check; Apple's and Nike's configurator copy; Calendly's
invitee-facing wording. These are recorded as unverified rather than reconstructed
from memory. Natalie Weizenbaum's original PubGrub essay returns 403 to
automated fetch; its canonical example is quoted here from pubgrub-rs instead.
pnpm's and yarn's literal failure transcripts are not published in their docs —
the renders above come from issue pastes, linked.
