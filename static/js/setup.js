/* =====================================================================
   ROBOT — SET UP
   The fifth room, and the only one no client ever sees. Two doors, because
   they are two jobs:

     BRAND      one per client. Fonts, assets, colours, legals, prompt.
                Checkable and editable; you take the folder away at the end.
     CONTAINER  one per format, against a brand that already exists.
                The mock, the deets, the output. Read only for now.

   You can't have a container without a brand; you can set up a brand
   without a container. That asymmetry is the whole navigation — the
   container door asks which brand before it asks for anything else.

   Doing both on one screen is what the last version tried, and it needed a
   "waiting" state to cover for not knowing which job it was on. Picking at
   the door deletes that state.

   THE LOGIC, in Michael's words: upload the zip, edit, prune, check, make
   it right, download the finished zip. Done.

   Everything on screen is drawn by the code the client will meet — the
   chrome's GHOST, deets.js's card, the container's own html — because a
   check rendered by different code checks nothing. Nothing here writes
   outside the session's scratch; brands/ and containers/ never move.
   ===================================================================== */

let SETUP_JOB='', SETUP_STOP='', SETUP_SHUT={}, SETUP_SAID=[], SETUP_DATA=null;

/* the stops each job walks. The brand's are the five things you'd edit;
   the container's are the three ways to look at what it renders. */
const SETUP_RAILS = {
  brand: [
    {key:'fonts',  name:'Fonts',   loz:'The fonts',    tag:'Right faces, right files?',
     hint:'The files in the folder, and the lines the engine reads. When those two disagree, that gap is the bug.'},
    {key:'assets', name:'Assets',  loz:'The assets',   tag:'All present?',
     hint:'Tap one to see it. Named and missing is a bounce; present and unnamed is dead weight.'},
    {key:'colours',name:'Colours', loz:'The colours',  tag:'Right palette?',
     hint:'Only the hex is read. Change it here and the rest of the line stays exactly as written.'},
    {key:'legals', name:'Legals',  loz:'The clauses',  tag:'Right words?',
     hint:'The client’s own words, pulled into containers with @brand. Tap one to read it.'},
    {key:'prompt', name:'Prompt',  loz:'The prompt',   tag:'Sound like them?',
     hint:'brandvoice.md, eaten whole by WRITER and FIXER. Tap a section to read or rewrite it.'},
  ],
  container: [
    {key:'mock',   name:'Mock up', loz:'The bones',    tag:'Does this look right?',
     hint:'The ghost, off the html’s tags — the same drawing FEED IT shows.'},
    {key:'deets',  name:'Deets',   loz:'The deets, empty', tag:'Everything covered?',
     hint:'The checklist as the client first meets it. Nothing filled: the shape is the check.'},
    {key:'output', name:'Output',  loz:'The artefact', tag:'Pixel perfect?',
     hint:'container.html, as it leaves the building.'},
  ],
};
const SETUP_PANE = {fonts:'brand', assets:'brand', colours:'brand', legals:'brand', prompt:'brand',
                    mock:'mock', deets:'deets', output:'output'};

/* the menu's fifth door, and it shows to everyone. Hunch walks through to
   the room; a client gets the honest version of what's behind it, which is
   a conversation with us — container design is the thing we sell, not a
   thing the tool does. */
menuAdd('SET UP', ()=>{ menuToggle(); enterSetup(); }, {hunch:true, otherwise:()=>menuOpen('setup-ask')});

/* ---------------- the room ---------------- */

function setupInit(){ SETUP_JOB=''; SETUP_DATA=null; SETUP_SAID=[]; SETUP_SHUT={};
  $('setup').classList.add('on'); setupDoors(); }

function setupDoors(){
  SETUP_JOB='';
  $('setupDoors').hidden=false; $('setupDrop').hidden=true; $('setupStage').hidden=true;
  setupLine('');
}

/* picking the job is the navigation. Nothing else about the room needs to
   ask which one it's on after this. */
function setupJob(job){
  SETUP_JOB=job;
  $('setupDoors').hidden=true; $('setupDrop').hidden=false; $('setupStage').hidden=true;
  $('setupZip').value=''; setupLine('');
  const brand = job==='brand';
  $('setupDropHed').textContent = brand ? 'SET UP BRAND' : 'SET UP CONTAINER';
  $('setupDropTag').textContent = brand ? 'Drop it, check it, fix it, take it away.'
                                        : 'Drop it. It’ll be drawn against its brand.';
  $('setupPadline').textContent = brand ? 'brand.md, brandvoice.md, brandlook.md, brandlegals.md and assets/. Zipped.'
                                        : 'config.md, spec.md and container.html. Zipped.';
  setupHolding();
}

