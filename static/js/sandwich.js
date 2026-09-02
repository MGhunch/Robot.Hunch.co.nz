/* =====================================================================
   ROBOT — THE SANDWICH
   One execution: which container, this run's id, the brief FEED IT hands
   over, the asset FIX IT hands over. This is the only file that knows every
   room exists — because starting a sandwich resets them all. The run store,
   when it comes, saves what's declared here and nothing else.
   Loads after the chrome, before the rooms.
   ===================================================================== */

/* CONT is the container, straight off /api/container/<id>. Everything the
   rooms draw — the stops, the moves, the checklist rows, the modules, the
   ghost, the artefact — comes from it. Nothing in the rooms knows what a
   prize is. */
let CONT=null, CID='';

/* The brief and the asset are declared in their rooms (feed.js, fix.js);
   whether they agree is the sandwich's question. */
function assetFresh(v){ return !!ASSET && ASSET.brief_v===v; }
/* the brief moved on: an asset written from an older brief is stale, and
   stale copy is the drift the whole tool exists to prevent — it goes, and
   FIX IT with it. What the client sees is what they always saw. */
function briefMoved(v){
  if(ASSET && ASSET.brief_v!==v) ASSET=null;
  if(REACHED>0 && !ASSET){ REACHED=0; unlock(); }
}

/* WRITE THE WORDS goes straight to the copy room. The robot's already
   writing (armCraft fired when the facts were complete). RUN groups a
   session's tweaks in the log. */
const RUN = (crypto.randomUUID ? crypto.randomUUID()
             : Date.now()+'-'+Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi,'');

/* into the room: fetch the container, deal the checklist, wake the quiz */
async function enterRoom(cid, tile){
  CID=cid;
  try{ CONT = await api('/api/container/'+encodeURIComponent(cid)); }
  catch(e){
    /* the line sits under the tapped tile — beside the wound */
    errClear($('rooms'));
    if(tile) tile.insertAdjacentElement('afterend', errLine(STR.doorway.open, {cls:'onred', stick:true}));
    else errAt($('rooms'), STR.doorway.open, {cls:'onred', stick:true});
    return;
  }
  cardReset('plate'); cardReset('grid'); TERMS_FAILED=false;
  $('door').style.display='none'; $('room').classList.add('on');
  MENU=[]; CHOSEN=null; REACHED=0; unlock(); go(0);
  BRIEF=null; ASSET=null;
  CRAFT=null; CRAFT_KEY=''; FXDOC=null;
  clInit(); clRender(); quizInit();
  fxTabs();
}
