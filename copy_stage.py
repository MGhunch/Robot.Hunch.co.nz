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
  POST /api/feeder    container + dump + the conversation -> the next beat,
                      the brief when it closes, and the checklist pre-fill
  POST /api/search    container + a subject -> the searches, then the facts
  POST /api/read      a dropped file -> its words, whatever it arrived as
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
import robots
import readers
from engine import build_facts, check_copy, copy_context, TermsError

copy_bp = Blueprint("copy", __name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
# Which robot where lives in robots.py — site plan §6, one file, one edit.

# ---------------------------------------------------------------------------
# THE WORKERS live in /prompts as markdown: writer, fixer, feeder, search,
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


def _call(worker, system, user, max_tokens=1200):
    """`worker` is the lane, not a model id — robots.py decides which model
    that lane rides. Same string as the prompt filename, so the two can't
    drift apart unnoticed."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=robots.robot(worker), max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}],
    )
    # Join the text blocks, same as _search_call and _call_blocks: a
    # response is a list of blocks, not one lump of text, and content[0]
    # is not promised to be the text. This line silently killed the
    # FEEDER and EXTRACT after the sonnet-5 bump (v029).
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()


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

    point = (story.get("point") or "").strip()
    insight = (story.get("insight") or "").strip()
    if point or insight:
        brief += ("\n\nTHE BRIEF (from the bounce — a steer, not the material. "
                  "It says where to start in what they sent):")
        if point:
            brief += f"\nTHE POINT: {point[:600]}"
        if insight:
            brief += f"\nWHY PEOPLE WILL CARE: {insight[:600]}"
    angle = (story.get("angle") or "").strip()
    if angle:
        brief += ("\n\nTHE ANGLE (agreed with the human in the chat — the one idea the "
                  "piece hangs off, write to it. It's a proposition, not a line: don't "
                  "quote it back, write from it):\n" + angle[:300])
    brief += ("\n\nWHAT THEY SENT US (their writing, not ours — everything that went in, "
              "whole. Mine it for a hook, don't echo it):\n"
              + (source or "(nothing supplied)").strip()[:6000])
    # Precedence, stated once and plainly. The dump travels whole so nothing
    # is lost, which means the only thing stopping an unchecked date reaching
    # the copy is this line. Filtering can miss something; ranking can't.
    brief += ("\n\nWHICH WINS: the checklist facts above are canon. A human has ticked "
              "every one of them. Where anything in what they sent disagrees with a "
              "checklist fact, the checklist fact is right and the other one is old. "
              "Never write a date, a name, a place or a number that came from their "
              "material when the checklist states it.")
    return brief


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
        result = _json_from(_call("writer", _system(c, "writer"), user, 2000))
    except Exception as e:
        print(f"[robot/copy] generate failed: {e}")
        return jsonify({"error": "The robot fell over. Try again?"}), 500
    top, _ = writer_modules(c)
    if not result or not any(m["module"] in result for m in top):
        return jsonify({"error": "The robot said something we couldn't read. Try again?"}), 500
    return jsonify({"success": True, "copy": result, "facts": facts,
                    "context": copy_context(c, facts), "flags": _flags(c, result, facts)})


# ---------------------------------------------------------------------------
# THE CHECKLIST PRE-FILL — the shape the FEEDER fills, and the filter that
# only lets through what the checklist actually has a row for. Suggests,
# never gates: nothing here arrives ticked.
# ---------------------------------------------------------------------------

def _prefill_shape(c):
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


def _keep_found(c, raw):
    """Only what the checklist has a row for, typed as the row says. The
    FEEDER is asked not to guess; this is the belt to that brace."""
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

    found = keep(raw if isinstance(raw, dict) else {})
    for k, v in (raw or {}).items():
        if isinstance(v, list):
            found[k] = [keep(x) for x in v if isinstance(x, dict)]
    return found


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
        result = _json_from(_call("fixer", _system(c, "fixer"), user, 700))
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
# FEEDER — BOUNCE IT. Three NEEDS that have to be true (point, insight,
# angle), not three moves to march through. The FEEDER decides how many
# turns that honestly takes, and it ends when the human says nothing's
# missing — not when a counter says three.
#
# One read of the dump, two outputs: the BRIEF the WRITER writes from, and
# the checklist PRE-FILL the human checks. EXTRACT used to be a second,
# silent read of the same material; it isn't any more.
# ---------------------------------------------------------------------------

NEEDS_ORDER = ("point", "insight", "angle")

# Not a rail — a seatbelt. The close is the human's to give, but a model
# that never sets `done` must not be able to loop for ever on a billable
# key. If this ever fires in real use it is a bug in the prompt, not a
# design limit, and the log line says so.
TURN_LIMIT = 8


@copy_bp.route("/api/feeder", methods=["POST"])
@require_auth
def feeder():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    fi = c["feed_it"]
    dress = {b["need"]: b for b in fi["bounce"]}
    turns = [t for t in (data.get("turns") or []) if isinstance(t, dict)]
    dump = (data.get("dump") or "").strip()

    def plain(n):
        return (dress.get(n) or {}).get("plain") or "What's this all about?"

    def said(i):
        return (turns[i].get("answer") or "").strip() if i < len(turns) else ""

    def fallback():
        """No key, or the model stumbled: walk the three needs in order and
        close after them. The old fixed behaviour, kept honest with
        live:false so the front end never claims the robot spoke."""
        i = len(turns)
        if i >= len(NEEDS_ORDER):
            return {"success": True, "live": False, "react": "", "ask": "", "done": True,
                    "need": "angle", "angle": "", "found": {},
                    "brief": {"point": said(0), "insight": said(1), "angle": said(2)}}
        return {"success": True, "live": False, "react": "", "ask": plain(NEEDS_ORDER[i]),
                "need": NEEDS_ORDER[i], "angle": "", "done": False, "found": {}, "brief": {}}

    if not ANTHROPIC_API_KEY:
        return jsonify(fallback())

    if len(turns) >= TURN_LIMIT:
        print(f"[robot/feeder] turn limit hit at {len(turns)} — closing the bounce")
        out = fallback()
        out["done"] = True
        out["ask"] = ""
        out["brief"] = {"point": said(0), "insight": said(1), "angle": said(len(turns) - 1)}
        return jsonify(out)

    shape, notes = _prefill_shape(c)
    sound = c["brand_data"].get("voice", "")[:1800]
    convo = "\n\n".join(
        f"YOU ASKED: {(t.get('ask') or '').strip()[:400]}\n"
        f"THEY SAID: {((t.get('answer') or '').strip() or '(nothing — they just carried on)')[:2500]}"
        for t in turns)
    user = ("WHAT THE CONTAINER NEEDS:\n" + (fi["needs"] or "(not stated)")
            + "\n\nWHAT ITS POINT IS MADE OF (confirm these first):\n"
            + (fi["point"] or "(not stated)")
            + "\n\nHOW IT DRESSES THE THREE NEEDS:\n"
            + "\n".join(f"{b['need'].upper()} — plain version: {b['plain']}" for b in fi["bounce"])
            + "\n\nWHAT THE CONTAINER SOUNDS LIKE (read-only):\n" + (sound or "(not stated)")
            + "\n\nTHE CHECKLIST'S FIELDS, for `found`:\n" + "\n".join(f"- {n}" for n in notes)
            + "\n\n`found` TAKES THIS SHAPE — leave out anything the material doesn't answer:\n"
            + json.dumps(shape, ensure_ascii=False)
            + "\n\nTHE DUMP:\n" + (dump[:6000] or "(empty — nothing dropped in)")
            + "\n\nTHE CONVERSATION SO FAR:\n"
            + (convo or "(nothing yet — this is your first turn)"))
    try:
        result = _json_from(_call("feeder", prompt("feeder"), user, 1400))
    except Exception as e:
        print(f"[robot/feeder] fell back to plain: {e}")
        return jsonify(fallback())
    if not result:
        print("[robot/feeder] fell back to plain: answer empty or unparseable")
        return jsonify(fallback())

    done = bool(result.get("done"))
    ask = (result.get("ask") or "").strip()
    if not done and not ask:
        print("[robot/feeder] fell back to plain: no ask and not done")
        return jsonify(fallback())

    need = (result.get("need") or "").strip().lower()
    if need not in NEEDS_ORDER:
        need = NEEDS_ORDER[min(len(turns), len(NEEDS_ORDER) - 1)]
    out = {"success": True, "live": True, "done": done, "need": need, "lead": "",
           "react": (result.get("react") or "").strip()[:300],
           "ask": ask[:400], "angle": "", "brief": {},
           "found": _keep_found(c, result.get("found"))}

    ang = (result.get("angle") or "").strip().strip('"\u201c\u201d')
    if ang:
        out["angle"] = ang[:300]
        # the few words that walk them into it. A proposition dropped in
        # cold reads like a verdict.
        out["lead"] = (result.get("lead") or "").strip().rstrip(":")[:60]

    if done:
        b = result.get("brief") if isinstance(result.get("brief"), dict) else {}
        brief = {k: str(b.get(k) or "").strip()[:600] for k in NEEDS_ORDER}
        # the angle is the one thing the bounce must not close without
        if not brief["angle"]:
            brief["angle"] = out["angle"] or said(len(turns) - 1)
        if not brief["point"]:
            brief["point"] = said(0)
        out["brief"] = brief
        out["ask"] = ""
    return jsonify(out)


# ---------------------------------------------------------------------------
# READ — one door, three readers. A file becomes words before it joins the
# dump, so the dump stays a string and nothing downstream has to change.
# The extraction lives in readers.py; only the picture needs a model.
# ---------------------------------------------------------------------------

def _call_blocks(worker, system, blocks, max_tokens=1500):
    """Same lane scheme as _call, for a message that isn't only text."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=robots.robot(worker), max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": blocks}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()


@copy_bp.route("/api/read", methods=["POST"])
@require_auth
def read_file():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "Nothing arrived."}), 400
    name = f.filename or "dropped file"
    data = f.read()
    text, needs_model, err = readers.read(name, data)
    if err:
        return jsonify({"success": False, "name": name, "error": err})
    if text:
        return jsonify({"success": True, "name": name, "text": text})

    # a picture, or a scan with no text layer
    if not ANTHROPIC_API_KEY:
        return jsonify({"success": False, "name": name,
                        "error": "can't read pictures just now"})
    if readers.kind(name) == "pdf":
        return jsonify({"success": False, "name": name,
                        "error": "that PDF is a scan with no text in it — a screenshot works better"})
    try:
        out = _call_blocks("reader", prompt("reader"),
                           [readers.image_block(name, data),
                            {"type": "text", "text": "Transcribe this."}])
    except Exception as e:
        print(f"[robot/read] {name} failed ({robots.robot('reader')}): {e}")
        return jsonify({"success": False, "name": name, "error": "couldn\'t read that picture"})
    out = (out or "").strip()[:readers.MAX_CHARS]
    if not out:
        return jsonify({"success": False, "name": name, "error": "nothing in it I could read"})
    return jsonify({"success": True, "name": name, "text": out})


