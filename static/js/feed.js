/* =====================================================================
   ROBOT — FEED IT
   The concertina: DUMP YOUR DOCS (docs, words, the search door), BOUNCE
   IDEAS (the FEEDER), LOCK THE DEETS (the checklist, the padlocks, the
   terms). Builds the brief; WRITE THE WORDS signs it and hands over.
   Reads CONT and CID; writes BRIEF. Never reads ASSET.
   ===================================================================== */

const val = id => ($(id) ? $(id).value : '');


/* LOCK THE DEETS is the checklist, mounted. deets.js draws the card; this
   is what FEED IT does when the card speaks: a value moved makes the brief
   dirty, a shut section arms the craft, a refused lock is a line from the
   robot at stop 2, and a diggable row sends the dig to the dump's search
   door — stop 3 to stop 1, deliberately. */
function feedDeetsMount(){
  deetsMount($('deetsCards'), {
    changed:  ()=>dirty(),
    armed:    ()=>deetsArm(),
    refused:  line=>feedSay(2, line),
    rendered: ()=>{ $('deetsDoor').classList.toggle('live', deetsAllLocked()); feedStages(); },
    dig:      r=>{ acc(0); feedDoor('search');
                   const f=$('searchField'); if(f){ f.value=r.label||''; feedDumpDraw(); f.focus(); } },
  });
}

/* ---------------- story -> detail ---------------- */
const storyData = () => ({point:val('storyPoint'), insight:val('storyInsight'), angle:val('storyAngle'), source:val('blurb')});

/* ================= THE BRIEF =================
   What FEED IT hands over, in FEED IT's own words:
     SOURCE  — the dump, one string. Robot gets everything.
     SORTED  — what the bounce landed: point, insight, angle, the steer.
               Robot learns priorities. (The transcript stays here — noise.)
     DETAILS — the defaults and what the human decided: the facts and the
               specific terms ticked. Robot gets locked detail. (The derived
               terms don't travel — they're engine output, derived on demand.)
   `v` is a hash of the content, so it's a version that can't be wrong: any
   change in FEED IT changes it. WRITE THE WORDS is the signature — press
   it and the brief is agreed and off it goes. Before that it's a draft,
   and the background craft writes from a draft tagged with its `v`.
   FIX IT and FILE IT read BRIEF and nothing else of FEED IT's. */
let BRIEF=null;
const briefHash = s => { let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); };
function briefBuild(){
  const st=storyData();
  const b={ container:CID, v:'', signed:false,
    source:  st.source,
    sorted:  { point:st.point, insight:st.insight, angle:st.angle, steer:BOUNCE_STEER||null },
    details: { facts:deetsFacts(), chosen:deetsChosen() } };
  b.v=briefHash(JSON.stringify([b.container, b.source, b.sorted, b.details]));
  return b;
}
function briefSign(){ BRIEF=briefBuild(); BRIEF.signed=true; return BRIEF; }
/* The wire hasn't moved: /api/copy, /api/tweak and /api/wrap still take
   form, story and source. This fills them from a brief. */
const briefWire = b => ({ container:b.container, form:b.details.facts,
  story:{point:b.sorted.point, insight:b.sorted.insight, angle:b.sorted.angle, source:b.source},
  source:b.source });

function subView(v){
  /* 'story' and 'detail' are both the concertina now — detail just
     means stop 3 open. 'pics' is still its own page. */
  if(v==='detail') acc(2);
  window.scrollTo({top:0,behavior:'smooth'});
}
function backToStory(){ subView('story'); }

/* ================= FEED IT — the concertina =================
   Three stops, one open at a time. The stops and the three NEEDS come from
   the container (/api/quiz); the FEEDER runs the bounce live (/api/feeder),
   and the container's plain line is the silent fallback.

   The bounce is not a script. The robot lands the point, the insight and
   the angle in as few turns as it honestly takes, and it ends when the
   human says nothing's missing — not when a counter says three. BOUNCE_TURNS is
   the whole record of it and the only state the server needs back. What
   lands is BOUNCE_STEER: the steer the WRITER writes from. */
