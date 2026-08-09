/* ============================================================
   STARTING POINTS — the guard in front of every prepared set.

   Loading a set REPLACES the sheet. `replaceProject` swaps
   entities, zones, rules and rows wholesale and clears
   `selection` — but NOT `activeRuleId`, which would then point at
   a rule that no longer exists. So the guard lives here, once,
   rather than at each call site: confirm (naming exactly what is
   lost), stand the chrome down, then load. On an empty sheet
   there is nothing to lose, so nothing is asked — which is the
   case the invitation card hits.

   WHAT IS ON OFFER is `@/demos`, and only that. Two sets survive
   CONFIGURATOR_SPEC.md §6b ("Starting data — REAL, or none at
   all"): the real Northside Marine file, and a blank sheet. The
   invented `fitment` and `dealership` sets are retired and are
   reachable from no surface in the app.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { DEMOS, type DemoSet } from '@/demos'

/** The id of the do-nothing set, which every empty surface already
 *  offers implicitly — it is what the user is looking at. */
const BLANK_ID = 'blank'

/** The prepared set built from real, sourced business data — today
 *  the Northside Marine Master Price File. Read off `DEMOS` rather
 *  than named here, so the demos module stays the single register
 *  of what exists. `undefined` while only the blank sheet ships,
 *  and every caller draws nothing rather than a dead button. */
export function realDemoSet(): DemoSet | undefined {
  return DEMOS.find((d) => d.id !== BLANK_ID)
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** @returns true if the demo was loaded, false if the user backed out. */
export function loadDemoSet(demo: DemoSet): boolean {
  const store = useProjectStore.getState()
  const entityCount = Object.keys(store.entities).length

  if (entityCount > 0) {
    const rowCount = Object.values(store.rowsByEntity).reduce(
      (total, rows) => total + rows.length,
      0,
    )
    /* CONFIGURATOR VOCABULARY. This string is read by a user, so it
       says TABLE — never entity, schema, field or reference. */
    const lost: string[] = [plural(entityCount, 'table', 'tables')]
    if (rowCount > 0) lost.push(plural(rowCount, 'row of data', 'rows of data'))
    const ruleCount = Object.keys(store.rules).length
    if (ruleCount > 0) lost.push(plural(ruleCount, 'rule', 'rules'))
    const zoneCount = Object.keys(store.groups).length
    if (zoneCount > 0) lost.push(plural(zoneCount, 'zone', 'zones'))

    const confirmed = window.confirm(
      `Load "${demo.name}"?\n\nIt replaces the sheet you have now — ${lost.join(
        ', ',
      )} — and that cannot be undone.`,
    )
    if (!confirmed) return false
  }

  /* the old rule id would survive the swap and leave the canvas drawing
     a flow that no longer exists — drop it before the sheet changes */
  store.setActiveRule(null)
  store.select(null)
  demo.load()
  return true
}
