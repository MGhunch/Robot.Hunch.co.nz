/* =====================================================================
   ROBOT — THE DEETS
   The checklist: the rows, the sections, the padlocks, the legals and the
   facts the engine reads. Not a room — a renderer two rooms share. FEED IT
   mounts it as LOCK THE DEETS; SET UP mounts it to check the shape before
   a container goes live. Same code, same card, both times: that is the
   whole point of it living here.

   It reads CONT (the sandwich's container) and draws into whatever host it
   was mounted on. It knows no room exists. Where the card needs its host to
   do something — a value moved, a lock refused, a row that wants digging —
   it says so through HOST, and the mounting room decides what that means.
   ===================================================================== */

/* the host: what the card can ask of whoever mounted it. The defaults do
   nothing, so a room can mount the card and ignore every one of them. */
const DEETS_MUTE = { changed(){}, armed(){}, refused(line){}, dig(row){}, rendered(){} };
let DEETS_HOST=null, HOST=Object.assign({}, DEETS_MUTE);
function deetsMount(el, host){ DEETS_HOST=el; HOST=Object.assign({}, DEETS_MUTE, host||{}); }
function deetsUnmount(){ DEETS_HOST=null; HOST=Object.assign({}, DEETS_MUTE); }

/* the terms menu and the ticks: the legals section's own state. The brief
   asks for them through deetsChosen() rather than reaching in. */
let TERMS_MENU=[], TERMS_CHOSEN=null;
const deetsChosen = () => (TERMS_CHOSEN||[]).slice();
const deetsTerms  = () => TERMS_MENU;
/* the facts the engine reads, in the engine's shape */
const deetsFacts  = () => formData();
const deetsFailed = () => TERMS_FAILED;
function deetsReset(){ TERMS_MENU=[]; TERMS_CHOSEN=null; TERMS_FAILED=false; TERMS_BUSY=false;
  PEEKED={}; PEEKLOG=new Set(); DEETS_SECTIONS={}; DEETS_FLASH=''; DEETS_STD_OPEN=false; }

/* CONT is the container, straight off /api/container/<id>. Everything the
   room draws — the stops, the moves, the checklist rows, the modules, the
   ghost, the artefact — comes from it. Nothing below knows what a prize is. */
let DEETS_CONFIG={groups:[],legals:{title:'The legals',sub:''},types:[]};

let DEETS_ROWS = {};      // row id -> state, for the flat rows
let DEETS_REPEATS = {};      // repeat key -> [ {row id -> state}, ... ], for the repeating groups
const newState = r => ({ value:r.type==='topics'?[]:'', sub:r.sub||'', other:'', ticked:false, mode:'view', found:null });

function deetsInit(){
  DEETS_CONFIG=CONT.checklist; DEETS_ROWS={}; DEETS_REPEATS={};
  DEETS_CONFIG.groups.forEach(g=>{
    if(g.repeat){ DEETS_REPEATS[repKey(g)] = DEETS_REPEATS[repKey(g)] || []; return; }
    g.rows.forEach(r=>{ DEETS_ROWS[r.id]=newState(r); });
  });
}
/* SEEDED — stand-in answers, for a room that is checking the SHAPE of the
   card rather than filling it in. The client meets a FILLED checklist, so
   checking an empty one checks nothing. Only SET UP ever calls this; the
   client-facing rooms leave the card empty, which is what an empty card is
   for. The values are derived server-side and never stored. */
function deetsSeed(seed){
  if(!seed) return;
  Object.entries(seed.rows||{}).forEach(([id,v])=>{ if(DEETS_ROWS[id]) DEETS_ROWS[id].value=v; });
  Object.entries(seed.repeats||{}).forEach(([k,items])=>{
    if(!(k in DEETS_REPEATS)) return;
    DEETS_REPEATS[k]=items.map(it=>{
      const st={};
      Object.entries(it).forEach(([id,v])=>{
        st[id]=Object.assign(newState(deetsRow(id)||{}), {value:v});
      });
      return st;
    });
  });
}

const repKey = g => g.repeat.per.split(' ').pop();          // "prize card" -> card
const flatRows = () => DEETS_CONFIG.groups.filter(g=>!g.repeat).flatMap(g=>g.rows);
const deetsRow  = id => flatRows().find(r=>r.id===id) || DEETS_CONFIG.groups.flatMap(g=>g.rows).find(r=>r.id===id);
const deetsShown = (r,S) => !r.showIf || r.showIf.in.includes((S[r.showIf.row]||{}).value);
const deetsAsk   = r => r.ask||'';
/* select labels: the clause library's types name the options where it has
   them (movie -> Movie passes); otherwise the option is its own label */
function deetsOptions(r){
  const types=Object.fromEntries((DEETS_CONFIG.types||[]).map(t=>[t.value,t.label]));
  return (r.options||[]).map(o=>[o, types[o] || (o==='other'?'Other…':o)]);
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const deetsFmtDay = v => { if(!v) return '';
  const d=new Date(v+'T00:00'); return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]; };
/* a loose date ("20 September 2026", "20/9/26", "Sun 20 Sep") → ISO, or
   null. A net under the extract contract, never a guess: no year in the
   text means the next occurrence, same as the prompt says. */
