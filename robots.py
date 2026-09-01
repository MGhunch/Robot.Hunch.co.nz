"""
ROBOT — WHICH ROBOT WHERE
=========================
Site plan §6 in executable form. Every model choice in the tool is decided
here and nowhere else, so the plan and the code can't quietly disagree.

Two constants, five lanes pointing at them. When a model id changes you
edit ONE line and every lane on it follows — that's the whole point of
naming the speeds rather than repeating ids.

  BIG   the craft moment. Slow, and worth it.
  FAST  anything the client waits on.

Cost doesn't decide it; speed does.

Overriding, in order of precedence:
  ROBOT_MODEL_WRITER=...   one lane, when you want to promote just that one
  ROBOT_BIG=... ROBOT_FAST=...   both speeds
  (ROBOT_MODEL and ROBOT_MODEL_SEARCH are still read, so an environment
   set up before this file existed keeps working.)

A model id that isn't real used to fail at call time, quietly, dressed up
as the robot being polite about it. check() resolves every lane against
the API's own list so a typo is caught on boot instead of by a client.
"""

import os

# The two speeds. Change an id here, not in five places.
BIG = os.environ.get("ROBOT_BIG") or os.environ.get("ROBOT_MODEL") or "claude-opus-5"
FAST = os.environ.get("ROBOT_FAST") or os.environ.get("ROBOT_MODEL_SEARCH") or "claude-sonnet-5"

# The lanes. The key is the worker's name, which is also its prompt
# filename — so prompt("feeder") and robot("feeder") agree or they visibly
# don't. `why` is here to be read: if a lane stops matching its reason,
# one of the two is wrong.
LANES = {
    "writer":  (BIG,  "the craft moment gets the big model"),
    "fixer":   (FAST, "the client is sitting there watching it think"),
    "feeder":  (FAST, "same — it's a conversation, not a composition"),
    "extract": (FAST, "a favour, not a gate; never worth the wait"),
    "search":  (FAST, "a tool, not a worker"),
}

# §6 says the FIXER is "promoted to Opus if the log says so". Not built.
# When it is, it belongs here as a function of the log, not a second
# constant somewhere else.


def robot(worker):
    """The model for a worker. A per-lane env var wins, so one lane can be
    promoted without touching the rest."""
    one = os.environ.get("ROBOT_MODEL_" + worker.upper())
    if one:
        return one
    try:
        return LANES[worker][0]
    except KeyError:
        raise KeyError(f"no lane for '{worker}' — add it to robots.LANES") from None


def lanes():
    """Every lane as it actually resolved. What /api/health reports."""
    return {w: robot(w) for w in LANES}


def check(api_key):
    """Resolve every lane against the models the account can actually see.

    Returns (ok, detail). Never raises and never blocks a boot on its own:
    a network blip at startup shouldn't take the site down. It logs loudly
    and /api/health carries the verdict. Set ROBOT_STRICT_MODELS=1 to make
    a bad id fatal instead — right for a deploy pipeline, wrong for a
    cold start on a bad minute.
    """
    used = sorted(set(lanes().values()))
    if not api_key:
        return None, {"checked": False, "why": "no API key", "models": used}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        available = {m.id for m in client.models.list(limit=100)}
    except Exception as e:
        print(f"[robot/models] couldn't check: {e}")
        return None, {"checked": False, "why": str(e)[:120], "models": used}

    bad = {w: m for w, m in lanes().items() if m not in available}
    if bad:
        for w, m in bad.items():
            print(f"[robot/models] LANE '{w}' POINTS AT '{m}', WHICH DOES NOT EXIST")
        print(f"[robot/models] available: {', '.join(sorted(available)[:12])}")
        if os.environ.get("ROBOT_STRICT_MODELS") == "1":
            raise RuntimeError(f"bad model ids: {bad}")
        return False, {"checked": True, "bad": bad, "models": used}
    print(f"[robot/models] all lanes resolve: {lanes()}")
    return True, {"checked": True, "bad": {}, "models": used}
