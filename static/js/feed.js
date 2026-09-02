/* =====================================================================
   ROBOT — FEED IT
   The concertina: DUMP YOUR DOCS (docs, words, the search door), BOUNCE
   IDEAS (the FEEDER), LOCK THE DEETS (the checklist, the padlocks, the
   terms). Builds the brief; WRITE THE WORDS signs it and hands over.
   Reads CONT and CID; writes BRIEF. Never reads ASSET.
   ===================================================================== */

let MENU=[], CHOSEN=null;                      // the derived terms and the ticks — FEED IT's, not the brief's
const val = id => ($(id) ? $(id).value : '');

/* CONT is the container, straight off /api/container/<id>. Everything the
   room draws — the stops, the moves, the checklist rows, the modules, the
   ghost, the artefact — comes from it. Nothing below knows what a prize is. */
let CL_CONFIG={groups:[],legals:{title:'The legals',sub:''},types:[]};

let CLS = {};      // row id -> state, for the flat rows
let CLR = {};      // repeat key -> [ {row id -> state}, ... ], for the repeating groups
const newState = r => ({ value:r.type==='topics'?[]:'', sub:r.sub||'', other:'', ticked:false, mode:'view', found:null });

function clInit(){
  CL_CONFIG=CONT.checklist; CLS={}; CLR={};
  CL_CONFIG.groups.forEach(g=>{
    if(g.repeat){ CLR[repKey(g)] = CLR[repKey(g)] || []; return; }
    g.rows.forEach(r=>{ CLS[r.id]=newState(r); });
  });
}
const repKey = g => g.repeat.per.split(' ').pop();          // "prize card" -> card
const flatRows = () => CL_CONFIG.groups.filter(g=>!g.repeat).flatMap(g=>g.rows);
const clRow  = id => flatRows().find(r=>r.id===id) || CL_CONFIG.groups.flatMap(g=>g.rows).find(r=>r.id===id);
const clShown = (r,S) => !r.showIf || r.showIf.in.includes((S[r.showIf.row]||{}).value);
const clAsk   = r => r.ask||'';
/* select labels: the clause library's types name the options where it has
   them (movie -> Movie passes); otherwise the option is its own label */
function clOptions(r){
  const types=Object.fromEntries((CL_CONFIG.types||[]).map(t=>[t.value,t.label]));
  return (r.options||[]).map(o=>[o, types[o] || (o==='other'?'Other…':o)]);
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const clFmtDate = v => { if(!v) return '';
  const d=new Date(v+'T00:00'); return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]; };
/* a loose date ("20 September 2026", "20/9/26", "Sun 20 Sep") → ISO, or
   null. A net under the extract contract, never a guess: no year in the
   text means the next occurrence, same as the prompt says. */
