# CHANGES — v014
*30 August 2026 — the engine runs from the folders*

*Hit list 17 lands: nothing per-container lives in code. Two folders at
the root are the product now — `brands/<id>/` and `containers/<id>/` —
and the engine reads them. Prize Draw runs from its folder with its code
deleted; One Update runs from its folder with no engine change. 21 (the
doorway) and 12c (the skin) ride along.*

## The folders
```
brands/one_nz/          brand.md  voice.md  skin.md  assets/
containers/prize_draw/  config.md spec.md   prize_draw.html
containers/one_update/  config.md spec.md   one_update.html
```
Brand: the voice (four pillars in brand order, each with proof), the skin
tokens, the assets. Set up once per client. Container: what FEED IT asks
(config), what's built (spec), the artefact drawn in the brand's skin.
`config.md` carries `brand: one_nz`; that's the whole wiring. The shape is
SCHEMA-v3 in the SET UPs project; the examples there are these folders.

## The reader — `containers.py`
Scans both folders on demand, parses the markdown into one dict per
folder, caches the JSON beside it (`*.compiled.json`, gitignored,
rebuilt when any file changes). The validator is the reader in strict
mode: every reason at once. `test_reader.py` reads both clean and bounces
a broken folder with five reasons.

Grammar it keys off: `##`/`###` section names; table columns; `EACH CARD
(repeats per card, 3–5)` and `(where card_type = prize)`; optional NEEDS
columns `sub`, `when`, `derive`, `after`; `[singular/plural]` brackets in
a clause; `{fact}` placeholders, where derived forms follow the row id
(`closes` → `closes_long`, `closes_day`, `closes_time`; `drawn_long`, not
`draw_long`). `data-module` tags in the html, read from the markup only.

## The engine — `engine.py` replaces `terms.py`
Facts from NEEDS (dates parsed and derived, `after` order rules,
`derive` for the draw date, number words, the type switch, repeating
groups with conditions). Clauses from LEGALS (base in order, the type's
line hung off its anchor as a sub-bullet, extras after theirs, the
container's own extras, the footer). The copy check. **Terms come out
byte-identical to v013 across movie, gig and sport.**

## The workers — `copy_stage.py`
Every route takes `container`. Voice = brand voice + the spec's VOICE
LEAN + gold examples + recent corrections, container-tagged. The spec
text travels whole. The WRITER's return shape is read off the modules:
an options module (`Three options`, `A and B`) is a list, a repeating
module (`card ×N`) is a list of objects under `cards`. Extract asks for
the checklist's own fields. Feeder reads FEED IT; move keys are `gap`,
`benefit`, `angle`. The tweak log carries `container` and `run`.
`writer.md` and `extract.md` are shape-agnostic now.

## The API
- `GET /api/containers` — tiles, grouped by brand. `testing` only for Hunch.
- `GET /api/container/<id>` — quiz, checklist, modules, ghost tags, the html.
- `POST /api/terms`, `/api/parcel`, `/api/copy`, `/api/tweak`,
  `/api/extract`, `/api/feeder` — all take `container`.
- `GET /brands/<id>/assets/<file>` — fonts and logo for the artefact.
- `/api/types` gone; the checklist reads the types off the clause library.

## The door
`ROBOT_HUNCH` (default `Michael`): a session whose name is on that list
sees containers in testing, badged. Everyone else sees `live`. Names come
from `ROBOT_WORDS` (`taniwha:Michael`), so give yourself a word.

## The front end — `static/index.html`, `robot.css`
- **The doorway.** Tiles read off `/api/containers`, brand name above a
  group only when there's more than one brand, Testing badge and ink
  go-circle for Hunch. One tile means YOUR NEXT PROJECT fills slot two.
- **The checklist.** `CL_CONFIG` comes off the container. Repeating groups
  draw one card per item (CARD 1, CARD 2…) with the type as a tag; a
  conditional group's rows appear when its condition holds; `+ another
  card` up to the max, × down to the min. Designed in checkit-mock (B).
- **The ghost.** Drawn from the html's `data-module` tags with the
  engine's grey vocabulary: pill, strip, image, lines, card. Repeats draw
  once with the count stated. Wrappers draw nothing.
- **FIX IT.** The artefact is the container's html in an iframe, so the
  client's skin and the engine's chrome never meet. Copy pours into the
  tags; A/B subjects fill their variants; cards clone or cull to match.
  One padlock per writer block, `card-title#2` style keys, terms last
  where the html has them. Highlight-to-tweak listens inside the frame.
- **FINISHED.** Same pour, filled facts, one file line per spec output.

## Deleted
`terms.py`, `prompts/containers/`, `prompts/spine.md`, `prompts/tweak_it.md`,
`prompts/feed_it/`, `prompts/write_it/`, the old `containers/` files, the
stale copies under `changelog/`. Delete them on the remote by hand.

## Parked, on purpose
- Per-card draw clauses for One Update (config has them; the engine
  doesn't assemble them yet). The legals card is a topic list until the
  parked legals question is answered.
- Brand-level standard legals (privacy, copyright). Same question.
- The upload door (hit list 17's last piece; the validator exists, the
  door doesn't).
- Fonts and logo for One NZ: not in `assets/` yet, so the artefact wears
  Arial and a CSS mark. Won't bounce.
- `other` prize type has no clause line; the engine says so in character.

## Tests
`python3 test_reader.py` · `python3 test_engine.py` · `node smoke_ui.js`
(needs `npm i jsdom` and the app on :5055) drives the real front end
through both containers to a poured FIX IT.

*Honest.*