function deetsDateISO(v){
  v=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  let m=v.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);
  if(m){ let y=+m[3]; if(y<100) y+=2000; const d=new Date(y,+m[2]-1,+m[1]); return isNaN(d)?null:d.toISOString().slice(0,10); }
  const MN={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  m=v.toLowerCase().match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\.?\s*(\d{4})?/);
  if(!m) return null;
  const mo=MN[m[2].slice(0,3)]; if(mo===undefined) return null;
  let y=m[3]?+m[3]:new Date().getFullYear();
  let d=new Date(y,mo,+m[1]);
  if(!m[3] && d < new Date()) d=new Date(y+1,mo,+m[1]);   // next occurrence
  return isNaN(d)?null:d.toISOString().slice(0,10);
}

/* one to twelve as words — display only; the state and the clauses keep
   the digit. The rule proper lives in brandvoice.md so the WRITER agrees. */
const NUMWORDS=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
const deetsFmtNum = v => { const x=Number(v); return Number.isInteger(x)&&x>=1&&x<=12 ? NUMWORDS[x] : String(v); };

/* derive — a suggestion, human-editable, human-ticked. Two rules:
   nextWorkday:<row>, and typeCounts (the prize type's ticket words). */
function deetsDerive(r,S){
  if(r.derive==='typeCounts'){
    /* a default, not a live derivation: it only ever overwrites its own
       last suggestion. Words off the dump, or the human's own, stand. */
    const s=S[r.id];
    if(s.touched) return;
    if(s.value && s.value!==s.seeded) return;
    const t=deetsType(); if(!t) return;
    const many=Number((S.winners||{}).value||0)>1;
    const v=(many ? t.counts : (t.counts_one||t.counts))||'';
    if(v!==s.value){ s.value=v; s.seeded=v; s.ticked=false; }
    return;
  }
  const m=/^nextWorkday:(\w+)$/.exec(r.derive||''); if(!m) return;
  const s=S[r.id]; if(s.touched) return;
  const c=(S[m[1]]||{}).value; if(!c){ s.value=''; return; }
  const d=new Date(c+'T00:00'); d.setDate(d.getDate()+1);
  while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1);
  const v=d.toISOString().slice(0,10);
  if(v!==s.value){ s.value=v; s.ticked=false; }
}


/* ---------------- LOCK THE DEETS ----------------
   The details are canon — they beat the dump downstream — so this stop
   borrows FIX IT's padlock, not a tick. A tick says *checked*; a lock says
   *settled, don't move*. The client learns the device here, on easy facts,
   and arrives in FIX IT already fluent. The tick survives where it belongs:
   the specific-terms chips. Two devices, two weights.

   Sections come off the container and are never named in code. Every group
   is a section; the legals are the last one. A group of nothing but dates
   draws as the plain list. The group that owns the type row draws as the
   sentence, when its type has one. Everything else keeps the fact grid. */
let DEETS_SECTIONS={};                 // section key -> 'open' | 'edit' | 'locked'
let DEETS_FLASH='';            // the section whose holes just refused a lock
let DEETS_STD_OPEN=false;           // the standard-terms panel, peeked open

function deetsSections(){
  const out=[], done=new Set();
  DEETS_CONFIG.groups.forEach(g=>{
    if(g.repeat){ const k=repKey(g); if(done.has(k)) return; done.add(k);
      out.push({key:'rep:'+k, title:k, kind:'repeat', rep:k}); return; }
    const rows=g.rows.filter(r=>r.type!=='legals');
    if(!rows.length) return;                      // a prose-only group draws nothing
    const shown=rows.filter(r=>deetsShown(r,DEETS_ROWS));
    let kind='facts';
    if(shown.length && shown.every(r=>r.type==='date')) kind='dates';
    else if(rows.some(r=>r.id.endsWith('_type')) && deetsTemplate()) kind='sentence';
    out.push({key:'grp:'+g.title, title:g.title, kind, rows});
  });
  out.push({key:'legals', title:'The legals', kind:'legals'});
  return out;
}
const deetsState = k => DEETS_SECTIONS[k] || (DEETS_SECTIONS[k]='open');
function deetsAllLocked(){ return !!CONT && deetsSections().every(s=>deetsState(s.key)==='locked'); }

/* every row a section owns, with the state object it lives in */
function deetsRows(sec){
  const out=[];
  if(sec.kind==='repeat'){
    const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===sec.rep);
    (DEETS_REPEATS[sec.rep]||[]).forEach(S=>groups.forEach(g=>g.rows.forEach(r=>out.push({r,S}))));
  } else if(sec.rows){ sec.rows.forEach(r=>out.push({r,S:DEETS_ROWS})); }
  return out;
}
function deetsHoles(sec){
  return deetsRows(sec).filter(({r,S})=>deetsShown(r,S)&&!cellFilled(r,S)).map(x=>x.r);
}

/* ── the padlock loop — FIX IT's grammar verbatim: tap open or shut and you
   get the pencil; tap the pencil and it keeps. Opening one keeps the other:
   leaving locks. A section with a hole refuses — canon doesn't ship with a
   TBC in it — so the hole flashes and the robot says which one. ── */
