/* ============================================================
   Picture columns — a thumbnail strip inside an ordinary cell.

   ORDER IS THE PRIORITY. Index 0 is the primary: the one a catalogue
   tile and the page that sells the boat show. There is no separate
   flag to fall out of sync — dragging a picture to the front IS
   promoting it. That rule used to be implied by a corner tick nobody
   could interpret; it is now SAID, in three places (IMAGE_SPEC §3):
   the first slot alone carries a solid ink frame, a drop marker
   appears at the front of the strip the moment a picture is dragged
   inside the cell, and the enlarged plate either stamps
   "THE ONE THAT SHOWS" or offers the button that makes it so. All
   three move the SAME array; there is no promote flag and no second
   way to be wrong.

   Restraint is the requirement: a table full of pictures must still
   read as a TABLE. So the thumbs are small, square, on the row's own
   baseline, and every control (remove, add) is quiet until the cell
   is the one you are working in. Nothing here is ever wider than the
   column, and nothing here changes the row height.

   Search, sort, copy and export never see any of this — they read
   `imageCellText`, which is a count. A clipboard full of data URLs is
   not a price list.

   ------------------------------------------------------------
   TWO DOORS IN, NOT ONE (IMAGE_SPEC §2).

   Every picture this business owns is ALREADY A URL — the catalogue
   carries addresses, not photographs, which is why 1,411 pictures
   cost 170,274 bytes. Until now the only way in was dropping a file, so the
   obvious route was the missing one. Now the `+` plate and a
   double-click on the cell open one small sheet with both doors on
   it: the file chooser, and a box to paste an address into. Ctrl+V on
   a selected picture cell takes the short way and adds straight from
   the clipboard.

   THE SCHEME IS A SECURITY BOUNDARY, NOT A NICETY. `ImageRef.src`
   goes straight into an `<img src>`, and that is the one place
   untrusted text enters our DOM. Only `http:`, `https:`, `data:image/`
   and `blob:` may be stored; `javascript:`, `file:`, `data:text/html`
   and anything else are refused before the value exists, with a
   sentence that says what IS allowed. A scheme-less line is refused
   too, because resolving it against our own origin would silently
   turn somebody's typo into a same-origin request.

   AND WHAT HAPPENED IS SAID. An address on a host we already know
   refuses us is still STORED — the data is right even when the
   picture cannot be shown — so the sheet says so in words rather than
   letting a correct save read as a failure.

   ------------------------------------------------------------
   A PICTURE WE CANNOT PAINT IS STILL A RECORD OF A PICTURE.

   Whether an address may be drawn is NOT decided here. It is decided
   once per HOST in `@/lib/imageSources`, and the cell, the enlarged
   plate and the page that sells the boat all read the same verdict —
   so a picture that is a plate in the table is never a broken glyph
   in front of a customer. A closed host is drawn as what it actually
   is: a REFERENCE — hairline frame, the table kind's mark, the
   filename — with no request made.

   THE DATA IS UNTOUCHED. `ImageRef.src` keeps its address, exports
   keep it, and the day those pixels are reachable the same cell
   paints them. Only the DISPLAY degrades — and it degrades into the
   drawing office's own language rather than into a browser's broken
   glyph.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  AddressDoorIcon,
  FileDoorIcon,
  ICON_SIZE,
  TABLE_KIND_ICON,
  weightFor,
} from '@/lib/icons'
import {
  heldAsLinkNote,
  hostIsClosed,
  imageHostOf,
  imageLabel,
  nameFromUrl,
  noteImageFailed,
  noteImageLoaded,
  seededCopy,
  useImageDisplay,
} from '@/lib/imageSources'
import { Popover } from './Popover'
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
 *  rejects: an unreadable picture simply carries no size.
 *
 *  Only ever asked of pixels we already hold. Measuring a REMOTE
 *  address this way would be a second fetch of a full-size photograph
 *  — and on a host that refuses us, one more uncatchable console line
 *  for a number nobody reads. */
function naturalSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Files (dropped, chosen or pasted) → ImageRefs, in the order they
 *  arrived. Anything that is not an image is ignored rather than
 *  reported — dragging a folder of mixed files onto a cell is not an
 *  error. */
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
/* reading addresses — the one untrusted door                 */
/* ---------------------------------------------------------- */

/** The complete list of schemes that may reach an `<img src>`, and the
 *  only place it is written down for the WRITE path. (`imageSources`
 *  holds the same rule for the READ path; both must agree, and both
 *  say `data:image/` rather than `data:`.) */
const ALLOWED_SCHEME = /^(?:https?:|data:image\/|blob:)/i

/** Said to the reader, verbatim, whenever a line is refused. It names
 *  what IS allowed, because "invalid" teaches nobody anything. */
export const SCHEME_REFUSAL =
  'A picture address must start with http://, https://, data:image/ or blob:.'

export interface ReadAddresses {
  /** the lines we will store, in the order they were pasted */
  refs: ImageRef[]
  /** lines refused on their scheme — kept, not merely counted, so the
   *  box can hand back exactly what needs correcting */
  refused: string[]
}

/** Anything with a scheme on every line and no tab in it. A block
 *  paste out of a spreadsheet has tabs and prose; this is the test
 *  that lets one go to the grid's block paste (which deliberately
 *  skips picture columns) and the other be claimed here. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

export function looksLikeAddresses(text: string): boolean {
  if (text.includes('\t')) return false
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== '')
  return lines.length > 0 && lines.every((line) => HAS_SCHEME.test(line))
}

/** Text → pictures. One address per line, in the order pasted.
 *
 *  NO FETCH, NO HEAD CHECK, NO VALIDATION BEYOND THE SCHEME. Whether
 *  an address paints is the host verdict's business, not this
 *  function's: a picture on a host that refuses us is still a true
 *  record of where that picture lives, and storing it is correct.
 *
 *  A line with no scheme at all is refused rather than resolved. */
export function imageRefsFromText(text: string): ReadAddresses {
  const refs: ImageRef[] = []
  const refused: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    if (!ALLOWED_SCHEME.test(line)) {
      refused.push(line)
      continue
    }
    /* http/https must also PARSE — `https://` on its own is a scheme,
       not an address. `data:`/`blob:` are taken as they stand: they
       are pixels we already hold, and `new URL` accepts both. */
    let parsed: URL | null = null
    try {
      parsed = new URL(line)
    } catch {
      parsed = null
    }
    if (parsed === null || parsed.href === '') {
      refused.push(line)
      continue
    }
    const name = /^https?:/i.test(line) ? nameFromUrl(line) : ''
    refs.push({ id: newId(), src: line, ...(name === '' ? {} : { name }) })
  }
  return { refs, refused }
}

/** What the sheet says after an attempt. Never silent, never a bare
 *  "error" — a saved address on a blocked host is a SUCCESS that
 *  happens not to be visible, and it has to read like one. */
export interface AddOutcome {
  text: string
  tone: 'info' | 'warn'
}

const plural = (n: number): string => (n === 1 ? 'picture' : 'pictures')

/** What an attempt did, and what the box should keep — the refused
 *  lines, so they can be corrected rather than retyped. */
export interface AddAttempt {
  outcome: AddOutcome
  keep: string
}

export function outcomeOf(refs: ImageRef[], refused: number): AddOutcome {
  if (refs.length === 0) {
    return {
      text: refused === 0 ? 'Nothing to add.' : `Nothing was added. ${SCHEME_REFUSAL}`,
      tone: 'warn',
    }
  }
  /* a host already condemned this session: the address is saved, the
     picture cannot be drawn, and those are two different facts */
  const blocked = [
    ...new Set(refs.filter((r) => hostIsClosed(r.src)).map((r) => imageHostOf(r.src))),
  ].filter((h) => h !== '')
  let text = `Added ${refs.length} ${plural(refs.length)} — saved.`
  if (blocked.length > 0) {
    text += ` ${blocked.join(', ')} refuses pictures here, so the cell shows the reference plate instead of the photograph.`
  }
  if (refused > 0) {
    text += ` ${refused} ${refused === 1 ? 'line was' : 'lines were'} refused. ${SCHEME_REFUSAL}`
  }
  return { text, tone: refused > 0 ? 'warn' : 'info' }
}

