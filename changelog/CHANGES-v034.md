# CHANGES — v034
*2 September 2026 — the chrome becomes a file. Step 1 of the front-end
refactor. Nothing changes on screen; that's the whole test.*

*The back end is tidy because Flask made it register blueprints. The front
end got one `<script>` tag and nobody stopped it: 2,500 lines, three rooms,
thirty globals, every room reading the others' DOM. This zip lifts the part
that isn't any room's — the furniture — into `static/js/chrome.js`. Church
and state. The plan and the language are in
`ROBOT-SANDWICH-front-end-refactor.md` in the project.*

## Files

**New**
- `static/js/chrome.js` — the engine's front-end furniture: helpers,
  `api()`, the face, the line, the card, the beacon, the engine's icons,
  the padlock, the stepper, THINKING, the think face, the rail's rows.
- `smoke_errors.js` — the v033 Playwright harness, now in the repo as the
  regression test: forces every error state, screenshots twenty views.
  Run before, run after, pixel-diff.
- `changelog/CHANGES-v034.md` — this.

**Replaced**
- `static/index.html` — 280 lines shorter; loads `chrome.js` after
  `strings.js`; the rooms call the chrome. Cache tags on both scripts to
  `v=034`. `robot.css` is untouched, so its tag stays at `v=033`.
- `smoke_ui.js` — one flag (`resources:'usable'`) so JSDOM loads the
  external scripts. It had been failing since v033 put `strings.js`
  outside the page; it wasn't noticed because it was already failing at
  the v031 renderer. Now it runs to the `one_update` step and stops
  there for an older reason (below).

**Delete by hand**
- Nothing.

## What moved, and the rules it moved under

**Moved, name for name.** `$`, `esc`, `api`; `BOT_FACE`, `BOT_AV`,
`FD_ROBOT`; `errLine`, `errAt`, `errClear`; `errCard`, `cardReset`,
`CARD_FAILS`, `beacon`; `CL_CHECK`, `CL_PENCIL`, `FI_TICK`, `PADLOCK`;
`REACHED`, `unlock`, `go`, `reach`; `THINK_LINES`, `THINK_HOLD`,
`THINK_MIN`, `thinkBeads`, `thinkLine`, `thinkStart`, `thinkEnd`;
`THINK_POOL`, `thinkFace`. Not one name changed — `FD_ROBOT` moves still
wearing FEED IT's prefix, and three ticks and two pencils move under their
old names. Renames are step 3's job; a rename in a move is a diff nobody
can review.

**Added: the rail's rows.** `RAIL.robot`, `RAIL.me`, `RAIL.err`,
`RAIL.think` — the four row shapes every chat rail draws, as strings.
`fxSay`, `fxErr`, `fxThink` and `fdThink` now ask the chrome for the row
and keep doing what they did with it. FIX IT's thread logic (`FXFOCUS`,
`FXTHREAD`) is room state and stays in the room.

**The two rules, and the two things they caught.**
1. *Chrome never names a room's element.* The card's rocket used to clear
   `.fx-tabs` itself — the chrome knowing FIX IT has a tab row. Now
   `errCard` takes `meta.onGone` and FIX IT passes the clearing. Grep
   gate: `grep -E "\$\('(fx|fd|fi|si|cl|sr|dz)" chrome.js` → nothing.
2. *Chrome never reads a room's global.* The beacon read `CID` and `RUN`
   straight off the page. Now `errCard(room, retry, what, meta)` carries
   `{container, run}` from the room to the beacon. Grep gate for
   `CONT|CID|RUN|FACTS|COPY|MENU|…` in chrome.js → nothing.

**One bug the move surfaced.** The `[data-face]` fill ran at parse time
and worked only because the script sat at the bottom of the body. In the
head it ran before the body existed and the WRAPPED face went missing —
the pixel diff caught it on shot 19. It now waits for `DOMContentLoaded`
when it needs to.

**`.fd-said` keeps its name.** It's the line's class, chrome's own, and it
wears FEED IT's prefix because that's where it was born. Renaming it means
touching `robot.css`, which this zip doesn't. Step 3.

## Verified — zero visible change
- **Twenty-two screenshots, pixel-identical.** `smoke_errors.js` on v033
  as committed, then on v034: 22 identical, 0 differ. (One shot needed the
  harness to wait past the line's 280ms fade-in — timing, not code; the
  wait is in the harness now.)
- `smoke_ui.js`: output identical on v033 and v034, line for line, to the
  point where it stops.
- Both grep gates clean. `chrome.js` and the rooms parse, separately and
  concatenated. Python untouched.
- The beacon still fires: two `/api/bung` posts logged with
  container and run, carried by the room.

## Not fixed — older than this zip
- `smoke_ui.js` stops at `enterRoom('one_update')` with a 404, because
  the test signs in with the anonymous word and `one_update` is
  `testing`, which only a Hunch login can see. It wants `ROBOT_WORDS`
  with a Hunch name, or a live container. Small, separate.

## What's next
Step 2 — the brief and the asset as objects. That one starts with a
decision, not code: the fields of a brief, in Michael's words.
