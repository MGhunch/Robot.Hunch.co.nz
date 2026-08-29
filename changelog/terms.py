"""
ROBOT — TERMS ENGINE
====================
Deterministic clause assembly. No model, no network, no prompts.

This is the bulletproof half. It takes the facts from the form and assembles
the terms from a fixed clause library. The robot never touches it: the robot
writes prose, this writes facts.

Two hard rules everything else depends on:

  1. Every date is COMPUTED here, never generated. Draw date and the closing
     day-name derive from the entry window.
  2. The same FACTS dict that builds the terms is handed to the copy stage as
     placeholder values. One source of truth, two renderings — so the copy and
     the terms cannot structurally disagree.

Clauses carry an id and a fixed/optional flag. Fixed ones always publish;
optional ones get a checkbox. That checkbox is doing double duty: the optional
clauses are exactly the ones our reference examples disagree about, so every
tick is Suze answering a question we'd otherwise have to ask in a meeting.

REFERENCE EXAMPLES (all One NZ Rewards, 2025-26):
  - Practical Magic 2 double passes   -> plural competition. Modelled.
  - DOC Backcountry Hut Pass          -> singular, third-party fulfilled,
                                         nested prize sub-clauses. Partly.
  - Ticketmaster/Live Nation presale  -> A DIFFERENT GENUS. No draw, no
                                         winners, no prize. Access window,
                                         purchase cap, third-party terms.
                                         Not modelled — needs offer_type as
                                         the switch above prize_type.
"""

from datetime import datetime, timedelta, date

# ---------------------------------------------------------------------------
# CLAUSE LIBRARY
# ---------------------------------------------------------------------------

def base_clauses(plural: bool) -> list:
    """The competition spine.

    Singular/plural is a switch that runs through the whole document, not a
    word swap — see the DOC hut pass example, where one winner changes the
    grammar of four separate clauses.
    """
    w = "winners" if plural else "winner"
    W = "The winners" if plural else "The winner"
    return [
        {"id": "eligibility", "fixed": True, "text":
            "All One New Zealand customers are eligible to enter the promotion "
            "which runs from {opens_long} at {opens_time} to {closes_long} at "
            "{closes_time}."},

        {"id": "entry", "fixed": True, "text":
            "To enter, click the 'Enter now' button above. There is one entry "
            "per person."},

        {"id": "winners", "fixed": True, "text":
            f"There {'are' if plural else 'is'} {{winners_word}} ({{winners}}) {w} "
            f"for the competition. "
            f"{'Each prize includes' if plural else 'The prize includes'}:"},

        {"id": "draw", "fixed": True, "text":
            "The prize draw will be conducted on {draw_long} by representatives "
            "of One New Zealand by random electronic draw."},

        {"id": "contact", "fixed": True, "text":
            f"{W} will be contacted on {{draw_long}} using the details provided "
            f"as part of your My One NZ registration. If the {w} cannot be "
            f"reached within 48 hours, One New Zealand will have sole and "
            f"absolute discretion to draw the prize again and award the prize "
            f"to a new winner."},

        {"id": "no_cash", "fixed": True, "text":
            "The prize is not redeemable for cash, cannot be substituted with "
            "an alternative prize or sold."},

        # --- the three the examples disagree about --------------------------
        # Present in the DOC hut pass terms, absent from Practical Magic.
        # Left unticked by default so nobody publishes legals by accident.
        {"id": "expenses", "fixed": False, "default": False,
         "label": "Winner pays their own expenses",
         "text": "All expenses for items (including travel, accommodation, food "
                 "and beverages, and any other costs) unless expressly stated "
                 "will be at the cost of the {winner_word}."},

        {"id": "liability", "fixed": False, "default": False,
         "label": "Liability exclusion",
         "text": "One New Zealand is not liable for any loss or damage "
                 "whatsoever which is suffered, including but not limited to "
                 "indirect or consequential loss, or for personal injury "
                 "suffered or sustained during the course of accepting or using "
                 "the prize, except for any liability which cannot be excluded "
                 "by law."},

        {"id": "substitution", "fixed": False, "default": False,
         "label": "Right to substitute the prize",
         "text": "The prize is subject to availability, and we reserve the "
                 "right to substitute any prize with another of equivalent "
                 "value without giving notice throughout the promotional "
                 "period."},
        # --------------------------------------------------------------------

        {"id": "fulfil_onenz", "fixed": False, "default": True,
         "label": "One NZ sends the prize out",
         "text": "The prize will be organised by representatives of One New "
                 "Zealand and will be emailed to the {winner_word} using the "
                 "email provided as part of your My One NZ registration as soon "
                 "as it becomes available."},

        {"id": "acceptance", "fixed": True, "text":
            "Entry into the Competition is deemed to be acceptance of these "
            "terms and conditions."},

        {"id": "rewards_tcs", "fixed": True, "text":
            "One New Zealand Rewards Terms and Conditions also apply, see "
            "https://one.nz/legal/terms-conditions/rewards-general/"},
    ]