let QUIZ=null, BOUNCE_TURNS=[], BOUNCE_STEER=null, BOUNCE_ANGLE='', BOUNCE_NEED='point', BOUNCE_LAST='';
const FEED_SLOT={point:'storyPoint', insight:'storyInsight', angle:'storyAngle'};
let STOP_OPEN=0;                                // which stop is open

/* The concertina: one open, the rest closed, and all three reachable from
   the off. Wander in any order — the gate is the door, not the navigation.
   A stop is 'done' when it actually holds something, never because you
   happen to be standing past it. */
function feedDone(j){
  if(j===0) return !!feedDumpText().trim();
  if(j===1) return !!BOUNCE_STEER && !!String(BOUNCE_STEER.angle||'').trim();
  if(j===2) return deetsAllLocked();
  return false;
}
function feedStages(){
  document.querySelectorAll('.feed-stage').forEach((st,j)=>{
    st.className='feed-stage '+(j===STOP_OPEN?'on':feedDone(j)?'done':'todo');
  });
}
function acc(i){
  STOP_OPEN=i; feedStages();
  if(i===2){ deetsRender(); armDetail(); }
}
/* the heads toggle: clicking the open stop shuts it, and STOP_OPEN=-1 means
   all three are closed. acc() stays imperative — accReach() uses it to
   move you forward, and must never close a stop it was sent to open. */
function accToggle(i){ acc(STOP_OPEN===i ? -1 : i); }
function accReach(i){ acc(i); if(i!==1) feedThink(false); }

/* The robot, saying one short thing in the stop you've just been sent to.
   Its own words, so they live here in the engine, never in config.md. */
const FEED_SHORT=[
  [0, 'Nothing to write about yet.'],
  [1, "Let's quickly bounce it first."],
  [2, 'Just need to lock the deets.'],
];

function feedShort(){ return FEED_SHORT.find(([j])=>!feedDone(j)) || null; }
function feedSay(j,line,stick){
  const st=document.querySelectorAll('.feed-stage')[j]; if(!st) return;
  const bod=st.querySelector('.feed-bod'); if(!bod) return;
  const old=$('feedSaid'); if(old){ clearTimeout(old._t); old.remove(); }
  const el=robotLine(line,{stick:!!stick}); el.id='feedSaid';
  bod.insertBefore(el, bod.firstChild);
}

async function quizInit(){
  if(!CONT) return;
  QUIZ = CONT.quiz; BOUNCE_TURNS=[]; BOUNCE_STEER=null; BOUNCE_ANGLE=''; BOUNCE_NEED='point'; STOP_OPEN=0;
  feedBoxClear();
  $('feedChat').innerHTML=''; acc(0);
  if(QUIZ.tagline) $('feedTagline').textContent = QUIZ.tagline;
  (QUIZ.stops||[]).forEach((st,i)=>{
    const t=$('feedT'+i), su=$('feedS'+i);
    if(t) t.textContent=st.title||''; if(su) su.textContent=st.sub||'';
  });
  const pad=(QUIZ.stops&&QUIZ.stops[0]&&QUIZ.stops[0].pad)||{};
  $('feedBrowse').textContent  = pad.browse||'Browse';
  FEED_LINE = pad.line||'or drag it in.';
  $('feedDump').placeholder    = pad.paste||'Cut and paste anything.';
  DUMPDOOR='docs'; FEED_DOCS=[]; feedDocsDraw();
  $('feedDump').placeholder    = pad.paste||'Or paste it in here.';
  feedGhostDraw();
  feedToolsDraw();
}

/* the ghost is the chrome's drawing now (GHOST) — FEED IT just says where
   it goes and which container it's of. */
function feedGhostDraw(){ GHOST($('feedGhost'), CONT.ghost, CONT.modules, CONT.checklist); }

/* the chat's only tool: the why-beat. The magnifying glass that used to sit
   beside it is gone on purpose. Digging is phase 1's job (the SEARCH door)
   and phase 3's (a row's 'let it dig'). The bounce enriches by finding gaps
   in what it has, not by going to the web — the angle comes from the person
   who knows the business. */
function feedToolsDraw(){
  const b=[];
  b.push(`<button class="feed-tool" title="Why this question?" onclick="feedWhy()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 9.2a3 3 0 1 1 3.6 3.1c-.8.2-1.1.8-1.1 1.7"/><circle cx="11.5" cy="17.6" r=".4" fill="currentColor"/></svg></button>`);
  $('feedTools').innerHTML=b.join('');
}

