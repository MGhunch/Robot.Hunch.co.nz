"""
ROBOT — THE READER
==================
brands/<id>/ and containers/<id>/ are the product. This reads them.

    brands/<id>/        brand.md  voice.md  skin.md  assets/
    containers/<id>/    config.md spec.md   <id>.html

Every folder compiles to one dict: the manifest, the FEED IT words, the
needs list (checklist rows, grouped, with repeats), the clause library,
the modules and limits, the voice lean, the rules, the module tags found
in the html. The engine reads the dict; nothing per-container lives in
code. Compiled JSON is cached beside the folder and rebuilt when any file
in it changes, so a folder is parsed once, not per call.

The validator is the reader in strict mode: it collects every reason a
folder can't run and reports them all at once. A folder that bounces
still lands, as testing, so it can be fixed in place.

The schema this parses is SCHEMA-v3.md in the SET UPs project. Section
names and table columns are keyed off exactly; the reader is deliberately
dumb about prose — it carries prose through as text for the prompts and
never tries to understand it.
"""

import os
import re
import json
import glob

ROOT = os.path.dirname(os.path.abspath(__file__))
BRANDS_DIR = os.environ.get("ROBOT_BRANDS", os.path.join(ROOT, "brands"))
CONTAINERS_DIR = os.environ.get("ROBOT_CONTAINERS", os.path.join(ROOT, "containers"))

# derived placeholders the engine supplies itself; clauses may use them
# without a NEEDS row (see SCHEMA-v3 "The validator bounces on")
DERIVED_SUFFIXES = ("_day", "_date", "_time", "_long", "_short", "_word", "_cap")
ENGINE_FACTS = {"year"}


# ---------------------------------------------------------------------------
# MARKDOWN — the little bit of parsing the schema needs
# ---------------------------------------------------------------------------

def _sections(text, level=2):
    """Split on headings of exactly this level. Returns [(title, body)].
    Text before the first heading comes back under title ''."""
    pat = re.compile(r"^" + "#" * level + r" (?!#)(.*)$", re.M)
    out, last, title = [], 0, ""
    for m in pat.finditer(text):
        out.append((title, text[last:m.start()]))
        title, last = m.group(1).strip(), m.end()
    out.append((title, text[last:]))
    return [(t, b.strip()) for t, b in out]


def _section(text, name, level=2):
    """First section whose title starts with name (case-insensitive)."""
    for t, b in _sections(text, level):
        if t.lower().startswith(name.lower()):
            return b
    return None


def _tables(text):
    """Every pipe table in the text: [{'cols': [...], 'rows': [{col: val}]}].
    Column names are lowercased; the header separator row is skipped."""
    tables, cur = [], None
    for line in text.split("\n"):
        s = line.strip()
        if s.startswith("|") and s.endswith("|"):
            cells = [c.strip() for c in s[1:-1].split("|")]
            if cur is None:
                cur = {"cols": [c.lower() for c in cells], "rows": []}
            elif all(re.fullmatch(r":?-+:?", c) for c in cells if c):
                continue
            else:
                cells += [""] * (len(cur["cols"]) - len(cells))
                cur["rows"].append(dict(zip(cur["cols"], cells)))
        else:
            if cur is not None:
                tables.append(cur)
                cur = None
    if cur is not None:
        tables.append(cur)
    return tables


def _table(text):
    t = _tables(text)
    return t[0] if t else {"cols": [], "rows": []}


def _bullets(text):
    return [re.sub(r"^[-*]\s+", "", l.strip()) for l in text.split("\n")
            if re.match(r"^[-*]\s+", l.strip())]


def _kv(text):
    """The manifest: key: value lines at the top of a file."""
    out = {}
    for line in text.split("\n"):
        m = re.match(r"^([a-z_]+):\s+(.*)$", line.strip())
        if m:
            out[m.group(1)] = m.group(2).strip()
        elif out and line.strip() == "":
            break
    return out


def _bold_lines(text):
    """**Key:** value lines -> {key: value}."""
    return {m.group(1).strip(): m.group(2).strip()
            for m in re.finditer(r"^\*\*([^*]+?):\*\*\s*(.*)$", text, re.M)}


