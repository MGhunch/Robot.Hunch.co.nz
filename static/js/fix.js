/* =====================================================================
   ROBOT — FIX IT
   The copy room: the plate, the padlocks in the gutter, the rail and its
   threads, the drawer, the FIXER. Takes the signed brief and the WRITER's
   result at fixInit(); builds and keeps the asset. Reads BRIEF and ASSET
   and nothing else of FEED IT's — the grep gate in CHANGES-v035 says which
   names are off limits.
   ===================================================================== */

/* The copy keeps its {slots} underneath — that's the bulletproof rule — but
   the room shows the filled facts, marked so you know the robot can't have
   got them wrong. ASSET.context is copy_context(facts), off /api/copy. */
const ctx = k => (ASSET ? ASSET.context : {})[k] ?? k;
const fillPh = t => esc(t).replace(/\{(\w+)\}/g,(m,k)=>`<span class="ph">${esc(ctx(k))}</span>`);
const fillPlain = t => String(t??'').replace(/\{(\w+)\}/g,(m,k)=>String(ctx(k)));
const hasPh = t => /\{\w+\}/.test(String(t??''));

const FIX_HISTORY = {};                               // per-section tweak history, for the FIXER's memory

/* the tabs over THE WORK: one per output in the spec */
function fixTabs(){
  const tabs=document.querySelector('.fix-tabs'); if(!tabs) return;
  tabs.innerHTML=(CONT.outputs||[]).map((o,i)=>`<span class="fix-loz ${i?'off':''}">${esc(o.id)}</span>`).join('');
}

/* ================= THE ASSET =================
   What FIX IT hands over: the WRITER's copy as tweaked, the filled slots,
   the FIXER's cautions, the engine's terms menu, the padlocks, the tweak
   log and the pick — all tagged with the `v` of the brief it was written
   from, so staleness is a comparison, not a guess. The artefact document
   and the threads are FIX IT's working state, not the asset. FILE IT
   reads ASSET and BRIEF, nothing else. */
let ASSET=null;
let FIX_ORDER=[], FIX_LABELS={}, FIX_HL=null, FIX_DIFF={}, FIX_WHY={};
let FIX_FOCUS=null, FIX_THREAD={};                     // the pencil, and one thread per section
let FIX_DOC=null;                                   // the artefact's document (iframe)
const fixMod = k => k.split('#')[0];
const fixN   = k => +(k.split('#')[1]||0);
function fixLabel(k){
  const m=fixMod(k), n=fixN(k);
  const nice=m.replace(/-/g,' ').replace(/\bcta\b/,'button').replace(/\bcopy\b/,'');
  const s=nice.trim().replace(/^\w/,c=>c.toUpperCase());
  return n ? s.replace(/^(\w+)/, `$1 ${n}`) : s;
}
function fixOrderBuild(){
  const mods=CONT.modules, tags=CONT.ghost, group=mods.groups[0];
  const isWriter=m=>mods.writer.some(w=>w.module===m);
  FIX_ORDER=[];
  tags.forEach(t=>{
    if(isWriter(t)) FIX_ORDER.push(t);
    else if(group && t===group.module){
      const items=ASSET.copy[group.module+'s']||[];
      items.forEach((_,i)=>group.parts.forEach(p=>{ if(tags.includes(p.module)) FIX_ORDER.push(p.module+'#'+(i+1)); }));
    }
    else if(t==='terms' && ASSET.menu.length && !FIX_ORDER.includes('terms')) FIX_ORDER.push('terms');
  });
  FIX_LABELS={}; FIX_ORDER.forEach(k=>FIX_LABELS[k]=fixLabel(k));
}
const fixOpts = m => { const w=CONT.modules.writer.find(x=>x.module===m); return w?w.options||0:0; };
function fixText(k){
  const m=fixMod(k), n=fixN(k);
  if(k==='terms') return fixTermsText();
  if(n){ const g=CONT.modules.groups[0]; const it=(ASSET.copy[g.module+'s']||[])[n-1]||{}; return it[m]||''; }
  const v=ASSET.copy[m]; return Array.isArray(v) ? (v[ASSET.pick]||'') : (v||'');
}
function fixSet(k,text){
  const m=fixMod(k), n=fixN(k);
  if(n){ const g=CONT.modules.groups[0]; ASSET.copy[g.module+'s'][n-1][m]=text; return; }
  if(Array.isArray(ASSET.copy[m])) ASSET.copy[m][ASSET.pick]=text; else ASSET.copy[m]=text;
}
const fixShow = k => FIX_DIFF[k] ? fixDiffWords(FIX_DIFF[k].old, FIX_DIFF[k].new) : fillPh(fixText(k));
function fixTermsText(){
  const menu=ASSET?ASSET.menu:[], chosen=BRIEF?BRIEF.details.chosen:[];
  if(!menu.length) return 'Terms assemble from the brief once the facts are in.';
  return menu.filter(c=>c.fixed || chosen.includes(c.id)).map(c=>c.text).join(' ');
}
const fixLockable = k => k!=='terms';
function fixBeat(){ return FIX_ORDER.find(k=>fixLockable(k) && !ASSET.locks[k] && k!==FIX_FOCUS) || null; }