/* ---------- STOP 1: the landing pad ---------- */
/* The browser reads plain text itself. Everything else goes to /api/read,
   which turns Word, PDF and pictures into words server-side — so the dump
   stays a string and the FEEDER never learns about file formats. */
const FEED_TEXT = f => /\.(txt|md|csv|markdown|log|json)$/i.test(f.name) || (f.type||'').startsWith('text/');
let FEED_LINE='or drag it in.';
let FEED_DOCS=[];                            // {name, text} — what's been dropped
async function feedTake(files){
  const pending=[];
  for(const f of files){
    if(FEED_TEXT(f)){
      const t=await f.text();
      FEED_DOCS.push({name:f.name, text:t.slice(0,12000)});
    }else{
      const d={name:f.name, text:'', wait:true};
      FEED_DOCS.push(d); pending.push([d,f]);
    }
  }
  feedDocsDraw();
  /* each on its own, so one unreadable file doesn't sink the others */
  await Promise.all(pending.map(async ([d,f])=>{
    try{
      const fd=new FormData(); fd.append('file', f, f.name);
      const r=await fetch('/api/read',{method:'POST',body:fd});
      const j=await r.json().catch(()=>null);
      if(j&&j.success&&j.text){ d.text=j.text; }
      /* the server sends a reason code; the words are ours */
      else { d.bad=true; d.why=STR.feed.read[(j&&j.reason)||'broken'] || STR.feed.read.broken; }
    }catch(e){ d.bad=true; d.why=STR.feed.read.nothing; }
    d.wait=false; feedDocsDraw();
  }));
}
function feedDocsDraw(){
  $('feedDocs').innerHTML = FEED_DOCS.map((d,i)=>
    `<div class="dump-row${d.bad?' bad':''}${d.wait?' wait':''}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
       <span class="dump-name">${esc(d.name)}</span>
       <button class="dump-x" onclick="feedDocDrop(${i});event.stopPropagation()" aria-label="Remove">&times;</button>
       <span class="dump-tick" aria-label="${d.wait?'Reading':d.bad?'Not read':'Read'}">${d.wait?'':TICK}</span>
     </div>`).join('')
    /* one line under the row for the first doc that didn't read — it
       asks for something, so it stays until the doc is dropped or replaced */
    + '';
  const bad=FEED_DOCS.find(d=>d.bad);
  if(bad){ const w=document.createElement('div'); w.className='dump-bad'; w.appendChild(robotLine(bad.why,{stick:true})); $('feedDocs').appendChild(w); }
  feedDumpDraw();
}
function feedDocDrop(i){ FEED_DOCS.splice(i,1); feedDocsDraw(); feedStages(); }

/* ---- the three doors ----------------------------------------------------
   DOCS and WORDS open the box. SEARCH is hollow until the engine's web tool
   lands (hit list 9) — tapping it says so and leaves the open door alone. */
let DUMPDOOR='docs';
function feedDoor(d){
  DUMPDOOR=d; feedDumpDraw();
  if(d==='words') setTimeout(()=>{ const t=$('feedDump'); if(t) t.focus(); },0);
  if(d==='search') setTimeout(()=>{ const f=$('searchField'); if(f&&SEARCH_STAGE!=='looking') f.focus(); },0);
}
/* ---- SEARCH ------------------------------------------------------------
   ask -> plan -> looking -> hits, one grammar throughout: tick what we dig
   for, tick what's handy. Queries arrive UNTICKED — opt in, so nothing
   runs and nothing is spent that wasn't chosen. The field never leaves the
   screen: at any stage but looking, retype and hit the arrow for a fresh
   plan — that IS the way back. Everything landed lives in SEARCH_FACTS, which
   is dump like any other dump; ticked facts ride across searches via
   SEARCH_KEPT. Barred facts (prices) are filtered server-side and simply not
   shown — we don't perform the rules. */
let SEARCH_STAGE='ask', SEARCH_QS=[], SEARCH_HITS=[], SEARCH_FACTS=[], SEARCH_KEPT=[], SEARCH_DOING=-1;

