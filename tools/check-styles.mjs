/* ============================================================
   THE STYLE CONTRACT GUARD.

   Written for the redesign, and useful after it.

   A visual redesign of a 23,000-line stylesheet has exactly one
   characteristic failure, and neither `tsc` nor `vitest` nor the
   reachability guard can see it: a class name that a component
   still writes but no stylesheet still matches. The build is
   green, the types check, the feature is reachable, the element
   renders — unstyled, or half-styled, somewhere nobody looked.

   The inverse is the other half: a rule nobody references, which
   is dead weight that makes the next pass slower and can quietly
   "work" only because something else happens to match.

   So this asks two questions across src/:

     ORPHAN RULE     a class is written in TSX and no CSS file
                     declares it. Styling is silently lost.

     DEAD RULE       a class is declared in CSS and appears
                     nowhere in any TSX file. Dead weight.

   HOW IT READS TSX. Only STRING LITERALS inside a className are
   trusted — quoted attributes and the literal chunks of template
   literals. A class assembled at runtime from a variable is not
   guessed at, because a guess here produces a false alarm and a
   guard that cries wolf gets switched off. Classes built by
   interpolation are covered by the ALLOW list below, which is
   short on purpose and has to name a reason.

   THE BASELINE. This repo already has orphans — 35 of them, from
   before the guard existed, verified by hand (`qt-list-who` is
   written at QuoteList.tsx:50 and has zero rules in quote.css).
   Failing on those would mean the guard is red from the first run
   and gets switched off within a day.

   So the known set is frozen in tools/style-baseline.json and the
   run fails only on orphans NOT in it. That is the rule the
   redesign needs: you may not ADD an unstyled element. Clearing
   the existing 35 is separate work, and the baseline shrinks as
   they go — `--update-baseline` rewrites it, and a shrinking file
   is the record of that.

   EXIT CODE is 1 for new orphans only. Dead rules are reported and
   never fatal: deleting CSS is a judgement call and a guard should
   not force one mid-redesign.
   ============================================================ */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/* fileURLToPath, not URL.pathname — this repo lives in a directory
   with a space in it, and .pathname hands back "HelmLogic%20Dynamic". */
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')

/* Class prefixes built by interpolation, each with the reason it
   cannot be read statically. Anything added here must name the
   file that composes it. */
const ALLOW = [
  /* library-owned: React Flow writes and reads these itself */
  ['nodrag', 'React Flow interaction opt-out'],
  ['nopan', 'React Flow interaction opt-out'],
  ['nowheel', 'React Flow interaction opt-out'],
  ['react-flow', 'React Flow ships these; we restyle them'],
  ['tcard--', 'DesignPreview composes selected/dim from a prop'],
  ['ds-btn--', 'button role is a prop'],
  ['ds-chip--', 'chip role is a prop'],
  ['grid-band--', 'active band is state'],
  ['nav-item--', 'active nav row is state'],
  ['cmdk-row--', 'highlighted result is state'],
  ['istep--', 'import step state'],
  ['imap-to--', 'mapping outcome is data'],
  ['imap-status--', 'mapping outcome is data'],
  ['job--', 'job state is derived'],
  ['ftok--', 'clause side is data'],
  ['dcard--', 'picked door is state'],
  ['sw--', 'switch state'],
  ['mcard--', 'builtin/new are variants'],
  ['pv-tag--', 'preview only'],
  ['pv-stage--', 'preview only'],
  ['badge--', 'bound/unmapped is derived'],
  ['blk--', 'broken is derived'],
  ['toast--', 'toast severity'],
  ['cap--', 'refused is derived'],
  ['star--', 'starred is data'],
  ['busy-c', 'preview only — busy-col/cell variants'],
  ['oldcard', 'preview only — the outgoing card'],
  ['oldnav', 'preview only'],
  ['oldplate', 'preview only'],
  ['oldflow', 'preview only'],
]

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = walk(SRC)
const tsx = files.filter((f) => f.endsWith('.tsx'))
const css = files.filter((f) => f.endsWith('.css'))

/* ---------- what CSS declares ---------- */
const declared = new Map() // class -> Set(file)
for (const f of css) {
  const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    const cls = m[1]
    if (!declared.has(cls)) declared.set(cls, new Set())
    declared.get(cls).add(relative(ROOT, f))
  }
}

