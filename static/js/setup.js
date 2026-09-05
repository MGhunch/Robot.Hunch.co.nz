/* =====================================================================
   ROBOT — SET UP
   The fifth room, and the only one no client ever sees.

   WHERE THINGS LIVE, and it's the whole model in two lines:

     the volume   a DRAFT. Instant saves, no deploy, Hunch's eyes only.
                  Survives restarts and redeploys.
     git          what has LANDED. History, revert, and the folders ship in
                  the same commit as the engine that reads them.

   Clients only ever see git; Hunch sees the volume laid over the top. PUSH
   moves a folder from the volume into git, and that — nothing else — makes
   it live. Opening something live doesn't make a draft of it; the first
   edit does, so looking is free.

   THE HOME PAGE lists everything and takes you to it. It does not push.
   Push has to refuse a folder that doesn't read clean and a list can't
   know; and the doorway picks a container, it doesn't write the copy. The
   list navigates; the room acts.

   THE FOLDER is three sections for a brand — LOOK, PROMPT, LEGALS, which
   is what the three files are — and three stops for a container. Everything
   on screen is drawn by the code the client will meet: the chrome's GHOST,
   deets.js's card, the container's own html. A check rendered by different
   code checks nothing.
   ===================================================================== */

let SETUP_KIND='', SETUP_ID='', SETUP_STOP='', SETUP_SHUT={}, SETUP_SAID=[], SETUP_DATA=null;
/* the chat's own two: the proposal waiting on a yes, and how many edits
   deep the undo stack is. Both per sitting, like the locks. */
let SETUP_PROP=null, SETUP_UNDO=0, SETUP_BUSY=false;
/* what the container looked like before the preview, so PUT IT BACK is a
   restore and not another round trip */
let SETUP_WAS=null;
/* a file that has landed and hasn't been told what it is yet */
let SETUP_NAMING='';

/* the stops each kind walks */
const SETUP_RAILS = {
  brands: [
    /* no hints on the brand rails: the shelves say where you stand, and a
       line explaining the lesson underneath a card that demonstrates it is
       the narration this room was cluttered with. */
    {key:'look',   name:'Look',   loz:'The look',    hint:''},
    {key:'prompt', name:'Prompt', loz:'The prompt',  hint:''},
    {key:'legals', name:'Legals', loz:'The clauses', hint:''},
  ],
  containers: [
    /* no hints here either, for the same reason they went from the brand
       rails: a line explaining the picture is something to read INSTEAD of
       looking at the picture, which is the one thing this room is for. */
    {key:'mock',   name:'Mock up', loz:'The bones',        hint:''},
    {key:'deets',  name:'Deets',   loz:'The deets',        hint:''},
    {key:'output', name:'Output',  loz:'The artefact',     hint:''},
  ],
};
const SETUP_PANE = {look:'brand', prompt:'brand', legals:'brand',
                    mock:'mock', deets:'deets', output:'output'};

/* the menu's fifth door, and it shows to everyone. Hunch walks through to
   the room; a client gets the honest version of what's behind it, which is
   a conversation with us — container design is the thing we sell, not a
   thing the tool does. */
menuAdd('SET UP', ()=>{ menuToggle(); enterSetup(); }, {hunch:true, otherwise:()=>menuOpen('setup-ask')});

/* ---------------- the room ---------------- */

function setupInit(){ $('setup').classList.add('on');
  $('setupHomeTag').textContent=STR.setup.tagline; setupHome(); }

function setupHome(){
  SETUP_KIND=''; SETUP_ID=''; SETUP_DATA=null; SETUP_SAID=[];
  document.documentElement.style.removeProperty('--su-w');
  $('setupHome').hidden=false; $('setupStage').hidden=true;
  deetsUnmount(); setupLine(''); setupList();
}

function setupLeave(){ $('setup').classList.remove('on'); deetsUnmount(); location.reload(); }

/* ---------------- the list ---------------- */

function setupList(fresh){
  fetch('/api/setup/list').then(r=>r.json()).then(d=>setupDraw(d, fresh)).catch(()=>{});
}

/* a row is three things: what state it's in, what it is, and the one thing
   you can do to it. Everything else lives inside. */
function setupRow(kind, r, fresh){
  const isNew = fresh && fresh.indexOf(r.id)>=0;
  return `<div class="home-row${isNew?' landing':''}">`+
    `<div class="home-state ${esc(r.state)}">${esc(r.state.toUpperCase())}</div>`+
    `<div class="home-name">${esc(r.name)} <span>· ${esc(r.sub)}</span></div>`+
    `<button class="home-go" onclick="setupOpen('${kind}',${attr(r.id)})">EDIT</button></div>`;
}

function setupDraw(d, fresh){
  const put=(el, kind, rows, empty)=>{
    $(el).innerHTML = rows.length
      ? rows.map(r=>setupRow(kind, r, fresh)).join('')
      : `<div class="home-empty">${esc(empty)}</div>`;
  };
  /* a folder that has just landed goes to the top, so the drop visibly
     becomes a card rather than the page simply changing */
  const lift = rows => fresh ? rows.slice().sort((a,b)=>
      (fresh.indexOf(b.id)>=0) - (fresh.indexOf(a.id)>=0)) : rows;
  put('homeBrands','brands', lift(d.brands||[]), STR.setup.nobrands);
  put('homeContainers','containers', lift(d.containers||[]), STR.setup.nocontainers);
}

/* ---------------- the drop ---------------- */

function setupTake(files){
  const f=files && files[0]; if(!f) return;
  if(!/\.zip$/i.test(f.name)){ setupLine(STR.setup.read.broken); return; }
  setupLine(''); $('setupPad').classList.add('busy');
  const fd=new FormData(); fd.append('zip', f);
  fetch('/api/setup/drop',{method:'POST',body:fd})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      $('setupPad').classList.remove('busy'); $('setupZip').value='';
      if(!ok){ setupLine(STR.setup.read[d.error] || STR.setup.read.broken); return; }
      const fresh=[].concat((d.landed||{}).brands||[], (d.landed||{}).containers||[]);
      setupDraw(d, fresh);
      setupLine(STR.setup.landed(fresh));
    })
    .catch(()=>{ $('setupPad').classList.remove('busy'); setupLine(STR.setup.read.broken); });
}

