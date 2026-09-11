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

/* ============================================================
   AND A RAW CONTROL BYTE IN A SOURCE FILE, which is here because it
   is the same class of fault as the one above: something that makes a
   sweep quietly stop sweeping.

   `helpers.ts` carried one NUL — a deliberate separator in
   `markKey`, written as a raw byte instead of the `\u0000` escape.
   One such byte makes the whole file BINARY: `grep -rn` over `src/`
   skipped it in silence, and so did `git grep`. Every sweep this repo
   runs had a hole in it exactly the size of that file, and this
   codebase's first working rule is "grep the tree, not the row" —
   written down after a module was duplicated for want of one grep.

   TAB, NEWLINE AND CARRIAGE RETURN ARE NOT CONTROL BYTES FOR THIS
   PURPOSE. They are whitespace and every file has them. What is
   refused is the rest of C0 plus DEL, none of which any editor puts
   in a TypeScript file on purpose — and each of which has an escape
   that reads the same to the compiler and leaves the file legible.
   ============================================================ */
/* The one place in this repo where matching a control character is
   the whole point, so the rule that forbids it is turned off for
   THIS EXPRESSION and nowhere else — a file-wide disable would let
   the next one through in silence, which is the fault this guard was
   written to catch. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function controlBytes(file) {
  const raw = readFileSync(file, 'utf8')
  const hits = []
  raw.split('\n').forEach((line, i) => {
    const at = line.search(CONTROL)
    if (at === -1) return
    const code = line.charCodeAt(at)
    hits.push({
      at: `${file.replace(SRC, 'src').split('\\').join('/')}:${i + 1}`,
      code: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
    })
  })
  return hits
}

const files = sources(SRC)
const findings = []
const controls = files.flatMap(controlBytes)

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(READER_FACING)) {
    const rendered = m[2].replace(/\$\{[^}]*\}/g, ' ')
    for (const [word, instead] of JARGON) {
      /* `\\b`, NOT `\b`. Inside a template literal `\b` is the
         BACKSPACE character (U+0008), so this pattern was
         <BS>entity<BS> — which matches nothing a person can type, and
         the sweep had been reporting "OK — no jargon" vacuously since
         it was written. CLAUDE.md's own warning, in this repo's own
         guard: a guard that silently measures the wrong thing reports
         clean and means nothing. */
      if (!new RegExp(`\\b${word}\\b`, 'i').test(rendered)) continue
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

if (controls.length > 0) {
  console.log(`> A RAW CONTROL BYTE IN SOURCE (${controls.length}):`)
  for (const c of controls) console.log(`    ${c.at}  ${c.code}`)
  console.log(
    '\nFAIL — one of these makes the whole file binary to grep.\n' +
      '       Write it as an escape (\\u0000, \\t, …); the compiler reads the same byte.',
  )
  process.exit(1)
}

if (findings.length === 0) {
  console.log('OK — no jargon in a string a person can read, and no raw control bytes.')
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