function searchDraw(){
  const ask=$('searchAsk'); if(!ask) return;
  const f=$('searchField'), go=$('searchGo');
  ask.className='search-ask on';
  if(f) f.disabled = SEARCH_STAGE==='looking';
  if(go) go.disabled = SEARCH_STAGE==='looking' || !(f&&f.value.trim());
  $('searchHead').className='search-head'+(SEARCH_STAGE==='looking'?' on':'');
  if(SEARCH_STAGE==='looking'&&!$('searchHead').innerHTML) $('searchHead').innerHTML=thinkFace();
  if(SEARCH_STAGE!=='looking') $('searchHead').innerHTML='';

  /* the subheads: a question over the plan, an instruction over the
     catch. Bebas in ink — a section signal, not a second title. */
  const sub=$('searchSub');
  sub.className='search-sub'+(SEARCH_STAGE==='plan'||SEARCH_STAGE==='hits'?' on':'');
  sub.textContent = SEARCH_STAGE==='plan' ? 'What shall we dig for?'
                  : SEARCH_STAGE==='hits' ? "Tick what's handy" : '';

  const list=$('searchList');
  list.className='search-list'+(SEARCH_STAGE==='plan'||SEARCH_STAGE==='looking'?' on':'');
  if(SEARCH_STAGE==='plan'){
    /* opt-in: same tick furniture as the hits, so screen one teaches
       screen two. Nothing runs that wasn't chosen. */
    list.innerHTML=SEARCH_QS.map((x,i)=>
      `<div class="search-hit${x.on?' on':''}" role="button" tabindex="0" onclick="searchQTick(${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();searchQTick(${i});}">
         <span class="search-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span><span class="search-fact">${esc(x.q)}</span></span>
       </div>`).join('');
  } else if(SEARCH_STAGE==='looking'){
    const run=SEARCH_QS.filter(x=>x.on);
    list.innerHTML=run.map((x,i)=>{
      const st = i<SEARCH_DOING?'done':i===SEARCH_DOING?'doing':'';
      const ico = st==='done'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>';
      return `<div class="search-line ${st}">${ico}${esc(x.q)}</div>`;
    }).join('');
  } else list.innerHTML='';

  /* GO DIGGING lives in the flow it commits, centred, and sits hollow
     until at least one search is ticked — the button teaches the rule. */
  const dig=$('searchDig');
  if(dig){
    dig.style.display = SEARCH_STAGE==='plan' ? '' : 'none';
    dig.classList.toggle('dormant', !SEARCH_QS.some(x=>x.on));
  }

  const hits=$('searchHits');
  hits.className='search-hits'+(SEARCH_STAGE==='hits'?' on':'');
  if(SEARCH_STAGE==='hits'){
    /* a div, not a button: the source is a real link now, and a link
       can't legally live inside a button. Keyboard keeps its tick. */
    hits.innerHTML = SEARCH_HITS.map((x,i)=>
      `<div class="search-hit${x.on?' on':''}" role="button" tabindex="0" onclick="searchTick(${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();searchTick(${i});}">
         <span class="search-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span><span class="search-fact">${esc(x.fact)}</span>${searchSrc(x)}</span>
       </div>`).join('');
  } else hits.innerHTML='';
}

function searchQTick(i){ SEARCH_QS[i].on=!SEARCH_QS[i].on; searchDraw(); }

/* the source line is the receipt — click it to read the page it came
   from, in a new tab. stopPropagation so checking never ticks. */
function searchSrc(x){
  return x.url
    ? `<a class="search-src" href="${esc(x.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(x.source)}</a>`
    : `<span class="search-src">${esc(x.source)}</span>`;
}

async function searchPlan(){
  if(SEARCH_STAGE==='looking') return;
  const f=$('searchField'), q=(f?f.value:'').trim(); if(!q) return;
  const go=$('searchGo');
  if(go){ go.disabled=true; go.classList.add('spin'); }
  try{
    const d=await api('/api/search',{container:CID, stage:'plan', subject:q});
    if(!(d.queries||[]).length){ feedSay(0, STR.feed.plan_empty); }
    else{
      /* anything already ticked rides along to the next round */
      SEARCH_HITS.filter(x=>x.on).forEach(({fact,source,url})=>{
        if(!SEARCH_KEPT.some(k=>k.fact===fact)) SEARCH_KEPT.push({fact,source,url});
      });
      SEARCH_QS=d.queries.map(q=>({q, on:false})); SEARCH_HITS=[]; SEARCH_STAGE='plan';
    }
  }catch(e){ feedSay(0, e.code==='noplan' ? STR.feed.plan_empty : STR.feed.search_died, e.code!=='noplan'); }
  if(go) go.classList.remove('spin');
  feedDumpDraw();
}

