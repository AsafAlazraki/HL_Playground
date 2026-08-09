# PICTURES — what the catalogue already holds, and how a person puts one in

> *"at least for highfield — there are images in the root app in firestore that
> you could pull… and study how those are done and enable and empower users to
> do that"*

Two jobs, and the second is the one that matters. The first — learn how the
root app does images — is done, and its answer is short: **it stores a bare URL
string and points a native `<img>` at it.** No image object, no primary flag, no
alt text, no thumbnails, no server-side processing, no delete. Everything else
in that codebase is scaffolding around one string.

The second job is to make our picture column something a person can load real
pictures into and see them. This spec decides that.

Every number below is measured. Where something was inferred rather than
observed, it says **not verified** and you should treat it as a claim, not a
fact.

---

## 1. CAN WE SHOW THE ROOT APP'S PICTURES?

**Yes for the bytes. No for the list. And for Highfield the question is
largely moot, because we already hold the same addresses.**

### 1.1 The bytes are public

`C:/Users/AsafA/HelmLogic/storage.rules` is ten lines and says
`match /{allPaths=**} { allow read, write; }` with no condition. Two independent
studies verified the consequence anonymously, with no Authorization header and
no SDK:

| probe | result |
|---|---|
| a `mpf-mirror/motors/…jpg` download URL | `200`, `image/jpeg`, 17,062 bytes |
| the same URL with `&token=…` **stripped** | `200`, `image/jpeg`, real bytes |
| a `mpf-mirror/dfo/…jpg` download URL | `200`, `image/jpeg`, 77,323 bytes |
| the bucket **list** endpoint, `?prefix=&delimiter=/` | `200`, JSON, `Access-Control-Allow-Origin: *` |
| the same download URL in an `<img>` from `http://localhost:5090` | **painted**, 800×600 and 1024×683 |

The token is not a credential on that bucket. The bucket is also anonymously
**writable** — see §6.5.

### 1.2 The list is not public

`firestore.rules:485-487` reads `allow read, write: if isSignedIn()` recursively
over the whole `data-warehouse` tree. The image *URLs* live on Firestore
documents. **Enumerating them live requires authentication, and authentication
is out of scope by rule 3** — the only credentials in that repo are a named
employee's plaintext password sitting as a module constant in
`C:/Users/AsafA/HelmLogic/scripts/mpf/audit-images.py` and about a dozen of its
siblings. We did not use them, did not copy them, and will not.

There are, however, credential-free copies of the same URLs committed to that
read-only repo:

- `tasks/test-evidence/highfield-walk/fixture.json` — a 10.8 MB snapshot dated
  `2026-07-04`, vendor Highfield, 7 ranges / 85 models / 640 variants, carrying
  `coverImageUrl`, `imageUrl` and `galleryImageUrls` verbatim.
- `tasks/test-evidence/image-remediation.json` — `classes.nsm403.mirrors`, a
  164-entry map from each blocked `www.northsidemarine.com.au` URL to its
  Firebase Storage mirror, plus a 7-entry `classes.yamaha.mirrors`.
- `tasks/mpf-audit/apply-log-images.jsonl` — `{before, after}` pairs for the
  same rewrite.

Whether the live database still matches those snapshots is **not verified**.

### 1.3 For Highfield we do not need any of it

Our own seed already carries the Highfield photographs, on the manufacturer's
own hosts. The Highfield table has 40 rows; 37 carry a photo link; **33 of those
37 are on `highfieldboats.com` and load.** Only 4 are on the blocked dealer
host. Measured from `http://localhost:5090` with a real `<img>`:

| host | in `northside.ts` (lines carrying it) | image cells | `<img>` from our origin |
|---|---|---|---|
| `www.highfieldboats.com` | 20 (with `media.`/`adventure.`: +3) | 30 | **paints** 2560×1440 |
| `adventure.highfieldboats.com` | — | 3 | **paints** 2560×1440 |
| `www.yamaha-motor.com.au` | — | 43 | **paints** 800×600 |
| `mayfairmarine.com.au` | — | 33 | **paints** 1800×716 |
| `www.stacer.com.au` | — | 20 | **paints** 3000×2000 |
| `www.formosamarineboats.com.au` | — | 15 | **paints** 1920×1440 |
| `app.jeanneau.com` | — | 4 | **paints** |
| `dunbier.com` | — | 3 | **paints** 2560×1517 |
| `www.gfabtrailers.com.au` | — | 3 | **paints** |
| `www.surteesboats.com` | — | 1 | **paints** |
| `www.northsidemarine.com.au` | 71 | 93 | **blocked** |
| `northsidemarine1.sharepoint.com` | 4 | 57 | **blocked** |

