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

     ORPHANED  nothing imports it from outside — no file outside the
               directory, or, for a src/app file, no non-test file
               anywhere. The feature is an island.

     UNREACHED it is imported, but only by other unreached code.
               This is the 7,448-line case: three features importing
               each other, none of them imported by the app. An
               importer count alone would have called all three fine.

   Reachability is walked from the app's real entry, `src/main.tsx`
   — the same file index.html loads — so "reachable" means what a
   person means by it.

   WHAT IT COVERS, AND THE UNIT IN EACH TREE. Two trees, asked the
   same question with a different unit, because they are shaped
   differently:

     src/features   per DIRECTORY. A feature IS a directory here,
                    so reaching one file of it reaches the feature.

     src/app        per FILE. src/app is flat — one directory
                    holding the whole shell, no subdirectories — so
                    a directory check there asks a single question
                    about all of it and the answer is always yes.
                    A question with a fixed answer is not a guard,
                    which is why src/app went unasked entirely: the
                    walk was rooted at `join(SRC, 'features')` and
                    stopped there.

   The first run over src/app found 8 files, 1,926 lines, that
   `src/main.tsx` cannot reach — including the 340px right rail and
   its inspector, already named in the DORMANT entry below as the
   reason src/features/data is dark. They are recorded in
   tools/reachability-baseline.json, not forgiven; see the comment
   on BASELINE.

   WHAT IT DELIBERATELY DOES NOT DO. It does not check that a feature
   is reachable by CLICKING: a component imported by a stage that is
   never mounted, or behind a route nobody links to, still passes.
   That needs a browser and is a different tool. This is the cheap
   half of the question, and it is the half that has failed.

   Run:  node tools/check-reachability.mjs      (also: npm test)
   ============================================================ */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const FEATURES = join(SRC, 'features')
const APP = join(SRC, 'app')
const ENTRY = join(SRC, 'main.tsx')
const BASELINE = join(ROOT, 'tools', 'reachability-baseline.json')

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

/* ------------------------------------------------------------
   THE BASELINE — the other opt-out, and a different kind.

   DORMANT is forward-looking: "this is not wired up YET, and here
   is why." A person wrote it, with a reason, on purpose.

   This is backward-looking: "this was already dark when the guard
   first looked here." Extending the walk to src/app found 8 files
   and 1,926 lines at once. Failing on them would leave `npm test`
   red on day one for work nobody in this change is doing, and a
   red suite gets switched off inside a week — which is how the
   guard stops guarding, the same failure DORMANT is written to
   distrust. Same answer as tools/style-baseline.json: freeze the
   known set, fail only on what is NEW.

   IT MAY ONLY SHRINK, and that is mechanical, not a convention:
   `--update-baseline` writes the entries that are STILL dark and
   REFUSES to run while any fresh one exists. There is no way to
   bank a newly-unreachable file. Wire it up, or declare the
   directory dormant with a reason.

   The list is src/app FILES only. A feature directory that goes
   dark still has to answer to DORMANT, which demands a sentence.
   ------------------------------------------------------------ */
function loadBaseline() {
  try {
    return new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).unreachable ?? [])
  } catch {
    return new Set() // absent on first run; --update-baseline seeds it
  }
}
/* existsFile is a hoisted function declaration, defined below. */
const baselineExists = existsFile(BASELINE)
const baseline = loadBaseline()

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

/* ---------------------------------------------------------- */
/* the same question, per FILE, in src/app                     */
/* ---------------------------------------------------------- */

/** Every non-test file src/app is made of. `.css` counts the same
 *  as `.ts`/`.tsx`: a stylesheet nobody imports is the identical
 *  failure, and src/app holds the two biggest in the repo
 *  (shell.css 219KB, actionbar.css 36KB). Both are reached today. */
const appFiles = walk(APP).filter((f) => COUNTED.test(f) && !TEST.test(f))

