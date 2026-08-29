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



CONTAINER = "prize_draw"

# ---------------------------------------------------------------------------
# THE PROMPTS live in /prompts as markdown — findable, editable, diffable
# without touching this file. Workers are the engine and sit flat (writer,
# fixer, feeder, extract); a container is only voice + specs, under
# containers/<name>/. The folder structure is the site plan's §6.
# Files are re-read when they change on disk, so a prompt edit lands on the
# next call — no restart. A missing file fails loud: better a crash on
# deploy than the robot quietly writing from a stale voice.
# ---------------------------------------------------------------------------

PROMPTS_DIR = os.environ.get(
    "ROBOT_PROMPTS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts"))
_PROMPT_CACHE = {}

def prompt(name):
    path = os.path.join(PROMPTS_DIR, name + ".md")
    try:
        mtime = os.path.getmtime(path)
        cached = _PROMPT_CACHE.get(name)
        if cached and cached[0] == mtime:
            return cached[1]
        with open(path) as f:
            text = f.read().strip()
        _PROMPT_CACHE[name] = (mtime, text)
        return text
    except OSError as e:
        raise RuntimeError(f"prompt file missing: {path}") from e

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
    """The container's voice, assembled fresh each call: the voice pages,
    then the gold examples, then recent curated corrections."""
    parts = [prompt(f"containers/{CONTAINER}/voice")]
    ex = _examples()
    if ex:
        lines = "\n".join(f'- "{e["text"]}"' + (f' — {e["why"]}' if e["why"] else "")
                          for e in ex[:8])
        parts.append("COPY THE HUMANS RATED — match this standard and register:\n" + lines)
    notes = []
    for t in reversed(TWEAK_LOG):
        # container-tagged so Prize Draw corrections never leak into the
        # next format's prompts; untagged entries predate the tag and are
        # Prize Draw by birth
        if t.get("container", CONTAINER) != CONTAINER:
            continue
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
        result = _json_from(_call(
            _voice_now() + "\n\n" + prompt(f"containers/{CONTAINER}/specs")
            + "\n\n" + prompt("writer"), brief))
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
        result = _json_from(_call(prompt("extract"), text, 300)) or {}
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
    """The FIXER. Smallest change that honours the note — the new copy
    goes straight back to the card, changes marked client-side. declined
    covers both the locked-fact refusal and the one allowed pushback."""
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

    user = f"THE BLOCK: {block}\n\nCURRENT:\n{current}\n\nTHE NOTE:\n{note}"
    hl = (data.get("highlight") or "").strip()
    if hl:
        user += f"\n\nTHE HIGHLIGHT (operate here):\n{hl[:300]}"
    insight = (data.get("insight") or "").strip()
    if insight:
        user += f"\n\nTHE INSIGHT (the copy must still carry this):\n{insight[:600]}"
    if data.get("history"):
        user += "\n\nEARLIER IN THIS EXCHANGE:\n" + "\n".join(data["history"])[:2000]

    try:
        result = _json_from(_call(
            _voice_now() + "\n\n" + prompt(f"containers/{CONTAINER}/specs")
            + "\n\n" + prompt("fixer"), user, 700))
    except Exception as e:
        print(f"[robot/tweak] failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500

    if not result:
        return jsonify({"error": "The robot said something we couldn't read."}), 500

    say = result.get("say") or ""
    action = result.get("action")
    if action not in ("lock", "change", "ask", "decline"):
        # older shape: declined -> decline, copy -> change, else ask
        action = "decline" if result.get("declined") else \
                 ("change" if result.get("copy") else "ask")
    new_copy = result.get("copy") if action == "change" else None
    if action == "change" and not new_copy:
        action = "ask"          # a change with no copy is just a question
    flags = check_copy(new_copy, facts) if new_copy else []

    entry = {
        "at": datetime.utcnow().isoformat(),
        "who": session.get("email"),
        "container": CONTAINER,
        "prize": facts["prize_name"],
        "block": block,
        "note": note,
        "before": current,
        "after": new_copy,
        "action": action,
        "declined": action == "decline",
    }
    TWEAK_LOG.append(entry)
    _persist(entry)

    return jsonify({"success": True, "action": action, "say": say,
                    "copy": new_copy, "declined": action == "decline",
                    "wants": result.get("wants"), "flags": flags})


@copy_bp.route("/api/log")
@require_auth
def log():
    """The asset, such as it is. Move this to a real store before volume."""
    return jsonify({"count": len(TWEAK_LOG), "entries": TWEAK_LOG[-200:]})


# ---------------------------------------------------------------------------
# THE QUIZ — the front of FEED IT (hit list 2).
# The quiz definition lives in the container (quiz.json): the fixed rail of
# three questions, the ghost's shape, the tool flags. Hand-authored today;
# SET UP (hit list 22) generates it tomorrow, so the engine reads it blind.
# The FEEDER dresses the rail live between questions — and falls back to the
# config's standing patter on any stumble, so the robot never breaks
# character and the front end never sees the difference. One failure surface.
# ---------------------------------------------------------------------------

_QUIZ_CACHE = {}

def quiz_config():
    """containers/<name>/quiz.json, re-read when it changes on disk —
    same freshness rule as prompt(). Missing file fails loud, same as a
    missing prompt: better a crash on deploy than a quiz from nowhere."""
    path = os.path.join(PROMPTS_DIR, "containers", CONTAINER, "quiz.json")
    mtime = os.path.getmtime(path)
    cached = _QUIZ_CACHE.get(path)
    if cached and cached[0] == mtime:
        return cached[1]
    with open(path) as f:
        cfg = json.load(f)
    _QUIZ_CACHE[path] = (mtime, cfg)
    return cfg


@copy_bp.route("/api/quiz")
@require_auth
def quiz():
    """The quiz definition, minus the plumbing comments. Free and instant."""
    cfg = quiz_config()
    return jsonify({k: v for k, v in cfg.items() if not k.startswith("_")})


@copy_bp.route("/api/feeder", methods=["POST"])
@require_auth
def feeder():
    """Between-questions patter. In: the answers so far and which question
    comes next. Out: {ack, ask}. The rail is fixed — the FEEDER only
    dresses the next fixed question to fit what's already in hand."""
    data = request.get_json() or {}
    cfg = quiz_config()
    questions = cfg.get("questions", [])
    nxt = data.get("next")
    q = next((x for x in questions if x.get("n") == nxt), None)
    if not q:
        return jsonify({"error": "No such question."}), 400

    # the fallback is the config's own words — used on any stumble
    fallback = {"success": True, "ack": "", "ask": q.get("patter", ""),
                "live": False}

    if not ANTHROPIC_API_KEY:
        return jsonify(fallback)

    answers = data.get("answers") or {}
    got = []
    for x in questions:
        a = (answers.get(x["key"]) or "").strip()
        if a:
            got.append(f"Q{x['n']} — {x['title']}\nTHEY SAID: {a[:2500]}")
    user = ("THE FIXED RAIL:\n"
            + "\n".join(f"Q{x['n']}: {x['title']} — {x['patter']}"
                        for x in questions)
            + "\n\nANSWERS SO FAR:\n" + ("\n\n".join(got) or "(nothing yet)")
            + f"\n\nNEXT UP: Q{q['n']} — {q['title']}")

    try:
        result = _json_from(_call(prompt("feeder"), user, 300))
    except Exception as e:
        print(f"[robot/feeder] fell back to config patter: {e}")
        return jsonify(fallback)

    if not result or not (result.get("ask") or "").strip():
        return jsonify(fallback)

    return jsonify({"success": True, "ack": (result.get("ack") or "").strip(),
                    "ask": result["ask"].strip(), "live": True})
