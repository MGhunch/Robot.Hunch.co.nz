# NEEDS — one_update
*The checklist. BOUNCE IT reads the asks off here and compares with the dump. Only what gets ticked lives here — raw material (synopsis, press release, product blurb) stays in the dump and the WRITER reads it straight.*

## A good dump for this format
A list of what's in this issue, in order — and the doc behind each one. Three to five things. If there's a thread that ties them together, say so; if not, the robot will look for one.

## THE ISSUE
| id | label | type | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|
| issue | Issue | text | yes | Which issue is this — Q1, Q2? | | no |
| thread | The thread | text | no | What ties this lot together? | I'll look for one in the dump. | no |
| next | The next thing | text | no | Anything coming up to mention at the end — an event, a date? | Fine to skip. | no |
| card_count | How many cards | dropdown 3–5 | yes | How many things are in this issue? | | no |

## EACH CARD (repeats per card, 1–5)
| id | label | type | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|
| card_type | Type | dropdown: prize / news / product / housekeeping | yes | Is card {n} a prize, news, a product, or housekeeping? | | no |
| card_subject | What it's about | text | yes | In a few words — what's card {n}? | | no |
| card_cta | Button | dropdown: Enter now / Find out more / Learn more / Check my balance / none | no | What should the button say on card {n}? | I'll pick from the set. | no |
| card_url | Link | text | no | Where does card {n}'s button go? | | yes |

## EACH PRIZE CARD (repeats per card where type = prize)
| id | label | type | sub | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|---|
| prize_name | Prize, short | text | | yes | What's the prize, in a few words? (goes in the terms) | | no |
| prize_count | How many | text | | yes | How many prizes? | | no |
| closes | Draw closes | date | 11:59pm | yes | When does the {prize_name} draw close? | | no |
| terms_url | T&Cs link | text | | no | Where do the full terms live? | I'll ask Suze. | yes |
| extras | Extra clauses | checkboxes from legals.md | | no | Any of these apply? | | no |

## FIXED (never asked, never ticked)
- FirstName, One Wallet ID, Phone Dollars — merge fields
- Sign-off lines, privacy, copyright — base
- Best in Test — banner toggle, client's call per issue

## Open
- Whether hero and card images come with the dump or after. Guess: after. Images row per card needed once One NZ answers specs.
- Whether the client picks card order or the robot proposes it. Rows above assume the client's list is the order.
