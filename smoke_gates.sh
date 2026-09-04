#!/bin/sh
# smoke_gates.sh — church and state, enforced.
# A room may call the chrome; the chrome never names a room's element or
# reads a room's state. A room never names another room's element or reads
# another room's state. sandwich.js is the one file allowed to know every
# room exists. Comments are stripped before matching, so prose is free.
# Exit 0 = every gate clean.
cd "$(dirname "$0")/static/js" || exit 2
python3 - <<'PY'
import re, sys
ROOM_STATE = {
  'feed':   r"\b(BOUNCE_[A-Z]+|QUIZ|FEED_[A-Z]+|SEARCH_[A-Z]+|STOP_OPEN|CRAFT(_KEY)?)\b|storyData\(|val\('",
  'fix':    r"\b(FIX_[A-Z_]+)\b",
  'file':   r"\b(FILE_[A-Z]+)\b",
  # the handovers: BRIEF (FEED IT's) and ASSET (FIX IT's) may be read by the rooms downstream, never by the chrome or the door
  'handover': r"\b(BRIEF|ASSET)\b",
  'door':   r"\b(DOOR_TILES|DOOR_MISSES|HUNCH)\b",
  # the checklist is a renderer two rooms share, so its state is its own: a
  # room asks through deetsChosen/deetsTerms/deetsFacts, never by reaching in
  'deets':  r"\b(DEETS_[A-Z_]+|TERMS_(MENU|CHOSEN|BUSY|FAILED)|PEEKED|PEEKLOG)\b|formData\(",
}
def state_of(*rooms): return "|".join(ROOM_STATE[r] for r in rooms)
rooms={
 'chrome.js': dict(ids=r"\$\('(fix|feed|file|door|deets|setup|search|story|blurb)", state=state_of('feed','fix','file','door','handover','deets')+r"|\b(CONT|CID|RUN)\b"),
 'deets.js':  dict(ids=r"\$\('(fix|feed|file|door|setup|search|story|blurb)",  state=state_of('feed','fix','file','door','handover')),
 'door.js':   dict(ids=r"\$\('(fix|feed|file|deets|setup|search|story|blurb)", state=state_of('feed','fix','file','handover','deets')),
 'feed.js':   dict(ids=r"\$\('(fix|file|setup|door[A-Z])",                      state=state_of('fix','file','door','deets')),
 'fix.js':    dict(ids=r"\$\('(feed|file|deets|setup|search|story|blurb)",     state=state_of('feed','file','door','deets')),
 'file.js':   dict(ids=r"\$\('(feed|fix|deets|setup|search|door|story|blurb)", state=state_of('feed','fix','door','deets')),
 'setup.js':  dict(ids=r"\$\('(feed|fix|file|door[A-Z]|deetsD|search|story|blurb)", state=state_of('feed','fix','file','door','handover','deets')),
}
ok=True
for f,g in rooms.items():
    s=open(f).read(); code=re.sub(r"/\*.*?\*/","",s,flags=re.S); code=re.sub(r"//[^\n]*","",code)
    ids=[m.group() for m in re.finditer(g['ids'],code)]; st=sorted(set(m.group() for m in re.finditer(g['state'],code)))
    print(f"{f:12} ids: {ids or 'clean'}   state: {st or 'clean'}"); ok=ok and not ids and not st
print('GATES', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
PY
