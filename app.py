"""
ROBOT
=====
robot.hunch.co.nz — the engine, and the folders it runs.

  brands/<id>/        voice, skin, assets       set up once per client
  containers/<id>/    config, spec, artefact    set up once per format

ARCHITECTURE, and the reason for it:

  containers.py  The reader. Folders -> one dict each. The validator is the
                 reader in strict mode. Nothing per-container lives in code.
  engine.py      Deterministic. Facts from NEEDS, clauses from LEGALS, the
                 copy check. The model never touches it.
  copy_stage.py  The only part the model touches. Writes prose, never facts.
  file_it.py     The takeaway counter. Which fillings are on the menu, the
                 copy doc, the pics zip, the wrap. No model.
  auth.py        The door. A word today, OTP when clients arrive. A Hunch
                 login sees containers in testing.

  Copy and terms both fill from the same FACTS dict, so the words and the
  terms cannot structurally drift apart. That's the whole trick.
"""

from flask import Flask, jsonify, request, session, send_from_directory
from datetime import timedelta
import os
import re
import time

from auth import auth_bp, require_auth, is_hunch
from copy_stage import copy_bp, writer_modules, options_of
import copy_stage
from file_it import file_bp, parcel as _parcel
import containers as CT
import robots
import setup_room
import setup_edit
import setup_push
from engine import (build_facts, assemble_terms, render_terms, render_copy,
                    clause_menu, type_options, TermsError)

