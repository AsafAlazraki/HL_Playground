/* ============================================================
   EVERY STORED KEY IS CLASSIFIED — forgotten on a wipe, or kept.

   THE DEFECT THIS EXISTS TO PREVENT A REPEAT OF. `resetProject()`
   called `repository.wipe()`, which empties every DEXIE store, and
   nothing else. SIXTEEN stores live in localStorage, so pressing
   "start again" left the previous business's quotes, rules, workbook
   seeds, sales board, merge log, column mappings and seed stamp
   exactly where they were — and the seed stamp then told the fresh
   project that the demo data had already been loaded.

   Two thirds of that was predicted in a comment at
   `src/features/constraints/index.ts:63` — "`resetProject()` should
   also call `clearConstraints()` … or a wiped project comes back with
   the old organisation's rules still in it" — and the comment was the
   whole of the fix for as long as it stood there.

   ── WHY A SWEEP AND NOT SIXTEEN ASSERTIONS ───────────────────

   Sixteen assertions would pass forever and catch nothing. The
   failure mode is not "these sixteen regress"; it is the
   SEVENTEENTH, written next month by somebody who has not read
   `forgetBusiness.ts`. And it fails SILENTLY: a store nobody clears
   behaves exactly like a store that works, right up until a person
   wipes their project and finds the old one still there.

   ── IT READS THE APP'S OWN LISTS ─────────────────────────────

   `BUSINESS_KEYS` and `KEPT_KEYS` are parsed out of
   `src/store/forgetBusiness.ts` rather than repeated here, because a
   guard holding its own copy of the thing it guards is a guard that
   drifts. If that file is restructured so the two arrays cannot be
   read, this fails loudly rather than sweeping nothing — the same
   rule `check-words.mjs` keeps with its file count.
   ============================================================ */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'src')
const OWNER = join(SRC, 'store', 'forgetBusiness.ts')

/** Every `.ts`/`.tsx` under src, tests excluded — a test names keys
 *  precisely in order to assert against them. */
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      sources(p, out)
      continue
    }
    if (!/\.tsx?$/.test(name)) continue
    if (/\.test\.tsx?$/.test(name)) continue
    out.push(p)
  }
  return out
}

/** The two lists, read out of the module that owns them. */
function listsFrom(file) {
  const src = readFileSync(file, 'utf8')
  const read = (name) => {
    const at = src.indexOf(`export const ${name}`)
    if (at === -1) return null
    /* the '[' of the ARRAY, not the one in `readonly string[]` —
       which is what the first version of this found, and why it
       refused to sweep rather than sweeping nothing */
    const open = src.indexOf('[', src.indexOf('= [', at))
    const close = src.indexOf(']', open)
    if (open === -1 || close === -1) return null
    /* KEY-SHAPED STRINGS ONLY. A plain quoted-string match paired
       the APOSTROPHES in the prose beside each entry — "a supplier's
       columns", "the customer register's letters" — and read the
       text between them as keys, so the guard reported sixteen real
       keys as unclassified while claiming to have parsed 23. */
    return [...src.slice(open, close).matchAll(/'((?:hl|helmlogic).[A-Za-z0-9._-]+)'/g)].map(
      (m) => m[1],
    )
  }
  return { business: read('BUSINESS_KEYS'), kept: read('KEPT_KEYS') }
}

const { business, kept } = listsFrom(OWNER)
if (!business || !kept || business.length === 0 || kept.length === 0) {
  console.error(
    'FAIL — could not read BUSINESS_KEYS / KEPT_KEYS out of src/store/forgetBusiness.ts.\n' +
      '       This guard sweeps nothing until it can, which is why it stops here.',
  )
  process.exit(1)
}

const classified = [...business, ...kept]
const known = (key) => classified.some((p) => key === p || key.startsWith(`${p}:`))

/** Key literals this app writes: `'hl.…'` or `'helmlogic.…'`, in a
 *  quote or a template literal, however the org slug is appended. */
const KEY_LITERAL = /['"`](hl|helmlogic)\.[a-zA-Z0-9._-]+/g

const files = sources(SRC)
const found = new Set()
const loose = []

for (const file of files) {
  if (file === OWNER) continue
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(KEY_LITERAL)) {
    const key = m[0].slice(1)
    found.add(key)
    if (known(key)) continue
    const line = src.slice(0, m.index).split('\n').length
    loose.push({
      key,
      at: `${file.replace(SRC, 'src').split('\\').join('/')}:${line}`,
    })
  }
}

console.log('  STORED KEYS')
console.log(
  `    ${files.length} source files · ${found.size} keys · ${business.length} forgotten on a wipe, ${kept.length} kept\n`,
)

/* A guard that measured nothing would report clean for ever. */
if (files.length < 300 || found.size < 20) {
  console.error(
    `FAIL — only ${files.length} files and ${found.size} keys swept; the walk is broken.`,
  )
  process.exit(1)
}

if (loose.length === 0) {
  console.log('OK — every stored key is either forgotten on a wipe or deliberately kept.')
  process.exit(0)
}

console.log(`> UNCLASSIFIED STORED KEYS (${loose.length}):`)
for (const f of loose) console.log(`    ${f.key}\n      ${f.at}`)
console.log(
  '\nFAIL — a wipe must either take these or deliberately keep them.\n' +
    '       Add each to BUSINESS_KEYS or KEPT_KEYS in src/store/forgetBusiness.ts,\n' +
    '       with a line saying which it is and why.',
)
process.exit(1)
