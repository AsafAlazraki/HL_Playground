---
name: subtask
description: Research world-class practice for one surface, decision or technology, then map it against what this repo actually does and record the result durably in docs/research/. Use when picking up a screen, choosing a library or pattern, upgrading the stack, or whenever the question is "what would the best in the world do here, and are we doing it?"
---

# /subtask — research it, map it, write it down

One surface, one decision, one technology per run. The output is a committed file
under `docs/research/`, because a learning that lives only in a chat session is a
learning that gets lost. That has already happened to this project once.

**Argument:** the thing to study. `/subtask the catalogue screen`,
`/subtask virtualised tables`, `/subtask React 19 concurrent features`.
If no argument is given, ask for one — do not guess.

---

## The four phases, in order

### 1 · GROUND — what does this repo already believe?

Before searching the web, search the repo. Prior work here is dense and it is
usually right.

- `docs/plan/CONFIGURATOR_PLAYBOOK.md` — the existing teardowns (Porsche, Boston
  Whaler, Sea Ray, McLaren, Malibu, Bennington, Rivian, GOV.UK, NN/g)
- `docs/plan/PHASE_TWO.md` — the roadmap and its §0 first-hand research
- `docs/specs/DESIGN_PRINCIPLES.md` and `DESIGN_CONTRACT.md` — the ten rules and
  the token names. **Any recommendation that breaks these must say so out loud.**
- `docs/specs/CLUELESS_USER_TESTS.md` — open findings O4–O12
- `docs/audit/` — the evidence the plans answer

State in one paragraph what the repo already decided and why. If the answer is
"nothing yet", say that.

### 2 · RESEARCH — go and look, do not recall

Use WebSearch and WebFetch. **Name the products you studied and what you
observed in them**, in the house style: first-hand, measured, specific.

- Prefer **named, shipping products** over listicles and "10 best practices" blog
  posts. A teardown of one real screen beats ten opinions.
- Prefer **primary sources** for technology: the framework's own release notes,
  RFCs, the spec, the maintainer's post. Not a summary of a summary.
- Record **numbers**: how many groups, how many pixels, how many round-trips, what
  version, what date. The existing docs do this and it is why they are still
  useful a month later.
- **Check the date on everything.** This project's stack is deliberately current
  (React 19, TypeScript 7, Vite 8, Vitest 4). Advice written against React 18 may
  be actively wrong here.
- Note what the best-in-class do **badly** too. The playbook's strongest section
  is §8 WHAT TO REJECT.

### 3 · MAP — against the tree, not against the docs

**The docs lag the tree.** Verify claimed state by reading code before you
conclude anything is missing. Recent examples of drift: `README.md` says the
quote flow is unbuilt while `src/features/quote/` has 20+ files; several docs
say "no undo" while `src/app/UndoKeys.tsx` exists.

Produce a table:

| practice | who does it | do we? | evidence in this repo | verdict |
|---|---|---|---|---|

`verdict` is one of **adopt**, **adapt**, **reject**, **already do it**. Every
`reject` carries a reason, in the voice of playbook §8.

### 4 · WRITE — durably, and linked

Write `docs/research/<kebab-slug>.md` with this shape:

```
# <TITLE>
> Studied <date>. <One sentence on what question this answers.>

## What we already believed
## What the best in the world do
## The map — practice against this repo
## What we adopt, and in what order
## What we reject, and why
## Sources
```

Then:

1. Add a row to `docs/research/INDEX.md`.
2. If the finding changes the plan, amend the plan doc itself and say so in the
   commit — do not leave two documents disagreeing.
3. Commit. A commit message that explains the decision, not the diff, per
   `CLAUDE.md`.

---

## Rules that are not optional

- **Nothing invented.** Same rule as the app: if you state a number, it came from
  a source you actually read. Say "not verified" rather than estimating.
- **Cite with URLs.** A source you cannot link is a source the next person cannot
  check.
- **Contradiction is a finding.** If the research contradicts
  `DESIGN_PRINCIPLES.md`, do not quietly follow the research. Write the conflict
  up and let a person choose.
- **One file per subtask.** Do not append to an existing research file unless the
  new work genuinely supersedes it — in which case replace it and note the date.

## Running it wide

For a broad topic, fan out with subagents — one per product studied or per
dimension — then merge their findings into the single output file yourself. The
agents research; the synthesis and the verdict column are yours.