# Prize-type conditionals. "after" names the base clause they follow, so the
# order stays deterministic without anyone counting indexes.
PRIZE_CLAUSES = {
    "movie": {
        "label": "Movie passes",
        "line": "One (1) double pass to see {prize_name} at any participating "
                "cinema showing this film.",
        "needs": [],
        "extra": [
            {"id": "movie_rating", "after": "winners", "fixed": False, "default": True,
             "label": "Age-rating compliance",
             "text": "This film has not been rated yet. {winners_cap} must "
                     "comply with all age-related admission requirements."},
            {"id": "movie_window", "after": "no_cash", "fixed": False, "default": True,
             "label": "Must be used while it's in cinemas",
             "text": "The prize must be used while the movie is still showing "
                     "in cinemas, it will not be replaced if it is not used in "
                     "time."},
        ],
    },
    "gig": {
        "label": "Gig or concert",
        "line": "One (1) double pass to {prize_name} at {venue} on {event_long}.",
        "needs": ["venue", "event_date"],
        "extra": [
            {"id": "gig_r18", "after": "winners", "fixed": False, "default": True,
             "label": "R18 event",
             "text": "This event is R18. {winners_cap} must be 18 years or over "
                     "and provide valid photo ID at the door."},
            {"id": "gig_travel", "after": "winners", "fixed": False, "default": True,
             "label": "Travel not included",
             "text": "Travel, accommodation, food and beverage are not included "
                     "and are the responsibility of the {winner_word}."},
            {"id": "gig_cancel", "after": "no_cash", "fixed": False, "default": True,
             "label": "If it's cancelled",
             "text": "If the event is cancelled or postponed, One New Zealand "
                     "is not obliged to provide a replacement prize."},
        ],
    },
    "sport": {
        "label": "Sport fixture",
        "line": "One (1) double pass to {prize_name} at {venue} on {event_long}.",
        "needs": ["venue", "event_date"],
        "extra": [
            {"id": "sport_travel", "after": "winners", "fixed": False, "default": True,
             "label": "Travel not included",
             "text": "Travel, accommodation, food and beverage are not included "
                     "and are the responsibility of the {winner_word}."},
            {"id": "sport_reschedule", "after": "no_cash", "fixed": False, "default": True,
             "label": "If the fixture moves",
             "text": "If the fixture is rescheduled, the prize transfers to the "
                     "rescheduled date. No replacement prize is offered if the "
                     "{winner_word} cannot attend."},
        ],
    },
}

FOOTER = (
    "For any queries or questions relating to Rewards, please contact us on "
    "0800 102 902 or email us at rewards@one.nz — Monday to Friday between "
    "9am and 6pm."
)

NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
    8: "eight", 9: "nine", 10: "ten", 15: "fifteen", 20: "twenty", 50: "fifty",
}


class TermsError(ValueError):
    """The facts can't produce valid terms. Never swallowed, always shown."""


# ---------------------------------------------------------------------------
# DATES — computed, never generated
# ---------------------------------------------------------------------------

