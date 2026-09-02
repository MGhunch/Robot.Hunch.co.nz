/* =====================================================================
   ROBOT — FEED IT
   The concertina: DUMP YOUR DOCS (docs, words, the search door), BOUNCE
   IDEAS (the FEEDER), LOCK THE DEETS (the checklist, the padlocks, the
   terms). Builds the brief; WRITE THE WORDS signs it and hands over.
   Reads CONT and CID; writes BRIEF. Never reads ASSET.
   ===================================================================== */

let TERMS_MENU=[], TERMS_CHOSEN=null;                      // the derived terms and the ticks — FEED IT's, not the brief's
const val = id => ($(id) ? $(id).value : '');

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
    feedSay(2, holes.length===1
      ? "Can't lock that with a hole in it — I still need the "+String(holes[0].label).toLowerCase()+"."
      : "Can't lock that yet — "+holes.length+" bits are still TBC.");
    deetsRender(); return;
  }
  DEETS_SECTIONS[sec.key]='locked'; DEETS_FLASH='';
  deetsRows(sec).forEach(({r,S})=>{ if(S[r.id]){ S[r.id].ticked=true; S[r.id].mode='view'; } });
  deetsArm(); deetsRender();
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
        s.value=inp.value; s.touched=true; s.ticked=false; dirty(); } };
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
  const wrap=$('deetsCards'); if(!wrap||!CONT) return; wrap.innerHTML='';
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
  $('deetsDoor').classList.toggle('live', deetsAllLocked());
  feedStages();
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
    const rm=card.querySelector('.deets-rm'); if(rm) rm.onclick=()=>{ items.splice(i,1); dirty(); deetsRender(); };
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
      if(nv!==s.value||nt!==type){ s.value=nv; if(ty){ ty.value=nt; ty.ticked=true; } s.ticked=false; s.found=null; dirty(); }
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
        s.ticked=false; if(ty) ty.ticked=false; dirty(); deetsRender(); }));
    });
    card.appendChild(box);
  } else if(shown){
    const w=document.createElement('div'); w.className='deets-legwait'; w.textContent='Nothing to add. The standard footer covers it.'; card.appendChild(w);
  }
  if(items.length>base.repeat.min){
    const rm=document.createElement('a'); rm.className='deets-rm'; rm.title='Remove'; rm.innerHTML='&times;';
    rm.onclick=()=>{ items.splice(i,1); dirty(); deetsRender(); }; card.appendChild(rm);
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
      if(changed){ s.ticked=false; s.found=null; s.touched=true; dirty(); }
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
      dig.onclick=()=>{
        s.mode='view'; deetsRender();
        acc(0); feedDoor('search');
        const f=$('searchField'); if(f){ f.value=r.label||''; feedDumpDraw(); f.focus(); }
      };
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
    details: { facts:formData(), chosen:(TERMS_CHOSEN||[]).slice() } };
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

/* THE GHOST — the engine's drawing of the artefact's shape. It walks the
   html's data-module tags (CONT.ghost) and draws its own grey shape for
   each: a labelled pill, a strip, an image, some lines, a card. The
   vocabulary is the engine's; the order is the container's. Never wears
   the client. A repeating module draws once, count stated. */
const GH_IMG = h => `<div class="feed-gimg" style="height:${h}px">
  <svg class="x" preserveAspectRatio="none" viewBox="0 0 100 100">
    <line x1="0" y1="0" x2="100" y2="100" vector-effect="non-scaling-stroke"/>
    <line x1="100" y1="0" x2="0" y2="100" vector-effect="non-scaling-stroke"/></svg>
  <svg class="feed-gmtn" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2"/><circle cx="8.6" cy="9.4" r="1.5"/>
    <path d="M4.5 17l4.8-4.6 3.4 3.2 3.5-3.4 5.3 4.8"/></svg></div>`;
