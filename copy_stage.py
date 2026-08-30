"""
ROBOT — COPY STAGE
==================
The only part the model touches. It writes prose. It never writes a fact —
facts come from the checklist through engine.build_facts, and where a
container has a placeholder rule the copy carries them as {slots}.

Every route takes a container id and reads that container's definition
(containers.py). Nothing here knows what a prize or a card is.

  POST /api/copy      container + facts + story -> the modules, filled
  POST /api/tweak     container + one module + a human note -> lock / change / ask / decline
  POST /api/extract   container + the dump -> checklist pre-fill
  POST /api/feeder    container + dump + answers -> the next move, dressed
  GET  /api/log       the tweak log

Every tweak is logged to ROBOT_STORE, container-tagged. That log is the
asset. Mount a Railway volume at the store path or a redeploy eats it.
"""

from flask import Blueprint, jsonify, request, session
import anthropic
import os
import json
import re
from datetime import datetime

from auth import require_auth
import containers as CT
from engine import build_facts, check_copy, copy_context, TermsError

copy_bp = Blueprint("copy", __name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = os.environ.get("ROBOT_MODEL", "claude-opus-4-8")

# ---------------------------------------------------------------------------
# THE WORKERS live in /prompts as markdown: writer, fixer, feeder, extract.
# They're the engine — one fixed machine — and they never mention a
# container. Voice and spec arrive from the container on every call.
# Files are re-read when they change on disk, so a prompt edit lands on the
# next call. A missing file fails loud.
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
        with open(path, encoding="utf-8") as f:
            text = f.read().strip()
        _PROMPT_CACHE[name] = (mtime, text)
        return text
    except OSError as e:
        raise RuntimeError(f"prompt file missing: {path}") from e


def _container():
    """The container this call is about. Missing or unknown is a 404 the
    front end can read; nothing defaults to a format any more."""
    data = request.get_json(silent=True) or {}
    cid = data.get("container") or request.args.get("container") or ""
    return CT.container(cid), data


# ---------------------------------------------------------------------------
# THE FEEDBACK LOOP — the tweak log and the gold examples, folded into the
# voice on every call. The log always records; the prompt only eats what a
# Hunch human has curated (hit list 11) — until then, recent notes.
# ---------------------------------------------------------------------------

STORE = os.environ.get("ROBOT_STORE", "robot_store.jsonl")
EXAMPLES_FILE = os.environ.get("ROBOT_EXAMPLES", "voice_examples.json")


def _load_log():
    entries = []
    try:
        with open(STORE, encoding="utf-8") as f:
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
        with open(STORE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError as e:
        print(f"[robot/store] couldn't persist tweak: {e}")


def _examples(cid):
    """voice_examples.json: a list of {"text", "why", "container"?}. Absent
    or empty is fine. Untagged examples predate the tag and are prize_draw."""
    try:
        with open(EXAMPLES_FILE, encoding="utf-8") as f:
            items = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    out = []
    for it in items if isinstance(items, list) else []:
        if isinstance(it, str):
            it = {"text": it}
        if isinstance(it, dict) and it.get("text") and it.get("container", "prize_draw") == cid:
            out.append({"text": it["text"], "why": it.get("why", "")})
    return out


def _voice_now(c):
    """The voice, assembled fresh each call: the brand's voice, this
    container's lean, the gold examples, then recent corrections —
    container-tagged so formats never cross-contaminate."""
    parts = [CT.voice_for(c)]
    ex = _examples(c["id"])
    if ex:
        lines = "\n".join(f'- "{e["text"]}"' + (f' — {e["why"]}' if e["why"] else "") for e in ex[:8])
        parts.append("COPY THE HUMANS RATED — match this standard and register:\n" + lines)
    notes = []
    for t in reversed(TWEAK_LOG):
        if t.get("container", "prize_draw") != c["id"]:
            continue
        n = (t.get("note") or "").strip()
        if n and n not in notes:
            notes.append(n)
        if len(notes) >= 12:
            break
    if notes:
        parts.append("RECENT CORRECTIONS FROM THE HUMANS — recurring notes on your work. "
                     "Don't make anyone give the same note twice:\n" + "\n".join(f"- {n}" for n in notes))
    return "\n\n".join(p for p in parts if p)


def _system(c, worker):
    return _voice_now(c) + "\n\nTHE SPEC FOR THIS FORMAT:\n" + CT.specs_for(c) + "\n\n" + prompt(worker)


def _json_from(text):
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


# ---------------------------------------------------------------------------
# THE SHAPE — what the WRITER returns, read off the spec's modules.
# writer-filled modules become keys. A module whose length asks for
# options ("Three options", "A and B") becomes a list. A repeating module
# ("card ×N") becomes a list of objects, one per item in the facts, with
# its sub-modules (card-title, card-body) as keys.
# ---------------------------------------------------------------------------

def writer_modules(c):
    """(top-level writer modules, repeating groups with their writer parts)."""
    top, groups = [], {}
    for m in c["spec"]["modules"]:
        if m.get("repeat"):
            groups[m["module"]] = {"module": m["module"], "repeat": m["repeat"], "parts": []}
            continue
        parent = next((g for g in groups if m["module"].startswith(g + "-")), None)
        if parent:
            if m["filled_by"].startswith("writer"):
                groups[parent]["parts"].append(m)
        elif m["filled_by"].startswith("writer"):
            top.append(m)
    return top, list(groups.values())


def options_of(m):
    L = m.get("length", "")
    if re.search(r"\bthree options\b", L, re.I):
        return 3
    if re.search(r"\bA and B\b", L):
        return 2
    return 0


def _shape(c, facts):
    top, groups = writer_modules(c)
    shape, notes = {}, []
    for m in top:
        n = options_of(m)
        shape[m["module"]] = ["..."] * n if n else "..."
        notes.append(f"{m['module']}: {m['length']}" + (f" ({n} options, best first)" if n else ""))
    for g in groups:
        key = g["module"]
        items = facts.get(key) or next((v for v in facts.values() if isinstance(v, list)), [])
        count = len(items) if isinstance(items, list) else 0
        inner = {p["module"]: "..." for p in g["parts"]}
        shape[key + "s"] = [inner] * max(count, 1)
        notes.append(f"{key}s: {count or 'N'} objects, one per {key} in the brief, in order. "
                     + "; ".join(f"{p['module']}: {p['length']}" for p in g["parts"]))
    shape["why"] = {m["module"]: "..." for m in top}
    for g in groups:
        shape["why"][g["module"]] = "..."
    shape["wants"] = None
    return shape, notes


def _brief(c, facts, story, source):
    """The facts as words, the human's answers, the angle, the dump."""
    lines = []
    for g in c["needs"]["groups"]:
        if g["repeat"]:
            continue
        for r in g["rows"]:
            v = facts.get(r["id"])
            if v in (None, ""):
                continue
            if r["type"] == "date":
                v = facts.get(r["id"] + "_long", v)
                if facts.get(r["id"] + "_time"):
                    v += f" at {facts[r['id'] + '_time']}"
            if facts.get(r["id"] + "_other"):
                v = f"{v} ({facts[r['id'] + '_other']})"
            lines.append(f"{r['label'].upper()}: {v}")
    # repeating groups, in words: the row's label, the value as a human
    # would say it. Never a fact id — the WRITER can't tell a key from a word.
    labels = {r["id"]: r for g in c["needs"]["groups"] for r in g["rows"]}
    topics = {x["id"]: x["label"] for x in c["legals"]["extras"]}
    for key, items in facts.items():
        if not isinstance(items, list):
            continue
        for it in items:
            bits = []
            for k, v in it.items():
                r = labels.get(k)
                if not r or v in (None, "", []):
                    continue
                if r["type"] == "date":
                    v = it.get(k + "_long", v)
                    if it.get(k + "_time"):
                        v = f"{v} at {it[k + '_time']}"
                elif r["type"] == "topics":
                    v = ", ".join(topics.get(x, x) for x in v)
                bits.append(f"{r['label']}: {v}")
            lines.append(f"{key.upper()} {it.get('n', '')}: " + " · ".join(bits))
    brief = "THE FACTS (from the checklist — quote them, never restate them):\n" + "\n".join(lines)

    moves = c["feed_it"]["moves"]
    got = [(m, (story.get(move_key(m)) or "").strip()) for m in moves]
    if any(a for m, a in got if m["n"] != 3):
        brief += "\n\nTHE STORY (a human answered these — this is your fuel, lead from here):"
        for m, a in got:
            if a and m["n"] != 3:
                brief += f"\n{m['plain']} {a[:600]}"
    angle = (story.get("angle") or "").strip()
    if angle:
        brief += f"\n\nTHE ANGLE (agreed with the human in the chat — the one idea the piece hangs off, write to it):\n{angle[:300]}"
    brief += ("\n\nWHAT THEY SENT US (their writing, not ours — mine it for a hook, don't echo it):\n"
              + (source or "(nothing supplied)").strip()[:6000])
    return brief


def move_key(m):
    """A move's key in the answers: its job word — gap, benefit, angle."""
    return re.sub(r"^the\s+", "", m["job"].strip().lower()).replace(" ", "_")


def _flags(c, result, facts):
    top, groups = writer_modules(c)
    flags = []
    for m in top:
        v = result.get(m["module"])
        for text in (v if isinstance(v, list) else [v]):
            flags += check_copy(c, text or "", facts, m["module"])
    for g in groups:
        for it in result.get(g["module"] + "s") or []:
            if isinstance(it, dict):
                for p in g["parts"]:
                    flags += check_copy(c, it.get(p["module"]) or "", facts, p["module"])
    return flags


@copy_bp.route("/api/copy", methods=["POST"])
@require_auth
def generate():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500
    try:
        facts = build_facts(c, data.get("form") or {})
    except TermsError as e:
        return jsonify({"error": str(e)}), 400

    shape, notes = _shape(c, facts)
    user = (_brief(c, facts, data.get("story") or {}, data.get("source"))
            + "\n\nTHE SHAPE TO RETURN — JSON only, these keys exactly:\n"
            + json.dumps(shape, ensure_ascii=False)
            + "\n\nMODULE BY MODULE:\n" + "\n".join(f"- {n}" for n in notes))
    try:
        result = _json_from(_call(_system(c, "writer"), user, 2000))
    except Exception as e:
        print(f"[robot/copy] generate failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500
    top, _ = writer_modules(c)
    if not result or not any(m["module"] in result for m in top):
        return jsonify({"error": "The robot said something we couldn't read. Try again?"}), 500
    return jsonify({"success": True, "copy": result, "facts": facts,
                    "context": copy_context(c, facts), "flags": _flags(c, result, facts)})


# ---------------------------------------------------------------------------
# EXTRACT — the dump -> checklist pre-fill. Suggests, never gates.
# ---------------------------------------------------------------------------

def _extract_shape(c):
    shape, notes = {}, []
    for g in c["needs"]["groups"]:
        rows = [r for r in g["rows"] if r["type"] in ("text", "number", "date", "select", "topics")]
        if not rows:
            continue
        inner = {r["id"]: None for r in rows}
        for r in rows:
            t = r["type"]
            if t == "select":
                t += " — one of: " + " / ".join(r.get("options", []))
            if t == "topics":
                t = "list — any of: " + " / ".join(f"{x['id']} ({x['label']})" for x in c["legals"]["extras"]) + ", else []"
            notes.append(f"{r['id']} ({t}): {r['label']}")
        if g["repeat"]:
            key = g["repeat"]["per"].split()[-1]
            shape.setdefault(key, [{}])[0].update(inner)
        else:
            shape.update(inner)
    return shape, notes


@copy_bp.route("/api/extract", methods=["POST"])
@require_auth
def extract():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    if not ANTHROPIC_API_KEY:
        return jsonify({"success": True, "found": {}})
    text = (data.get("source") or "").strip()[:8000]
    for k, v in (data.get("answers") or {}).items():
        if v:
            text += f"\n\n{k.upper()}:\n{str(v).strip()[:800]}"
    if not text.strip():
        return jsonify({"success": True, "found": {}})
    shape, notes = _extract_shape(c)
    user = ("THE DUMP:\n" + text + "\n\nTHE FIELDS:\n" + "\n".join(f"- {n}" for n in notes)
            + "\n\nRETURN EXACTLY THIS SHAPE:\n" + json.dumps(shape))
    try:
        result = _json_from(_call(prompt("extract"), user, 600)) or {}
    except Exception as e:
        print(f"[robot/extract] failed: {e}")
        return jsonify({"success": True, "found": {}})     # a favour, not a gate

    # only keep what the checklist has a row for, typed as the row says
    rows = {r["id"]: r for g in c["needs"]["groups"] for r in g["rows"]}
    def keep(d):
        out = {}
        for k, v in (d or {}).items():
            r = rows.get(k)
            if not r or v in (None, ""):
                continue
            if r["type"] == "topics":
                ok = {x["id"] for x in c["legals"]["extras"]}
                out[k] = [x for x in (v if isinstance(v, list) else []) if x in ok]
                continue
            v = str(v).strip()[:160]
            if r["type"] == "select" and v not in r.get("options", []):
                continue
            out[k] = v
        return out
    found = keep(result)
    for k, v in result.items():
        if isinstance(v, list):
            found[k] = [keep(x) for x in v if isinstance(x, dict)]
    return jsonify({"success": True, "found": found})


# ---------------------------------------------------------------------------
# FIXER — smallest change that honours the note. Container-tagged log.
# ---------------------------------------------------------------------------

@copy_bp.route("/api/tweak", methods=["POST"])
@require_auth
def tweak():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500
    block = (data.get("block") or "").strip()
    current = (data.get("current") or "").strip()
    note = (data.get("note") or "").strip()
    if not current or not note:
        return jsonify({"error": "Need something to tweak and a note about it."}), 400
    try:
        facts = build_facts(c, data.get("form") or {})
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
        result = _json_from(_call(_system(c, "fixer"), user, 700))
    except Exception as e:
        print(f"[robot/tweak] failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500
    if not result:
        return jsonify({"error": "The robot said something we couldn't read."}), 500

    say = result.get("say") or ""
    action = result.get("action")
    if action not in ("lock", "change", "ask", "decline"):
        action = "decline" if result.get("declined") else ("change" if result.get("copy") else "ask")
    new_copy = result.get("copy") if action == "change" else None
    if action == "change" and not new_copy:
        action = "ask"
    flags = check_copy(c, new_copy, facts, block.split("#")[0]) if new_copy else []

    entry = {
        "at": datetime.utcnow().isoformat(), "who": session.get("email"),
        "container": c["id"], "run": data.get("run") or "",
        "block": block, "note": note, "before": current, "after": new_copy,
        "action": action, "declined": action == "decline",
    }
    TWEAK_LOG.append(entry)
    _persist(entry)
    return jsonify({"success": True, "action": action, "say": say, "copy": new_copy,
                    "declined": action == "decline", "wants": result.get("wants"), "flags": flags})


@copy_bp.route("/api/log")
@require_auth
def log():
    return jsonify({"count": len(TWEAK_LOG), "entries": TWEAK_LOG[-200:]})


# ---------------------------------------------------------------------------
# FEEDER — BOUNCE IT. The rail is the engine's (gap / benefit / angle);
# the container dresses it (config FEED IT). Plain fallback on any stumble.
# ---------------------------------------------------------------------------

@copy_bp.route("/api/feeder", methods=["POST"])
@require_auth
def feeder():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    moves = c["feed_it"]["moves"]
    nxt = data.get("next")
    m = next((x for x in moves if x["n"] == nxt), None)
    if not m:
        return jsonify({"error": "No such move."}), 400
    fallback = {"success": True, "confirm": "", "enrich": m["plain"], "angle": "", "live": False}
    if not ANTHROPIC_API_KEY:
        return jsonify(fallback)

    dump = (data.get("dump") or "").strip()
    answers = data.get("answers") or {}
    got = []
    for x in moves:
        a = (answers.get(move_key(x)) or "").strip()
        if a:
            got.append(f"MOVE {x['n']} — {x['plain']}\nTHEY SAID: {a[:2500]}")
    sound = c["brand_data"].get("voice", "")[:1800]
    user = ("WHAT THE CONTAINER NEEDS:\n" + (c["feed_it"]["needs"] or "(not stated)")
            + "\n\nWHAT THE CONTAINER SOUNDS LIKE (read-only):\n" + (sound or "(not stated)")
            + "\n\nTHE FIXED RAIL:\n" + "\n".join(f"MOVE {x['n']} ({x['job']}): {x['plain']}" for x in moves)
            + "\n\nTHE DUMP:\n" + (dump[:6000] or "(empty — nothing dropped in)")
            + "\n\nANSWERS SO FAR:\n" + ("\n\n".join(got) or "(nothing yet)")
            + f"\n\nNEXT UP: MOVE {m['n']} — {m['job']} — plain version: {m['plain']}")
    try:
        result = _json_from(_call(prompt("feeder"), user, 400))
    except Exception as e:
        print(f"[robot/feeder] fell back to plain: {e}")
        return jsonify(fallback)
    if not result or not (result.get("enrich") or "").strip():
        return jsonify(fallback)
    out = {"success": True, "confirm": (result.get("confirm") or "").strip(),
           "enrich": result["enrich"].strip(), "angle": "", "live": True}
    if m["n"] == 3:
        ang = (result.get("angle") or "").strip().strip('"\u201c\u201d')
        if not ang:
            return jsonify(fallback)
        out["angle"] = ang[:300]
    return jsonify(out)
