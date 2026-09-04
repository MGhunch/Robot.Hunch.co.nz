/* =====================================================================
   ROBOT — THE SANDWICH
   One execution: which container, this run's id, the brief FEED IT hands
   over, the asset FIX IT hands over. This is the only file that knows every
   room exists — because starting a sandwich resets them all. The run store,
   when it comes, saves what's declared here and nothing else.
   Loads after the chrome, before the door-tiles.
   ===================================================================== */

/* CONT is the container, straight off /api/container/<id>. Everything the
   door-tiles draw — the stops, the moves, the checklist rows, the modules, the
   ghost, the artefact — comes from it. Nothing in the door-tiles knows what a
   prize is. */
let CONT=null, CID='';

/* The brief and the asset are declared in their door-tiles (feed.js, fix.js);
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

/* SET UP is a room off the burger, not a stop in the sandwich. Opening it
   ends whatever run was in progress on purpose: the container on the table
   is about to be replaced by a dropped one, and a brief written against
   the old one would be a lie waiting to happen. */
function enterSetup(){
  CONT=null; CID='';
  deetsReset(); BRIEF=null; ASSET=null; CRAFT=null; CRAFT_KEY=''; FIX_DOC=null;
  REACHED=0; unlock();
  $('door').style.display='none'; $('sandwich').classList.remove('on');
  setupInit();
}

/* into the room: fetch the container, deal the checklist, wake the quiz */
async function enterRoom(cid, tile){
  CID=cid;
  try{ CONT = await api('/api/container/'+encodeURIComponent(cid)); }
  catch(e){
    /* the line sits under the tapped tile — beside the wound */
    robotLineClear($('doorTiles'));
    if(tile) tile.insertAdjacentElement('afterend', robotLine(STR.doorway.open, {cls:'onred', stick:true}));
    else robotLineAt($('doorTiles'), STR.doorway.open, {cls:'onred', stick:true});
    return;
  }
  cardReset('plate'); cardReset('grid'); deetsReset();
  $('door').style.display='none'; $('sandwich').classList.add('on');
  REACHED=0; unlock(); go(0);
  BRIEF=null; ASSET=null;
  CRAFT=null; CRAFT_KEY=''; FIX_DOC=null;
  feedDeetsMount(); deetsInit(); deetsRender(); quizInit();
  fixTabs();
}