Summing the per-host cell counts gives **155 of 305 cells paint today**. The
study that produced the table states 150 in its summary line; the five-cell
difference is unexplained and **not verified**. Either way it is roughly half
the catalogue, and it is the *whole* of Highfield bar four rows.

Two corrections to the standing assumption in the codebase: the seed's links are
**not** predominantly `northsidemarine.com.au` (that host is 93 of 305 cells),
and the Highfield photographs are on the **manufacturer's** site, not the
dealer's.

### 1.4 Why the two blocked hosts are different, and why the gate exists

`www.northsidemarine.com.au` returns `403 Forbidden` from Cloudflare with
`Cf-Mitigated: challenge` **and `Cross-Origin-Resource-Policy: same-origin`** on
the challenge page. That CORP header is precisely what produces
`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` — a console line the page cannot catch,
cannot handle and cannot apologise for. `northsidemarine1.sharepoint.com` is an
M365 auth wall and cannot be fixed from a browser at all. **The original reason
`isPaintable()` exists is real and stays honoured.**

What is wrong with `isPaintable()` (`src/features/table/ImageCell.tsx:120-128`)
is not its purpose but its aim. It refuses every cross-origin source in order to
silence two hosts, and pays for that silence with the other ten.

### 1.5 The rule: a verdict per HOST, not per address

The failure is a property of the host, not of the picture. All 93
`northsidemarine.com.au` addresses fail for the same reason. So the decision is
taken once per host and remembered for the session, and the console cost of
being wrong is paid once instead of ninety-three times.

Move the decision out of `ImageCell.tsx` into **`src/lib/imageSources.ts`**, so
that the table, the lightbox and the view page all read the same verdict — a
picture that is a plate in the cell must not be a broken glyph on the page that
sells the boat.

**Sources that never need a verdict.** A `data:image/` source and a `blob:`
source are pixels we already hold; a same-origin source cannot be refused
cross-origin. All three are open, always, with no request beyond the paint
itself. Note the tightening: `data:` alone is not enough, it must be
`data:image/`. Any other scheme — `file:`, `javascript:`, `data:text/html` — is
**closed permanently and never requested**. `ImageRef.src` goes straight into an
`<img src>`, and that is the one place untrusted content enters our DOM.

**Everything else is `http:`/`https:` and gets a host verdict**, which is one of
four states: `unknown`, `probing`, `open`, `closed`.

- The **probe is not an extra download**. The first thumbnail rendered on an
  unknown host claims the probe and is drawn as a real `<img>`, eagerly. Its
  `load` opens the host; its `error` counts against it. Every other picture on
  that host stays a reference plate until the verdict lands.
- **Two claimants before a host is condemned.** A single failure could be one
  dead file on a healthy host; two failures on two distinct addresses is a host.
  If the host offers only one distinct address and it fails, the host is closed
  — a host with one picture that will not load is a host with no pictures.
- `open` → every picture on it paints. An individual address that then fails
  still degrades on its own, through the existing per-source `broken` Set
  (`ImageCell.tsx:133`), which moves into the same module.
- `closed` → every picture on it is a reference plate, no request made, for the
  rest of the session.
- **Nothing is persisted.** A host that is down for ten minutes must not be
  condemned forever inside somebody's IndexedDB. A reload re-probes.
- A picture the user has just added is probed immediately, so the cell answers
  within one round trip rather than staying a plate until something else moves.

**The guarantee this buys: at most two uncatchable console lines per host per
session, and none at all for a host that works.** On today's seed that predicts
**four lines** for the whole 305-cell catalogue — two probes each for
`northsidemarine.com.au` and `northsidemarine1.sharepoint.com` — against 150 if
the gate were simply relaxed, and against the "seventy-odd per sheet" the
current file header describes. That prediction follows from the measured
per-host verdicts; **it is not verified in the running app** and is the first
thing to check once the change is in.

### 1.6 Lazy, always

Every thumbnail that is not the host's probe carries `loading="lazy"` and
`decoding="async"`, and sits in a box of fixed pixel size so nothing reflows
when it arrives.