function setupLine(text){
  const box=$('setupSay'); box.innerHTML='';
  if(text) box.appendChild(robotLine(text,{cls:'onred',stick:true}));
}

/* ---------------- opening one ---------------- */

function setupOpen(kind, id){
  fetch('/api/setup/open/'+kind+'/'+encodeURIComponent(id))
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupLine(STR.setup.read[d.error]||STR.setup.read.broken); return; }
                      setupShow(kind, id, d); })
    .catch(()=>setupLine(STR.setup.read.broken));
}

function setupShow(kind, id, d){
  SETUP_KIND=kind; SETUP_ID=id; SETUP_DATA=d; SETUP_SAID=[]; SETUP_SHUT={};
  SETUP_PROP=null; SETUP_UNDO=0; SETUP_BUSY=false; SETUP_WAS=null;
  $('setupUndo').hidden=true; $('setupNote2').value='';
  /* a container goes on the table exactly as a live one would, so every
     renderer below reads what it always reads. CID stays empty: a peek
     during a check is not a peek by a client. */
  CONT = kind==='containers' ? d : null; CID='';
  $('setupHome').hidden=true; $('setupStage').hidden=false;

  const b=d.brandRead||{};
  $('setupHed').textContent = kind==='brands' ? 'THE BRAND' : 'THE CONTAINER';
  /* the tile says what the thing is called. A brand's id is the folder
     name and says nothing a human needs; a container's second half is its
     BRAND, which is worth knowing at a glance. */
  $('setupTile').innerHTML = kind==='brands'
    ? esc(b.name||id)
    : esc((d.tile||{}).name||id) + ' <span>· '+esc(b.name||d.brandWanted||'')+'</span>';
  $('setupTag').textContent = STR.setup.tagline;
  setupState(d.state);

  const rail=SETUP_RAILS[kind];
  $('setupRail').innerHTML = rail.map((s,i)=>
    `<button class="step" data-s="${s.key}" onclick="setupGo('${s.key}')"><i>${i+1}</i>${esc(s.name)}</button>`).join('');
  rail.forEach(s=>SETUP_SHUT[s.key]=false);

  setupShelvesDraw();
  if(kind==='containers') setupContainerDraw(d);
  setupChat(null, d);
  setupGo(rail[0].key);
}

function setupState(state){
  /* one place owns the state, so the pill and the data can't drift apart —
     which is how PUSH stayed dead through an edit that had already worked. */
  if(SETUP_DATA) SETUP_DATA.state=state;
  const st=$('setupStatus');
  st.textContent=(state||'').toUpperCase();
  st.className='setup-status '+(state||'');
  /* discard only means something when there's a draft to throw away */
  $('setupDiscard').hidden = state!=='draft';
}

function setupContainerDraw(d){
  GHOST($('setupGhost'), d.ghost, d.modules, d.checklist);
  deetsMount($('setupDeets'), {
    /* the card is live so the peek works — reading a clause is half the
       check — but nothing it does here leaves the room. */
    refused: line=>setupChat(line),
    dig:     ()=>setupChat(STR.setup.nodig),
  });
  /* filled, not empty. You are checking how a CLIENT'S card will look, and
     an empty card checks nothing. */
  deetsReset(); deetsInit(); deetsSeed(d.standInDeets); deetsRender();
  /* the artefact in its own document, so its css can't touch ours — and
     grown to its full height, because a scrollbar is not a check. */
  const fr=$('setupArt');
  fr.onload=()=>{ setupPour(fr); setupSize(fr); };
  fr.srcdoc = d.html||'';
}

/* ---------------- THE STAND-IN COPY ----------------
   Same reason as the deets: the point of this room is seeing how a client's
   finished render will look, and an empty slot shows you nothing.

   ONLY INTO EMPTY SLOTS. A container built from a real artefact already
   carries real copy — "Win one of five double passes to Practical Magic 2"
   — and pouring latin over that would make the check worse, not better. So
   a full slot is stepped over and a blank one is dressed.

   An image slot gets a grey box rather than words, because latin in a
   picture frame is a lie about what will be there. */
const SETUP_INNER_CSS=`[data-standin="image"]{background:#E4E7EC;position:relative;min-height:88px}
[data-standin="image"]::after{content:'IMAGE';position:absolute;left:0;top:0;right:0;bottom:0;
  display:flex;align-items:center;justify-content:center;font:600 10px/1 system-ui,sans-serif;
  letter-spacing:.16em;color:#98A0AE}`;

/* THE ARTEFACT SETS THE WIDTH, not the other way round.

   Both containers in the repo were 600px emails and the column was 600px,
   flat — so Hunchmail, which is 660 because the template is 660, came out
   clipped. An exact artefact rendered in a frame that's too small looks
   wrong, and you go hunting for a fault that isn't there.

   So the room measures what it is showing and grows to it, the way FIX IT
   always has. Height too: a scrollbar is not a check. */
function setupSize(fr){
  let D; try{ D=fr.contentDocument; }catch(e){ return; }
  if(!D || !D.body) return;
  const art=D.querySelector('.email,.precopy,[data-artefact]');
  const w = art ? Math.round(art.getBoundingClientRect().width) : 0;
  document.documentElement.style.setProperty('--su-w', (w>320 ? w : 600)+'px');
  try{ fr.style.height=Math.max(400, D.body.scrollHeight+24)+'px'; }catch(e){}
}

