# SPECS — one_update

## Outputs (primary first)
| id | name | files emitted |
|---|---|---|
| email | One Update email | copy doc, sign-off PDF, hero + card images |

One output for now. If a web/tile version gets commissioned, it's a new row and a new html.

## Modules
| # | module | output | fixed/optional | filled by | length |
|---|---|---|---|---|---|
| 1 | subject | email | fixed | writer | ≤ 50 chars. A and B. Names the best thing. |
| 2 | preheader | email | fixed | writer | ≤ 80 chars. The second-best thing. Not relied on. |
| 3 | header | email | fixed | fixed | logo strip |
| 4 | wallet | email | fixed | fixed | One Wallet ID · Phone Dollars (merge) |
| 5 | salutation | email | fixed | fixed | Kia ora [FirstName], |
| 6 | headline | email | fixed | writer | 2 lines. Counts toward the 250. |
| 7 | intro-copy | email | fixed | writer | headline + copy ≤ 250 chars. The thread. |
| 8 | hero | email | fixed | client | image, see images.md |
| 9 | card ×N | email | 3–5 | — | repeating. Type: prize / news / product / housekeeping. Order from brief. |
| 9a | card-title | email | fixed | writer | ≤ 48 chars. Prize cards say the prize. |
| 9b | card-body | email | fixed | writer | ≤ 160 chars. |
| 9c | card-cta | email | optional | writer picks | ≤ 24 chars, from the set. Secondary style. |
| 9d | card-image | email | fixed | client | image, see images.md |
| 10 | signoff-copy | email | fixed | writer | ≤ 250 chars incl. Ngā mihi lines. One plain sentence about the next thing. |
| 11 | banner | email | optional | fixed | Best in Test. Client toggles. |
| 12 | legals | email | fixed | assembled | legals.md — per-card draw clauses, extras, standard |
| 13 | base | email | fixed | fixed | privacy · copyright |

## Card count
Min 3, max 5. Guidelines cap imagery at 40% of the email; five cards plus a hero is about the ceiling. Fewer than three and it isn't a roundup.

## Why-beat fallbacks (FIX IT rail, per module)
- subject: The front page. Best thing, then the second best. No teasing.
- headline: Plain inventory of the issue, two lines.
- intro-copy: The thread — one idea that hangs the cards together, told dry.
- card-title: Says what it is. Prize cards say the prize.
- card-body: 160 characters. What, why you'd care, what to do.
- signoff-copy: One sentence about the next thing. No cheer.
- legals: Suze's clauses, assembled from the brief. Read it and nod.

## Notes
- Titles sentence case, no full stop. "Be in to WIN" in Q1 is wrong.
- One exclamation mark per email at most, and it lives in the intro if it lives anywhere.
- Prize cards fire a draw clause each (legals.md). Needs a short prize name and a close date per card.
- Q1 broke most of the lengths. The container html has them truncated to show the cut.