def _yes(v):
    return (v or "").strip().lower() in ("yes", "y", "on", "true")


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _mtime_of(folder):
    """Newest mtime under the folder, ignoring the cache file."""
    latest = 0
    for p in glob.glob(os.path.join(folder, "**", "*"), recursive=True):
        if p.endswith(".compiled.json"):
            continue
        try:
            latest = max(latest, os.path.getmtime(p))
        except OSError:
            pass
    return latest


# ---------------------------------------------------------------------------
# BRAND
# ---------------------------------------------------------------------------

def _parse_brand(folder, bid, problems):
    b = {"id": bid, "folder": folder, "voice": "", "skin": {}, "assets": []}
    for req in ("brand.md", "voice.md", "skin.md"):
        if not os.path.isfile(os.path.join(folder, req)):
            problems.append(f"brand {bid}: {req} is missing")
    if problems:
        return b
    man = _kv(_read(os.path.join(folder, "brand.md")))
    b["name"] = man.get("name", bid)
    b["version"] = man.get("version", "")
    if man.get("id") and man["id"] != bid:
        problems.append(f"brand {bid}: brand.md says id {man['id']}; the folder name wins")

    voice = _read(os.path.join(folder, "voice.md"))
    b["voice"] = voice.strip()
    for need in ("pillars", "Hard rules", "Guardrail"):
        if not any(need.lower() in t.lower() for t, _ in _sections(voice)):
            problems.append(f"brand {bid}: voice.md has no '## {need}' section")
    if "- More:" not in voice or "- Less:" not in voice:
        problems.append(f"brand {bid}: voice.md pillars need More/Less proof")

    skin = _read(os.path.join(folder, "skin.md"))
    kv = _bold_lines(skin)
    tokens = {}
    for k, v in kv.items():
        m = re.search(r"#[0-9A-Fa-f]{6}", v)
        if m:
            tokens[k.lower().replace(" ", "_")] = m.group(0)
    b["skin"] = {"font": kv.get("Font", ""), "logo": kv.get("Logo", ""), "tokens": tokens}
    # legals.md — the brand's clause library (optional; validated if named)
    b["legals"] = []
    lp = os.path.join(folder, "legals.md")
    if os.path.isfile(lp):
        for r in _table(_read(lp))["rows"]:
            b["legals"].append({"id": r.get("id", ""), "fixed": _yes(r.get("fixed")),
                                "default": _yes(r.get("default")) if r.get("default") else True,
                                "label": r.get("label", ""), "text": r.get("text", "")})
    assets_dir = os.path.join(folder, "assets")
    b["assets"] = sorted(os.listdir(assets_dir)) if os.path.isdir(assets_dir) else []
    if not os.path.isdir(assets_dir):
        problems.append(f"brand {bid}: assets/ folder is missing")
    # every filename skin.md names must exist
    for fn in re.findall(r"assets/([\w.\-]+\.\w+)", skin):
        if fn not in b["assets"]:
            # "pending" / "still to come" is the schema's honest escape hatch
            line = next((l for l in skin.split("\n") if fn in l), "")
            if not re.search(r"pending|still to come|to come", line, re.I):
                problems.append(f"brand {bid}: skin.md names assets/{fn} but it isn't there")
    return b


# ---------------------------------------------------------------------------
# CONTAINER — config.md
# ---------------------------------------------------------------------------

