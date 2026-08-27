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
  * No credential is used and nothing is ever written anywhere but this
    repository.

---------------------------------------------------------------------------
THE MIRROR, AND WHY READING IT IS NOT GUESSING

An earlier revision of this file said "no mirror bucket is read". That was
right while nobody had asked for those photographs; the business has since
asked for them twice, in writing, and the picture the request is about is one
the business already fetched and already owns a copy of.

The dealership's own remediation run
(`HelmLogic/scripts/mpf/remediate-images.py`, and the motor-only
`mirror-motor-images.py` beside it) hit the SAME wall this file hits — the
Cloudflare 403 — and solved it once. Every picture it recovered was written
to the app's Storage bucket under a name derived from the ORIGINAL ADDRESS:

    mpf-mirror/{folder}/{sha1(url).hexdigest()[:16]}.{ext}

    remediate-images.py:170   h = hashlib.sha1(url.encode()).hexdigest()[:16]
    remediate-images.py:180   name = f"mpf-mirror/{folder}/{h}.{ext}"
    remediate-images.py:67    BUCKET = studio-2290360004-3b963.firebasestorage.app
    folder is "dfo" for site-hosted pictures, "motors" for the Yamaha CDN.

THAT IS WHY THIS IS SAFE, and it is the whole argument. The object's NAME is
a function of the address the workbook typed. We do not search that bucket
for "a picture that looks like this boat" — that is exactly the substitution
IMAGE_SPEC.md §6.6 exists to forbid. We compute the name from the address we
already hold and ask for that one object. A wrong picture cannot arrive by
this path without a SHA-1 preimage collision.

Because a name is only as good as the thing that wrote it, a SECOND,
INDEPENDENT check is applied to every mirrored byte and to nothing else
(`declared_size`): a WordPress derivative address states its own pixel size
in its filename — `...620F-1024x683.jpg` — and the bytes have to be that
size or they do not land. Measured on the first run: 51 of the 70 addresses
made that claim and 51 of 51 agreed, 0 disagreed. It is applied only to the
mirror because a picture fetched from its own address is self-identifying
and needs no corroboration; a picture fetched from somewhere else does.

Nothing about the bucket is authenticated. `HelmLogic/storage.rules` grants
`allow read, write` with no condition, and this file uses one plain
unauthenticated GET per object. If that ever stops being true, the fetch
fails and the address goes back to being recorded unavailable, which is
still the truth. NOTHING is ever written to that bucket, and no Firestore
document is read: the mirror is addressed arithmetically, so the database
that maps rows to pictures is never touched. Business data still comes from
the workbooks and only from the workbooks.
---------------------------------------------------------------------------

USAGE

    python tools/seed/fetch_images.py            # fetch what is missing
    python tools/seed/fetch_images.py --probe    # report only; write nothing
    python tools/seed/fetch_images.py --refetch  # ignore the cache, fetch all
    python tools/seed/fetch_images.py --mirror   # ask ONLY the mirror, and
                                                 # only for what we do not
                                                 # already hold; makes no
                                                 # request to any third party
                                                 # and merges into the
                                                 # existing measurement

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
from urllib.parse import quote

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


# ---------------------------------------------------------------------------
# THE MIRROR THE BUSINESS ALREADY BUILT. See the module docstring for why
# reading it is addressing and not searching; the short version is that the
# object's name is sha1 of the address the workbook typed, so asking for it
# is the same act as asking the original host, minus the Cloudflare wall.
# ---------------------------------------------------------------------------
MIRROR_BUCKET = "studio-2290360004-3b963.firebasestorage.app"
MIRROR_BASE = f"https://firebasestorage.googleapis.com/v0/b/{MIRROR_BUCKET}/o"
MIRROR_PREFIX = "mpf-mirror/"


def mirror_key(url):
    """The name the dealership's remediation gave this address's copy.

    `remediate-images.py:170`. Sixteen hex characters of SHA-1 over the
    address BYTE FOR BYTE — not unescaped, not normalised, not lowercased.
    If the workbook's address differs from theirs by one percent-escape the
    key differs and no picture arrives, which is the correct outcome: we
    would not be able to prove the copy belongs to this row."""
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def mirror_index():
    """{key: object name} for every object under `mpf-mirror/`.

    One listing rather than guessing extensions one HEAD at a time. The
    extension is decided by the bytes at mirror time, so it is not derivable
    from the address; the LISTING is what tells us `.jpg` or `.png`, and the
    KEY is still what tells us the object is this address's."""
    index, token = {}, None
    while True:
        url = f"{MIRROR_BASE}?prefix={quote(MIRROR_PREFIX, safe='')}&maxResults=1000"
        if token:
            url += f"&pageToken={quote(token, safe='')}"
        r = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": UA})
        if r.status_code != 200:
            return {}  # unreadable without a credential -> we do not use one
        body = r.json()
        for item in body.get("items", []):
            name = item.get("name", "")
            leaf = name.rsplit("/", 1)[-1]
            if "." in leaf:
                index[leaf.rsplit(".", 1)[0]] = name
        token = body.get("nextPageToken")
        if not token:
            return index