function clDateISO(v){
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
const clFmtNum = v => { const x=Number(v); return Number.isInteger(x)&&x>=1&&x<=12 ? NUMWORDS[x] : String(v); };

/* derive — a suggestion, human-editable, human-ticked. Two rules:
   nextWorkday:<row>, and typeCounts (the prize type's ticket words). */
function clDerive(r,S){
  if(r.derive==='typeCounts'){
    /* a default, not a live derivation: it only ever overwrites its own
       last suggestion. Words off the dump, or the human's own, stand. */
    const s=S[r.id];
    if(s.touched) return;
    if(s.value && s.value!==s.seeded) return;
    const t=dzType(); if(!t) return;
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
let DZ={};                 // section key -> 'open' | 'edit' | 'locked'
let DZFLASH='';            // the section whose holes just refused a lock
let DZSTD=false;           // the standard-terms panel, peeked open

function dzSections(){
  const out=[], done=new Set();
  CL_CONFIG.groups.forEach(g=>{
    if(g.repeat){ const k=repKey(g); if(done.has(k)) return; done.add(k);
      out.push({key:'rep:'+k, title:k, kind:'repeat', rep:k}); return; }
    const rows=g.rows.filter(r=>r.type!=='legals');
    if(!rows.length) return;                      // a prose-only group draws nothing
    const shown=rows.filter(r=>clShown(r,CLS));
    let kind='facts';
    if(shown.length && shown.every(r=>r.type==='date')) kind='dates';
    else if(rows.some(r=>r.id.endsWith('_type')) && dzTemplate()) kind='sentence';
    out.push({key:'grp:'+g.title, title:g.title, kind, rows});
  });
  out.push({key:'legals', title:'The legals', kind:'legals'});
  return out;
}
const dzState = k => DZ[k] || (DZ[k]='open');
function dzAllLocked(){ return !!CONT && dzSections().every(s=>dzState(s.key)==='locked'); }

/* every row a section owns, with the state object it lives in */
function dzRows(sec){
  const out=[];
  if(sec.kind==='repeat'){
    const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===sec.rep);
    (CLR[sec.rep]||[]).forEach(S=>groups.forEach(g=>g.rows.forEach(r=>out.push({r,S}))));
  } else if(sec.rows){ sec.rows.forEach(r=>out.push({r,S:CLS})); }
  return out;
}
function dzHoles(sec){
  return dzRows(sec).filter(({r,S})=>clShown(r,S)&&!cellFilled(r,S)).map(x=>x.r);
}

/* ── the padlock loop — FIX IT's grammar verbatim: tap open or shut and you
   get the pencil; tap the pencil and it keeps. Opening one keeps the other:
   leaving locks. A section with a hole refuses — canon doesn't ship with a
   TBC in it — so the hole flashes and the robot says which one. ── */
function dzPadTap(key){
  const sec=dzSections().find(x=>x.key===key); if(!sec) return;
  PADLOCK.tap(dzState(key), {keep:()=>dzKeep(sec), open:()=>dzOpen(sec)});
}
function dzOpen(sec){
  dzSections().forEach(o=>{ if(o.key!==sec.key && dzState(o.key)==='edit') dzKeep(o); });
  DZ[sec.key]='edit'; DZFLASH='';
  dzRows(sec).forEach(({r,S})=>{ if(S[r.id]) S[r.id].ticked=false; });
  clRender();
}
function dzKeep(sec){
  const holes=dzHoles(sec);
  if(holes.length){
    DZ[sec.key]='edit'; DZFLASH=sec.key;
    fdSay(2, holes.length===1
      ? "Can't lock that with a hole in it — I still need the "+String(holes[0].label).toLowerCase()+"."
      : "Can't lock that yet — "+holes.length+" bits are still TBC.");
    clRender(); return;
  }
  DZ[sec.key]='locked'; DZFLASH='';
  dzRows(sec).forEach(({r,S})=>{ if(S[r.id]){ S[r.id].ticked=true; S[r.id].mode='view'; } });
  clArm(); clRender();
}
function dzPad(key, st){
  const b=document.createElement('button');
  b.className='dz-pad '+st;
  b.innerHTML = PADLOCK.face(st);
  const tip=PADLOCK.say[st];
  b.title=tip; b.setAttribute('aria-label',tip);
  b.onclick=()=>dzPadTap(key);
  return b;
}

/* ── THE PRIZE, in human ──────────────────────────────────────────────────
   The prize already has a definition: prize_line, the fixed clause that
   publishes in the terms — and which the client never got to see, because
   it hangs as a sub-bullet and the card filtered sub-bullets out. This is
   that definition in its other dress. Same facts, fewer formalities, so the
   two can differ in tone and never in substance. The words live in the
   container (sentence: per prize type), never here. ── */
function dzType(){
  const tr=flatRows().find(r=>r.id.endsWith('_type')); if(!tr) return null;
  const s=CLS[tr.id]; if(!s||!s.value) return null;
  return (CL_CONFIG.types||[]).find(x=>x.value===s.value)||null;
}
const dzTemplate = () => (dzType()||{}).sentence||'';

const dzFmtDate = v => { if(!v) return '';
  const d=new Date(v+'T00:00'); return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear(); };
function dzVal(id){
  if(id==='counts')     return (dzType()||{}).counts||'';
  if(id==='counts_one') return (dzType()||{}).counts_one||'';
  const r=clRow(id); if(!r) return '';
  const s=CLS[id]; if(!s||!s.value) return '';
  if(r.type==='date')   return clFmtDate(s.value);
  if(r.type==='number') return clFmtNum(s.value);
  if(r.type==='select') return s.value==='other' ? (s.other||'')
    : ((clOptions(r).find(o=>o[0]===s.value)||[])[1]||'');
  return s.value;
}
/* {id} a fact as the card shows it, {counts} the type's noun; [a/b] picks by
   winner count, the same switch the clauses use; [[ ]] is an optional run
   that vanishes whole when anything inside it is empty; *stars* bold. A
   missing fact outside an optional run reads TBC in red — the only alarm. */
function dzFill(tpl){
  const plural = Number(dzVal('winners')&&(CLS.winners||{}).value||1) > 1;
  let t=String(tpl).replace(/\[([^\[\]]*?\/[^\[\]]*?)\]/g,(m,g)=>{
    const parts=g.split('/'); return (plural?parts[1]:parts[0]).trim(); });
  t=t.replace(/\[\[(.*?)\]\]/g,(m,run)=>{
    let ok=true; run.replace(/\{(\w+)\}/g,function(_,id){ if(!dzVal(id)) ok=false; return ''; });
    return ok?run:''; });
  let html=t.replace(/\{(\w+)\}/g,(m,id)=>{
    const v=dzVal(id); return v?esc(v):'<span class="tbc">TBC</span>'; });
  return html.replace(/\*([^*]+)\*/g,'<b>$1</b>');
}

/* ── the section bodies ── */
function dzSentenceBody(box, sec, st){
  if(st==='edit') return dzFactsBody(box, sec, st);
  const p=document.createElement('div'); p.className='dz-prize';
  p.innerHTML=dzFill(dzTemplate());
  box.appendChild(p);
}
/* label left, value right, hairlines between. Filled rows sit in ink and
   shut up; only TBC is red. Open, they become the platform's own picker. */
function dzDatesBody(box, sec, st){
  const list=document.createElement('div'); list.className='dz-dates';
  sec.rows.filter(r=>clShown(r,CLS)).forEach(r=>{
    clDerive(r,CLS);
    const s=CLS[r.id];
    const row=document.createElement('div'); row.className='dz-drow';
    row.innerHTML='<span class="dz-dlabel">'+esc(r.label)+'</span>';
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
      v.className='dz-dval'+(s.value?'':' tbc');
      v.textContent=s.value?dzFmtDate(s.value):'TBC';
      row.appendChild(v);
    }
    list.appendChild(row);
  });
  box.appendChild(list);
}
/* the fact grid, unchanged — the rows keep their own edit loop. It draws
   where a group has no sentence to wear, and where the prize is open. */
function dzFactsBody(box, sec, st){
  const grid=document.createElement('div'); grid.className='cl-factgrid';
  sec.rows.filter(r=>clShown(r,CLS)&&!clTypeKnown(r,CLS)).forEach(r=>{
    clDerive(r,CLS); grid.appendChild(clRowEl(r,CLS)); });
  if(st!=='edit') grid.classList.add('inert');
  box.appendChild(grid);
}
function dzRepeatBody(box, sec, st){
  clRepeatCards(sec.rep).forEach(c=>box.appendChild(c));
  if(st!=='edit') box.classList.add('inert');
}
/* two forms, one lock. Standard terms are one quiet block naming the
   clauses — furniture, nothing to tick, "Read them" for the words as
   they'll print. Specific terms are the chips, and they are the only
   decisions in the section. */
function dzLegalsBody(box, sec, st){
  const fixedSrc = MENU.length ? MENU.filter(c=>c.fixed&&!c.sub) : (CL_CONFIG.legals.fixed||[]);
  box.innerHTML='<div class="cl-title">'+clTitle(CL_CONFIG.legals.fixedTitle||'Standard terms')+'</div>';
  const std=document.createElement('div'); std.className='dz-std';
  std.innerHTML=esc(dzStdLine(fixedSrc))+' ';
  const peek=document.createElement('span'); peek.className='dz-peek';
  peek.textContent=DZSTD?'Hide terms':'Read terms';
  peek.onclick=()=>{ DZSTD=!DZSTD; fixedSrc.forEach(c=>logPeek(c.id)); clRender(); };
  std.appendChild(peek); box.appendChild(std);
  const full=document.createElement('div'); full.className='dz-stdfull'+(DZSTD?' on':'');
  full.innerHTML=fixedSrc.map(c=>'<b>'+esc(clLabel(c))+'</b>'+clWords(c.text)).join('');
  box.appendChild(full);
  const t2=document.createElement('div'); t2.className='cl-title dz-t2';
  t2.innerHTML=clTitle(CL_CONFIG.legals.title||'Specific terms');
  box.appendChild(t2);
  const opt = MENU.length ? MENU.filter(c=>!c.fixed) : [];
  if(!opt.length && TERMS_FAILED){
    box.appendChild(errLine(STR.deets.terms_fail,{stick:true}));
  } else if(!opt.length){
    const w=document.createElement('div'); w.className='cl-legwait';
    w.textContent=TERMS_BUSY ? STR.deets.terms_wait : 'Finish the facts above and the legals sort themselves.';
    box.appendChild(w);
  } else {
    const row=document.createElement('div'); row.className='cl-pills'+(st==='edit'?'':' inert');
    opt.forEach(c=>{ const on=!!(CHOSEN&&CHOSEN.includes(c.id));
      row.appendChild(clPill(c,on,false,()=>toggleClause(c.id))); });
    box.appendChild(row);
  }
}
const clLabel = c => c.label || String(c.id).replace(/_/g,' ').replace(/^./,x=>x.toUpperCase());
/* the block names the clauses; it never prints them */
function dzStdLine(list){
  const names=list.map(c=>{ const l=clLabel(c);
    return /[A-Z]/.test(l.slice(1)) ? l : l.charAt(0).toLowerCase()+l.slice(1); });
  if(!names.length) return 'The standard terms ride along on every one of these.';
  const last=names.pop();
  const joined = names.length ? names.join(', ')+' and '+last : last;
  return joined.replace(/^./,c=>c.toUpperCase())+'. These are always included.';
}

function clRender(){
  const wrap=$('clCards'); if(!wrap||!CONT) return; wrap.innerHTML='';
  flatRows().forEach(r=>{ if(r.derive) clDerive(r,CLS); });
  dzSections().forEach(sec=>{
    const st=dzState(sec.key);
    const el=document.createElement('div');
    el.className='dz-sec '+st+(DZFLASH===sec.key?' flash':'');
    if(sec.kind!=='legals') el.innerHTML='<div class="cl-title">'+clTitle(sec.title)+'</div>';
    const body=document.createElement('div'); body.className='dz-body';
    if(sec.kind==='sentence')    dzSentenceBody(body, sec, st);
    else if(sec.kind==='dates')  dzDatesBody(body, sec, st);
    else if(sec.kind==='repeat') dzRepeatBody(body, sec, st);
    else if(sec.kind==='legals') dzLegalsBody(body, sec, st);
    else                         dzFactsBody(body, sec, st);
    el.appendChild(body);
    el.appendChild(dzPad(sec.key, st));
    wrap.appendChild(el);
  });
  $('clDoor').classList.toggle('live', dzAllLocked());
  fdStages();
}
function clTitle(t){
  const w=String(t).split(' '); if(w.length<2) return esc(t);
  return esc(w.slice(0,-1).join(' '))+' <em>'+esc(w[w.length-1])+'</em>';
}

/* a repeating group: one card per item (CARD 1, CARD 2…), the base rows,
   then any conditional group's rows when its condition holds. Items come
   from extraction or the + link; the group's min is the floor. */
function clRepeatCards(key){
  const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
  const base=groups.find(g=>!g.repeat.where)||groups[0];
  const items=CLR[key];
  while(items.length<base.repeat.min) items.push({});
  items.forEach(S=>{ groups.forEach(g=>g.rows.forEach(r=>{ if(!S[r.id]) S[r.id]=newState(r); })); });
  /* a prize story carries the draw clause by default; the human unticks */
  items.forEach(S=>{ const tr=groups.flatMap(g=>g.rows).find(r=>r.id.endsWith('_type')), tp=groups.flatMap(g=>g.rows).find(r=>r.type==='topics');
    if(tr&&tp&&S[tr.id].value==='prize'&&!S[tp.id].seeded){ S[tp.id].seeded=true;
      (CL_CONFIG.topics||[]).filter(x=>x.default&&(!x.when||x.when==='prize')).forEach(x=>{ if(!S[tp.id].value.includes(x.id)) S[tp.id].value.push(x.id); }); } });
  const cards=items.map((S,i)=>{
    const card=document.createElement('div'); card.className='cl-card';
    const typeRow=base.rows.find(r=>r.id.endsWith('_type'));
    const type=typeRow?(S[typeRow.id].value||''):'';
    const topicRow=groups.flatMap(g=>g.rows).find(r=>r.type==='topics');
    if(topicRow){ return clStoryCard(key,i,S,items,base,typeRow,topicRow); }
    card.innerHTML=`<div class="cl-title">${esc(key).toUpperCase()} <em>${i+1}</em>${type?`<span class="cl-tag">${esc(type)}</span>`:''}
      ${items.length>base.repeat.min?`<a class="cl-rm" title="Remove">&times;</a>`:''}</div>`;
    const rm=card.querySelector('.cl-rm'); if(rm) rm.onclick=()=>{ items.splice(i,1); dirty(); clRender(); };
    card.classList.add('facts');
    const grid=document.createElement('div'); grid.className='cl-factgrid';
    const liveRows=[];
    groups.forEach(g=>{
      const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return;
      g.rows.forEach(r=>{ if(r.type==='legals'||!clShown(r,S)) return; clDerive(r,S); liveRows.push(r); grid.appendChild(clRowEl(r,S)); });
    });
    card.appendChild(grid);
    return card;
  });
  if(items.length<base.repeat.max){
    const add=document.createElement('button'); add.className='cl-add';
    add.textContent=`+ another ${key}`;
    add.onclick=()=>{ items.push({}); clRender(); };
    cards.push(add);
  }
  return cards;
}

/* THE LINEUP — a story is one row: what it's about, its type as a tag,
   the circle tick; under it the legal topics as square chips. Click the
   words to edit subject and type. No title, no provenance. */
function clStoryCard(key,i,S,items,base,typeRow,topicRow){
  const card=document.createElement('div'); card.className='cl-card story';
  const subjRow=base.rows.find(r=>r.type==='text')||base.rows[0];
  const s=S[subjRow.id], ty=typeRow?S[typeRow.id]:null, tp=S[topicRow.id];
  const type=ty?ty.value:'';
  const row=document.createElement('div'); row.className='cl-row';
  const main=document.createElement('div'); main.className='cl-main'; row.appendChild(main);
  main.innerHTML=`<div class="cl-label">${esc(key)} ${i+1}</div>`;
  const valEl=document.createElement('div'); valEl.className='cl-value'; main.appendChild(valEl);
  const shown=s.value;
  if(s.mode==='edit'){
    const inp=document.createElement('input'); inp.type='text'; inp.value=s.value; inp.placeholder=(subjRow.ask||'').replace('{n}', i+1);
    valEl.appendChild(inp);
    let sel=null;
    if(typeRow){ sel=document.createElement('select');
      sel.innerHTML='<option value="">—</option>'+clOptions(typeRow).map(o=>`<option value="${esc(o[0])}" ${o[0]===type?'selected':''}>${esc(o[1])}</option>`).join('');
      sel.style.marginTop='6px'; valEl.appendChild(document.createElement('br')); valEl.appendChild(sel); }
    const save=()=>{ if(s.mode!=='edit') return;
      if(sel && document.activeElement===sel) return;
      const nv=inp.value.trim(), nt=sel?sel.value:type;
      if(nv!==s.value||nt!==type){ s.value=nv; if(ty){ ty.value=nt; ty.ticked=true; } s.ticked=false; s.found=null; dirty(); }
      s.mode='view'; clRender(); };
    inp.onblur=()=>setTimeout(save,80); if(sel) sel.onblur=()=>setTimeout(save,80);
    inp.onkeydown=e=>{ if(e.key==='Enter') inp.blur(); };
    setTimeout(()=>inp.focus(),0);
  } else {
    valEl.innerHTML = shown
      ? `<span class="cl-storyname">${esc(shown)}</span>${type?`<span class="cl-tag grey">${esc(type)}</span>`:''}`
      : `<span class="cl-ask">${esc((subjRow.ask||'').replace('{n}', i+1))}</span>`;
    valEl.onclick=()=>{ s.mode='edit'; clRender(); };
  }
  card.appendChild(row);
  const topics=(CL_CONFIG.topics||[]).filter(x=>!x.when||x.when===type);
  if(topics.length){
    const box=document.createElement('div'); box.className='cl-pills';
    topics.forEach(x=>{
      const on=tp.value.includes(x.id);
      box.appendChild(clPill(x,on,false,()=>{
        tp.value = on ? tp.value.filter(v=>v!==x.id) : tp.value.concat([x.id]);
        s.ticked=false; if(ty) ty.ticked=false; dirty(); clRender(); }));
    });
    card.appendChild(box);
  } else if(shown){
    const w=document.createElement('div'); w.className='cl-legwait'; w.textContent='Nothing to add. The standard footer covers it.'; card.appendChild(w);
  }
  if(items.length>base.repeat.min){
    const rm=document.createElement('a'); rm.className='cl-rm'; rm.title='Remove'; rm.innerHTML='&times;';
    rm.onclick=()=>{ items.splice(i,1); dirty(); clRender(); }; card.appendChild(rm);
  }
  return card;
}

function clRowEl(r,S){
  const s=S[r.id];
  const row=document.createElement('div'); row.className='cl-row';
  const main=document.createElement('div'); main.className='cl-main'; row.appendChild(main);
  const valEl=document.createElement('div'); valEl.className='cl-value'; main.appendChild(valEl);
  const isSel=r.type==='select', hasOther=isSel&&(r.options||[]).includes('other');

  if(s.mode==='view'){
    /* the fact is a pill: label + comms-clean value. Missing sits awake —
       dashed red, the ask inside. Click anywhere to update. The circle
       moved to the card; the row keeps no tick of its own. */
    const shown = isSel
      ? (s.value==='other' ? (s.other||'') : (clOptions(r).find(o=>o[0]===s.value)||[])[1])
      : s.value;
    let v;
    /* an unknown fact reads TBC, not its own question — a grid of asks is
       noise at a glance. The question survives as the edit placeholder. */
    if(!shown) v='<span class="cl-ask">TBC</span>';
    else if(r.type==='date') v=clFmtDate(s.value);
    else if(r.type==='number'){ const u=clUnit(r,S); v=esc(clFmtNum(shown)+(u?' '+u:'')); }
    else v=esc(shown);
    row.classList.add('pillrow'); if(!shown) row.classList.add('awake');
    valEl.innerHTML=`<span class="cl-pilllabel">${esc(r.label)}</span> <span class="cl-pillval">${v}</span>`;
    valEl.onclick=()=>{ s.mode='edit'; clRender(); };
  }
  else if(s.mode==='edit'){
    row.classList.add('pillrow','editing');
    let inp;
    if(isSel){
      inp=document.createElement('select');
      inp.innerHTML='<option value="">—</option>'+clOptions(r).map(o=>`<option value="${esc(o[0])}" ${o[0]===s.value?'selected':''}>${esc(o[1])}</option>`).join('');
    } else {
      inp=document.createElement('input');
      inp.type = r.type==='date'?'date':(r.type==='number'?'number':'text');
      if(r.type==='number') inp.min=1;
      inp.value=s.value; inp.placeholder=clAsk(r);
    }
    if(r.sub!==undefined){
      const si=document.createElement('input'); si.className='cl-subin';
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
    if(clAsk(r) && r.notsure){
      const ns=document.createElement('span'); ns.className='cl-notsure';
      ns.textContent='Not sure?';
      ns.onmousedown=e=>{ e.preventDefault(); s.mode='doors'; clRender(); };
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
      s.mode='view'; clRender();
    };
    inp.onblur=()=>setTimeout(save,80);
    if(otherIn) otherIn.onblur=()=>setTimeout(save,80);
    inp.onkeydown=e=>{ if(e.key==='Enter') inp.blur(); };
    if(otherIn) otherIn.onkeydown=e=>{ if(e.key==='Enter') otherIn.blur(); };
  }

  if(s.mode==='doors'){
    row.classList.add('pillrow','editing');
    valEl.innerHTML='';
    const panel=document.createElement('div'); panel.className='cl-doors';
    panel.innerHTML=`<div class="cl-doorline"><span class="cl-doorbot">${BOT_AV()}</span>
      <span>No sweat &mdash; ${esc(r.notsure)} Your call:</span></div>`;
    const btns=document.createElement('div'); btns.className='cl-doorbtns';
    const tell=document.createElement('button'); tell.textContent="I'll tell it";
    tell.onclick=()=>{ s.mode='edit'; clRender(); };
    btns.appendChild(tell);
    if(r.diggable){
      const dig=document.createElement('button'); dig.className='primary'; dig.textContent='Let it dig';
      /* The apologetic ask aims SEARCH: back to the dump, the search door
         open, the row's gap already in the field. Stop 3 to stop 1 is the
         concertina jump, and it's deliberate — the dig is the dump's job. */
      dig.onclick=()=>{
        s.mode='view'; clRender();
        acc(0); fdDoor('search');
        const f=$('srField'); if(f){ f.value=r.label||''; fdDumpDraw(); f.focus(); }
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
function clTypeKnown(r,S){
  if(!r.id.endsWith('_type')||r.type!=='select') return false;
  const s=S[r.id]; if(!s||!s.value||(s.value==='other'&&!s.other)) return false;
  if(!s.ticked){ s.ticked=true; }
  return true;
}
/* the noun a number wears: unit '@type' takes the current type's counts */
function clUnit(r,S){
  if(!r.unit) return '';
  if(r.unit!=='@type') return r.unit;
  const tr=Object.keys(S).find(k=>k.endsWith('_type')); if(!tr) return '';
  const t=(CL_CONFIG.types||[]).find(t=>t.value===S[tr].value);
  return t&&t.counts ? t.counts : '';
}

/* a clause pill: label; tap the label and the pill opens into the words
   as they'll print. Facts still unconfirmed read as an honest blank. */
const clWords = t => esc(String(t||'').replace(/\{\w+\}/g,'\u2026'));
let PEEKED = {};                       // id -> open, survives re-render
function clPill(cl, on, fixed, flip){
  const el=document.createElement('div');
  el.className='cl-pill'+(fixed?' fixed':on?' on':' off')+(PEEKED[cl.id]?' peeked':'');
  el.innerHTML=(fixed?'':`<span class="cl-ptick">${on?CL_CHECK:''}</span>`)+
    `<span class="cl-pbody"><button class="cl-pname">${esc(cl.label||String(cl.id).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()))}</button>
     <span class="cl-pwords">${clWords(cl.text)}</span></span>`;
  el.querySelector('.cl-pname').onclick=e=>{ e.stopPropagation();
    PEEKED[cl.id]=!PEEKED[cl.id]; el.classList.toggle('peeked'); logPeek(cl.id); };
  if(!fixed && flip){ el.querySelector('.cl-ptick').onclick=e=>{ e.stopPropagation(); flip(); }; }
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
    f[r.id]=clShown(r,CLS)?rowVal(r,CLS):''; if(r.sub!==undefined) f[r.id+'__sub']=CLS[r.id].sub; });
  Object.keys(CLR).forEach(key=>{
    const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    f[key]=CLR[key].map(S=>{ const o={};
      groups.forEach(g=>g.rows.forEach(r=>{ if(r.type==='legals'||!S[r.id]) return;
        o[r.id]=clShown(r,S)?rowVal(r,S):''; if(r.sub!==undefined) o[r.id+'__sub']=S[r.id].sub; }));
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
    sorted:  { point:st.point, insight:st.insight, angle:st.angle, steer:QBRIEF||null },
    details: { facts:formData(), chosen:(CHOSEN||[]).slice() } };
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
   human says nothing's missing — not when a counter says three. QTURNS is
   the whole record of it and the only state the server needs back. What
   lands is QBRIEF: the steer the WRITER writes from. */
let QZ=null, QTURNS=[], QBRIEF=null, QANGLE='', QNEED='point', QLAST='';
const FD_SLOT={point:'storyPoint', insight:'storyInsight', angle:'storyAngle'};
let ACC=0;                                // which stop is open

/* The concertina: one open, the rest closed, and all three reachable from
   the off. Wander in any order — the gate is the door, not the navigation.
   A stop is 'done' when it actually holds something, never because you
   happen to be standing past it. */
function fdDone(j){
  if(j===0) return !!fdDumpText().trim();
  if(j===1) return !!QBRIEF && !!String(QBRIEF.angle||'').trim();
  if(j===2) return dzAllLocked();
  return false;
}
function fdStages(){
  document.querySelectorAll('.fd-stage').forEach((st,j)=>{
    st.className='fd-stage '+(j===ACC?'on':fdDone(j)?'done':'todo');
  });
}
function acc(i){
  ACC=i; fdStages();
  if(i===2){ clRender(); armDetail(); }
}
/* the heads toggle: clicking the open stop shuts it, and ACC=-1 means
   all three are closed. acc() stays imperative — accReach() uses it to
   move you forward, and must never close a stop it was sent to open. */
function accToggle(i){ acc(ACC===i ? -1 : i); }
function accReach(i){ acc(i); if(i!==1) fdThink(false); }

/* The robot, saying one short thing in the stop you've just been sent to.
   Its own words, so they live here in the engine, never in config.md. */
const FD_SHORT=[
  [0, 'Nothing to write about yet.'],
  [1, "Let's quickly bounce it first."],
  [2, 'Just need to lock the deets.'],
];

function fdShort(){ return FD_SHORT.find(([j])=>!fdDone(j)) || null; }
function fdSay(j,line,stick){
  const st=document.querySelectorAll('.fd-stage')[j]; if(!st) return;
  const bod=st.querySelector('.fd-bod'); if(!bod) return;
  const old=$('fdSaid'); if(old){ clearTimeout(old._t); old.remove(); }
  const el=errLine(line,{stick:!!stick}); el.id='fdSaid';
  bod.insertBefore(el, bod.firstChild);
}

async function quizInit(){
  if(!CONT) return;
  QZ = CONT.quiz; QTURNS=[]; QBRIEF=null; QANGLE=''; QNEED='point'; ACC=0;
  fdBoxClear();
  $('fdChat').innerHTML=''; acc(0);
  if(QZ.tagline) $('fdTagline').textContent = QZ.tagline;
  (QZ.stops||[]).forEach((st,i)=>{
    const t=$('fdT'+i), su=$('fdS'+i);
    if(t) t.textContent=st.title||''; if(su) su.textContent=st.sub||'';
  });
  const pad=(QZ.stops&&QZ.stops[0]&&QZ.stops[0].pad)||{};
  $('fdBrowse').textContent  = pad.browse||'Browse';
  FD_LINE = pad.line||'or drag it in.';
  $('fdDump').placeholder    = pad.paste||'Cut and paste anything.';
  DUMPDOOR='docs'; FD_DOCS=[]; fdDocsDraw();
  $('fdDump').placeholder    = pad.paste||'Or paste it in here.';
  fdGhostDraw();
  fdToolsDraw();
}

/* THE GHOST — the engine's drawing of the artefact's shape. It walks the
   html's data-module tags (CONT.ghost) and draws its own grey shape for
   each: a labelled pill, a strip, an image, some lines, a card. The
   vocabulary is the engine's; the order is the container's. Never wears
   the client. A repeating module draws once, count stated. */
const GH_IMG = h => `<div class="fd-gimg" style="height:${h}px">
  <svg class="x" preserveAspectRatio="none" viewBox="0 0 100 100">
    <line x1="0" y1="0" x2="100" y2="100" vector-effect="non-scaling-stroke"/>
    <line x1="100" y1="0" x2="0" y2="100" vector-effect="non-scaling-stroke"/></svg>
  <svg class="fd-gmtn" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2"/><circle cx="8.6" cy="9.4" r="1.5"/>
    <path d="M4.5 17l4.8-4.6 3.4 3.2 3.5-3.4 5.3 4.8"/></svg></div>`;
const GH_LINES = n => `<div class="fd-glines">${['w85','','w60'].slice(0,n).map(w=>`<div class="fd-gl ${w}"></div>`).join('')}</div>`;
const GH_PILL  = l => `<div class="fd-ghed"><span class="fd-in">${esc(l)}</span></div>`;
const GH_STRIP = l => `<div class="fd-gstrip"><span class="fd-in">${esc(l)}</span></div>`;
const GH_BTN   = () => `<span class="fd-gcta"><span class="fd-in">Button</span></span>`;
const ghLabel = m => m.replace(/-/g,' ').replace(/\bcta\b/,'button');

function fdGhostDraw(){
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
      body+=`<div class="fd-gcards"><div class="fd-gcard">${card}</div><div class="fd-gmore">${rng?`${rng[1]}–${rng[2]} ${group.module}s`:`${group.module} × N`}</div></div>`;
      return;
    }
    if(/^(terms|legals|base|footer)$/.test(m)){ if(!body.includes('fd-gtcs')) body+=`</div><div class="fd-gtcs"><div class="fd-gl"></div><div class="fd-gl w85"></div><div class="fd-gl w45"></div>`; return; }
    if(isImg(m)){ body+=GH_IMG(84); return; }
    if(m==='headline'){ body+=GH_PILL('Headline'); return; }
    if(/button|cta/.test(m)){ body+=GH_BTN(); return; }
    if(isStrip(m)){ body+=GH_STRIP(ghLabel(m)); return; }
    body+=GH_LINES(3);                     // anything else is copy: three lines
  });
  $('fdGhost').innerHTML = (bar?`<div class="fd-gbar">${bar}</div>`:'') + '<div class="fd-gbody">' + body + '</div>';
}

/* the chat's only tool: the why-beat. The magnifying glass that used to sit
   beside it is gone on purpose. Digging is phase 1's job (the SEARCH door)
   and phase 3's (a row's 'let it dig'). The bounce enriches by finding gaps
   in what it has, not by going to the web — the angle comes from the person
   who knows the business. */
function fdToolsDraw(){
  const b=[];
  b.push(`<button class="fd-tool" title="Why this question?" onclick="fdWhy()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 9.2a3 3 0 1 1 3.6 3.1c-.8.2-1.1.8-1.1 1.7"/><circle cx="11.5" cy="17.6" r=".4" fill="currentColor"/></svg></button>`);
  $('fdTools').innerHTML=b.join('');
}

/* ---------- STOP 1: the landing pad ---------- */
/* The browser reads plain text itself. Everything else goes to /api/read,
   which turns Word, PDF and pictures into words server-side — so the dump
   stays a string and the FEEDER never learns about file formats. */
const FD_TEXT = f => /\.(txt|md|csv|markdown|log|json)$/i.test(f.name) || (f.type||'').startsWith('text/');
let FD_LINE='or drag it in.';
let FD_DOCS=[];                            // {name, text} — what's been dropped
async function fdTake(files){
  const pending=[];
  for(const f of files){
    if(FD_TEXT(f)){
      const t=await f.text();
      FD_DOCS.push({name:f.name, text:t.slice(0,12000)});
    }else{
      const d={name:f.name, text:'', wait:true};
      FD_DOCS.push(d); pending.push([d,f]);
    }
  }
  fdDocsDraw();
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
    d.wait=false; fdDocsDraw();
  }));
}
function fdDocsDraw(){
  $('fdDocs').innerHTML = FD_DOCS.map((d,i)=>
    `<div class="dump-row${d.bad?' bad':''}${d.wait?' wait':''}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
       <span class="dump-name">${esc(d.name)}</span>
       <button class="dump-x" onclick="fdDocDrop(${i});event.stopPropagation()" aria-label="Remove">&times;</button>
       <span class="dump-tick" aria-label="${d.wait?'Reading':d.bad?'Not read':'Read'}">${d.wait?'':'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-6.5"/></svg>'}</span>
     </div>`).join('')
    /* one line under the row for the first doc that didn't read — it
       asks for something, so it stays until the doc is dropped or replaced */
    + '';
  const bad=FD_DOCS.find(d=>d.bad);
  if(bad){ const w=document.createElement('div'); w.className='dump-bad'; w.appendChild(errLine(bad.why,{stick:true})); $('fdDocs').appendChild(w); }
  fdDumpDraw();
}
function fdDocDrop(i){ FD_DOCS.splice(i,1); fdDocsDraw(); fdStages(); }

/* ---- the three doors ----------------------------------------------------
   DOCS and WORDS open the box. SEARCH is hollow until the engine's web tool
   lands (hit list 9) — tapping it says so and leaves the open door alone. */
let DUMPDOOR='docs';
function fdDoor(d){
  DUMPDOOR=d; fdDumpDraw();
  if(d==='words') setTimeout(()=>{ const t=$('fdDump'); if(t) t.focus(); },0);
  if(d==='search') setTimeout(()=>{ const f=$('srField'); if(f&&SRSTAGE!=='looking') f.focus(); },0);
}
/* ---- SEARCH ------------------------------------------------------------
   ask -> plan -> looking -> hits, one grammar throughout: tick what we dig
   for, tick what's handy. Queries arrive UNTICKED — opt in, so nothing
   runs and nothing is spent that wasn't chosen. The field never leaves the
   screen: at any stage but looking, retype and hit the arrow for a fresh
   plan — that IS the way back. Everything landed lives in SR_FACTS, which
   is dump like any other dump; ticked facts ride across searches via
   SR_KEPT. Barred facts (prices) are filtered server-side and simply not
   shown — we don't perform the rules. */
let SRSTAGE='ask', SR_QS=[], SR_HITS=[], SR_FACTS=[], SR_KEPT=[], SR_DOING=-1;

function srDraw(){
  const ask=$('srAsk'); if(!ask) return;
  const f=$('srField'), go=$('srGo');
  ask.className='sr-ask on';
  if(f) f.disabled = SRSTAGE==='looking';
  if(go) go.disabled = SRSTAGE==='looking' || !(f&&f.value.trim());
  $('srHead').className='sr-head'+(SRSTAGE==='looking'?' on':'');
  if(SRSTAGE==='looking'&&!$('srHead').innerHTML) $('srHead').innerHTML=thinkFace();
  if(SRSTAGE!=='looking') $('srHead').innerHTML='';

  /* the subheads: a question over the plan, an instruction over the
     catch. Bebas in ink — a section signal, not a second title. */
  const sub=$('srSub');
  sub.className='sr-sub'+(SRSTAGE==='plan'||SRSTAGE==='hits'?' on':'');
  sub.textContent = SRSTAGE==='plan' ? 'What shall we dig for?'
                  : SRSTAGE==='hits' ? "Tick what's handy" : '';

  const list=$('srList');
  list.className='sr-list'+(SRSTAGE==='plan'||SRSTAGE==='looking'?' on':'');
  if(SRSTAGE==='plan'){
    /* opt-in: same tick furniture as the hits, so screen one teaches
       screen two. Nothing runs that wasn't chosen. */
    list.innerHTML=SR_QS.map((x,i)=>
      `<div class="sr-hit${x.on?' on':''}" role="button" tabindex="0" onclick="srQTick(${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();srQTick(${i});}">
         <span class="sr-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span><span class="sr-fact">${esc(x.q)}</span></span>
       </div>`).join('');
  } else if(SRSTAGE==='looking'){
    const run=SR_QS.filter(x=>x.on);
    list.innerHTML=run.map((x,i)=>{
      const st = i<SR_DOING?'done':i===SR_DOING?'doing':'';
      const ico = st==='done'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>';
      return `<div class="sr-line ${st}">${ico}${esc(x.q)}</div>`;
    }).join('');
  } else list.innerHTML='';

  /* GO DIGGING lives in the flow it commits, centred, and sits hollow
     until at least one search is ticked — the button teaches the rule. */
  const dig=$('srDig');
  if(dig){
    dig.style.display = SRSTAGE==='plan' ? '' : 'none';
    dig.classList.toggle('dormant', !SR_QS.some(x=>x.on));
  }

  const hits=$('srHits');
  hits.className='sr-hits'+(SRSTAGE==='hits'?' on':'');
  if(SRSTAGE==='hits'){
    /* a div, not a button: the source is a real link now, and a link
       can't legally live inside a button. Keyboard keeps its tick. */
    hits.innerHTML = SR_HITS.map((x,i)=>
      `<div class="sr-hit${x.on?' on':''}" role="button" tabindex="0" onclick="srTick(${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();srTick(${i});}">
         <span class="sr-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span><span class="sr-fact">${esc(x.fact)}</span>${srSrc(x)}</span>
       </div>`).join('');
  } else hits.innerHTML='';
}

function srQTick(i){ SR_QS[i].on=!SR_QS[i].on; srDraw(); }

/* the source line is the receipt — click it to read the page it came
   from, in a new tab. stopPropagation so checking never ticks. */
function srSrc(x){
  return x.url
    ? `<a class="sr-src" href="${esc(x.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(x.source)}</a>`
    : `<span class="sr-src">${esc(x.source)}</span>`;
}

async function srPlan(){
  if(SRSTAGE==='looking') return;
  const f=$('srField'), q=(f?f.value:'').trim(); if(!q) return;
  const go=$('srGo');
  if(go){ go.disabled=true; go.classList.add('spin'); }
  try{
    const d=await api('/api/search',{container:CID, stage:'plan', subject:q});
    if(!(d.queries||[]).length){ fdSay(0, STR.feed.plan_empty); }
    else{
      /* anything already ticked rides along to the next round */
      SR_HITS.filter(x=>x.on).forEach(({fact,source,url})=>{
        if(!SR_KEPT.some(k=>k.fact===fact)) SR_KEPT.push({fact,source,url});
      });
      SR_QS=d.queries.map(q=>({q, on:false})); SR_HITS=[]; SRSTAGE='plan';
    }
  }catch(e){ fdSay(0, e.code==='noplan' ? STR.feed.plan_empty : STR.feed.search_died, e.code!=='noplan'); }
  if(go) go.classList.remove('spin');
  fdDumpDraw();
}

async function srRun(){
  const run=SR_QS.filter(x=>x.on).map(x=>x.q);
  if(!run.length) return;
  SRSTAGE='looking'; SR_DOING=0; fdDumpDraw();
  /* the rows tick along on their own clock — the API doesn't report which
     search it's on, so this is honest about pace, not about position. */
  const tick=setInterval(()=>{ if(SR_DOING<run.length-1){ SR_DOING++; srDraw(); } }, 2600);
  try{
    const d=await api('/api/search',{container:CID, stage:'run',
      subject:($('srField').value||'').trim(), queries:run});
    /* kept facts land first, still ticked, so they can be unticked here.
       Barred facts never render — the server filters, we don't perform. */
    const kept=SR_KEPT.map(x=>Object.assign({on:true},x));
    const fresh=(d.facts||[]).filter(x=>!SR_KEPT.some(k=>k.fact===x.fact))
      .map(x=>Object.assign({on:false},x));
    SR_HITS=kept.concat(fresh); SR_KEPT=[];
    SR_FACTS=SR_HITS.filter(x=>x.on).map(({fact,source,url})=>({fact,source,url}));
    SRSTAGE='hits';
    if(!SR_HITS.length) fdSay(0, STR.feed.dig_empty);
  }catch(e){ fdSay(0, STR.feed.search_died, true); SRSTAGE='plan'; }
  clearInterval(tick); SR_DOING=-1; fdDumpDraw();
}

function srTick(i){
  SR_HITS[i].on=!SR_HITS[i].on;
  SR_FACTS=SR_HITS.filter(x=>x.on).map(({fact,source,url})=>({fact,source,url}));
  fdDumpDraw(); fdStages();
}

function fdDumpDraw(){
  const docs=FD_DOCS.length>0, words=!!($('fdDump')||{}).value.trim();
  const set=(id,on,has)=>{ const el=$(id); if(!el) return;
    el.className='dump-door'+(on?' on':has?' has':''); };
  set('fdDoorDocs',   DUMPDOOR==='docs',  docs);
  set('fdDoorWords',  DUMPDOOR==='words', words);
  set('fdDoorSearch', DUMPDOOR==='search', SR_FACTS.length>0);
  const vd=$('fdViewDocs'), vw=$('fdViewWords'), vs=$('fdViewSearch');
  if(vd) vd.className='dump-view'+(DUMPDOOR==='docs' ?' on':'')+(docs?' filled':'');
  if(vw) vw.className='dump-view'+(DUMPDOOR==='words'?' on':'')+(words?' filled':'');
  /* `filled` top-aligns the plate AND hides the baby icon (a pre-existing
     rule) — so it only goes on once the ask screen is behind us. */
  if(vs) vs.className='dump-view'+(DUMPDOOR==='search'?' on':'')+(SRSTAGE!=='ask'?' filled':'');
  srDraw();
  const plate=$('fdPlate');
  if(plate) plate.classList.toggle('filled', (DUMPDOOR==='docs'&&docs)
    ||(DUMPDOOR==='words'&&words)||(DUMPDOOR==='search'&&SRSTAGE!=='ask'));
  const line=$('fdPadLine');
  if(line) line.textContent = docs ? (QZ&&QZ.stops&&QZ.stops[0]&&QZ.stops[0].pad&&QZ.stops[0].pad.more)
    || 'or drag in another.' : (FD_LINE||'or drag it in.');
  const go=$('fdDumpGo');
  if(go){
    /* mid-search the card holds exactly one decision. DONE comes back
       once facts land or you're back at the ask. */
    const midflow = DUMPDOOR==='search' && (SRSTAGE==='plan'||SRSTAGE==='looking');
    go.style.display = midflow ? 'none' : '';
    go.classList.toggle('dormant', !(docs||words||SR_FACTS.length));
  }
  /* the mirror: the hidden field the robots read from tracks the dump
     live, so a fact ticked after DONE still reaches everyone. DONE is
     navigation now, not the courier. */
  const bl=$('blurb'); if(bl) bl.value=fdDumpText();
}
$('fdBrowse').addEventListener('click', e=>{ e.stopPropagation(); $('fdFile').click(); });
$('fdFile').addEventListener('change', async e=>{ await fdTake(e.target.files); e.target.value=''; });
{
  /* a file over the card, whichever door is open: DOCS takes it. */
  const card=$('fdCard0'), plate=$('fdPlate');
  const over=on=>{ if(plate) plate.classList.toggle('over',on);
    if(on && DUMPDOOR!=='docs'){ DUMPDOOR='docs'; fdDumpDraw(); plate.classList.add('over'); } };
  ['dragenter','dragover'].forEach(ev=>card.addEventListener(ev,e=>{e.preventDefault();over(true);}));
  ['dragleave','drop'].forEach(ev=>card.addEventListener(ev,e=>{e.preventDefault();over(false);}));
  card.addEventListener('drop', e=>fdTake(e.dataTransfer.files));
  const t=$('fdDump');
  if(t) t.addEventListener('input', ()=>{ fdDumpDraw(); fdStages(); });
}
/* the dump is everything on the pad: pasted words plus every readable doc */
function fdDumpText(){
  const parts=FD_DOCS.filter(d=>d.text).map(d=>`--- ${d.name} ---\n${d.text}`);
  /* found facts carry their source into the dump. The FEEDER and the WRITER
     never see a bare claim — if it can't say where it came from it never
     got this far. */
  if(SR_FACTS.length) parts.push('--- FOUND ---\n'
    + SR_FACTS.map(f=>`${f.fact} (${f.source})`).join('\n'));
  const typed=$('fdDump').value.trim();
  if(typed) parts.unshift(typed);
  return parts.join('\n\n');
}

async function fdDumpNext(){
  const dump=fdDumpText();
  if(!dump.trim()){ fdSay(0, FD_SHORT[0][1]); return; }
  $('blurb').value=dump; dirty();
  $('fdDumpGo').disabled=true;
  accReach(1);
  /* the first turn. The robot reads the dump against what the container
     needs and opens on the point — usually by stating it, because it has
     read the thing and an empty question would prove it hadn't. The same
     read fills the checklist, so there's no second silent call any more. */
  QTURNS=[]; QBRIEF=null;
  fdThink(true);
  let d;
  try{ d = await api('/api/feeder',{container:CID, dump:dump, turns:[]}); }
  catch(e){ d = {ask:fdPlain('point'), need:'point', fell:true}; }
  fdThink(false);
  fdAsk(d);
  if(d.fell) fdSay(1, STR.feed.feeder);
  $('fdDumpGo').disabled=false;
}

/* ---------- STOP 2: the chat ---------- */
const fdScroll=()=>{ const c=$('fdChat'); c.scrollTop=c.scrollHeight; };
function fdBubble(html, me){
  const row=document.createElement('div');
  row.className='chat-row'+(me?' me':'');
  row.innerHTML = me ? `<div class="chat-msg"></div>` : FD_ROBOT()+`<div class="chat-msg">${html}</div>`;
  if(me) row.querySelector('.chat-msg').textContent=html;
  $('fdChat').appendChild(row); fdScroll();
}
/* thinking — the face does it, same pool as FIX IT (thinkFace) */
function fdThink(on){
  $('fdChat').querySelectorAll('.chat-think').forEach((x,i)=>{ if(!on||i>0) x.remove(); });
  let t=$('fdChat').querySelector('.chat-think');
  if(on&&!t){ t=document.createElement('div'); t.className='chat-row chat-think';
    t.innerHTML=RAIL.think();
    $('fdChat').appendChild(t); fdScroll(); }
  if(!on&&t) t.remove();
}

/* the container's own words for a need — the silent fallback whenever the
   robot can't speak, and the source of the why-beat. */
const fdNeed = n => (QZ&&QZ.bounce||[]).find(b=>b.need===n) || {};
const fdPlain = n => fdNeed(n).plain || "What's this all about?";

/* one bubble a turn: the reaction, then the ask. When the robot proposes an
   angle it rides in the same bubble — inline, in quotes, in ink. Not a red
   block: red would make a suggestion look like the answer, and this one is
   there to be talked over. */
function fdAsk(d){
  fdThink(false);
  QNEED = d.need || QNEED;
  let html='';
  if(d.react) html+=`<span class="confirm">${esc(d.react)}</span>`;
  QANGLE = (d.angle||'').trim();
  /* a proposition dropped in cold reads like a verdict, so the robot walks
     you into it. The quotes are ours, not its — it's told to hand the angle
     over plain. */
  if(QANGLE) html+=`${esc((d.lead||"I'm thinking").trim())} <i class="angle">\u201c${esc(QANGLE)}\u201d</i>. `;
  QLAST = d.ask||fdPlain(QNEED);
  html+=esc(QLAST);
  fdBubble(html);
  const box=$('fdBox');
  box.placeholder=fdNeed(QNEED).placeholder||''; box.focus();
  /* DONE once the angle is on the table — the last need, and usually the
     same beat as 'anything I've missed'. */
  $('fdGo').textContent = QNEED==='angle' ? 'DONE' : 'NEXT';
}

/* the close. The bounce ends on the human's word, so this only runs when
   the robot has said it's got what it needs and been told nothing's
   missing. The brief is what lands; the raw material travels whole and
   separately, and the checklist facts outrank both. */
function fdClose(d){
  QBRIEF = d.brief || {point:'', insight:'', angle:QANGLE};
  if(!String(QBRIEF.angle||'').trim()) QBRIEF.angle = QANGLE;
  Object.keys(FD_SLOT).forEach(k=>{
    const slot=$(FD_SLOT[k]); if(slot) slot.value = String(QBRIEF[k]||'').trim();
  });
  dirty(); fdStages();
}

/* the composer is the height of what's in it, up to the cap the CSS sets.
   A paste used to be sliced through the middle of the third line. */
function fdGrow(){
  const b=$('fdBox'); if(!b) return;
  b.style.height='auto';
  b.style.height=Math.min(b.scrollHeight, 150)+'px';
}
/* emptying it is emptying it — the height has to come back too, or the box
   keeps the shape of the answer you just sent. */
function fdBoxClear(){
  const b=$('fdBox'); if(!b) return;
  b.value=''; b.style.height='';
}

let FDBUSY=false;
async function fdNext(){
  if(!QZ || FDBUSY) return;
  const a=$('fdBox').value.trim();
  if(a) fdBubble(a, true);
  QTURNS.push({ask:QLAST, answer:a});
  /* it's been said, so it leaves the box now — not later, and not only on
     the paths that happen to ask another question. Closing the bounce used
     to leave your last answer sitting there looking unsent.

     The box stays open while the robot thinks. It used to be emptied again
     when the answer landed, which quietly ate anything typed during the
     wait; now nothing clears it but sending, so a draft survives. FDBUSY
     stops a second send rather than the keyboard. */
  fdBoxClear();
  const box=$('fdBox');
  FDBUSY=true; $('fdGo').disabled=true;
  fdThink(true);
  let d;
  try{ d = await api('/api/feeder',{container:CID, dump:val('blurb'), turns:QTURNS}); }
  catch(e){ d = {ask:fdPlain(QNEED), need:QNEED, fell:true}; }
  fdThink(false);
  if(d.fell) fdSay(1, STR.feed.feeder);
  fdLand(d.found);
  if(d.done){
    fdClose(d);
    if(d.react) fdBubble(esc(d.react));
    if(QZ.closing) fdBubble(esc(QZ.closing));
    accReach(2);
  }else{
    fdAsk(d);
  }
  FDBUSY=false; $('fdGo').disabled=false;
}

/* the ? — the why-beat, answered in the chat, from config. Help as
   conversation, not modal. The robot names which need it's on, so the
   why-beat follows the conversation rather than a counter. */
function fdWhy(){
  const w=fdNeed(QNEED).why;
  if(w) fdBubble(esc(w));
}

/* the bounce → the checklist. The FEEDER reads the dump for the checklist
   on the same call it reads it for the conversation, so this lands as the
   chat goes rather than from a second silent pass. There used to be one:
   /api/extract ran blind and in parallel, and you found out it was wrong
   at stop 3. Now the robot's confirm at the point IS the check on it.

   The rule is untouched: a robot-found fact never arrives ticked, it
   carries its provenance, and a value the human has already put in is
   never overwritten. Suggestion, not gate. */
function fdLand(found){
  const f = found || {};
  if(!Object.keys(f).length) return;
  const land=(S,r,v)=>{ if(!S[r.id]) return;
    if(r.type==='topics'){ if(Array.isArray(v)&&v.length&&!S[r.id].value.length) S[r.id].value=v.slice(); return; }
    if(r.type==='date'&&v) v=clDateISO(v)||'';
    if(v && !S[r.id].value){ S[r.id].value=String(v); S[r.id].found='from your docs'; S[r.id].ticked=false; } };
  flatRows().forEach(r=>land(CLS,r,f[r.id]));
  Object.keys(CLR).forEach(key=>{
    const rows=f[key]; if(!Array.isArray(rows)||!rows.length) return;
    const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    if(!groups.length) return;
    const max=groups[0].repeat.max;
    while(CLR[key].length<Math.min(rows.length,max)) CLR[key].push({});
    rows.slice(0,max).forEach((item,i)=>{ const S=CLR[key][i];
      groups.forEach(g=>g.rows.forEach(r=>{ if(!S[r.id]) S[r.id]=newState(r); land(S,r,item[r.id]); })); });
  });
}

/* ---------------- nothing flies without a tick ---------------- */
/* a row is filled when it has a value — or when the container never asked
   it to (locked: no). The prize tier is the only optional row on the card,
   and a blank tier must not hold the whole stop hostage. */
const cellFilled = (r,S) => { if(r.type==='legals'||r.type==='topics'||!clShown(r,S)) return true;
  const s=S[r.id]; if(!s) return true;
  if(!r.locked) return true;
  return r.type==='select' ? !!(s.value&&(s.value!=='other'||s.other)) : !!s.value; };
/* ticked now means *locked* — the section's padlock sets it, nothing else. */
const rowReady = (r,S) => { if(r.type==='legals'||r.type==='topics'||!clShown(r,S)) return true;
  const s=S[r.id]; if(!s) return true;
  return cellFilled(r,S) && s.ticked; };
/* every fact in, padlocks or not. This is what starts the writer. */
function factsComplete(){
  if(!CONT) return false;
  if(!flatRows().every(r=>cellFilled(r,CLS))) return false;
  return Object.keys(CLR).every(key=>{
    const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    return CLR[key].every(S=>groups.every(g=>{ const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return true;
      return g.rows.every(r=>cellFilled(r,S)); }));
  });
}
function detailReady(){
  if(!CONT) return false;
  if(!flatRows().every(r=>rowReady(r,CLS))) return false;
  return Object.keys(CLR).every(key=>{
    const groups=CL_CONFIG.groups.filter(g=>g.repeat&&repKey(g)===key);
    return CLR[key].every(S=>groups.every(g=>{ const w=g.repeat.where;
      if(w && String((S[w.row]||{}).value)!==w.is) return true;
      return g.rows.every(r=>rowReady(r,S)); }));
  });
}

let ARM=null, CRAFT=null, CRAFT_KEY='';

/* TERMS_FAILED is the difference between 'not yet' and 'can't' — without
   it a dead /api/terms wore the unfinished-facts costume and lied. */
let TERMS_FAILED=false, TERMS_BUSY=false;
async function refreshLegals(){
  const filled = flatRows().every(r=>cellFilled(r,CLS));
  if(!filled){ MENU=[]; TERMS_FAILED=false; clRender(); return; }
  TERMS_BUSY=true; clRender();
  try{
    const d = await api('/api/terms',{container:CID, form:formData()});
    MENU=d.menu; FACTS=d.facts; TERMS_FAILED=false;
    if(CHOSEN===null) CHOSEN = MENU.filter(c=>!c.fixed && c.default).map(c=>c.id);
  }catch(e){ MENU=[]; TERMS_FAILED=true; }
  TERMS_BUSY=false; clRender();
}

function toggleClause(id){
  CHOSEN = CHOSEN.includes(id) ? CHOSEN.filter(x=>x!==id) : CHOSEN.concat([id]);
  clRender();
}

/* ---------------- background crafting ----------------
   The robot starts writing the moment the facts are complete — before the
   padlocks shut, while the human is still reading the legals. Waiting for
   the locks would hand them the whole Opus wait at the door. */
function clArm(){ armDetail(); }
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
  const typed=fdDumpText().trim();
  if(typed && !val('blurb').trim()){ $('blurb').value=typed; CRAFT=null; CRAFT_KEY=''; }
  /* every stop has to hold something. Press early and the robot names the
     short one and opens it — the line explains, the navigation solves. */
  const short=fdShort();
  if(short){ acc(short[0]); fdSay(short[0], short[1]); return; }
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
      fxFail(buildIt);
      return;
    }
  }
  await thinkEnd(beat);
  reach(1);
  /* the handover: the signed brief is in BRIEF; the WRITER's result and the
     engine's terms menu go across as the seed of the asset */
  fxInit(d, {menu:MENU, termsFailed:TERMS_FAILED});
}

/* The blocks the tour walks: every writer module, in the html's order;
   a repeating module contributes one block per item per part, keyed
   "card-title#2"; the terms block last where the html has one. The
   copy store is what the WRITER returned — top modules by name (an
   options module is a list, PICK chooses), repeats under "<module>s". */