function setupPour(fr){
  let D; try{ D=fr.contentDocument; }catch(e){ return; }
  if(!D || !D.body) return;
  const S=(SETUP_DATA||{}).standIn||{};
  const st=D.createElement('style'); st.textContent=SETUP_INNER_CSS;
  D.head && D.head.appendChild(st);
  Object.keys(S).forEach(mod=>{
    const bits=S[mod]||{};
    [...D.querySelectorAll('[data-module="'+CSS.escape(mod)+'"]')].forEach((el,i)=>{
      /* A DRESSED SLOT IS LEFT ALONE, and the tag itself counts. When the
         container is the real artefact, the hero IS an <img data-module=
         "hero"> with a live URL on it — no text, no child elements — and
         checking only descendants read that as empty and painted a grey box
         over a picture that was already there. */
      const dressed = el.textContent.trim() ||
                      el.matches('img,svg,picture,video,iframe') ||
                      el.querySelector('img,svg,picture,video,iframe') ||
                      (el.getAttribute('style')||'').includes('background-image') ||
                      el.hasAttribute('src');
      if(dressed) return;
      if(bits.kind==='image'){ el.dataset.standin='image'; return; }
      const texts=bits.texts||[]; if(!texts.length) return;
      el.dataset.standin=bits.kind;
      el.textContent=texts[i % texts.length];
    });
  });
}

/* ---------------- the brand's three sections ----------------
   What the reader got, in the shape you'd change it. Not a verdict:
   Hunch's own folder validated clean while shipping an empty font, and a
   screen that only said "0 problems" would have kept that hidden. */

const attr = v => esc(JSON.stringify(v));

const setupRowEl = (label, html, empty) =>
  `<div class="setup-brow"><div class="setup-blab">${esc(label)}</div>`+
  `<div class="setup-bval${empty?' empty':''}">${html}</div></div>`;

/* ---------------- THE SHELVES ----------------
   Three blocks, one question each shelf has already been asked by the
   server: does this have to be filled?

     LOCKED AND LOADED  it's there
     GAPS TO FILL       it has to be there and it isn't. Refuses the lock.
     WAITING ROOM       it doesn't have to be, and it isn't. Refuses nothing.

   N/A sits quietly in the first block, because "not needed" is a thing you
   checked, not a thing that vanished.

   A pill is a door, not a verdict: tap it and you land on the section it
   lives in. The colours are the room's own — ink for settled, red for the
   hole, outline for the queue. No green anywhere in this app. */
function setupShelfPill(sh){
  const cls = sh.state==='na' ? 'na' : sh.state;
  /* a shelf pill is a label; an Open line is a sentence you wrote. Clip the
     sentence to pill length and hang the whole of it on the hover, so the
     row stays a row. */
  const long = sh.kind==='open';
  const face = long && sh.label.length>44 ? sh.label.slice(0,43).replace(/[\s,;:.]+$/,'')+'…' : sh.label;
  const tip = sh.state==='na' ? STR.setup.shelves.na : (long ? sh.label : (sh.note||''));
  return `<button class="setup-pill ${cls}${long?' long':''}" data-k="${esc(sh.key)}"`+
    ` data-rail="${esc(sh.rail)}" title="${esc(tip)}"`+
    ` onclick="setupGo('${esc(sh.rail)}')">${esc(face)}</button>`;
}

function setupShelvesDraw(){
  const box=$('setupShelves'); if(!box) return;
  const all=((SETUP_DATA||{}).brandRead||{}).shelves;
  const brand = SETUP_KIND==='brands' && !!all;
  /* one column, one occupant. A brand is all fields, so the chat has
     nothing to do in it; a container is a picture, and gets the chat back. */
  $('setupChatCard').hidden = brand;
  $('setupRailLoz').hidden  = brand;
  if(!brand){ box.hidden=true; box.innerHTML=''; return; }
  box.hidden=false;
  const pick = f => all.filter(f);
  /* the row classes are prefixed because the app already owns .waiting —
     FIX IT's queue chip, dashed and uppercase — and an unprefixed one
     inherited it silently. Name a class after a state and something else
     will already be called that. */
  const rows=[
    ['sh-have', STR.setup.shelves.have,    pick(s=>s.state==='have'||s.state==='na')],
    ['sh-gaps', STR.setup.shelves.gaps,    pick(s=>s.state==='gap')],
    ['sh-wait', STR.setup.shelves.waiting, pick(s=>s.state==='waiting')],
  ];
  box.innerHTML = rows.map(([k,label,list])=>
    `<div class="setup-shelf ${k}${list.length?'':' none'}">`+
      `<div class="setup-shlab">${esc(label)}<i>${list.length}</i></div>`+
      (list.length ? `<div class="setup-pills">${list.map(setupShelfPill).join('')}</div>` : '')+
    `</div>`).join('');
}

/* the gaps that belong to the section you're standing in */
function setupGapsHere(){
  const all=((SETUP_DATA||{}).brandRead||{}).shelves||[];
  return all.filter(s=>s.state==='gap' && s.rail===SETUP_STOP);
}

/* the refusal: the hole says so, rather than a message describing it */
function setupFlash(gaps){
  const keys=gaps.map(g=>g.key);
  document.querySelectorAll('#setupShelves .setup-pill').forEach(p=>{
    if(keys.indexOf(p.dataset.k)<0) return;
    p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash');
  });
}

function setupBrandDraw(){
  const b=(SETUP_DATA||{}).brandRead, box=$('setupBrand');
  if(!b){ box.innerHTML=setupRowEl('No brand', esc(STR.setup.nobrandhere), true); return; }
  box.innerHTML = ({look:setupLook, prompt:setupPrompt, legals:setupLegals}[SETUP_STOP]||(()=>''))(b);
}

/* LOOK — brandlook.md and assets/, together. The reader doesn't read files,
   it reads the lines that name them; a font in the folder that no line
   names is invisible to the engine. Both halves or the check is worthless. */