# ---------------------------------------------------------------------------
# SEARCH — the third door. A tool, not a worker: it gathers sourced raw
# material and hands it to the dump. Two stages, because the plan says the
# human confirms before anything runs.
#
#   stage "plan" -> up to four searches, for the client to approve
#   stage "run"  -> those searches, run, and the facts worth keeping
#
# Three rules live here in code, not only in the prompt, because a prompt
# is a request and this is a promise:
#   * max_uses caps the searches at four in the API itself
#   * a fact without a citation URL never reaches the screen
#   * a fact that smells of money is barred and shown as barred, not hidden
# ---------------------------------------------------------------------------

SEARCH_TOOL = os.environ.get("ROBOT_SEARCH_TOOL", "web_search_20250305")
SEARCH_MAX = 4

# Money in any of its usual clothes. Prices are the client's to state, not
# the robot's to find — see prompts/search.md.
_MONEY = re.compile(
    r"(\$|£|€|\bNZD?\b|\bAUD\b|\busd\b)\s?\d"
    r"|\d+\s?(dollars|bucks|cents)\b"
    r"|\bfrom \$?\d"
    r"|\b(price|priced|pricing|cost|costs|fee|fees|surcharge)\b",
    re.I)


def _host(url):
    m = re.match(r"https?://(?:www\.)?([^/]+)", url or "")
    return m.group(1) if m else "the web"