def _parse_needs(text, problems, cid):
    """## NEEDS -> groups. Each ### is a group; 'EACH X (repeats ...)' marks a
    repeating group, 'where type = prize' a condition on the repeat."""
    groups, fixed, open_ = [], [], []
    for title, body in _sections(text, 3):
        if not title:
            continue
        tl = title.lower()
        if tl.startswith("fixed"):
            fixed = _bullets(body)
            continue
        if tl.startswith("open"):
            open_ = _bullets(body)
            continue
        tab = _table(body)
        g = {"title": re.sub(r"\s*\(.*\)$", "", title), "rows": [], "repeat": None, "prose": ""}
        m = re.match(r"(?:EACH )?(.+?)\s*\(repeats(?: per (\w+))?(.*)\)$", title, re.I)
        if m:
            # "EACH CARD (repeats per card, 1–5)" or "THE LINEUP (repeats per story, 3–5)"
            per = (m.group(2) or m.group(1)).strip().lower()
            rep = {"per": per, "min": 1, "max": 5, "where": None}
            rng = re.search(r"(\d+)\s*[–-]\s*(\d+)", m.group(3))
            if rng:
                rep["min"], rep["max"] = int(rng.group(1)), int(rng.group(2))
            w = re.search(r"where\s+(\w+)\s*=\s*(\w+)", m.group(3))
            if w:
                # "where type = prize" names a row loosely; resolve it to
                # the real id (card_type) once all groups are read
                rep["where"] = {"row": w.group(1), "is": w.group(2)}
            g["repeat"] = rep
        for need in ("id", "label", "type", "ask"):
            if tab["rows"] and need not in tab["cols"]:
                problems.append(f"{cid}: NEEDS group '{title}' has no '{need}' column")
        for r in tab["rows"]:
            row = {
                "id": r.get("id", ""),
                "label": r.get("label", ""),
                "type": r.get("type", ""),
                "locked": _yes(r.get("locked")),
                "ask": r.get("ask", ""),
                "notsure": r.get("not-sure line", ""),
                "diggable": _yes(r.get("diggable")),
                "unit": r.get("unit", ""),
            }
            for opt in ("sub", "when", "derive", "after"):
                if r.get(opt):
                    row[opt] = r[opt]
            # dropdown options: "dropdown: a / b / c" or "dropdown 3–5"
            t = row["type"]
            if t.startswith("dropdown"):
                if ":" in t:
                    row["type"] = "select"
                    row["options"] = [o.strip() for o in t.split(":", 1)[1].split("/")]
                else:
                    rng = re.search(r"(\d+)\s*[–-]\s*(\d+)", t)
                    row["type"] = "select"
                    row["options"] = [str(n) for n in range(int(rng.group(1)), int(rng.group(2)) + 1)] if rng else []
            elif t.startswith("checkboxes"):
                row["type"] = "legals"
            elif t.startswith("topics"):
                row["type"] = "topics"
            g["rows"].append(row)
        # prose after the table (e.g. prize_name by type) rides along for humans
        after = body.split("\n\n", 1)
        g["prose"] = after[1].strip() if len(after) > 1 and "|" not in after[1][:2] else ""
        groups.append(g)
    ids = [r["id"] for g in groups for r in g["rows"]]
    for g in groups:
        w = (g["repeat"] or {}).get("where")
        if w and w["row"] not in ids:
            hit = next((i for i in ids if i.endswith("_" + w["row"]) or i == w["row"]), None)
            if hit:
                w["row"] = hit
            else:
                problems.append(f"{cid}: NEEDS group '{g['title']}' repeats where '{w['row']}' = "
                                f"{w['is']}, but no row has that id")
    return {"groups": groups, "fixed": fixed, "open": open_}