/* ---------------------------------------------------------- */
/* the sheet with both doors on it                            */
/* ---------------------------------------------------------- */

/** ADD PICTURES. Two doors and nothing else: the file chooser, which
 *  is focused on open because it is the door that already existed,
 *  and a box for an address, which is the door that was missing.
 *
 *  Nothing in here shows an example address. An example URL in a
 *  catalogue tool is indistinguishable from a real one, so every
 *  placeholder is an INSTRUCTION. (IMAGE_SPEC §2, §6.10) */
function AddPictures({
  anchor,
  fieldName,
  first,
  onChooseFiles,
  onSubmitText,
  onClose,
}: {
  anchor: DOMRect
  fieldName: string
  /** what to say before the reader has done anything — the outcome of
   *  the Ctrl+V that opened this sheet, when that is how it opened */
  first: AddOutcome | null
  onChooseFiles: () => void
  onSubmitText: (text: string) => AddAttempt
  onClose: () => void
}): JSX.Element {
  const [text, setText] = useState('')
  const [said, setSaid] = useState<AddOutcome | null>(first)
  const boxId = 'tb-imgurl'

  const submit = (): void => {
    const { outcome, keep } = onSubmitText(text)
    setSaid(outcome)
    /* what was stored leaves the box; what was refused stays in it, so
       it can be corrected rather than retyped — and never added twice */
    setText(keep)
  }

  return (
    <Popover anchor={anchor} width={300} label={`Add pictures to ${fieldName}`} onClose={onClose}>
      <header className="tb-menu-head">
        <span className="tb-menu-title">Add pictures</span>
      </header>

      {/* THE FOOTER MUST SURVIVE THE SENTENCE. The sheet is capped at
          380px and clips what will not fit; the outcome line makes the
          sheet taller AFTER it opens, and a clipped footer means the
          Add button disappears the moment there is something to say.
          So the doors scroll and the footer does not. */}
      <div className="tb-imgsheet">
        <div className="tb-imgsheet-scroll">
          <div className="tb-imgdoors">
            <button
              type="button"
              className="tb-act tb-imgdoor"
              autoFocus
              onClick={onChooseFiles}
            >
              <span className="tb-imgdoor-mark" aria-hidden="true">
                <FileDoorIcon size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />
              </span>
              Choose files from this computer
            </button>
            <span className="mono-label tb-imgdoor-note">
              Or drop them straight onto the cell
            </span>
          </div>

          <div className="tb-menu-body tb-menu-more">
            <label className="mono-label tb-menu-lab tb-imgdoor-lab" htmlFor={boxId}>
              <span className="tb-imgdoor-mark" aria-hidden="true">
                <AddressDoorIcon
                  size={ICON_SIZE.small}
                  weight={weightFor(ICON_SIZE.small)}
                />
              </span>
              Paste a web address
            </label>
            <textarea
              id={boxId}
              className="field-input tb-area tb-mono-input"
              rows={2}
              value={text}
              spellCheck={false}
              placeholder="Paste the address here"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                /* Enter adds; several addresses need newlines, so those
                   are typed with Shift held, as in any message box */
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <p className="tb-menu-note">
              Right-click a picture on a website, choose Copy image address, and paste
              it here. Several, one per line, are added in the order you paste them.
            </p>
            {said && (
              <p
                className={'tb-imgsaid' + (said.tone === 'warn' ? ' tb-imgsaid-warn' : '')}
                role="status"
              >
                {said.text}
              </p>
            )}
          </div>
        </div>

        <footer className="tb-menu-foot tb-imgsheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Add
          </button>
        </footer>
      </div>
    </Popover>
  )
}

/* ---------------------------------------------------------- */
/* the hover preview                                          */
/* ---------------------------------------------------------- */