This is not tidiness. The grid only virtualises above **150 rows**
(`VIRTUALIZE_ABOVE`, `src/features/table/helpers.ts:78`), so the 40-row
Highfield table mounts **all forty rows at once**. Without lazy loading, drawing
forty 24-pixel squares would fetch forty full-size photographs. The measured
weights on the hosts we point at run from 84,120 bytes
(`formosamarineboats.com.au`) through 188,624 and 242,534
(`www.highfieldboats.com`) to **21,077,505 bytes** for one
`media.highfieldboats.com` cover in the root app's own catalogue — and our seed
carries three `media.`/`adventure.` links. We cannot downscale a remote picture
(§5.4), so lazy loading is the only lever we have.

### 1.7 What we still cannot show, and what to do about it

The 93 `northsidemarine.com.au` cells and the 57 SharePoint cells stay reference
plates. That is correct behaviour, not a defect: a picture we cannot fetch is
still a record of a picture, and the plate says whose address it is.

The fix for the 93 is not a client-side trick — it is the 164-entry mirror map
described in §1.2, and adopting it is a decision for the user (§6.6). The 57
SharePoint cells cannot be fixed without credentials that are not ours. **That
is a finding, not a blocker to work around.**

---

## 2. HOW A PERSON PUTS A PICTURE IN

Ranked by how somebody who has never seen the app would actually reach it.

**1 — Drop a file on the cell.** Exists and works
(`ImageCell.tsx:259-266` → `Grid.tsx:1348-1350`). Unchanged.

**2 — Paste.** The obvious missing one, and the one a clueless user reaches for
first, because the picture they want is on a supplier's website and the two
things they know how to do are *Copy image* and *Copy image address*. Today both
are silent no-ops: `Grid.tsx:790-805` reads only `text/plain` and returns early
when it is empty, and block paste skips image columns entirely
(`useSheetCommands.ts:557-560`).

Ctrl+V on a selected picture cell, with no editor open, now reads the clipboard
in this order:

- **An image among `clipboardData.files` or `items`** → the same path as a drop.
  Pixels we hold.
- **Text that parses as one or more `http`/`https` addresses, one per line** →
  each becomes an `ImageRef` whose `src` is the address and whose `name` is the
  last path segment, appended in the order pasted. **No fetch, no HEAD check, no
  validation beyond the scheme.** Whether it paints is the host verdict's
  business, not the paste's.
- **Anything else** → the existing refusal sentence, reworded to name both doors:
  *"Pictures holds pictures. Drop image files on it, or paste a web address."*
  (`core/coerce.ts:181-188`, `useSheetCommands.ts:287-292`.)

**Block paste keeps skipping picture columns.** A forty-column paste must never
scatter addresses into photographs; only a paste onto a single selected picture
cell adds pictures. The existing `N pictures` line in the paste summary
(`useSheetCommands.ts:590`) stays, because silence is what made this invisible.

**3 — The `+` plate, and every other way in.** Today `+`, double-click and Enter
all jump straight to the operating system's file chooser
(`Grid.tsx:559-571, 726-741, 769-776, 1337`). That is a dead end for the person
holding a link rather than a file. All four now open **one small popover**, and
the file chooser is the first thing inside it.

```
┌─ ADD PICTURES ───────────────────────────────┐
│                                              │
│   ⌷  Choose files from this computer         │   ← focused on open
│      OR DROP THEM STRAIGHT ONTO THE CELL     │   ← mono micro-label
│  ──────────────────────────────────────────  │   ← hairline
│      PASTE A WEB ADDRESS                     │   ← mono micro-label
│   [                                        ] │
│      Right-click a picture on a website,     │
│      choose Copy image address, and paste    │
│      it here. Several, one per line, are     │
│      added in the order you paste them.      │
│                                              │
│                              [ Add ]         │
└──────────────────────────────────────────────┘
```

The chrome is the repo's own: `Popover` (`src/features/table/Popover.tsx`)
anchored to the control's `DOMRect`, ~300px wide, `--paper-high` on a 1px
`--hairline`, `.mono-label` for the two captions, `.field-input` for the box.
Two Phosphor marks at 16px `light` — `FolderOpen` for the file door,
`LinkSimple` for the address door. **No Instrument Serif anywhere in it**: this
is chrome, and the display face is reserved for ≥22px moments. No emoji, no
illustration, no third option.

