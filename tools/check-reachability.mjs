/* ============================================================
   THE REACHABILITY GUARD.

   Four times a finished feature has shipped reachable from nothing —
   the view page, the sentence rules, and then the flow builder, the
   entity designer and the reviewer together, 7,448 lines of working
   software behind no door. Every one was found by accident, weeks
   later, by a person clicking around.

   Nothing about that failure is visible: the code compiles, the
   types check, the dev server is quiet, and the feature is genuinely
   finished. The only observable symptom is a question nobody thinks
   to ask — "can you actually GET there?"

   So this asks it, on every `npm test`, in two ways:

     ORPHANED  no file outside the directory imports anything in it.
               The feature is an island.

     UNREACHED it is imported, but only by other unreached code.
               This is the 7,448-line case: three features importing
               each other, none of them imported by the app. An
               importer count alone would have called all three fine.

   Reachability is walked from the app's real entry, `src/main.tsx`
   — the same file index.html loads — so "reachable" means what a
   person means by it.

   WHAT IT DELIBERATELY DOES NOT DO. It does not check that a feature
   is reachable by CLICKING: a component imported by a stage that is
   never mounted, or behind a route nobody links to, still passes.
   That needs a browser and is a different tool. This is the cheap
   half of the question, and it is the half that has failed.

   Run:  node tools/check-reachability.mjs      (also: npm test)
   ============================================================ */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const FEATURES = join(SRC, 'features')
const ENTRY = join(SRC, 'main.tsx')

/* ------------------------------------------------------------
   DORMANT — the explicit opt-out.

   A directory listed here is allowed to have no importer. The
   `reason` is not documentation, it is the price of admission: a
   list you can add a bare path to is a list that gets used to
   silence this check, which is exactly how a feature goes dark.
   An entry with an empty reason FAILS the run.

   Delete an entry the moment its feature is wired up — a stale
   exemption is a guard that has quietly stopped guarding.
   ------------------------------------------------------------ */
const DORMANT = [
  {
    dir: 'src/features/data',
    reason:
      'SUPERSEDED, not unfinished — and the first thing this guard ever caught. ' +
      'It is the DATA tab of the inspector: a 1,377-line data-entry grid reached ' +
      'only through src/app/Inspector.tsx <- src/app/Rails.tsx <- nothing. Rails ' +
      'is the 340px right rail, retired on purpose (see the header of Rails.tsx: ' +
      'a column of schema controls beside a table you can type straight into is ' +
      'the clutter that removal existed to remove). Everything this grid does, ' +
      'src/features/table now does better — 19 components with column sections, ' +
      'hierarchy grouping, picture cells, level-of-detail rendering and column ' +
      'windowing. Kept rather than deleted only because deleting 1,377 lines is ' +
      "the repository owner's call, not a passing agent's; it is recorded here " +
      'so the decision is visible rather than forgotten. If nobody wants the ' +
      'inspector back, the honest follow-up is to delete this directory, ' +
      'Inspector.tsx and Rails.tsx together, and remove this entry.',
  },
  /* `src/features/modules` was here, exempt for exactly one build
     while the feature waited on a separately owned diff to Shell.tsx.
     Its own entry said it must be deleted the moment src/app imported
     it. src/app/ModuleStage.tsx now does, so it is deleted and the
     directory is checked like every other one — which is the point:
     an exemption kept past its cause is a guard that has quietly
     stopped guarding, and this is the kind of entry the list was
     written to distrust. */
]

/* ---------------------------------------------------------- */
/* reading the tree                                           */
/* ---------------------------------------------------------- */

const CODE = /\.(?:ts|tsx)$/
const COUNTED = /\.(?:ts|tsx|css)$/
/** A test may not vouch for its subject: if a test file counted as an
 *  importer, writing a test would be enough to hide an orphan. */
const TEST = /\.test\.(?:ts|tsx)$/

const slash = (p) => p.split('\\').join('/')
const relative = (p) => slash(p).slice(slash(ROOT).length + 1)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** Comments are stripped before imports are read: several modules
 *  here document their own mounting instructions with a real-looking
 *  `import … from '@/features/…'` line inside a block comment, and a
 *  comment must never be able to vouch for a feature. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}()])\/\/[^\n]*/g, '$1')
}

const SPECIFIER = [
  /\bfrom\s*['"]([^'"]+)['"]/g, // import … from 'x' / export … from 'x'
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('x')
  /\bimport\s+['"]([^'"]+)['"]/g, // side-effect import 'x.css'
]

function specifiersOf(source) {
  const clean = stripComments(source)
  const out = new Set()
  for (const re of SPECIFIER) {
    for (const match of clean.matchAll(re)) out.add(match[1])
  }
  return [...out]
}

/* ---------------------------------------------------------- */
/* resolving — the '@' alias and relative paths, as Vite does  */
/* ---------------------------------------------------------- */

const SUFFIXES = ['', '.ts', '.tsx', '.css', '/index.ts', '/index.tsx']

function existsFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** Absolute path of what a specifier names, or null for a package. */
function resolveSpecifier(fromFile, spec) {
  let base
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('./') || spec.startsWith('../')) base = resolve(dirname(fromFile), spec)
  else return null // bare package name — not our code
  for (const suffix of SUFFIXES) {
    const candidate = base + suffix
    if (existsFile(candidate)) return candidate
  }
  return null
}