function deetsPadTap(key){
  const sec=deetsSections().find(x=>x.key===key); if(!sec) return;
  PADLOCK.tap(deetsState(key), {keep:()=>deetsKeep(sec), open:()=>deetsOpen(sec)});
}
function deetsOpen(sec){
  deetsSections().forEach(o=>{ if(o.key!==sec.key && deetsState(o.key)==='edit') deetsKeep(o); });
  DEETS_SECTIONS[sec.key]='edit'; DEETS_FLASH='';
  deetsRows(sec).forEach(({r,S})=>{ if(S[r.id]) S[r.id].ticked=false; });
  deetsRender();
}
function deetsKeep(sec){
  const holes=deetsHoles(sec);
  if(holes.length){
    DEETS_SECTIONS[sec.key]='edit'; DEETS_FLASH=sec.key;
    HOST.refused(holes.length===1
      ? "Can't lock that with a hole in it — I still need the "+String(holes[0].label).toLowerCase()+"."
      : "Can't lock that yet — "+holes.length+" bits are still TBC.");
    deetsRender(); return;
  }
  DEETS_SECTIONS[sec.key]='locked'; DEETS_FLASH='';
  deetsRows(sec).forEach(({r,S})=>{ if(S[r.id]){ S[r.id].ticked=true; S[r.id].mode='view'; } });
  HOST.armed(); deetsRender();
}
function deetsPad(key, st){
  const b=document.createElement('button');
  b.className='deets-pad '+st;
  b.innerHTML = PADLOCK.face(st);
  const tip=PADLOCK.say[st];
  b.title=tip; b.setAttribute('aria-label',tip);
  b.onclick=()=>deetsPadTap(key);
  return b;
}

/* ── THE PRIZE, in human ──────────────────────────────────────────────────
   The prize already has a definition: prize_line, the fixed clause that
   publishes in the terms — and which the client never got to see, because
   it hangs as a sub-bullet and the card filtered sub-bullets out. This is
   that definition in its other dress. Same facts, fewer formalities, so the
   two can differ in tone and never in substance. The words live in the
   container (sentence: per prize type), never here. ── */
function deetsType(){
  const tr=flatRows().find(r=>r.id.endsWith('_type')); if(!tr) return null;
  const s=DEETS_ROWS[tr.id]; if(!s||!s.value) return null;
  return (DEETS_CONFIG.types||[]).find(x=>x.value===s.value)||null;
}
const deetsTemplate = () => (deetsType()||{}).sentence||'';

const deetsFmtDate = v => { if(!v) return '';
  const d=new Date(v+'T00:00'); return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear(); };
function deetsVal(id){
  if(id==='counts')     return (deetsType()||{}).counts||'';
  if(id==='counts_one') return (deetsType()||{}).counts_one||'';
  const r=deetsRow(id); if(!r) return '';
  const s=DEETS_ROWS[id]; if(!s||!s.value) return '';
  if(r.type==='date')   return deetsFmtDay(s.value);
  if(r.type==='number') return deetsFmtNum(s.value);
  if(r.type==='select') return s.value==='other' ? (s.other||'')
    : ((deetsOptions(r).find(o=>o[0]===s.value)||[])[1]||'');
  return s.value;
}
/* {id} a fact as the card shows it, {counts} the type's noun; [a/b] picks by
   winner count, the same switch the clauses use; [[ ]] is an optional run
   that vanishes whole when anything inside it is empty; *stars* bold. A
   missing fact outside an optional run reads TBC in red — the only alarm. */
function deetsFill(tpl){
  const plural = Number(deetsVal('winners')&&(DEETS_ROWS.winners||{}).value||1) > 1;
  let t=String(tpl).replace(/\[([^\[\]]*?\/[^\[\]]*?)\]/g,(m,g)=>{
    const parts=g.split('/'); return (plural?parts[1]:parts[0]).trim(); });
  t=t.replace(/\[\[(.*?)\]\]/g,(m,run)=>{
    let ok=true; run.replace(/\{(\w+)\}/g,function(_,id){ if(!deetsVal(id)) ok=false; return ''; });
    return ok?run:''; });
  let html=t.replace(/\{(\w+)\}/g,(m,id)=>{
    const v=deetsVal(id); return v?esc(v):'<span class="tbc">TBC</span>'; });
  return html.replace(/\*([^*]+)\*/g,'<b>$1</b>');
}

/* ── the section bodies ── */
function deetsSentenceBody(box, sec, st){
  if(st==='edit') return deetsFactsBody(box, sec, st);
  const p=document.createElement('div'); p.className='deets-prize';
  p.innerHTML=deetsFill(deetsTemplate());
  box.appendChild(p);
}
/* label left, value right, hairlines between. Filled rows sit in ink and
   shut up; only TBC is red. Open, they become the platform's own picker. */