The helper line is an **instruction**, not a specimen address. Nothing in this
popover may show an example URL, because an example URL in a catalogue tool is
indistinguishable from a real one.

The cost is honest and worth stating: reaching the file chooser is now two
keystrokes (Enter, then Enter on the focused button) instead of one. We pay it
because the person holding a link currently has no door at all.

Double-clicking a **thumbnail** still opens the picture, not the popover
(`ImageCell.tsx:349-356`); double-clicking the cell's empty space opens the
popover. Selecting a cell and pressing Enter opens the popover.

**4 — Alt text, since we are here.** `ImageRef.alt` has existed since the type
was written (`src/types/model.ts:60`) and is read in two places
(`ImageCell.tsx:193, 453`); **nothing has ever written it.** One single-line
`.field-input` under the picture in the lightbox, captioned `WHAT IT SHOWS`,
closes that. It is optional, it is never invented on the user's behalf, and it
is the only new field this spec adds.

---

## 3. PRIMARY IS THE FIRST ONE, AND IT SAYS SO

The contract is already right and does not change: `ImageRef[]`, index 0 is the
primary, `primaryImage()` reads it, and dragging a picture to the front *is*
promoting it. There is no flag to fall out of sync
(`src/types/model.ts:44-61, 125-127`).

What is missing is that the rule is implied rather than stated. The cell is
24 pixels tall and the file's own header forbids changing the row height, so the
cell cannot explain itself. Explanation goes where there is room.

**In the strip.** The first slot is the only one drawn with a solid ink
hairline; every other slot keeps the lighter frame. The existing corner tick
(`.tb-imgmark`, `table.css`) stays and is now the second signal, not the only
one. While a picture is being dragged inside the cell, the left edge of the
strip shows a drop marker, so *"the front"* is a visible place to aim at rather
than an abstraction.

**In the words that already exist.** The per-thumb `title` already says
*"drag it to the front to make it the one that shows"* — it is correct and
stays.

**In the lightbox, which is where a mouse-only user gets a button.** The header
counter (`ImageCell.tsx:532-534`) becomes explicit:

- on picture 1, a mono stamp: `THE ONE THAT SHOWS`
- on every other picture, a button: `MAKE THIS THE ONE THAT SHOWS`

That button is a move-to-index-0 and nothing else. It reorders, exactly as the
drag does, so the contract stays single-mechanism: **order is the only thing
that decides.** There is no promote flag, no star, no second way to be wrong.

**And in the consequence, which is the real teacher.** §4 puts the first picture
on the page that sells the boat. Reorder the strip, and the photograph on the
boat's page changes. Nothing explains "primary" better than watching it happen.

---

## 4. WHERE PICTURES APPEAR BEYOND THE CELL

Today `src/features/views/` contains **no `<img>` at all** — 15 files, 4,591
lines, and the only image-aware code erases images: `SHOWABLE`
(`views/columns.ts:103`) excludes `'image'` so a picture column can never be
chosen for a page, and `formatCell` (`views/columns.ts:162`) renders an image
cell as **the bare numeral `1`**. The Highfield SP560 page shows the boat's
name, its HP envelope and up to five numbers. The 2560×1440 photograph that
exists, is linked, and *loads*, is not on it.

Two placements, both measured against the existing layout at 1280 wide, where
`.vw-sheet` is `max-width: 940px`.

### 4.1 The subject header — one plate, left of the name

```
┌────────────────────────────────────────────────── ⚙ ──┐
│  ┌──────────┐   ▾ HIGHFIELD ▸ Sport Series            │
│  │          │   SPORT 560                             │
│  │  120×90  │   5.66 m · 581 kg · 90–115 HP           │
│  └──────────┘                                         │
```

`.vw-head` is a flex row with `align-items: flex-start` and `gap: var(--sp-5)`,
holding `.vw-head-id` (`flex: 1 1 auto; min-width: 0`) and the ⚙ button. The
picture becomes a new `flex: none` item **before** `.vw-head-id`, drawn at
**120 × 90** (4:3, `object-fit: cover`) on a 1px `--hairline` with the sheet's
own `--radius`.

The size is chosen so the picture can never drive the header's height. The
identity block measures roughly trail (~14px) + `--sp-2` + name (38px Instrument
Serif at `line-height: 1.05` ≈ 40px) + the spec strip (~34px) ≈ 100–110px. At
90px the plate is shorter than the text beside it, so **the header's height is
still set by the words**, exactly as it is today. Horizontally it takes 120px
plus one `--sp-5` from a 940px sheet that also carries a ~80px gear button,
leaving roughly 700px for the name — which wraps rather than truncates.