app = Flask(__name__, static_folder="static", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")
# A day, not a month. The door takes four seconds, so asking once a day costs
# nothing — and a forwarded link or a shared laptop goes cold by tomorrow.
app.permanent_session_lifetime = timedelta(hours=24)

app.register_blueprint(auth_bp)
app.register_blueprint(copy_bp)
app.register_blueprint(file_bp)


# ---------------------------------------------------------------------------
# THE DOORWAY and THE CONTAINER — what the front end reads to draw itself.
# ---------------------------------------------------------------------------

def _visible(c):
    return c.get("status") == "live" or is_hunch()


@app.route("/api/containers")
@require_auth
def containers_list():
    """One tile per folder, grouped by brand. `testing` shows to Hunch
    logins only, badged; the client sees `live`. No list in code."""
    tiles = [CT.tile(c) for c in CT.containers().values() if _visible(c)]
    brands = {b["id"]: {"id": b["id"], "name": b.get("name", b["id"])} for b in CT.brands().values()}
    return jsonify({"tiles": tiles, "brands": brands, "hunch": is_hunch()})


def _quiz(c):
    """FEED IT's words, in the shape the concertina reads."""
    fi = c["feed_it"]
    return {
        "artefact": c.get("name", c["id"]),
        "tagline": "Fill in the blanks. The robot does the rest.",
        "stops": [
            {"key": "dump", "title": "Dump your docs", "sub": "Drop in anything you've got.",
             "pad": {"browse": "Browse", "line": "or drag it in.",
                     "more": "or drag in another.", "hint": fi["dump"],
                     "paste": "Cut and paste anything."}},
            {"key": "bounce", "title": "Bounce ideas", "sub": "Quick chat to land an angle."},
            {"key": "deets", "title": "Lock the deets", "sub": "Dates, times, legals. All good?"},
        ],
        "needs": fi["needs"],
        "point": fi["point"],
        "bounce": fi["bounce"],
        "closing": fi["closing"],
    }


def _checklist(c):
    """NEEDS, in the shape the checklist renderer deals from: groups of
    rows; repeating groups carry their repeat rule; the legals card."""
    groups = []
    for g in c["needs"]["groups"]:
        rows = []
        for r in g["rows"]:
            row = {"id": r["id"], "label": r["label"], "type": r["type"], "ask": r["ask"],
                   "locked": r["locked"], "diggable": r["diggable"]}
            if r.get("notsure"): row["notsure"] = r["notsure"]
            if r.get("sub"): row["sub"] = r["sub"]
            if r.get("options"): row["options"] = r["options"]
            if r.get("unit"):
                row["unit"] = r["unit"]
            if r.get("when"):
                m = re.match(r"(\w+)\s+in\s+(.+)", r["when"])
                if m: row["showIf"] = {"row": m.group(1), "in": [v.strip() for v in m.group(2).split(",")]}
            if r.get("derive"):
                m = re.search(r"next working day after (\w+)", r["derive"])
                if m: row["derive"] = "nextWorkday:" + m.group(1)
                elif "ticket words" in r["derive"]: row["derive"] = "typeCounts"
            rows.append(row)
        groups.append({"title": g["title"], "rows": rows, "repeat": g["repeat"], "prose": g.get("prose", "")})
    types = type_options(c)
    topics = [{"id": x["id"], "label": x["label"], "default": x["default"], "text": x.get("text", "")}
              for x in c["legals"]["extras"]]
    for x in c["legals"]["conditional"]:
        topics.insert(0, {"id": x["id"], "label": x["title"], "default": True, "when": "prize",
                          "text": x.get("text", "")})
    # prize_line is the type's line, hung as a sub-bullet and filled from the
    # facts. Its row in the base table is an editorial note, not a clause, so
    # it never belongs in the client's standard-terms block.
    fixed = [{"id": x["id"], "label": x.get("label", "") or x["id"].replace("_", " ").capitalize(),
              "text": x["text"]} for x in c["legals"]["base"]
             if x.get("fixed") and x["id"] != "prize_line"]
    return {"groups": groups, "types": types, "topics": topics,
            "legals": {"title": "Specific terms", "fixedTitle": c["legals"].get("fixed_title", "Standard legals"),
                       "fixed": fixed,
                       "sub": "Tick the extras this one needs. Tap any clause to read it."}}


def _modules(c):
    top, groups = writer_modules(c)
    return {"all": c["spec"]["modules"],
            "writer": [dict(m, options=options_of(m)) for m in top],
            "groups": groups,
            "why": c["spec"].get("why", {}),
            "limits": c["spec"].get("limits", "")}


def _container_payload(c, assets="/brands/"):
    """Everything the front end needs to draw a container. One builder, two
    doors: the live one below, and SET UP's, which asks the same question of
    a folder that hasn't landed yet."""
    return {
        "tile": CT.tile(c),
        "brand": {"id": c["brand"], "name": c["brand_data"].get("name", c["brand"]),
                  "skin": c["brand_data"].get("skin", {})},
        "quiz": _quiz(c),
        "checklist": _checklist(c),
        "modules": _modules(c),
        "ghost": c["artefact"]["modules"],
        "html": c["artefact"]["html"].replace("../../brands/", assets),
        "outputs": c["spec"]["outputs"],
        "images": c["spec"]["images"],
        "problems": c["problems"],
    }


@app.route("/api/container/<cid>")
@require_auth
def container_get(cid):
    c = CT.container(cid)
    if not c or not _visible(c):
        return jsonify({"error": "No such container."}), 404
    return jsonify(_container_payload(c))


# ---------------------------------------------------------------------------
def _named_files(*texts):
    return re.findall(r"assets/([\w.\-]+\.\w+)", " ".join(texts))


# ---------------------------------------------------------------------------
# THE SHELVES (v046)
#
# Every shelf gets one question: does this have to be filled?
#
#   MUST     it does, and it isn't      -> A GAP TO FILL. Refuses the lock.
#   SHOULD   it doesn't, and it isn't   -> THE WAITING ROOM. Refuses nothing.
#   N/A      it never will be, declared -> quiet, and still checked, because
#                                          sometimes it IS needed and that is
#                                          the thing you are checking.
#
# MUST is not a second opinion. A shelf is essential only where the
# validator already raises a problem for it, so the lock and the push refuse
# exactly the same things. Promote a shelf to must here and you must promote
# the check in containers.py with it, or the room will refuse what push
# allows and nobody will be able to say which one is lying.
#
# N/A is declared in brand.md — "not_needed: legals, mark" — so it travels
# in the folder rather than in somebody's browser, and a push carries it.
# ---------------------------------------------------------------------------

FORGIVEN = re.compile(r"pending|still to come|to come", re.I)


def _read_text(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def _open_items(text, where):
    """The waiting room as you have been writing it all along: a '## Open'
    section, one bullet per thing we are waiting on. Parsed, not invented."""
    out = []
    for title, body in CT.sections_of(text):
        if title.strip().lower() != "open":
            continue
        for line in body.split("\n"):
            m = re.match(r"^\s*[-*]\s+(.*)$", line)
            if m and m.group(1).strip():
                out.append({"key": "open", "label": m.group(1).strip(), "rail": where,
                            "must": False, "state": "waiting", "kind": "open", "note": ""})
    return out


def _brand_shelves(b, look, colours, missing):
    """One row per shelf, each already sorted into its block. The front end
    renders; it does not decide."""
    folder = b.get("folder", "")
    skin = b.get("skin", {})
    voice = b.get("voice", "")
    have = set(b.get("assets", []))

    man = CT._kv(_read_text(os.path.join(folder, "brand.md")))
    na = {x.strip().lower() for x in re.split(r"[,;]", man.get("not_needed", "")) if x.strip()}

    # a named file that isn't there is a gap — unless the line says so itself
    pending, gone = [], []
    for fn in missing:
        line = next((l for l in look.split("\n") if fn in l), "")
        (pending if FORGIVEN.search(line) else gone).append(fn)

    fonts = skin.get("fonts", [])
    named_fonts = [n for f in fonts for n in _named_files(f.get("text", ""))]
    voice_titles = [t.lower() for t, _ in CT.sections_of(voice)]

    def has_section(name):
        return any(name.lower() in t for t in voice_titles)

    rows = []

    def shelf(key, label, rail, must, filled, note):
        state = "na" if key in na else ("have" if filled else ("gap" if must else "waiting"))
        rows.append({"key": key, "label": label, "rail": rail, "must": must,
                     "state": state, "kind": "shelf", "note": note})

    n = len(fonts)
    shelf("font", "Font", "look", True, bool(fonts),
          (f"{n} declaration" + ("" if n == 1 else "s")) if n else "No **Font:** line.")
    shelf("fontfiles", "Font files", "look", False, bool(named_fonts),
          f"{len(named_fonts)} named" if named_fonts else "A stack, not a face — nothing named.")
    shelf("logo", "Logo", "look", True, bool(skin.get("logo")),
          "Named" if skin.get("logo") else "No **Logo:** line.")
    shelf("mark", "Mark", "look", False, bool(skin.get("mark")),
          "Named" if skin.get("mark") else "No **Mark:** line.")
    shelf("colours", "Colours", "look", True, bool(colours),
          f"{len(colours)} tokens" if colours else "No hex lines.")
    shelf("assets", "assets/", "look", True, os.path.isdir(os.path.join(folder, "assets")),
          f"{len(have)} files" if have else "Empty.")
    shelf("named", "Named files", "look", True, not gone,
          "All there" if not gone else ", ".join(gone) + " named, not there")

    shelf("pillars", "Pillars", "prompt", True, has_section("pillars"), "")
    shelf("proof", "More / Less", "prompt", True,
          "- More:" in voice and "- Less:" in voice, "")
    shelf("hardrules", "Hard rules", "prompt", True, has_section("hard rules"), "")
    shelf("guardrail", "Guardrail", "prompt", True, has_section("guardrail"), "")

    legals = b.get("legals") or []
    shelf("legals", "Clauses", "legals", False, bool(legals),
          f"{len(legals)} clauses" if legals else "No brandlegals.md.")

    # the pending files are the waiting room speaking for itself
    for fn in pending:
        rows.append({"key": "open", "label": fn + " — still to come", "rail": "look",
                     "must": False, "state": "waiting", "kind": "open", "note": ""})

    rows += _open_items(look, "look")
    rows += _open_items(voice, "prompt")
    rows += _open_items(_read_text(os.path.join(folder, "brandlegals.md")), "legals")
    return rows


def _brand_payload(b):
    """What the reader got out of a brand folder, in the three sections you
    would edit it in — LOOK, PROMPT, LEGALS — because that is what the three
    files are. A section spanning two files makes "which file did that
    change?" a question you re-answer every time.

    Not a verdict: the parse itself, so a blank that validated clean is
    visible instead of implied. Hunch's own folder read clean and shipped an
    empty font for two days.

    LOOK carries both halves of the truth — the files in assets/, and the
    lines that name them. A font sitting there that no line names is
    invisible to the engine, and that gap only shows if you show both."""
    skin = b.get("skin", {})
    folder = b.get("folder", "")
    look = ""
    try:
        with open(os.path.join(folder, "brandlook.md"), encoding="utf-8") as f:
            look = f.read()
    except OSError:
        pass
    have = b.get("assets", [])
    named = set(_named_files(look))
    bid = b.get("id", "")

    def afile(f):
        return {"file": f, "named": f in named,
                "font": f.lower().endswith(setup_room.FONT_EXT),
                "url": "/api/setup/asset/" + bid + "/assets/" + f}

    files = [afile(f) for f in have]
    colours = []
    for m in re.finditer(r"^\*\*([^*]+?):\*\*[ \t]*(.*)$", look, re.M):
        hexes = re.findall(r"#[0-9A-Fa-f]{6}", m.group(2))
        if hexes:
            colours.append({"key": m.group(1).strip(), "hex": hexes[0]})

    voice = b.get("voice", "")
    return {
        "id": bid, "name": b.get("name", ""), "version": b.get("version", ""),
        "look": {
            "fonts": [dict(f, names=_named_files(f["text"])) for f in skin.get("fonts", [])],
            "logo": skin.get("logo", ""), "mark": skin.get("mark", ""),
            "colours": colours,
            "files": files,
            "missing": sorted(named - set(have)),
            "spare": sorted(f["file"] for f in files if not f["named"]),
        },
        "prompt": {"sections": [{"title": t, "body": body} for t, body in CT.sections_of(voice)],
                   "chars": len(voice)},
        "legals": [{"id": c["id"], "label": c.get("label", ""), "fixed": c.get("fixed", False),
                    "text": c.get("text", "")} for c in (b.get("legals") or [])],
        "shelves": _brand_shelves(b, look, colours, sorted(named - set(have))),
        "problems": b.get("problems", []),
    }


# ---------------------------------------------------------------------------
# SET UP — Hunch only. Two places, and the difference is the whole model.
#
#   the volume   a DRAFT. Instant saves, no deploy, Hunch's eyes only.
#   git          what has LANDED. History, revert, and the folders ship in
#                the same commit as the engine that reads them.
#
# Clients only ever see git; Hunch sees the volume laid over the top. PUSH
# moves a folder from the volume into git, and that is what makes it live.
# ---------------------------------------------------------------------------

def _state(thing):
    """What a row says. DRAFT beats everything, because an unpushed change
    is the thing you need to act on. A brand has no status line in the
    schema — it either landed or it hasn't — so anything in git is live."""
    if thing.get("draft"):
        return "draft"
    status = thing.get("status")
    if not status:
        return "live"
    return "live" if status == "live" else "testing"


def _setup_list():
    bs = CT.brands(drafts=True)
    cs = CT.containers(drafts=True)
    using = {}
    for c in cs.values():
        using[c.get("brand", "")] = using.get(c.get("brand", ""), 0) + 1
    def sub(n):
        return "no containers yet" if not n else ("1 container" if n == 1 else f"{n} containers")
    return {
        "brands": [{"id": b["id"], "name": b.get("name", b["id"]),
                    "sub": sub(using.get(b["id"], 0)), "state": _state(b),
                    "problems": len(b.get("problems", []))}
                   for b in sorted(bs.values(), key=lambda x: x.get("name", "").lower())],
        "containers": [{"id": c["id"], "name": c.get("name", c["id"]),
                        "sub": (bs.get(c.get("brand", ""), {}) or {}).get("name", c.get("brand", "")),
                        "state": _state(c), "problems": len(c.get("problems", []))}
                       for c in sorted(cs.values(), key=lambda x: x.get("name", "").lower())],
    }


@app.route("/api/setup/list")
@require_auth
def setup_list():
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    return jsonify(_setup_list())


@app.route("/api/setup/drop", methods=["POST"])
@require_auth
def setup_drop():
    """A zip lands. It is a draft by definition — it hasn't been pushed.
    The zip says whether it's a brand or a container; asking first would be
    asking a question we can answer ourselves."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    try:
        cids, bids = setup_room.take(request.files.get("zip"))
    except setup_room.DropError as e:
        return jsonify({"error": str(e)}), 400
    out = _setup_list()
    out["landed"] = {"containers": cids, "brands": bids}
    return jsonify(out)


@app.route("/api/setup/open/<kind>/<fid>")
@require_auth
def setup_open(kind, fid):
    """Everything the editor needs. Opening does not make a draft — the
    first edit does. So you can look at something live without changing
    what it is."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    if kind == "brands":
        b = CT.brands(drafts=True).get(fid)
        if not b:
            return jsonify({"error": "gone"}), 404
        return jsonify({"kind": "brands", "id": fid, "state": _state(b),
                        "brandRead": _brand_payload(b), "problems": b.get("problems", [])})
    if kind == "containers":
        c = CT.container(fid, drafts=True)
        if not c:
            return jsonify({"error": "gone"}), 404
        out = _container_payload(c, assets="/api/setup/asset/")
        out.update({"kind": "containers", "id": fid, "state": _state(c),
                    "brandRead": _brand_payload(CT.brands(drafts=True)[c["brand"]])
                    if c.get("brand") in CT.brands(drafts=True) else None,
                    "brandWanted": c.get("brand", "")})
        return jsonify(out)
    return jsonify({"error": "gone"}), 404


@app.route("/api/setup/discard", methods=["POST"])
@require_auth
def setup_discard():
    """Throw the draft away. What landed is untouched."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    d = request.get_json(silent=True) or {}
    try:
        setup_room.discard(d.get("kind", ""), d.get("id", ""))
    except setup_room.DropError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(_setup_list())


@app.route("/api/setup/push", methods=["POST"])
@require_auth
def setup_push_route():
    """A draft goes into git as one ordinary commit, and that is what makes
    it live. Two gates before it can: it has to be a draft, and it has to
    read clean. Nothing unclean has ever been worth landing."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    if not setup_push.ready():
        return jsonify({"error": "nopush"}), 501
    d = request.get_json(silent=True) or {}
    kind, fid = d.get("kind", ""), d.get("id", "")
    folder = setup_room.draft_dir(kind, fid)
    if not folder:
        return jsonify({"error": "notdraft"}), 400

    # a container's brand has to be in git already, or what lands is a
    # container pointing at a folder no client can see. The validator would
    # bounce it anyway — this says the useful thing instead.
    if kind == "containers":
        c = CT.container(fid, drafts=True) or {}
        b = c.get("brand", "")
        if b and b not in CT.brands():
            return jsonify({"error": "brandfirst", "brand": b}), 400

    probs = CT.validate(folder, kind="brand" if kind == "brands" else "container")
    if probs:
        return jsonify({"error": "unclean", "problems": probs}), 400

    what = "brand" if kind == "brands" else "container"
    message = f"{fid}: the {what} folder, from SET UP"
    try:
        out = setup_push.push(kind, fid, folder, message)
    except setup_push.PushError as e:
        return jsonify({"error": str(e)}), 502

    # it landed, so it isn't a draft any more. Two versions of one folder
    # never coexist — that was the whole point of the copy.
    setup_room.discard(kind, fid)
    out["list"] = _setup_list()
    return jsonify(out)


@app.route("/api/setup/asset/<path:name>")
@require_auth
def setup_asset(name):
    """A file out of a draft's assets/, so an asset pill can show the thing
    rather than its filename, and the artefact can wear the client's face."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    base = os.path.join(setup_room.DRAFTS, "brands")
    full = os.path.normpath(os.path.join(base, name))
    if not full.startswith(os.path.normpath(base) + os.sep) or not os.path.isfile(full):
        # not a draft: fall back to what landed, so a live folder's logo shows
        landed = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "brands", name))
        if os.path.isfile(landed):
            return send_from_directory(os.path.dirname(landed), os.path.basename(landed))
        return jsonify({"error": "gone"}), 404
    return send_from_directory(os.path.dirname(full), os.path.basename(full))


# ---------------------------------------------------------------------------
# EDITING A DRAFT — surgical, volume only, changelogged.
#
# Four edits, because a brand has four shapes of thing in it: a hex inside a
# line, a whole line, a section of a document, a cell in a table. Nothing
# here regenerates a file from parsed structure — see setup_edit.py for why.
# The first edit of something landed copies it to the volume; opening it
# didn't, so looking is free.
# ---------------------------------------------------------------------------

EDIT_FILES = {"look": "brandlook.md", "voice": "brandvoice.md", "legals": "brandlegals.md"}


def _after_write(kind, fid):
    """After every write: parse it again and answer with the parse. The page
    never keeps its own idea of what the folder says."""
    if kind == "brands":
        b = CT.brands(drafts=True).get(fid) or {}
        return jsonify({"brandRead": _brand_payload(b) if b else None,
                        "problems": b.get("problems", []), "state": _state(b),
                        "list": _setup_list()})
    c = CT.container(fid, drafts=True) or {}
    return jsonify({"problems": c.get("problems", []), "state": _state(c),
                    "list": _setup_list()})


@app.route("/api/setup/edit", methods=["POST"])
@require_auth
def setup_edit_route():
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    d = request.get_json(silent=True) or {}
    fid = d.get("id", "")
    folder = setup_room.draft_dir("brands", fid, make=True)
    if not folder:
        return jsonify({"error": "gone"}), 404
    which = EDIT_FILES.get(d.get("file", ""))
    if not which:
        return jsonify({"error": "nofile"}), 400
    path = os.path.join(folder, which)
    if not os.path.isfile(path):
        return jsonify({"error": "nofile"}), 400
    op, val = d.get("op", ""), d.get("value", "")
    try:
        if op == "hex":
            setup_edit.set_hex(path, d.get("key", ""), val)
            what = f"{d.get('key','')} recoloured."
        elif op == "line":
            setup_edit.set_line(path, d.get("key", ""), val)
            what = f"The {d.get('key','')} line rewritten."
        elif op == "section":
            setup_edit.set_section(path, d.get("heading", ""), val)
            what = f"{d.get('heading','')} rewritten."
        elif op == "name":
            setup_edit.name_file(path, d.get("key", ""), val)
            what = f"{val} named on the {d.get('key','')} line."
        elif op == "cell":
            setup_edit.set_cell(path, d.get("row", ""), d.get("column", "text"), val)
            what = f"The {d.get('row','')} clause rewritten."
        else:
            return jsonify({"error": "noop"}), 400
    except setup_edit.EditError as e:
        return jsonify({"error": str(e)}), 400
    setup_edit.log(folder, "brand.md", what)
    return _after_write("brands", fid)


@app.route("/api/setup/asset/add", methods=["POST"])
@require_auth
def setup_asset_add():
    """Filling a gap. The check names a file brandlook.md wants and hasn't
    got; this is where you hand it over."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    fid = request.form.get("id", "")
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "nofile"}), 400
    try:
        name = setup_room.add_asset(fid, f.filename, f)
    except setup_room.DropError as e:
        return jsonify({"error": str(e)}), 400
    setup_edit.log(setup_room.draft_dir("brands", fid), "brand.md", f"{name} added to assets/.")
    return _after_write("brands", fid)


