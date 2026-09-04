# CHANGES — v041
*4 September 2026 — SET UP goes in the menu properly, with a client's side
to it.*

## Files

**Replaced**
- `static/js/chrome.js` — `menuAdd` routes instead of hiding. Tag `v=041`.
- `static/js/setup.js` — the SET UP door gets its other side. Tag `v=041`.
- `static/index.html` — the client's SET UP card; the two tags.
  **`robot.css?v=041`**.
- `static/robot.css` — one rule, `.menu-cta`.
- `changelog/CHANGES-v041.md` — this.

**Delete by hand** — nothing.

## What changed, and why

**SET UP was in the menu, and invisible.** v040 hung it as a hunch-only
button that stayed `hidden` until `/api/auth/word` came back with
`hunch:true`. Which is correct, and which means one wrong environment
variable on Railway makes a room you just shipped vanish without a trace.
Worth knowing for its own sake: `ROBOT_HUNCH` defaults to `Michael` and is
matched against the *name* your word resolves to in `ROBOT_WORDS` — if
those two don't agree, you're a client on your own tool.

**A door with two sides shows to everyone.** The burger now carries SET UP
for every login. Hunch walks through to the check room. A client gets the
honest answer to what's behind it:

> Want a new container? Just get in touch to chat it through.

and a GET IN TOUCH button. That's the site plan's frame stated in the
product rather than only in the deck — the engine is a commodity, container
design is the thing Hunch sells, so the client's SET UP is a conversation,
not a screen. It beats a hidden button, which teaches a client nothing, and
a greyed one, which teaches them they're not allowed.

The chrome does the routing and still knows nothing about either side:

    menuAdd('SET UP', ()=>{ menuToggle(); enterSetup(); },
            {hunch:true, otherwise:()=>menuOpen('setup-ask')});

A door with one side keeps the v040 behaviour — hidden until the login
says otherwise. A door with two shows always and picks on the way in.

**The button address** is `mailto:michael@hunch.co.nz`. Change it if it
should be someone else's inbox.

**One bug, found by pressing it.** `menuAdd` closed the menu itself and
then `menuOpen()` closed it again — two toggles, so the burger sat open
behind the card. The handler closes the menu now, the same way ABOUT and
FAQS always have; the chrome only decides which handler.

## Verified
- Both logins, real sessions, in a browser: a Hunch word lands in the room;
  a client word gets the card. Menu reads ABOUT / FAQS / SET UP for both.
- `smoke_gates.sh` PASS · `smoke_ui.js` `errors: []`.
- FEED IT (both containers, empty and filled) and the doorway — six
  full-page renders, still pixel-identical to the committed baseline.

*Honest.*
