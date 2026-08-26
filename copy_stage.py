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
MODEL = os.environ.get("ROBOT_MODEL", "claude-opus-4-8")



VOICE = """You write customer emails for One NZ, a New Zealand telco, for their
Rewards programme. You're giving away exclusive prizes to One NZ customers —
sometimes a concert, sometimes movies, always exciting, always customers-only.
The reader is an existing customer who might fancy winning something.

THE VOICE — four pillars, in this order when they fight:
- Proudly Kiwi. New Zealand English, local rhythm, never American.
- Fun and funny. Wit that lands, not wackiness that tries.
- Energetic and adventurous. The prize is a night out, not a transaction.
- Smart. Assume the reader is clever. One good idea beats three loud ones.

HOW TO WRITE IT
- You're an enthusiast, not a cheerleader. Dig for what's genuinely cool
  about this show, band or movie and serve it up snappy and interesting.
- Always dig for the human hook: what the reader gets to do, feel, or tell
  their mates about — not what the product is.
- If the source material is too thin to find the hook, say so in "wants":
  one short line naming what would help you write it better. Don't fake
  enthusiasm you can't source.
- Short sentences. No exclamation marks. Never "Don't miss out", "Hurry",
  "amazing", "grab yours" — that's cheerleading, and you're not one.
- Never write like a press release. A director-and-cast list is the studio's
  writing, not yours.
- The subject line can be playful. The headline must be plain about what you
  win — clarity beats cleverness there, every time.

HARD RULE - NUMBERS AND DATES
You are forbidden from writing any number or date as a literal. Use only these
placeholders, in curly braces, spelled exactly:
  {prize_name} {winners_word} {winner_word} {closes_day} {closes_short}
  {closes_long} {opens_short} {venue} {event_short}
Write "one of {winners_word} double passes", never "one of five".
Write "closes {closes_day}", never "closes Sunday".
A bare digit or a written-out month is a failure and will be rejected."""

GENERATE = """
Return ONLY this JSON, nothing else, no code fences:
{"subjects":["...","...","..."],"headline":"...","body":"...","wants":null}

subjects: three options, each under 45 characters, genuinely different from
each other in approach — not three rewordings of one idea. One can reference
the prize's own world, one can reference what the reader does with it.
headline: one line, says plainly what you win.
body: two or three short sentences. Ends with what to do.
wants: null, or one short line asking for the info that would let you write
this better ("Any reviews or word of mouth on this one?"). Ask only if it
would genuinely change the copy."""

TWEAK = """
You wrote the block below and the human has a note on it. Rewrite it to answer
their note, keeping the same placeholder discipline.

If the note would genuinely make it worse, say so instead of complying — you're
allowed to disagree once, briefly and politely, with a reason. If they come back
insisting, do what they asked.

Return ONLY this JSON, nothing else, no code fences:
{"message":"one short line to them","proposal":"the new text, or null if you're pushing back","pushback":true|false}"""

EXTRACT = """You read a promo brief written by a human and pull out the hard
facts so a form can be pre-filled. Extract ONLY what is actually stated or
unmistakable — never guess, never invent. Missing means null.

prize_type: exactly one of "movie", "gig", "sport", "other", or null.
prize_name: the show, film, artist or event name as a human would write it, or null.
venue: the venue name only (no city unless part of the name), or null.
event_date: the event date in YYYY-MM-DD only if a full, unambiguous date is
stated (assume the next future occurrence if the year is missing), else null.

Return ONLY this JSON, nothing else, no code fences:
{"prize_type":null,"prize_name":null,"venue":null,"event_date":null}"""


# ---------------------------------------------------------------------------
# THE FEEDBACK LOOP
# Two inputs make the robot better over time, both folded into the system
# prompt on every call:
#   1. voice_examples.json — copy the humans rated, with one line on why.
#      This is the gold. Few-shot examples teach voice better than any rule.
#   2. TWEAK_LOG — every correction ever made, persisted to ROBOT_STORE
#      (JSON lines). Recent notes go back into the prompt so the same
#      correction never needs making twice.
# NOTE: Railway's filesystem is ephemeral. Mount a volume at the store path
# or the log survives restarts but not redeploys.
# ---------------------------------------------------------------------------

STORE = os.environ.get("ROBOT_STORE", "robot_store.jsonl")
EXAMPLES_FILE = os.environ.get("ROBOT_EXAMPLES", "voice_examples.json")


def _load_log():
    entries = []
    try:
        with open(STORE) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    except FileNotFoundError:
        pass
    return entries


TWEAK_LOG = _load_log()


