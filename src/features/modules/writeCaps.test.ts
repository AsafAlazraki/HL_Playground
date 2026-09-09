/* ============================================================
   THE WRITE VERBS, AND THE THREE STATES EACH OF THEM HAS.

   The claim every test below is aimed at, from one side or another:
   A SWITCH THAT IS OFF TAKES THE AFFORDANCE AWAY, AND A SWITCH THAT
   IS ON AND CANNOT WORK SAYS SO. Those are different outcomes and
   the bug this file was written against is that the catalogue had
   neither — `add`, `edit` and `delete` were three switches with no
   consumer at all.

   The tests do NOT assert on a role. That is not an oversight and it
   is written down here as well as in `writeCaps.ts`: `mayDo` is
   handed `roleId === null` in every real session, so a per-role
   answer cannot be exercised honestly yet.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, ModuleCapability, ModuleDef } from '@/types/model'
import {
  addLabel,
  addSays,
  addedSay,
  article,
  readWrites,
  removedSay,
  renameFieldOf,
  renamedSay,
} from './writeCaps'

const AT = '2026-09-09T00:00:00.000Z'

const field = (id: string, name: string, type: FieldDef['type'] = 'text'): FieldDef => ({
  id,
  name,
  type,
})

function table(
  id: string,
  name: string,
  fields: FieldDef[] = [field('f1', 'Model')],
  extra: Partial<EntityDef> = {},
): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    fields,
    position: { x: 0, y: 0 },
    createdAt: AT,
    updatedAt: AT,
    ...extra,
  }
}

function makeModule(capabilities: ModuleCapability[], tableIds = ['t1']): ModuleDef {
  return {
    id: 'm1',
    name: 'Boats',
    description: '',
    tableIds,
    capabilities,
    index: 'tiles',
    accent: 'blue',
    order: 0,
    createdAt: AT,
    updatedAt: AT,
  }
}

describe('readWrites — the switch decides whether anything is drawn', () => {
  it('a verb that is off is off, and says nothing', () => {
    const t = table('t1', 'Highfield Inflatables')
    const w = readWrites(makeModule(['browse', 'search', 'open']), [t], [t])
    for (const verb of ['add', 'edit', 'delete'] as const) {
      expect(w[verb].on).toBe(false)
      /* THE POINT OF THE WHOLE FILE: off is silent. Three apologies
         at the top of every catalogue — and browse/search/open is the
         contract's own default, so that is EVERY catalogue — would be
         noise where somebody is reading a price list. */
      expect(w[verb].blocked).toBeUndefined()
    }
  })

  it('a verb that is on with somewhere to write is on, unblocked', () => {
    const t = table('t1', 'Highfield Inflatables')
    const w = readWrites(makeModule(['browse', 'add', 'edit', 'delete']), [t], [t])
    expect(w.add).toEqual({ on: true })
    expect(w.edit).toEqual({ on: true })
    expect(w.delete).toEqual({ on: true })
    expect(w.into?.id).toBe('t1')
  })

  it('the master table is the module’s primary, not merely the first drawn', () => {
    const a = table('t1', 'Highfield Inflatables')
    const b = table('t2', 'Yamaha Outboards')
    const w = readWrites(makeModule(['add'], ['t2', 't1']), [a, b], [a, b])
    expect(w.into?.id).toBe('t2')
  })

  it('a retired primary falls back to a live table rather than refusing', () => {
    const dead = table('t1', 'OBSOLETE Trailers', [field('f1', 'Model')], { retired: true })
    const live = table('t2', 'NSM Custom Trailers')
    const w = readWrites(makeModule(['add'], ['t1', 't2']), [dead, live], [live])
    expect(w.add).toEqual({ on: true })
    expect(w.into?.id).toBe('t2')
  })
})

