"""Fetch the catalogue's photographs ONCE, here, so the app never hotlinks them.

STAGE ONE-AND-A-HALF. `probes/` read the workbooks; `gen_all.py` assembles the
tables; this reads the image addresses OUT of those assembled tables, fetches
each distinct address once, downscales it, and writes:

  * `public/seed-images/*.webp`      — the pixels, served same-origin by Vite
  * `tools/seed/extracts/images.json` — the record of where each one came from,
                                        and of every address that could NOT be
                                        fetched, with the measured reason

`emit.py` turns that record into `src/demos/northsideImages.ts`, which is the
only thing the app reads. Run order:

    python tools/seed/fetch_images.py      # needs the network; writes the two above
    python tools/seed/emit.py              # needs neither; regenerates the seed

Both outputs are COMMITTED, so a collaborator with no network — and the app on
bad wifi at a demo — has every photograph we were able to obtain.

---------------------------------------------------------------------------
WHY THIS DOES NOT CONTRADICT IMAGE_SPEC.md §5.2

§5.2 says "an address is the preferred form of a picture; we never fetch a
reachable picture in order to hold its bytes", and it is still right. What it
is about is the RUNTIME STORE: bytes held on an `ImageRef` are base64 inside a
row, they land in IndexedDB, they are rewritten in full every 400 ms by
`repository.saveAll`, and they leave in every export. That trade is refused
here as firmly as it was there.

Nothing on this path touches any of it. `ImageRef.src` still holds the
manufacturer's address and still costs ~124 bytes; the row, the store, the
export and a frozen quote are byte-for-byte what they were. The pixels are a
BUILD ARTEFACT beside the app, resolved at paint time by `@/lib/imageSources`
and never by the data. §5.2 governs what a row holds. This governs what the
repository ships.

WHAT IS NOT DONE HERE, and why

  * No image is substituted for another. A row whose photograph cannot be
    fetched keeps its address and is drawn as "Held as a link". IMAGE_SPEC.md
    §6.6 and §6.10 — a stand-in photograph on a quote is the failure mode this
    whole area exists to avoid.
  * No bot protection is worked around. `www.northsidemarine.com.au` answers
    403 from Cloudflare with `Cf-Mitigated: challenge` to a plain client as
    well as to a browser; that is the site telling us not to. It is recorded
    as unavailable, which is the truth.
  * No credential is used, no mirror bucket is read or written
    (IMAGE_SPEC.md §6.1, §6.5, §6.6).
---------------------------------------------------------------------------

USAGE

    python tools/seed/fetch_images.py            # fetch what is missing
    python tools/seed/fetch_images.py --probe    # report only; write nothing
    python tools/seed/fetch_images.py --refetch  # ignore the cache, fetch all

Originals land in `tools/seed/.imgcache/` (gitignored) so re-encoding at a
different size costs no requests and no bandwidth from somebody else's server.
"""

import hashlib
import io
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import requests
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CACHE = HERE / ".imgcache"
OUT_DIR = REPO / "public" / "seed-images"
MANIFEST = HERE / "extracts" / "images.json"

sys.path.insert(0, str(HERE))

# WHAT A CARD AND A DETAIL PAGE ACTUALLY NEED.
#   `.md-tile-pic`   3:2, roughly 200-260 CSS px wide  -> 520 px at 2x
#   `.tb-lightbox`   plate is max-width 880 px, less --sp-4 padding either side
#   `.vw-pic-img`    24 px
# 1100 px on the long edge covers the lightbox at 1x with room, and every
# thumbnail on the app at 2x. Above that we would be shipping detail no surface
# in this app can draw. Source pictures run to 3000x2000.
LONG_EDGE = 1100
QUALITY = 74

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": UA,
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
}
TIMEOUT = 30
ATTEMPTS = 3
WORKERS = 6