def _parse_legals(text, problems, cid):
    """## LEGALS -> the clause library. Tables keyed by section title."""
    lib = {"facts": "", "base": [], "conditional": [], "extras": [], "footer": "",
           "by_type": [], "open": [], "prose": {}, "fixed_title": "Standard legals"}
    ft = re.search(r"^fixed_title:\s*(.+)$", text, re.M)
    if ft:
        lib["fixed_title"] = ft.group(1).strip()
    for title, body in _sections(text, 3):
        tl = title.lower()
        if not title:
            continue
        if tl.startswith("facts"):
            lib["facts"] = body
        elif tl.startswith(("standard", "base")):
            for r in _table(body)["rows"]:
                lib["base"].append({"id": r.get("id", ""), "fixed": _yes(r.get("fixed")),
                                    "default": _yes(r.get("default")) if r.get("default") else True,
                                    "label": r.get("label", ""), "text": r.get("text", "")})
            lib["prose"]["base"] = "\n".join(l for l in body.split("\n") if not l.strip().startswith("|")).strip()
        elif tl.startswith("per card"):
            for r in _table(body)["rows"]:
                lib["conditional"].append({"id": r.get("id", ""), "title": r.get("title", ""),
                                           "text": r.get("text", ""), "fires": "per prize card"})
        elif tl.startswith("by prize type"):
            # blocks: **type** — label / prize_line / needs / table of extras
            for m in re.finditer(r"\*\*(\w+)\*\*\s*—\s*(.*?)\n(.*?)(?=\n\*\*\w+\*\*\s*—|\Z)", body, re.S):
                ptype, label, blk = m.group(1), m.group(2).strip(), m.group(3)
                pl = re.search(r"prize_line:\s*(.*)", blk)
                nd = re.search(r"needs:\s*(.*)", blk)
                cn = re.search(r"counts:\s*(.*)", blk)      # the noun a number fact wears
                extras = []
                for r in _table(blk)["rows"]:
                    extras.append({"id": r.get("id", ""), "after": r.get("after", ""),
                                   "fixed": False, "default": _yes(r.get("default")),
                                   "label": r.get("label", ""), "text": r.get("text", "")})
                needs = [] if not nd or "nothing" in nd.group(1) else \
                    [n.strip() for n in nd.group(1).split(",")]
                lib["by_type"].append({"type": ptype, "label": label,
                                       "line": pl.group(1).strip() if pl else "",
                                       "counts": cn.group(1).strip() if cn else "",
                                       "needs": needs, "extra": extras})
        elif tl.startswith("extras"):
            for r in _table(body)["rows"]:
                lib["extras"].append({"id": r.get("id", ""), "label": r.get("title", ""),
                                      "default": _yes(r.get("default")), "text": r.get("text", "")})
        elif tl.startswith("by offer type"):
            lib["by_offer"] = _bullets(body)
        elif tl.startswith("footer"):
            lib["footer"] = body.strip()
        elif tl.startswith("open"):
            lib["open"] = _bullets(body)
        else:
            lib["prose"][title] = body
    return lib


def _parse_config(text, cid, problems):
    c = {}
    man = _kv(text)
    for k in ("name", "brand", "format", "status"):
        if k not in man:
            problems.append(f"{cid}: config.md manifest has no '{k}:' line")
    c.update({"name": man.get("name", cid), "client": man.get("client", ""),
              "brand": man.get("brand", ""), "format": man.get("format", ""),
              "version": man.get("version", ""), "status": man.get("status", "testing")})
    if c["status"] not in ("testing", "live"):
        problems.append(f"{cid}: status is '{c['status']}', must be testing or live")
    head = _bold_lines(_sections(text)[0][1])
    c["purpose"] = head.get("Purpose", "")

    feed = _section(text, "FEED IT")
    if feed is None:
        problems.append(f"{cid}: config.md has no '## FEED IT'")
        feed = ""
    fi = {"dump": "", "needs": "", "moves": [], "closing": ""}
    for title, body in _sections(feed, 3):
        tl = title.lower()
        if tl.startswith("what a good dump"):
            fi["dump"] = body
        elif tl.startswith("what the container needs"):
            fi["needs"] = body
        elif tl.startswith("bounce it"):
            for r in _table(body)["rows"]:
                try:
                    n = int(r.get("move", "0"))
                except ValueError:
                    n = 0
                fi["moves"].append({"n": n, "job": r.get("job", ""), "plain": r.get("plain", ""),
                                    "placeholder": r.get("placeholder", ""), "why": r.get("why", "")})
        elif tl.startswith("closing"):
            fi["closing"] = body.strip()
    for k, want in (("dump", "What a good dump looks like"), ("needs", "What the container needs"),
                    ("closing", "Closing line")):
        if not fi[k]:
            problems.append(f"{cid}: FEED IT has no '### {want}'")
    if len(fi["moves"]) != 3:
        problems.append(f"{cid}: FEED IT 'Bounce it' needs exactly three moves, found {len(fi['moves'])}")
    c["feed_it"] = fi

    needs = _section(text, "NEEDS")
    if needs is None:
        problems.append(f"{cid}: config.md has no '## NEEDS'")
        needs = ""
    c["needs"] = _parse_needs(needs, problems, cid)

    legals = _section(text, "LEGALS")
    if legals is None:
        problems.append(f"{cid}: config.md has no '## LEGALS'")
        legals = ""
    c["legals"] = _parse_legals(legals, problems, cid)

    # ids: unique, and every {placeholder} in a clause resolves
    ids = [r["id"] for g in c["needs"]["groups"] for r in g["rows"]]
    for i in set(ids):
        if ids.count(i) > 1:
            problems.append(f"{cid}: NEEDS id '{i}' appears more than once")
    known = set(ids) | ENGINE_FACTS
    declared = set(re.findall(r"\{(\w+)\}", c["legals"]["facts"]))
    # a story's topics are its own facts once they're wired
    for g in c["needs"]["groups"]:
        for r in g["rows"]:
            if r["type"] == "topics":
                known.add(r["id"])
    clause_text = " ".join(
        [x["text"] for x in c["legals"]["base"]] + [x["text"] for x in c["legals"]["conditional"]] +
        [x["text"] for x in c["legals"]["extras"]] +
        [t["line"] for t in c["legals"]["by_type"]] +
        [x["text"] for t in c["legals"]["by_type"] for x in t["extra"]])
    for ph in set(re.findall(r"\{(\w+)\}", clause_text)):
        if ph in known or ph in declared:
            continue
        if any(ph.endswith(s) and ph[: -len(s)] in known for s in DERIVED_SUFFIXES):
            continue
        # a few grammatical derived forms the engine supplies for winners
        if ph in ("winners_word", "winner_word", "winners_cap"):
            continue
        problems.append(f"{cid}: clause uses {{{ph}}} but NEEDS has no such fact and 'Facts the clauses fill from' doesn't declare it")
    return c