function setupLook(b){
  const L=b.look;
  let h='';
  if(!L.fonts.length) h+=setupRowEl('Font','No **Font:** line in brandlook.md.',true);
  L.fonts.forEach(f=>{
    const key='Font'+(f.role?' — '+f.role:'');
    h+=setupRowEl(key, setupEdit('look','line',{key}, f.text) +
      (f.names.length ? `<div class="setup-files">${f.names.map(n=>setupNamed(L,n)).join('')}</div>`
                      : `<div class="setup-sub">${esc(STR.setup.stacknotface)}</div>`), !f.text);
  });
  h+=setupRowEl('Logo', setupEdit('look','line',{key:'Logo'}, L.logo), !L.logo);
  if(L.mark) h+=setupRowEl('Mark', setupEdit('look','line',{key:'Mark'}, L.mark));
  h+=setupRowEl('Colours', L.colours.length
    ? '<div class="setup-swatches">'+L.colours.map(c=>
        `<label class="setup-sw"><i style="background:${esc(c.hex)}"></i>`+
        `<span class="setup-swname">${esc(c.key)}</span>`+
        `<input class="setup-hex" value="${esc(c.hex)}" maxlength="7" spellcheck="false"`+
        ` onchange="setupSave('look','hex',{key:${attr(c.key)}},this.value,this)"></label>`).join('')+
      `</div>`+setupAddColour()
    : setupAddColour(), !L.colours.length);
  h+=setupRowEl('In assets/', L.files.length
    ? '<div class="setup-files">'+L.files.map(setupPill).join('')+'</div>'
    : 'assets/ is empty.', !L.files.length);
  if(L.missing.length) h+=setupRowEl('Named, not there',
    '<div class="setup-files">'+L.missing.map(f=>`<span class="setup-file gone">${esc(f)}</span>`).join('')+'</div>'+
    `<div class="setup-sub">${esc(STR.setup.missingfiles)}</div>`, true);
  if(L.spare.length) h+=setupRowEl('Never named',
    '<div class="setup-files">'+L.spare.map(f=>`<span class="setup-file">${esc(f)}</span>`).join('')+'</div>');
  if(SETUP_NAMING) h+=setupRowEl('Name it', setupNameRow(L, SETUP_NAMING), true);
  h+=setupRowEl('Add', `<label class="setup-morebtn">ADD A FILE`+
    `<input type="file" hidden onchange="setupAdd(this)"></label>`);
  return h;
}

/* A NEW COLOUR. The palette is bold lines carrying a hex, so adding one
   needs both halves — the name is the token a container reaches for, the
   hex is what it gets. Editing an existing one is the swatch; this only
   ever creates, and the server refuses a name that's already a line. */
function setupAddColour(){
  return `<div class="setup-newcol">`+
    `<input class="setup-colname" id="setupColName" maxlength="24" spellcheck="false"`+
    ` placeholder="${esc(STR.setup.colour.name)}">`+
    `<input class="setup-colhex" id="setupColHex" maxlength="7" spellcheck="false"`+
    ` placeholder="${esc(STR.setup.colour.hex)}">`+
    `<button class="setup-colgo" onclick="setupNewColour()">${esc(STR.setup.colour.add)}</button>`+
  `</div>`;
}

function setupNewColour(){
  const n=$('setupColName'), x=$('setupColHex');
  const key=(n.value||'').trim(), hex=(x.value||'').trim();
  n.classList.remove('bad'); x.classList.remove('bad');
  if(!key){ n.classList.add('bad'); return; }
  if(!/^#[0-9A-Fa-f]{6}$/.test(hex)){ x.classList.add('bad'); return; }
  setupSave('look','colour',{key}, hex, null);
}

/* PROMPT — brandvoice.md by section. WRITER still eats the whole file; the
   sections are how you read and rewrite it, not a change to what it gets. */
function setupPrompt(b){
  let h=setupRowEl('Whole file', `${b.prompt.chars.toLocaleString()} characters, eaten whole by WRITER and FIXER.`);
  (b.prompt.sections||[]).filter(s=>s.body.trim()).forEach(s=>{
    if(!s.title) h+=setupRowEl('Opening', `<div class="setup-ro">${esc(s.body)}</div>`);
    else h+=setupRowEl(s.title, setupEdit('voice','section',{heading:s.title}, s.body));
  });
  return h;
}

/* LEGALS — the client's own words. Chosen, never written, and they land
   verbatim, which is why they aren't on the same screen as the voice. */
function setupLegals(b){
  if(!b.legals.length) return setupRowEl('Clauses','No brandlegals.md, or no rows in it.',true);
  return b.legals.map(c=>setupRowEl((c.label||c.id)+(c.fixed?' · always':''),
    setupEdit('legals','cell',{row:c.id, column:'text'}, c.text), !c.text)).join('');
}

/* ---------------- the mechanics of an edit ----------------
   A value you can change is a box you type in and tab out of. It saves,
   the server re-reads the folder, and the page redraws from the parse —
   never from what it thought it just did. The first edit of something
   landed makes it a draft; opening it didn't. */
function setupEdit(file, op, args, value, readonly){
  if(readonly) return `<div class="setup-ro">${esc(value||'')}</div>`;
  return `<textarea class="setup-edit" rows="${Math.min(14, Math.max(2, Math.ceil((value||'').length/70)))}"`+
    ` onchange="setupSave('${file}','${op}',${attr(args)},this.value,this)">${esc(value||'')}</textarea>`;
}

function setupSave(file, op, args, value, el){
  if(el){ el.classList.remove('bad'); el.classList.add('saving'); }
  fetch('/api/setup/edit',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(Object.assign({id:SETUP_ID, file, op, value}, args))})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      if(el) el.classList.remove('saving');
      if(!ok){ if(el) el.classList.add('bad'); setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
      setupWrote(d);
    })
    .catch(()=>{ if(el){ el.classList.remove('saving'); el.classList.add('bad'); }
                 setupChat(STR.setup.edit.failed); });
}

/* every write is followed by a read. The validator runs again and says so,
   because an edit that breaks the folder should announce itself now rather
   than at the push. */
