"""
ROBOT — COPY STAGE
==================
The only part the model touches. It writes prose. It never writes a number or
a date — those come through as placeholders that Python fills from the same
FACTS dict that built the terms, so the copy and the terms cannot disagree.

Two routes:
  POST /api/copy   facts + source material -> 3 subjects, headline, body
  POST /api/tweak  one block + a human note -> a proposal, or a pushback

Both are auth-gated: they cost money.

Every tweak is logged to TWEAK_LOG. That log is the actual asset here — a few
hundred recorded human judgements about what One NZ sounds like when it's good.
Move it to a real store before this sees any volume; losing it on restart is
losing the point.
"""

from flask import Blueprint, jsonify, request, session
import anthropic
import os
import json
from datetime import datetime

from auth import require_auth
from terms import build_facts, check_copy, copy_context, TermsError

copy_bp = Blueprint("copy", __name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = os.environ.get("ROBOT_MODEL", "claude-sonnet-4-6")

TWEAK_LOG = []


VOICE = """You write customer emails for One NZ, a New Zealand telco, for their
Rewards programme. The reader is an existing customer who might fancy winning
something.

VOICE
- New Zealand English. Warm, dry, unfussy. Never American, never breathless.
- Short sentences. No exclamation marks. No "Don't miss out", no "Hurry",
  no "amazing", no "grab yours".
- Never write like a press release. If the source material lists a director and
  a cast, that's the studio's writing, not yours. Find the human hook instead.
- The subject line can be playful. The headline has to be clear about what you
  win — clarity beats cleverness there, every time.

HARD RULE - NUMBERS AND DATES
You are forbidden from writing any number or date as a literal. Use only these
placeholders, in curly braces, spelled exactly:
  {prize_name} {winners_word} {winner_word} {closes_day} {closes_short}
  {closes_long} {opens_short} {venue} {event_short}
Write "one of {winners_word} double passes", never "one of five".
Write "closes {closes_day}", never "closes Sunday".
A bare digit or a written-out month is a failure and will be rejected."""

GENERATE = VOICE + """

Return ONLY this JSON, nothing else, no code fences:
{"subjects":["...","...","..."],"headline":"...","body":"..."}

subjects: three options, each under 45 characters, genuinely different from
each other in approach — not three rewordings of one idea. One can reference
the prize's own world, one can reference what the reader does with it.
headline: one line, says plainly what you win.
body: two or three short sentences. Ends with what to do."""

TWEAK = VOICE + """

You wrote the block below and the human has a note on it. Rewrite it to answer
their note, keeping the same placeholder discipline.

If the note would genuinely make it worse, say so instead of complying — you're
allowed to disagree once, briefly and politely, with a reason. If they come back
insisting, do what they asked.

Return ONLY this JSON, nothing else, no code fences:
{"message":"one short line to them","proposal":"the new text, or null if you're pushing back","pushback":true|false}"""


def _json_from(text):
    """Pull a JSON object out of a reply, tolerant of fences and preamble."""
    if not text:
        return None
    t = text.replace("```json", "").replace("```", "").strip()
    s, e = t.find("{"), t.rfind("}")
    if s == -1 or e < s:
        return None
    try:
        return json.loads(t[s:e + 1])
    except json.JSONDecodeError:
        return None


def _call(system, user, max_tokens=1200):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=MODEL, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}],
    )
    return (resp.content[0].text or "").strip()


@copy_bp.route("/api/copy", methods=["POST"])
@require_auth
def generate():
    data = request.get_json() or {}
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500
    try:
        facts = build_facts(data.get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400

    brief = f"""PRIZE: {facts['prize_name']}
TYPE: {facts['prize_type']}
WINNERS: {facts['winners']} ({'plural' if facts['plural'] else 'singular'})
ENTRIES CLOSE: {facts['closes_long']}"""
    if facts.get("venue"):
        brief += f"\nVENUE: {facts['venue']} on {facts.get('event_long', '')}"
    brief += f"""

WHAT THEY SENT US (the promoter's writing, not ours — mine it for a hook,
don't echo it):
{(data.get('source') or '(nothing supplied)').strip()[:4000]}"""

    try:
        result = _json_from(_call(GENERATE, brief))
    except Exception as e:
        print(f"[robot/copy] generate failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500

    if not result or "subjects" not in result:
        return jsonify({"error": "The robot said something we couldn't read. Try again?"}), 500

    blocks = list(result.get("subjects", [])) + [result.get("headline", ""),
                                                 result.get("body", "")]
    flags = []
    for b in blocks:
        flags += check_copy(b or "", facts)

    return jsonify({"success": True, "copy": result, "facts": facts,
                    "context": copy_context(facts), "flags": flags})


@copy_bp.route("/api/tweak", methods=["POST"])
@require_auth
def tweak():
    data = request.get_json() or {}
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500

    block = (data.get("block") or "").strip()
    current = (data.get("current") or "").strip()
    note = (data.get("note") or "").strip()
    if not current or not note:
        return jsonify({"error": "Need something to tweak and a note about it."}), 400

    try:
        facts = build_facts(data.get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400

    user = f"BLOCK: {block}\n\nCURRENT:\n{current}\n\nTHEIR NOTE:\n{note}"
    if data.get("history"):
        user += "\n\nEARLIER IN THIS EXCHANGE:\n" + "\n".join(data["history"])[:2000]

    try:
        result = _json_from(_call(TWEAK, user, 700))
    except Exception as e:
        print(f"[robot/tweak] failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500

    if not result:
        return jsonify({"error": "The robot said something we couldn't read."}), 500

    proposal = result.get("proposal")
    flags = check_copy(proposal, facts) if proposal else []

    TWEAK_LOG.append({
        "at": datetime.utcnow().isoformat(),
        "who": session.get("email"),
        "prize": facts["prize_name"],
        "block": block,
        "note": note,
        "before": current,
        "after": proposal,
        "pushback": bool(result.get("pushback")),
    })

    return jsonify({"success": True, "message": result.get("message", ""),
                    "proposal": proposal, "pushback": bool(result.get("pushback")),
                    "flags": flags})


@copy_bp.route("/api/log")
@require_auth
def log():
    """The asset, such as it is. Move this to a real store before volume."""
    return jsonify({"count": len(TWEAK_LOG), "entries": TWEAK_LOG[-200:]})
