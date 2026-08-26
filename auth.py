"""
ROBOT — AUTH
============
Email-is-the-credential OTP. The name is attribution, not authentication.

The door is currently locked to one address. Widen it by adding to WHITELIST
(exact addresses) or ALLOWED_DOMAINS (whole orgs) — both are just lists, and
the domain is also what resolves the tenant, so adding one line lets a whole
client in and routes them at the same time.

Codes are six digits, live for ten minutes, one active code per address, and
are stored in memory. That's fine: a restart just means someone types their
email again. Sessions are Flask's signed cookie, thirty days, so this screen
is a once-a-month event rather than a chore.

Email goes out via Resend if RESEND_API_KEY is set. If it isn't, the code is
printed to the server log instead — which is how you run it locally, and how
you get it deployed before the email plumbing exists. Never do that with the
door open to more than yourself.
"""

from flask import Blueprint, jsonify, request, session
from functools import wraps
from datetime import datetime, timedelta
import os
import random
import requests

auth_bp = Blueprint("auth", __name__)

# --- THE DOOR ---------------------------------------------------------------
# Exact addresses that may enter, lowercase.
WHITELIST = {
    "michael@hunch.co.nz",
}

# Whole domains that may enter. Empty for now — this is where One NZ goes
# once Suze is ready, and it doubles as the tenant lookup.
ALLOWED_DOMAINS = {
    # "one.nz": "One NZ",
}

CODE_TTL = timedelta(minutes=10)
_codes = {}  # email -> (code, expires_at)


def _allowed(email: str):
    """Returns (ok, tenant_label)."""
    email = email.lower().strip()
    if email in WHITELIST:
        return True, "Hunch"
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    if domain in ALLOWED_DOMAINS:
        return True, ALLOWED_DOMAINS[domain]
    return False, None


def _send_code(email: str, code: str):
    key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("ROBOT_FROM", "robot@hunch.co.nz")
    if not key:
        print(f"[robot/auth] No RESEND_API_KEY — code for {email} is {code}")
        return
    try:
        requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json"},
            json={
                "from": f"Robot <{sender}>",
                "to": [email],
                "subject": f"{code} is your code",
                "text": (f"Your code is {code}.\n\n"
                         f"It works for the next ten minutes.\n\n"
                         f"If this wasn't you, ignore it — nothing's happened."),
            },
            timeout=10,
        )
    except Exception as e:
        print(f"[robot/auth] Resend failed for {email}: {e}")


@auth_bp.route("/api/auth/request", methods=["POST"])
def request_code():
    email = ((request.get_json() or {}).get("email") or "").lower().strip()
    if "@" not in email:
        return jsonify({"error": "That doesn't look like an email address."}), 400

    ok, tenant = _allowed(email)
    if not ok:
        # Say so plainly. Enumeration isn't a meaningful risk here and a vague
        # error just makes someone email you asking why it didn't work.
        return jsonify({"error": "That address isn't on the list yet."}), 403

    code = f"{random.randint(0, 999999):06d}"
    _codes[email] = (code, datetime.utcnow() + CODE_TTL)
    _send_code(email, code)
    return jsonify({"success": True, "sent": True})


@auth_bp.route("/api/auth/verify", methods=["POST"])
def verify_code():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()

    entry = _codes.get(email)
    if not entry:
        return jsonify({"error": "No code outstanding for that address."}), 400
    real, expires = entry
    if datetime.utcnow() > expires:
        _codes.pop(email, None)
        return jsonify({"error": "That code has expired. Ask for another."}), 400
    if code != real:
        return jsonify({"error": "That code isn't right."}), 400

    _codes.pop(email, None)
    ok, tenant = _allowed(email)
    session.permanent = True
    session["email"] = email
    session["tenant"] = tenant
    session["name"] = name or email.split("@")[0].title()
    return jsonify({"success": True, "tenant": tenant, "name": session["name"]})


@auth_bp.route("/api/auth/me")
def me():
    if "email" not in session:
        return jsonify({"authed": False})
    return jsonify({"authed": True, "email": session["email"],
                    "tenant": session.get("tenant"), "name": session.get("name")})


@auth_bp.route("/api/auth/out", methods=["POST"])
def sign_out():
    session.clear()
    return jsonify({"success": True})


def require_auth(fn):
    """Wrap any route that costs money or touches client work."""
    @wraps(fn)
    def inner(*a, **kw):
        if "email" not in session:
            return jsonify({"error": "Sign in first."}), 401
        return fn(*a, **kw)
    return inner