@app.route("/api/setup/asset/drop", methods=["POST"])
@require_auth
def setup_asset_drop():
    """Pruning. The folder is re-read straight after, so deleting something
    a line still names comes back as a problem rather than as silence."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    d = request.get_json(silent=True) or {}
    fid = d.get("id", "")
    try:
        name = setup_room.drop_asset(fid, d.get("file", ""))
    except setup_room.DropError as e:
        return jsonify({"error": str(e)}), 400
    setup_edit.log(setup_room.draft_dir("brands", fid), "brand.md", f"{name} removed from assets/.")
    return _after_write("brands", fid)


@app.route("/api/setup/download")
@require_auth
def setup_download():
    """Every draft, in the shape the reader accepts. Still here because it
    is the safe path, and because PUSH doesn't exist yet."""
    if not is_hunch():
        return jsonify({"error": "hunch"}), 403
    try:
        path = setup_room.zip_out()
    except setup_room.DropError as e:
        return jsonify({"error": str(e)}), 400
    return send_from_directory(os.path.dirname(path), os.path.basename(path),
                               as_attachment=True, download_name="set-up.zip")


@app.route("/api/peek", methods=["POST"])
@require_auth
def api_peek():
    """A peek is a read. Note it, container-tagged — labels that never
    get peeked are labels doing their job (CALIBRATE reads this later)."""
    from datetime import datetime
    from flask import session as _s
    d = request.get_json(force=True, silent=True) or {}
    entry = {"at": datetime.utcnow().isoformat(), "who": _s.get("email"),
             "kind": "peek", "container": d.get("container", ""),
             "clause": d.get("clause", "")}
    copy_stage.TWEAK_LOG.append(entry)
    copy_stage._persist(entry)
    return jsonify({"ok": True})


