"""
ROBOT — THE STAND-IN COPY
=========================
Why this exists, in one sentence: the person setting a container up is
checking how a CLIENT'S finished render will look, and an empty slot checks
nothing.

So every module the html leaves blank gets a stand-in — and ONLY the blank
ones. A container built from a real artefact already carries real copy, and
pouring latin over "Win one of five double passes to Practical Magic 2"
would make the check worse rather than better. The front end pours into an
empty slot and steps over a full one.

Three kinds of module, three kinds of stand-in, and spec.md's Modules table
already says which is which:

    filled by writer    latin, cut to the length the spec allows. If it
                        overflows the design, that is a FINDING, not a
                        glitch — the limit doesn't fit the container it was
                        written for, and better to learn that here than
                        from a client's words.
    filled by fixed     not latin at all. The length column IS the copy —
                        "Enter now", the From line — so it shows real,
                        because that is what the client will meet.
    filled by client    an image slot. A grey box, because that is what it
                        is, and latin in a picture frame is a lie.

Nothing here is stored. It is derived on every read, so it cannot go stale
against a spec that changed underneath it. There is deliberately no
`## Sample` section in the schema and there should not be one: a stand-in
is not content anybody owns.
"""

import re

# One paragraph of the usual, as words. Latin because it is obviously not
# copy — the moment a stand-in reads well enough to be mistaken for the real
# thing, somebody ships it.
LOREM = (
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor "
    "incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud "
    "exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute "
    "irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur "
    "excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt "
    "mollit anim id est laborum praesent facilisis vitae dictum tellus at rhoncus"
).split()

NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
                "seven": 7, "eight": 8, "nine": 9, "ten": 10}

# A module that holds a picture. Its name usually says so; failing that the
# length column does ("image, see IMAGES below").
IMAGEY_NAME = re.compile(r"(^|[-_])(image|img|icon|hero|logo|photo|picture|banner)([-_]|$)", re.I)
# "LinkedIn and website icons" is a description of a picture, not the words
# that go in the slot — a fixed module can still be furniture rather than
# copy, and pouring its description in reads as text nobody wrote.
IMAGEY_LEN = re.compile(r"\bimages?\b|\bicons?\b", re.I)

# A "fixed" row whose length column points at another file rather than
# carrying the words itself.
POINTER = re.compile(r"\bconfig\.md\b|\bspec\.md\b|\bbelow\b", re.I)

# ...and a "fixed" row whose length column is an editorial NOTE rather than
# the words themselves — "logo strip", "privacy · copyright". Fixed modules
# are furniture and the html carries them already, so the honest move when
# we can't tell copy from a note is to pour nothing and leave the slot as it
# is. A wrong stand-in is worse than none: it reads as a decision.
NOTEY = re.compile(r"·|\(merge\)|^[a-z]")


# ---------------------------------------------------------------------------
# LATIN, TO A LENGTH
# ---------------------------------------------------------------------------

def _words(n, seed=0):
    """n words off the pool, starting somewhere the seed picked. Two modules
    with the same length shouldn't read identically — five cards of the same
    sentence looks like a bug, not a stand-in."""
    start = (seed * 7) % len(LOREM)
    out = []
    while len(out) < n:
        out += LOREM[start:start + (n - len(out))]
        start = 0
    return out


def _sentence(n, seed=0):
    w = _words(max(3, n), seed)
    return " ".join(w).capitalize().rstrip(".") + "."


def _trim(text, chars):
    """Cut to a character budget on a word boundary. The budget is the whole
    point — a stand-in that quietly runs over tells you nothing about
    whether the real thing fits."""
    if chars <= 0 or len(text) <= chars:
        return text
    cut = text[:chars]
    if " " in cut:
        cut = cut[:cut.rfind(" ")]
    return cut.rstrip(" ,;:.") + "."


def _count_in(text):
    """The biggest number a length phrase mentions. 'Two or three short
    sentences' is three — the stand-in should test the top of the range,
    since that is the one that breaks the layout."""
    found = [int(m) for m in re.findall(r"\b(\d{1,2})\b", text)]
    found += [NUMBER_WORDS[w] for w in re.findall(r"[a-z]+", text.lower()) if w in NUMBER_WORDS]
    return max(found) if found else 0