# ---------------------------------------------------------------------------
# CONTAINER — spec.md
# ---------------------------------------------------------------------------

def _parse_spec(text, cid, problems):
    s = {"outputs": [], "modules": [], "why": {}, "lean": "", "rules": {}, "limits": "",
         "images": [], "placeholders": [], "notes": ""}
    out = _section(text, "Outputs")
    if out is None:
        problems.append(f"{cid}: spec.md has no '## Outputs'")
    else:
        for r in _table(out)["rows"]:
            s["outputs"].append({"id": r.get("id", ""), "name": r.get("name", ""),
                                 "files": r.get("files emitted", "")})
    if not s["outputs"]:
        problems.append(f"{cid}: spec.md Outputs has no rows")

    mods = _section(text, "Modules")
    if mods is None:
        problems.append(f"{cid}: spec.md has no '## Modules'")
    else:
        for r in _table(mods)["rows"]:
            name = r.get("module", "")
            m = {"n": r.get("#", ""), "module": re.sub(r"\s*×.*$", "", name),
                 "output": r.get("output", ""), "fixed": r.get("fixed/optional", ""),
                 "filled_by": r.get("filled by", ""), "length": r.get("length", "")}
            if "×" in name:
                m["repeat"] = name.split("×", 1)[1].strip()
            lim = re.search(r"≤\s*(\d+)\s*chars?", m["length"])
            if lim:
                m["max_chars"] = int(lim.group(1))
            s["modules"].append(m)
    if not s["modules"]:
        problems.append(f"{cid}: spec.md Modules has no rows")

    why = _section(text, "Why-beat")
    if why is not None:
        for b in _bullets(why):
            if ":" in b:
                k, v = b.split(":", 1)
                s["why"][k.strip()] = v.strip()
    lean = _section(text, "VOICE LEAN")
    if lean is None:
        problems.append(f"{cid}: spec.md has no '## VOICE LEAN'")
    else:
        # drop the italic note under the heading; the WRITER doesn't need it
        s["lean"] = re.sub(r"^\*[^*\n]+\*\n+", "", lean).strip()
    rules = _section(text, "RULES")
    if rules is None:
        problems.append(f"{cid}: spec.md has no '## RULES'")
    else:
        for title, body in _sections(rules, 3):
            if not title:
                continue
            key = title.lower()
            if key.startswith("hard limits"):
                s["limits"] = body.strip()
            else:
                s["rules"][title] = _bullets(body) or body.strip()
        s["rules_text"] = rules.strip()
    imgs = _section(text, "IMAGES")
    if imgs is not None:
        for r in _table(imgs)["rows"]:
            s["images"].append({"output": r.get("output", ""), "slot": r.get("slot", ""),
                                "size": r.get("size (px)", ""), "ratio": r.get("ratio", ""),
                                "notes": r.get("notes", "")})
    ph = _section(text, "The placeholder rule")
    if ph is not None:
        s["placeholders"] = sorted(set(re.findall(r"\{(\w+)\}", ph)))
        s["placeholder_rule"] = ph.strip()
    notes = _section(text, "Notes")
    if notes:
        s["notes"] = notes.strip()
    s["spec_text"] = text.strip()
    return s