function deetsDatesBody(box, sec, st){
  const list=document.createElement('div'); list.className='deets-dates';
  sec.rows.filter(r=>deetsShown(r,DEETS_ROWS)).forEach(r=>{
    deetsDerive(r,DEETS_ROWS);
    const s=DEETS_ROWS[r.id];
    const row=document.createElement('div'); row.className='deets-drow';
    row.innerHTML='<span class="deets-dlabel">'+esc(r.label)+'</span>';
    if(st==='edit'){
      const inp=document.createElement('input'); inp.type='date'; inp.value=s.value||'';
      inp.setAttribute('aria-label', r.label);
      /* no re-render on change: it would tear the picker out mid-edit. The
         section redraws when the padlock keeps it. */
      inp.onchange=()=>{ if(inp.value!==s.value){
        s.value=inp.value; s.touched=true; s.ticked=false; HOST.changed(); } };
      row.appendChild(inp);
    } else {
      const v=document.createElement('span');
      v.className='deets-dval'+(s.value?'':' tbc');
      v.textContent=s.value?deetsFmtDate(s.value):'TBC';
      row.appendChild(v);
    }
    list.appendChild(row);
  });
  box.appendChild(list);
}
/* the fact grid, unchanged — the rows keep their own edit loop. It draws
   where a group has no sentence to wear, and where the prize is open. */
function deetsFactsBody(box, sec, st){
  const grid=document.createElement('div'); grid.className='deets-factgrid';
  sec.rows.filter(r=>deetsShown(r,DEETS_ROWS)&&!deetsTypeKnown(r,DEETS_ROWS)).forEach(r=>{
    deetsDerive(r,DEETS_ROWS); grid.appendChild(deetsRowEl(r,DEETS_ROWS)); });
  if(st!=='edit') grid.classList.add('inert');
  box.appendChild(grid);
}
function deetsRepeatBody(box, sec, st){
  deetsRepeatCards(sec.rep).forEach(c=>box.appendChild(c));
  if(st!=='edit') box.classList.add('inert');
}
/* two forms, one lock. Standard terms are one quiet block naming the
   clauses — furniture, nothing to tick, "Read them" for the words as
   they'll print. Specific terms are the chips, and they are the only
   decisions in the section. */
function deetsLegalsBody(box, sec, st){
  const fixedSrc = TERMS_MENU.length ? TERMS_MENU.filter(c=>c.fixed&&!c.sub) : (DEETS_CONFIG.legals.fixed||[]);
  box.innerHTML='<div class="deets-title">'+deetsTitle(DEETS_CONFIG.legals.fixedTitle||'Standard terms')+'</div>';
  const std=document.createElement('div'); std.className='deets-std';
  std.innerHTML=esc(deetsStdLine(fixedSrc))+' ';
  const peek=document.createElement('span'); peek.className='deets-peek';
  peek.textContent=DEETS_STD_OPEN?'Hide terms':'Read terms';
  peek.onclick=()=>{ DEETS_STD_OPEN=!DEETS_STD_OPEN; fixedSrc.forEach(c=>logPeek(c.id)); deetsRender(); };
  std.appendChild(peek); box.appendChild(std);
  const full=document.createElement('div'); full.className='deets-stdfull'+(DEETS_STD_OPEN?' on':'');
  full.innerHTML=fixedSrc.map(c=>'<b>'+esc(deetsLabel(c))+'</b>'+deetsWords(c.text)).join('');
  box.appendChild(full);
  const t2=document.createElement('div'); t2.className='deets-title deets-t2';
  t2.innerHTML=deetsTitle(DEETS_CONFIG.legals.title||'Specific terms');
  box.appendChild(t2);
  const opt = TERMS_MENU.length ? TERMS_MENU.filter(c=>!c.fixed) : [];
  if(!opt.length && TERMS_FAILED){
    box.appendChild(robotLine(STR.deets.terms_fail,{stick:true}));
  } else if(!opt.length){
    const w=document.createElement('div'); w.className='deets-legwait';
    w.textContent=TERMS_BUSY ? STR.deets.terms_wait : 'Finish the facts above and the legals sort themselves.';
    box.appendChild(w);
  } else {
    const row=document.createElement('div'); row.className='deets-pills'+(st==='edit'?'':' inert');
    opt.forEach(c=>{ const on=!!(TERMS_CHOSEN&&TERMS_CHOSEN.includes(c.id));
      row.appendChild(deetsPill(c,on,false,()=>toggleClause(c.id))); });
    box.appendChild(row);
  }
}
const deetsLabel = c => c.label || String(c.id).replace(/_/g,' ').replace(/^./,x=>x.toUpperCase());
/* the block names the clauses; it never prints them */
function deetsStdLine(list){
  const names=list.map(c=>{ const l=deetsLabel(c);
    return /[A-Z]/.test(l.slice(1)) ? l : l.charAt(0).toLowerCase()+l.slice(1); });
  if(!names.length) return 'The standard terms ride along on every one of these.';
  const last=names.pop();
  const joined = names.length ? names.join(', ')+' and '+last : last;
  return joined.replace(/^./,c=>c.toUpperCase())+'. These are always included.';
}