def latin_for(m, seed=0):
    """One writer module's stand-in, sized off its own length column."""
    length = m.get("length", "") or ""
    if m.get("max_chars"):
        return _trim(_sentence(18, seed), m["max_chars"])
    low = length.lower()
    n = _count_in(low)
    if "sentence" in low:
        return " ".join(_sentence(9, seed + i) for i in range(max(1, n)))
    if "word" in low and n:
        return " ".join(_words(n, seed)).capitalize()
    if "line" in low:
        # a line is a headline's worth, not a paragraph's
        return _trim(_sentence(9, seed), 52)
    if "paragraph" in low:
        return " ".join(_sentence(11, seed + i) for i in range(3))
    return _sentence(10, seed)


# ---------------------------------------------------------------------------
# WHAT EACH MODULE GETS
# ---------------------------------------------------------------------------

def _kind_of(m):
    filled = (m.get("filled_by") or "").lower()
    if IMAGEY_NAME.search(m.get("module", "")) or IMAGEY_LEN.search(m.get("length", "")):
        return "image"
    if "client" in filled:
        return "image" if IMAGEY_LEN.search(m.get("length", "")) else "latin"
    if "fixed" in filled or "assembled" in filled:
        return "fixed"
    return "latin"


def _fixed_for(m, c):
    """A fixed module's real words. Usually the length column is the copy;
    where it points at config.md instead, go and get what it points at,
    because that is what the client will actually see."""
    name = m.get("module", "")
    length = (m.get("length") or "").strip()
    legals = (c.get("legals") or {})
    if name == "footer" and legals.get("footer"):
        return legals["footer"]
    if name in ("terms", "legals"):
        base = [b.get("text", "") for b in legals.get("base", [])
                if b.get("fixed") and b.get("id") != "prize_line" and b.get("text")]
        if base:
            return " ".join(base)
    if length and not POINTER.search(length) and not NOTEY.search(length):
        return length
    return ""


def stand_in(c):
    """{module: {kind, texts}} for every module in the spec.

    `texts` is a list because a repeating module — five cards — wants five
    different stand-ins; the front end takes them by index and wraps. A
    module with nothing honest to put in it isn't in the dict at all, and an
    empty slot stays empty rather than being filled with a guess.
    """
    out = {}
    mods = (c.get("spec") or {}).get("modules") or []
    for i, m in enumerate(mods):
        name = m.get("module", "")
        if not name:
            continue
        kind = _kind_of(m)
        if kind == "image":
            out[name] = {"kind": "image", "texts": []}
            continue
        if kind == "fixed":
            text = _fixed_for(m, c)
            if text:
                out[name] = {"kind": "fixed", "texts": [text]}
            continue
        # writer rows: three variants, so repeats don't read as a stuck record
        out[name] = {"kind": "latin",
                     "texts": [latin_for(m, i * 3 + k) for k in range(3)]}
    return out


# ---------------------------------------------------------------------------
# THE DEETS, FILLED
#
# Same reason, the other card. The client meets a filled checklist, so
# checking an empty one checks nothing. Values are plausible rather than
# latin where latin would read as a mistake — a date field wants a date.
# ---------------------------------------------------------------------------

def _deets_value(r, seed):
    t = (r.get("type") or "text").lower()
    if t == "select":
        opts = [o for o in (r.get("options") or []) if o != "other"]
        return opts[seed % len(opts)] if opts else ""
    if t == "topics":
        return []
    if t == "date":
        return "2026-11-20"
    if t == "time":
        return "17:00"
    if t == "number":
        return "5"
    if t == "url":
        return "https://one.nz/lorem"
    label = (r.get("label") or "").lower()
    if "name" in label:
        return " ".join(_words(2, seed)).capitalize()
    return _trim(_sentence(7, seed), 60)


def stand_in_deets(checklist):
    """{row id: value} for the flat rows, plus two items for each repeating
    group so the shape of a card shows. Derived, never stored."""
    rows, repeats = {}, {}
    for gi, g in enumerate(checklist.get("groups") or []):
        if g.get("repeat"):
            key = (g["repeat"].get("per") or "card").split(" ")[-1]
            items = []
            for n in range(2):
                item = {}
                for ri, r in enumerate(g.get("rows") or []):
                    item[r["id"]] = _deets_value(r, gi + ri + n * 5)
                items.append(item)
            repeats[key] = items
            continue
        for ri, r in enumerate(g.get("rows") or []):
            rows[r["id"]] = _deets_value(r, gi + ri)
    return {"rows": rows, "repeats": repeats}