def _long(d: date) -> str:
    """Monday 24 August 2026 — the One NZ house format."""
    return f"{d.strftime('%A')} {d.day} {d.strftime('%B %Y')}"


def _short(d: date) -> str:
    return f"{d.day} {d.strftime('%b')}"


def _parse(value, label) -> date:
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        raise TermsError(f"{label} isn't a date we can read.")


# ---------------------------------------------------------------------------
# FACTS — the single source of truth
# ---------------------------------------------------------------------------

def build_facts(form: dict) -> dict:
    prize_type = (form.get("prize_type") or "").strip().lower()
    if prize_type not in PRIZE_CLAUSES:
        raise TermsError(
            f"We don't know the '{prize_type}' prize type yet. "
            f"Known: {', '.join(sorted(PRIZE_CLAUSES))}."
        )

    prize_name = (form.get("prize_name") or "").strip()
    if not prize_name:
        raise TermsError("The prize needs a name.")

    try:
        winners = int(form.get("winners"))
    except (TypeError, ValueError):
        raise TermsError("Number of winners has to be a whole number.")
    if winners < 1:
        raise TermsError("There has to be at least one winner.")

    if not form.get("opens") or not form.get("closes"):
        raise TermsError("The competition needs an open and a close date.")
    opens = _parse(form["opens"], "The open date")
    closes = _parse(form["closes"], "The close date")
    if closes < opens:
        raise TermsError("The competition closes before it opens.")

    # Draw is the next working day after close. Nobody draws on a Sunday.
    # The checklist can hand us a human-set date instead — human in the
    # loop beats derivable — but it can't land before the close.
    draw = closes + timedelta(days=1)
    while draw.weekday() >= 5:
        draw += timedelta(days=1)
    if form.get("drawn"):
        drawn = _parse(form["drawn"], "The draw date")
        if drawn < closes:
            raise TermsError("Winners can't be drawn before the draw closes.")
        draw = drawn

    plural = winners > 1
    facts = {
        "prize_type": prize_type,
        "prize_name": prize_name,
        "winners": winners,
        "plural": plural,
        "winners_word": NUMBER_WORDS.get(winners, str(winners)),
        "winner_word": "winners" if plural else "winner",
        "winners_cap": "Winners" if plural else "The winner",
        "opens": opens.isoformat(),
        "closes": closes.isoformat(),
        "opens_long": _long(opens),
        "closes_long": _long(closes),
        "draw_long": _long(draw),
        "opens_short": _short(opens),
        "closes_short": _short(closes),
        "closes_day": closes.strftime("%A"),
        "days_open": (closes - opens).days + 1,
        # Varies across the reference examples (12:00am, 12:00pm, 9:00am), so
        # it's a fact with a sensible default, not a hardcoded string.
        "opens_time": (form.get("opens_time") or "12:00am").strip(),
        "closes_time": (form.get("closes_time") or "11:59pm").strip(),
    }

    for need in PRIZE_CLAUSES[prize_type]["needs"]:
        if need == "venue":
            venue = (form.get("venue") or "").strip()
            if not venue:
                raise TermsError(f"A {prize_type} prize needs a venue.")
            facts["venue"] = venue
        if need == "event_date":
            if not form.get("event_date"):
                raise TermsError(f"A {prize_type} prize needs an event date.")
            event = _parse(form["event_date"], "The event date")
            if event < closes:
                raise TermsError("The event happens before the competition closes.")
            facts["event_long"] = _long(event)
            facts["event_short"] = _short(event)

    return facts


# ---------------------------------------------------------------------------
# ASSEMBLY
# ---------------------------------------------------------------------------

def _fill(text: str, facts: dict) -> str:
    try:
        return text.format(**facts)
    except KeyError as e:
        raise TermsError(f"A clause needs a fact we haven't got: {e}") from e


