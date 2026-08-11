/* ============================================================
   PICTURES MUST SURVIVE EXPORT → IMPORT.

   They did not. `isCellValue` listed string | number | boolean |
   null and omitted `ImageRef[]`, so the row-values loop dropped
   every picture in every cell, silently, with no error and no
   count. A person exporting a catalogue to hand to a colleague
   lost every photograph in it and had no way to know.

   These tests are the reason it cannot come back, and they also
   pin the security boundary: an imported file is untrusted and
   `ImageRef.src` goes straight into an `<img src>`.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { validateEnvelope } from './envelope'
import { EXPORT_KIND, EXPORT_VERSION } from '@/types/model'

const wrap = (values: Record<string, unknown>) => ({
  kind: EXPORT_KIND,
  version: EXPORT_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  meta: { name: 'T' },
  entities: [
    {
      id: 'e1',
      name: 'Boats',
      fields: [{ id: 'f1', name: 'Photo', type: 'image' }],
      position: { x: 0, y: 0 },
    },
  ],
  rows: { e1: [{ id: 'r1', entityId: 'e1', values }] },
  rules: [],
})

const firstCell = (data: { rows?: Record<string, Array<{ values: Record<string, unknown> }>> }) =>
  data.rows!.e1[0].values.f1

const pic = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  src: 'https://example.com/a.jpg',
  name: 'a.jpg',
  ...over,
})

describe('importing a project that has pictures in it', () => {
  it('keeps a picture cell instead of silently dropping it', () => {
    const r = validateEnvelope(wrap({ f1: [pic()] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(firstCell(r.data)).toEqual([
      { id: 'p1', src: 'https://example.com/a.jpg', name: 'a.jpg' },
    ])
  })

  it('keeps the stored order, because index 0 is the picture that shows', () => {
    const r = validateEnvelope(
      wrap({ f1: [pic({ id: 'p1' }), pic({ id: 'p2' }), pic({ id: 'p3' })] }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((firstCell(r.data) as Array<{ id: string }>).map((p) => p.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ])
  })

  it('carries width, height and alt text through when they are there', () => {
    const r = validateEnvelope(wrap({ f1: [pic({ w: 800, h: 600, alt: 'a hull' })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(firstCell(r.data)).toEqual([
      { id: 'p1', src: 'https://example.com/a.jpg', name: 'a.jpg', w: 800, h: 600, alt: 'a hull' },
    ])
  })

  it('accepts a data:image/ source, which is a picture we hold the bytes of', () => {
    const src = 'data:image/png;base64,iVBORw0KGgo='
    const r = validateEnvelope(wrap({ f1: [pic({ src })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((firstCell(r.data) as Array<{ src: string }>)[0].src).toBe(src)
  })
})

describe('an imported file is untrusted, and src goes into an <img>', () => {
  it.each([
    ['javascript:', 'javascript:alert(document.cookie)'],
    ['data:text/html', 'data:text/html,<script>alert(1)</script>'],
    ['file:', 'file:///C:/Windows/System32/config/SAM'],
    ['no scheme at all', '../../etc/passwd'],
  ])('refuses a %s source', (_label, src) => {
    const r = validateEnvelope(wrap({ f1: [pic({ src })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(firstCell(r.data)).toEqual([])
  })

  it('drops only the bad picture and keeps the good one beside it', () => {
    const r = validateEnvelope(
      wrap({ f1: [pic({ id: 'bad', src: 'javascript:alert(1)' }), pic({ id: 'good' })] }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((firstCell(r.data) as Array<{ id: string }>).map((p) => p.id)).toEqual(['good'])
  })

  it('refuses a picture whose id could poison an object key', () => {
    const r = validateEnvelope(wrap({ f1: [pic({ id: '__proto__' })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(firstCell(r.data)).toEqual([])
  })

  it('leaves an empty picture cell rather than dropping the column', () => {
    const r = validateEnvelope(wrap({ f1: [pic({ src: 'javascript:alert(1)' })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(firstCell(r.data)).toEqual([])
    expect(Object.hasOwn(r.data.rows!.e1[0].values, 'f1')).toBe(true)
  })

  it('ignores junk in a picture array without failing the whole import', () => {
    const r = validateEnvelope(wrap({ f1: [null, 42, 'nope', { nope: true }, pic()] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((firstCell(r.data) as Array<{ id: string }>).map((p) => p.id)).toEqual(['p1'])
  })
})