/* the craft died before anything landed: the plate card in the artefact's
   slot, the rail and gutter cleared. The tab pill goes with the card. */
function fixFail(retry){
  $('fixGutter').innerHTML=''; $('fixChat').innerHTML=''; fixTopicSet(null);
  $('fixArt').innerHTML='';
  $('fixArt').appendChild(robotCard('plate', retry, 'copy', {container:CID, run:RUN,
    onGone:()=>{ const t=document.querySelector('.fix-tabs'); if(t) t.innerHTML=''; } }));
}
function fixInit(d, h){
  h=h||{};
  ASSET={ brief_v:BRIEF?BRIEF.v:'', copy:d.copy, facts:d.facts||{}, context:d.context||{},
          flags:d.flags||[], menu:h.menu||[], locks:{}, tweaks:[], pick:0 };
  FIX_WHY=(ASSET.copy.why&&typeof ASSET.copy.why==='object')?ASSET.copy.why:{};
  fixOrderBuild();
  FIX_ORDER.forEach(k=>ASSET.locks[k]=(k==='terms'));   // terms travel locked
  FIX_HL=null; FIX_DIFF={};
  FIX_FOCUS=null; FIX_THREAD={};
  $('fixChat').innerHTML=''; fixTopicSet(null); fixQuoteSet(null);
  fixMount(()=>{ drawFix(); if(h.termsFailed) fixErr(STR.fix.terms_fail); });
}

const fixDiffWords=(o,n)=>{
  const tok=x=>String(x??'').split(/(\s+)/); const a=tok(o),b=tok(n);
  const m=a.length,k=b.length;
  const dp=Array.from({length:m+1},()=>new Array(k+1).fill(0));
  for(let i=m-1;i>=0;i--)for(let j=k-1;j>=0;j--)
    dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0,out='';
  while(j<k){
    if(i<m&&a[i]===b[j]){out+=fillPh(b[j]);i++;j++;}
    else if(i<m&&dp[i+1][j]>=dp[i][j+1]){i++;}
    else{out+=b[j].trim()===''?esc(b[j]):'<mark class="fix-ch">'+fillPh(b[j])+'</mark>';j++;}
  }
  return out;
};

/* THE ARTEFACT — the container's html in an iframe, so its skin can't
   bleed into the engine and the engine's can't bleed into it. The engine
   adds one stylesheet inside for its marks (changes, highlights, the
   editing tint) and pours the copy into the data-module tags. */
const FIX_INNER_CSS=`.fix-sec{position:relative;transition:transform .18s ease,box-shadow .18s ease}
.fix-sec.editing{transform:scale(1.025);z-index:2;box-shadow:0 14px 34px rgba(120,10,14,.35);border-radius:10px;background:inherit}
body.fix-editing .email,body.fix-editing .precopy{overflow:visible!important}
.email,.precopy{box-shadow:0 14px 44px rgba(0,0,0,.2)}
.fix-sec.flash{animation:fxlanded .7s ease-out}@keyframes fxlanded{0%{background:rgba(237,28,36,.18)}100%{background:transparent}}
mark.fix-ch{background:#FFE96B;color:inherit;border-radius:2px;padding:0 1px}.ph{cursor:not-allowed}
body{padding:0 22px 26px!important;background:transparent!important}`;
function fixMount(then){
  const host=$('fixArt'); host.innerHTML='<iframe class="fix-frame" title="The work" scrolling="no"></iframe>';
  const fr=host.querySelector('iframe');
  fixWrite(fr, CONT.html.replace('</head>', `<style>${FIX_INNER_CSS}</style></head>`));
  FIX_DOC=fr.contentDocument; fixPrepDoc(); fixSizeFrame(); then&&then();
}
/* document.write into the frame: same-origin, synchronous, no srcdoc
   timing to wait on, and the brand's fonts resolve off the site root */
