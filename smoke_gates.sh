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
rooms={
 'chrome.js':   dict(ids=r"\$\('(fx|fd|fi|si|cl|sr|dz)", state=r"\b(BRIEF|ASSET|CONT|CID|RUN|FACTS|COPY|MENU|CHOSEN|CLS|QTURNS|FD_DOCS|SR_[A-Z]+|FX[A-Z]+)\b"),
 'door.js':     dict(ids=r"\$\('(fd|fx|fi|cl|sr|dz|story|blurb)", state=r"\b(CLS|CLR|MENU|CHOSEN|QTURNS|QBRIEF|FD_DOCS|SR_[A-Z]+|BRIEF|ASSET|COPY|FX[A-Z]+|CRAFT)\b"),
 'feed.js':     dict(ids=r"\$\('(fx|fi|si)", state=r"\b(ASSET|COPY|CTX|FX(ORDER|LOCK|LIST|FLAGS|DOC|FOCUS|THREAD|HL|DIFF)|PICK|TWEAKS|HIST|FI_[A-Z]+|TILES|HUNCH)\b"),
 'fix.js':      dict(ids=r"\$\('(fd|fi|cl|sr|dz|si|story|blurb)", state=r"formData\(|storyData\(|val\('|\b(CLS|CLR|MENU|CHOSEN|QTURNS|QBRIEF|FD_DOCS|SR_[A-Z]+|TERMS_(BUSY|FAILED)|CRAFT|FI_[A-Z]+|TILES|HUNCH)\b"),
 'file.js':     dict(ids=r"\$\('(fd|fx|cl|sr|dz|si|story|blurb)", state=r"formData\(|storyData\(|val\('|\b(CLS|CLR|MENU|CHOSEN|QTURNS|QBRIEF|FD_DOCS|SR_[A-Z]+|TERMS_(BUSY|FAILED)|CRAFT|FX(ORDER|LOCK|LIST|FLAGS|DOC|FOCUS|THREAD|HL|DIFF)|COPY|PICK|TWEAKS|TILES|HUNCH)\b"),
}
ok=True
for f,g in rooms.items():
    s=open(f).read(); code=re.sub(r"/\*.*?\*/","",s,flags=re.S); code=re.sub(r"//[^\n]*","",code)
    ids=[m.group() for m in re.finditer(g['ids'],code)]; st=sorted(set(m.group() for m in re.finditer(g['state'],code)))
    print(f"{f:12} ids: {ids or 'clean'}   state: {st or 'clean'}"); ok=ok and not ids and not st
print('GATES', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
PY
