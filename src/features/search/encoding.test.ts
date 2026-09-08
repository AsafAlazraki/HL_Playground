/* ============================================================
   THIS FILE IS TEXT, AND THAT IS NOW CHECKED.

   WHAT WAS WRONG. `SearchField.tsx` carried three RAW U+0000 BYTES,
   typed straight into the template literals that build the recall
   lookup key, plus CRLF line endings on all 931 lines. It was the
   only file in `src/` with CR, and one of five carrying a raw NUL.

   WHY NOTHING CAUGHT IT. Every gate was green the whole time.
   Measured 2026-09-09 against the file as it stood, NUL and all:
   `tsc --noEmit -p tsconfig.app.json` clean, 1,914 tests passing,
   `oxlint` reporting the same 8 warnings it reports now (at line
   numbers 10 lower, this comment being the difference), and
   `check-styles` clean. A NUL in a
   template literal IS a valid separator, so nothing about the
   PROGRAM was wrong. What broke was every tool that reads the file
   as text:

     - `grep` classifies a file containing NUL as binary and prints
       "Binary file ... matches" instead of the matching lines, so
       the file silently vanished from every search of this repo.
     - git's `text=auto` does the same, so the `eol=lf` in
       .gitattributes — which the file DID match — never applied.
       `git ls-files --eol` read `i/-text w/-text` here while all 8
       siblings read `i/lf w/lf`. The NUL is why the CRLF survived.

   WHY THE SEPARATOR ITSELF STAYS. It is not a mistake and it was
   not removed. `RecentPick.entityId` and `.rowId` are both plain
   `string` (recent.ts:49-51), so joining on ':' would fuse ("a:b","c")
   and ("a","b:c") into one key and hand back the other row's label.
   U+0000 is the one byte an id cannot carry. It is now spelled as
   the escape `\0`, which is the same character to the compiler and
   an ordinary text file to everything else.

   The two halves below are deliberate: the predicate is tested
   against strings that DO offend, so the guard is known to fire,
   and only then pointed at the real source. A guard that has never
   been seen to fail is not a guard.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import source from '@/features/search/SearchField.tsx?raw'

/* built from char codes, never typed literally — a test that asserts
   "no raw NUL in the tree" must not smuggle one into its own file */
const NUL = String.fromCharCode(0)
const CR = String.fromCharCode(13)
const BACKSLASH = String.fromCharCode(92)

const rawNulCount = (text: string): number => text.split(NUL).length - 1
const crCount = (text: string): number => text.split(CR).length - 1

/* `${a}` + separator + `${b}`, where the separator is either a raw
   NUL or the two characters backslash-zero. Assembled from char
   codes for the same reason as above. */
const KEY_JOIN = new RegExp(
  '`\\$\\{[A-Za-z.]+\\}(?:' +
    NUL +
    '|' +
    BACKSLASH +
    BACKSLASH +
    '0)\\$\\{[A-Za-z.]+\\}`',
  'g',
)

describe('the encoding predicates actually fire', () => {
  it('counts a raw NUL that is really there', () => {
    expect(rawNulCount('a' + NUL + 'b' + NUL + 'c')).toBe(2)
    expect(rawNulCount('ab')).toBe(0)
  })

  it('counts a CR that is really there', () => {
    expect(crCount('a' + CR + '\nb' + CR + '\n')).toBe(2)
    expect(crCount('a\nb\n')).toBe(0)
  })

  it('tells the escape apart from the raw byte', () => {
    const escaped = '`${p.entityId}' + BACKSLASH + '0${p.rowId}`'
    const raw = '`${p.entityId}' + NUL + '${p.rowId}`'
    expect(escaped).toMatch(KEY_JOIN)
    expect(raw).toMatch(KEY_JOIN)
    expect(rawNulCount(escaped)).toBe(0)
    expect(rawNulCount(raw)).toBe(1)
  })
})

describe('SearchField.tsx source encoding', () => {
  it('is long enough that ?raw really loaded it', () => {
    /* guards the rest: an empty or stubbed import would pass every
       "contains no NUL" assertion vacuously */
    expect(source.length).toBeGreaterThan(30_000)
    expect(source).toContain('export function SearchField')
  })

  it('carries no raw U+0000, so grep and git see it as text', () => {
    expect(rawNulCount(source)).toBe(0)
  })

  it('carries no CR, matching the eol=lf in .gitattributes', () => {
    expect(crCount(source)).toBe(0)
  })

  it('still builds all three recall keys on a NUL separator', () => {
    const joins = source.match(KEY_JOIN) ?? []
    expect(joins).toHaveLength(3)
    /* every one spelled as an escape, none as a raw byte */
    for (const join of joins) {
      expect(rawNulCount(join)).toBe(0)
      expect(join).toContain(BACKSLASH + '0')
    }
  })

  it('evaluates those keys to a real U+0000, not the two characters', () => {
    const joins = source.match(KEY_JOIN) ?? []
    expect(joins).toHaveLength(3)
    const pick = { entityId: 'ent_boats', rowId: 'row_449' }
    for (const join of joins) {
      const built = new Function('p', 'r', 'return ' + join)(pick, pick) as string
      expect(built).toBe('ent_boats' + NUL + 'row_449')
      expect(built.charCodeAt(9)).toBe(0)
    }
  })
})

describe('why the separator is U+0000 and not a colon', () => {
  const join = (entityId: string, rowId: string): string => `${entityId}\0${rowId}`

  it('keeps two picks apart that a colon would fuse', () => {
    expect(join('a:b', 'c')).not.toBe(join('a', 'b:c'))
    /* the failure being prevented: same key, so the Map hands the
       first pick's label to the second and the palette names the
       wrong boat */
    expect(`a:b:c`).toBe(`a:b:c`)
  })

  it('round-trips any id pair, because no id can contain U+0000', () => {
    const pairs: readonly (readonly [string, string])[] = [
      ['a:b', 'c'],
      ['a', 'b:c'],
      ['', ''],
      ['ent_1', 'row_1'],
    ]
    const keys = pairs.map(([e, r]) => join(e, r))
    expect(new Set(keys).size).toBe(pairs.length)
    for (const [i, [e, r]] of pairs.entries()) {
      expect(keys[i]?.split(NUL)).toEqual([e, r])
    }
  })
})