function setupWrote(d){
  if(d.brandRead) SETUP_DATA.brandRead=d.brandRead;
  SETUP_DATA.problems=d.problems;
  setupState(d.state);
  setupShelvesDraw(); setupBrandDraw(); setupPaint();
  setupChat((d.problems||[]).length ? STR.setup.rereadBad(d.problems.length) : STR.setup.rereadOk);
}

/* ---------------- naming what just landed ----------------
   The server knows what the file is CALLED. Only you know what it IS —
   that svg is the logo or the mark, that otf is the headline face or the
   body one — so the room asks once, in one tap, and the write goes
   through the same surgical lane as everything else: the filename is
   appended to the line, and the sentence you wrote around it survives. */
function setupNameOpts(L, file){
  if(/\.(otf|ttf|woff2?)$/i.test(file)){
    const keys=(L.fonts||[]).map(f=>'Font'+(f.role?' — '+f.role:''));
    return keys.length ? keys : ['Font'];
  }
  if(/\.(svg|png|jpe?g|gif|webp)$/i.test(file)) return ['Logo','Mark'];
  return [];
}

function setupNameRow(L, file){
  const opts=setupNameOpts(L, file);
  if(!opts.length) return `<div class="setup-sub">${esc(STR.setup.naming.none)}</div>`;
  return `<div class="setup-name">${esc(STR.setup.naming.ask(file))}</div>`+
    `<div class="setup-namebtns">`+
      opts.map(k=>`<button class="setup-namego" onclick="setupName(${attr(k)})">${esc(k)}</button>`).join('')+
      `<button class="setup-nameskip" onclick="setupNameSkip()">${esc(STR.setup.naming.leave)}</button>`+
    `</div>`;
}

function setupName(key){
  const file=SETUP_NAMING; if(!file) return;
  SETUP_NAMING='';
  setupSave('look','name',{key}, file, null);
  setupChat(STR.setup.naming.done(file));
}

function setupNameSkip(){
  const file=SETUP_NAMING; SETUP_NAMING='';
  setupBrandDraw(); setupChat(STR.setup.naming.left(file));
}

/* ---------------- assets: add and prune ---------------- */

function setupAdd(input){
  const f=input.files && input.files[0]; if(!f) return;
  const fd=new FormData(); fd.append('id',SETUP_ID); fd.append('file', f);
  fetch('/api/setup/asset/add',{method:'POST',body:fd})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
                      SETUP_NAMING=f.name;
                      setupWrote(d); setupChat(STR.setup.added(f.name)); });
}

function setupPrune(file){
  fetch('/api/setup/asset/drop',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:SETUP_ID, file})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
                      setupWrote(d); setupChat(STR.setup.pruned(file)); });
}

/* ---------------- pills that show what they point at ----------------
   A filename tells you nothing. The artwork tells you whether it's the
   right artwork, and a specimen line tells you whether it's the right
   weight — which is the check. */
function setupPill(f){
  return `<span class="setup-file${f.named?' named':''}">`+
    `<button class="setup-fname" onclick="setupPeek(${attr(f.file)},${attr(f.url)},${f.font})">${esc(f.file)}</button>`+
    `<button class="setup-fx" title="Prune it" onclick="setupPrune(${attr(f.file)})">×</button></span>`;
}
function setupNamed(L, name){
  const f=L.files.find(x=>x.file===name);
  return f ? setupPill(f) : `<span class="setup-file gone">${esc(name)}</span>`;
}

function setupPeek(name, url, isFont){
  $('setupPeekName').textContent=name;
  const body=$('setupPeekBody');
  if(isFont){
    body.innerHTML = `<style>@font-face{font-family:'setup-peek';src:url('${url}');}</style>`+
      `<div class="setup-spec" style="font-family:'setup-peek',sans-serif">`+
      `ABCDEFGHIJKLM<br>NOPQRSTUVWXYZ<br>abcdefghijklm nopqrstuvwxyz<br>0123456789</div>`+
      `<div class="setup-sub">${esc(STR.setup.specimen)}</div>`;
  } else if(/\.(svg|png|jpe?g|gif|webp)$/i.test(name)){
    body.innerHTML = `<div class="setup-shot"><img src="${url}" alt="${esc(name)}"></div>`;
  } else if(/\.(md|txt)$/i.test(name)){
    body.innerHTML = '<pre class="setup-voice">…</pre>';
    fetch(url).then(r=>r.text()).then(t=>{ body.innerHTML=`<pre class="setup-voice">${esc(t)}</pre>`; })
      .catch(()=>{ body.innerHTML='<div class="setup-sub">Can’t read it.</div>'; });
  } else {
    body.innerHTML = `<div class="setup-sub">No preview for this one. `+
      `<a class="setup-peeklink" href="${url}" target="_blank" rel="noopener">Open it</a></div>`;
  }
  shadeOpen('setup-peek');
}

/* ---------------- the chat ----------------
   The opening lines are the validator's, in the robot's mouth — no model
   decides whether a folder is clean. Everything after them is a
   conversation, and that is this room's whole job:

     you look at the artefact -> you say what is wrong -> it proposes the
     smallest change -> you see before and after -> you confirm, or you don't.

   BRANDS DON'T GET THIS. A brand is entirely fields; every shelf maps to a
   line and every line is a box you type in, so there is nothing to say to
   it. A container has no fields — "the header's too tight" is a sentence,
   not a form — which is why the chat lives here and only here. */