def image_urls(tables=None):
    """Every distinct image address the seed will carry, in sorted order.

    Read from `gen_all.main()` rather than from the generated TypeScript, so
    this can never drift from what `emit.py` is about to write. `emit.py` and
    `emit_images.py` pass the tables they have already assembled, so counting
    the addresses costs nothing and cannot answer for a different run.
    """
    if tables is None:
        import gen_all

        tables, _sel, _empty = gen_all.main()
    found = set()
    for t in tables:
        cols = [c["k"] for c in t["cols"] if c["t"] == "image"]
        for row in t["rows"]:
            for k in cols:
                v = row.get(k)
                if isinstance(v, str) and v.strip():
                    found.add(v.strip())
    return sorted(found)


def key_for(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def stem_for(url):
    """A filename a person can recognise, plus enough of the address's hash to
    keep two identically-named pictures on two hosts apart."""
    last = url.rstrip("/").split("/")[-1].split("?")[0]
    try:
        from urllib.parse import unquote

        last = unquote(last)
    except Exception:
        pass
    last = re.sub(r"\.(jpe?g|png|webp|gif|ashx|aspx)$", "", last, flags=re.I)
    slug = re.sub(r"[^a-z0-9]+", "-", last.lower()).strip("-")[:48].strip("-")
    return f"{slug or 'picture'}-{key_for(url)[:8]}"


def host_of(url):
    return url.split("/")[2]


def plainly(host):
    """The host as a person says it — `www.` is noise on a plate."""
    return host[4:] if host.startswith("www.") else host


# WHY A PICTURE IS NOT HERE, IN WORDS SOMEBODY READS ON A PLATE.
#
# Each of these is printed by `heldAsLinkNote` as `Held as a link — <why>.`
# and joined into a list by the module index, so every one has to read as a
# CLAUSE as well as a sentence: it names the host, and it never opens with
# "this" or "it". Written here, at the point of measurement, rather than
# guessed at later by a surface that has no idea what happened.
def refusal(host, status, ctype, cf, signin=False):
    h = plainly(host)
    if signin:
        return f"{h} needs a sign-in to read"
    if status == 404:
        return f"{h} no longer has that picture"
    if status == 403 and cf:
        return f"{h} serves its pictures to its own site only"
    if status == 403:
        return f"{h} refuses the request"
    if status and status != 200:
        return f"{h} answered {status} for it"
    if "html" in ctype:
        return f"{h} answers with a web page rather than a picture"
    if not status:
        return f"{h} could not be reached"
    return f"{h} answers with {ctype or 'nothing we can read'}"


def fetch_one(url):
    """-> (bytes, content_type, status, why). `bytes` is None on failure."""
    host = host_of(url)
    last = (None, "", 0, refusal(host, 0, "", False))
    for attempt in range(ATTEMPTS):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        except requests.RequestException:
            last = (None, "", 0, refusal(host, 0, "", False))
            time.sleep(1 + attempt)
            continue
        ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        cf = bool(r.headers.get("Cf-Mitigated"))
        # Landed somewhere else entirely — an identity provider, not a picture.
        # The destination is CLASSIFIED and never recorded: it carries the
        # dealership's tenant id, which is nobody's business but theirs.
        signin = host_of(r.url) != host and bool(
            re.search(r"(login|signin|sign-in|auth|adfs|okta)\.", host_of(r.url))
        )
        if r.status_code != 200:
            return None, ctype, r.status_code, refusal(host, r.status_code, ctype, cf, signin)
        if not ctype.startswith("image/"):
            return None, ctype, 200, refusal(host, 200, ctype, cf, signin)
        return r.content, ctype, 200, ""
    return last


def cache_path(url):
    return CACHE / key_for(url)


def load_cached(url):
    p = cache_path(url)
    if not p.exists():
        return None
    meta = p.with_suffix(".json")
    if not meta.exists():
        return None
    return p.read_bytes(), json.loads(meta.read_text(encoding="utf-8"))


def store_cached(url, raw, ctype):
    CACHE.mkdir(parents=True, exist_ok=True)
    p = cache_path(url)
    p.write_bytes(raw)
    p.with_suffix(".json").write_text(
        json.dumps({"type": ctype, "bytes": len(raw)}), encoding="utf-8"
    )


def encode(raw, dest):
    """Downscale and re-encode to WebP. Returns the record, or None if the
    bytes are not an image we can open."""
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None
    src_w, src_h = im.size
    im = ImageOps.exif_transpose(im) or im

    # Transparency is kept only where it is actually used — a logo on a
    # transparent ground stays that way, a photograph saved as RGBA does not
    # pay for an alpha channel it never varies.
    has_alpha = im.mode in ("RGBA", "LA", "P") and (
        im.mode == "P"
        and "transparency" in im.info
        or im.mode in ("RGBA", "LA")
        and im.getchannel("A").getextrema()[0] < 255
    )
    im = im.convert("RGBA" if has_alpha else "RGB")

    w, h = im.size
    if max(w, h) > LONG_EDGE:
        scale = LONG_EDGE / max(w, h)
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=QUALITY, method=6)
    out = buf.getvalue()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(out)
    return {
        "file": dest.name,
        "bytes": len(out),
        "w": im.size[0],
        "h": im.size[1],
        "sha256": hashlib.sha256(out).hexdigest(),
        "srcW": src_w,
        "srcH": src_h,
    }