function fixWrite(fr, html){
  const D=fr.contentDocument; D.open(); D.write(html); D.close();
}
function fixSizeFrame(){
  const fr=$('fixArt').querySelector('iframe'); if(!fr||!FIX_DOC) return;
  const art=FIX_DOC.querySelector('.email,.precopy,[data-artefact]');
  const w=art ? art.getBoundingClientRect().width : 600;
  document.documentElement.style.setProperty('--fx-w', Math.round(w+44)+'px');
  fr.style.height=Math.max(200, FIX_DOC.documentElement.scrollHeight)+'px';
}
/* first pass on the doc: clone or cull repeated items to match the copy,
   wrap each tour block as .fix-sec with its key, listen for highlights */
function fixPrepDoc(){
  const D=FIX_DOC, group=CONT.modules.groups[0];
  D.querySelectorAll('.email,.precopy,body').forEach(el=>{ el.style.margin='0 auto'; });
  if(group){
    const items=ASSET.copy[group.module+'s']||[];
    const els=[...D.querySelectorAll(`[data-module="${group.module}"]`)];
    const wrap=el=>el.closest('.cardwrap')||el;
    while(els.length<items.length && els.length){ const c=wrap(els[els.length-1]).cloneNode(true); wrap(els[els.length-1]).after(c); els.push(c.matches(`[data-module="${group.module}"]`)?c:c.querySelector(`[data-module="${group.module}"]`)); }
    while(els.length>items.length && els.length>1){ wrap(els.pop()).remove(); }
    els.forEach((el,i)=>{ el.dataset.card=String(i+1);
      const it=(ASSET.facts[group.module]||[])[i]||{}; const tr=Object.keys(it).find(k=>k.endsWith('_type'));
      if(tr) el.dataset.type=it[tr];
      group.parts.forEach(p=>{ const t=el.querySelector(`[data-module="${p.module}"]`); if(t){ t.classList.add('fix-sec'); t.dataset.k=p.module+'#'+(i+1); } });
    });
  }
  FIX_ORDER.filter(k=>!fixN(k)).forEach(k=>{
    const m=k==='terms'?null:fixMod(k);
    const els = m ? [...D.querySelectorAll(`[data-module="${m}"]`)] : [D.querySelector('[data-module="terms"]')];
    els.forEach(el=>{ if(el){ el.classList.add('fix-sec'); el.dataset.k=k; } });
  });
  D.addEventListener('mouseup', fixSelect);
}
/* pour: every tour block gets its current copy (diff-marked if tweaked);
   a two-option module fills its data-variant twins */
function fixPour(){
  const D=FIX_DOC; if(!D) return;
  FIX_ORDER.forEach(k=>{
    const els=[...D.querySelectorAll(`.fix-sec[data-k="${k}"]`)]; if(!els.length) return;
    const m=fixMod(k);
    els.forEach(el=>{
      if(k!=='terms' && !fixN(k) && fixOpts(m)===2 && el.dataset.variant){
        const i=el.dataset.variant==='B'?1:0; const v=(ASSET.copy[m]||[])[i]||'';
        el.innerHTML=(el.querySelector('.l')?el.querySelector('.l').outerHTML:'')+fillPh(v); return;
      }
      if(k==='terms'){ el.innerHTML=esc(fixTermsText()).replace(/\n/g,'<br>'); if(ASSET.locks.terms) el.classList.add('locked-look'); return; }
      const raw=fixShow(k);
      el.innerHTML = raw.includes('\n') ? raw.replace(/\n/g,'<br>') : raw;
      el.classList.toggle('editing', FIX_FOCUS===k);
    });
  });
  D.body.classList.toggle('fix-editing', !!FIX_FOCUS);
  fixSizeFrame();
}
function fixSelect(){
  const sel=FIX_DOC.getSelection();
  if(!sel || sel.isCollapsed) return;
  const txt=sel.toString().trim();
  if(!txt || txt.length<2) return;
  const node=sel.anchorNode && sel.anchorNode.parentElement; if(!node) return;
  if(node.closest('.ph')){ sel.removeAllRanges(); fixDeflect(); return; }
  const sec=node.closest('.fix-sec'); if(!sec) return;
  const k=sec.dataset.k;
  if(k==='terms'){ sel.removeAllRanges(); fixDeflect(); return; }
  sel.removeAllRanges();
  const snapped=fixSnap(sec.textContent, txt);
  fixFocus(k, snapped.length>60 ? snapped.slice(0,57)+'\u2026' : snapped);
}

