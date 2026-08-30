# CONFIG — one_update
*What FEED IT asks and ticks. Manifest, the dump nudge, the three moves' dressing, the needs list, the clause library. The engine reads this; SET UP writes it.*

name:    One Update
client:  One NZ
brand:   one_nz
format:  email
version: 1
status:  testing

**Purpose:** The quarterly roundup for One NZ customers. Three to five things worth knowing, in order, with a thread if there is one. Prize draws, news, a product, housekeeping. Reads in a minute on a phone. Suze signs off the legals.
**Outputs:** email.
**Reference:** OCS03000 One Update EDM Q1 (proof PDF), One NZ eDM Guidelines v3.0 Oct 2025, two screenshots of the card treatment. Euclid files and logo still to come.

## Changelog
- v1 — 30 Aug 2026 — first set up, from OCS03000 Q1 and the eDM guidelines v3.0. Voice built here (not Prompter). FEED IT replaced by DUMP / BOUNCE / CHECK; NEEDS below drives BOUNCE IT. Michael + Claude.
- v2 — 30 Aug 2026 — crunched to five things: config.md (this), voice.md, spec.md, one_update.html, assets/. One home per fact. The engine draws the ghost from the html. Michael + Claude.
- v3.1 — 30 Aug 2026 — schema gaps closed: FEEDER needs and bounce dressing added (draft copy), derived facts named for the draw clause, Standard legals as a table. Michael + Claude.
- v3 — 30 Aug 2026 — brand split out: voice and skin now live in brands/one_nz, pointed at by `brand:` above. The container keeps a VOICE LEAN in spec.md. Michael + Claude.

## FEED IT
### What a good dump looks like
A list of what's in this issue, in order, and the doc behind each one. Three to five things. If there's a thread that ties them together, say so.

### What the container needs (the FEEDER reads this)
A quarterly roundup for One NZ customers. Three to five things worth knowing, in the client's order, each with a doc behind it. It has to name what's in the issue, give each thing one honest reason to care, and find the thread if there is one. Card types, counts, dates and links are checklist facts, not chat.

### Bounce it — the dressing
| move | job | plain | placeholder | why |
|---|---|---|---|---|
| 1 | the gap | What's this all about? | 'Headphones draw, the DOC toilet story, refurb phones, and a nudge to check Phone Dollars...' | The list and the order set the shape of the whole issue. The facts per card I'll chase at the checklist. |
| 2 | the benefit | Why will anyone care? | 'The toilet thing is actually great. The rest is housekeeping.' | One honest line about the best thing in the issue beats a summary of all five. |
| 3 | the angle | What's the angle? | 'Yep.' Or say it your way. | The thread is the one idea the intro hangs off. I'll propose one from the list; say yes, or say it better. |

### Closing line
Got it. Let me check what I'm missing.

## NEEDS
### THE ISSUE
| id | label | type | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|
| issue | Issue | text | yes | Which issue is this — Q1, Q2? | | no |
| thread | The thread | text | no | What ties this lot together? | I'll look for one in the dump. | no |
| next | The next thing | text | no | Anything coming up to mention at the end — an event, a date? | Fine to skip. | no |
| card_count | How many cards | dropdown 3–5 | yes | How many things are in this issue? | | no |

### EACH CARD (repeats per card, 3–5)
| id | label | type | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|
| card_type | Type | dropdown: prize / news / product / housekeeping | yes | Is card {n} a prize, news, a product, or housekeeping? | | no |
| card_subject | What it's about | text | yes | In a few words — what's card {n}? | | no |
| card_cta | Button | dropdown: Enter now / Find out more / Learn more / Check my balance / none | no | What should the button say on card {n}? | I'll pick from the set. | no |
| card_url | Link | text | no | Where does card {n}'s button go? | | yes |

### EACH PRIZE CARD (repeats per card where type = prize)
| id | label | type | sub | locked | ask | not-sure line | diggable |
|---|---|---|---|---|---|---|---|
| prize_name | Prize, short | text | | yes | What's the prize, in a few words? (goes in the terms) | | no |
| prize_count | How many | text | | yes | How many prizes? | | no |
| closes | Draw closes | date | 11:59pm | yes | When does the {prize_name} draw close? | | no |
| terms_url | T&Cs link | text | | no | Where do the full terms live? | I'll ask Suze. | yes |
| extras | Extra clauses | checkboxes from LEGALS below | | no | Any of these apply? | | no |