function setupChat(line, d){
  /* A brand's problems are the red pills; saying them again in a log is
     the same sentence twice. So the brand room keeps one line — what just
     happened — and the transcript stays with the container. */
  if(SETUP_KIND==='brands'){
    const note=$('setupNote');
    note.innerHTML = line ? RAIL.robot(esc(line)) : '';
    return;
  }
  const box=$('setupChat');
  if(d){
    SETUP_SAID=[];
    const probs=d.problems||[];
    SETUP_SAID.push(RAIL.robot(probs.length ? esc(STR.setup.bounced(probs.length))
                                            : esc(STR.setup.clean), true));
    if(probs.length) SETUP_SAID.push(RAIL.robot('<ul class="setup-probs">'+
      probs.map(p=>`<li>${esc(p)}</li>`).join('')+'</ul>'));
    /* THE WAITING ROOM. `## Open` has been in the schema since containers
       existed and nothing has ever shown it. Asks parked here travel with
       the folder, so the next person reads them whether or not they were
       in the room when they were said. */
    const open=d.open||[];
    if(open.length) SETUP_SAID.push(RAIL.robot(esc(STR.setup.open(open.length))+
      '<ul class="setup-probs open">'+open.map(o=>`<li>${esc(o)}</li>`).join('')+'</ul>'));
    /* WHAT IT WEARS THAT THE BRAND NEVER DECLARED. Not a problem and it
       refuses nothing — the MUST list belongs to the validator and this
       room does not get a second opinion. A line, because sometimes it is
       a mistake and sometimes it is deliberate, and only you know which. */
    const stray=d.strays||[];
    if(stray.length) SETUP_SAID.push(RAIL.robot(esc(STR.setup.strays)+
      '<ul class="setup-probs open">'+stray.map(x=>
        `<li>${esc(x.strays.join(', '))} — <b>${esc(x.selector)}</b> ${esc(x.prop)}</li>`).join('')+'</ul>'));
  }
  if(line) SETUP_SAID.push(RAIL.robot(esc(line)));
  box.innerHTML=SETUP_SAID.join('');
  box.scrollTop = line ? box.scrollHeight : 0;
}

/* one turn of the conversation, kept so a redraw doesn't wipe the thread */
function setupSay(html, who){
  SETUP_SAID.push(who==='me' ? RAIL.me(html) : RAIL.robot(html, who==='robot'));
  const box=$('setupChat'); box.innerHTML=SETUP_SAID.join('');
  box.scrollTop=box.scrollHeight;
}

function setupThinking(on){
  SETUP_BUSY=on;
  $('setupSend').disabled=on; $('setupNote2').disabled=on;
  const box=$('setupChat'); let t=box.querySelector('.chat-think');
  if(on && !t){ t=document.createElement('div'); t.className='chat-row chat-think';
                t.innerHTML=RAIL.think(); box.appendChild(t); box.scrollTop=box.scrollHeight; }
  if(!on && t) t.remove();
}

/* ---------------- asking ----------------
   The sentence goes to a router that never sees a file, then to the one
   robot that owns the file it picked. Nothing is written by asking — the
   draft is made by the CONFIRM, so a question you think better of leaves
   the folder exactly as it was. */
function setupAsk(){
  const box=$('setupNote2'), ask=(box.value||'').trim();
  if(!ask || SETUP_BUSY) return;
  box.value='';
  /* carrying on the conversation used to bin an unanswered proposal in
     silence — you could talk all day and land nothing, which is exactly
     what it did. Now it puts itself back and says so. */
  if(SETUP_PROP){ SETUP_PROP=null; setupPreviewOff(); setupSpend();
                  setupSay(esc(STR.setup.chat.superseded),'robot'); }
  setupSay(esc(ask),'me');
  setupThinking(true);
  fetch('/api/setup/chat',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:SETUP_ID, ask, said:setupHeard()})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      setupThinking(false);
      if(!ok){ setupSay(esc(STR.setup.chat[d.error]||STR.setup.chat.robot),'robot'); return; }
      if(d.park){ setupPark(d, ask); return; }
      setupProposal(d);
    })
    .catch(()=>{ setupThinking(false); setupSay(esc(STR.setup.chat.robot),'robot'); });
}

/* what has been said, so a follow-up ("no, smaller") routes with the thread
   behind it rather than as a sentence out of nowhere */
function setupHeard(){
  return SETUP_SAID.slice(-8).map(h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())
    .filter(Boolean).map(t=>t.length>180 ? t.slice(0,179)+'\u2026' : t);
}

/* ---------------- the proposal, which you are already looking at ----------
   Michael's sentence, and the reason this room exists:

     "I should be able to say 'Not that font in the headline, this one'
      AND IT CHANGES and I confirm and then commit to send it live."

   The change comes FIRST. The artefact on the left IS the proposal — made
   on a copy of the folder, server-side, through the same lane that would
   make it for real, so what you are looking at is the change rather than an
   impression of it. Nothing is on disk yet.

   Which makes KEEP IT mean what it says: you looked at it, you're keeping
   it. The diff underneath is evidence, not the decision. The 'before' in it
   is still read off the file by the server and never taken from the robot,
   which has no way of knowing what is actually there and every incentive to
   sound sure. */
const PREVIEW_KEYS=['html','ghost','checklist','modules','standIn','standInDeets','strays'];

function setupPreviewOn(prev){
  if(!prev) return false;
  SETUP_WAS={}; PREVIEW_KEYS.forEach(k=>{ if(k in SETUP_DATA) SETUP_WAS[k]=SETUP_DATA[k]; });
  PREVIEW_KEYS.forEach(k=>{ if(k in prev) SETUP_DATA[k]=prev[k]; });
  CONT=SETUP_DATA; setupContainerDraw(SETUP_DATA);
  return true;
}

/* putting it back is a restore, not another round trip — what you were
   looking at a second ago never left the page */
function setupPreviewOff(){
  if(!SETUP_WAS) return;
  Object.assign(SETUP_DATA, SETUP_WAS); SETUP_WAS=null;
  CONT=SETUP_DATA; setupContainerDraw(SETUP_DATA);
}

function setupProposal(d){
  SETUP_PROP=d;
  const live=setupPreviewOn(d.preview);
  /* a change you can see gets "keep it?". One that renders to nothing — a
     length in spec.md, a folder that wouldn't parse — is still a real
     proposal, and gets the diff and an honest label instead. */
  const say=d.say ? RAIL.robot(esc(d.say), true) : '';
  SETUP_SAID.push(say+setupDiff(d, live));
  const box=$('setupChat'); box.innerHTML=SETUP_SAID.join(''); box.scrollTop=box.scrollHeight;
  if(live) setupGo('output');
}

