"""
ROBOT — THE SET UP CHAT
=======================
The room where you look at the artefact and say what's wrong with it.

    "it should show a thing and I should be able to say 'Not that font in
     the headline, this one' and it changes and I confirm and then commit
     to send it live."

So: you type a sentence. A router decides which of the three files that
sentence lives in. The robot for THAT FILE — and only that file — proposes
the smallest change it can. You see the before and the after. You confirm,
or you undo.

WHY A ROUTER AND THREE ROBOTS RATHER THAN ONE ROBOT WITH THREE FILES.
Because one robot holding config.md, spec.md and container.html will move
copy into the spec and limits into the html on the day you most need it not
to. The router never sees a file — only the sentence and one line about
what each file owns — so it can't confuse them. Each scoped robot sees its
own file and nothing else, so it can't reach into another one.

WHAT THE CHAT MAY CHANGE, AND WHAT IT MAY NOT.
The brand declares the faces, the logo and the palette. Those belong to the
brand folder and the brand room, and the chat will not touch them: it can
REARRANGE within what the brand declares — put the brand's other face on
the headline — but it cannot import something the brand has never named.
Ask it for Bebas on a One NZ artefact and it says so and offers to park it,
because the honest answer to "the brand doesn't have that font" is a brand
edit or a decision, not a quiet line of CSS nobody checks.

Everything the container decides for ITSELF is fair game: size, spacing,
weight, tracking, alignment. prize_draw's h1 is 31px with 1.5px of tracking
and one_nz's brandlook says nothing about either.

ANYTHING ELSE IS A HANG ON A SEC. Not a failure and not a no — a thing to
decide. It goes in the folder under `## Open` and travels with the push.

Every write goes through setup_edit's surgical lane. Nothing here asks a
model for a file.
"""

import os
import re

import containers as CT
import setup_edit
from copy_stage import _call, _json_from, prompt

# What each file owns, in one line each. This is the ONLY thing the router
# is told about them — no contents, so it routes on the ask, not on what it
# happens to have read.
FILES = {
    "container.html": "the look of the artefact — size, spacing, weight, tracking, "
                      "alignment, colour tokens, the shape of things on the page.",
    "config.md": "what the client is asked for — the deets checklist, its labels and "
                 "options, the legal clauses, and the FEED IT conversation.",
    "spec.md": "the modules and their limits — what gets written, how long it may be, "
               "who fills it, and where this format's voice bends.",
}

# Which surgical edits each file will accept. A proposal naming anything
# else is a park, not an error — the model guessed at a lane that doesn't
# exist and the honest answer is that we can't do it yet.
OPS = {
    "container.html": {"css"},
    "config.md": {"section", "cell", "line"},
    "spec.md": {"section", "cell"},
}

GENERIC = {"sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui",
           "ui-sans-serif", "ui-serif", "inherit", "initial", "unset", "revert"}

# Faces that are on the machine already. Everything else has to be loaded by
# the artefact itself with an @font-face, or it does not render — and on an
# email that is the normal case, not a fault.
WEB_SAFE = {"arial", "arial narrow", "arial black", "helvetica", "helvetica neue",
            "times", "times new roman", "georgia", "courier", "courier new",
            "verdana", "tahoma", "trebuchet ms", "impact", "palatino", "garamond",
            "comic sans ms", "segoe ui", "roboto", "-apple-system"}

# how many declarations one proposal may carry. More than one, because "full
# bleed" is a negative margin AND a border AND a radius and asking for it
# three times is not a conversation. Not many more, because a proposal you
# can't read in one glance is not a proposal you can answer.
MAX_DECLS = 4


# ---------------------------------------------------------------------------
# THE FONT GATE
#
# What the brand declares is the palette. The container may rearrange inside
# it and may not import into it. This is the check that has never existed:
# containers.py has always checked that a brand's named FILES are present,
# and never once compared what a container actually WEARS against what its
# brand declares.
# ---------------------------------------------------------------------------

def font_lines(brand):
    """The brand's **Font:** lines, whole and verbatim. Whole, because a font
    line is PROSE and the family is not reliably the first thing on it:

        **Font — headlines:** Bebas Neue, ALL CAPS. Headlines, subs and sub
        subs. `assets/BebasNeue-Regular.woff2` (400). ... Fallback: Impact,
        Haettenschweiler, sans-serif.
        **Font — body:** the web-safe stack, no file. Avenir Next, then Segoe
        UI, Helvetica, Arial. 400 Regular and 600 Semibold, never 700.

    Parsing a family out of that gets you "the web-safe stack, no file",
    which then declares nothing and flags Hunch's own body font on Hunch's
    own newsletter. So don't parse it — ask it a question instead."""
    out = []
    for f in (brand.get("skin", {}) or {}).get("fonts", []):
        role = (f.get("role") or "").strip()
        out.append((f"Font — {role}: " if role else "Font: ") + (f.get("text") or ""))
    return out


