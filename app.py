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


@app.route("/api/container/<cid>")
@require_auth
def container_get(cid):
    c = CT.container(cid)
    if not c or not _visible(c):
        return jsonify({"error": "No such container."}), 404
    return jsonify({
        "tile": CT.tile(c),
        "brand": {"id": c["brand"], "name": c["brand_data"].get("name", c["brand"]),
                  "skin": c["brand_data"].get("skin", {})},
        "quiz": _quiz(c),
        "checklist": _checklist(c),
        "modules": _modules(c),
        "ghost": c["artefact"]["modules"],
        "html": c["artefact"]["html"].replace("../../brands/", "/brands/"),
        "outputs": c["spec"]["outputs"],
        "images": c["spec"]["images"],
        "problems": c["problems"],
    })


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