for (const file of appFiles) {
  const key = slash(file)
  if (reachable?.has(key)) continue
  const rel = relative(file)
  const lines = readFileSync(file, 'utf8').split('\n').length
  const importers = importedBy.get(key) ?? []

  if (importers.length === 0) {
    problems.push({
      rel,
      area: 'app',
      kind: 'ORPHANED',
      detail: 'no non-test file under src/ imports it',
      lines,
      count: 1,
    })
    continue
  }

  /* No entry file means the walk never ran; the importer count
     above is then the whole of what can honestly be asked. */
  if (!reachable) continue

  const chain = deadChain(importers).map(relative)
  problems.push({
    rel,
    area: 'app',
    kind: 'UNREACHED',
    detail:
      `imported only by code the app never loads:\n` +
      `            ${rel} ← ${chain.join(' ← ')} ← nothing`,
    lines,
    count: 1,
  })
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

/** Only src/app files may be baselined — see the BASELINE comment. */
const baselineable = (p) => p.area === 'app'
const carried = problems.filter((p) => baselineable(p) && baseline.has(p.rel))
const fresh = problems.filter((p) => !carried.includes(p))
const carriedLines = carried.reduce((n, p) => n + p.lines, 0)
/** Baselined, and dark no longer — or gone. Reported, never fatal:
 *  the suite must not go red because somebody FIXED one. */
const stillDark = new Set(carried.map((p) => p.rel))
const cleared = [...baseline].filter((rel) => !stillDark.has(rel)).sort()

if (process.argv.includes('--update-baseline')) {
  if (baselineExists && fresh.length) {
    console.error(
      `\nRefusing to write ${relative(BASELINE)}: ${fresh.length} unreachable ` +
        `entr${fresh.length === 1 ? 'y is' : 'ies are'} not in it.\n` +
        'The baseline records what was already dark; it may only shrink. Wire the\n' +
        'new one up, or declare its directory dormant with a reason.\n',
    )
    process.exit(1)
  }
  /* Seeding (no file yet) records everything dark right now.
     Every run after that writes only what is STILL dark, which is
     what makes the file monotonically shrinking. */
  const next = (baselineExists ? carried : problems.filter(baselineable)).map((p) => p.rel).sort()
  writeFileSync(BASELINE, JSON.stringify({ unreachable: next }, null, 2) + '\n')
  console.log(`\nBaseline written: ${next.length} recorded unreachable files.\n`)
  process.exit(0)
}

if (!existsFile(ENTRY)) {
  console.log(`reachability: ${relative(ENTRY)} is missing — only the importer check ran.`)
}

if (fresh.length === 0) {
  const scope =
    `${checked} director${checked === 1 ? 'y' : 'ies'} under src/features, ` +
    `${appFiles.length} file${appFiles.length === 1 ? '' : 's'} in src/app`
  console.log(
    carried.length === 0
      ? `reachability: ${scope} — every one reachable from ${relative(ENTRY)}.` +
          (DORMANT.length ? ` ${DORMANT.length} dormant by declaration.` : '')
      : `reachability: ${scope} — nothing NEWLY unreachable.` +
          (DORMANT.length ? ` ${DORMANT.length} dormant by declaration.` : '') +
          ` ${carried.length} recorded in ${relative(BASELINE)}, ${carriedLines} lines.`,
  )
  for (const p of carried) {
    console.log(`  recorded  ${p.kind}  ${p.rel} — ${p.lines} lines`)
  }
  if (cleared.length) {
    console.log(
      `\n${cleared.length} baselined entr${cleared.length === 1 ? 'y is' : 'ies are'} ` +
        'reachable now or gone — run `node tools/check-reachability.mjs --update-baseline`:',
    )
    for (const rel of cleared) console.log(`  ${rel}`)
    console.log('')
  }
  process.exit(0)
}

console.error('\nREACHABILITY — a feature nobody can get to:\n')
for (const p of fresh) {
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