/* line by line, marked where it differs. A one-line change reads as one
   line; a rewritten section reads as the lines that moved. */
function setupDiff(d, live){
  const a=String(d.before||'').split('\n'), b=String(d.after||'').split('\n');
  const row=(t,cls)=>`<div class="setup-dl ${cls}">${esc(t)||'&nbsp;'}</div>`;
  let out='';
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++){
    const x=a[i]===undefined?null:a[i], y=b[i]===undefined?null:b[i];
    if(x===y){ out+=row(x,'same'); continue; }
    if(x!==null) out+=row(x,'out');
    if(y!==null) out+=row(y,'in');
  }
  const C=STR.setup.chat;
  /* a change that is real in the file and invisible on screen has to say so
     here. A room that promises "say it and it changes" must never report a
     change you cannot see as one. */
  const note = d.note ? `<div class="setup-propnote">${esc(d.note)}</div>` : '';
  return `<div class="setup-prop${live?' live':''}${d.note?' quiet':''}">`+
    `<div class="setup-propfile">${esc(d.file||'')} <span>${esc(d.label||'')}</span></div>`+
    `<div class="setup-diff">${out}</div>`+note+
    `<div class="setup-propgo">`+
      `<button class="setup-yes" onclick="setupConfirm()">${esc(live?C.keep:C.yes)}</button>`+
      `<button class="setup-no" onclick="setupReject()">${esc(live?C.back:C.no)}</button>`+
    `</div></div>`;
}

function setupConfirm(){
  const prop=SETUP_PROP; if(!prop || SETUP_BUSY) return;
  /* keeping it: the preview stays on screen while the write goes in behind
     it, so the picture never flickers back to the old one on the way. */
  SETUP_PROP=null; SETUP_WAS=null; setupThinking(true);
  fetch('/api/setup/apply',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:SETUP_ID, proposal:prop})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      setupThinking(false);
      if(!ok){ setupPreviewOff(); setupSay(esc(STR.setup.edit[d.error]||STR.setup.edit.failed),'robot'); return; }
      setupSpend(); setupLanded(d); setupSay(esc(STR.setup.chat.done),'robot');
    })
    .catch(()=>{ setupThinking(false); setupSay(esc(STR.setup.edit.failed),'robot'); });
}

/* a card that has been answered stops offering the answer — but stays in
   the thread. A proposal you confirmed and a proposal you turned down are
   both part of the conversation, and blanking either makes the log a lie. */
function setupSpend(){
  SETUP_SAID=SETUP_SAID.map(h=>h.replace(/class="setup-prop"/g,'class="setup-prop spent"'));
  $('setupChat').innerHTML=SETUP_SAID.join('');
}

function setupReject(){
  SETUP_PROP=null; setupPreviewOff(); setupSpend();
  setupSay(esc(STR.setup.chat.dropped),'robot');
}

/* ---------------- hang on a sec ----------------
   An ask the six edits can't do is not a failure and not a no. It is a
   thing to decide, and the worst place to leave it is a chat window that
   closes. So it goes in the folder under `## Open` and travels with the
   push. */
function setupPark(d, ask){
  const line=(d.ask||ask||'').trim();
  SETUP_SAID.push(RAIL.robot(esc(d.say||STR.setup.chat.beyond)+
    `<div class="setup-propgo park">`+
      `<button class="setup-yes" onclick="setupParkGo(${attr(line)})">${esc(STR.setup.chat.park)}</button>`+
      `<button class="setup-no" onclick="setupReject()">${esc(STR.setup.chat.leave)}</button>`+
    `</div>`, true));
  const box=$('setupChat'); box.innerHTML=SETUP_SAID.join(''); box.scrollTop=box.scrollHeight;
}

function setupParkGo(line){
  if(SETUP_BUSY) return;
  setupThinking(true);
  fetch('/api/setup/park',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:SETUP_ID, line})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      setupThinking(false);
      if(!ok){ setupSay(esc(STR.setup.edit[d.error]||STR.setup.edit.failed),'robot'); return; }
      setupLanded(d); setupSay(esc(STR.setup.chat.parked),'robot');
    })
    .catch(()=>{ setupThinking(false); setupSay(esc(STR.setup.edit.failed),'robot'); });
}

/* ---------------- undo ----------------
   Per edit, per sitting, in memory — the same deal as the locks, and it
   puts the changelog line and the version bump back with the change,
   because an undo that left those behind would be a lie in the folder. */
function setupUndo(){
  if(!SETUP_UNDO || SETUP_BUSY) return;
  setupThinking(true);
  fetch('/api/setup/undo',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({id:SETUP_ID})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      setupThinking(false);
      if(!ok){ setupSay(esc(STR.setup.edit[d.error]||STR.setup.edit.failed),'robot'); return; }
      setupLanded(d); setupSay(esc(STR.setup.chat.undone),'robot');
    })
    .catch(()=>{ setupThinking(false); setupSay(esc(STR.setup.edit.failed),'robot'); });
}

/* every write is followed by a read, and the artefact is redrawn from the
   parse — not from what the page thought it just did. A change that didn't
   land the way it read has to show that here rather than at the push. */
function setupLanded(d){
  Object.assign(SETUP_DATA, d);
  CONT=SETUP_DATA;
  SETUP_UNDO=d.undo||0;
  $('setupUndo').hidden = !SETUP_UNDO;
  setupState(d.state);
  setupContainerDraw(SETUP_DATA);
  setupPaint();
}

/* ---------------- the stops ---------------- */

