# CHANGES — v047
*5 September 2026 — THE CONTAINER SET UP. You look at the artefact, you say
what's wrong with it, it proposes the smallest change, you confirm.*

## Files

**New**
- `setup_chat.py` — the router, the three scoped robots, the font gate, and
  the check that reads every "before" off the disk.
- `setup_dummy.py` — the stand-in copy, derived and never stored.
- `prompts/setup_router.md` — sorts one sentence into one file. Sees no file.
- `prompts/setup_look.md` — one CSS declaration in `container.html`.
- `prompts/setup_config.md` — one line, cell or section of `config.md`.
- `prompts/setup_spec.md` — one cell or section of `spec.md`.
- `test_setup_chat.py` — the lane end to end without a model.
- `smoke_setup_room.js` — the room drawn for real, containers and brands.
- `changelog/CHANGES-v047.md` — this.

**Replaced**
- `app.py` — `/api/setup/chat`, `/apply`, `/undo`, `/park`; the stand-in and
  the strays in the container payload; `_after_write` hands a container its
  whole payload back.
- `setup_edit.py` — the seventh edit (`set_css`, with `read_css`) and
  `add_open`. The header rule is unchanged and still means it.
- `containers.py` — reads `## Open` on a container. **`PARSER = 44`.**
- `robots.py` — four lanes for the chat, all FAST.
- `static/js/setup.js` — the compose box, the diff, confirm, undo, park, and
  the pour. Tag `v=047`.
- `static/js/deets.js` — `deetsSeed()`. Tag `v=047`.
- `static/js/strings.js` — the chat's words. Tag `v=047`.
- `static/index.html` — the compose box is live; the send and undo buttons.
- `static/robot.css` — the proposal card and the diff. **`robot.css?v=047`**.

**Delete by hand** — nothing.

> **The tags.** v046 changed `setup.js`, `strings.js` and `robot.css` and
> shipped them under the v045 tag, so a browser that cached those may still
> be running the old ones. Bumping to 047 fixes v046 and v047 together.

## No shelves

Brands are shelves. A container is shopping — by the time a folder is a
container, everything is supposed to be there — so the container room does
not get a shelf rail, and the layout question ("asset left, chat right, so
where do the shelves go?") turns out not to need answering.

What was going to be pills is a sentence, which is what those problems
already are. The chat's opening lines are the validator's verdict, then two
more that refuse nothing:

    THE WAITING ROOM   `## Open`, parsed since containers existed and never
                       once displayed. It shows now.
    THE STRAYS         what this container wears that its brand has never
                       declared.

**MUST is still not a second opinion.** Neither of those is a problem and
neither refuses a lock — the validator owns that list, and the rule written
above `_brand_shelves` holds.

## The stand-in copy

The point of this room is seeing how a *client's* finished render will look,
and an empty slot shows you nothing. So `spec.md`'s Modules table — which
already says who fills each module and how long it may be — fills the blanks:

    filled by writer   latin, cut to the stated length. If it overflows the
                       design that is a FINDING: the limit doesn't fit the
                       container it was written for.
    filled by fixed    the length column IS the copy. Shows real.
    filled by client   a grey box, because latin in a picture frame is a lie.

**Only into empty slots.** `prize_draw` already carries real copy and latin
poured over "Win one of five double passes to Practical Magic 2" would make
the check worse. Full slots are stepped over.

Derived on every read, never stored. There is deliberately no `## Sample`
section and there should not be one — a stand-in is not content anyone owns,
and a stored one goes stale against a spec that moved.

The deets card is seeded the same way, which unblocks *DEETS renders empty*
without waiting on the reference-facts decision.

## The chat

    you type -> a router picks the file -> that file's robot proposes the
    smallest change -> before and after, off the disk -> you confirm

**A router and three robots, not one robot with three files.** One robot
holding all three will move copy into the spec and limits into the html on
the day you most need it not to. The router never sees a file — only the
sentence and one line about what each file owns.

**Every "before" is read off the disk.** A model has no way of knowing what
is actually there and every incentive to sound sure.

**Undo per edit**, per sitting, in memory — the same deal as the locks. Each
entry carries the edited file *and* `config.md`, because the changelog line
and the version bump live in the manifest and an undo that left those behind
would be a lie in the folder.

**Asking writes nothing.** The draft is made by the confirm, so a question
you think better of leaves the folder as it was.

## The font gate

The brand declares the faces, the logo and the palette. The chat may
**rearrange** inside what the brand declares and may **not import** into it.

Which gives the app a check it has never had: `containers.py` has always
checked that a brand's named *files* are present, and never once compared
what a container actually *wears* against what its brand *declares*. Run it
today and `prize_draw` lights up — `--display:'Bebas Neue','Arial Narrow'`
on a One NZ artefact, which is Hunch's face, and nothing anywhere would have
told you.

Everything the container decides for itself — size, spacing, weight,
tracking, alignment — is fair game. `prize_draw`'s h1 is 31px with 1.5px of
tracking and `one_nz`'s brandlook says nothing about either.

## Hang on a sec

An ask the six edits can't do is not a failure and not a no. It is a thing to
decide, and the worst place to leave it is a chat window that closes. PARK IT
appends a bullet to `## Open` in `config.md` and it travels with the push.

Which is also where the **LOOK SPECIFICS** hole goes for now. Ask for Bebas
on a One NZ container and the chat says the brand doesn't declare it, and
offers you the park — because the two honest answers are a brand edit or a
declared departure, and the second one still has nowhere to live.

## Known edges

- **`config.md` section edits are `##` only.** `set_section` works at level
  two, so a change aimed at one `###` inside FEED IT gets parked rather than
  rewriting the whole parent section. That is the right refusal for now; a
  sub-section edit is an eighth edit and a separate decision.
- **The version-bump race is unchanged.** `log()` still bumps a point per
  write, so a folder edited twice reads v1.1, v1.2 in whatever order the
  writes landed. Harmless until somebody reads a changelog on screen.
- **`## Open` at container level is new.** `_parse_legals` has always read a
  `### Open` inside LEGALS as well; they are different lists and only the
  container-level one is displayed.

## The seventh edit

`set_css(path, selector, prop, value)` — the value of one declaration inside
one rule, and not a character more. Last rule and last declaration win,
because that is what the cascade does.

It **changes** what is there. It does not add declarations and it does not
add rules: an ask that needs a new one is parked, because creating is a
decision, not a tickle.

## Checks

    smoke_gates.sh        PASS — a room may call the chrome, never a room
    smoke_ui.js           PASS — errors: []
    smoke_setup_room.js   PASS — the room drawn, containers and brands
    test_setup_chat.py    PASS — stand-in, strays, gate, apply, undo, park
    test_reader.py        PASS
    test_engine.py        FAILS — "Tickets is blank", identically on main.
                          An out-of-date fixture, still deliberately untouched.

The robot's own call needs a key that lives in Railway, so the model half is
untested here — everything either side of it is. Same shape as v045's push:
the first real one is yours.

*Honest.*