function deetsRender(){
  const wrap=DEETS_HOST; if(!wrap||!CONT) return; wrap.innerHTML='';
  flatRows().forEach(r=>{ if(r.derive) deetsDerive(r,DEETS_ROWS); });
  deetsSections().forEach(sec=>{
    const st=deetsState(sec.key);
    const el=document.createElement('div');
    el.className='deets-sec '+st+(DEETS_FLASH===sec.key?' flash':'');
    if(sec.kind!=='legals') el.innerHTML='<div class="deets-title">'+deetsTitle(sec.title)+'</div>';
    const body=document.createElement('div'); body.className='deets-body';
    if(sec.kind==='sentence')    deetsSentenceBody(body, sec, st);
    else if(sec.kind==='dates')  deetsDatesBody(body, sec, st);
    else if(sec.kind==='repeat') deetsRepeatBody(body, sec, st);
    else if(sec.kind==='legals') deetsLegalsBody(body, sec, st);
    else                         deetsFactsBody(body, sec, st);
    el.appendChild(body);
    el.appendChild(deetsPad(sec.key, st));
    wrap.appendChild(el);
  });
  HOST.rendered();
}
function deetsTitle(t){
  const w=String(t).split(' '); if(w.length<2) return esc(t);
  return esc(w.slice(0,-1).join(' '))+' <em>'+esc(w[w.length-1])+'</em>';
}

/* a repeating group: one card per item (CARD 1, CARD 2…), the base rows,
   then any conditional group's rows when its condition holds. Items come
   from extraction or the + link; the group's min is the floor. */
function deetsRepeatCards(key){
  const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
  const base=groups.find(g=>!g.repeat.where)||groups[0];
  const items=DEETS_REPEATS[key];
  while(items.length<base.repeat.min) items.push({});
  items.forEach(S=>{ groups.forEach(g=>g.rows.forEach(r=>{ if(!S[r.id]) S[r.id]=newState(r); })); });
  /* a prize story carries the draw clause by default; the human unticks */
  items.forEach(S=>{ const tr=groups.flatMap(g=>g.rows).find(r=>r.id.endsWith('_type')), tp=groups.flatMap(g=>g.rows).find(r=>r.type==='topics');
    if(tr&&tp&&S[tr.id].value==='prize'&&!S[tp.id].seeded){ S[tp.id].seeded=true;
      (DEETS_CONFIG.topics||[]).filter(x=>x.default&&(!x.when||x.when==='prize')).forEach(x=>{ if(!S[tp.id].value.includes(x.id)) S[tp.id].value.push(x.id); }); } });
  const cards=items.map((S,i)=>{
    const card=document.createElement('div'); card.className='deets-card';
    const typeRow=base.rows.find(r=>r.id.endsWith('_type'));
    const type=typeRow?(S[typeRow.id].value||''):'';
    const topicRow=groups.flatMap(g=>g.rows).find(r=>r.type==='topics');
    if(topicRow){ return deetsStoryCard(key,i,S,items,base,typeRow,topicRow); }
    card.innerHTML=`<div class="deets-title">${esc(key).toUpperCase()} <em>${i+1}</em>${type?`<span class="deets-tag">${esc(type)}</span>`:''}
      ${items.length>base.repeat.min?`<a class="deets-rm" title="Remove">&times;</a>`:''}</div>`;
    const rm=card.querySelector('.deets-rm'); if(rm) rm.onclick=()=>{ items.splice(i,1); HOST.changed(); deetsRender(); };
    card.classList.add('facts');
    const grid=document.createElement('div'); grid.className='deets-factgrid';
    const liveRows=[];
    groups.forEach(g=>{
      const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return;
      g.rows.forEach(r=>{ if(r.type==='legals'||!deetsShown(r,S)) return; deetsDerive(r,S); liveRows.push(r); grid.appendChild(deetsRowEl(r,S)); });
    });
    card.appendChild(grid);
    return card;
  });
  if(items.length<base.repeat.max){
    const add=document.createElement('button'); add.className='deets-add';
    add.textContent=`+ another ${key}`;
    add.onclick=()=>{ items.push({}); deetsRender(); };
    cards.push(add);
  }
  return cards;
}

/* THE LINEUP — a story is one row: what it's about, its type as a tag,
   the circle tick; under it the legal topics as square chips. Click the
   words to edit subject and type. No title, no provenance. */