/* ============================================================
   A THUMBNAIL YOU CAN ACTUALLY SEE, WITHOUT LEAVING THE ROW.

   220 real photographs ship with this app and the register drew the
   largest of them at 32 pixels. Opening one meant selecting the cell,
   then pressing the picture, then closing a full-screen plate — three
   acts and a scene change to answer "which boat is this row".

   Resting the pointer on a thumb now answers it in place. The plate
   is 268px, it names the picture and says where it sits in the strip,
   and it goes the moment the pointer does. It is NOT a second way to
   open the lightbox: the lightbox is still where a picture is worked
   on — promoted, walked through, removed — and this is only looking.

   THREE THINGS IT REFUSES TO DO.

   · It never draws a picture the cell itself could not draw. A closed
     host is a REFERENCE in the strip (see the note at the top of this
     file) and there is nothing to enlarge, so no plate appears and no
     request is made.
   · It waits. A pointer crossing a column of forty photographs on its
     way somewhere else must not throw forty plates up, so the plate
     is armed on a delay and disarmed by leaving.
   · It never covers the thumb it belongs to, and never leaves the
     window. It stands beside the picture, flipping to the other side
     when that side is where the window ends.
   ============================================================ */

/** how long the pointer has to stay before the plate is drawn */
const PEEK_WAIT = 320
const PEEK_W = 268
const PEEK_H = 244

interface Peek {
  at: string
  alt: string
  /** the picture's own words, and where it sits in the strip */
  label: string
  say: string
  /** the thumb it belongs to, so the plate can stand beside it */
  box: DOMRect
}

function ImagePeek({ peek }: { peek: Peek }): JSX.Element {
  const gap = 12
  const room = typeof window === 'undefined' ? 1280 : window.innerWidth
  const tall = typeof window === 'undefined' ? 800 : window.innerHeight

  let left = peek.box.right + gap
  if (left + PEEK_W > room - 8) left = peek.box.left - gap - PEEK_W
  if (left < 8) left = Math.max(8, room - PEEK_W - 8)

  const wanted = peek.box.top + peek.box.height / 2 - PEEK_H / 2
  const top = Math.max(8, Math.min(wanted, tall - PEEK_H - 8))

  return createPortal(
    <div
      className="tb-imgpeek"
      style={{ left, top, width: PEEK_W }}
      role="presentation"
      aria-hidden="true"
    >
      <span className="tb-imgpeek-frame">
        <img className="tb-imgpeek-pic" src={peek.at} alt={peek.alt} decoding="async" />
      </span>
      <span className="tb-imgpeek-say">
        <b className="tb-imgpeek-name">{peek.label}</b>
        <i className="tb-imgpeek-of">{peek.say}</i>
      </span>
    </div>,
    document.body,
  )
}

/* ---------------------------------------------------------- */
/* one thumbnail                                              */
/* ---------------------------------------------------------- */

/** The kind's mark, in the size the plate is drawn at. */
function KindMark({ kind, size }: { kind?: TableKind; size: number }): JSX.Element {
  const Mark = TABLE_KIND_ICON[kind ?? 'custom'] ?? TABLE_KIND_ICON.custom
  return <Mark size={size} weight={weightFor(size)} />
}

/** One thumbnail: the picture when the host verdict allows it, the
 *  reference frame when it does not — and the reference frame the
 *  moment a picture we thought would paint turns out not to.
 *
 *  Its own component because the verdict is a HOOK: forty rows means
 *  forty subscriptions, one per source, and a hook cannot be called
 *  inside the strip's map. */