async function searchRun(){
  const run=SEARCH_QS.filter(x=>x.on).map(x=>x.q);
  if(!run.length) return;
  SEARCH_STAGE='looking'; SEARCH_DOING=0; feedDumpDraw();
  /* the rows tick along on their own clock — the API doesn't report which
     search it's on, so this is honest about pace, not about position. */
  const tick=setInterval(()=>{ if(SEARCH_DOING<run.length-1){ SEARCH_DOING++; searchDraw(); } }, 2600);
  try{
    const d=await api('/api/search',{container:CID, stage:'run',
      subject:($('searchField').value||'').trim(), queries:run});
    /* kept facts land first, still ticked, so they can be unticked here.
       Barred facts never render — the server filters, we don't perform. */
    const kept=SEARCH_KEPT.map(x=>Object.assign({on:true},x));
    const fresh=(d.facts||[]).filter(x=>!SEARCH_KEPT.some(k=>k.fact===x.fact))
      .map(x=>Object.assign({on:false},x));
    SEARCH_HITS=kept.concat(fresh); SEARCH_KEPT=[];
    SEARCH_FACTS=SEARCH_HITS.filter(x=>x.on).map(({fact,source,url})=>({fact,source,url}));
    SEARCH_STAGE='hits';
    if(!SEARCH_HITS.length) feedSay(0, STR.feed.dig_empty);
  }catch(e){ feedSay(0, STR.feed.search_died, true); SEARCH_STAGE='plan'; }
  clearInterval(tick); SEARCH_DOING=-1; feedDumpDraw();
}

function searchTick(i){
  SEARCH_HITS[i].on=!SEARCH_HITS[i].on;
  SEARCH_FACTS=SEARCH_HITS.filter(x=>x.on).map(({fact,source,url})=>({fact,source,url}));
  feedDumpDraw(); feedStages();
}

