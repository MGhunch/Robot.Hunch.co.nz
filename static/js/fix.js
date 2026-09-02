/* =====================================================================
   ROBOT — FIX IT
   The copy room: the plate, the padlocks in the gutter, the rail and its
   threads, the drawer, the FIXER. Takes the signed brief and the WRITER's
   result at fxInit(); builds and keeps the asset. Reads BRIEF and ASSET
   and nothing else of FEED IT's — the grep gate in CHANGES-v035 says which
   names are off limits.
   ===================================================================== */

/* The copy keeps its {slots} underneath — that's the bulletproof rule — but
   the room shows the filled facts, marked so you know the robot can't have
   got them wrong. CTX is copy_context(facts), straight off /api/copy. */
const fillPh = t => esc(t).replace(/\{(\w+)\}/g,(m,k)=>`<span class="ph">${esc(CTX[k]??k)}</span>`);
const fillPlain = t => String(t??'').replace(/\{(\w+)\}/g,(m,k)=>String(CTX[k]??k));
const hasPh = t => /\{\w+\}/.test(String(t??''));

let FACTS=null, COPY=null, PICK=0, TWEAKS=0;   // views onto ASSET until the rename
let CTX={};                                    // slot -> value, from the brief
let LOCKED={};
const HIST = {};

/* the tabs over THE WORK: one per output in the spec */
function fxTabs(){
  const tabs=document.querySelector('.fx-tabs'); if(!tabs) return;
  tabs.innerHTML=(CONT.outputs||[]).map((o,i)=>`<span class="fx-loz ${i?'off':''}">${esc(o.id)}</span>`).join('');
}

/* ================= THE ASSET =================
   What FIX IT hands over: the WRITER's copy as tweaked, the filled slots,
   the FIXER's cautions, the engine's terms menu, the padlocks, the tweak
   log and the pick — all tagged with the `v` of the brief it was written
   from, so staleness is a comparison, not a guess. The artefact document
   and the threads are FIX IT's working state, not the asset. FIX IT's
   older names (COPY, CTX, FXLOCK, FXLIST, FXFLAGS, PICK) are views onto
   it until the rename lands; FILE IT reads ASSET and BRIEF, nothing else. */
let ASSET=null;
let FXORDER=[], FXLBL={}, FXLOCK={}, FXHL=null, FXDIFF={}, FXLIST=[], FXFLAGS=[], WHY={};
let FXFOCUS=null, FXTHREAD={};                     // the pencil, and one thread per section
let FXDOC=null;                                   // the artefact's document (iframe)
const fxMod = k => k.split('#')[0];
const fxN   = k => +(k.split('#')[1]||0);
function fxLabel(k){
  const m=fxMod(k), n=fxN(k);
  const nice=m.replace(/-/g,' ').replace(/\bcta\b/,'button').replace(/\bcopy\b/,'');
  const s=nice.trim().replace(/^\w/,c=>c.toUpperCase());
  return n ? s.replace(/^(\w+)/, `$1 ${n}`) : s;
}
function fxOrderBuild(){
  const mods=CONT.modules, tags=CONT.ghost, group=mods.groups[0];
  const isWriter=m=>mods.writer.some(w=>w.module===m);
  FXORDER=[];
  tags.forEach(t=>{
    if(isWriter(t)) FXORDER.push(t);
    else if(group && t===group.module){
      const items=COPY[group.module+'s']||[];
      items.forEach((_,i)=>group.parts.forEach(p=>{ if(tags.includes(p.module)) FXORDER.push(p.module+'#'+(i+1)); }));
    }
    else if(t==='terms' && ASSET.menu.length && !FXORDER.includes('terms')) FXORDER.push('terms');
  });
  FXLBL={}; FXORDER.forEach(k=>FXLBL[k]=fxLabel(k));
}
const fxOpts = m => { const w=CONT.modules.writer.find(x=>x.module===m); return w?w.options||0:0; };
function fxText(k){
  const m=fxMod(k), n=fxN(k);
  if(k==='terms') return fxTermsText();
  if(n){ const g=CONT.modules.groups[0]; const it=(COPY[g.module+'s']||[])[n-1]||{}; return it[m]||''; }
  const v=COPY[m]; return Array.isArray(v) ? (v[PICK]||'') : (v||'');
}
function fxSet(k,text){
  const m=fxMod(k), n=fxN(k);
  if(n){ const g=CONT.modules.groups[0]; COPY[g.module+'s'][n-1][m]=text; return; }
  if(Array.isArray(COPY[m])) COPY[m][PICK]=text; else COPY[m]=text;
}
const fxShow = k => FXDIFF[k] ? fxDiffWords(FXDIFF[k].old, FXDIFF[k].new) : fillPh(fxText(k));
function fxTermsText(){
  const menu=ASSET?ASSET.menu:[], chosen=BRIEF?BRIEF.details.chosen:[];
  if(!menu.length) return 'Terms assemble from the brief once the facts are in.';
  return menu.filter(c=>c.fixed || chosen.includes(c.id)).map(c=>c.text).join(' ');
}
const fxLockable = k => k!=='terms';
function fxBeat(){ return FXORDER.find(k=>fxLockable(k) && !FXLOCK[k] && k!==FXFOCUS) || null; }

