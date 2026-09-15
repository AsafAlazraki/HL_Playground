/* ============================================================
   IS THIS PICTURE A SCENE OR A STUDIO SHOT?

   The chaptered configurator (`BuildScreen`) fills the window with
   a boat's photograph when it has one — Saxdor's shape, driven live
   on 2026-09-15 — and puts the render large on a quiet ground when
   it does not. Which of the two a picture IS cannot be a list of
   makers, because the seed holds both kinds for one brand (Stacer's
   Assault Pro is an on-water photograph; its Outlaw is a package
   render on white), and it cannot be a guess, because the owner's
   rule is "no fake data": a white-ground render stretched to a
   full-bleed chapter would be a lie about what the file holds.

   So the picture is asked. It is drawn at 32x32 and the ring of
   pixels round its edge is sampled: a render on white has a white
   ring; a photograph of a boat on water has sky and sea in it. The
   verdict is remembered per address, and a picture that cannot be
   read — a cross-origin host that refuses the canvas — is treated
   as a studio shot, which is the honest failure: it can only make
   a screen quieter, never louder.

   THE VERDICT IS DERIVED, NOT STORED. The cache is the state; the
   effect only starts a load the cache does not hold and nudges a
   re-render when the answer lands. No setState inside the effect
   body, which is the rule the linter holds for exactly this shape.
   ============================================================ */

import { useEffect, useReducer } from 'react'
import { useImageDisplay } from '@/lib/imageSources'

export type SceneKind = 'scene' | 'studio' | 'unknown'

const known = new Map<string, SceneKind>()

/** how much of the edge ring must be near-white before a picture is
 *  a studio shot; a photograph's sky is bright but not paper */
const PAPER = 235
const STUDIO_SHARE = 0.7
/** the most colour a render's edge ring carries; the dullest
 *  photograph in the seed (a grey Stabicraft on grey water) is 0.13 */
const NEUTRAL = 0.06

function judge(img: HTMLImageElement): SceneKind {
  try {
    const w = 32
    const h = 32
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) return 'studio'
    g.drawImage(img, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let light = 0
    let n = 0
    let sat = 0
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (x > 1 && x < w - 2 && y > 1 && y < h - 2) continue
        const i = (y * w + x) * 4
        const r = d[i]
        const g2 = d[i + 1]
        const b2 = d[i + 2]
        const l = (r + g2 + b2) / 3
        const mx = Math.max(r, g2, b2)
        const mn = Math.min(r, g2, b2)
        n += 1
        if (l > PAPER) light += 1
        sat += mx === 0 ? 0 : (mx - mn) / mx
      }
    }
    /* TWO TESTS, EITHER MAKES A STUDIO SHOT. Paper: most of the ring is
       near-white. Neutral: the ring has no colour in it — a render
       whose subject runs to the picture's edge (Highfield's RU280,
       cropped top-down, grey tube on every side) is not white there
       but it is grey; a photograph's ring has sky and water in it.
       Measured on seventeen seed pictures, 2026-09-15: every render's
       ring saturates at 0.00–0.01, every photograph's at 0.13–0.64.
       Luminance spread was tried first and does not separate them
       (renders 7–48, photographs 28–65). */
    if (light / n > STUDIO_SHARE) return 'studio'
    if (sat / n < NEUTRAL) return 'studio'
    return 'scene'
  } catch {
    return 'studio'
  }
}

export function useSceneKind(src: string | undefined): SceneKind {
  const { at, paint } = useImageDisplay(src ?? '')
  const [, landed] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!src || !paint || known.has(at)) return
    let live = true
    const img = new Image()
    const origin = globalThis.location?.origin ?? ''
    const local = at.startsWith('/') || (origin !== '' && at.startsWith(origin))
    if (!local) img.crossOrigin = 'anonymous'
    img.addEventListener(
      'load',
      () => {
        known.set(at, judge(img))
        if (live) landed()
      },
      { once: true },
    )
    img.addEventListener(
      'error',
      () => {
        known.set(at, 'studio')
        if (live) landed()
      },
      { once: true },
    )
    img.src = at
    return () => {
      live = false
    }
  }, [src, at, paint])
  if (!src || !paint) return 'studio'
  return known.get(at) ?? 'unknown'
}