@app.route("/api/terms", methods=["POST"])
@require_auth
def terms():
    """Form -> the clause menu. No model, so this is free and instant."""
    data = request.get_json() or {}
    c = CT.container(data.get("container", ""))
    if not c:
        return jsonify({"error": "No such container."}), 404
    try:
        facts = build_facts(c, data.get("form") or {})
        menu = clause_menu(c, facts)
    except TermsError as e:
        print(f"[robot] terms refused: {e}", flush=True)
        return jsonify({"error": "terms"}), 400
    chosen = data.get("chosen")
    return jsonify({"success": True, "facts": facts, "menu": menu,
                    "clauses": assemble_terms(c, facts, chosen),
                    "footer": c["legals"].get("footer", "")})


@app.route("/api/parcel", methods=["POST"])
@require_auth
def parcel():
    """Final render. Placeholders filled from the same facts as the terms.
    The builder lives in file_it.py; FILE IT's wrap uses the same one."""
    data = request.get_json() or {}
    c = CT.container(data.get("container", ""))
    if not c:
        return jsonify({"error": "No such container."}), 404
    try:
        P = _parcel(c, data)
    except TermsError as e:
        print(f"[robot] terms refused: {e}", flush=True)
        return jsonify({"error": "terms"}), 400
    return jsonify({"success": True, "copy": P["copy"], "terms": P["terms"], "slug": P["slug"],
                    "clause_count": len(assemble_terms(c, P["facts"], data.get("chosen")))})


