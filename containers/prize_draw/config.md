# CONFIG — prize_draw
*What FEED IT asks and ticks. Manifest, the dump nudge, the three moves' dressing, the needs list, the clause library. The engine reads this; SET UP writes it.*

name:    Rewards Tickets
client:  One NZ
brand:   one_nz
format:  email
version: 1
status:  live

**Purpose:** The One NZ Rewards prize-draw email. One prize, one story, one button. A double pass to a film, a gig or a match, given away to customers by random draw. The terms assemble from the facts; the robot writes the story. Suze signs off the legals.
**Outputs:** email. (A webtile is pencilled as a second output; nothing built.)
**Reference:** Three One NZ Rewards examples, 2025–26: Practical Magic 2 double passes (plural, modelled), DOC Backcountry Hut Pass (singular, third-party fulfilled, partly modelled), Ticketmaster presale (a different genus, not modelled — see LEGALS below). None of the source files are in this folder; they were mined from the code.

## Changelog
- v1 — 30 Aug 2026 — mined from the code (terms.py, CL_CONFIG in index.html, quiz.json, prompts/containers/prize_draw/) into the v1.2 folder shape, to match one_update. Nothing rewritten, only moved. Folder keeps the id `prize_draw` because the tweak log is tagged with it. Michael + Claude.
- v2 — 30 Aug 2026 — crunched to five things: config.md (this), voice.md, spec.md, prize_draw.html, assets/. One home per fact. The engine draws the ghost from the html. Michael + Claude.
- v3 — 30 Aug 2026 — brand split out: voice and skin now live in brands/one_nz, pointed at by `brand:` above. The container keeps a VOICE LEAN in spec.md. Michael + Claude.

## FEED IT
### What a good dump looks like
Give the robot something to write about.

### What the container needs (the FEEDER reads this)
A Rewards prize-draw email. It has to say what's being given away, who can win it (One NZ customers), how to enter, and give the reader one honest reason to bother. The story of the prize matters more than the mechanics — dates, venues and values are checklist facts, not chat.

### The point (what this container is actually about)
The prize: what it is, where and when it is, and how many. Without those four
the story doesn't exist, so the robot confirms them before anything else.

### Bounce it — the dressing
*Three needs, not three questions. The robot lands them in as few turns as it
honestly takes. These are the container's words for each.*

| need | plain | placeholder | why |
|---|---|---|---|
| point | What's this all about? | 'Coldplay tickets, gold circle, our members would lose their minds...' | Your story here sets the feel of the whole email — the headline and the body grow out of how you tell it. The boring facts I'll chase at the checklist. |
| insight | What's the one thing people will love? | 'First show here in twelve years. One night. That's it.' | This is the difference between an email and a reason to enter. One honest line beats three polished ones. |
| angle | What's the angle? | 'Yep.' Or say it your way. | The angle is the one idea the whole email hangs off. I'll propose one from what you've told me — say yes, or say it better. |

### Closing line
Locked. Off to check the facts —

## NEEDS
### THE PRIZE
| id | label | type | locked | ask | not-sure line | diggable | when | after | derive |
|---|---|---|---|---|---|---|---|---|---|
| prize_type | Prize | dropdown: movie / gig / sport / other | yes | Is it movie passes, gig tickets, sports tickets, or something else? | | no | |
| prize_name | Show | text | yes | What's the show? | | no | label and ask vary by type — see below |
| tickets | Tickets | text | yes | What are they — double passes, free passes, Gold Circle tickets? | | no | | | the prize type's ticket words |
| venue | Venue | text | yes | Where is it? | I can hunt for the venue myself. | yes | prize_type in gig, sport |
| event_date | Event date | date | yes | When is it? | | yes | prize_type in gig, sport | closes |
| winners | Prizes | number | yes | How many? | | no | |

**prize_name by type:** movie → label *Film*, ask *What's the film?* · gig → *Show*, *Who's playing?* · sport → *Match*, *What's the match?* · other → *Prize name*, *What's it called?* When type is *other*, one extra ask: *What is it?*

### THE DATES
| id | label | type | sub | locked | ask | not-sure line | diggable | after | derive |
|---|---|---|---|---|---|---|---|---|---|
| opens | Draw opens | date | 12:00am | yes | When does it open? | | no | | |
| closes | Draw closes | date | 11:59pm | yes | When does it close? | | no | opens | |
| drawn | Winners drawn | date | | yes | When? | | no | closes | next working day after closes; a human date wins but can't land before closes |

Times are facts with defaults, not fixed strings — the examples disagree (12:00am, 12:00pm, 9:00am). The `after` column is the order rule.

### THE LEGALS
Square-checkbox cards from LEGALS below. Standard clauses locked in; extras ticked per prize type. Client chooses, never writes.

### FIXED (never asked, never ticked)
- From line: One NZ Rewards <rewards@one.nz>
- Button: Enter now
- Rewards footer (contact line) — LEGALS below

### Open
- Offer type above prize type — the Ticketmaster presale has no draw, no winners, no prize. Hit list 19, blocked on Suze.
- Hero image: no size confirmed with One NZ. spec.md.

## LEGALS
### Facts the clauses fill from (NEEDS below → facts)
`{prize_name}` `{prize_type}` `{winners}` (number) `{winners_word}` (one, two … ten, fifteen, twenty, fifty; else the digit) `{winner_word}` (winner / winners) `{winners_cap}` (The winner / Winners) and `[singular/plural]` brackets in any clause pick by winner count `{opens_long}` `{closes_long}` `{drawn_long}` (Monday 24 August 2026) `{opens_short}` `{closes_short}` (24 Aug) `{closes_day}` (Sunday) `{opens_time}` (default 12:00am) `{closes_time}` (default 11:59pm) `{venue}` `{event_date_long}` `{event_short}`

