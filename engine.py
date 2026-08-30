"""
ROBOT — THE ENGINE'S FACTS AND TERMS
====================================
Deterministic. No model, no network. Everything here reads the container
(containers.py) and knows nothing about prizes, cards or One NZ.

  build_facts(c, form)       NEEDS rows + the human's answers -> FACTS.
                             Dates parsed and derived, numbers worded,
                             locked rows demanded, order rules checked.
  clause_menu(c, facts)      LEGALS -> every clause in publish order with
                             its id, filled text, fixed/optional, default.
  assemble_terms / render    the menu minus what's unticked, as lines.
  check_copy(c, text, facts) the code half of the check: placeholders the
                             copy isn't allowed, bare numbers, months.
  render_copy(text, facts)   fill {placeholders} from the same facts.

One source of truth, two renderings: the copy's placeholders and the
terms' clauses both fill from FACTS, so they cannot drift apart.
"""

from datetime import datetime, timedelta, date
import re

NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
    8: "eight", 9: "nine", 10: "ten", 15: "fifteen", 20: "twenty", 50: "fifty",
}
MONTHS = ("January February March April May June July August September "
          "October November December").split()


class TermsError(ValueError):
    """The facts can't produce valid terms. Never swallowed, always shown."""


# ---------------------------------------------------------------------------
# DATES — computed, never generated
# ---------------------------------------------------------------------------

def _long(d):
    return f"{d.strftime('%A')} {d.day} {d.strftime('%B %Y')}"     # Monday 24 August 2026

def _date(d):
    return f"{d.day} {d.strftime('%B %Y')}"                         # 24 August 2026

def _short(d):
    return f"{d.day} {d.strftime('%b')}"                            # 24 Aug

def _parse(value, label):
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except ValueError:
        raise TermsError(f"{label} isn't a date we can read.")

def _next_workday(d):
    d = d + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


# ---------------------------------------------------------------------------
# ROWS — walking NEEDS
# ---------------------------------------------------------------------------

def _rows(c):
    """Every non-repeating NEEDS row, in order."""
    return [r for g in c["needs"]["groups"] if not g["repeat"] for r in g["rows"]]

def _repeats(c):
    return [g for g in c["needs"]["groups"] if g["repeat"]]

def _shown(row, values):
    """`when` column: 'prize_type in gig, sport'. Absent means always."""
    w = row.get("when", "")
    m = re.match(r"(\w+)\s+in\s+(.+)", w)
    if not m:
        return True
    vals = [v.strip() for v in m.group(2).split(",")]
    return (values.get(m.group(1)) or "") in vals

def _type_row(rows):
    """The row that switches the clause library: the first select whose id
    ends with _type. None if the container hasn't got one."""
    return next((r for r in rows if r["id"].endswith("_type") and r["type"] == "select"), None)


def _fill_row(row, form, facts, label_of):
    """One row's answer into facts, with derived forms. Returns nothing;
    raises TermsError when a locked row is empty or a date is unreadable."""
    rid = row["id"]
    raw = (form.get(rid) or "")
    raw = str(raw).strip()
    t = row["type"]

    if t == "date":
        if not raw and row.get("derive"):
            m = re.search(r"next working day after (\w+)", row["derive"])
            if m and facts.get(m.group(1) + "_iso"):
                raw = _next_workday(_parse(facts[m.group(1) + "_iso"], label_of(rid))).isoformat()
        if not raw:
            if row["locked"] and _shown(row, form):
                raise TermsError(f"{label_of(rid)} needs a date.")
            return
        d = _parse(raw, label_of(rid))
        facts[rid] = d.isoformat()
        facts[rid + "_iso"] = d.isoformat()
        facts[rid + "_long"] = _long(d)
        facts[rid + "_date"] = _date(d)
        facts[rid + "_short"] = _short(d)
        facts[rid + "_day"] = d.strftime("%A")
        facts[rid + "_time"] = (form.get(rid + "__sub") or row.get("sub") or "").strip()
        return

    if t == "number":
        if not raw:
            if row["locked"]:
                raise TermsError(f"{label_of(rid)} needs a number.")
            return
        try:
            n = int(raw)
        except ValueError:
            raise TermsError(f"{label_of(rid)} has to be a whole number.")
        if n < 1:
            raise TermsError(f"{label_of(rid)} has to be at least one.")
        facts[rid] = n
        facts[rid + "_word"] = NUMBER_WORDS.get(n, str(n))
        return

    if t == "select":
        opts = row.get("options", [])
        if not raw:
            if row["locked"]:
                raise TermsError(f"{label_of(rid)} needs picking.")
            return
        if raw not in opts and "other" in opts:
            # OTHER: they typed what it is; carry the words, flag the type
            facts[rid] = "other"
            facts[rid + "_other"] = raw
        else:
            facts[rid] = raw
        return

    if t == "legals":
        return

    if not raw:
        if row["locked"] and _shown(row, form):
            raise TermsError(f"{label_of(rid)} is blank.")
        return
    facts[rid] = raw


