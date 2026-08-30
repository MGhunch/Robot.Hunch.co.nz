# NEEDS — prize_draw
*The checklist. BOUNCE IT reads the asks off here and compares with the dump. Only what gets ticked lives here — the promoter's blurb stays in the dump and the WRITER reads it straight.*

## A good dump for this format
The promoter's blurb, the venue and the dates. If it's a film, the title is enough. If it's a gig or a match, the robot needs where and when.

## THE PRIZE
| id | label | type | locked | ask | not-sure line | diggable | when |
|---|---|---|---|---|---|---|---|
| prize_type | Prize | dropdown: movie / gig / sport / other | yes | Is it movie passes, gig tickets, sports tickets, or something else? | | no | |
| prize_name | Show | text | yes | What's the show? | | no | label and ask vary by type — see below |
| venue | Venue | text | yes | Where is it? | I can hunt for the venue myself. | yes | prize_type in gig, sport |
| event_date | Event date | date | yes | When is it? | | yes | prize_type in gig, sport |
| winners | Prizes | number | yes | How many? | | no | |

**prize_name by type:** movie → label *Film*, ask *What's the film?* · gig → *Show*, *Who's playing?* · sport → *Match*, *What's the match?* · other → *Prize name*, *What's it called?* When type is *other*, one extra ask: *What is it?*

## THE DATES
| id | label | type | sub | locked | ask | not-sure line | diggable | derive |
|---|---|---|---|---|---|---|---|---|
| opens | Draw opens | date | 12:00am | yes | When does it open? | | no | |
| closes | Draw closes | date | 11:59pm | yes | When does it close? | | no | |
| drawn | Winners drawn | date | | yes | When? | | no | next working day after closes; a human date wins but can't land before closes |

Times are facts with defaults, not fixed strings — the examples disagree (12:00am, 12:00pm, 9:00am). `event_date` can't fall before `closes`. `closes` can't fall before `opens`.

## THE LEGALS
Square-checkbox cards from legals.md. Standard clauses locked in; extras ticked per prize type. Client chooses, never writes.

## FIXED (never asked, never ticked)
- From line: One NZ Rewards <rewards@one.nz>
- Button: Enter now
- Rewards footer (contact line) — legals.md

## Open
- Offer type above prize type — the Ticketmaster presale has no draw, no winners, no prize. Hit list 19, blocked on Suze.
- Hero image: no size confirmed with One NZ. images.md.