/* the craft died before anything landed: the plate card in the artefact's
   slot, the rail and gutter cleared. The tab pill goes with the card. */
function fxFail(retry){
  $('fxGutter').innerHTML=''; $('fxChat').innerHTML=''; fxTopicSet(null);
  $('fxArt').innerHTML='';
  $('fxArt').appendChild(errCard('plate', retry, 'copy', {container:CID, run:RUN,
    onGone:()=>{ const t=document.querySelector('.fx-tabs'); if(t) t.innerHTML=''; } }));
}
function fxInit(d, h){
  h=h||{};
  ASSET={ brief_v:BRIEF?BRIEF.v:'', copy:d.copy, facts:d.facts||{}, context:d.context||{},
          flags:d.flags||[], menu:h.menu||[], locks:{}, tweaks:[], pick:0 };
  COPY=ASSET.copy; FACTS=ASSET.facts; CTX=ASSET.context; PICK=0; TWEAKS=0;
  WHY=(COPY.why&&typeof COPY.why==='object')?COPY.why:{};
  fxOrderBuild();
  FXLOCK=ASSET.locks; FXORDER.forEach(k=>FXLOCK[k]=(k==='terms'));   // terms travel locked
  FXHL=null; FXDIFF={}; FXLIST=ASSET.tweaks; FXFLAGS=ASSET.flags;
  FXFOCUS=null; FXTHREAD={};
  LOCKED=FXLOCK;
  $('fxChat').innerHTML=''; fxTopicSet(null); fxQuoteSet(null);
  fxMount(()=>{ drawFix(); if(h.termsFailed) fxErr(STR.fix.terms_fail); });
}

const fxDiffWords=(o,n)=>{
  const tok=x=>String(x??'').split(/(\s+)/); const a=tok(o),b=tok(n);
  const m=a.length,k=b.length;
  const dp=Array.from({length:m+1},()=>new Array(k+1).fill(0));
  for(let i=m-1;i>=0;i--)for(let j=k-1;j>=0;j--)
    dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0,out='';
  while(j<k){
    if(i<m&&a[i]===b[j]){out+=fillPh(b[j]);i++;j++;}
    else if(i<m&&dp[i+1][j]>=dp[i][j+1]){i++;}
    else{out+=b[j].trim()===''?esc(b[j]):'<mark class="fx-ch">'+fillPh(b[j])+'</mark>';j++;}
  }
  return out;
};

/* THE ARTEFACT — the container's html in an iframe, so its skin can't
   bleed into the engine and the engine's can't bleed into it. The engine
   adds one stylesheet inside for its marks (changes, highlights, the
   editing tint) and pours the copy into the data-module tags. */
const FX_INNER_CSS=`.fx-sec{position:relative;transition:transform .18s ease,box-shadow .18s ease}
.fx-sec.editing{transform:scale(1.025);z-index:2;box-shadow:0 14px 34px rgba(120,10,14,.35);border-radius:10px;background:inherit}
body.fx-editing .email,body.fx-editing .precopy{overflow:visible!important}
.email,.precopy{box-shadow:0 14px 44px rgba(0,0,0,.2)}
.fx-sec.flash{animation:fxlanded .7s ease-out}@keyframes fxlanded{0%{background:rgba(237,28,36,.18)}100%{background:transparent}}
mark.fx-ch{background:#FFE96B;color:inherit;border-radius:2px;padding:0 1px}.ph{cursor:not-allowed}
body{padding:0 22px 26px!important;background:transparent!important}`;
function fxMount(then){
  const host=$('fxArt'); host.innerHTML='<iframe class="fx-frame" title="The work" scrolling="no"></iframe>';
  const fr=host.querySelector('iframe');
  fxWrite(fr, CONT.html.replace('</head>', `<style>${FX_INNER_CSS}</style></head>`));
  FXDOC=fr.contentDocument; fxPrepDoc(); fxSizeFrame(); then&&then();
}
/* document.write into the frame: same-origin, synchronous, no srcdoc
   timing to wait on, and the brand's fonts resolve off the site root */
