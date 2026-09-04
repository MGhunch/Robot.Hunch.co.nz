/* ROBOT SANDWICH — the strings.
   Every word the robot says when something goes wrong lives here, grouped
   by room. index.html never carries error copy inline; it asks STR for it.
   The server sends codes, not sentences — the client owns the voice.
   Grammar of every line: what didn't work, then the door. */
const STR = {

  /* the parachute — what api() says when the server sent nothing readable */
  fell: "Doh, the robot fell over. Please try again.",

  /* the door — the guess ladder walks on wrong-word status, not words */
  door: {
    empty:   "You need a magic word.",
    wrong:   ["Hmm... was that a typo?", "Not that one either?", "Are you just guessing?"],
    braked:  "Doh, give it a minute and try again.",
    checking:"Checking…",
  },

  /* the doorway */
  doorway: {
    list:  "Well, that's embarrassing, something didn't fire. Please try again.",
    open:  "That one's got a glitch. Please try again.",
  },

  /* FEED IT */
  feed: {
    feeder:     "Doh, the robot fell over. Please try again.",
    plan_empty: "Not much to go on. Throw me a bone.",
    dig_empty:  "Hang on, we need something to write with.",
    search_died:"The internet is closed. Can you cut and paste?",
    /* the dead-doc row — one line per reason the server can send */
    read: {
      format:  "I can't read that. Try Word or PDF. Or just cut and paste it in.",
      big:     "Wowsers. Can you give me a smaller file. Under 10MB.",
      scan:    "Ummm? Can't find any words in that.",
      empty:   "That bucket looks pretty empty. Try again.",
      broken:  "Something's up with the file. Can you try again?",
      glasses: "Lost my glasses on that one. Can you try again?",
      nowords: "Ummm? Can't find any words in that. Can you try again?",
      nopics:  "Sorry, I can't see pictures right now.",
      nothing: "You launched. Nothing landed. Can you try again?",
    },
  },

  /* LOCK THE DEETS */
  deets: {
    terms_wait: "We'll pull in the terms in a bit.",
    terms_fail: "Can't find the legals.",
  },

  /* SET UP CHECK — Hunch only. The read lines answer the upload door's
     codes; the rest is the robot reporting what the validator found. */
  setup: {
    read: {
      nozip:       "Nothing landed. Try that again?",
      broken:      "That's not a zip I can open. Zip the two folders and drop it in.",
      fat:         "Wowsers. That's a big one. Under 40MB, and no single file over 8.",
      nocontainer: "Can't find a container in there. I need a folder with config.md and spec.md in it.",
      hunch:       "That door's ours, not yours.",
    },
    clean:   "Reads clean — no problems. Have a look at the three of them.",
    bounced: n => n===1 ? "One problem with this folder. It's below, and it'll still draw."
                        : n+" problems with this folder. They're below, and it'll still draw.",
    several: ids => "There's more than one container in there — showing the first. The rest: "+ids.slice(1).join(', ')+".",
    notyet:  what => "Have a proper look at "+what+" first, then shut its padlock.",
  },

  /* FIX IT */
  fix: {
    tweak_fail:  "That wasn't seamless. Please try again.",
    tweak_blank: "I'm not sure here. Got any ideas?",
    flag:        "Careful — ",
    locked:      "That's locked in the brief. Signed off already.",
    terms_fail:  "Can't find the legals.",
  },

  /* FILE IT */
  file: {
    wrap: "Well, that's embarrassing, something didn't fire. Please try again.",
  },

  /* the cards — a whole pane failed to arrive */
  card: {
    plate: { head: "That's awkward",        line: "Well that didn't do what it should.", go: "TRY AGAIN" },
    grid:  { head: "Tripped over my feet",  line: "Ouch. Please try again.",             go: "TRY AGAIN" },
    stop:  { head: "Something's gone bung", line: "I've emailed the tech squad. Try again in a bit. Sorry.", go: "SEND A ROCKET" },
  },
};
