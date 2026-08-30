# LEGALS — one_update
*Pulled from OCS03000 Q1 and the eDM guidelines examples. Client chooses, never writes. Land verbatim. Suze signs off.*

## Standard (locked in, client never unticks)
- **privacy** — We respect your privacy. Your details will not be given to anyone outside One New Zealand without your permission. View our Privacy Policy. Unsubscribe
- **copyright** — © {year} One New Zealand Group Limited. 30 Daldy St, Auckland Central, Auckland 1010, New Zealand.

Order in the base: offer clauses first, then privacy, then copyright. 4px green divider above.

## Per card (fires once per prize card, fields from needs.md)
| id | title | text |
|---|---|---|
| draw | Prize draw clause | {prize_name} competition: One NZ customers with a My One NZ account are eligible to enter. Entry is limited to one per eligible entrant and closes {closes_day} {closes_date} at {closes_time}. Terms and conditions apply. |

Q1 had two of these, one per prize, identical shape. The prize name is the short one — "Sony Headphones", "12-month DOC Backcountry Hut Pass" — not the card title.

## Extras (square-checkbox cards)
| id | title | default | text |
|---|---|---|---|
| age_rating | Age-rating compliance | off | This film has not been rated yet. Winners must comply with all age-related admission requirements. |
| in_cinemas | Must be used while it's in cinemas | off | The prize must be used while the movie is still showing. It will not be replaced if unused in time. |
| own_expenses | Winner pays their own expenses | off | All expenses (travel, accommodation, food and beverages, other costs) unless expressly stated are at the winner's cost. |
| one_wallet | One Wallet redemption | off | One Wallet: The Phone Dollars in your One Wallet can be redeemed in-store with an eligible One NZ Pay Monthly plan. Balance can be used towards a new phone purchase with a minimum value of $199, on a 24 or 36 month interest-free term. Minimum $99 deposit required and minimum $1 monthly interest-free repayment over term. Balance savings evenly spread over the agreed interest-free term. Balance of phone cost must be repaid if you exit, transfer or trade-down your plan before the interest-free term expires. Redeeming is available to the account holder of the service (or authorised representative) and is subject to a credit check. Eligibility criteria and terms apply, see one.nz/one-wallet/ |
| satellite | Satellite TXT terms | off | One NZ Satellite TXT in minutes on eligible phones and (active Prepay) plans. TXT only and needs line of sight to sky. Terms, fair use and capacity control applies. See one.nz/satellite |

## By offer type
- **Prize card, cinema passes** — draw + age_rating + in_cinemas (from prize_draw)
- **Prize card, tickets / experience** — draw + own_expenses. Blocked on Suze (hit list 19) for the tickets wording.
- **Prize card, product** (headphones and the like) — draw only
- **Product card, refurbished phones** — nothing found in Q1. Ask Suze whether refurb needs a warranty line.
- **Housekeeping, Phone Dollars** — one_wallet, if the card asks them to spend it; nothing if it just says check your balance
- **News card** — nothing, unless it names a product (satellite → satellite clause)

## Not legals, but fixed and in the base
- **Best in Test** — "Independently tested by global leader in mobile benchmarking, umlaut, part of Accenture, in May 2025." Lives in the banner, not the base. Date is theirs to update. Ask if the banner is always on.

## Open
- Competition text points to "Terms and conditions apply" — a link. URL per draw, or one page? Needs row.
- Sign-off says One New Zealand; voice says One NZ. Fixed string — One NZ's call.