function fxWrite(fr, html){
  const D=fr.contentDocument; D.open(); D.write(html); D.close();
}
function fxSizeFrame(){
  const fr=$('fxArt').querySelector('iframe'); if(!fr||!FXDOC) return;
  const art=FXDOC.querySelector('.email,.precopy,[data-artefact]');
  const w=art ? art.getBoundingClientRect().width : 600;
  document.documentElement.style.setProperty('--fx-w', Math.round(w+44)+'px');
  fr.style.height=Math.max(200, FXDOC.documentElement.scrollHeight)+'px';
}
/* first pass on the doc: clone or cull repeated items to match the copy,
   wrap each tour block as .fx-sec with its key, listen for highlights */
function fxPrepDoc(){
  const D=FXDOC, group=CONT.modules.groups[0];
  D.querySelectorAll('.email,.precopy,body').forEach(el=>{ el.style.margin='0 auto'; });
  if(group){
    const items=COPY[group.module+'s']||[];
    const els=[...D.querySelectorAll(`[data-module="${group.module}"]`)];
    const wrap=el=>el.closest('.cardwrap')||el;
    while(els.length<items.length && els.length){ const c=wrap(els[els.length-1]).cloneNode(true); wrap(els[els.length-1]).after(c); els.push(c.matches(`[data-module="${group.module}"]`)?c:c.querySelector(`[data-module="${group.module}"]`)); }
    while(els.length>items.length && els.length>1){ wrap(els.pop()).remove(); }
    els.forEach((el,i)=>{ el.dataset.card=String(i+1);
      const it=(ASSET.facts[group.module]||[])[i]||{}; const tr=Object.keys(it).find(k=>k.endsWith('_type'));
      if(tr) el.dataset.type=it[tr];
      group.parts.forEach(p=>{ const t=el.querySelector(`[data-module="${p.module}"]`); if(t){ t.classList.add('fx-sec'); t.dataset.k=p.module+'#'+(i+1); } });
    });
  }
  FXORDER.filter(k=>!fxN(k)).forEach(k=>{
    const m=k==='terms'?null:fxMod(k);
    const els = m ? [...D.querySelectorAll(`[data-module="${m}"]`)] : [D.querySelector('[data-module="terms"]')];
    els.forEach(el=>{ if(el){ el.classList.add('fx-sec'); el.dataset.k=k; } });
  });
  D.addEventListener('mouseup', fxSelect);
}
/* pour: every tour block gets its current copy (diff-marked if tweaked);
   a two-option module fills its data-variant twins */
function fxPour(){
  const D=FXDOC; if(!D) return;
  FXORDER.forEach(k=>{
    const els=[...D.querySelectorAll(`.fx-sec[data-k="${k}"]`)]; if(!els.length) return;
    const m=fxMod(k);
    els.forEach(el=>{
      if(k!=='terms' && !fxN(k) && fxOpts(m)===2 && el.dataset.variant){
        const i=el.dataset.variant==='B'?1:0; const v=(COPY[m]||[])[i]||'';
        el.innerHTML=(el.querySelector('.l')?el.querySelector('.l').outerHTML:'')+fillPh(v); return;
      }
      if(k==='terms'){ el.innerHTML=esc(fxTermsText()).replace(/\n/g,'<br>'); if(FXLOCK.terms) el.classList.add('locked-look'); return; }
      const raw=fxShow(k);
      el.innerHTML = raw.includes('\n') ? raw.replace(/\n/g,'<br>') : raw;
      el.classList.toggle('editing', FXFOCUS===k);
    });
  });
  D.body.classList.toggle('fx-editing', !!FXFOCUS);
  fxSizeFrame();
}
function fxSelect(){
  const sel=FXDOC.getSelection();
  if(!sel || sel.isCollapsed) return;
  const txt=sel.toString().trim();
  if(!txt || txt.length<2) return;
  const node=sel.anchorNode && sel.anchorNode.parentElement; if(!node) return;
  if(node.closest('.ph')){ sel.removeAllRanges(); fxDeflect(); return; }
  const sec=node.closest('.fx-sec'); if(!sec) return;
  const k=sec.dataset.k;
  if(k==='terms'){ sel.removeAllRanges(); fxDeflect(); return; }
  sel.removeAllRanges();
  const snapped=fxSnap(sec.textContent, txt);
  fxFocus(k, snapped.length>60 ? snapped.slice(0,57)+'\u2026' : snapped);
}

