# The catalogue's photographs, and where each one is

*Measured 2026-08-27. Every number here is read out of
`tools/seed/extracts/images.json`, which `tools/seed/fetch_images.py` wrote
from the wire; none of it is typed.*

The seed carries **453 distinct image addresses** across its picture
cells. This is the state of every one of them.

| | count | bytes |
|---|---:|---:|
| **held** — a copy under `public/seed-images` | 220 | 9,141,262 |
| &nbsp;&nbsp;· taken from the manufacturer's own host | 108 | |
| &nbsp;&nbsp;· taken from the dealership's mirror of that same address | 112 | |
| **refused** — asked, and the answer is recorded | 6 | |
| **unmeasured** — nobody has asked yet | 227 | |

The app draws a held address from our own origin. A refused one and an
unmeasured one take the identical path: the row keeps the manufacturer's
address, and the surface says **"Held as a link"** — with the measured reason
where there is one. Nothing is ever substituted, and that is the whole point of
this file existing.

## What changed, and what it cost

112 addresses moved from *refused* or *unmeasured* into *held*: 70 of the 76
that a previous run had asked for and been refused, and 42 that no run had
asked about. `public/seed-images` went from 108 files and 3,525,146 bytes to
220 files and 9,141,262 bytes.

Those bytes are **static assets, not bundle**. Vite copies `public/` verbatim;
the built JS contains zero inlined image data (`grep -c "data:image/webp"` over
both chunks returns 0). What did grow is the address→filename list that rides
in the entry chunk, by **+21.4 kB raw / +4.0 kB gzipped** (1,696.83 → 1,718.23
kB raw, 506.77 → 510.81 kB gzipped), which is 112 more short strings.

## Where the 112 came from, and why it is addressing rather than guessing

`www.northsidemarine.com.au` answers 403 from Cloudflare with
`Cf-Mitigated: challenge` to a plain client exactly as it does to a browser.
That is the site telling us not to, and no bot protection was worked around.

The dealership had already hit that wall and already solved it. Its own
remediation run — `HelmLogic/scripts/mpf/remediate-images.py`, and the
motor-only `mirror-motor-images.py` beside it — copied every picture it
recovered into the app's Storage bucket under a name computed from **the
original address**:

```
mpf-mirror/{folder}/{sha1(url).hexdigest()[:16]}.{ext}

remediate-images.py:170   h = hashlib.sha1(url.encode()).hexdigest()[:16]
remediate-images.py:180   name = f"mpf-mirror/{folder}/{h}.{ext}"
remediate-images.py:67    BUCKET = studio-2290360004-3b963.firebasestorage.app
```

`folder` is `dfo` for site-hosted pictures and `motors` for the Yamaha CDN.
Hulls and trailers do **not** have a scheme of their own — every non-motor
picture the run recovered went to `dfo`, and the 209 objects in the bucket
divide 164 `dfo` / 45 `motors`, which is exactly the split
`remediate-images.py`'s own docstring predicts.

**The object's name is a function of the address the workbook typed.** So each
row's photograph was asked for by name, arithmetically, from that row's own
address. The bucket was never searched for "a picture that looks like this
boat" — that is the substitution IMAGE_SPEC.md §6.6 exists to forbid, and it is
the one outcome worse than a missing picture. A wrong photograph cannot arrive
by this path without a SHA-1 preimage collision.

Of the 209 objects in the mirror, 148 are keyed by an address this seed
carries; the other 61 are keyed by addresses it does not, and nothing was done
with them — an object we cannot tie to one of our own rows is not a picture we
have any business showing. 36 of the 148 we already held from the
manufacturer's own host and did not need. That leaves the 112.

### The second check, which does not depend on trusting the mirror

A WordPress derivative address states its own pixel size in its filename —
`620F-1024x683.jpg`. That is a fact asserted by the workbook, so mirrored bytes
have to agree with it or they do not land (`declared_size` in
`fetch_images.py`). **51 of the 70 refused addresses made that claim, and 51 of
51 agreed. Zero disagreed.**

The check is applied to the mirror path and to nothing else, deliberately: a
picture fetched from its own address is self-identifying, and one fetched from
somewhere else has to prove it.

### What was not done

