# DECISIONS

> Settled by the owner, 2026-09-09. Each of these had two documents disagreeing
> with each other, or a document disagreeing with the code, for months. They are
> recorded here because the reason a decision was made is the first thing lost,
> and this project has already lost a set of sessions once.
>
> **Where a doc lost, this file says so and the doc is amended.** Two documents
> disagreeing is the state this file exists to end.

---

## 1 · Undo on a configurator pick — SPLIT ON WHETHER A CHOICE EXISTS

**The disagreement.** `docs/plan/CONFIGURATOR.md` §C: *"every pick is a toast with
UNDO, never a confirmation"*, echoing DESIGN_PRINCIPLES rule 9.
`src/features/quote/QuoteBuild.tsx:1528` argues explicitly against a toast on
"put on" and ships a delta report instead. Both were reasoned. Neither cited the
playbook.

**The decision.** `CONFIGURATOR_PLAYBOOK.md:344-346` already resolves it and both
other documents missed it:

- **A sheet** when priced alternatives survive — the person is choosing, and a
  toast cannot hold a priced radio group (`Toasts.tsx:19-25`: `ToastAct` is one
  act, deliberately).
- **A toast with UNDO** when no alternative survives — there is nothing to
  choose, only something to reverse.
- **And raise the toast after Accept too**, so accepting a sheet is as reversible
  as any other act.

**Consequences.** `CONFIGURATOR.md` §C is amended to carry the threshold rather
than the absolute. `QuoteBuild.tsx:1528`'s comment stops being a lone dissent and
becomes the "no alternatives" half of a stated rule. `addLine` (`quotes.ts:532`)
is silent while `removeLine` toasts — that asymmetry is now a defect with a
named fix.

---

## 2 · Who signs in — REAL USERS WITH ROLES

**The disagreement.** Sign-in exists (`src/features/auth`), roles exist as
persisted undoable data (`model.ts:927-934`, `useProjectStore.ts:1500-1560`), a
per-module access grid exists — and **none of them are wired together**.
`mayDo(module, roleId, cap)` is called with `roleId === null` in every real
session (`access.ts:126-129`). `MODULE_SYSTEM.md` §5 says there are no roles and
admin/user are two modes of one person. `UX_PASS.md` §10 named this as the one
question it could not answer.

**The decision.** Wire sign-in to a `roleId` and let `mayDo()` actually enforce.
A dealership has salespeople and a manager; the app should be able to say so.

**Consequences, and they are large.**

- The access grid stops being decorative. Today it tells an administrator they
  have restricted something they have not — a safety claim the app does not
  honour.
- `MODULE_SYSTEM.md` §5 loses. It is amended: roles are real, and admin/user is
  no longer "two modes of one person".
- This **unblocks** two items recorded as blocked in `docs/BACKLOG.md`: the write
  capabilities (`edit`/`add`/`delete` gate nothing today) and `⌘K`'s §2 rule 4
  ("a result a person cannot open does not appear for them").
- `UX_PASS.md` §10's own consequence now applies: *"if the answer is 'yes, a
  different person', then undo, provenance and the refusal sentences are not
  polish, they are the product's safety story, and they should be built at that
  weight."*

---

## 3 · The counted figures — A QUIET STRIP

**The disagreement.** `PHASE_TWO.md` §1 deletes the counted strips as the thing
that makes the app feel like a database. §2.1 asks for them back *"as a quiet
strip, not as the subject"*. Today **neither exists** — the counts survive only
as an optional `the-price-file` card that is not in the default set
(`arrangement.ts:184-188`).

**The decision.** Bring them back small and secondary, per §2.1.

**The reasoning.** §1's objection was to counts as the *subject* of the screen,
not to counts existing. A dealer does want to know the file holds 15,691 rows
across 53 tables. §2.1 was written knowing §1 and is the later, narrower
statement — so it wins.

**Consequences.** §1 is amended to say "not as the subject" rather than "go".
The strip is quiet: secondary ink, no card of its own, and it never outranks the
doors or the drafts.
