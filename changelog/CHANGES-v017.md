# CHANGES — v017
*30 August 2026 — FILE IT*

*One sitting on the last room, off file-it-mock.html. FINISHED was a
picture of files; FILE IT builds them. The doc is real. The PDF is
grey on purpose.*

## The room
FINISHED is now FILE IT — the rail says so. Three commands, then; the
state is the moment after the button. Full-bleed red like FEED IT and
FIX IT, the robot asking: *How would you like your sandwich?* under
PICK YOUR FILLINGS. THE ROBOT WRAPS IT.

Four white tiles on red, the Doorway's rooms wearing the detail list's
tick: PDF · DOC · PICS · CODE. All four show every time so the page is
learned once. A grey tile is paper and its line says why. WRAP IT sits
centred under the tiles, dead when nothing's ticked, never disabled
otherwise. No back door — the rail is the way back.

After the press the robot says it once — WRAPPED. That's a sandwich —
and the files stack in a white card: TAKE IT on each, TAKE THE LOT on a
wrapped zip when there's more than one. YOUR NEXT PROJECT reloads.
"Change the order" puts the tiles back.

The old preview of the email is gone. FIX IT already has it on the
table.

## Which fillings
Two reasons a tile goes grey — the container can't, or this run didn't
— and the page never decides. `/api/fillings` reads `spec.md` and the
run's uploads and deals the tiles:

- **PDF** — grey, *Not on the menu yet.* Its own project. The one grey
  that means not-yet rather than can't.
- **DOC** — always on. *Every word, on the record.*
- **PICS** — on when the spec's IMAGES table has rows and the run has
  uploads. No rows: *This one doesn't take pics.* No uploads: *You'll
  need to send those separately.* Both containers say the second today
  — the pics page went in v015, so nothing uploads yet; the route's
  still there for when it comes back.
- **CODE** — on when a spec Outputs row's *files emitted* names `html`
  or `code`. Neither does today: *You'll need to upload to your tool.*

That last is the one bit of vocabulary the engine reads off the spec.
Written down here so SET UP knows the words.

## The doc
`file_it.py` renders the Hunch copy deck from the container, no
template binary. Hunch furniture: the deck's grid (2263 / 6753), Calibri
11, the spacing, red section bars, one bar per spec Output, one row per
module in spec order. Writer modules carry the FIX IT copy with
placeholders filled from the same facts as the terms; subject, headline
and button rows are bold as the deck has them; fixed modules carry their
own words off the spec's length column (From line, Enter now, Kia ora);
`terms` is the assembled clauses with the footer; repeating groups come
out as *Card 1 — headline*, *Card 1 — body*. Anything left in brackets
is red.

The top: HAI2 left in the header, the client's mark right — read off
`skin.md`'s Logo line, PNG or JPG in the brand's assets (an SVG can't go
in a docx). One NZ's landed this sitting — the stacked lockup, trimmed,
1.8cm tall in the header. COPY DOC in Bebas under that,
then CLIENT | project name. HAI2 is `static/hai2.png` — a 116px crop
of a screenshot for now, a positional; swap in the real file from the
Hub at any size and nothing else changes. Footer: *Supported by Hunch Robot
Sandwich · date*.

Metadata: Client, Container, Human in the loop (whoever's signed in),
Date / version with the tweak count when there is one.

## The wrap
`POST /api/wrap` takes what's ticked, builds it into `ROBOT_WRAPS/<run>/`
(default `./wraps`, not the volume — rebuilt on every press, nothing
worth keeping), and hands back links. `GET /api/wrap/<run>/<name>` is
the download, auth-gated, attachment. Names: `{slug}-copy.docx`,
`{slug}-pics.zip`, `{slug}-wrapped.zip`. Pics zip as they came — the
respec is still hit list 6.

`/api/parcel` still works and now shares its builder with the wrap, so
the copy in the doc is the copy the room showed.

## Housekeeping
- `python-docx` added to requirements.txt.
- app.py's architecture note names file_it.py.
- Tested: reader and engine tests green; a jsdom walk of the room
  (tiles dealt, tick, wrap, doc downloads, untick kills the button) —
  no page errors; the doc opened in LibreOffice and looks like the deck.

## Not done, on purpose
- The PDF. Own project.
- `static/hai2.png` is a screenshot crop. The real one's in the Hub.
- The pics tile is grey for everyone until the pics page returns.
- Hit list: 5 moves to half-done (doc, pics, wrap; PDF out to its own
  line). Site plan §3 wants FINISHED → FILE IT and the state line
  moved to after the button.

*Honest.*