def _persist(entry):
    try:
        with open(STORE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError as e:
        print(f"[robot/store] couldn't persist tweak: {e}")


def _examples():
    """voice_examples.json: a list of {"text": ..., "why": ...} (why optional).
    Absent or empty is fine — the slot sits wired and waiting."""
    try:
        with open(EXAMPLES_FILE) as f:
            items = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    out = []
    for it in items if isinstance(items, list) else []:
        if isinstance(it, str):
            out.append({"text": it, "why": ""})
        elif isinstance(it, dict) and it.get("text"):
            out.append({"text": it["text"], "why": it.get("why", "")})
    return out


def _voice_now():
    """The system prompt, assembled fresh each call: the pillars, then the
    gold examples, then recent human corrections."""
    parts = [VOICE]
    ex = _examples()
    if ex:
        lines = "\n".join(f'- "{e["text"]}"' + (f' — {e["why"]}' if e["why"] else "")
                          for e in ex[:8])
        parts.append("COPY THE HUMANS RATED — match this standard and register:\n" + lines)
    notes = []
    for t in reversed(TWEAK_LOG):
        n = (t.get("note") or "").strip()
        if n and n not in notes:
            notes.append(n)
        if len(notes) >= 12:
            break
    if notes:
        parts.append("RECENT CORRECTIONS FROM THE HUMANS — recurring notes on "
                     "your work. Don't make anyone give the same note twice:\n"
                     + "\n".join(f"- {n}" for n in notes))
    return "\n\n".join(parts)


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

    story = data.get("story") or {}
    s_prize = (story.get("prize") or "").strip()[:600]
    s_care = (story.get("care") or "").strip()[:600]

    brief = f"""PRIZE: {facts['prize_name']}
TYPE: {facts['prize_type']}
WINNERS: {facts['winners']} ({'plural' if facts['plural'] else 'singular'})
ENTRIES CLOSE: {facts['closes_long']}"""
    if facts.get("venue"):
        brief += f"\nVENUE: {facts['venue']} on {facts.get('event_long', '')}"
    if s_prize or s_care:
        brief += "\n\nTHE STORY (a human answered these — this is your fuel, lead from here):"
        if s_prize:
            brief += f"\nWhat's the prize? {s_prize}"
        if s_care:
            brief += f"\nWhy will anyone care? {s_care}"
    brief += f"""

WHAT THEY SENT US (the promoter's writing, not ours — mine it for a hook,
don't echo it):
{(data.get('source') or '(nothing supplied)').strip()[:4000]}"""

    try:
        result = _json_from(_call(_voice_now() + GENERATE, brief))
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


@copy_bp.route("/api/extract", methods=["POST"])
@require_auth
def extract():
    """Story -> facts. Reads the human's answers and pre-fills the Detail page.
    Extraction only ever suggests: blanks stay blank, and every value lands in
    an editable field the human confirms. Never guesses, never invents."""
    data = request.get_json() or {}
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500

    def _sect(head, body, cap):
        body = (body or "").strip()
        return (head + "\n" + body)[:cap] if body else None

    text = "\n\n".join(filter(None, [
        _sect("WHAT'S THE PRIZE?", data.get("prize"), 800),
        _sect("WHY WILL ANYONE CARE?", data.get("care"), 800),
        _sect("WHAT THE ROBOT WAS GIVEN:", data.get("source"), 3000),
    ])).strip()
    if not text:
        return jsonify({"success": True, "found": {}})

    try:
        result = _json_from(_call(EXTRACT, text, 300)) or {}
    except Exception as e:
        print(f"[robot/extract] failed: {e}")
        return jsonify({"success": True, "found": {}})  # extraction is a favour, not a gate

    found = {}
    if result.get("prize_type") in ("movie", "gig", "sport", "other"):
        found["prize_type"] = result["prize_type"]
    for k in ("prize_name", "venue", "event_date"):
        v = result.get(k)
        if isinstance(v, str) and v.strip():
            found[k] = v.strip()[:120]
    return jsonify({"success": True, "found": found})


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
        result = _json_from(_call(_voice_now() + TWEAK, user, 700))
    except Exception as e:
        print(f"[robot/tweak] failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500

    if not result:
        return jsonify({"error": "The robot said something we couldn't read."}), 500

    proposal = result.get("proposal")
    flags = check_copy(proposal, facts) if proposal else []

    entry = {
        "at": datetime.utcnow().isoformat(),
        "who": session.get("email"),
        "prize": facts["prize_name"],
        "block": block,
        "note": note,
        "before": current,
        "after": proposal,
        "pushback": bool(result.get("pushback")),
    }
    TWEAK_LOG.append(entry)
    _persist(entry)

    return jsonify({"success": True, "message": result.get("message", ""),
                    "proposal": proposal, "pushback": bool(result.get("pushback")),
                    "flags": flags})


@copy_bp.route("/api/log")
@require_auth
def log():
    """The asset, such as it is. Move this to a real store before volume."""
    return jsonify({"count": len(TWEAK_LOG), "entries": TWEAK_LOG[-200:]})