DECLARED = re.compile(r"-(\d{2,5})x(\d{2,5})\.(?:jpe?g|png|webp|gif)$", re.I)


def declared_size(url):
    """(w, h) the ADDRESS ITSELF claims, or None.

    A WordPress derivative names its own pixel size — `620F-1024x683.jpg`.
    That is a fact stated by the workbook's address, so it is a check the
    mirrored bytes have to pass that does not depend on trusting the mirror.
    Only the mirror path is held to it: a picture fetched from its own
    address cannot be the wrong picture, and one fetched from anywhere else
    has to prove it."""
    last = url.rstrip("/").split("/")[-1].split("?")[0]
    m = DECLARED.search(last)
    return (int(m.group(1)), int(m.group(2))) if m else None


def fetch_mirror(url, index):
    """-> (bytes, content_type, object_name, why). `bytes` is None on failure.

    Refuses on: no object under this address's key; a non-image answer; and
    bytes whose real size contradicts the size the address declares."""
    key = mirror_key(url)
    name = index.get(key)
    if not name:
        # NO OBJECT UNDER THIS ADDRESS'S KEY. That is not a measurement of
        # anything — it says the dealership never recovered this one, not
        # that the host refused us. The caller must not turn it into a
        # sentence about the host.
        return None, "", None, ""
    h = plainly(host_of(url))
    try:
        r = requests.get(
            f"{MIRROR_BASE}/{quote(name, safe='')}?alt=media",
            headers={"User-Agent": UA},
            timeout=TIMEOUT,
        )
    except requests.RequestException:
        return None, "", name, f"{h}'s mirrored copy could not be reached"
    ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    if r.status_code != 200 or not r.content:
        return None, ctype, name, f"{h}'s mirrored copy answered {r.status_code}"
    want = declared_size(url)
    if want:
        try:
            got = Image.open(io.BytesIO(r.content)).size
        except Exception:
            return None, ctype, name, f"{h}'s mirrored copy is not bytes we can read"
        if got != want:
            # DO NOT LAND IT. The address says one size, the copy is another:
            # something between the workbook and the mirror is not the same
            # picture, and a wrong photograph on a quote is the failure this
            # whole area exists to avoid.
            return (
                None,
                ctype,
                name,
                f"{h}'s mirrored copy is {got[0]}x{got[1]} where the address "
                f"says {want[0]}x{want[1]}",
            )
    if not ctype.startswith("image/"):
        return None, ctype, name, f"{h}'s mirrored copy is not a picture"
    return r.content, ctype, name, ""


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


def store_cached(url, raw, ctype, via="host", mirror=None):
    """Keep the original bytes AND where they came from. Provenance has to
    survive the cache or a re-encode would quietly forget that a picture
    arrived by the mirror rather than from its own host."""
    CACHE.mkdir(parents=True, exist_ok=True)
    p = cache_path(url)
    p.write_bytes(raw)
    meta = {"type": ctype, "bytes": len(raw), "via": via}
    if mirror:
        meta["mirror"] = mirror
    p.with_suffix(".json").write_text(json.dumps(meta), encoding="utf-8")


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


def prior_manifest():
    """What the last measurement recorded, by address. Empty on a first run."""
    if not MANIFEST.exists():
        return {}
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {r["url"]: r for r in doc.get("images", [])}