function deetsStoryCard(key,i,S,items,base,typeRow,topicRow){
  const card=document.createElement('div'); card.className='deets-card story';
  const subjRow=base.rows.find(r=>r.type==='text')||base.rows[0];
  const s=S[subjRow.id], ty=typeRow?S[typeRow.id]:null, tp=S[topicRow.id];
  const type=ty?ty.value:'';
  const row=document.createElement('div'); row.className='deets-row';
  const main=document.createElement('div'); main.className='deets-main'; row.appendChild(main);
  main.innerHTML=`<div class="deets-label">${esc(key)} ${i+1}</div>`;
  const valEl=document.createElement('div'); valEl.className='deets-value'; main.appendChild(valEl);
  const shown=s.value;
  if(s.mode==='edit'){
    const inp=document.createElement('input'); inp.type='text'; inp.value=s.value; inp.placeholder=(subjRow.ask||'').replace('{n}', i+1);
    valEl.appendChild(inp);
    let sel=null;
    if(typeRow){ sel=document.createElement('select');
      sel.innerHTML='<option value="">—</option>'+deetsOptions(typeRow).map(o=>`<option value="${esc(o[0])}" ${o[0]===type?'selected':''}>${esc(o[1])}</option>`).join('');
      sel.style.marginTop='6px'; valEl.appendChild(document.createElement('br')); valEl.appendChild(sel); }
    const save=()=>{ if(s.mode!=='edit') return;
      if(sel && document.activeElement===sel) return;
      const nv=inp.value.trim(), nt=sel?sel.value:type;
      if(nv!==s.value||nt!==type){ s.value=nv; if(ty){ ty.value=nt; ty.ticked=true; } s.ticked=false; s.found=null; HOST.changed(); }
      s.mode='view'; deetsRender(); };
    inp.onblur=()=>setTimeout(save,80); if(sel) sel.onblur=()=>setTimeout(save,80);
    inp.onkeydown=e=>{ if(e.key==='Enter') inp.blur(); };
    setTimeout(()=>inp.focus(),0);
  } else {
    valEl.innerHTML = shown
      ? `<span class="deets-storyname">${esc(shown)}</span>${type?`<span class="deets-tag grey">${esc(type)}</span>`:''}`
      : `<span class="deets-ask">${esc((subjRow.ask||'').replace('{n}', i+1))}</span>`;
    valEl.onclick=()=>{ s.mode='edit'; deetsRender(); };
  }
  card.appendChild(row);
  const topics=(DEETS_CONFIG.topics||[]).filter(x=>!x.when||x.when===type);
  if(topics.length){
    const box=document.createElement('div'); box.className='deets-pills';
    topics.forEach(x=>{
      const on=tp.value.includes(x.id);
      box.appendChild(deetsPill(x,on,false,()=>{
        tp.value = on ? tp.value.filter(v=>v!==x.id) : tp.value.concat([x.id]);
        s.ticked=false; if(ty) ty.ticked=false; HOST.changed(); deetsRender(); }));
    });
    card.appendChild(box);
  } else if(shown){
    const w=document.createElement('div'); w.className='deets-legwait'; w.textContent='Nothing to add. The standard footer covers it.'; card.appendChild(w);
  }
  if(items.length>base.repeat.min){
    const rm=document.createElement('a'); rm.className='deets-rm'; rm.title='Remove'; rm.innerHTML='&times;';
    rm.onclick=()=>{ items.splice(i,1); HOST.changed(); deetsRender(); }; card.appendChild(rm);
  }
  return card;
}

function deetsRowEl(r,S){
  const s=S[r.id];
  const row=document.createElement('div'); row.className='deets-row';
  const main=document.createElement('div'); main.className='deets-main'; row.appendChild(main);
  const valEl=document.createElement('div'); valEl.className='deets-value'; main.appendChild(valEl);
  const isSel=r.type==='select', hasOther=isSel&&(r.options||[]).includes('other');

  if(s.mode==='view'){
    /* the fact is a pill: label + comms-clean value. Missing sits awake —
       dashed red, the ask inside. Click anywhere to update. The circle
       moved to the card; the row keeps no tick of its own. */
    const shown = isSel
      ? (s.value==='other' ? (s.other||'') : (deetsOptions(r).find(o=>o[0]===s.value)||[])[1])
      : s.value;
    let v;
    /* an unknown fact reads TBC, not its own question — a grid of asks is
       noise at a glance. The question survives as the edit placeholder. */
    if(!shown) v='<span class="deets-ask">TBC</span>';
    else if(r.type==='date') v=deetsFmtDay(s.value);
    else if(r.type==='number'){ const u=deetsUnit(r,S); v=esc(deetsFmtNum(shown)+(u?' '+u:'')); }
    else v=esc(shown);
    row.classList.add('pillrow'); if(!shown) row.classList.add('awake');
    valEl.innerHTML=`<span class="deets-pilllabel">${esc(r.label)}</span> <span class="deets-pillval">${v}</span>`;
    valEl.onclick=()=>{ s.mode='edit'; deetsRender(); };
  }
  else if(s.mode==='edit'){
    row.classList.add('pillrow','editing');
    let inp;
    if(isSel){
      inp=document.createElement('select');
      inp.innerHTML='<option value="">—</option>'+deetsOptions(r).map(o=>`<option value="${esc(o[0])}" ${o[0]===s.value?'selected':''}>${esc(o[1])}</option>`).join('');
    } else {
      inp=document.createElement('input');
      inp.type = r.type==='date'?'date':(r.type==='number'?'number':'text');
      if(r.type==='number') inp.min=1;
      inp.value=s.value; inp.placeholder=deetsAsk(r);
    }
    if(r.sub!==undefined){
      const si=document.createElement('input'); si.className='deets-subin';
      si.value=s.sub; si.setAttribute('aria-label','At');
      si.oninput=()=>{ s.sub=si.value; };
      valEl.appendChild(si);
    }
    valEl.appendChild(inp); valEl.onclick=null;
    let otherIn=null;
    if(hasOther){
      otherIn=document.createElement('input');
      otherIn.placeholder='What is it?'; otherIn.value=s.other;
      otherIn.style.display = s.value==='other'?'inline-block':'none';
      otherIn.style.marginTop='6px';
      valEl.appendChild(document.createElement('br')); valEl.appendChild(otherIn);
      inp.onchange=()=>{ otherIn.style.display = inp.value==='other'?'inline-block':'none';
        if(inp.value==='other') otherIn.focus(); };
    }
    if(deetsAsk(r) && r.notsure){
      const ns=document.createElement('span'); ns.className='deets-notsure';
      ns.textContent='Not sure?';
      ns.onmousedown=e=>{ e.preventDefault(); s.mode='doors'; deetsRender(); };
      valEl.appendChild(document.createElement('br')); valEl.appendChild(ns);
    }
    setTimeout(()=>{ inp.focus();
      if(r.type==='date' && inp.showPicker) try{ inp.showPicker(); }catch(e){} },0);
    const save=()=>{
      if(s.mode!=='edit') return;
      if(otherIn && document.activeElement===otherIn) return;
      const nv = inp.value.trim ? inp.value.trim() : inp.value;
      const changed = nv!==s.value || (otherIn && otherIn.value.trim()!==s.other);
      s.value=nv; if(otherIn) s.other=otherIn.value.trim();
      if(changed){ s.ticked=false; s.found=null; s.touched=true; HOST.changed(); }
      s.mode='view'; deetsRender();
    };
    inp.onblur=()=>setTimeout(save,80);
    if(otherIn) otherIn.onblur=()=>setTimeout(save,80);
    inp.onkeydown=e=>{ if(e.key==='Enter') inp.blur(); };
    if(otherIn) otherIn.onkeydown=e=>{ if(e.key==='Enter') otherIn.blur(); };
  }

  if(s.mode==='doors'){
    row.classList.add('pillrow','editing');
    valEl.innerHTML='';
    const panel=document.createElement('div'); panel.className='deets-doors';
    panel.innerHTML=`<div class="deets-doorline"><span class="deets-doorbot">${BOT_AV()}</span>
      <span>No sweat &mdash; ${esc(r.notsure)} Your call:</span></div>`;
    const btns=document.createElement('div'); btns.className='deets-doorbtns';
    const tell=document.createElement('button'); tell.textContent="I'll tell it";
    tell.onclick=()=>{ s.mode='edit'; deetsRender(); };
    btns.appendChild(tell);
    if(r.diggable){
      const dig=document.createElement('button'); dig.className='primary'; dig.textContent='Let it dig';
      /* The apologetic ask aims SEARCH: back to the dump, the search door
         open, the row's gap already in the field. Stop 3 to stop 1 is the
         concertina jump, and it's deliberate — the dig is the dump's job. */
      dig.onclick=()=>{ s.mode='view'; deetsRender(); HOST.dig(r); };
      btns.appendChild(dig);
    }
    panel.appendChild(btns); row.appendChild(panel);
  }
  return row;
}