No credential was used. `HelmLogic/storage.rules` grants `allow read, write`
with no condition, so this is one plain unauthenticated GET per object; it was
verified with a GET rather than taken on trust. **Nothing was written to that
bucket**, no script in `HelmLogic/scripts/` was run, and **no Firestore
document was read** — the mirror is addressed arithmetically, so the database
that maps rows to pictures was never touched. Business data still comes from
the workbooks and only from the workbooks.

Provenance is recorded per entry in `extracts/images.json`: `via: mpf-mirror`,
`mirror` (the object name), `mirrorKey` (the sha1). The chain is re-checkable
by anyone holding this repository.

## Every address, by host

| host | in the seed | held | of which via mirror | refused | unmeasured |
|---|---:|---:|---:|---:|---:|
| `adventure.highfieldboats.com` | 12 | 3 | 0 | 0 | 9 |
| `app.jeanneau.com` | 4 | 4 | 0 | 0 | 0 |
| `dunbier.com` | 2 | 2 | 0 | 0 | 0 |
| `mayfairmarine.com.au` | 17 | 11 | 0 | 0 | 6 |
| `northsidemarine1.sharepoint.com` | 4 | 0 | 0 | 4 | 0 |
| `stabicraft.com` | 1 | 0 | 0 | 0 | 1 |
| `www.formosamarineboats.com.au` | 17 | 14 | 0 | 0 | 3 |
| `www.gfabtrailers.com.au` | 7 | 3 | 0 | 0 | 4 |
| `www.highfieldboats.com` | 200 | 17 | 0 | 0 | 183 |
| `www.northsidemarine.com.au` | 106 | 103 | 103 | 1 | 2 |
| `www.stacer.com.au` | 37 | 17 | 0 | 1 | 19 |
| `www.surteesboats.com` | 1 | 1 | 0 | 0 | 0 |
| `www.yamaha-motor.com.au` | 45 | 45 | 9 | 0 | 0 |

## The 6 that are still refused, per address

These keep their address and say "Held as a link". That is honest, and it is
not a failure.

| address | the measured reason |
|---|---|
| `https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared%20Documents/General/Master%20Price%20File/Originals/Images/Dunbier/Dunbier-Logo.jpg` | northsidemarine1.sharepoint.com needs a sign-in to read |
| `https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared%20Documents/General/Master%20Price%20File/Originals/Images/GFAB%20Trailers/GFAB-Trailer-Logo.jpg` | northsidemarine1.sharepoint.com needs a sign-in to read |
| `https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared%20Documents/General/Master%20Price%20File/Originals/Images/Mackay/Mackay-Trailers-Logo.png` | northsidemarine1.sharepoint.com needs a sign-in to read |
| `https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared%20Documents/General/Master%20Price%20File/Quote%20Sheets/Archive%20Folder/Quote%20Sheet%20Logos/Centered/Stacer%20C.png` | northsidemarine1.sharepoint.com needs a sign-in to read |
| `https://www.northsidemarine.com.au/highfield-boats/wp-content/uploads/sites/10/2025/03/Highfield-Ultralite-240-19.jpg` | northsidemarine.com.au serves its pictures to its own site only |
| `https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2024/609%20Ocean%20Ranger/609OceanRanger_PKG_2024.jpg` | stacer.com.au no longer has that picture |

The four SharePoint addresses are trailer-brand logos behind an M365 sign-in;
`remediate-images.py`'s own docstring records the same wall and the same
refusal to guess ("No equivalent public URL field exists on the referencing
docs … so DO NOT guess"). The Stacer file 404s on a host that serves seventeen
others — a dead file on a healthy site, and the fix is a corrected address in
the workbook, which is the business's and not ours. The one remaining Northside
address is one the dealership's own recovery never reached either.

## Re-running this

```bash
python tools/seed/fetch_images.py --mirror   # asks ONLY the mirror, and only
                                             # about what we do not hold; makes
                                             # no request to any third party
python tools/seed/emit_images.py             # rewrites src/demos/northsideImages.ts
```

`--mirror` is idempotent and merges: an address the mirror does not carry keeps
whatever the last run measured from its host, and one that no run has ever
asked the host about stays **out of the manifest entirely** rather than being
given a refusal nobody measured.