function drawFix(){
  fxPour();
  fxGutterDraw();
  fxRailDraw();
  requestAnimationFrame(fxPos);
}

/* ── the gutter: one padlock per section, one loop — open → pencil →
   shut → pencil → shut. Tap open or shut: the pencil. Tap the pencil:
   keep it. Leave any other way: it shuts behind you. Terms travel
   locked and deflect. ── */
const FXI = PADLOCK.icon;      // FIX IT's own name for the one icon set
function fxPadState(k){
  if(!fxLockable(k)) return 'fixed';
  if(FXFOCUS===k) return 'edit';
  return FXLOCK[k] ? 'locked' : 'open';
}
function fxGutterDraw(){
  $('fxGutter').innerHTML = FXORDER.map(k=>{
    const st=fxPadState(k), tip=PADLOCK.say[st];
    return `<button class="fx-pad ${st}" data-k="${k}" onclick="fxPadTap('${k}')" title="${tip}" aria-label="${tip}: ${FXLBL[k]}">
      ${PADLOCK.face(st)}</button>`;
  }).join('');
}
function fxPadTap(k){
  PADLOCK.tap(fxPadState(k), {open:()=>fxFocus(k), keep:fxKeep, deflect:fxDeflect});
}
function fxPos(){
  const fr=$('fxArt').querySelector('iframe'); if(!fr||!FXDOC) return;
  const top=fr.getBoundingClientRect().top - $('fxArt').getBoundingClientRect().top;
  document.querySelectorAll('#fxGutter .fx-pad').forEach(b=>{
    const sec=FXDOC.querySelector(`.fx-sec[data-k="${b.dataset.k}"]`); if(!sec){ b.style.display='none'; return; }
    const r=sec.getBoundingClientRect();
    b.style.top=(top+r.top+r.height/2-22)+'px';
  });
}
window.addEventListener('resize', ()=>{ fxSizeFrame(); fxPos(); });

/* ── focus: one section at a time, seen three ways — the pencil in the
   gutter, the lift on the artefact, the lozenge on the chat. ── */
const FX_ASK='Keep it or tweak it?';
const FX_KEPT=['Locked.','Good.','Onward.','That one stays.'];
let FX_LAST='';
function fxPick(a){ let l; do{ l=a[Math.floor(Math.random()*a.length)]; }while(l===FX_LAST&&a.length>1); FX_LAST=l; return l; }

function fxTopicSet(k){
  const t=$('fxTopic');
  if(k){ t.textContent='Tweaking: '+FXLBL[k]; t.classList.remove('empty'); }
  else { t.textContent = (FXORDER.length && !fxBeat() && Object.keys(FXLOCK).length) ? 'All locked' : 'Need any tweaks?'; t.classList.add('empty'); }
}
function fxQuoteSet(q){
  FXHL=q||null;
  const el=$('fxQuote'); el.textContent=q?'\u201c'+q+'\u201d':''; el.classList.toggle('on',!!q);
  $('fxNote').placeholder = FXFOCUS ? (q?'What are you thinking here?':'What are you thinking?') : 'Tap a padlock or highlight some words.';
}
function fxFocus(k, quote){
  if(FXFOCUS && FXFOCUS!==k) FXLOCK[FXFOCUS]=true;        // leaving locks
  FXFOCUS=k;
  $('fxNote').value='';
  fxTopicSet(k); fxQuoteSet(quote||null);
  $('fxSendBtn').disabled=false;
  if(!FXTHREAD[k]){ FXTHREAD[k]=[]; fxSay(FX_ASK,'robot',true); fxDrawer(k); }
  else fxThreadRender();
  drawFix();
  $('fxNote').focus();
}
function fxUnfocus(){
  if(FXFOCUS) FXLOCK[FXFOCUS]=true;
  FXFOCUS=null;
  $('fxNote').value=''; fxQuoteSet(null); fxTopicSet(null);
  $('fxSendBtn').disabled=true;
  $('fxChat').innerHTML='';
  drawFix();
}
/* keep it — a state change, no model call. The robot says one word and
   moves you on; when there's nothing left, WRAP IT UP is ready. */