The picture is `primaryImage()` of the **first `image`-typed field on the root
table, in column order**. Not a member of `block.columns`: pictures are excluded
from `SHOWABLE`, there is no writer for `ViewBlock.columns` anywhere in the
codebase, and a photograph is the row's *mark*, not one of its numbers.

**If there is no picture, or the host verdict is `closed`, there is no plate at
all** — the header renders exactly as it does today. This is a deliberate
divergence from the cell. In the table a reference plate says *there is a record
here you may want to fix*; on the page you put in front of a customer there is
nothing to fix, and a hatched rectangle is noise. Read mode stays clean, which
is the whole of `VIEW_SPEC.md`.

### 4.2 A block row — one 24px mark, in a track that costs nothing

```
│ ┌───────────────────────────────────────────────┐ │
│ │ MOTORS          6 fit · 1 removed · 1 added   │ │
│ │  ▣  Yamaha F90XB      90 HP   XL   $14,190    │ │
│ │  ▣  Yamaha F115XB    115 HP   XL   $17,640    │ │
│ └───────────────────────────────────────────────┘ │
```

`.vw-row-line` is a CSS grid (`views.css:402-422`) with `min-height: 34px` and
`5px` of padding top and bottom. `box-sizing: border-box` is global
(`src/styles/base.css:9`), so **the content box is exactly 24px** — the same
24px as `.tb-imgslot`. The mark fits with nothing to spare and nothing to
change.

Add one leading track, `var(--vw-pic)`, ahead of the name. It is set on the
block alongside the four that already exist (`BlockCard.tsx:333-338`): `24px`
when the related table has an `image` column, `0px` when it does not — the same
costs-nothing-when-unused pattern as `--vw-tags`. `.vw-cols`, the header strip,
uses the same template and gets the same track with an empty span: there is no
word above a photograph.

Row height is unchanged. Horizontal safety is guaranteed by the template's own
argument, quoted in its comment: the name track has a floor of
`clamp(96px, 22%, 190px)` and the value tracks are `minmax(44px, 104px)`, so the
24px + `--sp-3` comes out of the value tracks first and the name never
collapses.

Per row: `primaryImage()` of the target table's first `image` field. A row with
no picture, or on a closed host, leaves the track blank — the track is a
property of the block, not of the row, or the rows would stop aligning.

Nested blocks (`.vw-nest`) follow the same rule at the same size.

### 4.3 Read-only, in both places

The view page never edits a picture. No `+`, no ✕, no reorder, not even in
configure mode. Pictures are edited in the table, in one place, and the page
shows the result. Configure mode is for deciding *what goes with this boat*, and
a photograph is not a member of that argument.

### 4.4 One correction on the way past

`formatCell` (`views/columns.ts:162`) stops returning `${value.length}` for an
image value and returns `''`. Nothing reaches it today because `SHOWABLE`
excludes images, but a page that ever prints the numeral `1` where a customer
expects a photograph is a bug waiting for its opportunity.

---

## 5. WHAT PICTURES COST, AND THE POLICY THAT FOLLOWS

### 5.1 The measurements

Taken from the live app with `navigator.storage.estimate()` and by serialising
the store:

| | |
|---|---|
| all 651 rows, as JSON | **453,655 characters** |
| all 305 `src` strings together | **37,857 bytes** — because they are addresses |
| total origin usage | **1.88 MB** |
| quota | **6.20 GB** |

An address costs about 124 bytes. That is the entire reason the catalogue's
imagery is currently free.

Against that, `readImageFiles` (`ImageCell.tsx:89-104`) does **no downscaling
and no re-encoding**: a chosen file is stored as `ceil(bytes / 3) × 4`
characters of base64. At the ~1 MB typical of a 2560×1440 JPEG that is ~1.4 MB
per row, and **~55 MB for 40 Highfield rows** — about **120× today's 454 KB**.
Dexie stores JavaScript strings as UTF-16, so the on-disk figure is roughly
double the character count again. The per-file byte weights here are arithmetic
from a stated typical size; the specific files a user might choose are
**not verified**.

