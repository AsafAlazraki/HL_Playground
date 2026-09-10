/* ============================================================
   A RULE CAN BE DELETED — the owner's decision, 2026-09-11.

   It could not, by design, until then. CONFIGURATOR_SPEC §4b said
   "rules toggle off, they are never deleted — the experiment is
   reversible and the authoring survives", `constraintDefs.ts`
   implemented exactly that in a comment reading "Never a delete", and
   CLUELESS_USER_TESTS Finding 15 disagreed. The cost of the spec as
   written was real: a bad rule could only ever be switched off, so
   dead rules accumulated for the life of the sheet, and
   `clearConstraints` — the only removal there was — took the good
   ones with them.

   WHAT IS ASSERTED IS THE DECISIONS THE ACT IS MADE OF:

     · the rule goes, and the ones beside it do not
     · THE SWITCH IS UNTOUCHED. Deleting is the other act, not a
       replacement for pausing one, and the whole "ask why → switch
       it off → watch the option come back" loop still works
     · IT IS UNDOABLE WITHOUT THE PROJECT STORE. This registry is its
       own map behind its own key, so the delete hands the definition
       BACK and the restore puts it there — dates and all, because
       undoing a delete did not edit the rule
     · one business's delete is not another's
     · a second press finds nothing, and says so by handing back
       nothing rather than by throwing
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The registry reads the LIVE store to know whose rules to hand back,
   so the only honest way to test it is through the store — the same
   reason `tenantKey.test.ts` next door mocks the repository. */
vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  repository: { load: async () => null, saveAll: async () => {}, wipe: async () => {} },
}))

import type { ConstraintDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  clearConstraints,
  createConstraint,
  deleteConstraint,
  getConstraint,
  getConstraints,
  restoreConstraint,
  setConstraintEnabled,
} from './constraintDefs'

const EMPTY = { combinator: 'AND' as const, clauses: [] }

/** A rule written the way the pane writes one. */
const write = (because: string): ConstraintDef =>
  createConstraint({ if: EMPTY, because })

beforeEach(() => {
  useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
  clearConstraints()
})

/* ---------------------------------------------------------- */

describe('taking one rule out', () => {
  it('TAKES THAT ONE, and leaves the ones beside it', () => {
    const a = write('the hull is not rated for that much power')
    const b = write('that trailer cannot carry that hull')
    expect(getConstraints()).toHaveLength(2)

    deleteConstraint(a.id)

    expect(getConstraint(a.id)).toBeUndefined()
    expect(getConstraint(b.id)?.because).toBe('that trailer cannot carry that hull')
    expect(getConstraints()).toHaveLength(1)
  })

  it('hands the rule back, which is what makes the toast possible', () => {
    /* The registry is outside the project store's history, so an UNDO
       cannot come from `useProjectStore`. Returning the definition is
       the whole mechanism. */
    const rule = write('the hull is not rated for that much power')
    const gone = deleteConstraint(rule.id)
    expect(gone?.id).toBe(rule.id)
    expect(gone?.because).toBe('the hull is not rated for that much power')
  })

  it('hands back nothing on a second press, rather than throwing', () => {
    const rule = write('the hull is not rated for that much power')
    expect(deleteConstraint(rule.id)).toBeDefined()
    expect(deleteConstraint(rule.id)).toBeUndefined()
  })

  it('hands back nothing for a rule that was never written', () => {
    expect(deleteConstraint('c-nobody')).toBeUndefined()
  })
})

describe('the way back', () => {
  it('PUTS IT BACK AS IT WAS, dates and all — an undo is not an edit', () => {
    const rule = write('the hull is not rated for that much power')
    const gone = deleteConstraint(rule.id)
    expect(gone).toBeDefined()
    if (!gone) return

    restoreConstraint(gone)

    const back = getConstraint(rule.id)
    expect(back).toEqual(gone)
    /* the dates in particular: `putConstraint` would have re-stamped
       `updatedAt`, which is right for a rewording and wrong here */
    expect(back?.createdAt).toBe(rule.createdAt)
    expect(back?.updatedAt).toBe(rule.updatedAt)
  })

  it('brings back a rule that was switched off, still switched off', () => {
    /* Its state is part of the authoring: a rule paused when it was
       deleted must not come back live and start biting. */
    const rule = write('the hull is not rated for that much power')
    setConstraintEnabled(rule.id, false)
    const gone = deleteConstraint(rule.id)
    expect(gone?.enabled).toBe(false)
    if (!gone) return

    restoreConstraint(gone)
    expect(getConstraint(rule.id)?.enabled).toBe(false)
  })
})

describe('the switch is not what changed', () => {
  it('STILL PAUSES A RULE RATHER THAN REMOVING IT', () => {
    /* The everyday control, and the one the "ask why → switch it off
       → watch the option come back" loop depends on. */
    const rule = write('the hull is not rated for that much power')
    setConstraintEnabled(rule.id, false)

    expect(getConstraint(rule.id)).toBeDefined()
    expect(getConstraint(rule.id)?.enabled).toBe(false)
    expect(getConstraints()).toHaveLength(1)
  })

  it('and switching one off does not delete it however many times it is pressed', () => {
    const rule = write('the hull is not rated for that much power')
    setConstraintEnabled(rule.id, false)
    setConstraintEnabled(rule.id, true)
    setConstraintEnabled(rule.id, false)
    expect(getConstraints()).toHaveLength(1)
  })
})

describe('whose rule it was', () => {
  it('DELETES IT FOR ONE BUSINESS AND NOT THE OTHER', () => {
    /* The registry is keyed by tenant (TENANCY §4.1). A delete that
       reached across would be the orphaning bug pointing the other
       way — destructive instead of merely quiet.

       THE SECOND BUSINESS IS A SECOND SLUG, NOT A RENAME, and the
       first draft of this test got that wrong: `setOrganisation`
       mints a slug ONCE and keeps it, so renaming the sheet's
       business is still the same business — which is the whole of
       row 36's fix. Two tenants means two slugs. */
    const mine = write('the hull is not rated for that much power')
    const ours = useProjectStore.getState().meta

    useProjectStore.setState({
      meta: {
        ...ours,
        org: {
          name: 'Brisbane Boats',
          industry: 'marine',
          createdAt: '2026-01-01T00:00:00.000Z',
          slug: 'brisbane-boats',
        },
      },
    })
    const theirs = write('that trailer cannot carry that hull')
    deleteConstraint(theirs.id)
    expect(getConstraints()).toHaveLength(0)

    useProjectStore.setState({ meta: ours })
    expect(getConstraint(mine.id)?.because).toBe('the hull is not rated for that much power')
  })
})