/* what the room is already holding, said out loud on the pad — because the
   container job needs a brand and this is where you find out you haven't
   dropped one yet. */
function setupHolding(){
  const box=$('setupHolding');
  fetch('/api/setup/held').then(r=>r.json()).then(d=>{
    const h=d.held||{brands:[],containers:[]};
    box.innerHTML = (h.brands.length||h.containers.length)
      ? 'Holding: '+[...h.brands, ...h.containers].map(x=>`<span class="setup-file named">${esc(x)}</span>`).join(' ')
      : '';
    if(SETUP_JOB==='container' && !h.brands.length)
      box.innerHTML += '<div class="setup-warn">'+esc(STR.setup.needbrand)+'</div>';
  }).catch(()=>{ box.innerHTML=''; });
}

function setupLeave(){ $('setup').classList.remove('on'); deetsUnmount(); location.reload(); }

/* start again — the only way anything leaves the scratch */
function setupClear(){ fetch('/api/setup/clear',{method:'POST'}).catch(()=>{}).then(()=>setupLeave()); }

/* ---------------- the drop ---------------- */

function setupTake(files){
  const f=files && files[0]; if(!f) return;
  if(!/\.zip$/i.test(f.name)){ setupLine(STR.setup.read.broken); return; }
  setupLine(''); $('setupDropBtn').disabled=true;
  const fd=new FormData(); fd.append('zip', f);
  fetch('/api/setup/check',{method:'POST',body:fd})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      $('setupDropBtn').disabled=false;
      if(!ok){ setupLine(STR.setup.read[d.error] || STR.setup.read.broken); return; }
      setupShow(d);
    })
    .catch(()=>{ $('setupDropBtn').disabled=false; setupLine(STR.setup.read.broken); });
}

function setupLine(text){
  const box=$('setupSay'); box.innerHTML='';
  if(text) box.appendChild(robotLine(text,{cls:'onred',stick:true}));
}

/* ---------------- what came back ---------------- */

function setupShow(d){
  SETUP_DATA=d;
  /* the container goes on the table exactly as a live one would, so every
     renderer below reads what it always reads. CID stays empty: a peek
     during a check is not a peek by a client. */
  CONT = d.showing ? d : null; CID='';
  const brandJob = SETUP_JOB==='brand';

  if(!brandJob && !d.showing){ setupLine(STR.setup.nocontaineryet); setupHolding(); return; }
  if(brandJob && !d.brandRead){ setupLine(STR.setup.nobrandyet); setupHolding(); return; }

  $('setupDrop').hidden=true; $('setupStage').hidden=false;
  $('setupHed').textContent = brandJob ? 'SET UP BRAND' : 'SET UP CONTAINER';

  const t=d.tile||{}, b=d.brandRead||{};
  $('setupTile').innerHTML = brandJob
    ? esc(b.name||b.id||'') + ' <span>· '+esc(b.id||'')+'</span>'
    : esc(t.name||d.showing||'') + ' <span>· '+esc(t.brand||'')+' · '+esc(d.showing||'')+'</span>';
  const st=$('setupStatus');
  st.textContent = brandJob ? ('V'+String(b.version||'?')) : ((d.status||'').toUpperCase()||'—');
  st.classList.toggle('live', !brandJob && d.status==='live');
  st.classList.toggle('waiting', brandJob);

  const rail=SETUP_RAILS[SETUP_JOB];
  $('setupRail').innerHTML = rail.map((s,i)=>
    `<button class="step" data-s="${s.key}" onclick="setupGo('${s.key}')"><i>${i+1}</i>${esc(s.name)}</button>`).join('');
  rail.forEach(s=>{ if(SETUP_SHUT[s.key]===undefined) SETUP_SHUT[s.key]=false; });

  if(brandJob) setupBrandDraw();
  else setupContainerDraw(d);

  setupChat(null, d);
  setupGo(rail[0].key);
}