def _search_call(system, user, tools=None, max_tokens=1400):
    """Sonnet, and the web search tool when the stage asks for it. Kept
    apart from _call because the model and the tool differ, and because a
    tool call's content is a list of blocks rather than one lump of text."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    kwargs = dict(model=robots.robot("search"), max_tokens=max_tokens, system=system,
                  messages=[{"role": "user", "content": user}])
    if tools:
        kwargs["tools"] = tools
    resp = client.messages.create(**kwargs)
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    return text.strip(), resp


def _cited_urls(resp):
    """Every URL the model actually read in this call. This is the whole of
    'no source, no fact' — a claim whose url isn't in here didn't come from
    a page, it came from memory, and memory is not a source."""
    urls = set()
    for block in resp.content:
        for c in (getattr(block, "citations", None) or []):
            u = getattr(c, "url", None) or (c.get("url") if isinstance(c, dict) else None)
            if u:
                urls.add(u.split("#")[0].rstrip("/"))
    return urls


@copy_bp.route("/api/search", methods=["POST"])
@require_auth
def search():
    c, data = _container()
    if not c:
        return jsonify({"error": "No such container."}), 404
    stage = (data.get("stage") or "plan").strip()
    subject = (data.get("subject") or "").strip()[:200]
    if not subject:
        return jsonify({"success": True, "queries": [], "facts": []})
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "No API key configured on the server."}), 500
    needs = ((c.get("feed_it") or {}).get("needs") or "")[:1200]

    # ---- plan: what it would look for, before it looks -------------------
    if stage == "plan":
        user = f"STAGE: PLAN\n\nTHE SUBJECT:\n{subject}\n\nWHAT THIS IS FOR:\n{needs}"
        try:
            text, _ = _search_call(prompt("search"), user, max_tokens=400)
            out = _json_from(text) or {}
        except Exception as e:
            print(f"[robot/search] plan failed ({robots.robot('search')}): {e}")
            return jsonify({"error": "Couldn't work out what to look for. Try saying it another way?"}), 502
        queries = [str(q).strip()[:120] for q in (out.get("queries") or []) if str(q).strip()]
        return jsonify({"success": True, "queries": queries[:SEARCH_MAX]})

    # ---- run: the approved searches, and what survives them --------------
    queries = [str(q).strip()[:120] for q in (data.get("queries") or []) if str(q).strip()][:SEARCH_MAX]
    if not queries:
        return jsonify({"success": True, "facts": [], "barred": []})
    user = ("STAGE: RUN\n\nTHE SUBJECT:\n" + subject
            + "\n\nRUN THESE SEARCHES, AND ONLY THESE:\n"
            + "\n".join(f"- {q}" for q in queries)
            + f"\n\nWHAT THIS IS FOR:\n{needs}")
    tools = [{"type": SEARCH_TOOL, "name": "web_search", "max_uses": len(queries)}]
    try:
        text, resp = _search_call(prompt("search"), user, tools=tools)
        out = _json_from(text) or {}
    except Exception as e:
        print(f"[robot/search] run failed ({robots.robot('search')}, {SEARCH_TOOL}): {e}")
        if "model" in str(e).lower():
            return jsonify({"error": "The search model isn't right. Check /api/health."}), 502
        return jsonify({"error": "Couldn't go looking just then. Try again in a moment?"}), 502

    read = _cited_urls(resp)
    facts, barred = [], []
    for item in (out.get("facts") or [])[:12]:
        if not isinstance(item, dict):
            continue
        fact = str(item.get("fact") or "").strip()[:220]
        url = str(item.get("url") or "").strip()
        source = str(item.get("source") or "").strip()[:60]
        if not fact or not url:
            continue
        # no source, no fact — the url has to be one it actually read
        if read and url.split("#")[0].rstrip("/") not in read:
            print(f"[robot/search] dropped an uncited claim: {fact[:60]}")
            continue
        row = {"fact": fact, "source": source or _host(url), "url": url}
        (barred if _MONEY.search(fact) else facts).append(row)
    return jsonify({"success": True, "facts": facts[:8], "barred": barred[:3]})
