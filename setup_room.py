"""
ROBOT — THE SET UP ROOM
=======================
The drafts folder. SET UP builds a brand or a container somewhere else and
hands it back as a zip; this unpacks it, lays it out the way the reader
expects, and keeps it while it's being worked on.

WHERE THINGS LIVE, and it is the whole model in two lines:

  the volume   a DRAFT. Saves are instant, no deploy, and it is only ever
               shown to a Hunch login. Survives restarts and redeploys.
  git          what has LANDED. History, revert, and the folders ship in
               the same commit as the engine that reads them.

Clients only ever see git. Hunch sees the volume laid over the top. PUSH
moves a folder from the volume into git and clears the draft, and that —
nothing else — is what makes it live.

Drafts used to live in /tmp, which Railway wipes on every restart: twenty
minutes of editing could vanish with no warning. A volume is exactly what
work in progress is for, which is not the same as being the source.

Codes, not sentences. The words live in static/js/strings.js under
STR.setup, the same way the reader's dead-doc lines do.

    nozip       nothing arrived
    broken      not a zip, or it won't open
    fat         too many files, or one of them is silly big
    nofolders   nothing in it looks like a brand or a container

SET UP hands its two folders back separately — a brand once per client, a
container per format — so a drop is not always both. The scratch holds what
it has been given and the room says what it is still waiting for; dropping
the same folder id again replaces it. Nothing here decides whether what it
holds is enough; the reader does that, out loud.
"""

import glob
import os
import re
import shutil
import zipfile

REPO = os.path.dirname(os.path.abspath(__file__))

# The drafts live outside the repo on purpose: nothing here can be mistaken
# for something that landed. On Railway this is the volume (/data/drafts);
# locally it falls back to /tmp, where losing it costs nothing.
DRAFTS = os.environ.get("ROBOT_DRAFTS") or (
    "/data/drafts" if os.path.isdir("/data") else "/tmp/robot-drafts")

MAX_FILES = 400
MAX_ONE = 8 * 1024 * 1024          # one file, uncompressed
MAX_ALL = 40 * 1024 * 1024         # the lot, uncompressed
SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


class DropError(Exception):
    """Carries the code the front end turns into words."""


def _safe_members(zf):
    """Every entry, checked. A zip is a stranger: absolute paths, .. and
    symlinks are how one walks out of the folder it was given."""
    total = 0
    out = []
    for i in zf.infolist():
        name = i.filename
        if i.is_dir():
            continue
        if name.startswith(("/", "\\")) or ".." in name.replace("\\", "/").split("/"):
            raise DropError("broken")
        if (i.external_attr >> 16) & 0o170000 == 0o120000:      # symlink
            raise DropError("broken")
        if any(part in ("__MACOSX",) or part.startswith("._") for part in name.split("/")):
            continue
        if i.file_size > MAX_ONE:
            raise DropError("fat")
        total += i.file_size
        if total > MAX_ALL or len(out) >= MAX_FILES:
            raise DropError("fat")
        out.append(i)
    if not out:
        raise DropError("broken")
    return out


def _dirs_holding(root, *names):
    """Folders in the tree that hold all of these files. The zip can be
    shaped however SET UP zipped it — folders at the root, or a wrapper
    folder around them, or the whole repo shape. We look, rather than
    insisting."""
    found = []
    for here, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if not d.startswith((".", "__"))]
        if all(n in files for n in names):
            found.append(here)
    return sorted(found)


def root():
    """One drafts folder for the studio, not one per browser tab. A draft is
    a thing Hunch is working on; it should still be there tomorrow, and on
    the other laptop."""
    os.makedirs(os.path.join(DRAFTS, "brands"), exist_ok=True)
    os.makedirs(os.path.join(DRAFTS, "containers"), exist_ok=True)
    return DRAFTS


def held():
    """Which folders are drafts right now — (containers, brands)."""
    r = root()
    return ([os.path.basename(p) for p in sorted(glob.glob(os.path.join(r, "containers", "*")))
             if os.path.isdir(p)],
            [os.path.basename(p) for p in sorted(glob.glob(os.path.join(r, "brands", "*")))
             if os.path.isdir(p)])


def draft_dir(kind, fid, make=False):
    """A draft's folder. `make` copies it out of the repo first if it isn't
    a draft yet — copy on write, so opening something live just to look at
    it doesn't turn it into a draft. Only the first edit does that."""
    if kind not in ("brands", "containers") or not SAFE_NAME.match(fid or ""):
        return ""
    here = os.path.join(root(), kind, fid)
    if os.path.isdir(here):
        return here
    if not make:
        return ""
    landed = os.path.join(REPO, kind, fid)
    if not os.path.isdir(landed):
        return ""
    shutil.copytree(landed, here)
    for junk in glob.glob(os.path.join(here, "*.compiled.json")):
        os.remove(junk)                       # the engine's litter, not the folder's
    return here