**Singular / plural is a switch, not a word swap.** One winner changes the grammar of four clauses (winners, contact, expenses, fulfil). `winners > 1` flips it.

**Draw date** = next working day after `closes`. Nobody draws on a Sunday. A human-set date wins, but can't land before the close.

fixed_title: Standard terms

### Base (in publish order)
| id | fixed | default | label | text |
|---|---|---|---|---|
| eligibility | yes | | Eligibility | All One New Zealand customers are eligible to enter the promotion which runs from {opens_long} at {opens_time} to {closes_long} at {closes_time}. |
| entry | yes | | Entry | To enter, click the 'Enter now' button above. There is one entry per person. |
| winners | yes | | Winners & prize | There [is/are] {winners_word} ({winners}) {winner_word} for the competition. [The prize includes / Each prize includes]: |
| prize_line | yes | | Prize line | *sub-bullet under winners — the prize-type line below* |
| draw | yes | | The draw | The prize draw will be conducted on {drawn_long} by representatives of One New Zealand by random electronic draw. |
| contact | yes | | Contacting winners | [The winner/The winners] will be contacted on {drawn_long} using the details provided as part of your My One NZ registration. If the {winner_word} cannot be reached within 48 hours, One New Zealand will have sole and absolute discretion to draw the prize again and award the prize to a new winner. |
| no_cash | yes | | No cash | The prize is not redeemable for cash, cannot be substituted with an alternative prize or sold. |
| expenses | no | off | Winner pays their own expenses | All expenses for items (including travel, accommodation, food and beverages, and any other costs) unless expressly stated will be at the cost of the {winner_word}. |
| liability | no | off | Liability exclusion | One New Zealand is not liable for any loss or damage whatsoever which is suffered, including but not limited to indirect or consequential loss, or for personal injury suffered or sustained during the course of accepting or using the prize, except for any liability which cannot be excluded by law. |
| substitution | no | off | Right to substitute the prize | The prize is subject to availability, and we reserve the right to substitute any prize with another of equivalent value without giving notice throughout the promotional period. |
| fulfil_onenz | no | on | One NZ sends the prize out | The prize will be organised by representatives of One New Zealand and will be emailed to the {winner_word} using the email provided as part of your My One NZ registration as soon as it becomes available. |
| acceptance | yes | | Acceptance | Entry into the Competition is deemed to be acceptance of these terms and conditions. |
| rewards_tcs | yes | | Rewards T&Cs | One New Zealand Rewards Terms and Conditions also apply, see https://one.nz/legal/terms-conditions/rewards-general/ |
| privacy | yes | | Privacy & unsubscribe | @brand |

The three off-by-default extras (expenses, liability, substitution) are the ones the reference examples disagree about — present in the DOC hut pass terms, absent from Practical Magic. Every tick is Suze answering a question we'd otherwise ask in a meeting.

### By prize type
The prize line hangs off `winners` as a sub-bullet. Extras slot in after a named base clause so the order stays fixed.

**movie** — Movie passes
- prize_line: One (1) double pass to see {prize_name} at any participating cinema showing this film.
- counts: double passes
- counts_one: double pass
- sentence: {winners} {tickets} to *{prize_name}*, at any participating cinema.
- needs: nothing extra

| id | after | default | label | text |
|---|---|---|---|---|
| movie_rating | winners | on | Age-rating compliance | This film has not been rated yet. {winners_cap} must comply with all age-related admission requirements. |
| movie_window | no_cash | on | Must be used while it's in cinemas | The prize must be used while the movie is still showing in cinemas, it will not be replaced if it is not used in time. |

**gig** — Gig or concert
- prize_line: One (1) double pass to {prize_name} at {venue} on {event_date_long}.
- counts: double passes
- counts_one: double pass
- sentence: {winners} {tickets} to *{prize_name}*, at {venue}.
- needs: venue, event_date

| id | after | default | label | text |
|---|---|---|---|---|
| gig_r18 | winners | on | R18 event | This event is R18. {winners_cap} must be 18 years or over and provide valid photo ID at the door. |
| gig_travel | winners | on | Travel not included | Travel, accommodation, food and beverage are not included and are the responsibility of the {winner_word}. |
| gig_cancel | no_cash | on | If it's cancelled | If the event is cancelled or postponed, One New Zealand is not obliged to provide a replacement prize. |

**sport** — Sport fixture
- prize_line: One (1) double pass to {prize_name} at {venue} on {event_date_long}.
- counts: double passes
- counts_one: double pass
- sentence: {winners} {tickets} to *{prize_name}*, at {venue}.
- needs: venue, event_date

| id | after | default | label | text |
|---|---|---|---|---|
| sport_travel | winners | on | Travel not included | Travel, accommodation, food and beverage are not included and are the responsibility of the {winner_word}. |
| sport_reschedule | no_cash | on | If the fixture moves | If the fixture is rescheduled, the prize transfers to the rescheduled date. No replacement prize is offered if the {winner_word} cannot attend. |

**other** — in the checklist, not in the clause library. The code bounces it ("We don't know the 'other' prize type yet"). Needs a prize line before it can ship.

### Footer (fixed, after the clauses)
For any queries or questions relating to Rewards, please contact us on 0800 102 902 or email us at rewards@one.nz — Monday to Friday between 9am and 6pm.

### Rendering
Bulleted, prize line indented under winners, footer as a paragraph after a blank line.

### Open
- **Offer type above prize type.** Ticketmaster / Live Nation presale: no draw, no winners, no prize. Access window, purchase cap, third-party terms. Hit list 19, blocked on Suze.
- `other` prize type has no clause line.
- DOC hut pass had nested prize sub-clauses — only partly modelled.
