/* ============================================================
   THE FIRST SENTENCE THE FIRST REAL CUSTOMER READS.

   Both doors to the prepared set — the invitation card and Home's
   empty state — read this, three lines, in this order:

     EXAMPLE DATA
     Load a worked example — another dealer's price file
     Real data extracted from Northside Marine's Master Price File.

   Line two contradicts line three, and line two is the one that is
   wrong: Northside Marine are this app's first real customer, not a
   fixture, and the app's first screen was describing their own
   catalogue as a stranger's sample.

   There is exactly ONE prepared set (CONFIGURATOR_SPEC.md §6b bans
   inventing a second), so there is no generic example to separate out.
   What there are, are two true readings of the same file — theirs, and
   somebody else's — and the organisation on the sheet says which.
   `meta.org.name` is always the reader's own business: `setOrganisation`
   writes it at onboarding and `Shell.tsx` re-applies it after every
   project swap, so a demo load can never overwrite it with the set's.

   Pinned here because a wording is exactly the kind of thing that is
   changed by hand, in one of the two places, by somebody who has not
   read why.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { DEMOS } from '@/demos'
import { isSameBusiness, realDemoSet, startingPointWords } from './demoLoad'

const real = realDemoSet()

describe('the door to the prepared set', () => {
  it('is the Northside file, and says whose it is', () => {
    expect(real).toBeDefined()
    expect(real?.business).toBe('Northside Marine')
    expect(real?.file).toBe('Master Price File')
    /* one set that is somebody's data, and one blank sheet that is not */
    expect(DEMOS.filter((d) => d.business !== undefined).length).toBe(1)
  })

  it('never calls Northside’s own price file somebody else’s', () => {
    if (!real) return
    for (const org of [
      'Northside Marine',
      'northside marine',
      'Northside  Marine',
      'Northside Marine Pty Ltd',
    ]) {
      const w = startingPointWords(real, org)
      expect(w.own, org).toBe(true)
      expect(w.label, org).toBe('Load your Master Price File')
      expect(w.label.toLowerCase(), org).not.toContain('another dealer')
      expect(w.label.toLowerCase(), org).not.toContain('example')
    }
  })

  it('names the business to anybody else, so nobody reads it as their own', () => {
    if (!real) return
    const w = startingPointWords(real, 'Wilson Marine Group')
    expect(w.own).toBe(false)
    expect(w.tag).toBe('Example data')
    expect(w.label).toBe('Load Northside Marine’s Master Price File — a worked example')
  })

  it('carries the demos module’s own provenance line either way', () => {
    if (!real) return
    for (const org of ['Northside Marine', 'Wilson Marine Group', undefined]) {
      expect(startingPointWords(real, org).note).toBe(real.blurb)
    }
  })

  it('claims nothing about whose it is when the org is not yet known', () => {
    if (!real) return
    const w = startingPointWords(real, undefined)
    expect(w.own).toBe(false)
    expect(w.tag).toBe('Example data')
  })
})

describe('is this the same dealer', () => {
  it('reads past punctuation, case and double spaces', () => {
    expect(isSameBusiness('NORTHSIDE MARINE', 'Northside Marine')).toBe(true)
    expect(isSameBusiness('Northside-Marine', 'Northside Marine')).toBe(true)
    expect(isSameBusiness('  Northside   Marine  ', 'Northside Marine')).toBe(true)
    /* the trading suffix a business actually registers under */
    expect(isSameBusiness('Northside Marine Pty Ltd', 'Northside Marine')).toBe(true)
  })

  it('is a word-boundary prefix, never a substring', () => {
    /* a false positive here tells a stranger that somebody else's
       catalogue is theirs, so this direction is the strict one */
    expect(isSameBusiness('Northside Marinas', 'Northside Marine')).toBe(false)
    expect(isSameBusiness('Northside', 'Northside Marine')).toBe(false)
    expect(isSameBusiness('South Northside Marine', 'Northside Marine')).toBe(false)
    expect(isSameBusiness('Marine Northside', 'Northside Marine')).toBe(false)
    expect(isSameBusiness('', 'Northside Marine')).toBe(false)
    expect(isSameBusiness('Northside Marine', undefined)).toBe(false)
  })
})