def discard(kind, fid):
    """Throw the draft away. What landed is untouched — that is the whole
    point of the copy. The only way a draft leaves without being pushed."""
    d = draft_dir(kind, fid)
    if not d:
        raise DropError("gone")
    shutil.rmtree(d, ignore_errors=True)
    return fid


def take(stream):
    """Unpack a dropped zip and lay it out the way the reader expects:
    drafts/brands/<id> and drafts/containers/<id>. A drop is always a draft
    — it hasn't landed, by definition. Dropping the same folder id again
    replaces that one and nothing else. Returns the ids this drop carried,
    so the page can put the new cards at the top. Raises DropError."""
    if stream is None:
        raise DropError("nozip")
    r = root()
    raw = os.path.join(r, "_raw")
    shutil.rmtree(raw, ignore_errors=True)                  # this drop's unpacking only
    os.makedirs(raw, exist_ok=True)
    try:
        with zipfile.ZipFile(stream) as zf:
            for i in _safe_members(zf):
                zf.extract(i, raw)
    except DropError:
        raise
    except Exception:
        raise DropError("broken")

    cdirs = _dirs_holding(raw, "config.md", "spec.md")
    bdirs = _dirs_holding(raw, "brand.md")
    if not cdirs and not bdirs:
        raise DropError("nofolders")

    bases = os.path.join(r, "brands")
    cases = os.path.join(r, "containers")
    os.makedirs(bases, exist_ok=True)
    os.makedirs(cases, exist_ok=True)
    cids, bids = [], []
    for d in cdirs:
        cid = os.path.basename(d.rstrip("/"))
        if not SAFE_NAME.match(cid):
            continue
        shutil.copytree(d, os.path.join(cases, cid), dirs_exist_ok=True)
        cids.append(cid)
    for d in bdirs:
        bid = os.path.basename(d.rstrip("/"))
        if not SAFE_NAME.match(bid):
            continue
        shutil.copytree(d, os.path.join(bases, bid), dirs_exist_ok=True)
        bids.append(bid)
    if not cids and not bids:
        raise DropError("nofolders")
    shutil.rmtree(raw, ignore_errors=True)                  # the unpacking was scaffolding
    return cids, bids


FONT_EXT = (".woff2", ".woff", ".otf", ".ttf", ".eot")
ASSET_OK = FONT_EXT + (".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp",
                       ".pdf", ".txt", ".md")


def add_asset(bid, filename, stream):
    """Put a file in a held brand's assets/. This is how a gap gets filled:
    the check names a file brandlook.md wants and hasn't got, and you hand
    it over. Same name replaces; the folder is scratch, so nothing that
    landed can be hurt by it."""
    d = draft_dir("brands", bid, make=True)
    if not d:
        raise DropError("gone")
    name = os.path.basename(filename or "")
    if not SAFE_NAME.match(name) or not name.lower().endswith(ASSET_OK):
        raise DropError("badfile")
    assets = os.path.join(d, "assets")
    os.makedirs(assets, exist_ok=True)
    stream.save(os.path.join(assets, name))
    if os.path.getsize(os.path.join(assets, name)) > MAX_ONE:
        os.remove(os.path.join(assets, name))
        raise DropError("fat")
    return name


def drop_asset(bid, name):
    """Prune. Only from scratch, only a plain filename, and the folder is
    re-read straight after — so a file something still names comes back as
    a problem rather than as silence."""
    d = draft_dir("brands", bid, make=True)
    name = os.path.basename(name or "")
    if not d or not SAFE_NAME.match(name):
        raise DropError("gone")
    p = os.path.join(d, "assets", name)
    if not os.path.isfile(p):
        raise DropError("gone")
    os.remove(p)
    return name


def zip_out(ids=None):
    """The way out. Everything held, in the shape the reader accepts —
    brands/<id>/ and containers/<id>/ — minus the compiled caches, which are
    the engine's litter and never anybody's source. Returns a path in the
    scratch; the route hands it over and it dies with the session."""
    cids, bids = held()
    keep = set(ids or (cids + bids))
    r = root()
    out = os.path.join(r, "_download.zip")
    n = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for kind, folders in (("brands", bids), ("containers", cids)):
            for fid in folders:
                if fid not in keep:
                    continue
                base = os.path.join(r, kind, fid)
                for here, dirs, files in os.walk(base):
                    dirs[:] = [x for x in dirs if not x.startswith((".", "_"))]
                    for f in sorted(files):
                        if f.endswith(".compiled.json") or f == ".DS_Store":
                            continue
                        full = os.path.join(here, f)
                        z.write(full, f"{kind}/{fid}{full[len(base):]}")
                        n += 1
    if not n:
        raise DropError("nofolders")
    return out


def clear():
    """Throw away every draft. Blunt, and only ever asked for by name."""
    shutil.rmtree(DRAFTS, ignore_errors=True)