def brand_face(brand):
    """The brand's face, as a NAME, when the line yields one confidently.

    `declares()` asks the font lines a question and is right every time,
    because it never has to parse them. Naming the face is the other job:
    a sentence that says "the brand says Euclid Circular A" needs the words.

    A font line is prose, so this only answers when it is sure — the family
    is what stands before the first full stop or backtick, and before any
    comma inside that. Hunch's body line begins "the web-safe stack, no
    file." and yields "the web-safe stack", which is not a face; a candidate
    that doesn't start with a capital is refused rather than guessed at, and
    the sentence goes without a name."""
    for line in font_lines(brand):
        text = line.split(":", 1)[-1]
        head = re.split(r"[.`(]", text, 1)[0]
        head = head.split(",")[0].strip()
        if head and head[0].isupper() and len(head) < 40:
            return head
    return ""


def declares(brand):
    return "\n".join(font_lines(brand)).lower()


def _families(value):
    return [t.strip().strip("'\"") for t in (value or "").split(",") if t.strip()]


def looks_like_faces(prop, *values):
    """Is this declaration about type? font-family always is; a custom
    property is when its value reads as a family list — quoted names, or a
    generic keyword on the end. `--ink:#323232` never trips this."""
    if prop.strip().lower() in ("font-family", "font"):
        return True
    if not prop.strip().startswith("--"):
        return False
    for v in values:
        if not v:
            continue
        if "'" in v or '"' in v:
            return True
        if any(t.lower() in GENERIC for t in _families(v)):
            return True
    return False


def undeclared(value, brand):
    """The families in this value the brand's font lines never mention.

    A substring test on the lines themselves, not a comparison against
    families parsed out of them — "does the brand name this face anywhere"
    is the actual question, and it is the one prose can answer."""
    text = declares(brand)
    return [f for f in _families(value)
            if f.lower() not in GENERIC and f.lower() not in text]


def _loadable(html):
    """Every face the artefact itself loads with an @font-face. A file in the
    brand's assets/ is not enough: if nothing in the html reaches for it, the
    browser has never heard of it."""
    out = set()
    for m in re.finditer(r"@font-face\s*\{[^}]*?font-family\s*:\s*([^;}]+)", html, re.S | re.I):
        out.add(m.group(1).strip().strip("'\"").lower())
    return out


def lands_on(value, html):
    """WHAT YOU WILL ACTUALLY SEE.

    A font-family is a wish list; the browser takes the first name it can
    resolve. Swapping `Arial` for `'Euclid Circular A', Arial` on a container
    that loads no font files changes the file and changes nothing on screen —
    and a room whose whole promise is "say it and it changes" must never
    report that as a change made.

    On an email this is usually correct rather than broken: mail clients
    don't load webfonts, so the fallback IS what the recipient gets. The room
    says so instead of pretending."""
    have = _loadable(html) | WEB_SAFE | GENERIC
    for f in _families(value):
        if f.lower() in have:
            return f
    return ""


# ---------------------------------------------------------------------------
# THE ROUTER, THEN ONE ROBOT
# ---------------------------------------------------------------------------

def _folder_file(folder, name):
    path = os.path.join(folder, name)
    if not os.path.isfile(path):
        return ""
    with open(path, encoding="utf-8") as f:
        return f.read()


def route(ask, said):
    """Which file, and the ask restated. No file contents in this call."""
    lines = "\n".join(f"- {k}: {v}" for k, v in FILES.items())
    hist = ""
    if said:
        hist = "\n\nWHAT HAS ALREADY BEEN SAID IN THIS SITTING:\n" + \
               "\n".join(f"- {s}" for s in said[-6:])
    user = f"THE THREE FILES:\n{lines}{hist}\n\nTHE ASK:\n{ask}"
    out = _json_from(_call("setup_router", prompt("setup_router"), user, max_tokens=600)) or {}
    f = out.get("file", "")
    return {"file": f if f in FILES else "", "ask": out.get("ask", ask).strip() or ask,
            "why": (out.get("why") or "").strip()}


WORKER = {"container.html": "setup_look", "config.md": "setup_config", "spec.md": "setup_spec"}


