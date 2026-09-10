/* ============================================================
   THE WORDS A READER IS ALLOWED TO SEE

   DESIGN_PRINCIPLES §6: "No jargon in chrome. Not 'entity', not
   'UID', not 'cardinality'."

   CLUELESS_USER_TESTS O5 checked the rules pane for this and
   closed. The word survived in TWENTY other reader-facing strings,
   and eleven of them were LINT FINDINGS — sentences written to
   explain a problem to somebody who by definition does not know the
   vocabulary yet. "HIDDEN ENTITY" was the title of one of them.

   ── WHY A SWEEP AND NOT TWENTY ASSERTIONS ────────────────────

   Twenty assertions would pass forever and catch nothing. The
   failure mode is not "these twenty regress"; it is "the
   twenty-first is written next month by somebody who has not read
   §6". So this reads the source and fails on the WORD, wherever it
   next turns up in a string a person can see.

   ── WHAT COUNTS AS READER-FACING ─────────────────────────────

   Four prefixes, and the list is deliberately short: `blurb`,
   `title`, `aria-label`, `why`. Those reach a screen.
   `entityId`, `EntityDef` and `entity.name` are CODE and stay —
   the model's own type is called what it is called, and renaming it
   is a refactor, not a vocabulary fix.

   A sweep that tried to catch every string anywhere would fire on
   comments, on tests and on the type name itself, and a guard that
   cries wolf gets suppressed and then catches nothing at all.

   ── THE ONE THAT NEARLY MADE IT USELESS ──────────────────────

   `${entity.name}` renders as "Boats". The identifier never reaches
   the screen. The first run of this reported twelve of those as
   violations — twelve false alarms out of twenty-one findings — and
   a guard with that ratio is one somebody turns off. Interpolations
   are stripped before the words are read.

   Lives in tools/ rather than as a vitest suite because it reads the
   filesystem, and `tsconfig.app.json` carries no node types: the
   same reason `check-styles.mjs` and `check-reachability.mjs` are
   here.
   ============================================================ */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'src')

/** Every `.ts`/`.tsx` under src, tests excluded — a test may name the
 *  jargon precisely in order to assert against it. */
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

const READER_FACING =
  /(?:blurb|title|aria-label|why)\s*[:=]\s*(?:\{?\s*)?(['"`])((?:(?!\1)[\s\S])*?)\1/g

/** word → what to say instead, which is the half that makes a
 *  failure actionable rather than annoying. */
const JARGON = [
  ['entity', 'table'],
  ['entities', 'tables'],
  ['cardinality', 'how many'],
]

const files = sources(SRC)
const findings = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(READER_FACING)) {
    const rendered = m[2].replace(/\$\{[^}]*\}/g, ' ')
    for (const [word, instead] of JARGON) {
      if (!new RegExp(`\b${word}\b`, 'i').test(rendered)) continue
      const line = src.slice(0, m.index).split('\n').length
      findings.push({
        at: `${file.replace(SRC, 'src').split('\\').join('/')}:${line}`,
        word,
        instead,
        text: rendered.trim().replace(/\s+/g, ' ').slice(0, 96),
      })
    }
  }
}

console.log('  READER VOCABULARY')
console.log(`    ${files.length} source files · §6, no jargon in chrome\n`)

/* A guard that measured nothing would report clean for ever. */
if (files.length < 120) {
  console.error(`FAIL — only ${files.length} files swept; the walk is broken.`)
  process.exit(1)
}

if (findings.length === 0) {
  console.log('OK — no jargon in a string a person can read.')
  process.exit(0)
}

console.log(`> JARGON A READER CAN SEE (${findings.length}):`)
for (const f of findings) {
  console.log(`    ${f.at}`)
  console.log(`      "${f.text}"`)
  console.log(`      say "${f.instead}" rather than "${f.word}"`)
}
console.log(`\nFAIL — ${findings.length} reader-facing string(s) carry jargon.`)
process.exit(1)
