/* ============================================================
   Picture columns — a thumbnail strip inside an ordinary cell.

   ORDER IS THE PRIORITY. Index 0 is the primary: the one a catalogue
   tile and a quote header show. There is no separate flag to fall out
   of sync — dragging a picture to the front IS promoting it, and the
   strip says so with a mark on the first slot only.

   Restraint is the requirement: a table full of pictures must still
   read as a TABLE. So the thumbs are small, square, on the row's own
   baseline, and every control (remove, add) is quiet until the cell
   is the one you are working in. Nothing here is ever wider than the
   column, and nothing here changes the row height.

   Search, sort, copy and export never see any of this — they read
   `imageCellText`, which is a count. A clipboard full of data URLs is
   not a price list.

   ------------------------------------------------------------
   A PICTURE WE CANNOT PAINT IS STILL A RECORD OF A PICTURE.

   The real catalogue does not carry photographs, it carries LINKS to
   them — `https://www.northsidemarine.com.au/…/540-proline.jpg` — and
   a link is only a picture where the browser is allowed to fetch it.
   Here it is not: every one of those responses is refused
   (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`), and a refused subresource
   is a console error the page cannot catch, cannot handle and cannot
   apologise for. Seventy-odd of them per sheet.

   So the rule is: WE ONLY POINT AN <img> AT PIXELS WE ALREADY HOLD.
   A `data:`/`blob:` picture (anything dropped, chosen or pasted in) is
   painted exactly as before. A picture that lives at somebody else's
   address is drawn as what it actually is — a REFERENCE: a hairline
   frame, the table kind's mark, and the filename. No request is made,
   so there is nothing to fail and nothing to log.

   `onError` stays on the paths that do load, because a truncated data
   URL is still possible; a picture that fails once is remembered for
   the session so the same broken source is never asked for twice.

   THE DATA IS UNTOUCHED. `ImageRef.src` keeps its URL, exports keep
   it, and the day those pixels are reachable the same cell paints
   them. Only the DISPLAY degrades — and it degrades into the drawing
   office's own language rather than into a browser's broken glyph.
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DragEvent as ReactDragEvent, JSX } from 'react'
import {
  imageCellText,
  primaryImage,
  type FieldDef,
  type ImageRef,
  type TableKind,
} from '@/types/model'
import { newId } from '@/lib/id'
import { ICON_SIZE, TABLE_KIND_ICON, weightFor } from '@/lib/icons'
import { CrossGlyph, PlusGlyph } from './glyphs'

/* ---------------------------------------------------------- */
/* reading files                                              */
/* ---------------------------------------------------------- */

const IMAGE_MIME = /^image\//

function readDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

/** Natural pixel size, so a grid can reserve space later. Never
 *  rejects: an unreadable picture simply carries no size. */
function naturalSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Files (dropped or chosen) → ImageRefs, in the order they arrived.
 *  Anything that is not an image is ignored rather than reported —
 *  dragging a folder of mixed files onto a cell is not an error. */
export async function readImageFiles(files: FileList | File[]): Promise<ImageRef[]> {
  const out: ImageRef[] = []
  for (const file of Array.from(files)) {
    if (!IMAGE_MIME.test(file.type)) continue
    const src = await readDataUrl(file)
    if (src === null) continue
    const size = await naturalSize(src)
    out.push({
      id: newId(),
      src,
      name: file.name,
      ...(size ? { w: size.w, h: size.h } : {}),
    })
  }
  return out
}

export const hasImageFiles = (dt: DataTransfer | null): boolean =>
  dt !== null && Array.from(dt.types).includes('Files')

/* ---------------------------------------------------------- */
/* pixels we hold vs. pictures we only reference              */
/* ---------------------------------------------------------- */

/** Pixels that travel with the project: nothing is fetched to draw
 *  them, so they can never fail on the network. */
const OWN_PIXELS = /^(data:|blob:)/i

/** True when pointing an `<img>` at this source cannot produce a
 *  cross-origin fetch — our own bytes, or our own origin. Everything
 *  else is a REFERENCE and is drawn as one. */
