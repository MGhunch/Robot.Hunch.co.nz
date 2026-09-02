# CHANGES — v038
*2 September 2026 — the stylesheet swept, and every name made readable.
Two passes, each proven to zero on screen. The tidy-up is finished.*

*v037 closed the refactor and left two things it hadn't touched: the
support crew was never audited, and the front end's prefixes were
history, not language — `fd-` for FEED IT, `cl-` for a checklist that
became LOCK THE DEETS in v031, `dz-` for its sections, `fx-` `fi-` `sr-`
`si-` `hm-`. Michael asked for names he can read. This is that.*

## Files

**Replaced**
- `static/robot.css` — 124 dead rules gone, 1,286 → 1,123 lines, 373 →
  295 classes; every surviving class renamed. Tag `v=038`.
- `static/index.html` — every class and id renamed; tags to `v=038`.
- `static/js/chrome.js`, `sandwich.js`, `door.js`, `feed.js`, `fix.js`,
  `file.js` — every function, id, class and constant renamed.
- `smoke_errors.js`, `smoke_ui.js` — follow the names.
- `smoke_gates.sh` — the gates, keyed on the new prefixes; and one thing
  made explicit that was implicit: `BRIEF` and `ASSET` are the handovers,
  readable by the rooms downstream, never by the chrome or the door.
- `changelog/CHANGES-v038.md` — this.

**Untouched** — `strings.js` (`v=034`), everything in Python.

## Pass A — the sweep

A class is dead when nothing in the markup or the JS says its name as a
whole token. 124 rules matched: the pre-v017 `mail-*` mock artefact, the
`receipt-*` and `tw-*` tweak-list furniture, the `peek-*` from a design
that never shipped, the brief ladder (`rung`, `ladderInput`, `selwrap`,
`dchip`), `qcard/qhead/qta`, `redpane`, `robotwork`, the old `.btn`, and
the old `.card` — which only survived the first scan because `STR.card`
says the word. Removed rule by rule; rendered after; zero.

Honest caveat: the scan is a whole-token match against markup and code,
comments included, so a class whose name is also an English word in a
comment (`field`, `hint`) can survive it. There are a handful. They're
harmless and this isn't the last sitting the stylesheet will ever get.

## Pass B — the names

| Was | Is | What it is |
|---|---|---|
| `si-*`, `siWord siGo siNote`, `.signin` | `door-*`, `doorWord doorGo doorNote`, `.door-signin` | the door |
| `.rooms .room .room-t/-d/-go`, `#rooms`, `.brand-h` | `.door-tiles .door-tile .door-tile-t/-d/-go`, `#doorTiles`, `.door-brand` | the doorway's tiles |
| `#room` | `#sandwich` | the stage after the door: the three rooms |
| `fd-*`, `fd*()`, `FD_*`, `FDBUSY` | `feed-*`, `feed*()`, `FEED_*`, `FEED_BUSY` | FEED IT |
| `QZ QTURNS QBRIEF QANGLE QNEED QLAST`, `ACC` | `QUIZ BOUNCE_TURNS BOUNCE_STEER BOUNCE_ANGLE BOUNCE_NEED BOUNCE_LAST`, `STOP_OPEN` | the bounce, and which stop is open |
| `sr-*`, `sr*()`, `SR_*`, `SRSTAGE` | `search-*`, `search*()`, `SEARCH_*`, `SEARCH_STAGE` | the search door |
| `cl-*`, `cl*()`, `CL_CONFIG CLS CLR` | `deets-*`, `deets*()`, `DEETS_CONFIG DEETS_ROWS DEETS_REPEATS` | LOCK THE DEETS — the rows, pills, cards |
| `dz-*`, `dz*()`, `DZ DZFLASH DZSTD` | `deets-*`, `deets*()`, `DEETS_SECTIONS DEETS_FLASH DEETS_STD_OPEN` | LOCK THE DEETS — the sections, the padlocks |
| `MENU`, `CHOSEN` | `TERMS_MENU`, `TERMS_CHOSEN` | the derived terms and the ticks — `MENU` was one word away from the shell's menu |
| `cl-door` | `stop-door` | the big pill out of a stop: WRITE THE WORDS, WRAP IT |
| `dz-door` | `deets-door` | the element that holds it in stop 3 |
| `cl-tick` | `tick` | the tick circle — the deets rows and the FILE IT tiles share it, so it's chrome |
| `clFmtDate` / `dzFmtDate` | `deetsFmtDay` / `deetsFmtDate` | *Sun 20 Sep* / *20 Sep 2026* — the one true collision |
| `fx-*`, `fx*()`, `FX*` | `fix-*`, `fix*()`, `FIX_ORDER FIX_LABELS FIX_HL FIX_DIFF FIX_FOCUS FIX_THREAD FIX_DOC FIX_ICON FIX_ASK FIX_KEPT FIX_LAST FIX_KEEP_RE FIX_INNER_CSS` | FIX IT |
| `HIST`, `WHY` | `FIX_HISTORY`, `FIX_WHY` | FIX IT's tweak memory and the why-beats |
| `fi-*`, `fi*()`, `FI_ICON FI_LAST` | `file-*`, `file*()`, `FILE_ICON FILE_LAST` | FILE IT |
| `hm-*`, `hmMenu hmOpen hmClose hmMenuBox`, `HM_FAQS` | `menu-*`, `menuToggle menuOpen menuClose menuBox`, `MENU_FAQS` | the shell's menu |
| `errcard errcard-h/-p/-go`, `errLine errAt errClear errCard` | `card card-h/-p/-go`, `robotLine robotLineAt robotLineClear robotCard` | the chrome's two surfaces |
| `TILES` | `DOOR_TILES` | the doorway's list |

Unchanged because already readable: `dump-*`, `chat-*`, `botdisc`,
`line`, `pane`, `step`, `think*`, `faq`, `tile` (FILE IT's fillings),
`BRIEF`, `ASSET`, `CONT`, `CID`, `RUN`, `REACHED`, `CRAFT`, `TERMS_*`,
`PADLOCK`, `TICK`, `RAIL`, `STR`.

`cardReset` and the `room` parameter inside `robotCard` stay — the card
takes the room's name as an argument, which is the one place the word
belongs in the chrome.

## Verified
- Pass A: 22 renders against v037 as committed — identical.
- Pass B: 22 renders against v037 — identical, twice. (One of the two
  passes caught the old `.card` rule fighting the new one and gave the
  card a border; the render found it, the rule went, zero again.)
- `smoke_ui.js`: identical to v037 line for line; the only textual
  difference is the test's own label `FXORDER:` → `FIX_ORDER:`.
- `smoke_gates.sh`: every file clean under the new prefixes.
- Every file parses; no page errors. No leftover old token anywhere in
  the front end (`grep` for every old prefix, id and constant: nothing).
- Nothing in Python, the containers or the prompts names a front-end
  class or id, so none of this reaches the server.

## What's next
Not tidying. The run store (step 4) and SET UP, both from a brief.