# ---------------------------------------------------------------------------
# IMAGES — the uploads page (FEED IT page three).
# Deterministic storage, no model. Files land under ROBOT_IMAGES/<run>/,
# which should live on the Railway volume (ROBOT_IMAGES=/data/images) so the
# pics survive a redeploy alongside the tweak log. FILE IT (file_it.py) zips
# them as they came; the respec (hit list 6) will cut them.
# ---------------------------------------------------------------------------

IMAGES_DIR = os.environ.get("ROBOT_IMAGES", os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "images"))
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png"}
IMAGE_MAX = 10 * 1024 * 1024          # 10MB a picture is plenty for email
app.config["MAX_CONTENT_LENGTH"] = IMAGE_MAX + 1024 * 1024


@app.errorhandler(413)
def too_big(_):
    """Flask answers an oversize upload with an HTML page, which a fetch()
    can only read as 'something went wrong'. Say it in JSON so the row can
    say it in words."""
    return jsonify({"success": False, "reason": "big",
                    "error": "too big — 10MB is the limit"}), 413

_SAFE = re.compile(r"[^a-z0-9-]")

def _clean(s, n=40):
    """One rule for anything that becomes a path segment: lowercase,
    alphanumerics and dashes only, capped. Empty means reject."""
    return _SAFE.sub("", (s or "").lower().replace(" ", "-"))[:n]