function drawFix(){
  fixPour();
  fixGutterDraw();
  fixRailDraw();
  requestAnimationFrame(fixPos);
}

/* ── the gutter: one padlock per section, one loop — open → pencil →
   shut → pencil → shut. Tap open or shut: the pencil. Tap the pencil:
   keep it. Leave any other way: it shuts behind you. Terms travel
   locked and deflect. ── */
const FIX_ICON = PADLOCK.icon;      // FIX IT's own name for the one icon set
function fixPadState(k){
  if(!fixLockable(k)) return 'fixed';
  if(FIX_FOCUS===k) return 'edit';
  return ASSET.locks[k] ? 'locked' : 'open';
}
function fixGutterDraw(){
  $('fixGutter').innerHTML = FIX_ORDER.map(k=>{
    const st=fixPadState(k), tip=PADLOCK.say[st];
    return `<button class="fix-pad ${st}" data-k="${k}" onclick="fixPadTap('${k}')" title="${tip}" aria-label="${tip}: ${FIX_LABELS[k]}">
      ${PADLOCK.face(st)}</button>`;
  }).join('');
}
function fixPadTap(k){
  PADLOCK.tap(fixPadState(k), {open:()=>fixFocus(k), keep:fixKeep, deflect:fixDeflect});
}
function fixPos(){
  const fr=$('fixArt').querySelector('iframe'); if(!fr||!FIX_DOC) return;
  const top=fr.getBoundingClientRect().top - $('fixArt').getBoundingClientRect().top;
  document.querySelectorAll('#fixGutter .fix-pad').forEach(b=>{
    const sec=FIX_DOC.querySelector(`.fix-sec[data-k="${b.dataset.k}"]`); if(!sec){ b.style.display='none'; return; }
    const r=sec.getBoundingClientRect();
    b.style.top=(top+r.top+r.height/2-22)+'px';
  });
}
window.addEventListener('resize', ()=>{ fixSizeFrame(); fixPos(); });

/* ── focus: one section at a time, seen three ways — the pencil in the
   gutter, the lift on the artefact, the lozenge on the chat. ── */
const FIX_ASK='Keep it or tweak it?';
const FIX_KEPT=['Locked.','Good.','Onward.','That one stays.'];
let FIX_LAST='';
function fixPick(a){ let l; do{ l=a[Math.floor(Math.random()*a.length)]; }while(l===FIX_LAST&&a.length>1); FIX_LAST=l; return l; }

function fixTopicSet(k){
  const t=$('fixTopic');
  if(k){ t.textContent='Tweaking: '+FIX_LABELS[k]; t.classList.remove('empty'); }
  else { t.textContent = (FIX_ORDER.length && !fixBeat() && Object.keys(ASSET.locks).length) ? 'All locked' : 'Need any tweaks?'; t.classList.add('empty'); }
}
function fixQuoteSet(q){
  FIX_HL=q||null;
  const el=$('fixQuote'); el.textContent=q?'\u201c'+q+'\u201d':''; el.classList.toggle('on',!!q);
  $('fixNote').placeholder = FIX_FOCUS ? (q?'What are you thinking here?':'What are you thinking?') : 'Tap a padlock or highlight some words.';
}
function fixFocus(k, quote){
  if(FIX_FOCUS && FIX_FOCUS!==k) ASSET.locks[FIX_FOCUS]=true;        // leaving locks
  FIX_FOCUS=k;
  $('fixNote').value='';
  fixTopicSet(k); fixQuoteSet(quote||null);
  $('fixSendBtn').disabled=false;
  if(!FIX_THREAD[k]){ FIX_THREAD[k]=[]; fixSay(FIX_ASK,'robot',true); fixDrawer(k); }
  else fixThreadRender();
  drawFix();
  $('fixNote').focus();
}
function fixUnfocus(){
  if(FIX_FOCUS) ASSET.locks[FIX_FOCUS]=true;
  FIX_FOCUS=null;
  $('fixNote').value=''; fixQuoteSet(null); fixTopicSet(null);
  $('fixSendBtn').disabled=true;
  $('fixChat').innerHTML='';
  drawFix();
}
/* keep it — a state change, no model call. The robot says one word and
   moves you on; when there's nothing left, WRAP IT UP is ready. */