function setupContainerDraw(d){
  GHOST($('setupGhost'), d.ghost, d.modules, d.checklist);
  deetsMount($('setupDeets'), {
    /* the card is live so the peek works — reading a clause is half the
       check — but nothing it does here leaves the room. */
    refused: line=>setupChat(line),
    dig:     ()=>setupChat("Nothing to dig for in here — this is a look, not a run."),
  });
  deetsReset(); deetsInit(); deetsRender();
  /* the artefact in its own document, so its css can't touch ours — and
     grown to its full height, because a scrollbar is not a check. */
  const fr=$('setupArt');
  fr.onload=()=>{ try{ fr.style.height=Math.max(400, fr.contentDocument.body.scrollHeight+24)+'px'; }catch(e){} };
  fr.srcdoc = d.html||'';
}

/* ---------------- the brand's five sections ----------------
   What the reader got, in the shape you'd change it. Not a verdict: Hunch's
   own folder validated clean while shipping an empty font, and a screen
   that only said "0 problems" would have kept that hidden. */

/* JSON going into a double-quoted onclick attribute. Miss this and the
   attribute ends at the first quote of the first string — which is exactly
   what happened to the colour swatches, silently: the handler was there,
   the argument wasn't. */
const attr = v => esc(JSON.stringify(v));

const setupRow = (label, html, empty) =>
  `<div class="setup-brow"><div class="setup-blab">${esc(label)}</div>`+
  `<div class="setup-bval${empty?' empty':''}">${html}</div></div>`;

function setupBrandDraw(){
  const b=(SETUP_DATA||{}).brandRead, box=$('setupBrand');
  if(!b){ box.innerHTML=setupRow('No brand','Nothing brand-shaped in what you’ve dropped.',true); return; }
  const draw={fonts:setupFonts, assets:setupAssets, colours:setupColours,
              legals:setupLegals, prompt:setupPrompt}[SETUP_STOP];
  box.innerHTML = draw ? draw(b) : '';
}

/* FONTS — the files, and the lines that name them. Both, always: a font
   sitting in the folder that no line names is invisible to the engine, and
   that is exactly the bug we found in the Hunch folder. */
function setupFonts(b){
  let h='';
  if(!b.fonts.lines.length) h+=setupRow('Font','No **Font:** line in brandlook.md.',true);
  b.fonts.lines.forEach(l=>{
    const key='Font'+(l.role?' — '+l.role:'');
    h+=setupRow(key, setupEditable('look','line',{key}, l.text) +
      (l.names.length ? `<div class="setup-files">${l.names.map(n=>setupFilePill(b,n)).join('')}</div>`
                      : '<div class="setup-sub">Names no file — a stack, not a face.</div>'), !l.text);
  });
  h+=setupRow('Font files', b.fonts.files.length
    ? `<div class="setup-files">${b.fonts.files.map(f=>setupAssetPill(f)).join('')}</div>`
    : 'No font files in assets/. Fine if every line is a stack.', !b.fonts.files.length);
  h+=setupUpload(b, 'a font file');
  return h;
}

/* ASSETS — everything else in the folder. Tap one to see the thing. */
function setupAssets(b){
  let h='';
  h+=setupRow('Logo', setupEditable('look','line',{key:'Logo'}, b.logo) ||
    'Not named.', !b.logo);
  if(b.mark!==undefined) h+=setupRow('Mark', setupEditable('look','line',{key:'Mark'}, b.mark) ||
    'Not named.', !b.mark);
  h+=setupRow('In the folder', b.assets.files.length
    ? `<div class="setup-files">${b.assets.files.map(f=>setupAssetPill(f)).join('')}</div>`
    : 'assets/ is empty.', !b.assets.files.length);
  if(b.assets.missing.length) h+=setupRow('Named, not there',
    `<div class="setup-files">${b.assets.missing.map(f=>`<span class="setup-file gone">${esc(f)}</span>`).join('')}</div>`+
    '<div class="setup-sub">This bounces. Add the file below, or take it out of the line.</div>', true);
  if(b.assets.spare.length) h+=setupRow('Never named',
    `<div class="setup-files">${b.assets.spare.map(f=>`<span class="setup-file">${esc(f)}</span>`).join('')}</div>`+
    '<div class="setup-sub">The engine will never touch these. Keep them for humans, or prune them.</div>');
  h+=setupUpload(b, 'a file');
  return h;
}

/* COLOURS — only the hex is read, so only the hex is editable. The rest of
   the line (the client's name for it, the RGB, the CMYK) is theirs. */
