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
import { join, relative, sep } from 'node:path'
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

const COMMENT_BLOCK = /\/\*[\s\S]*?\*\//g
const COMMENT_LINE = /^\s*\/\/.*$/gm

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
  /* COMMENTS STRIPPED, LIKE THE CSS SIDE ALREADY DOES. This read the
     raw file, so a comment DESCRIBING markup counted as markup:
     `QuoteStage.tsx` explains an old bar by quoting
     `className="shell-view-back"` in prose, and the sweep reported
     that class as written. It was masked for as long as something
     declared it — a dead rule inside the window chrome — and surfaced
     the moment that block was deleted, which is a guard reporting a
     fault in itself.

     THE RAW TEXT IS KEPT UNSTRIPPED for the dead-rule pass below,
     deliberately: that one asks "does this class name appear anywhere
     in the components", and a name a comment still discusses is a
     name somebody is still reasoning about. Reporting it as dead
     would invite deleting a rule the next commit needs. */
  const raw = readFileSync(f, 'utf8')
  const text = raw.replace(COMMENT_BLOCK, '').replace(COMMENT_LINE, '')
  rawTsx.set(f, raw)
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

/* ---------- literal colours: rule 1 ----------

   DESIGN_PRINCIPLES rule 1 is the first one in the list — "never
   write a literal colour, use a token" — and it was the last one
   without a guard. REDESIGN_ROLLOUT §3 step 2 put the count at nine
   and priced it at under an hour; swept properly it was 24 in
   shipped feature CSS, and the nineteen that mattered most were
   `rgba(255, 255, 255, 0.0x)` washes over the navy chrome in
   auth.css, io.css, onboarding.css and banner.css.

   THOSE WERE NOT A TIDINESS PROBLEM. `--chrome-wash` and its seven
   siblings are `color-mix(in srgb, var(--chrome-fg) N%, transparent)`,
   so they follow the theme the ground follows; a literal white does
   not. Every one of them sat on a surface whose ground is redefined
   in dark mode.

   FOUR EXEMPTIONS, EACH EARNED BY A CASE IN THIS REPO:

     · `src/styles/` — the token files. A literal on the right of a
       token declaration IS the mechanism, not a breach of it.
     · `src/design/` — the gallery, exempt here for the reason it is
       exempt from the type floor: it draws miniatures of screens.
     · `@media print` — quote.css argues it and is right: "print has
       no theme, so this stays a literal — it is the one place that
       is correct." Navy ink on paper would be the bug.
     · `mask-image` / `-webkit-mask-image` — a mask reads the ALPHA
       channel. `#000` there means "hide", not black, and the banner,
       the catalogue strip and the quote build all use it that way.

   AND ONE STATED EXCEPTION IN THE CODE ITSELF, which this cannot
   see and does not need to: `.qt-doc` is `#fff` in both themes
   because a quote is a sheet handed to a customer, and a document
   that changed colour with the reader's UI preference would be two
   documents. It sits inside the print-adjacent block and is argued
   where it is written.

   HEX, rgb(), rgba(), hsl(), hsla(). Named colours are not swept:
   `transparent` and `currentColor` are the two that appear here and
   both are correct. */
const NEWLINE = /\r?\n/
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/
const MASK = /mask-image\s*:/
const DECLARES_TOKEN = /^\s*--[A-Za-z0-9_-]+\s*:/
const PRINT_AT = /@media\s+print/

/* THE ONE STATED EXCEPTION, and it costs a sentence — the shape the
   DORMANT list in check-reachability uses for the same reason. */
const COLOUR_ALLOW = [
  [
    'src/features/quote/quote.css',
    'background: #fff',
    'A quote is paper in BOTH themes: the same sheet is read on a screen at ' +
      'night and printed in the morning, and a document that changed colour ' +
      "with the reader's UI preference would be two documents. Argued where " +
      'it is written.',
  ],
]

const literals = []
for (const f of css) {
  const rel = f.replace(SRC, 'src').split(sep).join('/')
  if (rel.startsWith('src/styles/') || rel.startsWith('src/design/')) continue
  const text = readFileSync(f, 'utf8').replace(COMMENT_BLOCK, '')
  let inPrint = 0
  /* A MASK SPANS LINES. 'mask-image: linear-gradient(' opens on one
     line and its #000 stops are on the next three; a line-wise test
     saw the stops and not the property. So the suppression runs to
     the end of the DECLARATION, which is the semicolon. */
  let inMask = false
  text.split(NEWLINE).forEach((line, i) => {
    if (PRINT_AT.test(line)) inPrint = 1
    else if (inPrint > 0) {
      inPrint += (line.match(/\{/g) ?? []).length
      inPrint -= (line.match(/\}/g) ?? []).length
      if (inPrint < 0) inPrint = 0
    }
    if (MASK.test(line)) inMask = true
    const masked = inMask
    if (inMask && line.includes(';')) inMask = false
    if (inPrint > 0 || masked) return
    if (!COLOUR.test(line)) return
    if (DECLARES_TOKEN.test(line)) return
    const trimmed = line.trim()
    if (COLOUR_ALLOW.some(([file, frag]) => rel === file && trimmed.includes(frag))) return
    literals.push({ at: rel + ':~' + (i + 1), src: trimmed.slice(0, 72) })
  })
}