def propose(file, ask, folder, brand):
    """The scoped robot: its own file, and nothing else. Returns whatever it
    said, unvalidated — check() below is what decides."""
    text = _folder_file(folder, file)
    if not text:
        return {"op": "park", "say": f"There is no {file} in this folder to change."}
    extra = ""
    if file == "container.html":
        # the lines whole, not a parsed list — they say which face does which
        # job and what the fallbacks are, and that is what the robot needs
        lines = font_lines(brand)
        extra = ("\n\nWHAT THE BRAND DECLARES ABOUT TYPE. These lines are the only "
                 "faces this container may wear:\n" + ("\n".join(f"- {l}" for l in lines)
                                                        or "- nothing declared"))
    user = f"THE FILE — {file}:\n\n{text}{extra}\n\nTHE ASK:\n{ask}"
    # THE CEILING, and v048's lesson applied here before it bites. A section
    # rewrite of config.md's FEED IT is thousands of characters; at a low
    # ceiling the API returns SUCCESS with the JSON stopped mid-word, the
    # parse returns None, and this function says "I couldn't work out a
    # change small enough to be safe" — which would be a lie about a
    # truncation. A ceiling is a seatbelt, not a budget.
    return _json_from(_call(WORKER[file], prompt(WORKER[file]), user, max_tokens=6000)) or \
        {"op": "park", "say": "I couldn't work out a change small enough to be safe."}


# ---------------------------------------------------------------------------
# CHECKING WHAT IT SAID — before anything is written and before you see it
# ---------------------------------------------------------------------------

def check(file, said, folder, brand):
    """Turn a model's answer into a proposal a human can confirm, or into a
    park. Every 'before' is read off the file — never taken from the model,
    which has no way of knowing what is on disk and every incentive to
    sound sure."""
    op = (said.get("op") or "").strip().lower()
    say = (said.get("say") or "").strip()
    if op not in OPS.get(file, set()):
        return {"park": True, "say": say or "That one's beyond what I can change in here."}

    path = os.path.join(folder, file)

    if op == "css":
        sel = (said.get("selector") or "").strip()
        # one declaration or a few, and a few is the normal case: "full bleed"
        # is a negative margin AND a border AND a radius, and asking for the
        # same idea three times is not a conversation. They must sit on ONE
        # rule and be ONE intent — this is not a licence to restyle.
        decls = said.get("decls")
        if not isinstance(decls, list) or not decls:
            decls = [{"prop": said.get("prop", ""), "value": said.get("value", "")}]
        clean = []
        for d in decls[:MAX_DECLS]:
            pr = (d.get("prop") or "").strip()
            va = (d.get("value") or "").strip()
            if pr and va:
                clean.append({"prop": pr, "value": va})
        if not sel or not clean:
            return {"park": True, "say": say or "I couldn't pin that to one rule."}

        befores = []
        for d in clean:
            was = setup_edit.read_css(path, sel, d["prop"])
            if not was:
                return {"park": True,
                        "say": f"There's no `{d['prop']}` on `{sel}` to change. Adding one is a "
                               f"bigger call than a tickle."}
            befores.append(was)

        # THE FONT GATE — the brand owns the faces; the container rearranges
        # inside what it declares and never imports into it.
        for d, was in zip(clean, befores):
            if looks_like_faces(d["prop"], was, d["value"]):
                strays = undeclared(d["value"], brand)
                if strays:
                    names = ", ".join(strays)
                    return {"park": True, "gate": "font",
                            "say": f"{names} isn't a face {brand.get('name', 'the brand')} declares. "
                                   f"The chat can move the brand's own faces around; it can't "
                                   f"import one. Either it belongs in the brand — which is a "
                                   f"brand edit — or this container departs on purpose, and "
                                   f"there's nowhere yet to say so."}

        # ...AND WHAT YOU WILL ACTUALLY SEE. A face this artefact never loads
        # does not render, so the change is real in the file and invisible on
        # screen. Say that here rather than let the room claim a change you
        # cannot see — that is the one thing it must never do.
        note = ""
        html = _folder_file(folder, "container.html")
        for d in clean:
            if not looks_like_faces(d["prop"], "", d["value"]):
                continue
            wanted = _families(d["value"])
            lands = lands_on(d["value"], html)
            if wanted and lands and lands.lower() != wanted[0].lower():
                note = (f"You won't see this: nothing in container.html loads "
                        f"{wanted[0]}, so it falls back to {lands}. Real in the file, "
                        f"same on screen.")
            elif wanted and not lands:
                note = (f"You won't see this: nothing in container.html loads "
                        f"{wanted[0]}, and there's no fallback it can reach.")

        label = f"{sel} · {clean[0]['prop']}" if len(clean) == 1 else \
                f"{sel} · {len(clean)} declarations"
        return {"park": False, "op": "css", "file": file,
                "args": {"selector": sel, "decls": clean},
                "before": "\n".join(f"{d['prop']}: {w}" for d, w in zip(clean, befores)),
                "after": "\n".join(f"{d['prop']}: {d['value']}" for d in clean),
                "label": label, "note": note, "say": say}

    if op == "section":
        heading = (said.get("heading") or "").strip()
        body = (said.get("body") or "").rstrip()
        if not heading or not body.strip():
            return {"park": True, "say": say or "Nothing to write."}
        before = CT._section(_folder_file(folder, file), heading)
        if before is None:
            return {"park": True, "say": f"There's no `## {heading}` in {file}."}
        return {"park": False, "op": "section", "file": file,
                "args": {"heading": heading, "value": body},
                "before": before.strip(), "after": body.strip(),
                "label": f"## {heading}", "say": say}

    if op == "cell":
        row = (said.get("row") or "").strip()
        col = (said.get("column") or "").strip()
        val = (said.get("value") or "").strip()
        if not row or not col or not val:
            return {"park": True, "say": say or "I couldn't pin that to one cell."}
        before = _cell_now(_folder_file(folder, file), row, col)
        if before is None:
            return {"park": True, "say": f"No row `{row}` with a `{col}` column in {file}."}
        return {"park": False, "op": "cell", "file": file,
                "args": {"row": row, "column": col, "value": val},
                "before": before, "after": val,
                "label": f"{row} · {col}", "say": say}

    if op == "line":
        key = (said.get("key") or "").strip()
        val = (said.get("value") or "").strip()
        m = re.search(r"^\*\*" + re.escape(key) + r":\*\*[ \t]*(.*)$",
                      _folder_file(folder, file), re.M)
        if not key or not val or not m:
            return {"park": True, "say": say or f"There's no **{key}:** line in {file}."}
        return {"park": False, "op": "line", "file": file,
                "args": {"key": key, "value": val},
                "before": m.group(1).strip(), "after": val,
                "label": f"**{key}:**", "say": say}

    return {"park": True, "say": say or "That one's beyond what I can change in here."}


