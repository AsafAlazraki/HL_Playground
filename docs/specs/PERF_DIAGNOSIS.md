# BLUEPRINT PERFORMANCE — measured diagnosis

> User: *"scrolling the blueprint is laggy and not smooth"*

## The measurement

Northside loaded, 6 tables, canvas at zoom **0.53**:

| | |
|---|---|
| Total DOM elements on the page | **7,553** |
| Elements inside the canvas | **6,648** (88%) |
| Table nodes | 6 |

Per node:

| Node | DOM elements | Grid cells |
|---|---|---|
| Boat Motor Fitment | 1,523 | 385 |
| Motors | 1,505 | 473 |
| Trailers | 1,455 | 495 |
| Boat Trailer Fitment | 771 | 126 |
| Boats | 695 | 29 |
| Parts | 632 | 29 |

## The cause

**Six complete data grids are live in the DOM at once**, and every pan or zoom
applies a CSS transform to a subtree of 6,648 elements. The browser must
re-composite all of it every frame. At zoom 0.53 — where a cell is roughly 6px
tall and utterly unreadable — we are still rendering **every cell of every
table**.

Row virtualization exists but only engages above 150 rows, and **columns are
never virtualized**, so a 59-column table draws all 59 regardless of how many
are on screen.

## The fixes, in order of impact

1. **Level of detail by zoom.** Below roughly 0.6 zoom a table card should draw
   a *plate* — kind symbol, name, row and column counts, maybe the first few
   group labels — and not a grid at all. Nothing legible is lost, because at
   that zoom nothing was legible. This alone should remove most of the 6,648.
   Cross-fade between plate and grid so the transition is not a flicker.

2. **Column virtualization** inside table nodes, mirroring the row windowing
   that already exists. A 59-column table on a 520px card needs about 6.

3. **`onlyRenderVisibleElements`** on the React Flow instance, so cards outside
   the viewport are not mounted at all.

4. **CSS containment** on node bodies — `contain: content` plus
   `content-visibility: auto` — so an offscreen or clipped card skips layout
   and paint entirely.

5. **Confirm the transform does not re-render node contents.** Node components
   must be `React.memo`'d with stable `data` identity; a pan changing a node's
   props would re-render every cell on every frame.

## Definition of done

Pan and zoom hold **60fps** with the Northside set loaded. Measure it: sample
`requestAnimationFrame` deltas during a synthetic wheel-zoom, and report the
median, p90 and the count of frames over 16.7ms. A pass is p90 under 16.7ms and
zero frames over 33ms.

Then re-measure the canvas DOM element count at zoom 0.5 — it should be a small
fraction of 6,648.