def _order_rules(c, rows, facts, label_of):
    """Optional `after` column: 'opens' means this date can't fall before
    that one. The derive column's 'can't land before X' says the same."""
    for r in rows:
        if r["type"] != "date" or r["id"] + "_iso" not in facts:
            continue
        ref = r.get("after") or ""
        m = re.search(r"before (\w+)", r.get("derive", ""))
        if not ref and m:
            ref = m.group(1)
        if ref and ref + "_iso" in facts:
            if _parse(facts[r["id"] + "_iso"], "") < _parse(facts[ref + "_iso"], ""):
                raise TermsError(f"{label_of(r['id'])} can't fall before {label_of(ref).lower()}.")


def build_facts(c, form):
    """NEEDS rows + the form -> FACTS. The form is keyed by row id; a date's
    time rides as <id>__sub; repeating groups arrive as <group>: [ {...} ]."""
    form = form or {}
    rows = _rows(c)
    labels = {r["id"]: r["label"] for g in c["needs"]["groups"] for r in g["rows"]}
    label_of = lambda rid: labels.get(rid, rid)
    facts = {"container": c["id"]}

    # dates first, so derive rules can lean on them; then everything else
    for r in sorted(rows, key=lambda r: 0 if r["type"] == "date" and not r.get("derive") else 1):
        if not _shown(r, form):
            continue
        _fill_row(r, form, facts, label_of)
    _order_rules(c, rows, facts, label_of)

    # grammar switches off the first number row (winners, prize_count)
    num = next((r for r in rows if r["type"] == "number" and r["id"] in facts), None)
    if num:
        n = facts[num["id"]]
        facts["plural"] = n > 1
        facts["winners"] = n
        facts["winners_word"] = facts[num["id"] + "_word"]
        facts["winner_word"] = "winners" if n > 1 else "winner"
        facts["winners_cap"] = "Winners" if n > 1 else "The winner"
    else:
        facts["plural"] = False

    # the type switch demands what its clause line needs
    tr = _type_row(rows)
    if tr and facts.get(tr["id"]):
        spec = _by_type(c, facts[tr["id"]])
        if spec is None:
            what = facts.get(tr["id"] + "_other") or facts[tr["id"]]
            raise TermsError(f"We don't know the '{what}' {tr['label'].lower()} type yet. "
                             f"Known: {', '.join(x['type'] for x in c['legals']['by_type'])}.")
        for need in (spec or {}).get("needs", []):
            if need not in facts:
                raise TermsError(f"A {facts[tr['id']]} {tr['label'].lower()} needs {label_of(need).lower()}.")

    # repeating groups: a list of dicts, one per item. "EACH CARD" is the
    # base; "EACH PRIZE CARD (where card_type = prize)" adds rows to the
    # same item when its condition holds. The form sends the list under
    # the base word: card: [ {...}, {...} ].
    reps = _repeats(c)
    bases = [g for g in reps if not g["repeat"]["where"]]
    for g in bases:
        key = g["repeat"]["per"].split()[-1]
        items = form.get(key) or form.get(key + "s") or []
        conds = [x for x in reps if x["repeat"]["where"] and x["repeat"]["per"].endswith(key)]
        out = []
        for i, item in enumerate(items if isinstance(items, list) else [], 1):
            sub = {"n": i}
            item = item or {}
            try:
                for r in g["rows"]:
                    _fill_row(r, item, sub, label_of)
                for x in conds:
                    w = x["repeat"]["where"]
                    if str(sub.get(w["row"], item.get(w["row"], ""))) == w["is"]:
                        for r in x["rows"]:
                            _fill_row(r, item, sub, label_of)
            except TermsError as e:
                raise TermsError(f"{key.title()} {i}: {e}")
            out.append(sub)
        facts[key] = out
        n = len(out)
        rng = g["repeat"]
        if n and not (rng["min"] <= n <= rng["max"]):
            raise TermsError(f"{n} {key}s; this format takes {rng['min']} to {rng['max']}.")

    facts["year"] = str(date.today().year)
    return facts


# ---------------------------------------------------------------------------
# CLAUSES — the library in config, filled from the facts
# ---------------------------------------------------------------------------

def _by_type(c, t):
    return next((x for x in c["legals"]["by_type"] if x["type"] == t), None)