# ---------------------------------------------------------------------------
# CONTAINER — the html
# ---------------------------------------------------------------------------

def _parse_html(path, cid, problems):
    html = _read(path)
    # tags come from the markup only — a CSS selector like
    # [data-module="hero"] in the <style> block isn't a module
    body = re.sub(r"<style.*?</style>", "", html, flags=re.S)
    tags = re.findall(r'data-module="([^"]+)"', body)
    seen = []
    for t in tags:
        if t not in seen:
            seen.append(t)
    return {"path": path, "modules": seen, "html": html}


# ---------------------------------------------------------------------------
# THE FOLDERS
# ---------------------------------------------------------------------------

def _parse_container(folder, cid):
    problems = []
    c = {"id": cid, "folder": folder, "problems": problems}
    cfg = os.path.join(folder, "config.md")
    spec = os.path.join(folder, "spec.md")
    html = os.path.join(folder, cid + ".html")
    for p, what in ((cfg, "config.md"), (spec, "spec.md"), (html, cid + ".html")):
        if not os.path.isfile(p):
            problems.append(f"{cid}: {what} is missing")
    if os.path.isfile(cfg):
        c.update(_parse_config(_read(cfg), cid, problems))
    if os.path.isfile(spec):
        c["spec"] = _parse_spec(_read(spec), cid, problems)
    if os.path.isfile(html):
        c["artefact"] = _parse_html(html, cid, problems)
    # modules in the html vs modules in the spec, both ways
    if c.get("spec") and c.get("artefact"):
        spec_mods = {m["module"] for m in c["spec"]["modules"]}
        # a wrapper named for what it wraps (intro around intro-copy,
        # signoff around signoff-copy) is structure, not a module
        spec_mods |= {m["module"].split("-")[0] for m in c["spec"]["modules"] if "-" in m["module"]}
        html_mods = set(c["artefact"]["modules"])
        # containers of other modules (precopy, cards, readonline) and fixed
        # furniture aren't rows; only complain about what looks like copy
        structural = {"precopy", "cards", "readonline", "card"}
        for m in html_mods - spec_mods - structural:
            problems.append(f"{cid}: html has data-module=\"{m}\" but spec.md Modules has no row for it")
        for m in {x["module"] for x in c["spec"]["modules"]} - html_mods:
            if m not in ("card",) and not m.startswith("card-"):
                problems.append(f"{cid}: spec.md Modules lists '{m}' but the html has no data-module for it")
    return c


def _cache_path(folder):
    return os.path.join(folder, os.path.basename(folder.rstrip("/")) + ".compiled.json")


def _compile(folder, kind):
    """Read the cache if it's fresher than every file in the folder;
    otherwise parse and write it. Cache failures are silent — the parse
    is the truth, the cache is a convenience."""
    fid = os.path.basename(folder.rstrip("/"))
    stamp = _mtime_of(folder)
    cp = _cache_path(folder)
    try:
        with open(cp, encoding="utf-8") as f:
            cached = json.load(f)
        if cached.get("_stamp") == stamp:
            cached.pop("_stamp", None)
            return cached
    except (OSError, ValueError):
        pass
    if kind == "brand":
        problems = []
        data = _parse_brand(folder, fid, problems)
        data["problems"] = problems
    else:
        data = _parse_container(folder, fid)
    try:
        with open(cp, "w", encoding="utf-8") as f:
            json.dump(dict(data, _stamp=stamp), f, ensure_ascii=False, indent=1)
    except OSError:
        pass
    return data


def _folders(base):
    if not os.path.isdir(base):
        return []
    return sorted(p for p in (os.path.join(base, d) for d in os.listdir(base))
                  if os.path.isdir(p) and not d_hidden(p))


