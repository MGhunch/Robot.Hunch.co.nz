"""
SET UP's chat lane, end to end without a model.

The robot's own call needs an API key that lives in Railway, so what is
checked here is everything either side of it: the stand-in copy, the
waiting room, the font gate, and apply -> undo -> park through the real
routes with a hand-written proposal standing in for the robot's.

Run it: python3 test_setup_chat.py
"""

import json
import os
import shutil
import sys
import tempfile

os.environ.setdefault("ROBOT_WORDS", "taniwha:Michael")

# a throwaway copy of the repo's folders, so a test never edits the real ones
TMP = tempfile.mkdtemp()
for name in ("brands", "containers"):
    shutil.copytree(name, os.path.join(TMP, name))
for root, _, files in os.walk(TMP):
    for f in files:
        if f.endswith(".compiled.json"):
            os.remove(os.path.join(root, f))
os.environ["ROBOT_BRANDS"] = os.path.join(TMP, "brands")
os.environ["ROBOT_CONTAINERS"] = os.path.join(TMP, "containers")
os.environ["ROBOT_DRAFTS"] = os.path.join(TMP, "drafts")

import app as A                                            # noqa: E402
import containers as CT                                    # noqa: E402
import setup_chat                                          # noqa: E402
import setup_room                                          # noqa: E402

setup_room.DRAFTS = os.path.join(TMP, "drafts")

fails = []


def ok(label, got, want=None):
    good = (got == want) if want is not None else bool(got)
    print(("  ok  " if good else "FAIL  ") + label + " -> " + repr(got))
    if not good:
        fails.append(label)


cl = A.app.test_client()
with cl.session_transaction() as s:
    s["hunch"] = True
    s["email"] = "word:michael"
    s["name"] = "Michael"

print("\nTHE STAND-IN")
d = cl.get("/api/setup/open/containers/prize_draw").get_json()
si = d["standIn"]
ok("subject is latin", si["subject"]["kind"], "latin")
ok("subject respects 45 chars", len(si["subject"]["texts"][0]) <= 45, True)
ok("subject has three variants", len(si["subject"]["texts"]), 3)
ok("hero is an image", si["hero"]["kind"], "image")
ok("button is the real words", si["button"]["texts"][0], "Enter now")
ok("terms pulled from config", si["terms"]["texts"][0].startswith("All One New Zealand"), True)
ok("deets seeded", len(d["standInDeets"]["rows"]) > 4, True)

print("\nTHE STRAYS — the check that has never existed")
ok("prize_draw wears an undeclared face", [x["strays"] for x in d["strays"]],
   [["Bebas Neue", "Arial Narrow"]])
ok("and it is not a problem", d["problems"], [])
ok("one_update is clean",
   cl.get("/api/setup/open/containers/one_update").get_json()["strays"], [])

print("\nTHE FONT GATE")
b = CT.brands()["one_nz"]
folder = os.path.join(TMP, "containers", "prize_draw")
imported = setup_chat.check("container.html",
                            {"op": "css", "selector": "h1", "prop": "font-family",
                             "value": "'Comic Sans MS',sans-serif", "say": "x"}, folder, b)
ok("importing a face is refused", imported["park"], True)
ok("and says why", imported.get("gate"), "font")
rearranged = setup_chat.check("container.html",
                              {"op": "css", "selector": "h1", "prop": "font-family",
                               "value": "Euclid Circular A, Arial", "say": "x"}, folder, b)
ok("rearranging inside the brand is allowed", rearranged["park"], False)
size = setup_chat.check("container.html",
                        {"op": "css", "selector": "h1", "prop": "font-size",
                         "value": "27px", "say": "Down to 27."}, folder, b)
ok("the container's own proportions are fair game", size["park"], False)
ok("before is read off the disk", size["before"], "31px")
missing = setup_chat.check("container.html",
                           {"op": "css", "selector": "h1", "prop": "border-top",
                            "value": "1px solid red", "say": "x"}, folder, b)
ok("adding a declaration is parked, not invented", missing["park"], True)
ok("an op the file doesn't own is parked",
   setup_chat.check("container.html", {"op": "section", "heading": "RULES", "body": "x"},
                    folder, b)["park"], True)

print("\nAPPLY, THEN UNDO")
r = cl.post("/api/setup/apply", json={"id": "prize_draw", "proposal": size})
d = r.get_json()
ok("applied", r.status_code, 200)
ok("it became a draft", d["state"], "draft")
ok("undo is one deep", d["undo"], 1)
draft = setup_room.draft_dir("containers", "prize_draw")
ok("the html actually changed", "font-size:27px" in open(os.path.join(draft, "container.html")).read(), True)
ok("the changelog says so", "27px" in open(os.path.join(draft, "config.md")).read(), True)
ok("and it still reads clean", d["problems"], [])

d = cl.post("/api/setup/undo", json={"id": "prize_draw"}).get_json()
ok("undone", "font-size:31px" in open(os.path.join(draft, "container.html")).read(), True)
ok("changelog line went with it",
   "27px" not in open(os.path.join(draft, "config.md")).read(), True)
ok("stack is empty", d["undo"], 0)
ok("nothing left to undo", cl.post("/api/setup/undo", json={"id": "prize_draw"}).status_code, 400)

print("\nHANG ON A SEC")
line = "Bebas in the headline is deliberate — email needs it. Where does that get declared?"
d = cl.post("/api/setup/park", json={"id": "prize_draw", "line": line}).get_json()
ok("parked in Open", d["open"], [line])
ok("still reads clean", d["problems"], [])
cl.post("/api/setup/park", json={"id": "prize_draw", "line": line})
ok("and never twice", len(cl.get("/api/setup/open/containers/prize_draw").get_json()["open"]), 1)

print("\nTHE SURGICAL RULE")
before = open(os.path.join("containers", "prize_draw", "container.html")).read()
after = open(os.path.join(draft, "container.html")).read()
changed = sum(1 for a, b in zip(before.split("\n"), after.split("\n")) if a != b)
ok("one edit, then undone, left the html as it was", changed, 0)

shutil.rmtree(TMP, ignore_errors=True)
print("\n" + ("SETUP CHAT PASS" if not fails else "SETUP CHAT FAIL: " + ", ".join(fails)))
sys.exit(1 if fails else 0)