describe('readWrites — a verb that is on and cannot work says why', () => {
  it('names the sheet when the tables are gone', () => {
    const w = readWrites(makeModule(['add', 'edit', 'delete']), [], [])
    expect(w.into).toBeUndefined()
    for (const verb of ['add', 'edit', 'delete'] as const) {
      expect(w[verb].on).toBe(true)
      expect(w[verb].blocked).toContain('no longer on the sheet')
    }
  })

  it('says HISTORY, not "gone", when every table is retired — a different fix', () => {
    const dead = table('t1', 'OBSOLETE Trailers', [field('f1', 'Model')], { retired: true })
    const w = readWrites(makeModule(['add']), [dead], [])
    expect(w.add.blocked).toContain('history rather than stock')
    /* the fix is named, and it is on the sheet rather than on this
       module — the same shape as the `quote` refusal next door */
    expect(w.add.blocked).toContain('sheet')
  })

  it('refuses EDIT when no drawn table names its rows in a typeable column', () => {
    const t = table('t1', 'Rate Card', [field('f1', 'Amount', 'number')])
    const w = readWrites(makeModule(['add', 'edit', 'delete']), [t], [t])
    expect(w.edit.on).toBe(true)
    expect(w.edit.blocked).toContain('Rate Card')
    expect(w.edit.blocked).toContain('typed into')
    expect(w.renames.size).toBe(0)
    /* AND ONLY EDIT. Adding a row and taking one out do not need a
       name to type, so refusing them here would be a lie by
       association. */
    expect(w.add).toEqual({ on: true })
    expect(w.delete).toEqual({ on: true })
  })

  it('does not refuse edit page-wide when SOME tables can be renamed', () => {
    const named = table('t1', 'Highfield Inflatables')
    const not = table('t2', 'Rate Card', [field('f1', 'Amount', 'number')])
    const w = readWrites(makeModule(['edit'], ['t1', 't2']), [named, not], [named, not])
    expect(w.edit).toEqual({ on: true })
    expect(w.renames.has('t1')).toBe(true)
    expect(w.renames.has('t2')).toBe(false)
    /* the half that cannot is still SAID — rule 10, in the place it
       is refused, rather than silently drawing two kinds of face */
    expect(w.unnameable).toEqual(['Rate Card'])
  })

  it('says the unnameable tables only when some ARE nameable', () => {
    const not = table('t1', 'Rate Card', [field('f1', 'Amount', 'number')])
    const w = readWrites(makeModule(['edit']), [not], [not])
    /* none can, so the page-wide refusal is the sentence and the list
       would be a second sentence about one fact */
    expect(w.unnameable).toEqual([])
    expect(w.edit.blocked).toBeDefined()
  })

  it('a blocked verb that is OFF still says nothing', () => {
    const w = readWrites(makeModule(['browse']), [], [])
    expect(w.add).toEqual({ on: false })
    expect(w.edit).toEqual({ on: false })
    expect(w.delete).toEqual({ on: false })
  })
})

describe('renameFieldOf — text only, and the reason is corruption', () => {
  it('takes the declared display column when it is text', () => {
    const t = table('t1', 'Boats', [field('f1', 'Code'), field('f2', 'Model')], {
      displayFieldId: 'f2',
    })
    expect(renameFieldOf(t)?.id).toBe('f2')
  })

  for (const type of ['number', 'select', 'reference', 'date', 'boolean', 'image'] as const) {
    it(`refuses a ${type} name — typing a free string into one is corruption`, () => {
      const t = table('t1', 'Boats', [field('f1', 'Name', type)])
      expect(renameFieldOf(t)).toBeUndefined()
    })
  }

  it('refuses a formula name — a computed name is not typed anywhere', () => {
    const t = table('t1', 'Boats', [field('f1', 'Full name', 'formula')])
    expect(renameFieldOf(t)).toBeUndefined()
  })

  it('follows the fallback when no display column is declared', () => {
    const t = table('t1', 'Boats', [field('f1', 'Model'), field('f2', 'Beam', 'number')])
    expect(renameFieldOf(t)?.id).toBe('f1')
  })
})

describe('the words — the dealer’s noun, and the table named', () => {
  const boats = table('t1', 'Highfield Inflatables', [field('f1', 'Variant')])
  const kit = table('t2', 'Rigging Kits', [field('f1', 'Item')])

  it('reads the noun off the table’s own naming column', () => {
    expect(addLabel(boats, false)).toBe('Add a variant')
    expect(addLabel(kit, false)).toBe('Add an item')
  })

  it('names the table when the catalogue draws more than one', () => {
    expect(addLabel(boats, true)).toBe('Add a variant to Highfield Inflatables')
  })

  it('always names the table in the spoken form', () => {
    expect(addSays(boats)).toBe('Add an empty variant to Highfield Inflatables')
  })

  it('says where an unopened new row went, and where to fill it in', () => {
    expect(addedSay(boats, true)).toBe('An empty variant was added to Highfield Inflatables.')
    expect(addedSay(boats, false)).toContain('fill it in on the sheet')
  })

  it('names the row that was taken out, not "1 row deleted"', () => {
    expect(removedSay('Sport 460', boats)).toBe(
      'Sport 460 was taken out of Highfield Inflatables.',
    )
  })

  it('says both names on a rename, so the toast’s UNDO has a subject', () => {
    expect(renamedSay('Sport 460', 'Sport 460 X')).toBe('Sport 460 is now Sport 460 X.')
  })

  it('article', () => {
    expect(article('variant')).toBe('a')
    expect(article('item')).toBe('an')
    expect(article('Outboard')).toBe('an')
  })
})
