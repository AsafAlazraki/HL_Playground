/* ============================================================
   THE MODULE'S OWN MARK — and the ceiling on it.

   A module is a place in a business and a business has a mark for
   that place: the brand it sells, the workshop's badge. `ModuleDef.logo`
   is an `ImageRef`, the same record every picture in this app is, so
   nothing here is a second image system — `readImageFiles` in
   `@/features/table/ImageCell` reads the file, `isStorableSource`
   decides whether an address may be kept, and `useImageDisplay` paints
   it. This file adds exactly one thing those do not have: A BOUND.

   WHY A BOUND, MEASURED AGAINST WHAT THIS APP ACTUALLY HOLDS. The
   catalogue's 1,411 pictures cost 170,274 bytes altogether — 121 bytes
   each — because they are ADDRESSES. A file chosen from a disk is not:
   it becomes a `data:` URL, base64, about 1.37x the bytes of the file,
   and it is then carried in the module record — through IndexedDB, and
   through every export of the project. A dealer will drop the 12 MB
   photograph their sign-writer sent them, and unbounded that is a
   ~16 MB string inside one module, written on every debounced save.

   SO: SMALL FILES ARE KEPT EXACTLY AS THEY ARE, and anything bigger is
   redrawn to fit a box. Both halves matter.

     · KEPT VERBATIM UNDER `LOGO_KEEP_BYTES`. A logo is usually already
       a small PNG or SVG with a transparent ground, and re-encoding
       one would be a lossy round trip nobody asked for, on the exact
       file that needed no help. Under the threshold nothing is touched.

     · REDRAWN ABOVE IT, to `LOGO_MAX_EDGE` on its longest side, with
       its aspect ratio kept. 512px is four times the largest place a
       mark is ever drawn (`ICON_SIZE.hero` is 56), which leaves room
       for a dense screen and for a print without storing a photograph.

     · REFUSED ABOVE `LOGO_REFUSE_BYTES`, in a sentence naming the
       file's own size and the ceiling. Not because the maths would
       fail, but because reading a 40 MB file into a string to find out
       is a freeze a person cannot cancel.

   AND WHAT WAS DONE IS SAID. A file that is shrunk reports its before
   and after, in the place the mark now appears — rule 5 of §6 applied
   to a success rather than a refusal: an app that quietly re-encodes
   somebody's artwork has changed their file without telling them.

   AN ADDRESS IS THE OTHER DOOR AND COSTS NOTHING. Pasting a URL stores
   the URL, exactly as the catalogue's own pictures do; there is no
   size question because there are no pixels. Whether it PAINTS is
   `imageSources`' host verdict, unchanged, and a mark that cannot be
   fetched falls back to the kind symbol and the accent — which is the
   same fallback a module with no logo at all uses.

   NOTHING HERE INVENTS A PICTURE. There is no placeholder, no
   generated monogram and no stock mark. A module without a logo shows
   its kind symbol on its accent, which already reads as itself.
   ============================================================ */

import type { ImageRef } from '@/types/model'
import { newId } from '@/lib/id'
import { isStorableSource } from '@/lib/imageSources'

/** The longest side a stored mark is redrawn to. */
export const LOGO_MAX_EDGE = 512

/** At or under this, the file is stored byte for byte. A real logo —
 *  a PNG with a transparent ground, or an SVG — is almost always well
 *  under it, and re-encoding one would be a lossy round trip on the
 *  file that least needed one. */
export const LOGO_KEEP_BYTES = 96 * 1024

/** Above this the file is not read at all. See the header: the refusal
 *  is about not freezing on a 40 MB read, not about the arithmetic. */
export const LOGO_REFUSE_BYTES = 32 * 1024 * 1024

/* ---------------------------------------------------------- */
/* Saying a size                                               */
/* ---------------------------------------------------------- */

/** A file size a person would recognise. Mono figures elsewhere; this
 *  is the string that goes INSIDE a sentence, so it carries its unit. */
export function sizeSay(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

/** How many bytes a `data:` URL really occupies. Base64 is 4 characters
 *  per 3 bytes, minus the padding — used to report what a shrink
 *  actually saved rather than guessing at it. A non-data source (an
 *  address) is its own length, which is the honest answer: that IS all
 *  we store. */
export function bytesOfDataUrl(src: string): number {
  const comma = src.indexOf(',')
  if (!src.startsWith('data:') || comma === -1) return src.length
  const head = src.slice(0, comma)
  const body = src.slice(comma + 1)
  if (!head.includes(';base64')) return body.length
  const pad = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((body.length * 3) / 4) - pad)
}

/* ---------------------------------------------------------- */
/* The decision, taken before anything is read                 */
/* ---------------------------------------------------------- */

/** What a chosen file is used for, decided on its declared type and
 *  size alone — no bytes read. */
export type LogoPlan =
  | { do: 'refuse'; why: string }
  | { do: 'keep' }
  | { do: 'shrink' }

/** The one thing a mark has to be. Said as what IS allowed, because
 *  "unsupported file" teaches nobody anything. */
export const LOGO_KIND_REFUSAL =
  'A module’s mark has to be a picture — a PNG, JPEG, SVG or WebP file.'