def d_hidden(p):
    return os.path.basename(p).startswith((".", "_"))


def brands():
    return {os.path.basename(f): _compile(f, "brand") for f in _folders(BRANDS_DIR)}


def containers():
    """Every container, compiled, with its brand resolved. A container whose
    brand is missing gets the problem noted and an empty brand, so the
    doorway can still show it as testing."""
    bs = brands()
    out = {}
    for f in _folders(CONTAINERS_DIR):
        c = _compile(f, "container")
        b = bs.get(c.get("brand", ""))
        if b is None:
            c["problems"] = c.get("problems", []) + [
                f"{c['id']}: brand '{c.get('brand', '')}' has no folder under brands/"]
            c["brand_data"] = {"id": c.get("brand", ""), "voice": "", "skin": {}, "problems": []}
        else:
            c["brand_data"] = b
        _resolve_brand_clauses(c)
        out[c["id"]] = c
    return out


def _resolve_brand_clauses(c):
    """A container includes a brand clause by putting @brand in the text
    cell against its id. The words come from brands/<b>/legals.md; a
    missing id is a problem, not a silent blank."""
    lib = {x["id"]: x for x in c.get("brand_data", {}).get("legals", []) or []}
    for key in ("base", "extras"):
        for cl in c.get("legals", {}).get(key, []):
            if cl.get("text", "").strip() == "@brand":
                src = lib.get(cl["id"])
                if not src:
                    c["problems"] = c.get("problems", []) + [
                        f"{c['id']}: legals row '{cl['id']}' says @brand but the brand library has no such clause"]
                    cl["text"] = ""
                    continue
                cl["text"] = src["text"]
                if not cl.get("label"):
                    cl["label"] = src["label"]
                cl["fixed"] = src["fixed"] or cl.get("fixed", False)


def container(cid):
    return containers().get(cid)


def validate(folder, kind="container"):
    """The upload door's question: what's wrong with this folder? Returns
    the list of reasons, all of them, empty when clean. Never caches."""
    fid = os.path.basename(folder.rstrip("/"))
    if kind == "brand":
        problems = []
        _parse_brand(folder, fid, problems)
        return problems
    c = _parse_container(folder, fid)
    probs = list(c["problems"])
    if c.get("brand") and c["brand"] not in brands():
        probs.append(f"{fid}: brand '{c['brand']}' has no folder under brands/")
    bd = brands().get(c.get("brand", ""))
    if bd:
        probs += bd.get("problems", [])
    return probs


# ---------------------------------------------------------------------------
# WHAT THE WORKERS EAT — the assembly rules, in one place
# ---------------------------------------------------------------------------

def voice_for(c):
    """WRITER and FIXER: the brand voice, then the container's lean."""
    parts = [c["brand_data"].get("voice", "")]
    lean = c.get("spec", {}).get("lean", "")
    if lean:
        parts.append("THIS FORMAT'S LEAN — where the voice bends for the shape, and no more:\n" + lean)
    return "\n\n".join(p for p in parts if p)


def specs_for(c):
    """WRITER and FIXER: the modules, limits and rules, as the spec wrote them."""
    return c.get("spec", {}).get("spec_text", "")


def tile(c):
    """The doorway's view of a container."""
    return {"id": c["id"], "name": c.get("name", c["id"]), "client": c.get("client", ""),
            "brand": c.get("brand", ""), "format": c.get("format", ""),
            "status": c.get("status", "testing"), "purpose": c.get("purpose", ""),
            "problems": c.get("problems", [])}


if __name__ == "__main__":
    import sys
    for cid, c in containers().items():
        print(f"{cid}: {c.get('name')} [{c.get('status')}] brand={c.get('brand')} "
              f"groups={len(c.get('needs', {}).get('groups', []))} "
              f"modules={len(c.get('spec', {}).get('modules', []))} "
              f"html_modules={len(c.get('artefact', {}).get('modules', []))}")
        for p in c.get("problems", []):
            print("   !", p)
    for bid, b in brands().items():
        print(f"brand {bid}: {b.get('name')} tokens={len(b.get('skin', {}).get('tokens', {}))}")
        for p in b.get("problems", []):
            print("   !", p)