def _cell_now(text, row_id, column):
    """What one cell says today, found the way set_cell finds it — column by
    its header, row by its id, never by counting pipes."""
    head = col = None
    for ln in text.split("\n"):
        if ln.strip().startswith("|") and head is None:
            cells = [c.strip().lower() for c in ln.strip().strip("|").split("|")]
            if column.strip().lower() in cells:
                head, col = ln, cells.index(column.strip().lower())
            continue
        if head is None or not ln.strip().startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if cells and cells[0] == row_id and col < len(cells):
            return cells[col]
    return None


# ---------------------------------------------------------------------------
# APPLYING ONE — through setup_edit, and only through setup_edit
# ---------------------------------------------------------------------------

def apply(proposal, folder):
    """Write it. Returns the changelog sentence. Raises setup_edit.EditError
    exactly as the hand-edited fields do, so both lanes fail the same way."""
    file = proposal["file"]
    path = os.path.join(folder, file)
    a = proposal["args"]
    op = proposal["op"]
    if op == "css":
        for d in a["decls"]:
            setup_edit.set_css(path, a["selector"], d["prop"], d["value"])
        bits = ", ".join(f"{d['prop']} to {d['value']}" for d in a["decls"])
        return f"{a['selector']}: {bits}, in {file}."
    if op == "section":
        setup_edit.set_section(path, a["heading"], a["value"])
        return f"{a['heading']} rewritten in {file}."
    if op == "cell":
        setup_edit.set_cell(path, a["row"], a["column"], a["value"])
        return f"{a['row']}'s {a['column']} rewritten in {file}."
    if op == "line":
        setup_edit.set_line(path, a["key"], a["value"])
        return f"The {a['key']} line rewritten in {file}."
    raise setup_edit.EditError("noop")


# ---------------------------------------------------------------------------
# THE CHECK THAT HAS NEVER EXISTED
#
# containers.py has always checked that a brand's named files are present. It
# has never compared what a container WEARS against what its brand declares,
# which is how prize_draw came to put Hunch's Bebas on a One NZ artefact with
# a comment that was true when it was written and isn't now.
#
# This is not a problem and it does not refuse the lock — the MUST list is
# the validator's and promoting a shelf here without promoting the check
# there is the one rule this room isn't allowed to break. It's a line in the
# chat: here is what you're wearing that the brand has never named. Sometimes
# that's a mistake. Sometimes it's deliberate and there's nowhere to say so,
# which is what `## Open` is for.
# ---------------------------------------------------------------------------

def strays_in_html(html, brand):
    """Every type declaration in the stylesheet naming a face the brand
    doesn't declare, as (selector, prop, the strays)."""
    style = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html or "", re.S))
    out = []
    for m in setup_edit._RULE.finditer(style):
        sels = [s.split("\n")[-1].strip() for s in m.group(1).split(",")]
        sel = next((s for s in sels if s), "")
        for d in re.finditer(r"(^|[;\s])(--?[\w-]+)\s*:\s*([^;]+)", m.group(2)):
            prop, val = d.group(2), d.group(3).strip()
            if not looks_like_faces(prop, val):
                continue
            strays = undeclared(val, brand)
            if strays:
                out.append({"selector": sel, "prop": prop, "value": val, "strays": strays})
    return out