function feedDumpDraw(){
  const docs=FEED_DOCS.length>0, words=!!($('feedDump')||{}).value.trim();
  const set=(id,on,has)=>{ const el=$(id); if(!el) return;
    el.className='dump-door'+(on?' on':has?' has':''); };
  set('feedDoorDocs',   DUMPDOOR==='docs',  docs);
  set('feedDoorWords',  DUMPDOOR==='words', words);
  set('feedDoorSearch', DUMPDOOR==='search', SEARCH_FACTS.length>0);
  const vd=$('feedViewDocs'), vw=$('feedViewWords'), vs=$('feedViewSearch');
  if(vd) vd.className='dump-view'+(DUMPDOOR==='docs' ?' on':'')+(docs?' filled':'');
  if(vw) vw.className='dump-view'+(DUMPDOOR==='words'?' on':'')+(words?' filled':'');
  /* `filled` top-aligns the plate AND hides the baby icon (a pre-existing
     rule) — so it only goes on once the ask screen is behind us. */
  if(vs) vs.className='dump-view'+(DUMPDOOR==='search'?' on':'')+(SEARCH_STAGE!=='ask'?' filled':'');
  searchDraw();
  const plate=$('feedPlate');
  if(plate) plate.classList.toggle('filled', (DUMPDOOR==='docs'&&docs)
    ||(DUMPDOOR==='words'&&words)||(DUMPDOOR==='search'&&SEARCH_STAGE!=='ask'));
  const line=$('feedPadLine');
  if(line) line.textContent = docs ? (QUIZ&&QUIZ.stops&&QUIZ.stops[0]&&QUIZ.stops[0].pad&&QUIZ.stops[0].pad.more)
    || 'or drag in another.' : (FEED_LINE||'or drag it in.');
  const go=$('feedDumpGo');
  if(go){
    /* mid-search the card holds exactly one decision. DONE comes back
       once facts land or you're back at the ask. */
    const midflow = DUMPDOOR==='search' && (SEARCH_STAGE==='plan'||SEARCH_STAGE==='looking');
    go.style.display = midflow ? 'none' : '';
    go.classList.toggle('dormant', !(docs||words||SEARCH_FACTS.length));
  }
  /* the mirror: the hidden field the robots read from tracks the dump
     live, so a fact ticked after DONE still reaches everyone. DONE is
     navigation now, not the courier. */
  const bl=$('blurb'); if(bl) bl.value=feedDumpText();
}
$('feedBrowse').addEventListener('click', e=>{ e.stopPropagation(); $('feedFile').click(); });
$('feedFile').addEventListener('change', async e=>{ await feedTake(e.target.files); e.target.value=''; });
{
  /* a file over the card, whichever door is open: DOCS takes it. */
  const card=$('feedCard0'), plate=$('feedPlate');
  const over=on=>{ if(plate) plate.classList.toggle('over',on);
    if(on && DUMPDOOR!=='docs'){ DUMPDOOR='docs'; feedDumpDraw(); plate.classList.add('over'); } };
  ['dragenter','dragover'].forEach(ev=>card.addEventListener(ev,e=>{e.preventDefault();over(true);}));
  ['dragleave','drop'].forEach(ev=>card.addEventListener(ev,e=>{e.preventDefault();over(false);}));
  card.addEventListener('drop', e=>feedTake(e.dataTransfer.files));
  const t=$('feedDump');
  if(t) t.addEventListener('input', ()=>{ feedDumpDraw(); feedStages(); });
}
/* the dump is everything on the pad: pasted words plus every readable doc */
function feedDumpText(){
  const parts=FEED_DOCS.filter(d=>d.text).map(d=>`--- ${d.name} ---\n${d.text}`);
  /* found facts carry their source into the dump. The FEEDER and the WRITER
     never see a bare claim — if it can't say where it came from it never
     got this far. */
  if(SEARCH_FACTS.length) parts.push('--- FOUND ---\n'
    + SEARCH_FACTS.map(f=>`${f.fact} (${f.source})`).join('\n'));
  const typed=$('feedDump').value.trim();
  if(typed) parts.unshift(typed);
  return parts.join('\n\n');
}

async function feedDumpNext(){
  const dump=feedDumpText();
  if(!dump.trim()){ feedSay(0, FEED_SHORT[0][1]); return; }
  $('blurb').value=dump; dirty();
  $('feedDumpGo').disabled=true;
  accReach(1);
  /* the first turn. The robot reads the dump against what the container
     needs and opens on the point — usually by stating it, because it has
     read the thing and an empty question would prove it hadn't. The same
     read fills the checklist, so there's no second silent call any more. */
  BOUNCE_TURNS=[]; BOUNCE_STEER=null;
  feedThink(true);
  let d;
  try{ d = await api('/api/feeder',{container:CID, dump:dump, turns:[]}); }
  catch(e){ d = {ask:feedPlain('point'), need:'point', fell:true}; }
  feedThink(false);
  feedAsk(d);
  if(d.fell) feedSay(1, STR.feed.feeder);
  $('feedDumpGo').disabled=false;
}

/* ---------- STOP 2: the chat ---------- */
const feedScroll=()=>{ const c=$('feedChat'); c.scrollTop=c.scrollHeight; };
function feedBubble(html, me){
  const row=document.createElement('div');
  row.className='chat-row'+(me?' me':'');
  row.innerHTML = me ? `<div class="chat-msg"></div>` : RAIL.cave()+`<div class="chat-msg">${html}</div>`;
  if(me) row.querySelector('.chat-msg').textContent=html;
  $('feedChat').appendChild(row); feedScroll();
}
/* thinking — the face does it, same pool as FIX IT (thinkFace) */
function feedThink(on){
  $('feedChat').querySelectorAll('.chat-think').forEach((x,i)=>{ if(!on||i>0) x.remove(); });
  let t=$('feedChat').querySelector('.chat-think');
  if(on&&!t){ t=document.createElement('div'); t.className='chat-row chat-think';
    t.innerHTML=RAIL.think();
    $('feedChat').appendChild(t); feedScroll(); }
  if(!on&&t) t.remove();
}