const GH_LINES = n => `<div class="feed-glines">${['w85','','w60'].slice(0,n).map(w=>`<div class="feed-gl ${w}"></div>`).join('')}</div>`;
const GH_PILL  = l => `<div class="feed-ghed"><span class="feed-in">${esc(l)}</span></div>`;
const GH_STRIP = l => `<div class="feed-gstrip"><span class="feed-in">${esc(l)}</span></div>`;
const GH_BTN   = () => `<span class="feed-gcta"><span class="feed-in">Button</span></span>`;
const ghLabel = m => m.replace(/-/g,' ').replace(/\bcta\b/,'button');

function feedGhostDraw(){
  const tags=CONT.ghost||[];
  const mods=CONT.modules||{all:[],writer:[],groups:[]};
  const opt=m=>{ const w=mods.writer.find(x=>x.module===m); return w&&w.options?w.options:1; };
  const group=mods.groups[0];              // one repeating module is plenty for now
  const parts=group?new Set(mods.all.filter(m=>m.module.startsWith(group.module+'-')).map(m=>m.module)):new Set();
  let bar='', body='', inCard=false;
  const isImg = m => /image|hero|pic|photo/.test(m);
  const isStrip = m => /^(header|wallet|salutation|readonline|banner|logo)$/.test(m);
  const isWrap  = m => /^(precopy|cards|intro|signoff)$/.test(m);
  tags.forEach(m=>{
    if(group && parts.has(m)) return;      // drawn by the card
    if(isWrap(m)) return;                  // a wrapper draws nothing
    if(/^(subject|preheader|readonline)$/.test(m)) return;   // inbox furniture, not the email
    if(group && m===group.module){
      const cg=(CONT.checklist.groups||[]).find(g=>g.repeat&&!g.repeat.where&&g.repeat.per.split(' ').pop()===group.module);
      const rng=cg?[0,cg.repeat.min,cg.repeat.max]:/(\d+)\s*[–-]\s*(\d+)/.exec(group.repeat||'');
      let card='';
      group.parts.forEach(p=>{
        const n=p.module.replace(group.module+'-','');
        if(/title|head/.test(n)) card+=GH_PILL(ghLabel(p.module));
        else if(/cta|button/.test(n)) card+=GH_BTN();
        else card+=GH_LINES(3);
      });
      if(tags.includes(group.module+'-image')) card+=GH_IMG(56);
      body+=`<div class="feed-gcards"><div class="feed-gcard">${card}</div><div class="feed-gmore">${rng?`${rng[1]}–${rng[2]} ${group.module}s`:`${group.module} × N`}</div></div>`;
      return;
    }
    if(/^(terms|legals|base|footer)$/.test(m)){ if(!body.includes('feed-gtcs')) body+=`</div><div class="feed-gtcs"><div class="feed-gl"></div><div class="feed-gl w85"></div><div class="feed-gl w45"></div>`; return; }
    if(isImg(m)){ body+=GH_IMG(84); return; }
    if(m==='headline'){ body+=GH_PILL('Headline'); return; }
    if(/button|cta/.test(m)){ body+=GH_BTN(); return; }
    if(isStrip(m)){ body+=GH_STRIP(ghLabel(m)); return; }
    body+=GH_LINES(3);                     // anything else is copy: three lines
  });
  $('feedGhost').innerHTML = (bar?`<div class="feed-gbar">${bar}</div>`:'') + '<div class="feed-gbody">' + body + '</div>';
}

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
  feedLand(d.found);
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
function feedLand(found){
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

let ARM=null, CRAFT=null, CRAFT_KEY='';

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
  fixInit(d, {menu:TERMS_MENU, termsFailed:TERMS_FAILED});
}

/* The blocks the tour walks: every writer module, in the html's order;
   a repeating module contributes one block per item per part, keyed
   "card-title#2"; the terms block last where the html has one. The
   copy store is what the WRITER returned — top modules by name (an
   options module is a list, PICK chooses), repeats under "<module>s". */
