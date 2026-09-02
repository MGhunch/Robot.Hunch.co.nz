# CHANGES — v033
*2 September 2026 — ONE FAILURE SURFACE. Twenty-odd error paths, six
presentations, three browser alerts. Now: one voice, two surfaces, one
capstone. The robot says it, near the wound, wearing the error face.*

*Built to Michael's brief (`ERRORSURFACEbuildbrief.md`) and the decisions on
top of it (`ROBOT-SANDWICH-error-surface-decisions.md` in the project). The
mock never arrived; the cards were rebuilt from the brief's anatomy on the
real stylesheet and approved from that render. Every state below was forced
in Playwright and looked at. No modals. No X's. The stops are always the
way out; the surface carries only the way forward.*

## Files

**New**
- `static/js/strings.js` — every error line, grouped by room. The file's
  first tenant. `index.html` never carries error copy inline again.
- `changelog/CHANGES-v033.md` — this.

**Replaced**
- `static/index.html` — the face as a constant; the line and the card;
  every path rewired; the door ladder; the dig routing; one long-standing
  markup bug fixed (below); cache tag `v=033`.
- `static/robot.css` — the line promoted (square left edge, disc, on-red
  variant, fade); the card; `.botdisc img` → `svg`; `.err` retired.
- `app.py` — `/api/bung`, the beacon, throttled; `bung_today` on
  `/api/health`; the 413 sends a reason; `TermsError` returns a code.
- `auth.py` — the word door sends codes: `empty` 400, `wrong` 403,
  `braked` 429.
- `copy_stage.py` — every voice retired for a code, the detail to the log;
  `/api/read` sends a reason per case.
- `file_it.py` — the raw `str(e)` on wrap folded to a code.

**Delete by hand**
- Nothing. `static/robot-face.svg` stays on disk but the page no longer
  reads it — the face lives in `BOT_FACE()` now. Delete it when you're
  sure nothing outside the page wants it.

**Not touched, on purpose**
- The OTP door lines in `auth.py`. They wake with hit-list 25 and get
  their own copy pass then, as the brief says.
- `auth/me` and `peek` keep their silence.

## What changed, and why

**The face is a constant, not a file.** There was one face in two copies —
`robot-face.svg` for standing still, an inline string for THINKING to
animate — and no way to give it a second expression. `BOT_FACE()` is now
a builder: plain by default, `BOT_FACE('err')` for X eyes and the lamp
gone hollow. `BOT_AV()` and `FD_ROBOT()` pass the face through; the
`<img>` uses went inline; the think disc, the sign-in disc, the doors and
the rail all draw from the one string. The eyes can't drift between copies
because there aren't copies.

**The line.** `fd-said` was already the right strip; it just had no face,
a curved left edge and a seven-second fuse on everything. Now: the disc
wearing the error face, a square left edge (deliberate — no curve on the
left, and it applies to every `fd-said`), and two lifetimes. A line that
asks for something (*Can you cut and paste?*) stays until acted on; a line
that doesn't fades after 7s. On the red rooms it goes solid white so it
reads as furniture beside the tiles. `errLine()` builds one; `errAt()`
puts one under an anchor and replaces the last, so failures never stack.

**The card.** Two exist: the plate (FIX IT, the craft call died) and the
grid (FILE IT, the menu never filled). White on the red room, the same
tile grammar as the fillings and the doorway rooms. Disc at 44, Oswald
caps, one Inter line, one Bebas button — always a button. TRY AGAIN
retries. Two consecutive failures on the same card is structural: the
beacon fires, the card reads **SOMETHING'S GONE BUNG**, and the button
becomes **SEND A ROCKET**. It sends nothing — the email already went — it
acknowledges the news and kills the card. On the plate the output tab pill
goes with it, so no label sits over an empty slot. The counter resets on
room entry (WRITE THE WORDS, WRAP IT UP), never on retry — a stale counter
showing BUNG on a first failure would be a lie. The grid card spans all
four tile columns: the *menu* failed, not a tile.

**The beacon — `/api/bung`.** One POST with what died, the room, container
and run. The server logs every one and emails Hunch via Resend
(`RESEND_API_KEY`, to `ROBOT_BUNG_TO`, default michael@hunch.co.nz),
throttled to one email per container per fifteen minutes so an outage is
one email, not fifty. No key: it logs loudly — *nobody was emailed* — and
the line stands. `bung_today` on `/api/health` counts beacons per
container, so the regular check can see a bad day without the inbox. The
front end fires it before rendering the BUNG card; it doesn't wait, so a
dead beacon can't strand the client on a spinner, and the log is the
witness either way.

