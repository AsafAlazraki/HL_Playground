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


def profile_column(values):
    """values: list of raw non-empty, non-quarantined cell values.
    -> dict(type='number'|'text', unit=str|None, scale={unit:factor})"""
    if not values:
        return None
    parsed = [parse_num(v) for v in values]
    if any(p is None for p in parsed):
        return {"type": "text", "unit": None}
    units = {UNIT_NORM.get(p[1], p[1]) for p in parsed if p[1]}
    if len(units) == 0:
        return {"type": "number", "unit": None}
    if len(units) == 1:
        return {"type": "number", "unit": next(iter(units))}
    if units == {"cm", "m"}:
        return {"type": "number", "unit": "cm", "scale": {"m": 100.0, "cm": 1.0}}
    if units == {"kg", "t"}:
        return {"type": "number", "unit": "kg", "scale": {"t": 1000.0, "kg": 1.0}}
    return {"type": "text", "unit": None}


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