@app.route("/api/images", methods=["POST"])
@require_auth
def images_upload():
    """One file per call. The run id groups a session's pics so FINISHED
    can find them later. JPG or PNG, nothing else, no matter the name."""
    run = _clean(request.form.get("run"))
    if not run:
        return jsonify({"error": "No run id."}), 400
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "No file."}), 400
    ext = IMAGE_TYPES.get(f.mimetype)
    if not ext:
        return jsonify({"error": "JPG or PNG only."}), 400
    stem = _clean(os.path.splitext(f.filename or "")[0], 60) or "pic"
    name = f"{int(time.time()*1000)}-{stem}{ext}"
    folder = os.path.join(IMAGES_DIR, run)
    os.makedirs(folder, exist_ok=True)
    f.save(os.path.join(folder, name))
    return jsonify({"success": True, "id": name})


@app.route("/api/images/<run>/<name>", methods=["DELETE"])
@require_auth
def images_remove(run, name):
    """The x on a thumbnail. Only touches inside IMAGES_DIR: the run goes
    through the cleaner and the name must match the pattern we generate."""
    run = _clean(run)
    if run and re.fullmatch(r"\d+-[a-z0-9-]+\.(jpg|png)", name or ""):
        path = os.path.join(IMAGES_DIR, run, name)
        if os.path.isfile(path):
            os.remove(path)
    return jsonify({"success": True})


