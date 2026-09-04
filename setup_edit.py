"""
ROBOT — EDITING A DROPPED FOLDER
================================
The check page can change what it's holding. This is how, and the rule it
obeys is one line long:

    EDITS ARE SURGICAL. NEVER REGENERATE A FILE.

Replace the hex inside its line. Replace one **Key:** line. Replace the body
under one ## heading. Replace one cell in one table row. Everything else in
the file — the comments, the ordering, the prose the schema deliberately
carries through for humans, the blank lines someone put there on purpose —
comes out the far side untouched. Rebuild a file from its parsed shape and
you lose all of that silently, and nobody notices for three weeks.

Only ever writes inside the session's scratch. brands/ and containers/ in
the repo are never opened by this file.

Every successful edit adds a dated line to the folder's own changelog, so a
folder that has been fiddled with says so. That is the schema's rule for
brand.md and config.md, applied by the thing doing the fiddling.
"""

import datetime
import os
import re


class EditError(Exception):
    """Carries the code the front end turns into words."""


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def _bold_line(text, key):
    """The one `**Key:** value` line, as (start, end, value). The key is
    matched exactly, dashes and all, because `Font` and `Font — body` are
    different lines and confusing them is the bug this page was built to
    catch."""
    for m in re.finditer(r"^\*\*([^*]+?):\*\*[ \t]*(.*)$", text, re.M):
        if m.group(1).strip() == key.strip():
            return m
    raise EditError("noline")


# ---------------------------------------------------------------------------
# THE FOUR EDITS
# ---------------------------------------------------------------------------

def set_hex(path, key, value):
    """The hex inside a colour line, and nothing else on it. The line keeps
    its name for the colour, its RGB, its CMYK and whatever else the human
    wrote there — the reader only ever took the hex, and so do we."""
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", value.strip()):
        raise EditError("nothex")
    text = _read(path)
    m = _bold_line(text, key)
    line = m.group(0)
    if not re.search(r"#[0-9A-Fa-f]{6}", line):
        raise EditError("nohexthere")
    fixed = re.sub(r"#[0-9A-Fa-f]{6}", value.strip().upper(), line, count=1)
    _write(path, text[:m.start()] + fixed + text[m.end():])
    return fixed.strip()


def set_line(path, key, value):
    """A whole `**Key:** value` line — the fonts, the logo, the mark. The
    value is prose: a family, its weights, the files it names, a fallback.
    There is no field in there to edit, so the line is the field."""
    value = " ".join(value.split("\n")).strip()
    if not value:
        raise EditError("empty")
    text = _read(path)
    m = _bold_line(text, key)
    fixed = f"**{key}:** {value}"
    _write(path, text[:m.start()] + fixed + text[m.end():])
    return fixed


def set_section(path, heading, body):
    """The body under one `## Heading`, up to the next one. The heading line
    itself never moves — the reader keys off it, and a renamed heading is a
    missing section as far as it's concerned."""
    body = body.rstrip()
    if not body.strip():
        raise EditError("empty")
    text = _read(path)
    pat = re.compile(r"^##[ \t]+(?!#)(.*)$", re.M)
    hits = list(pat.finditer(text))
    for i, m in enumerate(hits):
        if m.group(1).strip().lower() != heading.strip().lower():
            continue
        end = hits[i + 1].start() if i + 1 < len(hits) else len(text)
        tail = text[end:]
        joiner = "\n\n" if tail else "\n"
        _write(path, text[:m.end()] + "\n\n" + body + joiner + tail)
        return body
    raise EditError("nosection")


def set_cell(path, row_id, column, value):
    """One cell of one row of the one table in a clause library. Markdown
    tables are positional, so the column is found in the header and the row
    by its id — never by counting pipes and hoping."""
    value = " ".join(value.split("\n")).strip()
    text = _read(path)
    lines = text.split("\n")
    head = col = None
    for i, ln in enumerate(lines):
        if ln.strip().startswith("|") and head is None:
            cells = [c.strip().lower() for c in ln.strip().strip("|").split("|")]
            if column.strip().lower() in cells:
                head, col = i, cells.index(column.strip().lower())
            continue
        if head is None or not ln.strip().startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if not cells or cells[0] != row_id:
            continue
        if col >= len(cells):
            raise EditError("nocell")
        cells[col] = value.replace("|", "\\|")
        lines[i] = "| " + " | ".join(cells) + " |"
        _write(path, "\n".join(lines))
        return cells[col]
    raise EditError("norow")


# ---------------------------------------------------------------------------
# THE CHANGELOG — a folder that's been fiddled with says so
# ---------------------------------------------------------------------------

def log(folder, manifest, what):
    """Append a dated line under **Changelog** and bump the manifest's
    version by a point. Both files that carry a manifest — brand.md and
    config.md — use the same shape, so this does."""
    path = os.path.join(folder, manifest)
    if not os.path.isfile(path):
        return ""
    text = _read(path)
    ver = ""
    m = re.search(r"^version:[ \t]*(.+)$", text, re.M)
    if m:
        ver = m.group(1).strip()
        try:
            head, tail = ver.rsplit(".", 1) if "." in ver else (ver, "0")
            ver = f"{head}.{int(tail) + 1}"
        except ValueError:
            ver = ver + ".1"
        text = text[:m.start()] + f"version: {ver}" + text[m.end():]
    day = datetime.date.today().strftime("%-d %B %Y")
    line = f"- v{ver or '?'} — {day} — {what} Changed in SET UP CHECK."
    m = re.search(r"^\*\*Changelog\*\*[ \t]*$", text, re.M)
    if m:
        text = text[:m.end()] + "\n" + line + text[m.end():]
    else:
        text = text.rstrip() + "\n\n**Changelog**\n" + line + "\n"
    _write(path, text)
    return ver
