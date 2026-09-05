"""
ROBOT — THE PROJECT BRIEF
=========================
What this room is FOR, in one line: checking. Not fixing.

Every real fault a container has ever had has been structural — a folder
built from a screenshot instead of the artefact, a module that isn't there,
a face the brand never declared. None of those are a tickle, and a chat that
edits one declaration at a time was never going to reach them. They get
fixed in the folder, by the project that builds folders, once — and then the
next twelve containers are right too.

So the loop is:

    look at it  ->  say what's wrong  ->  the robot parks what it can't do
                ->  THIS, out of the folder  ->  the files come back fixed
                ->  drop the zip in  ->  push

This writes the brief. Two halves, and the order matters: what MICHAEL said
comes first, verbatim, because it is the only part nobody else could have
written. What the checker found comes second, because it is derivable and
the person reading this can re-derive it any time.

Nothing here is a judgement. The validator's problems are the validator's
words; the parked notes are his words; the strays are a comparison, not an
opinion. If this file ever starts explaining what it thinks should happen,
that is the bug.
"""

import datetime


def _bullets(lines):
    return "\n".join(f"- {l}" for l in lines)


def write(c, brand, problems, strays, opens):
    """The brief for one container, as markdown.

    `c` is the parsed container, `brand` its brand dict, and the other three
    are what the room already knows — passed in rather than recomputed, so
    the brief can never disagree with the screen it was written from."""
    cid = c.get("id", "")
    name = c.get("name", cid)
    when = datetime.date.today().strftime("%-d %B %Y")
    art = c.get("artefact", {}) or {}
    spec = c.get("spec", {}) or {}

    out = [f"# SET UP — {name}",
           f"*`{cid}` · brand `{c.get('brand','')}` · {c.get('format','')} · "
           f"{c.get('status','')}. Checked {when}.*", ""]

    out += ["## What I want changed", ""]
    if opens:
        # grouped the way it was walked — "Mock up — the hero should bleed"
        # arrives under Mock up, and anything unprefixed keeps its place.
        groups, loose = {}, []
        for o in opens:
            head, sep, rest = o.partition(" — ")
            if sep and len(head) < 24:
                groups.setdefault(head, []).append(rest)
            else:
                loose.append(o)
        for head, lines in groups.items():
            out += [f"**{head}**", "", _bullets(lines), ""]
        if loose:
            out += [_bullets(loose), ""]
    else:
        out += ["*(nothing parked — the notes go here when you park them "
                "in the room)*", ""]

    out += ["## What the checker found", ""]

    if problems:
        out += [f"### {len(problems)} problem" + ("" if len(problems) == 1 else "s")
                + " — these refuse the push", "", _bullets(problems), ""]
    else:
        out += ["### Problems", "", "None. It reads clean — which is not the "
                "same as right.", ""]

    if strays:
        out += ["### Wearing a face the brand doesn't declare", ""]
        out += [_bullets(f"**{s['strays'][0] if len(s['strays'])==1 else ', '.join(s['strays'])}** "
                         f"— `{s['selector']}` `{s['prop']}: {s['value']}`" for s in strays)]
        out += ["", f"`brands/{c.get('brand','')}/brandlook.md` declares:", ""]
        for f in (brand.get("skin", {}) or {}).get("fonts", []):
            role = (f.get("role") or "").strip()
            out.append(f"- **Font{' — ' + role if role else ''}:** {f.get('text','')}")
        out.append("")

    # the numbers somebody rebuilding the folder will want in front of them
    mods = art.get("modules", [])
    rows = spec.get("modules", [])
    out += ["### The folder as it stands", "",
            f"- `container.html` — {len(mods)} `data-module` tags",
            f"- `spec.md` — {len(rows)} module rows, "
            f"{len(spec.get('outputs', []))} output" + ("" if len(spec.get('outputs', [])) == 1 else "s"),
            f"- `config.md` — {len(c.get('legals', {}).get('base', []))} standard clauses, "
            f"{len(c.get('legals', {}).get('extras', []))} optional",
            ""]

    out += ["---", "", "*Written by SET UP. The notes are Michael's, verbatim; "
            "everything under the second heading is the checker's and can be "
            "re-derived by opening the folder.*"]
    return "\n".join(out).rstrip() + "\n"