@app.route("/brands/<bid>/assets/<path:name>")
@require_auth
def brand_asset(bid, name):
    """The brand's fonts and logo, for the artefact. Read-only, auth-gated."""
    folder = os.path.join(CT.BRANDS_DIR, _clean(bid, 40), "assets")
    return send_from_directory(folder, name)


# Checked once at boot, reported for ever after — a bad model id should be
# visible at a URL, not something a client discovers mid-search.
_MODELS_OK, _MODELS = robots.check(os.environ.get("ANTHROPIC_API_KEY"))


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "robot",
                    "lanes": robots.lanes(),
                    "models_ok": _MODELS_OK, "models": _MODELS,
                    "bung_today": {k: v for k, v in _BUNG_COUNT.items()}})


# ---------------------------------------------------------------------------
# THE BEACON — /api/bung
# The front end posts here when a card fails twice running: structural, not
# a blip. The server logs it every time and emails Hunch, throttled to one
# email per container per BUNG_EVERY, so an outage is one email, not fifty.
# The card says "I've emailed the tech squad" — this is what makes that
# true. No Resend key: log loudly, the log is the witness. The counter is
# on /api/health so the regular check can see a bad day without the inbox.
# ---------------------------------------------------------------------------
BUNG_EVERY = timedelta(minutes=15)
BUNG_TO = os.environ.get("ROBOT_BUNG_TO", "michael@hunch.co.nz")
_BUNG_LAST = {}     # container id -> last email time
_BUNG_COUNT = {}    # container id -> beacons today (resets on restart)