/* a *_type row leaves the card once it's known — it keeps working
   backstage (which clauses propose, the prize line, which facts show).
   Known means ticked: the human never weighs the robot's read here. */
function deetsTypeKnown(r,S){
  if(!r.id.endsWith('_type')||r.type!=='select') return false;
  const s=S[r.id]; if(!s||!s.value||(s.value==='other'&&!s.other)) return false;
  if(!s.ticked){ s.ticked=true; }
  return true;
}
/* the noun a number wears: unit '@type' takes the current type's counts */
function deetsUnit(r,S){
  if(!r.unit) return '';
  if(r.unit!=='@type') return r.unit;
  const tr=Object.keys(S).find(k=>k.endsWith('_type')); if(!tr) return '';
  const t=(DEETS_CONFIG.types||[]).find(t=>t.value===S[tr].value);
  return t&&t.counts ? t.counts : '';
}

/* a clause pill: label; tap the label and the pill opens into the words
   as they'll print. Facts still unconfirmed read as an honest blank. */
const deetsWords = t => esc(String(t||'').replace(/\{\w+\}/g,'\u2026'));
let PEEKED = {};                       // id -> open, survives re-render
function deetsPill(cl, on, fixed, flip){
  const el=document.createElement('div');
  el.className='deets-pill'+(fixed?' fixed':on?' on':' off')+(PEEKED[cl.id]?' peeked':'');
  el.innerHTML=(fixed?'':`<span class="deets-ptick">${on?TICK:''}</span>`)+
    `<span class="deets-pbody"><button class="deets-pname">${esc(cl.label||String(cl.id).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()))}</button>
     <span class="deets-pwords">${deetsWords(cl.text)}</span></span>`;
  el.querySelector('.deets-pname').onclick=e=>{ e.stopPropagation();
    PEEKED[cl.id]=!PEEKED[cl.id]; el.classList.toggle('peeked'); logPeek(cl.id); };
  if(!fixed && flip){ el.querySelector('.deets-ptick').onclick=e=>{ e.stopPropagation(); flip(); }; }
  return el;
}
let PEEKLOG = new Set();
function logPeek(id){ if(PEEKLOG.has(id)||!CID) return; PEEKLOG.add(id);
  try{ api('/api/peek',{container:CID, clause:id}); }catch(e){} }

/* the form the engine reads: row id -> value, <id>__sub for a time, and
   each repeating group as a list under its key. OTHER sends what they
   typed; the engine names it back in its honest "don't know that yet". */