function fixKeep(say){
  if(!FIX_FOCUS) return;
  fixSay(esc(say||fixPick(FIX_KEPT)),'robot',true);
  const next=fixBeat();
  setTimeout(()=>{ fixUnfocus(); if(next) fixFocus(next); }, 420);
}

/* ── the thread. Each section's conversation is kept and re-shown when
   you come back. Rows are stored as html; the drawer's buttons rebind. ── */
function fixThreadRender(){
  const c=$('fixChat'); c.innerHTML=(FIX_THREAD[FIX_FOCUS]||[]).join('');
  c.querySelectorAll('.chat-opt').forEach(b=>{ b.onclick=()=>fixPickOption(b.dataset.k,+b.dataset.i); });
  c.scrollTop=c.scrollHeight;
}
/* the error turn: the robot's turn in the rail, wearing the error face,
   the line where the bubble would be. A transcript row, so it stays. */
function fixErr(text){
  const row=RAIL.err(text);
  if(FIX_FOCUS){ (FIX_THREAD[FIX_FOCUS]=FIX_THREAD[FIX_FOCUS]||[]).push(row); fixThreadRender(); }
  else { $('fixChat').insertAdjacentHTML('beforeend',row); $('fixChat').scrollTop=$('fixChat').scrollHeight; }
}
function fixSay(html,who,withAv){
  const row = who==='me' ? RAIL.me(html) : RAIL.robot(html, withAv);
  if(FIX_FOCUS){ (FIX_THREAD[FIX_FOCUS]=FIX_THREAD[FIX_FOCUS]||[]).push(row); fixThreadRender(); }
  else { $('fixChat').insertAdjacentHTML('beforeend',row); $('fixChat').scrollTop=$('fixChat').scrollHeight; }
}
function fixThink(){
  const t=document.createElement('div');
  t.className='chat-row chat-think'; t.innerHTML=RAIL.think();
  $('fixChat').appendChild(t); $('fixChat').scrollTop=$('fixChat').scrollHeight;
  const t0=Date.now();
  t.done = ()=>new Promise(r=>setTimeout(()=>{ t.remove(); r(); }, Math.max(0,1200-(Date.now()-t0))));
  return t;
}
function fixClearOpts(){ if(FIX_FOCUS&&FIX_THREAD[FIX_FOCUS]) FIX_THREAD[FIX_FOCUS]=FIX_THREAD[FIX_FOCUS].filter(r=>!r.startsWith('<button class="chat-opt"')); fixThreadRender(); }

/* the drawer: a three-option module offers its other two */
function fixDrawer(k){
  const m=fixMod(k); const v=ASSET.copy[m];
  if(fixN(k)||!Array.isArray(v)||fixOpts(m)!==3) return;
  v.forEach((opt,i)=>{
    if(i===ASSET.pick) return;
    FIX_THREAD[k].push(`<button class="chat-opt" data-k="${k}" data-i="${i}">Or from the drawer: ${fillPh(opt)}</button>`);
  });
  fixThreadRender();
}
function fixPickOption(k,i){
  const old=fixText(k);
  ASSET.pick=i;
  FIX_DIFF[k]={old, new:fixText(k)};
  ASSET.tweaks.push({label:FIX_LABELS[k], note:'From the drawer'});
  fixClearOpts();
  fixSay('Swapped. Like this?','robot',true);
  fixApplyFx(k);
}
function fixApplyFx(k){
  drawFix();
  const sec=FIX_DOC&&FIX_DOC.querySelector(`.fix-sec[data-k="${k}"]`);
  if(sec){ sec.classList.remove('flash'); void sec.offsetWidth; sec.classList.add('flash'); }
}

/* ── WRAP IT UP: counts what's open, never disabled. Early press takes
   you to the first open bit; the last press goes to FINISHED. ── */