function fxKeep(say){
  if(!FXFOCUS) return;
  fxSay(esc(say||fxPick(FX_KEPT)),'robot',true);
  const next=fxBeat();
  setTimeout(()=>{ fxUnfocus(); if(next) fxFocus(next); }, 420);
}

/* ── the thread. Each section's conversation is kept and re-shown when
   you come back. Rows are stored as html; the drawer's buttons rebind. ── */
function fxThreadRender(){
  const c=$('fxChat'); c.innerHTML=(FXTHREAD[FXFOCUS]||[]).join('');
  c.querySelectorAll('.chat-opt').forEach(b=>{ b.onclick=()=>fxPickOption(b.dataset.k,+b.dataset.i); });
  c.scrollTop=c.scrollHeight;
}
/* the error turn: the robot's turn in the rail, wearing the error face,
   the line where the bubble would be. A transcript row, so it stays. */
function fxErr(text){
  const row=RAIL.err(text);
  if(FXFOCUS){ (FXTHREAD[FXFOCUS]=FXTHREAD[FXFOCUS]||[]).push(row); fxThreadRender(); }
  else { $('fxChat').insertAdjacentHTML('beforeend',row); $('fxChat').scrollTop=$('fxChat').scrollHeight; }
}
function fxSay(html,who,withAv){
  const row = who==='me' ? RAIL.me(html) : RAIL.robot(html, withAv);
  if(FXFOCUS){ (FXTHREAD[FXFOCUS]=FXTHREAD[FXFOCUS]||[]).push(row); fxThreadRender(); }
  else { $('fxChat').insertAdjacentHTML('beforeend',row); $('fxChat').scrollTop=$('fxChat').scrollHeight; }
}
function fxThink(){
  const t=document.createElement('div');
  t.className='chat-row chat-think'; t.innerHTML=RAIL.think();
  $('fxChat').appendChild(t); $('fxChat').scrollTop=$('fxChat').scrollHeight;
  const t0=Date.now();
  t.done = ()=>new Promise(r=>setTimeout(()=>{ t.remove(); r(); }, Math.max(0,1200-(Date.now()-t0))));
  return t;
}
function fxClearOpts(){ if(FXFOCUS&&FXTHREAD[FXFOCUS]) FXTHREAD[FXFOCUS]=FXTHREAD[FXFOCUS].filter(r=>!r.startsWith('<button class="chat-opt"')); fxThreadRender(); }

/* the drawer: a three-option module offers its other two */
function fxDrawer(k){
  const m=fxMod(k); const v=COPY[m];
  if(fxN(k)||!Array.isArray(v)||fxOpts(m)!==3) return;
  v.forEach((opt,i)=>{
    if(i===PICK) return;
    FXTHREAD[k].push(`<button class="chat-opt" data-k="${k}" data-i="${i}">Or from the drawer: ${fillPh(opt)}</button>`);
  });
  fxThreadRender();
}
function fxPickOption(k,i){
  const old=fxText(k);
  PICK=i; ASSET.pick=i;
  FXDIFF[k]={old, new:fxText(k)};
  FXLIST.push({label:FXLBL[k], note:'From the drawer'}); TWEAKS++;
  fxClearOpts();
  fxSay('Swapped. Like this?','robot',true);
  fxApplyFx(k);
}
function fxApplyFx(k){
  drawFix();
  const sec=FXDOC&&FXDOC.querySelector(`.fx-sec[data-k="${k}"]`);
  if(sec){ sec.classList.remove('flash'); void sec.offsetWidth; sec.classList.add('flash'); }
}

/* ── WRAP IT UP: counts what's open, never disabled. Early press takes
   you to the first open bit; the last press goes to FINISHED. ── */
