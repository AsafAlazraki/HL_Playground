/* ============================================================
   A STRUCTURAL CHANGE IS NEVER A SIDE EFFECT — UX_PASS §5, and
   audit finding 14, which is the sharpest process defect the audit
   found:

     "One click on an accessory, on a view page, moved the selection
      onto a brand-new join table, made both doors vanish, and took
      TABLES 21 → 22."

   The rule that came out of it, for the whole app: a new table, a
   new column or a new join is OFFERED, in a sentence that names it,
   and is undoable. Never authored behind a browse or a pick.

   WHY THIS GUARD READS SOURCE. The rule is about how a call is
   REACHED, and no behavioural test can see it: a `BlockCard` that
   called `ensureJoinTable` on the first line of `withJoin` renders
   identically, pins identically, and is the bug. `applied.test.ts`
   two directories away makes the same move for the same reason —
   "a claim about how the code is written, checked by reading how
   the code is written".

   FIVE GESTURES REACHED THE OLD CALL: a star, an ×, a pin from the
   ADD panel, a drag to reorder, and the keyboard. Every one of them
   goes through `withJoin` now, and `withJoin` either uses a join
   that EXISTS — so the everyday act is unchanged and the second
   star does not ask twice — or holds the act and puts the question
   up.

   A NEW CALLER MEANS A NEW LINE HERE. `ensureJoinTable` is exported
   from `@/features/views`, so another surface can reach it; if one
   ever does, its source belongs in this file with the same three
   assertions, which is the friction that keeps the list honest.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import blockSource from '@/features/views/BlockCard.tsx?raw'
import { joinTableName } from './pairs'
import type { EntityDef } from '@/types/model'

const ISO = '2026-01-01T00:00:00.000Z'
const table = (id: string, name: string): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields: [{ id: `${id}-name`, name: 'Name', type: 'text' }],
  displayFieldId: `${id}-name`,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

/** Text with comments taken out — every assertion below is about the
 *  CODE, and this file's own header quotes the call it is guarding. */
const code = blockSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* ---------------------------------------------------------- */

describe('the one call that authors a table', () => {
  it('IS MADE FROM EXACTLY ONE PLACE', () => {
    const calls = code.match(/ensureJoinTable\(/g) ?? []
    expect(calls).toHaveLength(1)
  })

  it('and that place is the button on the ask, not the gesture', () => {
    /* `acceptLink` is reachable only from "Create it and pin". The
       assertion is that the call sits inside it — take the text from
       `const acceptLink` to the end of that function. */
    const at = code.indexOf('const acceptLink')
    expect(at).toBeGreaterThan(-1)
    const body = code.slice(at, at + 900)
    expect(body).toContain('ensureJoinTable(')
  })

  it('refuses to run unless the ask is about the rows still on screen', () => {
    /* The scope check: a held act must not land on a different
       selection than the one a person read the question about. */
    const at = code.indexOf('const acceptLink')
    const body = code.slice(at, at + 400)
    expect(body).toContain('linkAsk.scope !== scopeKey')
  })
})

describe('every gesture goes through the gate', () => {
  it('holds the act rather than writing when there is no join', () => {
    const at = code.indexOf('const withJoin')
    expect(at).toBeGreaterThan(-1)
    /* to the next declaration, not a fixed window — a window long
       enough to be safe runs into `acceptLink`, where the call
       legitimately IS. */
    const body = code.slice(at, code.indexOf('const acceptLink'))
    /* an existing join is used, exactly as before */
    expect(body).toContain('if (join)')
    /* and where there is none, the act is HELD, not performed */
    expect(body).toContain('setLinkAsk(')
    expect(body).not.toContain('ensureJoinTable(')
  })

  it('names the table it would make from ONE source, so the ask cannot lie', () => {
    /* The sentence a person reads and the table that gets made are
       both `joinTableName`, which is why they cannot say different
       things. */
    expect(code).toContain('joinTableName(sourceEntity, target)')
    expect(joinTableName(table('a', 'Boats'), table('b', 'Motors'))).toContain('Boats')
    expect(joinTableName(table('a', 'Boats'), table('b', 'Motors'))).toContain('Motors')
  })

  it('states what the sheet holds, which is the number the audit watched move', () => {
    /* "took TABLES 21 → 22", said before it happens rather than
       discovered afterwards. */
    expect(code).toContain('Object.keys(ctx.entities).length')
    expect(blockSource).toContain('The sheet now holds ${tableCount + 1} tables.')
  })

  it('is undoable, and says so with a toast rather than a dialog', () => {
    /* Rule 9. The table and the pin are written in one tick, so they
       go back together. */
    expect(code).toContain('sayUndoable(')
  })
})