function setupColours(b){
  if(!b.colours.length) return setupRow('Colours','No colour lines found in brandlook.md.',true);
  return setupRow('Tokens',
    '<div class="setup-swatches">'+b.colours.map(c=>
      `<label class="setup-sw"><i style="background:${esc(c.hex)}"></i>`+
      `<span class="setup-swname">${esc(c.key)}</span>`+
      `<input class="setup-hex" value="${esc(c.hex)}" maxlength="7" spellcheck="false"`+
      ` onchange="setupSave('look','hex',{key:${attr(c.key)}},this.value,this)"></label>`).join('')+
    '</div><div class="setup-sub">Type a hex and tab out. Everything else on the line stays as written.</div>');
}

/* LEGALS — the client's own words. Tap to read, edit in place. */
function setupLegals(b){
  if(!b.legals.length) return setupRow('Clauses','No brandlegals.md, or no rows in it.',true);
  return b.legals.map(c=>setupRow((c.label||c.id)+(c.fixed?' · always':''),
    setupEditable('legals','cell',{row:c.id, column:'text'}, c.text), !c.text)).join('');
}

/* PROMPT — brandvoice.md by section. WRITER still eats the whole file;
   the sections are how you read it, not a change to what it gets. */
function setupPrompt(b){
  const secs=(b.prompt.sections||[]).filter(s=>s.body.trim());
  let h=setupRow('Whole file', `${b.prompt.chars.toLocaleString()} characters, eaten whole by WRITER and FIXER.`);
  secs.forEach(s=>{
    if(!s.title){ h+=setupRow('Opening', setupEditable('','', {}, s.body, true)); return; }
    h+=setupRow(s.title, setupEditable('voice','section',{heading:s.title}, s.body));
  });
  return h;
}

/* ---------------- the mechanics of an edit ----------------
   A value you can change is a box you type in and tab out of. It saves,
   the server re-reads the folder, and the page redraws from the parse —
   never from what it thought it just did. */
function setupEditable(file, op, args, value, readonly){
  if(readonly || !file) return `<div class="setup-ro">${esc(value||'')}</div>`;
  const a=attr(args);
  return `<textarea class="setup-edit" rows="${Math.min(14, Math.max(2, Math.ceil((value||'').length/70)))}"`+
    ` onchange="setupSave('${file}','${op}',${a},this.value,this)">${esc(value||'')}</textarea>`;
}

function setupSave(file, op, args, value, el){
  if(el){ el.classList.remove('bad'); el.classList.add('saving'); }
  fetch('/api/setup/edit',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(Object.assign({brand:(SETUP_DATA.brandRead||{}).id, file, op, value}, args))})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      if(el) el.classList.remove('saving');
      if(!ok){ if(el) el.classList.add('bad'); setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
      setupAfterWrite(d);
    })
    .catch(()=>{ if(el){ el.classList.remove('saving'); el.classList.add('bad'); }
                 setupChat(STR.setup.edit.failed); });
}

/* every write is followed by a read. The validator runs again and says so,
   because an edit that breaks the folder should announce itself now rather
   than at the download. */
function setupAfterWrite(d){
  SETUP_DATA.brandRead=d.brandRead; SETUP_DATA.problems=d.problems; SETUP_DATA.held=d.held;
  setupBrandDraw();
  setupChat((d.problems||[]).length ? STR.setup.rereadBad(d.problems.length) : STR.setup.rereadOk);
}

/* ---------------- assets: add and prune ---------------- */

function setupUpload(b, what){
  return setupRow('Add', `<label class="setup-morebtn">ADD ${esc(what.toUpperCase())}`+
    `<input type="file" hidden onchange="setupAdd(this)"></label>`+
    '<div class="setup-sub">Goes into assets/. Same name replaces.</div>');
}

function setupAdd(input){
  const f=input.files && input.files[0]; if(!f) return;
  const fd=new FormData(); fd.append('brand',(SETUP_DATA.brandRead||{}).id); fd.append('file', f);
  fetch('/api/setup/asset/add',{method:'POST',body:fd})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
                      setupAfterWrite(d); setupChat(STR.setup.added(f.name)); });
}

function setupPrune(file){
  fetch('/api/setup/asset/drop',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({brand:(SETUP_DATA.brandRead||{}).id, file})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{ if(!ok){ setupChat(STR.setup.edit[d.error]||STR.setup.edit.failed); return; }
                      setupAfterWrite(d); setupChat(STR.setup.pruned(file)); });
}