And that 55 MB is not written once. `repository.saveAll`
(`src/db/repository.ts:49-72`) **clears every table and `bulkPut`s the entire
project**, scheduled on a 400 ms debounce after any mutation at all
(`src/store/useProjectStore.ts:182-190`). Rename a column and the whole thing is
deleted and rewritten through a structured clone. Held bytes are not stored
once; they are re-stored continuously.

### 5.2 The policy

**An address is the preferred form of a picture. We never fetch a reachable
picture in order to hold its bytes.** A pasted or typed address is stored
exactly as pasted, at ~124 bytes, and the host verdict decides whether it
paints. That is why the whole seed's imagery costs 37,857 bytes and why it
should stay that way.

**Bytes are held only when the user chose a local file**, because in that case
there is no other copy of it and an address does not exist.

**A held file is downscaled on ingest.** Longest edge 1600px, JPEG at quality
0.82, through a canvas — legal here because a chosen file is `data:`/`blob:` and
therefore never taints. The original's natural `w`/`h` are still recorded on the
`ImageRef`, so the lightbox caption keeps printing the true dimensions. The
expected saving is 3–7× against the current path; the resulting byte size of a
1600px JPEG is an **estimate, not measured**, and should be measured on the
first real file rather than asserted.

**A visible ceiling, refused before it is spent.** Held bytes across the project
are capped at **64 MB**, and the file that would cross it is refused with a
sentence naming the number. The ceiling is justified by the 400 ms full-project
rewrite in §5.1, not by the 6.20 GB quota — the rewrite is what starts hurting,
and it starts hurting long before the quota does. **Fixing that rewrite is a
separate piece of work and is out of scope here** (§6.8).

### 5.3 Export and import

Export (`ImportExportMenu.tsx:59-80`) already writes `rowsByEntity` verbatim
through `JSON.stringify(payload, null, 2)`, so an `ImageRef[]` leaves complete,
`src` and all. That stays: a project file that silently loses its pictures is
worse than a large one. The menu states the resulting size before it writes,
because a 55 MB download should not be a surprise.

Import is the sharpest defect in the audit and must be fixed here.
`envelope.ts:80-81` declares a guard named `isCellValue` that accepts
`null | string | number | boolean` — **arrays are not accepted** — and
`envelope.ts:606` uses it to filter every incoming cell. Every picture cell
fails the test and is **silently dropped**: no error, no warning, no count. A
55 MB file survives the round trip and then throws its pictures away without a
word. The type is even self-contradictory: `CellValue` (`model.ts:120`)
explicitly includes `ImageRef[]`.

`isCellValue` must accept a **validated** `ImageRef[]`: an array whose every
element is an object with a string `id` and a string `src`, optional string
`name`/`alt`, optional finite numeric `w`/`h`, with a cap on element count and
on `src` length. The `src` scheme allow-list is the one from §1.5 —
`data:image/`, `http:`, `https:` — and nothing else. `blob:` is rejected on
import specifically: a blob URL from another session points at nothing.

**Anything rejected is counted and reported in the import summary.** Silence is
the actual bug; dropping a malformed picture is fine, dropping it quietly is
not.

`FieldDef.defaultValue` (`envelope.ts:522`) keeps rejecting arrays, but on
purpose rather than by accident: a column whose default is a photograph is
meaningless.

### 5.4 Why we cannot simply localise the remote ones

The Firebase Storage download endpoint sends **no `Access-Control-Allow-Origin`**
on the GET. (The preflight `OPTIONS` does, which is misleading; the GET is what
counts. `cors.json` exists in the root repo declaring `origin: ["*"]`, and the
live response proves it is not applied to that path — whether it was ever
deployed is **not verified**.) The consequence is exact: Storage pictures
**taint the canvas**, `toDataURL` raises `SecurityError`, and adding
`crossOrigin="anonymous"` makes the `<img>` fail outright.

So for Storage-hosted pictures we can display and nothing else — no thumbnail,
no downscale, no local copy. `*.highfieldboats.com` and
`formosamarineboats.com.au` *are* fully open (`ACAO: *`, canvas-readable, one
round-tripped to a `data:` URL in-browser during the study), so the full
pipeline is technically available there — and we still will not use it, because
holding bytes we could have addressed is exactly the trade §5.2 refuses.

---

## 6. WHAT WE WILL NOT DO

Each of these is a decision, and the first two are decisions for the user rather
than for us.

