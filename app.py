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

from auth import auth_bp, require_auth
from copy_stage import copy_bp
from terms import (build_facts, assemble_terms, render_terms, render_copy,
                   prize_types, FOOTER, TermsError)

app = Flask(__name__, static_folder="static", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")
app.permanent_session_lifetime = timedelta(days=30)

app.register_blueprint(auth_bp)
app.register_blueprint(copy_bp)


@app.route("/api/terms", methods=["POST"])
@require_auth
def terms():
    """Form -> assembled terms. No model, so this is free and instant."""
    try:
        facts = build_facts((request.get_json() or {}).get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400
    clauses = assemble_terms(facts)
    return jsonify({"success": True, "facts": facts, "clauses": clauses,
                    "footer": FOOTER, "plain": render_terms(facts)})


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
        "terms": render_terms(facts),
        "slug": "".join(ch if ch.isalnum() else "-"
                        for ch in facts["prize_name"].lower()).strip("-"),
    })


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