/* ---------------- pills that show what they point at ----------------
   A filename tells you nothing. The artwork tells you whether it's the
   right artwork, and a specimen line tells you whether it's the right
   weight — which is the check. */
function setupAssetPill(f){
  return `<span class="setup-file${f.named?' named':''}">`+
    `<button class="setup-fname" onclick="setupPeek(${attr(f.file)},${attr(f.url)},${f.font})">${esc(f.file)}</button>`+
    `<button class="setup-fx" title="Prune it" onclick="setupPrune(${attr(f.file)})">×</button></span>`;
}

function setupFilePill(b, name){
  const f=[].concat(b.fonts.files, b.assets.files).find(x=>x.file===name);
  return f ? setupAssetPill(f) : `<span class="setup-file gone">${esc(name)}</span>`;
}

function setupPeek(name, url, isFont){
  $('setupPeekName').textContent=name;
  const body=$('setupPeekBody');
  if(isFont){
    /* a specimen, in the face itself — the only way to see a wrong weight */
    body.innerHTML = `<style>@font-face{font-family:'setup-peek';src:url('${url}');}</style>`+
      `<div class="setup-spec" style="font-family:'setup-peek',sans-serif">`+
      `ABCDEFGHIJKLM<br>NOPQRSTUVWXYZ<br>abcdefghijklm nopqrstuvwxyz<br>0123456789</div>`+
      `<div class="setup-sub">If that isn’t the face you meant, the file is wrong.</div>`;
  } else if(/\.(svg|png|jpe?g|gif|webp)$/i.test(name)){
    body.innerHTML = `<div class="setup-shot"><img src="${url}" alt="${esc(name)}"></div>`;
  } else if(/\.(md|txt)$/i.test(name)){
    body.innerHTML = '<pre class="setup-voice">Loading…</pre>';
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
                                            : esc(SETUP_JOB==='brand' ? STR.setup.cleanBrand : STR.setup.clean), true));
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
  const rail=SETUP_RAILS[SETUP_JOB], s=rail.find(x=>x.key===key)||rail[0];
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('on', b.dataset.s===key));
  document.querySelectorAll('#setupStage .setup-pane').forEach(p=>
    p.classList.toggle('on', p.dataset.p===SETUP_PANE[key]));
  $('setupLoz').textContent=s.loz; $('setupTag').textContent=s.tag; $('setupHint').textContent=s.hint;
  if(SETUP_JOB==='brand') setupBrandDraw();
  setupPaint();
}

/* the padlock means what it means everywhere else: shut is settled. It is
   this stop's, and only this stop's. */
function setupPadTap(){ SETUP_SHUT[SETUP_STOP]=!SETUP_SHUT[SETUP_STOP]; setupPaint(); }

function setupPaint(){
  const rail=SETUP_RAILS[SETUP_JOB]||[], shut=!!SETUP_SHUT[SETUP_STOP], pad=$('setupPad');
  pad.classList.toggle('locked', shut);
  pad.innerHTML=PADLOCK.icon[shut?'shut':'open'];
  pad.title=shut?'Checked — tap to open it again':'Looks right — tap to shut it';
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('done', !!SETUP_SHUT[b.dataset.s]));
  const left=rail.filter(s=>!SETUP_SHUT[s.key]).length;
  const brandJob = SETUP_JOB==='brand';
  $('setupFlipLbl').textContent = left ? (left+' BIT'+(left>1?'S':'')+' TO CHECK')
                                       : (brandJob ? 'TAKE THE FOLDER' : 'GOOD TO FLIP');
  $('setupFlipIco').innerHTML = PADLOCK.icon[left?'open':'shut'];
  $('setupFlip').classList.toggle('ready', !left);
}

/* The brand job ends by handing the folder back — the edited one is the
   truth now, and a folder you can't take away is a folder you shouldn't
   have been allowed to change. The container job ends the way landing a
   container always has: a human changes a word in config.md. */
function setupFlip(){
  const rail=SETUP_RAILS[SETUP_JOB]||[];
  const open=rail.find(s=>!SETUP_SHUT[s.key]);
  if(open){ setupGo(open.key); setupChat(STR.setup.notyet(open.loz.toLowerCase())); return; }
  if(SETUP_JOB==='brand'){ window.location='/api/setup/download'; return; }
  $('setupNote').classList.toggle('on');
}
