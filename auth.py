"""
ROBOT — AUTH
============
Two doors, one at a time. Pick with ROBOT_DOOR.

  ROBOT_DOOR=word   (default)  A shared passphrase. No email plumbing needed.
  ROBOT_DOOR=otp               Six-digit code to a whitelisted address.

WORD MODE is what's on now. Anyone with the word gets in — which is the point,
and also the caveat: it's a shared secret sitting in front of an API key that
bills you. Fine while it's you and a couple of people you've told. Before it
goes anywhere near a client, or anywhere it might get pasted into a Slack
channel, flip to OTP.

Change the word with ROBOT_WORD. It's matched case-insensitively and trimmed,
so "Unicorn", "unicorn " and "UNICORN" all work — nobody should fail to get in
over a capital letter.

OTP MODE is the grown-up version and it still works: whitelist by address or
whole domain, six digits, ten minutes, Resend for delivery. The domain also
resolves the tenant, so one line lets a client in and labels them.
"""

from flask import Blueprint, jsonify, request, session
from functools import wraps
from datetime import datetime, timedelta
import os
import random
import requests

auth_bp = Blueprint("auth", __name__)

DOOR = os.environ.get("ROBOT_DOOR", "word").lower()
WORD = os.environ.get("ROBOT_WORD", "unicorn").strip().lower()

# Per-person words, so the door can greet by name: "unicorn:Suz,taniwha:Michael".
# Any word in this map wins over ROBOT_WORD; ROBOT_WORD stays as the anonymous
# fallback. Give each person their own word and HELLO <NAME> comes for free.
WORDS = {}
for pair in os.environ.get("ROBOT_WORDS", "").split(","):
    if ":" in pair:
        w, n = pair.split(":", 1)
        if w.strip():
            WORDS[w.strip().lower()] = n.strip()

# Hunch logins see containers in testing. A name in this list (matched
# against the name a word resolves to) is Hunch; everyone else is a client.
HUNCH = {n.strip().lower() for n in os.environ.get("ROBOT_HUNCH", "Michael").split(",") if n.strip()}


def is_hunch():
    return bool(session.get("hunch"))


# --- The brake --------------------------------------------------------------
# Five wrong words from one address, then the door won't listen for a minute.
# This is what makes a friendly two-word password safe: a person mistyping
# never notices it, a script guessing thousands of words gets nowhere.
BRAKE_TRIES = 5
BRAKE_WAIT = timedelta(minutes=1)
_misses = {}  # ip -> [count, unlock_time]


def _braked(ip):
    entry = _misses.get(ip)
    if not entry:
        return False
    count, unlock = entry
    if count < BRAKE_TRIES:
        return False
    if datetime.utcnow() >= unlock:
        _misses.pop(ip, None)
        return False
    return True


def _miss(ip):
    count = _misses.get(ip, [0, None])[0] + 1
    _misses[ip] = [count, datetime.utcnow() + BRAKE_WAIT]


def _client_ip():
    # Railway sits behind a proxy, so the real address rides in this header.
    fwd = request.headers.get("X-Forwarded-For", "")
    return fwd.split(",")[0].strip() if fwd else (request.remote_addr or "?")


# --- OTP mode config (unused while DOOR == "word") --------------------------
WHITELIST = {
    "michael@hunch.co.nz",
}
ALLOWED_DOMAINS = {
    # "one.nz": "One NZ",
}
CODE_TTL = timedelta(minutes=10)
_codes = {}


@auth_bp.route("/api/auth/mode")
def mode():
    """The front end asks this so it knows which door to draw."""
    return jsonify({"mode": DOOR})


# ---------------------------------------------------------------------------
# WORD MODE
# ---------------------------------------------------------------------------

@auth_bp.route("/api/auth/word", methods=["POST"])
def word():
    ip = _client_ip()
    if _braked(ip):
        return jsonify({"error": "Too many guesses. Give it a minute."}), 429

    data = request.get_json() or {}
    given = (data.get("word") or "").strip().lower()
    name = (data.get("name") or "").strip()

    if not given:
        return jsonify({"error": "Needs a word."}), 400
    if given in WORDS:
        name = WORDS[given]
    elif given != WORD:
        _miss(ip)
        return jsonify({"error": "That's not it."}), 403

    _misses.pop(ip, None)

    session.permanent = True
    session["email"] = "word:" + (name.lower().replace(" ", "-") or "guest")
    session["name"] = name or "there"
    session["tenant"] = ""
    session["hunch"] = (name or "").lower() in HUNCH
    return jsonify({"success": True, "name": session["name"], "tenant": "", "hunch": session["hunch"]})


# ---------------------------------------------------------------------------
# OTP MODE — kept ready. Flip ROBOT_DOOR=otp once Resend is sorted.
# ---------------------------------------------------------------------------

def _allowed(email: str):
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
        print(f"[robot/auth] No RESEND_API_KEY — code for {email} is {code}", flush=True)
        return
    try:
        requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json"},
            json={"from": f"Robot <{sender}>", "to": [email],
                  "subject": f"{code} is your code",
                  "text": (f"Your code is {code}.\n\nIt works for the next ten "
                           f"minutes.\n\nIf this wasn't you, ignore it — nothing's "
                           f"happened.")},
            timeout=10,
        )
    except Exception as e:
        print(f"[robot/auth] Resend failed for {email}: {e}", flush=True)


@auth_bp.route("/api/auth/request", methods=["POST"])
def request_code():
    if DOOR != "otp":
        return jsonify({"error": "The door isn't using codes right now."}), 400
    email = ((request.get_json() or {}).get("email") or "").lower().strip()
    if "@" not in email:
        return jsonify({"error": "That doesn't look like an email address."}), 400
    ok, _ = _allowed(email)
    if not ok:
        return jsonify({"error": "That address isn't on the list yet."}), 403
    code = f"{random.randint(0, 999999):06d}"
    _codes[email] = (code, datetime.utcnow() + CODE_TTL)
    _send_code(email, code)
    return jsonify({"success": True, "sent": True})


@auth_bp.route("/api/auth/verify", methods=["POST"])
def verify_code():
    if DOOR != "otp":
        return jsonify({"error": "The door isn't using codes right now."}), 400
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
    _, tenant = _allowed(email)
    session.permanent = True
    session["email"] = email
    session["tenant"] = tenant
    session["name"] = name or email.split("@")[0].title()
    session["hunch"] = tenant == "Hunch"
    return jsonify({"success": True, "tenant": tenant, "name": session["name"], "hunch": session["hunch"]})


# ---------------------------------------------------------------------------

@auth_bp.route("/api/auth/me")
def me():
    if "email" not in session:
        return jsonify({"authed": False, "mode": DOOR})
    return jsonify({"authed": True, "mode": DOOR, "email": session["email"],
                    "tenant": session.get("tenant"), "name": session.get("name"),
                    "hunch": bool(session.get("hunch"))})


@auth_bp.route("/api/auth/out", methods=["POST"])
def sign_out():
    session.clear()
    return jsonify({"success": True})


def require_auth(fn):
    """Wrap any route that costs money or touches client work."""
    @wraps(fn)
    def inner(*a, **kw):
        if "email" not in session:
            return jsonify({"error": "Say the word first."}), 401
        return fn(*a, **kw)
    return inner