function fixOpenBits(){ return FIX_ORDER.filter(k=>fixLockable(k) && (!ASSET.locks[k] || k===FIX_FOCUS)); }
function fixRailDraw(){
  const left=fixOpenBits(), w=$('fixWrap'), L=$('fixWrapLbl'), I=$('fixWrapIco');
  if(!FIX_ORDER.length){ w.style.visibility='hidden'; return; }
  w.style.visibility='';
  if(left.length===0){ w.classList.add('ready'); I.innerHTML=FIX_ICON.shut; L.textContent='WRAP IT UP'; }
  else if(left.length===1){ w.classList.remove('ready'); I.innerHTML=FIX_ICON.open;
    const n=FIX_LABELS[left[0]].toUpperCase(); L.textContent = n.length<=14 ? 'LOCK THE '+n : '1 BIT TO LOCK'; }
  else { w.classList.remove('ready'); I.innerHTML=FIX_ICON.open; L.textContent=left.length+' BITS TO LOCK'; }
}
function fixWrapGo(){
  const left=fixOpenBits();
  if(left.length===0){ fixUnfocus(); toReview(); return; }
  const n=left.find(k=>k!==FIX_FOCUS)||left[0];
  fixFocus(n);
  const sec=FIX_DOC&&FIX_DOC.querySelector(`.fix-sec[data-k="${n}"]`);
  if(sec&&sec.scrollIntoView) sec.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ── ? — for "I'm stuck", nothing more. One line, state-aware. ── */
function fixTipToggle(){
  const tip=$('fixTip');
  let msg='Tap a padlock to open a bit, or highlight the words you want changed.';
  if(FIX_FOCUS && FIX_HL) msg='The robot will only touch the highlighted words. Tell it what you\u2019re after.';
  else if(FIX_FOCUS) msg='Tell it what you\u2019re thinking, in your words. Say \u201ckeep it\u201d \u2014 or tap the pencil \u2014 and it moves you on.';
  tip.textContent=msg; tip.classList.toggle('on');
  clearTimeout(tip._t); tip._t=setTimeout(()=>tip.classList.remove('on'),4500);
}

/* ── the note. A clear keep is a state change and never leaves the
   browser; everything else goes to the FIXER, who reads the reply. ── */
const FIX_KEEP_RE=/^(keep( it)?|yep|yes|yeah|fine|good|great|love it|ok|okay|done|lock it|that'?s the one|perfect)[.!\s]*$/i;
async function fixSend(){
  const note=$('fixNote').value.trim();
  if(!note || !ASSET || !FIX_FOCUS) return;
  const k=FIX_FOCUS;
  $('fixNote').value='';
  fixSay(FIX_HL?`<i class="quote">\u201c${esc(FIX_HL)}\u201d</i>${esc(note)}`:esc(note),'me');
  if(FIX_KEEP_RE.test(note)){ fixQuoteSet(null); fixKeep(); return; }
  const cur = fixText(k), hl=FIX_HL;
  fixQuoteSet(null);
  const th=fixThink();
  FIX_HISTORY[k]=FIX_HISTORY[k]||[];
  try{
    const d=await api('/api/tweak',{container:CID, run:RUN, form:BRIEF.details.facts, block:k, current:cur, note,
      highlight:hl, insight:BRIEF.sorted.insight, history:FIX_HISTORY[k]});
    await th.done();
    FIX_HISTORY[k].push(`Human: ${note}`,`Robot: ${d.say||d.action||''}`);
    if(d.action==='lock'){
      fixKeep(d.say||null);
    } else if(d.action==='change' && d.copy){
      FIX_DIFF[k]={old:cur, new:d.copy};
      fixSet(k,d.copy);
      ASSET.tweaks.push({label:FIX_LABELS[k], note});
      fixClearOpts();
      fixSay(esc(d.say||'Like this?'),'robot',true);
      if(d.flags && d.flags.length) fixSay(esc(STR.fix.flag)+esc(d.flags[0]),'robot',false);
      if(d.wants) fixSay(esc(d.wants),'robot',false);
      fixApplyFx(k);
    } else {
      fixErr(STR.fix.tweak_blank);
    }
  }catch(e){ await th.done(); fixErr(STR.fix.tweak_fail); }
}

function fixDeflect(){ fixErr(STR.fix.locked); }
function fixSnap(full,part){
  const i=full.indexOf(part); if(i===-1) return part;
  let a=i,b=i+part.length;
  while(a>0 && !/\s/.test(full[a-1])) a--;
  while(b<full.length && !/\s/.test(full[b])) b++;
  return full.slice(a,b).trim().replace(/[.,!?;:]+$/,'');
}

/* ---------------- 3 REVIEW ---------------- */
/* the asset's copy as it ships: one option where there were three */
function fixFinalCopy(){
  const out={}, copy=ASSET.copy, pick=ASSET.pick;
  CONT.modules.writer.forEach(w=>{ const v=copy[w.module];
    out[w.module] = Array.isArray(v) ? (w.options===3 ? v[pick] : v) : v; });
  const g=CONT.modules.groups[0]; if(g) out[g.module+'s']=copy[g.module+'s']||[];
  return out;
}