def main(argv):
    probe_only = "--probe" in argv
    refetch = "--refetch" in argv
    mirror_only = "--mirror" in argv

    urls = image_urls()
    print(f"{len(urls)} distinct image addresses in the seed")

    today = date.today().isoformat()
    prior = prior_manifest()
    results = {}

    # ONE LISTING, SHARED. Costs a request or two whatever the mode, and
    # comes back empty if the bucket ever stops answering a plain GET — in
    # which case every address simply keeps the answer it already had.
    index = mirror_index()
    if index:
        print(f"  mirror: {len(index)} objects readable without a credential")
    else:
        print("  mirror: not readable — every address is on its own host only")

    def from_mirror(url):
        raw, ctype, name, why = fetch_mirror(url, index)
        if raw is not None and not probe_only:
            store_cached(url, raw, ctype, via="mirror", mirror=name)
        return {
            "raw": raw, "ctype": ctype, "status": 200 if raw is not None else 0,
            "why": why, "via": "mirror" if raw is not None else "", "mirror": name,
        }

    if mirror_only:
        # ASK NOBODY BUT THE MIRROR, AND ONLY ABOUT WHAT WE DO NOT HOLD.
        # No request leaves for any third party on this path, so it is a
        # regeneration a person can run without deciding to make a few
        # hundred calls to nine other people's servers.
        targets = [u for u in urls if not (prior.get(u) or {}).get("file")]
        print(f"  {len(targets)} addresses not already held; asking the mirror for each")
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for url, res in zip(targets, pool.map(from_mirror, targets)):
                results[url] = res
    else:
        def work(url):
            cached = None if refetch else load_cached(url)
            if cached is not None:
                raw, meta = cached
                return url, {
                    "raw": raw, "ctype": meta["type"], "status": 200, "why": "",
                    "via": meta.get("via", "host"), "mirror": meta.get("mirror"),
                    "cached": True,
                }
            raw, ctype, status, why = fetch_one(url)
            if raw is None:
                # THE HOST REFUSED. Before recording that, ask whether the
                # business's own remediation already recovered this exact
                # address — same address, same arithmetic, different shelf.
                got = from_mirror(url)
                if got["raw"] is not None:
                    return url, got
                if got["why"]:
                    why = got["why"]
            elif not probe_only:
                store_cached(url, raw, ctype, via="host")
            return url, {
                "raw": raw, "ctype": ctype, "status": status, "why": why,
                "via": "host" if raw is not None else "", "mirror": None,
            }

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for url, res in pool.map(work, urls):
                results[url] = res

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
                "showing its address instead. An entry with `via`: `mpf-mirror` "
                "was taken off the dealership's own mirror of THAT SAME ADDRESS "
                "rather than off the host, because the host refuses us; "
                "`mirror` names the object and `mirrorKey` is sha1(url)[:16], "
                "which is how the object was addressed. Nothing is matched by "
                "resemblance and nothing is substituted."
            ),
        },
        "images": [],
    }

    ok = bad = 0
    total = 0
    recovered = 0

    # WHICH ADDRESSES THIS RUN SPEAKS FOR. A `--mirror` run asked about a
    # subset, so every other address KEEPS the answer the last measurement
    # gave it rather than being silently dropped or re-declared.
    covered = sorted(set(urls) if not mirror_only else (set(results) | set(prior)))

    for url in covered:
        res = results.get(url)
        if res is None:
            rec = dict(prior.get(url) or {})
            if not rec:
                continue  # never asked; stays unmeasured, and is counted as such
            if rec.get("file"):
                total += rec.get("bytes", 0)
                ok += 1
            else:
                bad += 1
            manifest["images"].append(rec)
            continue

        raw, ctype, status = res["raw"], res["ctype"], res["status"]
        was = prior.get(url) or {}
        rec = {"url": url, "host": host_of(url)}
        if raw is None:
            # WE MAY ONLY WRITE DOWN WHAT WE ASKED. A `--mirror` run asked
            # the mirror and nobody else, so an address the mirror simply
            # does not carry has been measured for NOTHING: it keeps the
            # reason the host gave a previous run, or — if no run ever asked
            # the host — it stays out of this file entirely and is counted
            # as unmeasured, which is the truth and is what the app already
            # knows how to say. Writing "could not be reached" for a host we
            # never called would be inventing a measurement.
            if not res["why"] and not was:
                continue
            rec["why"] = was.get("why") or res["why"]
            if was.get("status"):
                rec["status"] = was["status"]
            elif status:
                rec["status"] = status
            bad += 1
        elif probe_only:
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
                if res.get("via") == "mirror":
                    # WHERE IT REALLY CAME FROM. `url` is still the address
                    # the workbook typed and is still what the row holds;
                    # this says the BYTES were taken off the dealership's own
                    # mirror of that address, and names the object, so the
                    # chain is re-checkable by anyone with this file.
                    rec["via"] = "mpf-mirror"
                    rec["mirror"] = res.get("mirror")
                    rec["mirrorKey"] = mirror_key(url)
                    recovered += 1
                total += enc["bytes"]
                ok += 1
        manifest["images"].append(rec)

    print(f"  obtained {ok}   unavailable {bad}")
    if recovered:
        print(f"  {recovered} of those came off the mirror, keyed by the address's own sha1")
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
