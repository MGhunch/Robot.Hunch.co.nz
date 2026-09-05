# CHANGES — v050
*5 September 2026 — it stops fighting you, and it stops claiming changes you
can't see.*

## Files

**Replaced**
- `setup_chat.py` — a proposal may carry a few declarations; the font
  reality check.
- `prompts/setup_look.md` — look before you park, and how to send a set.
- `static/js/setup.js` — the note on the card. Tag `v=050`.
- `static/robot.css` — the note, and the two columns lining up.
  **`robot.css?v=050`**.
- `static/index.html` — the tags.
- `test_setup_chat.py`, `smoke_setup_room.js` — the new checks.

**New** — `changelog/CHANGES-v050.md`.

**Delete by hand** — nothing.

## It said it did it, and it hadn't

Asked for Euclid, the robot answered *"Body font swapped to Euclid Circular
A"* and the artefact did not move a pixel. It was telling the truth about the
file and lying about the picture: `prize_draw/container.html` has **no
`@font-face` at all**, so `'Euclid Circular A', Arial` resolves to Arial —
which is what was there before. (Bebas renders in the headline only because
Bebas is installed on the machine looking at it, not because the artefact
loads it.)

On an email that is usually correct rather than broken — mail clients don't
load webfonts, so the fallback is what the recipient actually gets. What was
broken is the room reporting it as a change made.

So a font change now says what will happen:

> You won't see this: nothing in container.html loads Euclid Circular A, so
> it falls back to Arial. Real in the file, same on screen.

The card drops its red edge when it says this, because the red edge means
*the artefact is showing you something* and it isn't. The edit still goes
through — it is a real and often correct edit — you just aren't told you can
see it when you can't.

Per container, off the artefact's own stylesheet: `one_update` **does** load
Euclid Circular A, so there the same swap shows and says nothing.

## One idea, more than one declaration

The cap of one declaration per proposal was written when you confirmed a diff
blind. Since v049 you look at the change before keeping it, and the cap was
just making the robot argue:

> *"headline's Bebas Neue is a separate --display variable, left untouched
> since only one declaration allowed — flag if that should change too."*

Now a proposal may carry up to **four** declarations, on **one** rule, for
**one** intent — full bleed is a negative margin and losing the border and
squaring the corners, and asking three times for one thought is not a
conversation. Previewed together, kept together, put back together, one
changelog line. Every declaration must still already exist on the rule, and
the diff names each one.

## Look before you park

"The image should be full bleed" was refused as *"a markup/rule change, not
one declaration"* — and it isn't. `.hero` already carries `margin:0 0 22px`
and `.body` carries `padding:26px 24px 30px`, so `margin:0 -24px 22px` is the
whole job, in a declaration that was already there.

The prompt now tells it to read the stylesheet and find the declaration that
would do it before deciding an effect needs markup, with the four that come
up most: full bleed is a negative margin, tighter is the padding, bigger is
the font-size, wider is the width.

**Parking is for an ask with no declaration behind it. Not for an ask that
sounds hard.**

## Also — the two columns line up

The mock is drawn small and zoomed, and 250px at 2.2 is 550 in a 600 column,
which `margin:auto` centred — so the artefact sat 25px right of its own
lozenge while the other two stops sat flush. Its width comes off the column
and the zoom now, one number named once.

And the rail is a flex column with a gap while the lozenge row also carried a
bottom margin, so the chat started 13px below the artefact. Margin off, gap
matched.

## What is still honestly refused

"Lose the Subject line" is not a bug. Removing a module means the row in
`spec.md` and the tag in `container.html`, and the validator checks those
against each other in both directions — so half of it breaks the folder.
That is a park, and it should stay one.

## Checks

    smoke_gates.sh        PASS
    smoke_ui.js           PASS — errors: []
    smoke_setup_room.js   PASS
    test_setup_chat.py    PASS — now covers the declaration set and the
                          "you won't see this" note both ways
    test_reader.py        PASS
    test_engine.py        FAILS — "Tickets is blank", as on main

*Honest.*