function setupGo(key){
  SETUP_STOP=key;
  const rail=SETUP_RAILS[SETUP_KIND], s=rail.find(x=>x.key===key)||rail[0];
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('on', b.dataset.s===key));
  document.querySelectorAll('#setupStage .setup-pane').forEach(p=>
    p.classList.toggle('on', p.dataset.p===SETUP_PANE[key]));
  $('setupLoz').textContent=s.loz; $('setupHint').textContent=s.hint;
  if(SETUP_KIND==='brands') setupBrandDraw();
  setupPaint();
}

/* the padlock means what it means everywhere else: shut is settled. And
   settled has a floor — a section with a MUST-HAVE gap in it can't be
   called checked, so the lock refuses and the gaps flash. Reopening is
   always free; only shutting is a claim. */
function setupPadTap(){
  const wrap=$('setupPush');
  if(wrap.classList.contains('held')) return;          // mid-beat; ignore
  if(SETUP_SHUT[SETUP_STOP]){ SETUP_SHUT[SETUP_STOP]=false; setupPaint(); return; }
  const gaps=setupGapsHere();
  if(gaps.length){ setupFlash(gaps); setupChat(STR.setup.shelves.refuse(gaps.length)); return; }
  SETUP_SHUT[SETUP_STOP]=true;
  setupChat('');
  setupPaint();
  /* a beat before it moves you on. Shutting a section and being somewhere
     else in the same instant reads as a glitch; the pause is what makes it
     read as something you did. */
  const here=(SETUP_RAILS[SETUP_KIND]||[]).find(x=>x.key===SETUP_STOP);
  if(here){
    $('setupPushLbl').textContent=STR.setup.lockedthe(here.name);
    wrap.classList.add('held');
  }
  setTimeout(()=>{ wrap.classList.remove('held'); setupNext(); setupPaint(); }, 650);
}

/* locking IS the navigation: shut one and it walks you to the next one
   still open. Going back is the rail, which never locks you out. */
function setupNext(){
  const nxt=(SETUP_RAILS[SETUP_KIND]||[]).find(s=>!SETUP_SHUT[s.key]);
  if(nxt) setupGo(nxt.key);
}

/* the wrap button is two buttons wearing one coat, exactly as FIX IT's is:
   while the section you're in is open it locks that section by name, and
   once every section is shut it becomes the push. */
function setupWrapTap(){
  if($('setupPush').classList.contains('held')) return;
  if(!SETUP_SHUT[SETUP_STOP]) return setupPadTap();
  setupPush();
}

function setupPaint(){
  const rail=SETUP_RAILS[SETUP_KIND]||[], shut=!!SETUP_SHUT[SETUP_STOP], pad=$('setupLock');
  pad.classList.toggle('locked', shut);
  pad.innerHTML=PADLOCK.icon[shut?'shut':'open'];
  pad.title=shut?'Checked — tap to open it again':'Looks right — tap to shut it';
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('done', !!SETUP_SHUT[b.dataset.s]));

  /* PUSH is the room's job, not the list's — it can see whether the folder
     reads clean, and a list can't. Dead unless it's a draft, every stop is
     checked, and there are no problems. */
  const left=rail.filter(s=>!SETUP_SHUT[s.key]).length;
  const probs=((SETUP_DATA||{}).problems||[]).length;
  const draft=(SETUP_DATA||{}).state==='draft';
  const ready = draft && !left && !probs;
  const here=rail.find(x=>x.key===SETUP_STOP);
  /* naming the section it will lock comes first, and it comes first even on
     a folder with nothing to push — checking a live brand is free, and a
     dead button on the one thing you CAN do here reads as broken. */
  $('setupPushLbl').textContent =
      !SETUP_SHUT[SETUP_STOP] && here ? 'LOCK THE '+here.name.toUpperCase()
    : !draft ? 'NOTHING TO PUSH'
    : probs ? (probs===1 ? '1 PROBLEM' : probs+' PROBLEMS')
    : left ? (left+' BIT'+(left>1?'S':'')+' TO CHECK') : 'PUSH';
  $('setupPushIco').innerHTML = PADLOCK.icon[ready?'shut':'open'];
  $('setupPush').classList.toggle('ready', ready);
}

/* PUSH sends the draft to git as one ordinary commit, and that is what
   makes it live. Three gates before it goes: it has to be a draft, it has
   to read clean, and you have to have looked at every stop. The server
   checks the first two again — a button is a request, not a permission. */
function setupPush(){
  const rail=SETUP_RAILS[SETUP_KIND]||[];
  if((SETUP_DATA||{}).state!=='draft'){ setupChat(STR.setup.nothingtopush); return; }
  const probs=((SETUP_DATA||{}).problems||[]).length;
  if(probs){ setupChat(STR.setup.fixfirst(probs)); return; }
  const open=rail.find(s=>!SETUP_SHUT[s.key]);
  if(open){ setupGo(open.key); setupChat(STR.setup.notyet(open.loz.toLowerCase())); return; }
  $('setupPushLbl').textContent='PUSHING…';
  fetch('/api/setup/push',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({kind:SETUP_KIND, id:SETUP_ID})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      if(!ok){
        setupPaint();
        if(d.error==='brandfirst'){ setupChat(STR.setup.brandfirst(d.brand)); return; }
        if(d.error==='unclean'){ setupChat(STR.setup.fixfirst((d.problems||[]).length)); return; }
        setupChat(STR.setup.push[d.error] || STR.setup.edit.failed); return;
      }
      /* it landed. It isn't a draft any more, and the list says so. */
      setupChat(STR.setup.pushed(d));
      SETUP_DATA.state='live'; setupState('live'); setupPaint();
    })
    .catch(()=>{ setupPaint(); setupChat(STR.setup.edit.failed); });
}

/* Discard throws away the draft. What landed is untouched — that is the
   whole point of the copy. */
function setupDiscard(){
  if(!confirm(STR.setup.discardsure)) return;
  fetch('/api/setup/discard',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({kind:SETUP_KIND, id:SETUP_ID})})
    .then(()=>setupHome()).catch(()=>setupChat(STR.setup.edit.failed));
}