function ThumbButton({
  img,
  kind,
  index,
  count,
  fieldName,
  isActive,
  onOpen,
  onPeek,
}: {
  img: ImageRef
  kind?: TableKind
  index: number
  count: number
  fieldName: string
  isActive: boolean
  onOpen: (index: number) => void
  /** arm or disarm the hover plate — `null` disarms. Only ever called
   *  with a picture this cell is already allowed to draw. */
  onPeek: (p: Peek | null) => void
}): JSX.Element {
  const { paint, probe, at } = useImageDisplay(img.src)
  const first = index === 0
  const peekOf = (el: HTMLElement): Peek | null =>
    paint && at
      ? {
          at,
          alt: img.alt ?? '',
          label: imageLabel(img),
          say:
            count === 1
              ? fieldName
              : `${fieldName} — ${index + 1} of ${count}${first ? ', the one that shows' : ''}`,
          box: el.getBoundingClientRect(),
        }
      : null
  return (
    <button
      type="button"
      tabIndex={-1}
      className={'tb-imgthumb' + (paint ? '' : ' tb-imgthumb-ref')}
      onMouseEnter={(e) => onPeek(peekOf(e.currentTarget))}
      onMouseLeave={() => onPeek(null)}
      /* the plate goes the instant the picture is being acted on —
         opened, dragged, removed — so it can never stand between the
         pointer and the thing it is pointing at */
      onMouseDown={() => onPeek(null)}
      /* ONE WORDING FOR THIS IDEA, EVERYWHERE. These two strings used
         to invent their own — "held as a link, not shown here" for the
         reader, "held as a link to <host>, so it is not shown here"
         for the pointer — while the enlarged plate said a third thing
         and the module tile a fourth. They all say `heldAsLinkNote`'s
         sentence now, which also means the eye and the screen reader
         are finally told the same thing here. */
      aria-label={
        `${fieldName} — picture ${index + 1} of ${count}` +
        (first ? ' (first, the one that shows)' : '') +
        `: ${imageLabel(img)}` +
        (paint ? '' : `. ${heldAsLinkNote(img.src)}`)
      }
      /* the note goes LAST and stands as its own sentence — spliced
         into the middle it collided with the drag hint's full stop */
      title={
        imageLabel(img) +
        (first
          ? ' — first, so this is the one that shows. Drag another here to swap.'
          : ' — drag it to the front to make it the one that shows.') +
        (paint ? '' : ` ${heldAsLinkNote(img.src)}`)
      }
      onClick={(e) => {
        /* first click selects the cell, a second one opens the
           picture — so sweeping a selection across a row of
           photographs never throws a viewer up */
        if (!isActive) return
        e.stopPropagation()
        onOpen(index)
      }}
    >
      {paint ? (
        <img
          className="tb-imgpic"
          /* `at`, not `img.src`: the repository ships a copy of most of
             the catalogue's photographs and this paints it from our own
             origin. The cell's VALUE is untouched — the address it
             carries is still the maker's, and still what leaves in an
             export. */
          src={at}
          alt={img.alt ?? ''}
          draggable={false}
          /* THE PROBE IS THE ONE PICTURE on an unknown host allowed to
             make the request that settles it, so it must not be
             deferred. Everything else waits until it is on screen: the
             grid only virtualises above 150 rows, so a 40-row table
             mounts all forty, and eager thumbs would fetch forty
             full-size photographs to draw forty 24px squares. (§1.6) */
          loading={probe ? 'eager' : 'lazy'}
          decoding="async"
          /* the verdict is the module's, not ours: what this cell
             learns teaches every other cell and the page that sells
             the boat */
          onLoad={() => noteImageLoaded(img.src)}
          onError={() => noteImageFailed(img.src)}
        />
      ) : (
        <span className="tb-imgmiss" aria-hidden="true">
          <KindMark kind={kind} size={ICON_SIZE.tiny} />
        </span>
      )}
      {first && <span className="tb-imgmark" aria-hidden="true" />}
    </button>
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

/** The drop marker at the head of the strip — "the front" as a place
 *  you can aim at, rather than as an abstraction. */
const FRONT = -1

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
  /** open the operating system's file chooser — the door that already
   *  existed, now reached from inside the ADD PICTURES sheet */
  onAdd: () => void
  /** append pictures that already exist as values: addresses read off
   *  the clipboard, or files read into `data:` URLs here */
  onAddImages: (added: ImageRef[]) => void
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
  onAddImages,
  onRemove,
  onReorder,
  onDropFiles,
}: ImageStripProps): JSX.Element {
  const [over, setOver] = useState(false)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [add, setAdd] = useState<{ anchor: DOMRect; first: AddOutcome | null } | null>(
    null,
  )
  const cellRef = useRef<HTMLDivElement | null>(null)

  /* -- the hover plate, armed on a delay -------------------------
     See the note above `ImagePeek`. The timer is a ref so arming and
     disarming are the same synchronous act from any handler, and the
     unmount clears it — a cell scrolled out from under a resting
     pointer must not put a plate up a third of a second later. */
  const [peek, setPeek] = useState<Peek | null>(null)
  const peekTimer = useRef<number | null>(null)
  const arm = useCallback((p: Peek | null): void => {
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    if (p === null) {
      peekTimer.current = null
      setPeek(null)
      return
    }
    peekTimer.current = window.setTimeout(() => setPeek(p), PEEK_WAIT)
  }, [])
  useEffect(
    () => () => {
      if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    },
    [],
  )

  const count = images.length
  const primary = primaryImage(images)
  const summary = count === 0 ? 'No pictures' : imageCellText(images)

  const openAdd = useCallback((from: Element | null, first: AddOutcome | null): void => {
    const box = (from ?? cellRef.current)?.getBoundingClientRect()
    if (!box) return
    setAdd({ anchor: box, first })
  }, [])

  const addText = useCallback(
    (text: string): AddAttempt => {
      const { refs, refused } = imageRefsFromText(text)
      if (refs.length > 0) onAddImages(refs)
      /* the outcome is read AFTER the refs exist, so a host already
         known-closed is named in the sentence */
      return { outcome: outcomeOf(refs, refused.length), keep: refused.join('\n') }
    },
    [onAddImages],
  )

  /* -- Ctrl+V straight onto the cell ----------------------------
     The grid mounts ONE paste handler, and it treats text as a block
     paste that deliberately skips picture columns — so a pasted
     address used to be a silent no-op on the one column where it is
     the obvious thing to do. This claims the event first, in the
     capture phase, and only for the ONE cell that is both selected
     and inside the table the reader is actually in: several sheets
     are on the board at once, each with its own selection, and a
     paste must never land in all of them. */
  useEffect(() => {
    if (!isActive) return
    const mine = (): boolean => {
      const cell = cellRef.current
      if (cell === null) return false
      const grid = cell.closest('.tb-grid')
      return grid !== null && grid === document.activeElement
    }
    const onPaste = (e: ClipboardEvent): void => {
      if (!mine()) return
      const dt = e.clipboardData
      if (dt === null) return
      const files = Array.from(dt.files).filter((f) => IMAGE_MIME.test(f.type))
      if (files.length > 0) {
        /* pixels we hold — the same path as a drop */
        e.preventDefault()
        e.stopPropagation()
        void readImageFiles(files).then((refs) => {
          if (refs.length > 0) onAddImages(refs)
          openAdd(null, outcomeOf(refs, 0))
        })
        return
      }
      const text = dt.getData('text/plain')
      /* A BLOCK PASTE MUST STILL FLOW PAST A PICTURE COLUMN. Forty
         columns of spreadsheet text landing on a selection whose
         anchor happens to be a photograph must not scatter addresses
         into it — so only text that is addresses all the way down is
         claimed here; anything else is left to the grid's one paste
         handler, which skips picture columns and says how many. */
      if (!looksLikeAddresses(text)) return
      e.preventDefault()
      e.stopPropagation()
      openAdd(null, addText(text).outcome)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return
      if (!mine()) return
      e.preventDefault()
      e.stopPropagation()
      openAdd(null, null)
    }
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [isActive, addText, onAddImages, openAdd])

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

  /* a drop target inside this cell's own strip, for the picture being
     dragged inside it — `to` is where it lands */
  const landAt = (to: number) => ({
    onDragOver: (e: ReactDragEvent<HTMLElement>): void => {
      if (dragFrom === null || dragFrom.cell !== cellKey) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      if (dropAt !== to) setDropAt(to)
    },
    onDrop: (e: ReactDragEvent<HTMLElement>): void => {
      const held = dragFrom
      dragFrom = null
      setDropAt(null)
      setDragging(false)
      if (held === null || held.cell !== cellKey) return
      e.preventDefault()
      e.stopPropagation()
      const target = to === FRONT ? 0 : to
      if (held.index !== target) onReorder(held.index, target)
    },
  })

  return (
    <div
      ref={cellRef}
      className={
        'tb-imgcell' +
        (over ? ' tb-imgcell-over' : '') +
        (isActive ? ' tb-imgcell-live' : '')
      }
      title={
        count === 0
          ? `${field.name} — drop pictures here, or press + to add one by address`
          : `${summary}${primary?.name ? ` · first: ${primary.name}` : ''} — the first one is the one that shows`
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
      /* the plate belongs to a thumb, so it goes when the pointer
         leaves the CELL as well as when it leaves the thumb — a
         pointer that jumps straight out of the register never fires
         the thumb's own leave */
      onMouseLeave={() => arm(null)}
      onDrop={onCellDrop}
      onDoubleClick={(e) => {
        /* double-clicking a THUMBNAIL opens that picture; the grid's
           own handler opens the file chooser for everything else in a
           picture column, and this claims the empty space of the cell
           before it gets there */
        if ((e.target as HTMLElement).closest('.tb-imgslot, .tb-imgadd')) return
        e.stopPropagation()
        openAdd(e.currentTarget, null)
      }}
    >
      <div className="tb-imgstrip">
        {/* THE FRONT IS A PLACE. Drawn only while a picture is being
            dragged inside this cell, so nothing is added to a resting
            cell — and it says, at the moment it matters, that the
            front of the strip is a target worth aiming at. */}
        {dragging && count > 1 && (
          <span
            className={'tb-imgfront' + (dropAt === FRONT ? ' tb-imgfront-on' : '')}
            aria-hidden="true"
            title="Drop here to make it the one that shows"
            {...landAt(FRONT)}
          />
        )}

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
              setDragging(true)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData(DND_TYPE, String(i))
            }}
            onDragEnd={() => {
              dragFrom = null
              setDropAt(null)
              setDragging(false)
            }}
            {...landAt(i)}
          >
            <ThumbButton
              img={img}
              kind={kind}
              index={i}
              count={count}
              fieldName={field.name}
              isActive={isActive}
              onOpen={onOpen}
              onPeek={arm}
            />
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
          title="Add pictures — choose files, or paste a web address"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            openAdd(e.currentTarget, null)
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

      {/* the hover plate — never while a sheet of its own is up, and
          never while a picture is being dragged */}
      {peek && add === null && !dragging && <ImagePeek peek={peek} />}

      {add && (
        <AddPictures
          anchor={add.anchor}
          fieldName={field.name}
          first={add.first}
          onChooseFiles={() => {
            setAdd(null)
            onAdd()
          }}
          onSubmitText={addText}
          onClose={() => setAdd(null)}
        />
      )}
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
  /** which cell these pictures belong to, so the plate can promote one
   *  — the same move-to-index-0 the drag does, never a second flag */
  rowId: string
  fieldId: string
}

/** The enlarged form of a picture we only hold the address of: the
 *  same hairline frame the thumbnail draws, at plate size, saying what
 *  it is and why it is not shown. Never a broken-image glyph.
 *
 *  THE SENTENCE IS `heldAsLinkNote`'s, not this file's — the same words
 *  the thumbnail's title and the module tile use, so a reader who has
 *  met one recognises the others instead of counting three faults. And
 *  the screen reader is told what the eye is told: the aria-label used
 *  to stop at "held as a link" and drop the reason on the floor. */
function ReferencePlate({
  image,
  kind,
}: {
  image: ImageRef
  kind?: TableKind
}): JSX.Element {
  const note = heldAsLinkNote(image.src)
  return (
    <div className="tb-missplate" role="img" aria-label={`${imageLabel(image)} — ${note}`}>
      <span className="tb-missplate-mark" aria-hidden="true">
        <KindMark kind={kind} size={ICON_SIZE.large} />
      </span>
      <span className="tb-missplate-name">{imageLabel(image)}</span>
      <span className="tb-missplate-note">{note}</span>
    </div>
  )
}

/** The big picture, or its reference plate. Same decision as the
 *  thumbnail, taken once, in one place. */
function Plate({ image, kind }: { image: ImageRef; kind?: TableKind }): JSX.Element {
  const { paint, probe, at } = useImageDisplay(image.src)
  if (!paint) return <ReferencePlate image={image} kind={kind} />
  return (
    <img
      className="tb-lightbox-pic"
      src={at}
      alt={image.alt ?? image.name ?? ''}
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => noteImageLoaded(image.src)}
      onError={() => noteImageFailed(image.src)}
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
  onPromote,
  onClose,
}: {
  state: LightboxState
  onIndex: (next: number) => void
  /** move this picture to index 0 — the whole of what "primary" means */
  onPromote: (index: number) => void
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
          <Dimensions image={image} />
          <span className="tb-lightbox-of">
            {index + 1} / {images.length}
          </span>
          {/* WHERE A MOUSE-ONLY READER LEARNS THE RULE. On the first
              picture it is a statement; on any other it is the button
              that makes the statement true — and that button is a
              move-to-index-0 and nothing else, so order stays the only
              thing that decides. (§3) */}
          {index === 0 ? (
            <span className="tb-lightbox-primary">The one that shows</span>
          ) : (
            <button
              type="button"
              className="tb-lightbox-promote"
              title="Move this picture to the front of the strip — the first one is the one that shows"
              onClick={() => onPromote(index)}
            >
              Make this the one that shows
            </button>
          )}
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
                className={
                  'tb-lightbox-dot' +
                  (i === index ? ' tb-lightbox-dot-on' : '') +
                  (i === 0 ? ' tb-lightbox-dot-first' : '')
                }
                aria-label={`Picture ${i + 1}${i === 0 ? ' — the one that shows' : ''}`}
                aria-current={i === index}
                title={imageLabel(img) + (i === 0 ? ' — the one that shows' : '')}
                onClick={() => onIndex(i)}
              >
                <ThumbDot img={img} kind={kind} />
                {i === 0 && <span className="tb-imgmark" aria-hidden="true" />}
              </button>
            ))}
          </footer>
        )}

      </div>
    </div>,
    document.body,
  )
}

