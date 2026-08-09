/* ============================================================
   LEVEL OF DETAIL — what a sheet is worth drawing at this zoom.

   THE MEASUREMENT, not a taste.

   A data row is `ROW_H` = 34 drawing units tall and its type is set
   at 14px. On the blueprint both are multiplied by the camera's
   zoom, so what the reader actually sees is:

       zoom   row on screen   type on screen
       1.00       34.0 px          14.0 px
       0.80       27.2 px          11.2 px
       0.70       23.8 px           9.8 px
       0.60       20.4 px           8.4 px     <- the floor
       0.53       18.0 px           7.4 px     (the reported zoom)
       0.50       17.0 px           7.0 px

   Below 8.4px neither Archivo nor IBM Plex Mono resolves — the cells
   are grey texture, and six complete registers' worth of that texture
   is what the browser was re-compositing on every pan frame. So at
   0.6 and below the card stops drawing a grid it cannot show and
   draws its PLATE instead: the kind's mark, the name set large enough
   to actually read at that distance, the two figures, the bands.
   Nothing legible is lost because nothing there was legible.

   HYSTERESIS. A wheel gesture crosses the threshold many times as it
   settles, and a card that swapped its whole body twice per frame
   would be worse than the problem. So there are two thresholds and a
   dead band between them: the plate is entered below 0.60 and left
   above 0.66, and inside the band the card keeps whatever it was.

   THE SUBSCRIPTION IS THE POINT. `useStore` is given a selector that
   answers a three-valued BAND, never the zoom itself: a pan or a zoom
   that does not cross a threshold returns the same value and React
   Flow's store bails the node out of re-rendering entirely. Reading
   `useViewport()` here instead would re-render every node — and
   therefore every cell — on every frame of every gesture.
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import { useStore, useStoreApi } from '@xyflow/react'
import type { ReactFlowState } from '@xyflow/react'

/** At or below this the card draws its plate. See the table above. */
export const PLATE_ZOOM_IN = 0.6
/** And it takes the grid back only once clearly past it. */
export const PLATE_ZOOM_OUT = 0.66

/** Kept next to the thresholds so the tests and the notes above can
 *  be checked against the same numbers the grid is built from. */
export const LOD_ROW_H = 34
export const LOD_TYPE_PX = 14

type Band = 'plate' | 'grid' | 'hold'

const bandSelector = (s: ReactFlowState): Band => {
  const z = s.transform[2]
  if (z <= PLATE_ZOOM_IN) return 'plate'
  if (z >= PLATE_ZOOM_OUT) return 'grid'
  return 'hold'
}

/* ============================================================
   NO HEAVY WORK MID-GESTURE.

   Dropping the grid is relief and happens on the frame it is asked
   for. TAKING it back is the expensive direction — six cards mounting
   six complete registers inside one frame of a wheel gesture measured
   at 200ms, which is a visible stall exactly when the reader is
   moving. So a card takes its grid back only once the camera has been
   STILL for `SETTLE_MS`. Zoom through the threshold and nothing is
   built; stop, and the registers develop.

   The same gate covers the other way a grid gets built during a
   gesture: `onlyRenderVisibleElements` mounts a card the moment it
   enters the window, so a card arriving mid-pan opens as a plate too
   and fills in when the sheet comes to rest.

   HOW IT WATCHES. One imperative subscription per flow store — not
   per node, and never through `useStore` — so a moving camera writes
   a timestamp and re-arms a timer and re-renders NOTHING. The only
   two renders a card spends on a gesture are the two it needs: the
   one that gives the grid up and the one that takes it back.
   ============================================================ */

/** How long the camera must be still before a card rebuilds its
 *  register. Short enough to read as "immediately after I stopped",
 *  long enough that no frame of a gesture ever carries a mount. */
const SETTLE_MS = 110

/** …and the beat between one card taking its register back and the
 *  next. Six cards rebuilding inside one frame is one long frame; six
 *  cards rebuilding one beat apart is a drawing developing, and no
 *  frame carries more than one register's worth of work. */
const STAGGER_MS = 70

interface FlowStoreApi {
  getState: () => ReactFlowState
  subscribe: (listener: (state: ReactFlowState) => void) => () => void
}

/** when the camera last moved, and who is waiting for it to stop */
const motion = { at: 0 }
const waiting = new Set<() => void>()
const watched = new WeakSet<object>()

function watchCamera(store: FlowStoreApi): void {
  if (watched.has(store)) return
  watched.add(store)
  let last = store.getState().transform
  store.subscribe((s) => {
    if (s.transform === last) return
    last = s.transform
    motion.at = performance.now()
    for (const rearm of waiting) rearm()
  })
}

/** True when this card should draw its plate rather than its grid.
 *
 *  Must be called inside a React Flow node (there is a provider above
 *  every one of them). The full-window sheet has no camera and never
 *  asks. */
export function useSheetPlate(): boolean {
  const store = useStoreApi() as unknown as FlowStoreApi
  const band = useStore(bandSelector)

  /* the dead band keeps whatever the card already was — one ref, read
     and written in the same order on every render, so it behaves
     exactly like derived state */
  const held = useRef<'plate' | 'grid'>('grid')
  if (band !== 'hold') held.current = band
  const wantsPlate = held.current === 'plate'

  /* a card arriving while the sheet is being moved opens as a plate;
     one arriving on a still sheet opens as itself */
  const [plate, setPlate] = useState(
    () => wantsPlate || performance.now() - motion.at < SETTLE_MS,
  )

  useEffect(() => {
    watchCamera(store)
    if (wantsPlate) {
      /* out of legible range: give the grid up on this very frame */
      setPlate(true)
      return
    }
    if (!plate) return
    let timer = 0
    const rearm = (): void => {
      window.clearTimeout(timer)
      /* insertion order IS the queue: the card that has been waiting
         longest rebuilds first, and each one after it a beat later */
      let slot = 0
      for (const other of waiting) {
        if (other === rearm) break
        slot += 1
      }
      timer = window.setTimeout(
        () => setPlate(false),
        SETTLE_MS + slot * STAGGER_MS,
      )
    }
    waiting.add(rearm)
    rearm()
    return () => {
      waiting.delete(rearm)
      window.clearTimeout(timer)
    }
  }, [wantsPlate, plate, store])

  return plate
}