function fxOpenBits(){ return FXORDER.filter(k=>fxLockable(k) && (!FXLOCK[k] || k===FXFOCUS)); }
function fxRailDraw(){
  const left=fxOpenBits(), w=$('fxWrap'), L=$('fxWrapLbl'), I=$('fxWrapIco');
  if(!FXORDER.length){ w.style.visibility='hidden'; return; }
  w.style.visibility='';
  if(left.length===0){ w.classList.add('ready'); I.innerHTML=FXI.shut; L.textContent='WRAP IT UP'; }
  else if(left.length===1){ w.classList.remove('ready'); I.innerHTML=FXI.open;
    const n=FXLBL[left[0]].toUpperCase(); L.textContent = n.length<=14 ? 'LOCK THE '+n : '1 BIT TO LOCK'; }
  else { w.classList.remove('ready'); I.innerHTML=FXI.open; L.textContent=left.length+' BITS TO LOCK'; }
}
function fxWrapGo(){
  const left=fxOpenBits();
  if(left.length===0){ fxUnfocus(); toReview(); return; }
  const n=left.find(k=>k!==FXFOCUS)||left[0];
  fxFocus(n);
  const sec=FXDOC&&FXDOC.querySelector(`.fx-sec[data-k="${n}"]`);
  if(sec&&sec.scrollIntoView) sec.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ── ? — for "I'm stuck", nothing more. One line, state-aware. ── */
function fxTipToggle(){
  const tip=$('fxTip');
  let msg='Tap a padlock to open a bit, or highlight the words you want changed.';
  if(FXFOCUS && FXHL) msg='The robot will only touch the highlighted words. Tell it what you\u2019re after.';
  else if(FXFOCUS) msg='Tell it what you\u2019re thinking, in your words. Say \u201ckeep it\u201d \u2014 or tap the pencil \u2014 and it moves you on.';
  tip.textContent=msg; tip.classList.toggle('on');
  clearTimeout(tip._t); tip._t=setTimeout(()=>tip.classList.remove('on'),4500);
}

/* ── the note. A clear keep is a state change and never leaves the
   browser; everything else goes to the FIXER, who reads the reply. ── */
const FX_KEEP_RE=/^(keep( it)?|yep|yes|yeah|fine|good|great|love it|ok|okay|done|lock it|that'?s the one|perfect)[.!\s]*$/i;
async function fxSend(){
  const note=$('fxNote').value.trim();
  if(!note || !COPY || !FXFOCUS) return;
  const k=FXFOCUS;
  $('fxNote').value='';
  fxSay(FXHL?`<i class="quote">\u201c${esc(FXHL)}\u201d</i>${esc(note)}`:esc(note),'me');
  if(FX_KEEP_RE.test(note)){ fxQuoteSet(null); fxKeep(); return; }
  const cur = fxText(k), hl=FXHL;
  fxQuoteSet(null);
  const th=fxThink();
  HIST[k]=HIST[k]||[];
  try{
    const d=await api('/api/tweak',{container:CID, run:RUN, form:BRIEF.details.facts, block:k, current:cur, note,
      highlight:hl, insight:BRIEF.sorted.insight, history:HIST[k]});
    await th.done();
    HIST[k].push(`Human: ${note}`,`Robot: ${d.say||d.action||''}`);
    if(d.action==='lock'){
      fxKeep(d.say||null);
    } else if(d.action==='change' && d.copy){
      FXDIFF[k]={old:cur, new:d.copy};
      fxSet(k,d.copy);
      FXLIST.push({label:FXLBL[k], note}); TWEAKS++;
      fxClearOpts();
      fxSay(esc(d.say||'Like this?'),'robot',true);
      if(d.flags && d.flags.length) fxSay(esc(STR.fix.flag)+esc(d.flags[0]),'robot',false);
      if(d.wants) fxSay(esc(d.wants),'robot',false);
      fxApplyFx(k);
    } else {
      fxErr(STR.fix.tweak_blank);
    }
  }catch(e){ await th.done(); fxErr(STR.fix.tweak_fail); }
}

function fxDeflect(){ fxErr(STR.fix.locked); }
function fxSnap(full,part){
  const i=full.indexOf(part); if(i===-1) return part;
  let a=i,b=i+part.length;
  while(a>0 && !/\s/.test(full[a-1])) a--;
  while(b<full.length && !/\s/.test(full[b])) b++;
  return full.slice(a,b).trim().replace(/[.,!?;:]+$/,'');
}

/* ---------------- 3 REVIEW ---------------- */
/* the asset's copy as it ships: one option where there were three */
function fxFinalCopy(){
  const out={}, copy=ASSET.copy, pick=ASSET.pick;
  CONT.modules.writer.forEach(w=>{ const v=copy[w.module];
    out[w.module] = Array.isArray(v) ? (w.options===3 ? v[pick] : v) : v; });
  const g=CONT.modules.groups[0]; if(g) out[g.module+'s']=copy[g.module+'s']||[];
  return out;
}
