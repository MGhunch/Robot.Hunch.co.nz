# CHANGES — v010
*28 August 2026 — the FIX IT furniture pass*

*Design approved in mock (fix-it-layout-mock.html) before the port.
One file changed: static/index.html.*

## The furniture
THE WORK over the artefact, THE WORKINGS over the rail — same Bebas
treatment, same class (.fx-room), same baseline. "FIX IT" leaves the
room title; the stepper already says it. "TWEAK IT OR LOCK IT" leaves
the rail head; the game lives in the buttons, not the sign.

## The tabs
#1: EMAIL / #2: WEBTILE under THE WORK. Furniture for now — email
live in paper, webtile sitting dead until its specs exist. They go
live with the multi-artefact work (hit list 12b). The active tab
joins the artefact card (top-left radius dropped).

## The lock rail
The locks belong to THE WORK. One rail, fixed x, hard off the
artefact's right edge, each lock tied on by a short dotted keyline
stub (.fx-pad::before). Vertical position comes from the section;
horizontal comes from the card. No more drift when sections have
different box edges.

## The air
Grid gap 96 → 150, max width 1120 → 1200. The two columns breathe.

## The robot
The tour avatar is now the engine's face proper: red circle, white
robot (inverted ink PNG) — matching the edit-state avatar that
already did it.

## The exit
GOOD TO GO pushed clear of the working cards (margin-top 26). Two
pieces of furniture, not a stack.

## Housekeeping flag, not actioned
The repo still carries what CHANGES-v009 said was deleted:
robot-v007.zip, "Robot.Hunch.co.nz-main (3).zip", robot_store.jsonl,
prompts/spine.md, prompts/tweak_it.md, prompts/write_it/. File-by-file
replacement adds but never removes. Delete on GitHub when ready.

*Honest.*

## Addendum — the favicons
The engine's face, iconised: the simple robot from the FIX IT room —
red disc, white head, antenna, red eyes. One mark, all six sizes
(512/192/180/48/32/16), crisp at every one. Files into /static, five
link tags into the head. Same red as tokens.css (#ED1C24).

The face is now a shared asset — static/robot-face.svg — and both
FIX IT avatar circles (tour and edit state) wear it in place of the
inverted illustration. One face everywhere the robot speaks; the
full robot-and-sandwich survives where it's a character, not an
avatar (the writing screen).