def _fill(text, facts):
    """{placeholders} from facts; [singular/plural] picks by the grammar switch."""
    def pick(m):
        a, b = m.group(1).split("/", 1)
        return (b if facts.get("plural") else a).strip()
    text = re.sub(r"\[([^\[\]]*?/[^\[\]]*?)\]", pick, text)
    try:
        return text.format(**{k: v for k, v in facts.items() if not isinstance(v, (list, dict))})
    except (KeyError, IndexError) as e:
        raise TermsError(f"A clause needs a fact we haven't got: {e}") from e


def clause_menu(c, facts):
    """Every clause in publish order: base clauses, the type's line hung off
    its anchor, the type's extras after theirs, then the container's extras.
    Fixed ones publish always; optional ones carry a label and a default."""
    lib = c["legals"]
    tr = _type_row(_rows(c))
    spec = _by_type(c, facts.get(tr["id"], "")) if tr else None
    out = []
    base = lib["base"]
    for i, cl in enumerate(base):
        if cl["id"] == "prize_line":
            continue            # emitted with the clause it hangs off
        out.append({"id": cl["id"], "text": _fill(cl["text"], facts), "fixed": cl["fixed"],
                    "default": cl["default"] if not cl["fixed"] else True,
                    "label": cl["label"], "sub": False})
        # the type's line hangs off the next clause as a sub-bullet
        if i + 1 < len(base) and base[i + 1]["id"] == "prize_line" and spec and spec.get("line"):
            out.append({"id": "prize_line", "text": _fill(spec["line"], facts),
                        "fixed": True, "default": True, "label": "", "sub": True})
        for x in (spec or {}).get("extra", []):
            if x.get("after") == cl["id"]:
                out.append({"id": x["id"], "text": _fill(x["text"], facts), "fixed": False,
                            "default": x["default"], "label": x["label"], "sub": False})
    for x in lib["extras"]:
        out.append({"id": x["id"], "text": _fill(x["text"], facts), "fixed": False,
                    "default": x["default"], "label": x["label"], "sub": False})
    return out


def assemble_terms(c, facts, chosen=None):
    menu = clause_menu(c, facts)
    if chosen is None:
        keep = {x["id"] for x in menu if x["fixed"] or x["default"]}
    else:
        keep = {x["id"] for x in menu if x["fixed"]} | set(chosen)
    return [("* " if x["sub"] else "") + x["text"] for x in menu if x["id"] in keep]


def render_terms(c, facts, chosen=None):
    lines = []
    for cl in assemble_terms(c, facts, chosen):
        lines.append(f"    • {cl[2:]}" if cl.startswith("* ") else f"• {cl}")
    foot = c["legals"].get("footer", "")
    return "\n".join(lines) + ("\n\n" + _fill(foot, facts) if foot else "")


def type_options(c):
    """For the checklist's select: the types the clause library knows."""
    return [{"value": t["type"], "label": t["label"], "needs": t["needs"]}
            for t in c["legals"]["by_type"]]


# ---------------------------------------------------------------------------
# THE CHECK — code half. Runs before Suze sees any copy.
# ---------------------------------------------------------------------------

def copy_context(c, facts):
    """The placeholders the copy may use, with their values. A container
    with no placeholder rule gets none — its copy carries facts as words."""
    allowed = c.get("spec", {}).get("placeholders", [])
    return {k: facts[k] for k in allowed if k in facts}


def check_copy(c, copy_text, facts, module=None):
    """Flags, empty means clean. With a placeholder rule: no bare numbers
    or months, no unknown {slots}. Always: the module's hard limit."""
    flags = []
    text = copy_text or ""
    spec = c.get("spec", {})
    if spec.get("placeholders"):
        ctx = copy_context(c, facts)
        for ph in re.findall(r"\{(\w+)\}", text):
            if ph not in ctx:
                flags.append(f"Copy uses {{{ph}}}, which isn't a fact it's allowed.")
        stripped = re.sub(r"\{\w+\}", "", text)
        for m in re.findall(r"\b\d[\d,/-]*\b", stripped):
            flags.append(f'Copy has the bare number "{m}" in it. Numbers have to be '
                         f"placeholders or they'll drift from the terms.")
        for m in MONTHS:
            if m in stripped:
                flags.append(f'Copy has the month "{m}" written out. Use a date placeholder instead.')
    if module:
        mod = next((m for m in spec.get("modules", []) if m["module"] == module), None)
        if mod and mod.get("max_chars") and len(text) > mod["max_chars"]:
            flags.append(f"{module} is {len(text)} characters; the limit is {mod['max_chars']}.")
    return flags


def render_copy(c, copy_text, facts):
    ctx = copy_context(c, facts)
    return re.sub(r"\{(\w+)\}", lambda m: str(ctx.get(m.group(1), m.group(0))), copy_text or "")
