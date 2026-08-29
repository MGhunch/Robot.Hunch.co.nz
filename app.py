"""
ROBOT
=====
robot.hunch.co.nz — a front door with one room in it.

Room one is ticket giveaways for One NZ Rewards: answer a few questions, the
terms get assembled from the answers, the robot writes the copy, you tick it or
tweak it, and it comes out as a parcel the marketing automation specialist can
take straight into Salesforce Marketing Cloud.

ARCHITECTURE, and the reason for it:

  terms.py       Deterministic. Clause library, date arithmetic, validation.
                 The model never touches it. This is the bulletproof half.
  copy_stage.py  The only part the model touches. Writes prose, never facts.
  auth.py        Email-is-the-credential OTP. Currently one address.

  Copy uses placeholders that Python fills from the same FACTS dict that built
  the terms. One source of truth, two renderings — so the words and the terms
  cannot structurally drift apart. That's the whole trick.

Blueprints are additive, same pattern as Prompter: adding a room touches
nothing that already works.
"""

from flask import Flask, jsonify, request, session, send_from_directory
from datetime import timedelta
import os
import re
import time

from auth import auth_bp, require_auth
from copy_stage import copy_bp
from terms import (build_facts, assemble_terms, render_terms, render_copy,
                   clause_menu, prize_types, FOOTER, TermsError)

app = Flask(__name__, static_folder="static", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")
# A day, not a month. The door takes four seconds, so asking once a day costs
# nothing — and a forwarded link or a shared laptop goes cold by tomorrow.
app.permanent_session_lifetime = timedelta(hours=24)

app.register_blueprint(auth_bp)
app.register_blueprint(copy_bp)


@app.route("/api/terms", methods=["POST"])
@require_auth
def terms():
    """Form -> the clause menu. No model, so this is free and instant.

    Returns every clause in publish order with its id and whether it's
    optional, so the UI can render fixed ones as text and optional ones as
    checkboxes. Those checkboxes are also how we learn which clauses are
    really boilerplate — see the note in terms.py.
    """
    data = request.get_json() or {}
    try:
        facts = build_facts(data.get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400
    chosen = data.get("chosen")
    return jsonify({"success": True, "facts": facts,
                    "menu": clause_menu(facts),
                    "clauses": assemble_terms(facts, chosen),
                    "footer": FOOTER})


@app.route("/api/parcel", methods=["POST"])
@require_auth
def parcel():
    """Final render. Placeholders filled from the same facts as the terms."""
    data = request.get_json() or {}
    try:
        facts = build_facts(data.get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400
    c = data.get("copy") or {}
    return jsonify({
        "success": True,
        "subject": render_copy(c.get("subject", ""), facts),
        "headline": render_copy(c.get("headline", ""), facts),
        "body": render_copy(c.get("body", ""), facts),
        "terms": render_terms(facts, data.get("chosen")),
        "clause_count": len(assemble_terms(facts, data.get("chosen"))),
        "slug": "".join(ch if ch.isalnum() else "-"
                        for ch in facts["prize_name"].lower()).strip("-"),
    })


# ---------------------------------------------------------------------------
# IMAGES — the uploads page (FEED IT page three).
# Deterministic storage, no model. Files land under ROBOT_IMAGES/<run>/,
# which should live on the Railway volume (ROBOT_IMAGES=/data/images) so the
# pics survive a redeploy alongside the tweak log. FINISHED (hit list 5) will
# zip them; the respec (hit list 6) will cut them. For now they just wait.
# ---------------------------------------------------------------------------

IMAGES_DIR = os.environ.get("ROBOT_IMAGES", os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "images"))
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png"}
IMAGE_MAX = 10 * 1024 * 1024          # 10MB a picture is plenty for email
app.config["MAX_CONTENT_LENGTH"] = IMAGE_MAX + 1024 * 1024

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


@app.route("/api/types")
def types():
    return jsonify({"types": prize_types()})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "robot"})


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/<path:path>")
def static_file(path):
    return send_from_directory("static", path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