export function logoPlan(file: { type: string; size: number }): LogoPlan {
  if (!/^image\//i.test(file.type)) return { do: 'refuse', why: LOGO_KIND_REFUSAL }
  if (file.size > LOGO_REFUSE_BYTES) {
    return {
      do: 'refuse',
      /* THE SENTENCE CARRIES BOTH NUMBERS. A ceiling with no measured
         size beside it leaves a person guessing how far over they are. */
      why: `That file is ${sizeSay(file.size)}, and a module’s mark is not read above ${sizeSay(
        LOGO_REFUSE_BYTES,
      )}. Save a smaller copy — anything up to ${LOGO_MAX_EDGE} pixels across is stored exactly as it is.`,
    }
  }
  return file.size <= LOGO_KEEP_BYTES ? { do: 'keep' } : { do: 'shrink' }
}

/* ---------------------------------------------------------- */
/* Fitting the box                                             */
/* ---------------------------------------------------------- */

/** The size a picture is redrawn at: the longest side capped, the
 *  ratio kept, never enlarged, never below one pixel. */
export function fitWithin(
  w: number,
  h: number,
  maxEdge = LOGO_MAX_EDGE,
): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: maxEdge, h: maxEdge }
  const longest = Math.max(w, h)
  if (longest <= maxEdge) return { w: Math.round(w), h: Math.round(h) }
  const k = maxEdge / longest
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** What was done to somebody's file, in their words. Said on screen
 *  beside the mark it produced. */
export function shrinkNote(before: number, after: number, w: number, h: number): string {
  return `Your ${sizeSay(before)} file was redrawn at ${w}×${h} and stored at ${sizeSay(
    after,
  )}. The original on your disk is untouched.`
}

/* ---------------------------------------------------------- */
/* Reading one — the browser half                              */
/* ---------------------------------------------------------- */

export type LogoRead =
  | { ok: true; ref: ImageRef; note?: string }
  | { ok: false; why: string }

const readDataUrl = (file: File): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

/**
 * A chosen file → the mark to store.
 *
 * The plan is taken first, on the file's declared size, so an enormous
 * one is refused before a byte of it is in memory. A shrink that fails
 * for any reason — a picture the browser cannot decode, a canvas it
 * will not give us — falls back to storing what was read rather than
 * to nothing: a large mark is worse than a small one, and no mark at
 * all is worse than both.
 */
export async function readLogoFile(file: File): Promise<LogoRead> {
  const plan = logoPlan(file)
  if (plan.do === 'refuse') return { ok: false, why: plan.why }

  const src = await readDataUrl(file)
  if (src === null) {
    return { ok: false, why: `${file.name} could not be read. Try choosing it again.` }
  }

  const img = await loadImage(src)
  const w = img?.naturalWidth ?? 0
  const h = img?.naturalHeight ?? 0

  const verbatim: ImageRef = {
    id: newId(),
    src,
    name: file.name,
    ...(w > 0 && h > 0 ? { w, h } : {}),
  }

  if (plan.do === 'keep' || img === null) return { ok: true, ref: verbatim }
  if (w <= LOGO_MAX_EDGE && h <= LOGO_MAX_EDGE) return { ok: true, ref: verbatim }

  const box = fitWithin(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = box.w
  canvas.height = box.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: true, ref: verbatim }
  ctx.drawImage(img, 0, 0, box.w, box.h)

  /* PNG KEEPS A TRANSPARENT GROUND, which is what a mark usually has;
     anything else is re-encoded as JPEG, where a photograph belongs.
     `toDataURL` returns a PNG for an unknown type, so the fallback is
     the safe one either way. */
  const png = /png|svg/i.test(file.type)
  let out = ''
  try {
    out = canvas.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : 0.82)
  } catch {
    return { ok: true, ref: verbatim }
  }
  if (!out.startsWith('data:image/')) return { ok: true, ref: verbatim }

  const after = bytesOfDataUrl(out)
  /* IF THE REDRAW IS NOT SMALLER, KEEP THE ORIGINAL. It happens with
     flat artwork that JPEG cannot beat, and storing the worse of two
     copies to honour a rule would be the rule serving itself. */
  if (after >= bytesOfDataUrl(src)) return { ok: true, ref: verbatim }

  return {
    ok: true,
    ref: { id: newId(), src: out, name: file.name, w: box.w, h: box.h },
    note: shrinkNote(file.size, after, box.w, box.h),
  }
}

/* ---------------------------------------------------------- */
/* The other door — an address                                 */
/* ---------------------------------------------------------- */

/** Said verbatim when a pasted line is refused. Names what IS allowed;
 *  the same rule, and the same wording discipline, as the register's
 *  picture cell. */
export const LOGO_ADDRESS_REFUSAL =
  'A picture address must start with http://, https://, data:image/ or blob:.'

/** A pasted address → the mark to store. No fetch and no check beyond
 *  the scheme: whether it paints is the host verdict's business, and an
 *  address on a host that refuses us is still a true record of where
 *  that mark lives. */
export function logoFromAddress(text: string): LogoRead {
  const src = text.trim()
  if (src === '') return { ok: false, why: LOGO_ADDRESS_REFUSAL }
  if (!isStorableSource(src)) return { ok: false, why: LOGO_ADDRESS_REFUSAL }
  return { ok: true, ref: { id: newId(), src } }
}