/* ---------------------------------------------------------- */
/* the graph                                                  */
/* ---------------------------------------------------------- */

const files = walk(SRC)
const codeFiles = files.filter((f) => CODE.test(f))

/** file → the files it imports */
const imports = new Map()
for (const file of codeFiles) {
  const targets = new Set()
  for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
    const resolved = resolveSpecifier(file, spec)
    if (resolved) targets.add(slash(resolved))
  }
  imports.set(slash(file), targets)
}

/** Everything the app's entry can reach, transitively. */
function reachableFromEntry() {
  const seen = new Set()
  const queue = [slash(ENTRY)]
  while (queue.length) {
    const next = queue.pop()
    if (seen.has(next)) continue
    seen.add(next)
    for (const target of imports.get(next) ?? []) queue.push(target)
  }
  return seen
}

const reachable = existsFile(ENTRY) ? reachableFromEntry() : null

/** file → the files that import it (tests excluded, as above). */
const importedBy = new Map()
for (const [file, targets] of imports) {
  if (TEST.test(file)) continue
  for (const target of targets) {
    const list = importedBy.get(target) ?? []
    list.push(file)
    importedBy.set(target, list)
  }
}

/** Walk UP from a feature's importers to the file nobody imports —
 *  the door that was never hung. Naming it turns "this is unreachable"
 *  into "add one import, here". */
function deadChain(from) {
  const seen = new Set(from)
  let frontier = from.map((f) => [f])
  while (frontier.length) {
    const next = []
    for (const path of frontier) {
      const parents = (importedBy.get(path[path.length - 1]) ?? []).filter((p) => !seen.has(p))
      if (parents.length === 0) return path
      for (const parent of parents) {
        seen.add(parent)
        next.push([...path, parent])
      }
    }
    frontier = next
  }
  return from.slice(0, 1)
}

/* ---------------------------------------------------------- */
/* the question, per feature directory                        */
/* ---------------------------------------------------------- */

function featureDirs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const full = join(dir, entry.name)
    out.push(full)
    featureDirs(full, out) // nested dirs are checked against their parent too
  }
  return out
}

const inside = (file, dir) => file.startsWith(`${slash(dir)}/`)

function linesIn(dir) {
  let lines = 0
  let count = 0
  for (const file of walk(dir)) {
    if (!COUNTED.test(file) || TEST.test(file)) continue
    count += 1
    lines += readFileSync(file, 'utf8').split('\n').length
  }
  return { lines, count }
}

const problems = []
const dormantSeen = new Set()

for (const dir of featureDirs(FEATURES)) {
  const rel = relative(dir)
  const dormant = DORMANT.find((d) => d.dir === rel)
  if (dormant) {
    dormantSeen.add(rel)
    if (!String(dormant.reason ?? '').trim()) {
      problems.push({ rel, kind: 'NO REASON', detail: 'opt-out entry carries no reason' })
    }
    continue
  }

  const importers = []
  for (const [file, targets] of imports) {
    if (inside(file, dir) || TEST.test(file)) continue
    for (const target of targets) {
      if (inside(target, dir)) {
        importers.push(file)
        break
      }
    }
  }

  const { lines, count } = linesIn(dir)
  if (count === 0) continue // nothing in it to be unreachable

  if (importers.length === 0) {
    problems.push({
      rel,
      kind: 'ORPHANED',
      detail: 'no file outside this directory imports anything in it',
      lines,
      count,
    })
    continue
  }

  if (reachable && !importers.some((f) => reachable.has(f))) {
    const chain = deadChain(importers).map(relative)
    problems.push({
      rel,
      kind: 'UNREACHED',
      detail:
        `imported only by code the app never loads:\n` +
        `            ${rel} ← ${chain.join(' ← ')} ← nothing`,
      lines,
      count,
    })
  }
}

for (const entry of DORMANT) {
  if (!dormantSeen.has(entry.dir)) {
    problems.push({
      rel: entry.dir,
      kind: 'STALE OPT-OUT',
      detail: 'listed as dormant, but no such directory exists',
    })
  }
}

/* ---------------------------------------------------------- */
/* the report                                                 */
/* ---------------------------------------------------------- */

const checked = featureDirs(FEATURES).length - dormantSeen.size

if (!existsFile(ENTRY)) {
  console.log(`reachability: ${relative(ENTRY)} is missing — only the importer check ran.`)
}

if (problems.length === 0) {
  console.log(
    `reachability: ${checked} director${checked === 1 ? 'y' : 'ies'} under src/features, ` +
      `every one reachable from ${relative(ENTRY)}.` +
      (DORMANT.length ? ` ${DORMANT.length} dormant by declaration.` : ''),
  )
  process.exit(0)
}

console.error('\nREACHABILITY — a feature nobody can get to:\n')
for (const p of problems) {
  const size =
    p.lines === undefined ? '' : ` — ${p.lines} lines in ${p.count} file${p.count === 1 ? '' : 's'}`
  console.error(`  ${p.kind}  ${p.rel}${size}`)
  console.error(`            ${p.detail}\n`)
}
console.error(
  'Wire it to something the app loads, or declare it dormant WITH A REASON in\n' +
    'the DORMANT list at the top of tools/check-reachability.mjs.\n',
)
process.exit(1)
