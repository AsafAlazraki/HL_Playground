"""Emit src/demos/northsideImages.ts from tools/seed/extracts/images.json.

Called by emit.py, so `python tools/seed/emit.py` writes both generated files.
Needs no network and no workbooks: the measurement is committed in the extract,
exactly as every other stage-two input is.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from gen_lib import ts_str

MANIFEST = HERE / "extracts" / "images.json"
OUT = HERE.parent.parent / "src" / "demos" / "northsideImages.ts"

HEADER = '''/* ============================================================
   demos/northsideImages — WHERE EACH PHOTOGRAPH ACTUALLY IS.

   GENERATED. Do not edit. `python tools/seed/fetch_images.py` takes
   the measurement and writes the pictures; `python tools/seed/emit.py`
   writes this file from it.

   WHAT PROBLEM THIS SOLVES. The catalogue's photographs are addresses
   on eleven manufacturers' web servers, and until now the app fetched
   every one of them, live, from whatever wifi it was standing on. Some
   of those hosts can never answer a browser at all. The rest can be
   slow, can be down, and are not ours: the module page's whole visual
   argument was rented from somebody else's uptime.

   So each one was fetched ONCE, here, downscaled to what this app can
   actually draw, and committed under `public/seed-images`. The app now
   paints from its own origin. No network, no cross-origin refusal, no
   waiting.

   WHERE THE HARD ONES CAME FROM, AND WHY IT IS NOT A GUESS.
   `www.northsidemarine.com.au` answers Cloudflare's challenge to us and
   to a browser alike, so 71 addresses could not be taken from it at all.
   The dealership had already hit that same wall and already solved it:
   its own remediation run copied every picture it recovered into its
   Storage bucket under a name computed from THE ORIGINAL ADDRESS —
   `mpf-mirror/{folder}/{sha1(url)[:16]}.{ext}`
   (`HelmLogic/scripts/mpf/remediate-images.py:170,180`). So the copy of
   a given row's photograph can be ASKED FOR BY NAME, arithmetically,
   from the address the workbook typed for that row. Nothing is searched
   for, nothing is matched by resemblance, and a wrong photograph cannot
   arrive by that path. Each one also had to agree with the pixel size
   its own address declares before it was allowed to land. Which
   addresses came that way is in `tools/seed/extracts/images.json` under
   `via: mpf-mirror`, with the object name and the key beside it.

   WHAT IS NOT CHANGED, AND THIS IS THE POINT.

   The DATA still holds the manufacturer's address. `ImageRef.src` is
   the same string it always was, the row is byte-for-byte what it was,
   the export carries the address, and a frozen quote cites the same
   place. Only the DISPLAY resolves to a local copy — the identical
   split `imageSources.ts` already draws between what a record says and
   what a browser may paint. IMAGE_SPEC.md §5.2 refuses to hold bytes
   ON A ROW, and that refusal is intact: these bytes are a build
   artefact beside the app, not a value inside it.

   NOTHING IS SUBSTITUTED. A photograph that could not be fetched is
   listed in `ABSENT` with the measured reason and NOTHING ELSE — no
   stand-in, no other boat's picture, no filename dressed up as a
   caption. Those rows keep saying "Held as a link", which is true.
   IMAGE_SPEC.md §6.6, §6.10. That is still what six of these addresses
   do, and it is the right answer for them: four are behind an M365
   sign-in, one is a dead file on a healthy site, and one is the single
   Northside address the dealership's own recovery never reached either.

   THERE IS A THIRD STATE, AND IT IS NAMED RATHER THAN ROUNDED AWAY.
   `NORTHSIDE_PICTURES.unmeasured` is how many of the seed's addresses
   this measurement has never been taken for. It is not zero: the
   catalogue grew to full scale (SEED_AT_FULL_SCALE.md §2.2) and taking
   a picture requires the network and somebody's decision to make a few
   hundred requests to nine third-party servers, which is not something
   a regeneration should do on its own. An unmeasured address behaves
   EXACTLY as an address whose fetch failed: the row keeps its address,
   the app draws "Held as a link", and nothing is invented. The count
   is here so the difference between "we asked and were refused" and
   "we have not asked" stays visible to whoever reads it next.

   Clear it with `python tools/seed/fetch_images.py`, which fetches only
   what is missing.
   ============================================================ */
import { registerSeededPictures } from '@/lib/imageSources'

'''

FOOTER_TMPL = '''
/** Copies taken, addresses measured and found unavailable, and the bytes
 *  those copies weigh — counted from the manifest rather than typed, so a
 *  re-fetch cannot leave a stale number behind. */
export const NORTHSIDE_PICTURES = {{
  held: HELD.length,
  absent: {absent},
  /** Addresses in the seed with NO answer of any kind — no copy, no
   *  measured refusal, and not on a host already recorded as serving
   *  nothing. They draw as "Held as a link", exactly like a refused
   *  one; the difference is that nobody has asked yet. Clear it with
   *  `python tools/seed/fetch_images.py`. */
  unmeasured: {unmeasured},
  bytes: {bytes},
  measured: {measured},
}} as const

/** Hand the engine what shipped. Called once, from `@/demos`, which the
 *  shell imports — so the answer is in place before the first thumbnail
 *  asks for it, whether the sheet was just seeded or restored from a
 *  previous session. */
export function registerNorthsidePictures(): void {{
  registerSeededPictures(HELD, ABSENT_HOSTS, ABSENT)
}}
'''


def main(tables=None):
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    held = [r for r in m["images"] if r.get("file")]
    absent = [r for r in m["images"] if not r.get("file")]

    # WHAT THE SEED ASKS FOR, against what this measurement answers. Read from
    # the assembled tables — `emit.py` hands over the ones it is about to
    # write — so the figure can never be about a different run. Standalone,
    # it assembles them itself; that reads `extracts/`, never a workbook.
    from fetch_images import image_urls

    wanted = set(image_urls(tables))
    measured_urls = {r["url"] for r in m["images"]}
    stale = sorted(measured_urls - wanted)
    no_entry = sorted(wanted - measured_urls)

    out = [HEADER]
    out.append(
        "/** address · the copy under `public/seed-images` · the ORIGINAL's natural\n"
        " *  pixel size, which is what a person means by how big the photograph is\n"
        " *  and what the enlarged plate prints. The copy's own size is in\n"
        " *  tools/seed/extracts/images.json with the rest of the provenance.\n"
        " *\n"
        " *  A tuple rather than an object: this list rides in the entry chunk, and\n"
        " *  four key names spelt out once per picture is 3 KB of nothing.\n"
        " *\n"
        " *  EXPORTED FOR ONE READER: northsideImages.test.ts, which checks every\n"
        " *  name here against what is really in public/seed-images. Nothing that\n"
        " *  SHIPS may read it — the one door is `registerNorthsidePictures`, or\n"
        " *  two surfaces resolve the same address differently. */\n"
        "export const HELD: ReadonlyArray<readonly [string, string, number, number]> = [\n"
    )
    for r in held:
        out.append(
            f'  [{ts_str(r["url"])}, {ts_str(r["file"])}, {r["srcW"]}, {r["srcH"]}],\n'
        )
    out.append("]\n\n")

    # A HOST THAT ANSWERED NOTHING IS A FACT ABOUT THE HOST, and is written
    # down once rather than seventy-one times — smaller in the entry chunk,
    # and truer: "northsidemarine.com.au serves its pictures to its own site
    # only" is a sentence about a site, not about a file. An address on a host
    # that DOES serve is the opposite case and keeps its own entry, because
    # there the host is not the reason, and it keeps its own sentence.
    all_hosts = {}
    for r in m["images"]:
        all_hosts.setdefault(r["host"], []).append(r)
    dead_hosts = {}
    for h, group in sorted(all_hosts.items()):
        whys = {r.get("why") for r in group}
        if len(whys) == 1 and None not in whys:
            dead_hosts[h] = whys.pop()
    stray = [r for r in absent if r["host"] not in dead_hosts]

    # AN ADDRESS ON A HOST THAT ANSWERS NOTHING IS ALREADY ANSWERED.
    # `dead_hosts` is a sentence about the SITE, and the app applies it
    # to any address on that host whether or not this measurement ever
    # tried that exact file. So the count below is the addresses with no
    # answer AT ALL — the ones where a person would rightly ask "and
    # what about that one?". Today that is every unmeasured address
    # except the ones on www.northsidemarine.com.au, which is recorded
    # as serving its pictures to its own site only.
    from urllib.parse import urlsplit

    unmeasured = [u for u in no_entry if urlsplit(u).netloc not in dead_hosts]

    # COUNTED, NEVER TYPED. This sentence used to say "71 of the 76" and was
    # true when it was written; the numbers moved the day the mirror gave 70
    # of those 71 back, and a hand-typed count is exactly the kind of prose
    # that goes quietly false. It is computed now.
    shared = len(absent) - len(stray)
    out.append(
        "/** A HOST THAT ANSWERED NOTHING AT ALL, and why. Written once for the\n"
        f" *  host rather than once per address: {shared} of the {len(absent)} addresses\n"
        " *  below share one sentence, and that sentence is about the site. */\n"
        "export const ABSENT_HOSTS: ReadonlyArray<readonly [string, string]> = [\n"
    )
    for h, why in dead_hosts.items():
        out.append(f"  [{ts_str(h)}, {ts_str(why)}],\n")
    out.append("]\n\n")

    count = "One address" if len(stray) == 1 else f"{len(stray)} addresses"
    out.append(
        f"/** {count} that could not be taken on a host that otherwise\n"
        " *  serves — so the host is not the reason and cannot carry the\n"
        " *  sentence. A dead file on a healthy site: the fix is a corrected\n"
        " *  address in the workbook, which is the business's and not ours\n"
        " *  (IMAGE_SPEC.md §1.7).\n"
        " *\n"
        " *  northsidemarine.com.au is on THIS list rather than in ABSENT_HOSTS\n"
        " *  because it is no longer a host that answers nothing: every other\n"
        " *  address on it is held, each one recovered from the dealership's own\n"
        " *  mirror of that same address rather than from the site. This one the\n"
        " *  mirror never had either. */\n"
        "export const ABSENT: ReadonlyArray<readonly [string, string]> = [\n"
    )
    for r in stray:
        out.append(f'  [{ts_str(r["url"])}, {ts_str(r["why"])}],\n')
    out.append("]\n")

    out.append(
        FOOTER_TMPL.format(
            bytes=m["_meta"]["totalBytes"],
            absent=len(absent),
            unmeasured=len(unmeasured),
            measured=ts_str(m["_meta"]["measured"]),
        )
    )

    text = "".join(out)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return (
        len(held),
        len(absent),
        len(text.encode("utf-8")),
        len(unmeasured),
        len(stale),
        len(no_entry),
    )


if __name__ == "__main__":
    h, a, b, u, st, ne = main()
    print(
        f"northsideImages.ts  held {h}  absent {a}  unmeasured {u}"
        f" (of {ne} with no entry; the rest are on a host already recorded"
        f" as serving nothing)  stale {st}  bytes {b}"
    )