**The server stopped talking to clients.** `api()` now throws the
parachute line from `strings.js` for every failure — *Doh, the robot fell
over. Please try again.* — with `e.status` and `e.code` alongside for the
paths that want to be specific. So every server voice retired for a code:
`fell`, `unreadable`, `no_key`, `no_container`, `noplan`, `search_died`,
`terms`, and the door's `empty` / `wrong` / `braked`. The detail that used
to travel in the sentence goes to the Railway log with the lane's model
id, where it's useful. The client owns every word. That includes the
operator line that used to reach clients — *Check /api/health* — it's a
log line now.

**The door's guess ladder.** Walks on status, not words: 403 is a wrong
word and steps the ladder (*Hmm... was that a typo?* → *Not that one
either?* → *Are you just guessing?*), 429 is the brake (*Doh, give it a
minute and try again.*), which the server trips at five. A right word
resets the count. The note under the input is the line, on red.

**The dead-doc row, nine ways.** `/api/read` sends a reason code per case
— `format`, `big`, `scan`, `empty`, `broken`, `glasses`, `nowords`,
`nopics`, `nothing` — and the row says it in Michael's words. The line
sits under the row, stays until the doc is dropped or another lands.
`readers.read` keeps its own strings; they go to the log. A reason the
map doesn't know lands as `broken`.

**Terms: 'not yet' and 'can't' are different things.** `refreshLegals`
swallowed a dead `/api/terms` into `MENU=[]`, and stop 3 then said *Finish
the facts above and the legals sort themselves* — the unfinished-facts
costume on a server failure. `TERMS_FAILED` and `TERMS_BUSY` tell them
apart: facts incomplete keeps the old line (it's not an error); fetch in
flight says *We'll pull in the terms in a bit.*; fetch dead is the line,
*Can't find the legals.*, in stop 3 and again in FIX IT's rail on entry,
where the terms tab is missing and this says why.

**The feeder loses its silence.** The plain-question fallback stays — a
stumble should still read as a plain question, and the room stands — but
the line now sits above it in the bounce rail: *Doh, the robot fell over.
Please try again.* The v029 outage could not hide behind the fallback
again. The line fades; the plain question doesn't.

**The dig, sanctioned.** The doors' *Let it dig* stops stubbing. It puts
the row back to view, jumps the concertina to the dump, opens the search
door and puts the row's label in the field, focused, arrow live. Stop 3
to stop 1 is deliberate — the dig is the dump's job. The stub line
(*Can't dig yet…*) is gone. (The bounce's own shovel the brief names was
already gone on purpose; there was only ever one stub left.)

**The rail's error turn.** `fxErr()` is a robot turn in the chat rail
wearing the error face, the line where the bubble would be. Tweak failed
(*That wasn't seamless. Please try again.*), tweak returned nothing usable
(*I'm not sure here. Got any ideas?*), a locked fact touched (*That's
locked in the brief. Signed off already.*). The FIXER's *Careful —* flag
keeps its plain bubble; it's the robot talking, not failing. Transcript
rows, so they stay.

**The doorway.** Containers won't list: the line in the doorway, where the
tiles would be, instead of a fake NO CONTAINERS tile. A tile won't open:
the line under the tapped tile. Both on red, both stay.

**WRAP IT.** The alert is gone; the line sits under the button. The bar
stacks so it lands under, not beside.

**A bug the render found.** FIX IT's pane (`data-p="1"`) was never closed,
so FILE IT's pane sat *inside* it in the DOM and vanished the moment
`go(2)` switched FIX IT off. One `</div>`. It's been that way through every
commit in the log — the render is the only reason it surfaced.

## Verified
- Every state forced in Playwright against the app running locally with
  no API key (so the model paths fail for real): the ladder ×5, the
  doorway both ways, the dead doc, search died / plan empty / feeder
  fell, terms wait / terms fail, the plate card → BUNG → rocket → gone
  with its pill, the rail's three error turns beside a plain one, THINKING
  still spinning on the new face, the grid card → BUNG, the wrap line
  under the button, WRAPPED wearing the plain face. No page errors.
- `Let it dig` routing: stop 0, search door open, *Venue* in the field,
  focused, arrow live.
- The beacon: two POSTs to `/api/bung` logged with what/room/container/
  run/who; *nobody was emailed* logged loudly without a key.
- `grep alert(` on `index.html`: nothing. `grep robot-face.svg`: nothing.
- JS parses; Python compiles.

## Not verified — needs Michael
- The email itself. `RESEND_API_KEY` isn't on Railway (hit list 25).
  Acceptance test 4 — the beacon email arriving — waits on that key.
  Everything else about the beacon is proven from the log.
- A real model failure mid-craft on Railway, as opposed to the no-key
  failure here. Same code path, same 500, but say so rather than imply.

## After this lands
- Put `RESEND_API_KEY` on Railway; `ROBOT_BUNG_TO` if it shouldn't be
  Michael. Then kill the network mid-craft and watch for the email.
- Hit list: **One failure surface** — done. Add the found pane bug to
  the v033 line so nobody wonders why FILE IT suddenly works.
- No `requirements.txt` change; a restart, not a rebuild.
