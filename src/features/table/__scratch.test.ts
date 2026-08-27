import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { buildNorthsideProject } from '@/demos/northside'
const seed = buildNorthsideProject()
it('dump', () => {
  const L: string[] = []
  for (const e of seed.entities) {
    const rows = seed.rowsByEntity[e.id] ?? []
    if (!['boat','motor','trailer','accessory','package'].includes(e.kind)) continue
    L.push(`### ${e.name} [${e.kind}] rows=${rows.length} hier=${(e.hierarchy??[]).map(h=>e.fields.find(f=>f.id===h)?.name).join('/')}`)
    for (const f of e.fields) {
      const vals = new Set<string>()
      for (const r of rows.slice(0, 4000)) {
        const v = r.values[f.id]
        if (v === null || v === undefined || v === '') continue
        vals.add(Array.isArray(v) ? '[img]' : String(v))
      }
      L.push(`    ${f.type.padEnd(9)} ${f.name.padEnd(26)} distinct=${String(vals.size).padStart(4)}  ${[...vals].slice(0,4).join(' | ').slice(0,64)}`)
    }
  }
  writeFileSync('scratch-dump.txt', L.join('\n'))
})