export function isPaintable(src: string): boolean {
  if (src === '') return false
  if (OWN_PIXELS.test(src)) return true
  try {
    return new URL(src, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

/** Sources that have already failed once. Module-level on purpose: the
 *  same photograph appears in a cell, in the strip and in the plate,
 *  and one failure is enough for all three, for the session. */
const broken = new Set<string>()

/** `609%20Ocean%20Ranger.jpg` is an address, not a filename. Names
 *  lifted off a URL arrive escaped; a plate in the drawing office
 *  reads the words. Anything that will not decode is left exactly as
 *  it came, because a mangled name is worse than an ugly one. */
function readable(text: string): string {
  if (!text.includes('%')) return text
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** The words on the plate: the filename the business would recognise,
 *  falling back to the last segment of the address. */
export function imageLabel(img: ImageRef): string {
  const named = img.name?.trim()
  if (named) return readable(named)
  try {
    const url = new URL(img.src, window.location.href)
    const last = url.pathname.split('/').filter(Boolean).pop()
    return last ? readable(last) : url.hostname
  } catch {
    return 'Picture'
  }
}

/** Where a referenced picture actually lives — the second line of the
 *  enlarged plate, so "why can't I see it" answers itself. */
function imageHost(img: ImageRef): string {
  try {
    return new URL(img.src, window.location.href).hostname
  } catch {
    return ''
  }
}

/** The kind's mark, in the size the plate is drawn at. */
function KindMark({ kind, size }: { kind?: TableKind; size: number }): JSX.Element {
  const Mark = TABLE_KIND_ICON[kind ?? 'custom'] ?? TABLE_KIND_ICON.custom
  return <Mark size={size} weight={weightFor(size)} />
}

/** One thumbnail: the picture when we hold its pixels, the reference
 *  frame when we only hold its address — and the reference frame the
 *  moment a picture we thought we held turns out not to load. */
function Thumb({ img, kind }: { img: ImageRef; kind?: TableKind }): JSX.Element {
  const [failed, setFailed] = useState(() => broken.has(img.src))
  if (!isPaintable(img.src) || failed) {
    return (
      <span className="tb-imgmiss" aria-hidden="true">
        <KindMark kind={kind} size={ICON_SIZE.tiny} />
      </span>
    )
  }
  return (
    <img
      className="tb-imgpic"
      src={img.src}
      alt={img.alt ?? ''}
      draggable={false}
      onError={() => {
        broken.add(img.src)
        setFailed(true)
      }}
    />
  )
}

/* ---------------------------------------------------------- */
/* the strip                                                  */
/* ---------------------------------------------------------- */

/** Reordering is per cell. A picture dragged out of one cell must
 *  never land in another's order, so the origin travels alongside the
 *  index and the drop is refused when they disagree. */
let dragFrom: { cell: string; index: number } | null = null

const DND_TYPE = 'application/x-tb-image'

export interface ImageStripProps {
  field: FieldDef
  /** what the table holds — the mark a referenced picture is drawn
   *  with, so a missing photograph still says what it is a photograph
   *  OF. Absent on a table with no kind: the blank-sheet mark. */
  kind?: TableKind
  /** identifies THIS cell, so a drag cannot cross into another */
  cellKey: string
  images: ImageRef[]
  /** the cell is the one the reader is working in */
  isActive: boolean
  onOpen: (index: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onReorder: (from: number, to: number) => void
  onDropFiles: (files: FileList) => void
}

export function ImageStrip({
  field,
  kind,
  cellKey,
  images,
  isActive,
  onOpen,
  onAdd,
  onRemove,
  onReorder,
  onDropFiles,
}: ImageStripProps): JSX.Element {
  const [over, setOver] = useState(false)
  const [dropAt, setDropAt] = useState<number | null>(null)

  const count = images.length
  const primary = primaryImage(images)
  const summary = count === 0 ? 'No pictures' : imageCellText(images)

  const onCellDragOver = (e: ReactDragEvent<HTMLDivElement>): void => {
    if (!hasImageFiles(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!over) setOver(true)
  }

  const onCellDrop = (e: ReactDragEvent<HTMLDivElement>): void => {
    setOver(false)
    setDropAt(null)
    if (!hasImageFiles(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    onDropFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={
        'tb-imgcell' +
        (over ? ' tb-imgcell-over' : '') +
        (isActive ? ' tb-imgcell-live' : '')
      }
      title={
        count === 0
          ? `${field.name} — drop pictures here, or select the cell and press Enter`
          : `${summary}${primary?.name ? ` · first: ${primary.name}` : ''}`
      }
      onDragOver={onCellDragOver}
      onDragLeave={(e) => {
        /* moving between a thumb and its neighbour is not leaving the
           cell — only a pointer that has actually left it clears the
           drop state, or the highlight strobes as you cross the strip */
        const to = e.relatedTarget
        if (to instanceof Node && e.currentTarget.contains(to)) return
        setOver(false)
        setDropAt(null)
      }}
      onDrop={onCellDrop}
    >
      <div className="tb-imgstrip">
        {images.map((img, i) => (
          <span
            key={img.id}
            className={
              'tb-imgslot' +
              (i === 0 ? ' tb-imgslot-first' : '') +
              (dropAt === i ? ' tb-imgslot-drop' : '')
            }
            draggable={count > 1}
            onDragStart={(e) => {
              dragFrom = { cell: cellKey, index: i }
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData(DND_TYPE, String(i))
            }}
            onDragEnd={() => {
              dragFrom = null
              setDropAt(null)
            }}
            onDragOver={(e) => {
              if (dragFrom === null || dragFrom.cell !== cellKey) return
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              if (dropAt !== i) setDropAt(i)
            }}
            onDrop={(e) => {
              const held = dragFrom
              dragFrom = null
              setDropAt(null)
              if (held === null || held.cell !== cellKey) return
              e.preventDefault()
              e.stopPropagation()
              if (held.index !== i) onReorder(held.index, i)
            }}
          >
            <button
              type="button"
              tabIndex={-1}
              className={
                'tb-imgthumb' + (isPaintable(img.src) ? '' : ' tb-imgthumb-ref')
              }
              aria-label={
                `${field.name} — picture ${i + 1} of ${count}` +
                (i === 0 ? ' (first, the one that shows)' : '') +
                `: ${imageLabel(img)}` +
                (isPaintable(img.src) ? '' : ' — held as a link, not shown here')
              }
              title={
                imageLabel(img) +
                (isPaintable(img.src)
                  ? ''
                  : ` — held as a link to ${imageHost(img)}, so it is not shown here`) +
                (i === 0
                  ? ' — first, so this is the one that shows. Drag another here to swap.'
                  : ' — drag it to the front to make it the one that shows.')
              }
              onClick={(e) => {
                /* first click selects the cell, a second one opens the
                   picture — so sweeping a selection across a row of
                   photographs never throws a viewer up */
                if (!isActive) return
                e.stopPropagation()
                onOpen(i)
              }}
            >
              <Thumb img={img} kind={kind} />
              {i === 0 && <span className="tb-imgmark" aria-hidden="true" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="tb-imgx"
              aria-label={`Remove picture ${i + 1} from ${field.name}`}
              title="Remove this picture"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(i)
              }}
            >
              <CrossGlyph />
            </button>
          </span>
        ))}

        <button
          type="button"
          tabIndex={-1}
          className="tb-imgadd"
          aria-label={`Add pictures to ${field.name}`}
          title="Add pictures — or drop image files straight onto the cell"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
        >
          <PlusGlyph />
        </button>

        {count > 0 && (
          <span className="tb-imgcount" aria-hidden="true">
            {count}
          </span>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* the enlarged plate                                         */
/* ---------------------------------------------------------- */

export interface LightboxState {
  images: ImageRef[]
  index: number
  /** the column the pictures came from, for the caption */
  fieldName: string
  /** what the table holds — the mark a referenced picture is drawn with */
  kind?: TableKind
}

/** The enlarged form of a picture we only hold the address of: the
 *  same hairline frame the thumbnail draws, at plate size, saying what
 *  it is and where it lives. Never a broken-image glyph. */
function ReferencePlate({
  image,
  kind,
}: {
  image: ImageRef
  kind?: TableKind
}): JSX.Element {
  const host = imageHost(image)
  return (
    <div className="tb-missplate" role="img" aria-label={`${imageLabel(image)} — held as a link`}>
      <span className="tb-missplate-mark" aria-hidden="true">
        <KindMark kind={kind} size={ICON_SIZE.large} />
      </span>
      <span className="tb-missplate-name">{imageLabel(image)}</span>
      <span className="tb-missplate-note">
        {host === ''
          ? 'Held as a link — the picture itself is not here.'
          : `Held as a link — the picture itself lives at ${host}.`}
      </span>
    </div>
  )
}

/** The big picture, or its reference plate. Same decision as the
 *  thumbnail, taken once, in one place. */
function Plate({ image, kind }: { image: ImageRef; kind?: TableKind }): JSX.Element {
  const [failed, setFailed] = useState(() => broken.has(image.src))
  if (!isPaintable(image.src) || failed) {
    return <ReferencePlate image={image} kind={kind} />
  }
  return (
    <img
      className="tb-lightbox-pic"
      src={image.src}
      alt={image.alt ?? image.name ?? ''}
      onError={() => {
        broken.add(image.src)
        setFailed(true)
      }}
    />
  )
}

/** One picture, full size, on a drafting plate. Portalled to the
 *  document for the same reason every other overlay in this module
 *  is: a table on the blueprint lives inside a TRANSFORMED React Flow
 *  node, and a fixed overlay inside a transform resolves against the
 *  node instead of the window. */
export function ImageLightbox({
  state,
  onIndex,
  onClose,
}: {
  state: LightboxState
  onIndex: (next: number) => void
  onClose: () => void
}): JSX.Element | null {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const { images, index, fieldName, kind } = state
  const image = images[index]

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'ArrowRight' && index < images.length - 1) {
        e.stopPropagation()
        e.preventDefault()
        onIndex(index + 1)
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.stopPropagation()
        e.preventDefault()
        onIndex(index - 1)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [index, images.length, onIndex, onClose])

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  if (!image) return null

  return createPortal(
    <div
      className="tb-lightbox"
      role="presentation"
      /* portalled to the document, but still a child of the grid in
         the REACT tree — so no keystroke and no paste of its own may
         reach the grid's single keydown handler and start editing a
         cell behind the picture */
      onKeyDown={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="tb-lightbox-plate"
        role="dialog"
        aria-modal="true"
        aria-label={`${fieldName} — picture ${index + 1} of ${images.length}`}
        ref={rootRef}
        tabIndex={-1}
      >
        <header className="tb-lightbox-head">
          <span className="tb-lightbox-name">{imageLabel(image) || fieldName}</span>
          <span className="tb-lightbox-of">
            {index + 1} / {images.length}
            {index === 0 ? ' · first' : ''}
          </span>
          <button
            type="button"
            className="tb-lightbox-x"
            aria-label="Close the picture"
            title="Close · Esc"
            onClick={onClose}
          >
            <CrossGlyph />
          </button>
        </header>

        <div className="tb-lightbox-body">
          <Plate image={image} kind={kind} />
        </div>

        {images.length > 1 && (
          <footer className="tb-lightbox-foot">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={'tb-lightbox-dot' + (i === index ? ' tb-lightbox-dot-on' : '')}
                aria-label={`Picture ${i + 1}`}
                aria-current={i === index}
                title={imageLabel(img)}
                onClick={() => onIndex(i)}
              >
                <Thumb img={img} kind={kind} />
              </button>
            ))}
          </footer>
        )}

        {image.w && image.h ? (
          <span className="tb-lightbox-dim" aria-hidden="true">
            {image.w} × {image.h}
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