**6.1 We will not authenticate to Firebase.** Several files under
`C:/Users/AsafA/HelmLogic/scripts/` carry a Firebase project id, a web API key
and a named employee's plaintext password as module constants. They were not
used, not copied into any file, and are not reproduced anywhere in this repo.
The consequence is concrete: **we cannot enumerate the root app's image URLs
live**, because `firestore.rules:485-487` gates every read behind `isSignedIn()`.
If a live read is wanted, it needs a credential that is the user's to issue —
and those constants should be rotated regardless of what we do next.

**6.2 We will not write anything under `C:/Users/AsafA/HelmLogic`.** Read it,
quote it, learn from it. No writes, no git, no running its scripts.

**6.3 We will not build a proxy, a server route or an image-preload layer.** The
root app has `src/app/api/image-proxy/route.ts` and `src/lib/image-preload.ts`
with a host allow-list, a 10 MB cap, a spoofed `Referer` and CORS re-emission —
an apparatus that exists **only because `@react-pdf` needs CORS-readable bytes
inside a PDF iframe**. The file's own header comment says the URLs work "fine in
a browser `<img>` tag". A plain `<img>` needs none of it, and we are a
local-first Vite app with no server to put one on.

**6.4 We will not route pictures through `images.weserv.nl`.** The root app's
audit, dated 2026-07-03, records that a `northsidemarine.com.au` URL returning
403 to a direct probe returned `200 image/png` through weserv. Tried again from
our origin, weserv returned `404 application/json` and then
`ERR_BLOCKED_BY_ORB`. The claim is stale as measured today. Beyond that it hands
a third party every catalogue address we hold, for a resize we do not need.
Whether it still works for hosts other than Northside is **not verified**.

**6.5 We will not upload anything to the root app's Storage bucket.** It is
anonymously writable — `storage.rules` is `allow read, write` with no condition,
which is also why the mirror URLs serve with the token stripped. Mirroring our
pictures there would be technically trivial, would write into a production
system that is not ours, and would deepen a security defect rather than use one.
**Report it; do not use it.** We did not test writing.

**6.6 We will not quietly adopt the mirror map.** The 164-entry
`nsm403.mirrors` object in `tasks/test-evidence/image-remediation.json` is real
and covers most of what our seed needs — 6 of 7 sampled seed addresses had a
mirror, and three of those mirrors painted from `localhost:5090` at 1200×800,
1024×575 and 1024×683. The one that did **not** have a mirror was the Highfield
one. Adopting it means copying real values into `src/demos/northside.ts`, which
is generated, 276 KB, and must never be edited by hand or by a shell tool — it
would be a regeneration through `tools/seed`, from the workbook plus the map.
That is a decision for the user, and if it is taken, **every substituted address
must be recorded as a substitution.** The root app's own history is the warning:
`scripts/fix-classic-cover-images.py:29-37` writes a CL400 photograph onto CL380
with the comment "same hull family", nothing in the schema records that it is a
stand-in, and it will be shown to a customer on a quote as that boat.

**6.7 We will not add `crossOrigin` to any thumbnail, and will not attempt
canvas work on a remote picture.** Both convert a working picture into a broken
one on every host that serves without `Access-Control-Allow-Origin` — which
includes the entire Firebase Storage mirror (§5.4).

**6.8 We will not fix the save path here.** `repository.saveAll` clearing and
rewriting the whole project every 400 ms is the thing that makes held bytes
expensive, and it is a storage-layer change with its own risks. This spec
mitigates it with a ceiling (§5.2) and names it as the next piece of work.

**6.9 We will not persist a host verdict.** Session-scoped only. A host that was
down once must not be dead forever in somebody's browser.

**6.10 We will not invent a single address, filename, model code or photograph.**
Every URL in this document was read from the workbook-derived seed or from a
committed evidence file in the read-only repo, and every placeholder in the new
UI is an instruction, never a specimen.

---

## Definition of done

Open the Highfield table. Thirty-three of its thirty-seven photographs are
visible as thumbnails, the four dealer-hosted ones are reference plates, and the
console carries at most four lines for the whole board. Drag the third picture
in a row to the front, open the boat's page, and the photograph at the top of it
is the one you just moved. Copy an image address from a supplier's website,
select a picture cell, press Ctrl+V, and it is there. Export the project, import
it back, and every picture survives — or the summary says, in a number, exactly
how many did not.

And the page you end on is still one you would put in front of a customer.
