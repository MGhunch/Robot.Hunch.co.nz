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


# ---------------------------------------------------------------------------
# THE FONT GATE
#
# What the brand declares is the palette. The container may rearrange inside
# it and may not import into it. This is the check that has never existed:
# containers.py has always checked that a brand's named FILES are present,
# and never once compared what a container actually WEARS against what its
# brand declares.
# ---------------------------------------------------------------------------

def declared_faces(brand):
    """Every face the brand's **Font:** lines name, fallbacks included — a
    fallback is a declaration too, and Arial on a One NZ email is there on
    purpose."""
    out = set()
    for f in (brand.get("skin", {}) or {}).get("fonts", []):
        text = f.get("text", "") or ""
        head = re.split(r"[.`(]", text, 1)[0].strip()
        if head:
            out.add(head)
        for m in re.finditer(r"[Ff]allbacks?:\s*([^.(`,;\n]+)", text):
            out.add(m.group(1).strip())
    return {x for x in out if x}


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


def undeclared(value, faces):
    """The families in this value that the brand has never named."""
    low = {f.lower() for f in faces} | GENERIC
    return [f for f in _families(value) if f.lower() not in low]


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
        faces = sorted(declared_faces(brand))
        extra = ("\n\nTHE FACES THE BRAND DECLARES, and the only ones this container "
                 "may wear:\n" + ("\n".join(f"- {f}" for f in faces) or "- none declared"))
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
        prop = (said.get("prop") or "").strip()
        val = (said.get("value") or "").strip()
        if not sel or not prop or not val:
            return {"park": True, "say": say or "I couldn't pin that to one declaration."}
        before = setup_edit.read_css(path, sel, prop)
        if not before:
            return {"park": True,
                    "say": f"There's no `{prop}` on `{sel}` to change. Adding one is a "
                           f"bigger call than a tickle."}
        if looks_like_faces(prop, before, val):
            faces = declared_faces(brand)
            strays = undeclared(val, faces)
            if strays:
                names = ", ".join(strays)
                return {"park": True, "gate": "font",
                        "say": f"{names} isn't a face {brand.get('name', 'the brand')} declares. "
                               f"The chat can move the brand's own faces around; it can't "
                               f"import one. Either it belongs in the brand — which is a "
                               f"brand edit — or this container departs on purpose, and "
                               f"there's nowhere yet to say so."}
        return {"park": False, "op": "css", "file": file,
                "args": {"selector": sel, "prop": prop, "value": val},
                "before": before, "after": val,
                "label": f"{sel} · {prop}", "say": say}

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
        setup_edit.set_css(path, a["selector"], a["prop"], a["value"])
        return f"{a['prop']} on {a['selector']} set to {a['value']} in {file}."
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
    faces = declared_faces(brand)
    style = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html or "", re.S))
    out = []
    for m in setup_edit._RULE.finditer(style):
        sels = [s.split("\n")[-1].strip() for s in m.group(1).split(",")]
        sel = next((s for s in sels if s), "")
        for d in re.finditer(r"(^|[;\s])(--?[\w-]+)\s*:\s*([^;]+)", m.group(2)):
            prop, val = d.group(2), d.group(3).strip()
            if not looks_like_faces(prop, val):
                continue
            strays = undeclared(val, faces)
            if strays:
                out.append({"selector": sel, "prop": prop, "value": val, "strays": strays})
    return out
