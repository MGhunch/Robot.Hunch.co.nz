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

/* the stops each kind walks */
const SETUP_RAILS = {
  brands: [
    {key:'look',   name:'Look',    loz:'The look',   tag:'Right faces, right files?',
     hint:'brandlook.md and assets/. The files in the folder and the lines that name them — when those two disagree, that gap is the bug.'},
    {key:'prompt', name:'Prompt',  loz:'The prompt', tag:'Sound like them?',
     hint:'brandvoice.md, eaten whole by WRITER and FIXER. Tap a section to read or rewrite it.'},
    {key:'legals', name:'Legals',  loz:'The clauses', tag:'Right words?',
     hint:'brandlegals.md — the client’s own words, pulled into containers with @brand.'},
  ],
  containers: [
    {key:'mock',   name:'Mock up', loz:'The bones',  tag:'Does this look right?',
     hint:'The ghost, off the html’s tags — the same drawing FEED IT shows.'},
    {key:'deets',  name:'Deets',   loz:'The deets, empty', tag:'Everything covered?',
     hint:'The checklist as the client first meets it. Nothing filled: the shape is the check.'},
    {key:'output', name:'Output',  loz:'The artefact', tag:'Pixel perfect?',
     hint:'container.html, as it leaves the building.'},
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

function setupInit(){ $('setup').classList.add('on'); setupHome(); }

function setupHome(){
  SETUP_KIND=''; SETUP_ID=''; SETUP_DATA=null; SETUP_SAID=[];
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
  /* a container goes on the table exactly as a live one would, so every
     renderer below reads what it always reads. CID stays empty: a peek
     during a check is not a peek by a client. */
  CONT = kind==='containers' ? d : null; CID='';
  $('setupHome').hidden=true; $('setupStage').hidden=false;

  const b=d.brandRead||{};
  $('setupHed').textContent = kind==='brands' ? 'THE BRAND' : 'THE CONTAINER';
  $('setupTile').innerHTML = kind==='brands'
    ? esc(b.name||id) + ' <span>· '+esc(id)+'</span>'
    : esc((d.tile||{}).name||id) + ' <span>· '+esc(b.name||d.brandWanted||'')+'</span>';
  setupState(d.state);

  const rail=SETUP_RAILS[kind];
  $('setupRail').innerHTML = rail.map((s,i)=>
    `<button class="step" data-s="${s.key}" onclick="setupGo('${s.key}')"><i>${i+1}</i>${esc(s.name)}</button>`).join('');
  rail.forEach(s=>SETUP_SHUT[s.key]=false);

  if(kind==='containers') setupContainerDraw(d);
  setupChat(null, d);
  setupGo(rail[0].key);
}

function setupState(state){
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
  deetsReset(); deetsInit(); deetsRender();
  /* the artefact in its own document, so its css can't touch ours — and
     grown to its full height, because a scrollbar is not a check. */
  const fr=$('setupArt');
  fr.onload=()=>{ try{ fr.style.height=Math.max(400, fr.contentDocument.body.scrollHeight+24)+'px'; }catch(e){} };
  fr.srcdoc = d.html||'';
}

/* ---------------- the brand's three sections ----------------
   What the reader got, in the shape you'd change it. Not a verdict:
   Hunch's own folder validated clean while shipping an empty font, and a
   screen that only said "0 problems" would have kept that hidden. */

const attr = v => esc(JSON.stringify(v));

const setupRowEl = (label, html, empty) =>
  `<div class="setup-brow"><div class="setup-blab">${esc(label)}</div>`+
  `<div class="setup-bval${empty?' empty':''}">${html}</div></div>`;

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
      `</div><div class="setup-sub">${esc(STR.setup.hexonly)}</div>`
    : 'No colour lines found.', !L.colours.length);
  h+=setupRowEl('In assets/', L.files.length
    ? '<div class="setup-files">'+L.files.map(setupPill).join('')+'</div>'
    : 'assets/ is empty.', !L.files.length);
  if(L.missing.length) h+=setupRowEl('Named, not there',
    '<div class="setup-files">'+L.missing.map(f=>`<span class="setup-file gone">${esc(f)}</span>`).join('')+'</div>'+
    `<div class="setup-sub">${esc(STR.setup.missingfiles)}</div>`, true);
  if(L.spare.length) h+=setupRowEl('Never named',
    '<div class="setup-files">'+L.spare.map(f=>`<span class="setup-file">${esc(f)}</span>`).join('')+'</div>'+
    `<div class="setup-sub">${esc(STR.setup.sparefiles)}</div>`);
  h+=setupRowEl('Add', `<label class="setup-morebtn">ADD A FILE`+
    `<input type="file" hidden onchange="setupAdd(this)"></label>`+
    `<div class="setup-sub">${esc(STR.setup.addfile)}</div>`);
  return h;
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
  setupBrandDraw(); setupPaint();
  setupChat((d.problems||[]).length ? STR.setup.rereadBad(d.problems.length) : STR.setup.rereadOk);
}

/* ---------------- assets: add and prune ---------------- */

function setupAdd(input){
  const f=input.files && input.files[0]; if(!f) return;
  const fd=new FormData(); fd.append('id',SETUP_ID); fd.append('file', f);
  fetch('/api/setup/asset/add',{method:'POST',body:fd})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
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
   Every word here is the validator's, in the robot's mouth. No model. */
function setupChat(line, d){
  const box=$('setupChat');
  if(d){
    SETUP_SAID=[];
    const probs=d.problems||[];
    SETUP_SAID.push(RAIL.robot(probs.length ? esc(STR.setup.bounced(probs.length))
                                            : esc(STR.setup.clean), true));
    if(probs.length) SETUP_SAID.push(RAIL.robot('<ul class="setup-probs">'+
      probs.map(p=>`<li>${esc(p)}</li>`).join('')+'</ul>'));
  }
  if(line) SETUP_SAID.push(RAIL.robot(esc(line)));
  box.innerHTML=SETUP_SAID.join('');
  box.scrollTop = line ? box.scrollHeight : 0;
}

/* ---------------- the stops ---------------- */

function setupGo(key){
  SETUP_STOP=key;
  const rail=SETUP_RAILS[SETUP_KIND], s=rail.find(x=>x.key===key)||rail[0];
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('on', b.dataset.s===key));
  document.querySelectorAll('#setupStage .setup-pane').forEach(p=>
    p.classList.toggle('on', p.dataset.p===SETUP_PANE[key]));
  $('setupLoz').textContent=s.loz; $('setupTag').textContent=s.tag; $('setupHint').textContent=s.hint;
  if(SETUP_KIND==='brands') setupBrandDraw();
  setupPaint();
}

/* the padlock means what it means everywhere else: shut is settled. */
function setupPadTap(){ SETUP_SHUT[SETUP_STOP]=!SETUP_SHUT[SETUP_STOP]; setupPaint(); }

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
  $('setupPushLbl').textContent = !draft ? 'NOTHING TO PUSH'
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
