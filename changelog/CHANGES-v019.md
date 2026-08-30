# CHANGES — v019
*31 August 2026 — the deets, part one: the legals layer*

*Off ROBOT-SANDWICH-deets-module-v1.md; mocks deets-mock-8 and
deets-tickets-4 are the spec. This cut is the legals grammar — the
brand library, the fixed row, clauses as pills, peek, greys inline.
The facts-as-pills two-column reskin of the detail rows is part two,
its own sitting.*

## The brand library
`brands/one_nz/legals.md` is new — the brand's clause library, one
table: id, fixed, default, label, text. Privacy and copyright moved
there from One Update's config. A container includes a brand clause by
putting **@brand** in its text cell against the id; `containers.py`
resolves it at assembly, replace-by-id only — never a blind append, so
a container whose artefact owns its footer (Prize Draw) can't double
up. A @brand id the library doesn't have is a validation problem, not
a silent blank. One home per clause: the brand owns the words, the
container owns the mapping.

## The card
CHECK YOUR DEETS wears the pill grammar:

- **The fixed row, first** — the clauses that always publish, named by
  the container (`fixed_title:` in config LEGALS): STANDARD FOOTER on
  Update, STANDARD TERMS on Prize Draw. Tickless grey pills.
- **Clauses as pills** — proposals on in red, the rest greyed inline.
  Spot it grey, tick it on. Same grammar on Prize Draw's legals card
  and under every Update story; the square chips and the full-text
  clause rows are gone.
- **Peek, not hover** — tap a clause name and the pill opens into the
  words as they'll print. Facts still unconfirmed read as an ellipsis,
  not a {placeholder}. Legal text is reading matter; works on an iPad.
- **Peeks land in the log** — `/api/peek`, container-tagged, once per
  clause per sitting. Labels that never get peeked are labels doing
  their job; CALIBRATE reads this later.

State is untouched: MENU/CHOSEN, story topics, formData and the terms
assembly all flow exactly as before — this is the same machine wearing
the approved grammar.

## Housekeeping
- Base clauses in Prize Draw's config got labels (Eligibility, Entry,
  Winners & prize…) — the pill copy rule from the SET UP doc.
- The subject-strip sentence is back in One Update's spec.md (it
  dropped out between v018 and this zip).
- test_engine's payload assert updated: topics carry their text now.
- Smoke green on both containers; reader and engine tests green.

## Not in this cut, on purpose
- Facts as two-column pills with click-to-update (part two).
- Story confirm circles already exist on Update's story cards; the
  legals and fixed rows don't get their own until part two decides the
  card's confirm story in one pass.
- Thin rows for storyless stories — part two, same reason.
- FEEDER five-word titles — a prompt sitting.

## Files
NEW `brands/one_nz/legals.md` · `containers.py` · `app.py` ·
`static/index.html` · `static/robot.css` ·
`containers/prize_draw/config.md` · `containers/one_update/config.md` ·
`containers/one_update/spec.md` · `smoke_ui.js` · `test_engine.py`

*Honest.*