const rowVal = (r,S) => { const s=S[r.id]; if(!s) return '';
  if(r.type==='topics') return Array.isArray(s.value)?s.value:[];
  return (r.type==='select' && s.value==='other') ? (s.other||'other') : s.value; };
function formData(){
  const f={};
  flatRows().forEach(r=>{ if(r.type==='legals') return;
    f[r.id]=deetsShown(r,DEETS_ROWS)?rowVal(r,DEETS_ROWS):''; if(r.sub!==undefined) f[r.id+'__sub']=DEETS_ROWS[r.id].sub; });
  Object.keys(DEETS_REPEATS).forEach(key=>{
    const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    f[key]=DEETS_REPEATS[key].map(S=>{ const o={};
      groups.forEach(g=>g.rows.forEach(r=>{ if(r.type==='legals'||!S[r.id]) return;
        o[r.id]=deetsShown(r,S)?rowVal(r,S):''; if(r.sub!==undefined) o[r.id+'__sub']=S[r.id].sub; }));
      return o; });
  });
  return f;
}

/* ---------------- what the bounce landed ----------------
   A robot-found fact never arrives ticked, it carries its provenance, and
   a value the human has already put in is never overwritten. */
function deetsLand(found){
  const f = found || {};
  if(!Object.keys(f).length) return;
  const land=(S,r,v)=>{ if(!S[r.id]) return;
    if(r.type==='topics'){ if(Array.isArray(v)&&v.length&&!S[r.id].value.length) S[r.id].value=v.slice(); return; }
    if(r.type==='date'&&v) v=deetsDateISO(v)||'';
    if(v && !S[r.id].value){ S[r.id].value=String(v); S[r.id].found='from your docs'; S[r.id].ticked=false; } };
  flatRows().forEach(r=>land(DEETS_ROWS,r,f[r.id]));
  Object.keys(DEETS_REPEATS).forEach(key=>{
    const rows=f[key]; if(!Array.isArray(rows)||!rows.length) return;
    const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    if(!groups.length) return;
    const max=groups[0].repeat.max;
    while(DEETS_REPEATS[key].length<Math.min(rows.length,max)) DEETS_REPEATS[key].push({});
    rows.slice(0,max).forEach((item,i)=>{ const S=DEETS_REPEATS[key][i];
      groups.forEach(g=>g.rows.forEach(r=>{ if(!S[r.id]) S[r.id]=newState(r); land(S,r,item[r.id]); })); });
  });
}

/* ---------------- nothing flies without a tick ---------------- */
/* a row is filled when it has a value — or when the container never asked
   it to (locked: no). The prize tier is the only optional row on the card,
   and a blank tier must not hold the whole stop hostage. */
const cellFilled = (r,S) => { if(r.type==='legals'||r.type==='topics'||!deetsShown(r,S)) return true;
  const s=S[r.id]; if(!s) return true;
  if(!r.locked) return true;
  return r.type==='select' ? !!(s.value&&(s.value!=='other'||s.other)) : !!s.value; };
/* ticked now means *locked* — the section's padlock sets it, nothing else. */
const rowReady = (r,S) => { if(r.type==='legals'||r.type==='topics'||!deetsShown(r,S)) return true;
  const s=S[r.id]; if(!s) return true;
  return cellFilled(r,S) && s.ticked; };
/* every fact in, padlocks or not. This is what starts the writer. */
function factsComplete(){
  if(!CONT) return false;
  if(!flatRows().every(r=>cellFilled(r,DEETS_ROWS))) return false;
  return Object.keys(DEETS_REPEATS).every(key=>{
    const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    return DEETS_REPEATS[key].every(S=>groups.every(g=>{ const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return true;
      return g.rows.every(r=>cellFilled(r,S)); }));
  });
}
function detailReady(){
  if(!CONT) return false;
  if(!flatRows().every(r=>rowReady(r,DEETS_ROWS))) return false;
  return Object.keys(DEETS_REPEATS).every(key=>{
    const groups=DEETS_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    return DEETS_REPEATS[key].every(S=>groups.every(g=>{ const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return true;
      return g.rows.every(r=>rowReady(r,S)); }));
  });
}

/* TERMS_FAILED is the difference between 'not yet' and 'can't' — without
   it a dead /api/terms wore the unfinished-facts costume and lied. */
let TERMS_FAILED=false, TERMS_BUSY=false;
async function refreshLegals(){
  const filled = flatRows().every(r=>cellFilled(r,DEETS_ROWS));
  if(!filled){ TERMS_MENU=[]; TERMS_FAILED=false; deetsRender(); return; }
  TERMS_BUSY=true; deetsRender();
  try{
    const d = await api('/api/terms',{container:CID, form:formData()});
    TERMS_MENU=d.menu; TERMS_FAILED=false;
    if(TERMS_CHOSEN===null) TERMS_CHOSEN = TERMS_MENU.filter(c=>!c.fixed && c.default).map(c=>c.id);
  }catch(e){ TERMS_MENU=[]; TERMS_FAILED=true; }
  TERMS_BUSY=false; deetsRender();
}

function toggleClause(id){
  TERMS_CHOSEN = TERMS_CHOSEN.includes(id) ? TERMS_CHOSEN.filter(x=>x!==id) : TERMS_CHOSEN.concat([id]);
  deetsRender();
}