### FIXED (never asked, never ticked)
- FirstName, One Wallet ID, Phone Dollars — merge fields
- Sign-off lines, privacy, copyright — base
- Best in Test — banner toggle, client's call per issue

### Open
- Whether hero and card images come with the dump or after. Guess: after. Images row per card needed once One NZ answers specs.
- Whether the client picks card order or the robot proposes it. Rows above assume the client's list is the order.

## LEGALS
### Facts the clauses fill from (NEEDS → facts)
Per prize card: `{prize_name}` `{prize_count}` and from `closes` the engine derives `{closes_day}` (Sunday) `{closes_date}` (6 September 2026) `{closes_time}` (the row's sub, default 11:59pm). Engine-wide: `{year}` is the current year at render.

### Standard (locked in, client never unticks)
| id | fixed | default | label | text |
|---|---|---|---|---|
| privacy | yes | | | We respect your privacy. Your details will not be given to anyone outside One New Zealand without your permission. View our Privacy Policy. Unsubscribe |
| copyright | yes | | | © {year} One New Zealand Group Limited. 30 Daldy St, Auckland Central, Auckland 1010, New Zealand. |

Order in the base: offer clauses first, then privacy, then copyright. 4px green divider above.

### Per card (fires once per prize card, fields from NEEDS below)
| id | title | text |
|---|---|---|
| draw | Prize draw clause | {prize_name} competition: One NZ customers with a My One NZ account are eligible to enter. Entry is limited to one per eligible entrant and closes {closes_day} {closes_date} at {closes_time}. Terms and conditions apply. |

Q1 had two of these, one per prize, identical shape. The prize name is the short one — "Sony Headphones", "12-month DOC Backcountry Hut Pass" — not the card title.

### Extras (square-checkbox cards)
| id | title | default | text |
|---|---|---|---|
| age_rating | Age-rating compliance | off | This film has not been rated yet. Winners must comply with all age-related admission requirements. |
| in_cinemas | Must be used while it's in cinemas | off | The prize must be used while the movie is still showing. It will not be replaced if unused in time. |
| own_expenses | Winner pays their own expenses | off | All expenses (travel, accommodation, food and beverages, other costs) unless expressly stated are at the winner's cost. |
| one_wallet | One Wallet redemption | off | One Wallet: The Phone Dollars in your One Wallet can be redeemed in-store with an eligible One NZ Pay Monthly plan. Balance can be used towards a new phone purchase with a minimum value of $199, on a 24 or 36 month interest-free term. Minimum $99 deposit required and minimum $1 monthly interest-free repayment over term. Balance savings evenly spread over the agreed interest-free term. Balance of phone cost must be repaid if you exit, transfer or trade-down your plan before the interest-free term expires. Redeeming is available to the account holder of the service (or authorised representative) and is subject to a credit check. Eligibility criteria and terms apply, see one.nz/one-wallet/ |
| satellite | Satellite TXT terms | off | One NZ Satellite TXT in minutes on eligible phones and (active Prepay) plans. TXT only and needs line of sight to sky. Terms, fair use and capacity control applies. See one.nz/satellite |

### By offer type
- **Prize card, cinema passes** — draw + age_rating + in_cinemas (from prize_draw)
- **Prize card, tickets / experience** — draw + own_expenses. Blocked on Suze (hit list 19) for the tickets wording.
- **Prize card, product** (headphones and the like) — draw only
- **Product card, refurbished phones** — nothing found in Q1. Ask Suze whether refurb needs a warranty line.
- **Housekeeping, Phone Dollars** — one_wallet, if the card asks them to spend it; nothing if it just says check your balance
- **News card** — nothing, unless it names a product (satellite → satellite clause)

### Not legals, but fixed and in the base
- **Best in Test** — "Independently tested by global leader in mobile benchmarking, umlaut, part of Accenture, in May 2025." Lives in the banner, not the base. Date is theirs to update. Ask if the banner is always on.

### Open
- Competition text points to "Terms and conditions apply" — a link. URL per draw, or one page? Needs row.
- Sign-off says One New Zealand; voice says One NZ. Fixed string — One NZ's call.