/* ---------- the type floor: rule 2 ----------

   DESIGN_PRINCIPLES rule 2 is "Never write a font-size below 11px",
   and it had no guard. It was kept by hand for a year and then not:
   `.ds-chip` in ds.css sat at 10.5px, which is the SYSTEM'S OWN chip
   — the one the next screen copies. Found by sweeping for backlog
   row 29's clause rows, which had already been corrected. That is
   the shape of every rule with no guard: the reported instance gets
   fixed and the unreported one keeps shipping.

   src/design IS EXEMPT, and it is the only exemption. The gallery
   draws MINIATURES of screens — a whole register at 5.8px, so a page
   of them fits — and that type is a picture of type rather than type
   a person reads. Anything a person is meant to read is in a feature
   or in the system.

   px ONLY. rem and em are relative to something this sweep cannot
   see, and a guard that guessed at the root size would be inventing
   the number it fails on. */
const FLOOR = 11
const small = []
for (const f of css) {
  if (f.includes(`${sep}design${sep}`)) continue
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/font-size:\s*([0-9]*\.?[0-9]+)px/g)) {
    const px = Number(m[1])
    if (px >= FLOOR) continue
    const line = src.slice(0, m.index).split('\n').length
    small.push({ px, at: `${f.replace(SRC, 'src').split(sep).join('/')}:${line}` })
  }
}

/* ---------- custom properties that nothing declares ----------

   AN UNDEFINED CUSTOM PROPERTY DOES NOT WARN; IT VOIDS THE WHOLE
   DECLARATION THAT READS IT. shell.css records the first two times
   that bit this project, at length: `--chrome` and its twelve ink
   tiers went missing in a duplicate-collapsing pass, and "the navy
   rail with white ink was a transparent column of page-coloured
   text" across 132 rules.

   This sweep is the third time. Measured in the browser before it
   was written: `--ease-settle` (five uses in shell.css, and a
   comment two thousand lines down insisting it is declared)
   resolved to "" and `.win`'s computed `animation-name` was
   `none` — the window materialise that file describes in a
   paragraph never ran. `--s-7` is not a step, so a banner's
   padding measured 0. `--fg-primary` is not a token, so a figure
   was inheriting its colour rather than being given one.

   Every one of those is invisible: the page renders, nothing
   throws, and the only way to find it is to measure the computed
   style of the element you happen to suspect.

   WHAT IS NOT A FINDING:

     · `var(--x, fallback)` — a fallback is a declaration that the
       name is optional, which is how a component takes a value from
       an inline style and has an answer when nobody set one
       (`--origin-x`, `--cn-grp-accent`).
     · a name set from TSX — `style={{'--i': n}}` and
       `setProperty('--x', v)` both count as declaring it, so the
       sweep reads the components as well as the stylesheets.
     · anything inside a comment, which is where the fourth
       false positive lived (`bridge.css` counts "4,787
       var(--token) uses" in prose). */
const COMMENTS = /\/\*[\s\S]*?\*\//g
const DECLARED_VAR = /(--[A-Za-z0-9_-]+)\s*:/g
/** a name written as a string in TSX is a name something sets */
const NAMED_VAR = /['"`](--[A-Za-z0-9_-]+)['"`]/g
const READ_VAR = /var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g

const declaredVars = new Set()
for (const f of files) {
  const text = readFileSync(f, 'utf8').replace(COMMENTS, '')
  for (const m of text.matchAll(DECLARED_VAR)) declaredVars.add(m[1])
  for (const m of text.matchAll(NAMED_VAR)) declaredVars.add(m[1])
}

const undeclared = []
for (const f of css) {
  const text = readFileSync(f, 'utf8').replace(COMMENTS, '')
  for (const m of text.matchAll(READ_VAR)) {
    /* a comma means a fallback, and a fallback means optional */
    if (m[2] === ',') continue
    if (declaredVars.has(m[1])) continue
    const line = text.slice(0, m.index).split('\n').length
    undeclared.push({
      name: m[1],
      /* `~`, because the comments were stripped before counting */
      at: `${f.replace(SRC, 'src').split(sep).join('/')}:~${line}`,
    })
  }
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

if (literals.length) {
  console.log(`LITERAL COLOURS — rule 1 says use a token (${literals.length}):`)
  for (const l of literals) console.log(`  ${pad(l.at, 34)} ${l.src}`)
  console.log('')
}

if (undeclared.length) {
  console.log(`READ BUT NEVER DECLARED — an undefined var voids its whole declaration (${undeclared.length}):`)
  for (const u of undeclared) console.log(`  ${pad(u.name, 34)} ${u.at}`)
  console.log('')
}

if (small.length) {
  console.log(`BELOW THE TYPE FLOOR — rule 2 says never under ${FLOOR}px (${small.length}):`)
  for (const t of small) console.log(`  ${pad(`${t.px}px`, 34)} ${t.at}`)
  console.log('')
}

if (dead.length) {
  console.log(`DEAD RULES — declared in CSS, referenced nowhere (${dead.length}):`)
  for (const d of dead.slice(0, 30)) console.log(`  ${pad(d.cls, 34)} ${d.where[0]}`)
  if (dead.length > 30) console.log(`  … and ${dead.length - 30} more`)
  console.log('')
}

const bad = fresh.length + small.length + undeclared.length + literals.length
console.log(
  bad
    ? `FAIL — ${fresh.length} new orphan(s), ${small.length} under the type floor, ${undeclared.length} undeclared var(s), ${literals.length} literal colour(s). ${known.size} known, ${dead.length} dead rules.\n`
    : `OK — no new orphans, nothing under ${FLOOR}px, every var declared, no literal colours. ${known.size} known (baselined), ${dead.length} dead rules.\n`,
)

process.exit(bad ? 1 : 0)
