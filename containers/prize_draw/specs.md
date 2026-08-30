# SPECS — prize_draw

## Outputs (primary first)
| id | name | files emitted |
|---|---|---|
| email | Rewards prize-draw email | copy doc, sign-off PDF, hero image |

A webtile sits as a dead tab in FIX IT. Second output when someone asks for one.

## Modules
| # | module | output | fixed/optional | filled by | length |
|---|---|---|---|---|---|
| 1 | subject | email | fixed | writer | ≤ 45 chars. Three options, genuinely different; best one on the card, two in the drawer. |
| 2 | header | email | fixed | fixed | From: One NZ Rewards <rewards@one.nz> |
| 3 | hero | email | fixed | client | image, see images.md |
| 4 | headline | email | fixed | writer | One line. Plain about what you win. |
| 5 | body | email | fixed | writer | Two or three short sentences, ending with what to do. |
| 6 | button | email | fixed | fixed | Enter now |
| 7 | terms | email | fixed | assembled | legals.md — base clauses, prize-type extras, ticked options |
| 8 | footer | email | fixed | fixed | Rewards contact line, legals.md |

## The placeholder rule
The writer never writes a number or a date as a literal. Only these, in curly braces, spelled exactly:
`{prize_name} {winners} {winners_word} {winner_word} {closes_day} {closes_short} {closes_long} {opens_short} {venue} {event_short}`
"one of {winners_word} double passes", never "one of five". "closes {closes_day}", never "closes Sunday". A bare digit or a written-out month is a bounce. The engine fills them from the same facts that built the terms — one source of truth, two renderings.

## Why-beat fallbacks (FIX IT rail, per module)
- subject: The pick of three — two more wait in the drawer.
- headline: Plain about what you win — the rule up here.
- body: The story, three short lines, ends with what to do.
- terms: Suze's clauses, assembled from the brief. Read it and nod.

## Notes
- A piece that bursts its block is wrong, however good the words.
- The subject can be playful. The headline can't.
