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

Adding a prize type is a new entry in PRIZE_CLAUSES, not a code change.

REFERENCE EXAMPLES this was built against (all One NZ Rewards, 2025-26):
  - Practical Magic 2 double passes   -> the plural competition shape
  - DOC Backcountry Hut Pass          -> singular, third-party fulfilled,
                                         nested prize sub-clauses
  - Ticketmaster/Live Nation presale  -> a DIFFERENT GENUS entirely. No draw,
                                         no winners. Not yet modelled here.

STILL OPEN (ask Suze):
  - Are the expenses / liability / substitution clauses standard boilerplate,
    or conditional on a third party being involved? Three examples disagree.
  - Open time varies (12:00am, 12:00pm, 9:00am). Currently hardcoded midnight.
  - Is there a legal-approved master boilerplate these were all cut from?
"""

from datetime import datetime, timedelta, date

# ---------------------------------------------------------------------------
# CLAUSE LIBRARY
# ---------------------------------------------------------------------------
# Placeholders are {braced} and filled from FACTS. A placeholder with no
# matching fact raises — silence is how wrong terms ship.

def base_clauses(plural: bool) -> list:
    """The competition spine. Singular/plural is a switch that runs through the
    whole document, not a word swap — see the DOC hut pass example."""
    w = "winners" if plural else "winner"
    W = "The winners" if plural else "The winner"
    return [
        "All One New Zealand customers are eligible to enter the promotion "
        "which runs from {opens_long} at 12:00am to {closes_long} at 11:59pm.",

        "To enter, click the 'Enter now' button above. There is one entry per person.",

        f"There {'are' if plural else 'is'} {{winners_word}} ({{winners}}) {w} for "
        f"the competition. {'Each prize includes' if plural else 'The prize includes'}:",

        "The prize draw will be conducted on {draw_long} by representatives of "
        "One New Zealand by random electronic draw.",

        f"{W} will be contacted on {{draw_long}} using the details provided as part "
        f"of your My One NZ registration. If the {w} cannot be reached within 48 "
        f"hours, One New Zealand will have sole and absolute discretion to draw the "
        f"prize again and award the prize to a new winner.",

        "The prize is not redeemable for cash, cannot be substituted with an "
        "alternative prize or sold.",

        "The prize will be organised by representatives of One New Zealand and will "
        "be emailed to the {winner_word} using the email provided as part of your "
        "My One NZ registration as soon as it becomes available.",

        "Entry into the Competition is deemed to be acceptance of these terms and "
        "conditions.",

        "One New Zealand Rewards Terms and Conditions also apply, see "
        "https://one.nz/legal/terms-conditions/rewards-general/",
    ]


# Prize-type conditionals. Each extra is (insert_after_index, clause).
# Clauses use {winners_cap} so they stay grammatical when there's one winner.
PRIZE_CLAUSES = {
    "movie": {
        "label": "Movie passes",
        "line": "One (1) double pass to see {prize_name} at any participating "
                "cinema showing this film.",
        "needs": [],
        "extra": [
            (2, "This film has not been rated yet. {winners_cap} must comply with "
                "all age-related admission requirements."),
            (5, "The prize must be used while the movie is still showing in "
                "cinemas, it will not be replaced if it is not used in time."),
        ],
    },
    "gig": {
        "label": "Gig or concert",
        "line": "One (1) double pass to {prize_name} at {venue} on {event_long}.",
        "needs": ["venue", "event_date"],
        "extra": [
            (2, "This event is R18. {winners_cap} must be 18 years or over and "
                "provide valid photo ID at the door."),
            (2, "Travel, accommodation, food and beverage are not included and are "
                "the responsibility of the {winner_word}."),
            (5, "If the event is cancelled or postponed, One New Zealand is not "
                "obliged to provide a replacement prize."),
        ],
    },
    "sport": {
        "label": "Sport fixture",
        "line": "One (1) double pass to {prize_name} at {venue} on {event_long}.",
        "needs": ["venue", "event_date"],
        "extra": [
            (2, "Travel, accommodation, food and beverage are not included and are "
                "the responsibility of the {winner_word}."),
            (5, "If the fixture is rescheduled, the prize transfers to the "
                "rescheduled date. No replacement prize is offered if the "
                "{winner_word} cannot attend."),
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

    # Draw is the next working day after close. Nobody at One NZ draws on a Sunday.
    draw = closes + timedelta(days=1)
    while draw.weekday() >= 5:
        draw += timedelta(days=1)

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

def _fill(clause: str, facts: dict) -> str:
    try:
        return clause.format(**facts)
    except KeyError as e:
        raise TermsError(f"A clause needs a fact we haven't got: {e}") from e


def assemble_terms(facts: dict) -> list:
    """FACTS -> ordered clause list. A leading '* ' marks a sub-bullet."""
    spec = PRIZE_CLAUSES[facts["prize_type"]]
    clauses = base_clauses(facts["plural"])
    clauses.insert(3, "* " + spec["line"])
    # Back-to-front so earlier indexes stay valid. +2 accounts for the
    # prize line already inserted at position 3.
    for pos, clause in sorted(spec["extra"], key=lambda x: -x[0]):
        clauses.insert(pos + 2, clause)
    return [_fill(c, facts) for c in clauses]


def render_terms(facts: dict) -> str:
    lines = []
    for clause in assemble_terms(facts):
        lines.append(f"    • {clause[2:]}" if clause.startswith("* ") else f"• {clause}")
    return "\n".join(lines) + "\n\n" + FOOTER


# ---------------------------------------------------------------------------
# THE CHECK — code half. Runs before Suze sees any copy.
# ---------------------------------------------------------------------------

# The only placeholders the copy stage may use. Anything else it needs,
# it doesn't get: it writes prose, not facts.
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

    for ph in re.findall(r"\{(\w+)\}", copy_text):
        if ph not in ctx:
            flags.append(f"Copy uses {{{ph}}}, which isn't a fact it's allowed.")

    stripped = re.sub(r"\{\w+\}", "", copy_text)
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
    ctx = copy_context(facts)
    import re
    return re.sub(r"\{(\w+)\}", lambda m: str(ctx.get(m.group(1), m.group(0))), copy_text)


def prize_types() -> list:
    return [{"value": k, "label": v["label"], "needs": v["needs"]}
            for k, v in PRIZE_CLAUSES.items()]