/* ---------- what TSX writes ---------- */
const written = new Map() // class -> Set(file)
const rawTsx = new Map()
for (const f of tsx) {
  const text = readFileSync(f, 'utf8')
  rawTsx.set(f, text)
  /* className="..." | className={'...'} | className={`... ${x} ...`}
     Only the literal segments are read. */
  for (const m of text.matchAll(/className\s*=\s*(?:"([^"]*)"|\{([\s\S]*?)\})/g)) {
    const chunk = m[1] ?? m[2] ?? ''
    const literals = m[1] !== undefined ? [m[1]] : [...chunk.matchAll(/['"`]([^'"`]*)['"`]/g)].map((x) => x[1])
    for (const lit of literals) {
      for (const cls of lit.split(/\s+/)) {
        /* Class names in this repo are kebab-case and lowercase. A
           camelCase token inside a className expression is a variable
           or an object key that the brace-matcher swept up, not a
           class — and reporting it is how a guard loses its
           credibility. */
        if (!cls || !/^[a-z][a-z0-9-]*$/.test(cls)) continue
        if (!cls.includes('-')) continue /* bare words are state flags composed elsewhere */
        if (!written.has(cls)) written.set(cls, new Set())
        written.get(cls).add(relative(ROOT, f))
      }
    }
  }
}

const allowed = (cls) => ALLOW.some(([p]) => cls.startsWith(p))

/* ---------- orphan rules: written, never declared ---------- */
const orphans = []
for (const [cls, where] of written) {
  if (declared.has(cls) || allowed(cls)) continue
  orphans.push({ cls, where: [...where] })
}

/* ---------- dead rules: declared, never written ----------
   Checked as a substring across all TSX so an interpolated
   `${base}--on` still counts its base as used. */
const allTsx = [...rawTsx.values()].join('\n')
const dead = []
for (const [cls, where] of declared) {
  if (written.has(cls) || allowed(cls)) continue
  if (allTsx.includes(cls)) continue
  dead.push({ cls, where: [...where] })
}

/* ---------- the baseline ---------- */
const BASELINE = join(ROOT, 'tools', 'style-baseline.json')
let baseline = []
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).orphans ?? []
} catch {
  /* absent on first run; --update-baseline writes it */
}
const known = new Set(baseline)
const fresh = orphans.filter((o) => !known.has(o.cls))
const cleared = baseline.filter((c) => !orphans.some((o) => o.cls === c))

if (process.argv.includes('--update-baseline')) {
  const next = { orphans: orphans.map((o) => o.cls).sort() }
  writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n')
  console.log(`\nBaseline written: ${next.orphans.length} known orphans.\n`)
  process.exit(0)
}

const pad = (s, n) => String(s).padEnd(n)
console.log('\nSTYLE CONTRACT')
console.log(`  ${css.length} stylesheets · ${tsx.length} components`)
console.log(`  ${declared.size} classes declared · ${written.size} written\n`)

if (fresh.length) {
  console.log(`NEW ORPHAN RULES — written in TSX, no CSS declares them (${fresh.length}):`)
  for (const o of fresh) console.log(`  ${pad(o.cls, 34)} ${o.where[0]}`)
  console.log('')
}
if (cleared.length) {
  console.log(`CLEARED since the baseline (${cleared.length}) — run --update-baseline to bank it:`)
  for (const c of cleared.slice(0, 20)) console.log(`  ${c}`)
  console.log('')
}

if (dead.length) {
  console.log(`DEAD RULES — declared in CSS, referenced nowhere (${dead.length}):`)
  for (const d of dead.slice(0, 30)) console.log(`  ${pad(d.cls, 34)} ${d.where[0]}`)
  if (dead.length > 30) console.log(`  … and ${dead.length - 30} more`)
  console.log('')
}

console.log(
  fresh.length
    ? `FAIL — ${fresh.length} new orphan(s). ${known.size} known, ${dead.length} dead rules.\n`
    : `OK — no new orphans. ${known.size} known (baselined), ${dead.length} dead rules.\n`,
)

process.exit(fresh.length ? 1 : 0)