@app.route("/api/bung", methods=["POST"])
@require_auth
def bung():
    from datetime import datetime
    data = request.get_json(silent=True) or {}
    cid = re.sub(r"[^a-z0-9_-]", "", str(data.get("container") or "")) or "-"
    what = str(data.get("what") or "?")[:40]
    room = str(data.get("room") or "?")[:20]
    run = str(data.get("run") or "")[:64]
    who = session.get("email") or "?"
    _BUNG_COUNT[cid] = _BUNG_COUNT.get(cid, 0) + 1
    line = f"{what} died twice in {room} — container={cid} run={run} who={who}"
    print(f"[robot/bung] {line}", flush=True)

    now = datetime.utcnow()
    last = _BUNG_LAST.get(cid)
    if last and now - last < BUNG_EVERY:
        return jsonify({"success": True, "emailed": False, "throttled": True})
    _BUNG_LAST[cid] = now

    key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("ROBOT_FROM", "robot@hunch.co.nz")
    if not key:
        print(f"[robot/bung] No RESEND_API_KEY — nobody was emailed: {line}", flush=True)
        return jsonify({"success": True, "emailed": False})
    try:
        import requests
        requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": f"Robot <{sender}>", "to": [BUNG_TO],
                  "subject": f"Robot: something's gone bung in {cid}",
                  "text": (f"{what} failed twice running in {room}.\n\n"
                           f"Container: {cid}\nRun: {run}\nWho: {who}\n"
                           f"When: {now.isoformat()}Z\n\n"
                           f"Railway logs will have the detail — grep for "
                           f"[robot/{what}] around that time.\n\n"
                           f"Next email for this container no sooner than "
                           f"{int(BUNG_EVERY.total_seconds() // 60)} minutes from now.")},
            timeout=10,
        )
        return jsonify({"success": True, "emailed": True})
    except Exception as e:
        print(f"[robot/bung] Resend failed ({e}): {line}", flush=True)
        return jsonify({"success": True, "emailed": False})


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/<path:path>")
def static_file(path):
    return send_from_directory("static", path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