def clause_menu(facts: dict) -> list:
    """Every clause in publish order, with id, text and whether it's optional.

    The UI renders this straight: fixed clauses as plain text, optional ones
    with a checkbox. Nothing here is a judgement call — the order is the order
    the terms publish in.
    """
    spec = PRIZE_CLAUSES[facts["prize_type"]]
    out = []
    for clause in base_clauses(facts["plural"]):
        out.append({
            "id": clause["id"],
            "text": _fill(clause["text"], facts),
            "fixed": clause["fixed"],
            "default": clause.get("default", True),
            "label": clause.get("label", ""),
            "sub": False,
        })
        # The prize line hangs off the winners clause as a sub-bullet.
        if clause["id"] == "winners":
            out.append({"id": "prize_line", "text": _fill(spec["line"], facts),
                        "fixed": True, "default": True, "label": "", "sub": True})
        # Prize-type conditionals slot in after their anchor clause.
        for x in spec["extra"]:
            if x["after"] == clause["id"]:
                out.append({
                    "id": x["id"], "text": _fill(x["text"], facts),
                    "fixed": x["fixed"], "default": x.get("default", True),
                    "label": x.get("label", ""), "sub": False,
                })
    return out


def assemble_terms(facts: dict, chosen=None) -> list:
    """FACTS (+ the optional clauses ticked) -> ordered clause list.

    chosen is a list of ids. Pass None and every optional clause falls back to
    its default, so the terms are always valid even if the UI never asks.
    """
    menu = clause_menu(facts)
    if chosen is None:
        keep = {c["id"] for c in menu if c["fixed"] or c["default"]}
    else:
        keep = {c["id"] for c in menu if c["fixed"]} | set(chosen)
    return [("* " if c["sub"] else "") + c["text"] for c in menu if c["id"] in keep]


def render_terms(facts: dict, chosen=None) -> str:
    lines = []
    for clause in assemble_terms(facts, chosen):
        lines.append(f"    • {clause[2:]}" if clause.startswith("* ") else f"• {clause}")
    return "\n".join(lines) + "\n\n" + FOOTER


# ---------------------------------------------------------------------------
# THE CHECK — code half. Runs before Suze sees any copy.
# ---------------------------------------------------------------------------

# The only placeholders the copy stage may use. Anything else it needs, it
# doesn't get: it writes prose, not facts.
COPY_PLACEHOLDERS = [
    "prize_name", "winners", "winners_word", "winner_word",
    "closes_short", "closes_long", "closes_day", "opens_short",
    "venue", "event_short",
]

MONTHS = ("January February March April May June July August September "
          "October November December").split()


def copy_context(facts: dict) -> dict:
    return {k: facts[k] for k in COPY_PLACEHOLDERS if k in facts}


def check_copy(copy_text: str, facts: dict) -> list:
    """Returns a list of flags. Empty means clean. Catches the failure that
    actually matters: a raw number or date in the copy instead of a placeholder,
    which is how the copy and the terms drift apart."""
    import re
    flags = []
    ctx = copy_context(facts)

    for ph in re.findall(r"\{(\w+)\}", copy_text or ""):
        if ph not in ctx:
            flags.append(f"Copy uses {{{ph}}}, which isn't a fact it's allowed.")

    stripped = re.sub(r"\{\w+\}", "", copy_text or "")
    for match in re.findall(r"\b\d[\d,/-]*\b", stripped):
        flags.append(
            f'Copy has the bare number "{match}" in it. Numbers have to be '
            f"placeholders or they'll drift from the terms."
        )
    for m in MONTHS:
        if m in stripped:
            flags.append(
                f'Copy has the month "{m}" written out. Use a date placeholder instead.'
            )
    return flags


def render_copy(copy_text: str, facts: dict) -> str:
    """Fill the copy's placeholders from the same facts that built the terms."""
    import re
    ctx = copy_context(facts)
    return re.sub(r"\{(\w+)\}", lambda m: str(ctx.get(m.group(1), m.group(0))),
                  copy_text or "")


def prize_types() -> list:
    return [{"value": k, "label": v["label"], "needs": v["needs"]}
            for k, v in PRIZE_CLAUSES.items()]
