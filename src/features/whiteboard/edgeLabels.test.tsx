/* ============================================================
   A NAME ON A LINE IS WITHHELD WHEN IT CANNOT BE READ — AND THE
   SENTENCE UNDER IT NEVER IS.

   `sheetZoom.ts` decided that a link label is only worth drawing at
   NEAR: 16px authored clears the 11px floor at zoom 0.70, and below
   that "a label is texture — ~64 chips of 6px mush lying across the
   drawing". That was enforced in CSS with `opacity: 0`, which hides a
   thing that is still there and still costs: React Flow lays out an
   SVG text and a rect per labelled edge and reads `getBBox()` on each
   one, a forced synchronous SVG layout, on every mount — and
   `onlyRenderVisibleElements` mounts edges continuously as the window
   sweeps over them during a gesture.

   Measured on the built app (row 43, `zoomtrace.mjs`): `getBBox` was
   14-16ms of a wheel zoom, every millisecond of it spent measuring
   text painted at opacity 0. Withholding the label took the sheet's
   worst frame from 173-189ms to 37-67 and halved the frames over
   33ms.

   THE ONE THING THAT MUST NOT MOVE IS THE ACCESSIBLE SENTENCE.
   `ariaLabel` carries the whole fact — "Rigging Kits · Boat points at
   Highfield Inflatables" — for a reader who cannot see the line at
   all, and what a screen reader is told must not depend on how far a
   sighted reader has zoomed out. That is the assertion this file
   exists for; the rest is arithmetic.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useRelationshipEdges } from './useDerivedGraph'

const ISO = '2026-01-01T00:00:00.000Z'

const table = (id: string, name: string, fields: unknown[] = []) => ({
  id,
  name,
  accent: 'blue',
  kind: 'custom',
  fields,
  displayFieldId: `${id}-name`,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

beforeEach(() => {
  useProjectStore.setState({
    entities: {
      'e-boats': table('e-boats', 'Highfield Inflatables', [
        { id: 'e-boats-name', name: 'Model', type: 'text' },
      ]),
      'e-kits': table('e-kits', 'Rigging Kits', [
        { id: 'e-kits-name', name: 'Kit', type: 'text' },
        { id: 'f-boat', name: 'Boat', type: 'reference', refEntityId: 'e-boats' },
      ]),
    } as never,
    rowsByEntity: {},
  })
})

describe('the name on a relationship line', () => {
  it('is drawn when the reader is near enough to read it', () => {
    const { result } = renderHook(() => useRelationshipEdges(true))
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.label).toBe('Boat')
  })

  it('IS NOT SET AT ALL when they are not — not set and faded, not set', () => {
    const { result } = renderHook(() => useRelationshipEdges(false))
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.label).toBeUndefined()
  })

  it('still draws the LINE — only its name is withheld', () => {
    const far = renderHook(() => useRelationshipEdges(false))
    const near = renderHook(() => useRelationshipEdges(true))
    expect(far.result.current).toHaveLength(near.result.current.length)
    expect(far.result.current[0]?.source).toBe(near.result.current[0]?.source)
    expect(far.result.current[0]?.target).toBe(near.result.current[0]?.target)
  })

  /* THE ASSERTION THIS FILE IS FOR. */
  it('SAYS THE SAME THING TO A SCREEN READER AT EVERY DISTANCE', () => {
    const said = 'Rigging Kits · Boat points at Highfield Inflatables'
    expect(renderHook(() => useRelationshipEdges(true)).result.current[0]?.ariaLabel).toBe(said)
    expect(renderHook(() => useRelationshipEdges(false)).result.current[0]?.ariaLabel).toBe(said)
  })

  /* The identity cache hands back the same object while nothing has
     changed, and `label` is part of what "changed" means — otherwise
     crossing the threshold would return a stale edge still carrying
     its label, and the whole saving would be silently undone. */
  it('rebuilds the edge when the distance changes, rather than handing back a stale one', () => {
    const { result, rerender } = renderHook(
      ({ labelled }: { labelled: boolean }) => useRelationshipEdges(labelled),
      { initialProps: { labelled: true } },
    )
    expect(result.current[0]?.label).toBe('Boat')
    rerender({ labelled: false })
    expect(result.current[0]?.label).toBeUndefined()
    rerender({ labelled: true })
    expect(result.current[0]?.label).toBe('Boat')
  })
})
