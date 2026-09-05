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
    dump_big:   "Wowsers, what are we writing, War and Peace? Try again with less of a dump.",
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
    /* the extras are a pick-list, and the container has always known what is
       on it. Waiting on the facts to show a list that never depended on them
       is what "finish the facts above and the legals sort themselves" was
       apologising for. */
    terms_pick: "Choose which specific terms you want.",
    terms_fail: "Can't find the legals.",
  },

  /* SET UP CHECK — Hunch only. The read lines answer the upload door's
     codes; the rest is the robot reporting what the validator found. */
  /* SET UP — Hunch only. Two jobs, one set of words. The read lines
     answer the upload door's codes; the edit lines answer the writer's. */
  /* SET UP — Hunch only. Two places: the volume holds drafts, git holds
     what landed. The read lines answer the drop door's codes; the edit
     lines answer the writer's. */
  setup: {
    /* ONE LINE, both pages. It used to be the rail step's question, which
       changed under you every time you moved — a subtitle that moves isn't
       a subtitle, it's a caption. */
    tagline: "Check the specs or fix stuff up",
    read: {
      nozip:     "Nothing landed. Try that again?",
      broken:    "That's not a zip I can open. Zip the folder and drop it in.",
      fat:       "Wowsers. That's a big one. Under 40MB, and no single file over 8.",
      nofolders: "Nothing in there looks like a brand or a container. I need a folder with brand.md, or one with config.md and spec.md.",
      gone:      "That folder isn't here any more. Drop it again?",
      hunch:     "That door's ours, not yours.",
    },
    edit: {
      failed:     "That didn't save. Nothing's changed.",
      taken:      "There's already a line with that name.",
      noline:     "Can't find that line any more — the file's moved on under me.",
      nosection:  "Can't find that heading any more.",
      norow:      "Can't find that clause any more.",
      nothex:     "A hex, six digits, with the hash. Nothing else goes in there.",
      nohexthere: "There's no colour on that line to change.",
      empty:      "Can't save it empty. Take it out of the folder if it should go.",
      badfile:    "Not a file I'll put in assets/. Fonts, images, a PDF or a text file.",
      gone:       "That folder isn't here any more. Drop it again?",
      nopush:     "Nowhere to push to yet — that's the next one. Take the download for now.",
    },
    nobrands:     "No brands yet. Drop one in.",
    nocontainers: "No containers yet. You'll need a brand first.",
    landed: ids => ids.length===1 ? ids[0]+" is in. It's a draft until you push it."
                                  : ids.join(' and ')+" are in. Drafts until you push them.",
    clean:      "Reads clean — no problems. Have a proper look: clean isn't the same as right.",
    bounced: n => n===1 ? "One problem with this folder. It's below, and it'll still draw."
                        : n+" problems with this folder. They're below, and it'll still draw.",
    rereadOk:  "Saved. Re-read clean — no problems.",
    rereadBad: n => "Saved — but the folder now has "+n+(n===1?" problem.":" problems."),
    added:  f => f+" is in assets/ now.",
    pruned: f => f+" is gone. If a line still names it, that's a problem above.",
    notyet: what => "Have a proper look at "+what+" first, then shut its padlock.",
    fixfirst: n => n===1 ? "One problem to sort before this can go anywhere."
                         : n+" problems to sort before this can go anywhere.",
    /* what the push lane can say back. Codes, like everywhere else. */
    push: {
      nopush:   "No GitHub token set, so there's nowhere to push to. Take the download instead.",
      badtoken: "GitHub won't take that token. It may have expired.",
      noperm:   "The token can't write to that repo. It wants Contents: read and write.",
      norepo:   "Can't find the repo. Check GITHUB_REPO.",
      protected:"The branch is protected, so I can't write to it directly.",
      notdraft: "Nothing to push — this one's already what's in git.",
      empty:    "There's nothing in that folder to push.",
      outside:  "Something in there wanted to write outside its own folder. Not happening.",
      github:   "GitHub said no and didn't say why. Nothing's changed.",
    },
    /* NAMING AN UPLOAD. A file in assets/ that no line names is invisible
       to the engine, so the upload asks where it goes and writes it. */
    /* THE WAITING ROOM and THE STRAYS — two lines the container room says
       when it opens, and neither refuses anything. */
    open:   n => n===1 ? "One thing parked in Open." : n+" things parked in Open.",
    strays: "Wearing a face the brand doesn't declare:",
    /* THE CHAT. Its words are short on purpose — this is a room where you
       are looking at a picture, and a paragraph in the margin is something
       else to read instead of the thing. */
    chat: {
      /* when you can SEE the change, the buttons are about keeping it —
         you've already looked. When you can't (a length, a folder that
         wouldn't render), they're about whether it's right. */
      keep:    "KEEP IT",
      back:    "PUT IT BACK",
      yes:     "THAT'S IT",
      no:      "NOT THAT",
      park:    "PARK IT",
      leave:   "LEAVE IT",
      done:    "Kept.",
      dropped: "Put back.",
      superseded: "Put the last one back — you carried on.",
      already:    "Nothing waiting on a yes.",
      parked:  "Parked in Open. It'll travel with the push.",
      undone:  "Put back.",
      beyond:  "That's beyond what I can change in here.",
      /* the structural refusal. Michael's own line: the folder's shape is
         the project's job, and this room's job is to notice and write it
         down — not to explain markup at somebody looking at a picture. */
      project: "You'll need to go back to the project to fix this.",
      robot:   "The robot didn't answer. Nothing's changed — try that again?",
      empty:   "Say what's wrong with it first.",
      gone:    "That folder isn't here any more.",
    },
    /* the beat after a lock. It says LOCKED, not SAVED: the edits saved
       themselves when you tabbed out. This is you saying you've looked. */
    lockedthe: n => "LOCKED THE "+n.toUpperCase(),
    /* a new colour line. Name and hex, because the line is both. */
    colour: { name:"Name", hex:"#000000", add:"ADD" },
    naming: {
      ask:   f => "Where does "+f+" go?",
      leave: "Leave it unnamed",
      none:  "No line in brandlook.md names this kind of file — it'll sit in assets/ for humans.",
      done:  f => f+" is named now, so the engine can reach it.",
      left:  f => f+" is in assets/, named by nothing. The engine won't see it.",
    },
    /* THE SHELVES. Every shelf gets one question: does this have to be
       filled? Yes and it isn't, that's a gap. No and it isn't, that's the
       waiting room. Never will be, and the folder says so, that's N/A —
       which earns its place because sometimes it IS needed, and that is
       the thing you are checking. */
    shelves: {
      have:'LOCKED AND LOADED', gaps:'GAPS TO FILL', waiting:'WAITING ROOM',
      na:        "Not needed — brand.md says so.",
      refuse: n => n===1 ? "Can't lock it — there's a gap to fill on this one."
                         : "Can't lock it — there are "+n+" gaps to fill on this one.",
    },
    nothingtopush: "Nothing to push — this one's already what's in git.",
    brandfirst: b => "Push the "+b+" brand first — a container can't go live pointing at a brand no client can see.",
    pushed: d => "Pushed. "+d.wrote+(d.wrote===1?" file":" files")+
      (d.removed?" in, "+d.removed+" removed":" in")+", commit "+d.sha+
      ". Railway's redeploying now — give it a minute and it's live.",
    discardsure:   "Throw this draft away? What's already live stays exactly as it is.",
    nobrandhere:   "Nothing brand-shaped in this one.",
    nodig:         "Nothing to dig for in here — this is a look, not a run.",
    stacknotface:  "Names. But no files.",
    missingfiles:  "This bounces. Add the file below, or take it out of the line.",
    specimen:      "If that isn't the face you meant, the file is wrong.",
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