/** HOW BIG THE PHOTOGRAPH IS — the ORIGINAL's size, never the copy's.
 *
 *  `ImageRef.w/h` is filled in when a person adds a file, because
 *  `readImageFiles` measures what they chose. A seeded picture has
 *  neither: the workbook gave an address and nothing else, so this
 *  caption was blank on every one of the catalogue's photographs.
 *
 *  It is not blank now, because `tools/seed/fetch_images.py` opened
 *  each one and wrote down what it found. What is printed is the
 *  MAKER'S file — 1920 × 1440 — and not the downscaled copy this app
 *  actually draws, for the same reason the plate names the maker's
 *  host: the record is about the photograph, and the copy is only how
 *  we are showing it. The row's own value still wins where it has one.
 */
function Dimensions({ image }: { image: ImageRef }): JSX.Element | null {
  const held = seededCopy(image.src)
  const w = image.w ?? held?.w
  const h = image.h ?? held?.h
  if (!w || !h) return null
  return (
    <span className="tb-lightbox-dim" aria-hidden="true">
      {w} × {h}
    </span>
  )
}

/** The 30px mark in the plate's footer. Same verdict, same module —
 *  a picture that is a plate in the strip is a plate here too. */
function ThumbDot({ img, kind }: { img: ImageRef; kind?: TableKind }): JSX.Element {
  const { paint, probe, at } = useImageDisplay(img.src)
  if (!paint) {
    return (
      <span className="tb-imgmiss" aria-hidden="true">
        <KindMark kind={kind} size={ICON_SIZE.tiny} />
      </span>
    )
  }
  return (
    <img
      src={at}
      alt=""
      draggable={false}
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}
