/* ============================================================
   RENAMING THE BUSINESS ORPHANED ITS BUSINESS RULES.

   TENANCY §4.1, and the doc is blunt about it: "This is the
   smallest change on the list and the only one that fixes a bug
   that exists today, so it should not wait for the rest."

   `orgKeyOf` returned the lowercased NAME, because the name was
   the only identity `OrgProfile` carried. So a dealership that
   corrected its own name in settings lost every rule it had
   written — not deleted, filed under a key nothing asked for
   again, and the pane went quiet with no way to tell that from
   never having written one.

   These assert the FACT the slug exists for: what a business
   wrote is still there after it changes what it is called.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The registry reads the LIVE store to know whose rules to hand
   back, so the only honest way to test a key is through the store —
   set the organisation the way onboarding does, then ask the way a
   screen does. */
vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  repository: { load: async () => null, saveAll: async () => {}, wipe: async () => {} },
}))
import type { ProjectMeta } from '@/types/model'
import { orgSlug } from '@/types/model'
import type { ConstraintDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  adoptSlugKey,
  clearConstraints,
  getConstraints,
  legacyOrgKeyOf,
  orgKeyOf,
  registerConstraints,
} from './constraintDefs'

/** A rule, written under a given key. `registerConstraints` is the
 *  seeding seam and the only writer that takes an org key, which is
 *  exactly what a test about KEYS needs. */
const rule = (id: string): ConstraintDef => ({
  id,
  kind: 'implies',
  if: { combinator: 'AND', clauses: [] },
  because: 'the hull is not rated for that much power',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const meta = (org?: { name: string; slug?: string }): ProjectMeta =>
  ({
    id: 'default',
    name: org?.name ?? 'Sheet',
    exportCount: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...(org
      ? {
          org: {
            name: org.name,
            industry: 'marine' as const,
            createdAt: '2026-01-01T00:00:00.000Z',
            ...(org.slug ? { slug: org.slug } : {}),
          },
        }
      : {}),
  }) as ProjectMeta

/* ---------------------------------------------------------- */

describe('minting a slug', () => {
  it('is a name reduced to a key', () => {
    expect(orgSlug('Northside Marine')).toBe('northside-marine')
  })

  it('collapses punctuation and runs of separators rather than keeping them', () => {
    expect(orgSlug('  Bob & Sons  Marine, Pty Ltd.  ')).toBe('bob-sons-marine-pty-ltd')
  })

  it('never returns an empty key, because a key of nothing files nothing', () => {
    expect(orgSlug('***')).toBe('sheet')
    expect(orgSlug('')).toBe('sheet')
  })
})

describe('which key a business is filed under', () => {
  it('is the slug when there is one', () => {
    expect(orgKeyOf(meta({ name: 'Northside Marine', slug: 'northside-marine' }))).toBe(
      'northside-marine',
    )
  })

  it('IGNORES THE NAME once a slug exists — that is the whole bug', () => {
    /* The same slug, a different name: still one business. */
    const before = orgKeyOf(meta({ name: 'Northside Marine', slug: 'northside-marine' }))
    const after = orgKeyOf(meta({ name: 'Northside Marine Group', slug: 'northside-marine' }))
    expect(after).toBe(before)
  })

  it('falls back to the old name key for a sheet saved before slugs existed', () => {
    /* Its rules have to keep resolving until `setOrganisation` runs
       again and mints one. */
    expect(orgKeyOf(meta({ name: 'Northside Marine' }))).toBe('northside marine')
  })

  it('has a key for a sheet with no organisation at all', () => {
    expect(orgKeyOf(meta())).toBe('__unnamed')
  })
})

describe('the old key, and when there is one', () => {
  it('is the lowercased name while it still differs from the slug', () => {
    expect(legacyOrgKeyOf(meta({ name: 'Northside Marine', slug: 'northside-marine' }))).toBe(
      'northside marine',
    )
  })

  it('is nothing on a sheet that never had a slug — there is nowhere to move from', () => {
    expect(legacyOrgKeyOf(meta({ name: 'Northside Marine' }))).toBeNull()
  })

  it('is nothing when the two keys already agree', () => {
    expect(legacyOrgKeyOf(meta({ name: 'boats', slug: 'boats' }))).toBeNull()
  })
})

describe('moving a business onto its slug', () => {
  const store = () => useProjectStore.getState()

  beforeEach(() => {
    clearConstraints('northside marine')
    clearConstraints('northside-marine')
    clearConstraints('__unnamed')
    useProjectStore.setState({ meta: meta() })
  })

  it('brings across what was written under the name', () => {
    /* A sheet from before slugs: filed under the lowercased name. */
    useProjectStore.setState({ meta: meta({ name: 'Northside Marine' }) })
    registerConstraints([rule('c1')], orgKeyOf(store().meta))
    expect(getConstraints()).toHaveLength(1)

    /* Then it gains one, the way `setOrganisation` gives it one. */
    useProjectStore.setState({
      meta: meta({ name: 'Northside Marine', slug: 'northside-marine' }),
    })
    expect(getConstraints()).toHaveLength(0)

    expect(adoptSlugKey(store().meta)).toBe(1)
    expect(getConstraints()).toHaveLength(1)
  })

  it('runs once — the second call finds nothing left to move', () => {
    useProjectStore.setState({ meta: meta({ name: 'Northside Marine' }) })
    registerConstraints([rule('c1')], orgKeyOf(store().meta))
    useProjectStore.setState({
      meta: meta({ name: 'Northside Marine', slug: 'northside-marine' }),
    })
    expect(adoptSlugKey(store().meta)).toBe(1)
    expect(adoptSlugKey(store().meta)).toBe(0)
  })

  it('moves nothing on a sheet that never had a slug', () => {
    useProjectStore.setState({ meta: meta({ name: 'Northside Marine' }) })
    expect(adoptSlugKey(store().meta)).toBe(0)
  })

  it('THE RULE SURVIVES THE RENAME THAT USED TO LOSE IT', () => {
    /* The whole point, end to end and through the real door:
       onboarding sets the organisation, a rule is written, the
       business corrects its own name, and the rule is still there. */
    store().setOrganisation('Northside Marine', 'marine')
    const slug = store().meta.org?.slug
    expect(slug).toBe('northside-marine')

    registerConstraints([rule('c1')], orgKeyOf(store().meta))
    expect(getConstraints()).toHaveLength(1)

    store().setOrganisation('Northside Marine Group', 'marine')
    expect(store().meta.org?.name).toBe('Northside Marine Group')
    expect(store().meta.org?.slug).toBe(slug)
    expect(getConstraints()).toHaveLength(1)
  })
})