/* the container's own words for a need — the silent fallback whenever the
   robot can't speak, and the source of the why-beat. */
const feedNeed = n => (QUIZ&&QUIZ.bounce||[]).find(b=>b.need===n) || {};
const feedPlain = n => feedNeed(n).plain || "What's this all about?";

/* one bubble a turn: the reaction, then the ask. When the robot proposes an
   angle it rides in the same bubble — inline, in quotes, in ink. Not a red
   block: red would make a suggestion look like the answer, and this one is
   there to be talked over. */
function feedAsk(d){
  feedThink(false);
  BOUNCE_NEED = d.need || BOUNCE_NEED;
  let html='';
  if(d.react) html+=`<span class="confirm">${esc(d.react)}</span>`;
  BOUNCE_ANGLE = (d.angle||'').trim();
  /* a proposition dropped in cold reads like a verdict, so the robot walks
     you into it. The quotes are ours, not its — it's told to hand the angle
     over plain. */
  if(BOUNCE_ANGLE) html+=`${esc((d.lead||"I'm thinking").trim())} <i class="angle">\u201c${esc(BOUNCE_ANGLE)}\u201d</i>. `;
  BOUNCE_LAST = d.ask||feedPlain(BOUNCE_NEED);
  html+=esc(BOUNCE_LAST);
  feedBubble(html);
  const box=$('feedBox');
  box.placeholder=feedNeed(BOUNCE_NEED).placeholder||''; box.focus();
  /* DONE once the angle is on the table — the last need, and usually the
     same beat as 'anything I've missed'. */
  $('feedGo').textContent = BOUNCE_NEED==='angle' ? 'DONE' : 'NEXT';
}

/* the close. The bounce ends on the human's word, so this only runs when
   the robot has said it's got what it needs and been told nothing's
   missing. The brief is what lands; the raw material travels whole and
   separately, and the checklist facts outrank both. */
function feedClose(d){
  BOUNCE_STEER = d.brief || {point:'', insight:'', angle:BOUNCE_ANGLE};
  if(!String(BOUNCE_STEER.angle||'').trim()) BOUNCE_STEER.angle = BOUNCE_ANGLE;
  Object.keys(FEED_SLOT).forEach(k=>{
    const slot=$(FEED_SLOT[k]); if(slot) slot.value = String(BOUNCE_STEER[k]||'').trim();
  });
  dirty(); feedStages();
}

/* the composer is the height of what's in it, up to the cap the CSS sets.
   A paste used to be sliced through the middle of the third line. */
function feedGrow(){
  const b=$('feedBox'); if(!b) return;
  b.style.height='auto';
  b.style.height=Math.min(b.scrollHeight, 150)+'px';
}
/* emptying it is emptying it — the height has to come back too, or the box
   keeps the shape of the answer you just sent. */
function feedBoxClear(){
  const b=$('feedBox'); if(!b) return;
  b.value=''; b.style.height='';
}

let FEED_BUSY=false;
async function feedNext(){
  if(!QUIZ || FEED_BUSY) return;
  const a=$('feedBox').value.trim();
  if(a) feedBubble(a, true);
  BOUNCE_TURNS.push({ask:BOUNCE_LAST, answer:a});
  /* it's been said, so it leaves the box now — not later, and not only on
     the paths that happen to ask another question. Closing the bounce used
     to leave your last answer sitting there looking unsent.

     The box stays open while the robot thinks. It used to be emptied again
     when the answer landed, which quietly ate anything typed during the
     wait; now nothing clears it but sending, so a draft survives. FEED_BUSY
     stops a second send rather than the keyboard. */
  feedBoxClear();
  const box=$('feedBox');
  FEED_BUSY=true; $('feedGo').disabled=true;
  feedThink(true);
  let d;
  try{ d = await api('/api/feeder',{container:CID, dump:val('blurb'), turns:BOUNCE_TURNS}); }
  catch(e){ d = {ask:feedPlain(BOUNCE_NEED), need:BOUNCE_NEED, fell:true}; }
  feedThink(false);
  if(d.fell) feedSay(1, STR.feed.feeder);
  deetsLand(d.found);
  if(d.done){
    feedClose(d);
    if(d.react) feedBubble(esc(d.react));
    if(QUIZ.closing) feedBubble(esc(QUIZ.closing));
    accReach(2);
  }else{
    feedAsk(d);
  }
  FEED_BUSY=false; $('feedGo').disabled=false;
}