def main(argv):
    probe_only = "--probe" in argv
    refetch = "--refetch" in argv

    urls = image_urls()
    print(f"{len(urls)} distinct image addresses in the seed")

    today = date.today().isoformat()
    results = {}

    def work(url):
        cached = None if refetch else load_cached(url)
        if cached is not None:
            raw, meta = cached
            return url, raw, meta["type"], 200, "", True
        raw, ctype, status, why = fetch_one(url)
        if raw is not None and not probe_only:
            store_cached(url, raw, ctype)
        return url, raw, ctype, status, why, False

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for url, raw, ctype, status, why, from_cache in pool.map(work, urls):
            results[url] = (raw, ctype, status, why, from_cache)

    manifest = {
        "_meta": {
            "measured": today,
            "longEdge": LONG_EDGE,
            "quality": QUALITY,
            "note": (
                "Generated by tools/seed/fetch_images.py. One entry per distinct "
                "image address in the seed. `file` names a copy under "
                "public/seed-images; an entry with no `file` carries the measured "
                "reason the picture could not be obtained, and the app keeps "
                "showing its address instead."
            ),
        },
        "images": [],
    }

    ok = bad = 0
    total = 0
    for url in urls:
        raw, ctype, status, why, from_cache = results[url]
        rec = {"url": url, "host": host_of(url)}
        if raw is None:
            rec["why"] = why
            if status:
                rec["status"] = status
            bad += 1
        else:
            if probe_only:
                rec["ok"] = True
                rec["srcBytes"] = len(raw)
                rec["srcType"] = ctype
                ok += 1
            else:
                enc = encode(raw, OUT_DIR / f"{stem_for(url)}.webp")
                if enc is None:
                    rec["why"] = f"{plainly(rec['host'])} answers with bytes we cannot read as a picture"
                    bad += 1
                else:
                    rec.update(enc)
                    rec["srcBytes"] = len(raw)
                    rec["srcType"] = ctype
                    rec["fetched"] = today
                    total += enc["bytes"]
                    ok += 1
        manifest["images"].append(rec)

    print(f"  obtained {ok}   unavailable {bad}")
    if not probe_only:
        print(f"  {total:,} bytes written to {OUT_DIR}")
        # Anything left over from an address that has since left the seed.
        keep = {r["file"] for r in manifest["images"] if r.get("file")}
        for f in sorted(OUT_DIR.glob("*.webp")):
            if f.name not in keep:
                f.unlink()
                print(f"  removed {f.name} — no longer referenced")
        manifest["_meta"]["totalBytes"] = total
        manifest["_meta"]["obtained"] = ok
        manifest["_meta"]["unavailable"] = bad
        MANIFEST.write_text(
            json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"  wrote {MANIFEST}")
    else:
        by_host = {}
        for rec in manifest["images"]:
            h = rec["host"]
            slot = by_host.setdefault(h, [0, 0, ""])
            if rec.get("ok"):
                slot[0] += 1
            else:
                slot[1] += 1
                slot[2] = rec.get("why", "")
        for h, (good, dead, why) in sorted(by_host.items()):
            print(f"  {h:38s} ok {good:3d}  dead {dead:3d}  {why}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
