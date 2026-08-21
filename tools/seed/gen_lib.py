"""Shared helpers: value cleaning, typing, TS literal emission."""
import re, json

QUARANTINE_PREFIX = "#"
SENTINEL_EXACT = {
    ".", "0", "TRAILER NOT REQUIRED", "Prop Not Required", "Not Available",
    "TRAILER NOT REQUIED", "N/A", "-",
}
SENTINEL_PREFIX = ("NR - ", "NR- ", "TRAILER NOT REQUIRED")

NUM_RE = re.compile(r"^\s*([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\d*\.?\d+)\s*([^\s\d].{0,5})?\s*$")


def is_quarantined(v):
    return isinstance(v, str) and v.strip().startswith(QUARANTINE_PREFIX)


def is_sentinel(v):
    if not isinstance(v, str):
        return False
    s = v.strip()
    if s in SENTINEL_EXACT:
        return True
    return any(s.startswith(p) for p in SENTINEL_PREFIX)


def parse_num(v):
    """-> (number, unit|None) or None when not numeric."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return (v, None)
    if not isinstance(v, str):
        return None
    m = NUM_RE.match(v)
    if not m:
        return None
    raw, unit = m.group(1), m.group(2)
    try:
        n = float(raw.replace(",", ""))
    except ValueError:
        return None
    if unit is not None:
        unit = unit.strip()
        if unit == "" or len(unit) > 6:
            return None
        if not re.match(r"^[A-Za-z°%\"']+$", unit):
            return None
    return (n, unit)


UNIT_NORM = {
    "ltr": "L", "Ltr": "L", "L": "L", "l": "L",
    "kg": "kg", "Kg": "kg", "KG": "kg",
    "cm": "cm", "mm": "mm", "m": "m",
    "deg": "°", "Deg": "°", "°": "°",
    "HP": "HP", "hp": "HP",
    "%": "%", "T": "t", "t": "t",
    '"': "in", "in": "in",
}


# ONE ODD CELL IN A THOUSAND DOES NOT MAKE A PRICE COLUMN PROSE.
#
# `profile_column` used to be all-or-nothing: one value that does not parse and
# the whole column is text. That was right while every table was a curated
# sample of a few dozen rows, where an outlier is usually the column's real
# shape. It stops being right at library scale. Parts Maintenance!L is the
# dealer's Sell column, 2,913 cells deep; three of them are words — "Std" twice,
# on two Yamaha factory-fit rows whose every other price cell reads 0, and one
# "POA". All-or-nothing turns the register's price column into prose over three
# cells, and a parts table whose Sell column is text cannot be quoted from.
#
# So: judged on the cells that CAN be judged, and tolerant by a stated margin.
#   · SENTINELS ARE NOT EVIDENCE. A bare ".", "0", "N/A", "-", "TRAILER NOT
#     REQUIRED" already becomes EMPTY in `coerce`; a cell this file promises to
#     drop cannot also be allowed to decide the column's type.
#   · FEWER THAN ONE IN A HUNDRED, AND ONLY WITH ENOUGH CELLS TO MEAN
#     ANYTHING. Below NUM_FLOOR judgeable cells nothing is tolerated at all —
#     a short column with an odd value IS a text column, and a percentage over
#     twenty cells is not a measurement.
#   · NOTHING IS GUESSED, AND NOTHING GOES QUIET. A tolerated cell is EMPTY,
#     exactly as `coerce` already leaves it, and the dropped values come back
#     in `outliers` so the column's own description names them and counts them.
#
# MEASURED OVER THE WHOLE SEED: two columns are affected, both in Parts &
# Accessories, four cells in total. Nothing else in 53 tables changes type.
NUM_FLOOR = 200
NUM_TOL = 0.01


def profile_column(values):
    """values: list of raw non-empty, non-quarantined cell values.
    -> dict(type='number'|'text', unit=str|None, scale={unit:factor},
            outliers={value: count}, judged=int) — the last two only when a
    number column is leaving cells empty that it could not carry."""
    if not values:
        return None
    live = [v for v in values if not is_sentinel(v)]
    if not live:
        # Every cell is a sentinel. Text, so `make_col` drops the column
        # outright — which is what it did before, and still the right answer.
        return {"type": "text", "unit": None}
    parsed = [parse_num(v) for v in live]
    bad = [v for v, p in zip(live, parsed) if p is None]
    if bad:
        if len(live) < NUM_FLOOR or len(bad) / len(live) >= NUM_TOL:
            return {"type": "text", "unit": None}
        parsed = [p for p in parsed if p is not None]
    units = {UNIT_NORM.get(p[1], p[1]) for p in parsed if p[1]}
    if len(units) == 0:
        out = {"type": "number", "unit": None}
    elif len(units) == 1:
        out = {"type": "number", "unit": next(iter(units))}
    elif units == {"cm", "m"}:
        out = {"type": "number", "unit": "cm", "scale": {"m": 100.0, "cm": 1.0}}
    elif units == {"kg", "t"}:
        out = {"type": "number", "unit": "kg", "scale": {"t": 1000.0, "kg": 1.0}}
    else:
        # two units this file cannot reconcile — the column is what it is
        return {"type": "text", "unit": None}
    if bad:
        counts = {}
        for v in bad:
            k = str(v).strip()
            counts[k] = counts.get(k, 0) + 1
        out["outliers"] = counts
        out["judged"] = len(live)
    return out


def coerce(v, prof):
    """Return the value to store, or None to leave the cell empty."""
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    if is_quarantined(v):
        return None
    if prof["type"] == "text":
        if is_sentinel(v):
            return None
        return str(v).strip()
    p = parse_num(v)
    if p is None:
        return None
    n, unit = p
    unit = UNIT_NORM.get(unit, unit)
    scale = prof.get("scale")
    if scale and unit in scale:
        n = n * scale[unit]
    if isinstance(n, float) and n.is_integer() and abs(n) < 1e15:
        return int(n)
    return n


# ---------------- TS emission ----------------

def ts_str(s):
    return json.dumps(str(s), ensure_ascii=False)


def ts_num(n):
    if isinstance(n, int):
        return str(n)
    s = repr(float(n))
    if s.endswith(".0"):
        s = s[:-2]
    return s


def ts_val(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return ts_num(v)
    return ts_str(v)


def ts_row(d):
    inner = ", ".join(f"{k}: {ts_val(v)}" for k, v in d.items() if v is not None)
    return "{ " + inner + " }"
