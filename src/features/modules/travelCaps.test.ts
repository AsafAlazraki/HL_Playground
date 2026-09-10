/* ============================================================
   WHETHER A FILE MAY LEAVE A CATALOGUE, OR ARRIVE AT IT.

   MODULE_SYSTEM §10 Phase 4 — "`export`/`import` as real module
   capabilities". They were not. `export` was a switch whose own note
   said "not built yet", and `import` was missing from a contract
   that describes itself as ten verbs.

   WHAT IS ASSERTED IS THE FOUR OUTCOMES, because the middle two are
   the whole point and they look identical on a screen:

     off          the module does not offer it. Nothing drawn, nothing
                  said — the ordinary state of every module ever made.
     withheld     the module offers it and this JOB does not hold it.
                  Nothing drawn, and it IS said, because that is a
                  decision somebody made rather than a default.
     on           the controls go on the bar.
     on, blocked  granted and still impossible — the tables went off
                  the sheet, or this place draws seven registers and a
                  file is one. Said in the place the act would be.

   AND THE ONE THIS FILE OWNS: a module drawing more than one register
   refuses rather than writing a file of `tableIds[0]` and calling it
   the module's.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleAccess, ModuleCapability, ModuleDef } from '@/types/model'
import { readTravel } from './travelCaps'
import { withheldSay } from './writeCaps'

const ISO = '2026-01-01T00:00:00.000Z'

const table = (id: string, name: string, retired = false): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind: 'boat',
  fields: [{ id: `${id}-name`, name: 'Name', type: 'text' }],
  displayFieldId: `${id}-name`,
  ...(retired ? { retired: true } : {}),
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const moduleOf = (
  capabilities: ModuleCapability[],
  tableIds = ['t1'],
  access?: ModuleAccess[],
): ModuleDef => ({
  id: 'm1',
  name: 'Boats',
  description: '',
  tableIds,
  capabilities,
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: ISO,
  updatedAt: ISO,
  ...(access ? { access } : {}),
})

const T1 = table('t1', 'Highfield Inflatables')
const T2 = table('t2', 'Stabicraft')

/* ---------------------------------------------------------- */

describe('a module that does not offer the verb', () => {
  it('says nothing about either — the normal state of a catalogue', () => {
    const t = readTravel(moduleOf(['browse']), [T1], [T1], null)
    expect(t.out.on).toBe(false)
    expect(t.back.on).toBe(false)
    expect(t.withheld).toEqual([])
    /* nothing to refuse means nothing to explain */
    expect(t.out.blocked).toBeUndefined()
  })
})

describe('the two switches are separate decisions', () => {
  it('EXPORT ON DOES NOT GRANT IMPORT — opposite risks, opposite switches', () => {
    /* One leaks a cost column; the other overwrites six hundred rows.
       A single switch for both would be the app deciding they are the
       same decision. */
    const t = readTravel(moduleOf(['browse', 'export']), [T1], [T1], null)
    expect(t.out.on).toBe(true)
    expect(t.back.on).toBe(false)
  })

  it('and import on does not grant export', () => {
    const t = readTravel(moduleOf(['browse', 'import']), [T1], [T1], null)
    expect(t.back.on).toBe(true)
    expect(t.out.on).toBe(false)
  })
})

describe('offered here, and not held by this job', () => {
  const restricted = moduleOf(
    ['browse', 'export', 'import'],
    ['t1'],
    [{ roleId: 'r-sales', capabilities: ['browse'] }],
  )

  it('is WITHHELD rather than off — the distinction a person cannot see', () => {
    const t = readTravel(restricted, [T1], [T1], 'r-sales')
    expect(t.out.on).toBe(false)
    expect(t.back.on).toBe(false)
    /* and unlike "off", it is said */
    expect(t.withheld).toEqual(['export', 'import'])
  })

  it('joins the write verbs in ONE sentence rather than starting a second', () => {
    /* `withheldSay` takes any capability for exactly this reason —
       five apologies at the top of a price list is how a person
       starts wondering whether they are five faults. */
    const said = withheldSay('Boats', ['add', 'export', 'import'], 'r-sales')
    expect(said).toContain('add, export and import are kept to named jobs')
    expect(said).toContain('Access & roles')
  })

  it('grants it back the moment the job holds it', () => {
    const t = readTravel(
      moduleOf(
        ['browse', 'export', 'import'],
        ['t1'],
        [{ roleId: 'r-sales', capabilities: ['browse', 'export'] }],
      ),
      [T1],
      [T1],
      'r-sales',
    )
    expect(t.out.on).toBe(true)
    expect(t.back.on).toBe(false)
    expect(t.withheld).toEqual(['import'])
  })
})

describe('granted, and still impossible', () => {
  const both = moduleOf(['browse', 'export', 'import'], ['t1'])

  it('A FILE IS ONE REGISTER — a place drawing two refuses rather than picking one', () => {
    /* The alternative is an Export that writes `tableIds[0]` and says
       nothing, which is the confidently-wrong control §7 rates worse
       than no control. */
    const t = readTravel(moduleOf(['export', 'import'], ['t1', 't2']), [T1, T2], [T1, T2], null)
    expect(t.out.on).toBe(true)
    expect(t.out.blocked).toContain('2 registers')
    expect(t.back.blocked).toBe(t.out.blocked)
  })

  it('names the tables going off the sheet, not a generic unavailable', () => {
    const t = readTravel(both, [], [], null)
    expect(t.out.blocked).toContain('no longer on the sheet')
    expect(t.from).toBeUndefined()
  })

  it('tells history apart from gone, because the fixes differ', () => {
    const old = table('t1', 'Highfield Inflatables', true)
    const t = readTravel(both, [old], [], null)
    expect(t.out.blocked).toContain('history')
    expect(t.out.blocked).toContain('off history on the sheet')
  })

  it('AN EMPTY REGISTER IS NOT A REFUSAL. Its headings are the file', () => {
    /* A blank sheet to type a season's stock into is a real use of
       Export, and the count that would refuse it lives on the
       control, where it can say the number. */
    const t = readTravel(both, [T1], [T1], null)
    expect(t.out.on).toBe(true)
    expect(t.out.blocked).toBeUndefined()
  })
})

describe('which register the file is of', () => {
  it('is the primary — the same table a new row goes into', () => {
    const t = readTravel(moduleOf(['export'], ['t1', 't2']), [T1, T2], [T1], null)
    expect(t.from?.id).toBe('t1')
  })

  it('falls to the first live one when the primary went to history', () => {
    /* `CatalogWrites.into` follows this rule, and the file a person
       takes out must not come off a different table from the row they
       add. */
    const t = readTravel(moduleOf(['export'], ['t1', 't2']), [table('t1', 'A', true), T2], [T2], null)
    expect(t.from?.id).toBe('t2')
  })
})