/* the ? — the why-beat, answered in the chat, from config. Help as
   conversation, not modal. The robot names which need it's on, so the
   why-beat follows the conversation rather than a counter. */
function feedWhy(){
  const w=feedNeed(BOUNCE_NEED).why;
  if(w) feedBubble(esc(w));
}

/* the bounce → the checklist. The FEEDER reads the dump for the checklist
   on the same call it reads it for the conversation, so this lands as the
   chat goes rather than from a second silent pass. There used to be one:
   /api/extract ran blind and in parallel, and you found out it was wrong
   at stop 3. Now the robot's confirm at the point IS the check on it.

   The rule is untouched: a robot-found fact never arrives ticked, it
   carries its provenance, and a value the human has already put in is
   never overwritten. Suggestion, not gate. */


let ARM=null, CRAFT=null, CRAFT_KEY='';


/* ---------------- background crafting ----------------
   The robot starts writing the moment the facts are complete — before the
   padlocks shut, while the human is still reading the legals. Waiting for
   the locks would hand them the whole Opus wait at the door. */
function deetsArm(){ armDetail(); }
function armDetail(){
  clearTimeout(ARM);
  ARM = setTimeout(()=>{ refreshLegals(); armCraft(); }, 700);
}

/* The background craft writes from a draft brief, tagged with its `v`.
   At WRITE THE WORDS, a craft whose `v` matches the signed brief is used;
   any other is thrown away and the craft runs live. */
function armCraft(){
  if(!factsComplete()) return;
  const b = briefBuild();
  if(b.v===CRAFT_KEY) return;             // already writing (or written) this one
  CRAFT_KEY = b.v;
  CRAFT = api('/api/copy', briefWire(b)).catch(e=>({__err:e.message}));
}

/* The brief moved on. An asset written from an older brief is stale, and
   stale copy is exactly the drift the whole tool exists to prevent — so it
   goes, and FIX IT with it. What the client sees is what they always saw;
   the reason is a version now, not a reflex. */
function dirty(){
  briefMoved(briefBuild().v);              // the sandwich drops a stale asset, and FIX IT with it
  CRAFT=null; CRAFT_KEY='';
  armDetail();
}

function toPics(){ cardReset('plate'); buildIt(); }


async function buildIt(){
  /* typed into the pad but never pressed DONE: take it anyway, and drop the
     background craft, which went out with an empty source. */
  const typed=feedDumpText().trim();
  if(typed && !val('blurb').trim()){ $('blurb').value=typed; CRAFT=null; CRAFT_KEY=''; }
  /* every stop has to hold something. Press early and the robot names the
     short one and opens it — the line explains, the navigation solves. */
  const short=feedShort();
  if(short){ acc(short[0]); feedSay(short[0], short[1]); return; }
  const b = briefSign();                    // WRITE THE WORDS is the signature
  if(assetFresh(b.v)){ reach(1); return; }   // already written from this brief; no beat to play
  const beat = thinkStart();
  let d = null;
  if(CRAFT && b.v===CRAFT_KEY){
    d = await CRAFT;
    if(d && d.__err) d = null;              // the background try failed; go live
  }
  if(!d){
    try{
      d = await api('/api/copy', briefWire(b));
    }catch(e){
      /* the craft died: FIX IT shows its plate card. TRY AGAIN runs buildIt
         again; the counter only resets when WRITE THE WORDS is pressed. */
      await thinkEnd(beat); reach(1);
      fixFail(buildIt);
      return;
    }
  }
  await thinkEnd(beat);
  reach(1);
  /* the handover: the signed brief is in BRIEF; the WRITER's result and the
     engine's terms menu go across as the seed of the asset */
  fixInit(d, {menu:deetsTerms(), termsFailed:deetsFailed()});
}

/* The blocks the tour walks: every writer module, in the html's order;
   a repeating module contributes one block per item per part, keyed
   "card-title#2"; the terms block last where the html has one. The
   copy store is what the WRITER returned — top modules by name (an
   options module is a list, PICK chooses), repeats under "<module>s". */
