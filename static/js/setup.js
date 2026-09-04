/* =====================================================================
   ROBOT — SET UP CHECK
   The fifth room, and the only one no client ever sees. A container is
   built somewhere else and arrives as a zip of two folders. Before it
   lands you want to look at it — so drop it here and the engine draws it
   three ways:

     1 BRAND     what the reader got out of the brand folder
     2 MOCK UP   the bones, the ghost off the html's tags
     3 DEETS     the checklist, empty, as the client first meets it
     4 OUTPUT    the artefact itself

   SET UP hands the two folders back separately, so the room holds what it
   has been given and says what it's still waiting for. A brand on its own
   checks fine; stops 2 to 4 wait for a container.

   All three are drawn by the same code the client will meet — the chrome's
   GHOST, deets.js's card, the container's own html — because a check
   rendered by different code checks nothing.

   Nothing here writes. The drop sits in scratch on the server; brands/ and
   containers/ never move. Checking is looking, not landing.
   ===================================================================== */

let SETUP_STOP=0, SETUP_SHUT={0:false,1:false,2:false,3:false}, SETUP_SAID=[], SETUP_HAS=false;

const SETUP_STOPS = [
  {loz:'The brand',        tag:'Is this what you meant?', needs:'brand',
   hint:'What the reader got out of the folder — not a verdict. A blank here is the bug.'},
  {loz:'The bones',        tag:'Does this look right?',
   hint:'The ghost, off the html’s tags — the same drawing FEED IT shows.'},
  {loz:'The deets, empty', tag:'Everything covered?',
   hint:'The checklist as the client first meets it. Nothing filled: the shape is the check.'},
  {loz:'The artefact',     tag:'Pixel perfect?',
   hint:'container.html, as it leaves the building.'},
];

/* the menu's fifth door, and it shows to everyone. Hunch walks through to
   the room; a client gets the honest version of what's behind it, which is
   a conversation with us — container design is the thing we sell, not a
   thing the tool does. */
menuAdd('SET UP', ()=>{ menuToggle(); enterSetup(); }, {hunch:true, otherwise:()=>menuOpen('setup-ask')});

/* ---------------- the room ---------------- */

function setupInit(){
  SETUP_STOP=0; SETUP_SHUT={0:false,1:false,2:false,3:false}; SETUP_SAID=[]; SETUP_HAS=false;
  $('setup').classList.add('on');
  $('setupDrop').hidden=false;
  $('setupStage').hidden=true;
  $('setupZip').value='';
  setupLine('');
}

function setupLeave(){
  $('setup').classList.remove('on');
  deetsUnmount();
  location.reload();                 // back to the doorway, nothing half-held
}

/* start again — the only way anything leaves the scratch */
function setupClear(){
  fetch('/api/setup/clear',{method:'POST'}).catch(()=>{}).then(()=>setupLeave());
}

/* ---------------- the drop ---------------- */

function setupTake(files){
  const f=files && files[0]; if(!f) return;
  if(!/\.zip$/i.test(f.name)){ setupLine(STR.setup.read.broken); return; }
  setupLine('');
  $('setupDropBtn').disabled=true;
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
  /* the container goes on the table exactly as a live one would, so every
     renderer below reads what it always reads. CID stays empty: a peek
     during a check is not a peek by a client, and the log shouldn't
     pretend otherwise. */
  SETUP_HAS = !!d.showing;
  CONT = SETUP_HAS ? d : null;
  CID='';
  $('setupDrop').hidden=true;
  $('setupStage').hidden=false;

  setupBrandDraw(d);

  const t=d.tile||{}, held=d.held||{containers:[],brands:[]};
  $('setupTile').innerHTML = SETUP_HAS
    ? esc(t.name||d.showing||'') + ' <span>· '+esc(t.brand||'')+' · '+esc(d.showing||'')+'</span>'
    : esc((d.brandRead||{}).name||'the brand') + ' <span>· brand only</span>';
  const st=$('setupStatus');
  st.textContent = SETUP_HAS ? ((d.status||'').toUpperCase()||'—') : 'WAITING';
  st.classList.toggle('live', SETUP_HAS && d.status==='live');
  st.classList.toggle('waiting', !SETUP_HAS);

  if(SETUP_HAS){
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
    fr.onload=()=>{ try{ const b=fr.contentDocument.body;
      fr.style.height=Math.max(400, b.scrollHeight+24)+'px'; }catch(e){} };
    fr.srcdoc = d.html||'';
  }

  setupChat(null, d);
  setupGo(0);
}

/* ---------------- 1 THE BRAND ----------------
   What the reader got, laid out flat. Not a verdict: the fonts as read, the
   colours as swatches, the assets it can see, the clauses it found, the
   voice behind a peek. Hunch's own folder validated clean for two days
   while shipping an empty font — a screen that says "0 problems" would have
   kept that hidden, and this one can't. */
function setupBrandDraw(d){
  const box=$('setupBrand'), b=d.brandRead;
  if(!b){
    box.innerHTML = '<div class="setup-brow"><div class="setup-blab">NO BRAND</div><div class="setup-bval empty">'+
      (d.brandWanted
        ? 'The container asks for <b>'+esc(d.brandWanted)+'</b>. That folder isn’t here — drop it and I’ll read it.'
        : 'Nothing brand-shaped in what you’ve dropped.')+'</div></div>';
    return;
  }
  const row=(label, html, empty)=>`<div class="setup-brow"><div class="setup-blab">${esc(label)}</div>`+
    `<div class="setup-bval${empty?' empty':''}">${html}</div></div>`;
  let h='';
  h+=row('Brand', `<b>${esc(b.name||b.id)}</b> · ${esc(b.id)} · v${esc(String(b.version||'?'))}`);
  /* the fonts, one row each, named by the job they do. An empty one is the
     whole point of this screen. */
  if(!b.fonts.length) h+=row('Font','No **Font:** line in brandlook.md.',true);
  b.fonts.forEach(f=>h+=row('Font'+(f.role?' — '+f.role:''), esc(f.text)||'—', !f.text));
  h+=row('Logo', esc(b.logo)||'Not named.', !b.logo);
  if(b.mark) h+=row('Mark', esc(b.mark));
  h+=row('Colours', b.tokens && Object.keys(b.tokens).length
    ? '<div class="setup-swatches">'+Object.entries(b.tokens).map(([k,v])=>
        `<span class="setup-sw"><i style="background:${esc(v)}"></i>${esc(k.replace(/_/g,' '))} <b>${esc(v)}</b></span>`).join('')+'</div>'
    : 'No colour lines found.', !(b.tokens && Object.keys(b.tokens).length));
  h+=row('Assets', b.assets.length
    ? '<div class="setup-files">'+b.assets.map(a=>
        `<span class="setup-file${a.named?' named':''}">${esc(a.file)}</span>`).join('')+'</div>'
    : 'assets/ is empty.', !b.assets.length);
  if(b.missing.length) h+=row('Named, not there',
    '<div class="setup-files">'+b.missing.map(f=>`<span class="setup-file gone">${esc(f)}</span>`).join('')+'</div>', true);
  h+=row('Clauses', b.legals.length
    ? '<div class="setup-files">'+b.legals.map(c=>
        `<span class="setup-file${c.fixed?' named':''}">${esc(c.label||c.id)}</span>`).join('')+'</div>'
    : 'No brandlegals.md, or no rows in it.', !b.legals.length);
  h+=row('Voice', b.voice
    ? `${b.voice.length.toLocaleString()} characters, eaten whole by WRITER and FIXER. `+
      `<button class="setup-peek" onclick="setupVoice()">Read it</button>`+
      `<pre class="setup-voice" id="setupVoiceText" hidden>${esc(b.voice)}</pre>`
    : 'brandvoice.md is empty.', !b.voice);
  box.innerHTML=h;
}
function setupVoice(){ const el=$('setupVoiceText'); el.hidden=!el.hidden; }

/* ---------------- the chat ----------------
   One turn on arrival: clean, or the problems named. No model behind it
   yet — every word here is the validator's, in the robot's mouth. The
   composer says so rather than pretending. */
function setupChat(line, d){
  const box=$('setupChat');
  if(d){
    SETUP_SAID=[];
    const probs=d.problems||[], held=d.held||{containers:[],brands:[]};
    SETUP_SAID.push(RAIL.robot(probs.length
      ? esc(STR.setup.bounced(probs.length))
      : esc(d.showing ? STR.setup.clean : STR.setup.cleanBrand), true));
    if(probs.length) SETUP_SAID.push(RAIL.robot('<ul class="setup-probs">'+
      probs.map(p=>`<li>${esc(p)}</li>`).join('')+'</ul>'));
    /* what it's holding, and what it still needs. Waiting is a state, not
       an error — SET UP emits a brand once and containers many, so half a
       drop is the normal shape of a Tuesday. */
    if(d.waiting) SETUP_SAID.push(RAIL.robot(esc(STR.setup.waiting(held))));
    else if(held.containers.length>1) SETUP_SAID.push(RAIL.robot(esc(STR.setup.several(held.containers))));
  }
  if(line) SETUP_SAID.push(RAIL.robot(esc(line)));
  box.innerHTML=SETUP_SAID.join('');
  /* the arrival turn stays at the top — the headline ("3 problems") is the
     part you need, and a long list shouldn't push it out of sight. A line
     added later scrolls, because that one is the new thing. */
  box.scrollTop = line ? box.scrollHeight : 0;
}

/* ---------------- the three stops ---------------- */

/* a stop nobody can look at yet can't be walked into */
const setupLive = i => i===0 || SETUP_HAS;

function setupGo(i){
  if(!setupLive(i)){ setupChat(STR.setup.locked); return; }
  SETUP_STOP=i;
  document.querySelectorAll('#setupRail .step').forEach(b=>{
    b.classList.toggle('on', +b.dataset.s===i);
    b.classList.toggle('locked', !setupLive(+b.dataset.s));
  });
  document.querySelectorAll('#setupStage .setup-pane').forEach(p=>p.classList.toggle('on', +p.dataset.p===i));
  $('setupLoz').textContent=SETUP_STOPS[i].loz;
  $('setupTag').textContent=SETUP_STOPS[i].tag;
  $('setupHint').textContent=SETUP_STOPS[i].hint;
  setupPaint();
}

/* the padlock means what it means everywhere else: shut is settled. It is
   this stop's, and only this stop's. */
function setupPadTap(){ SETUP_SHUT[SETUP_STOP]=!SETUP_SHUT[SETUP_STOP]; setupPaint(); }

const setupStopsLive = () => [0,1,2,3].filter(setupLive);

function setupPaint(){
  const shut=SETUP_SHUT[SETUP_STOP];
  const pad=$('setupPad');
  pad.classList.toggle('locked', shut);
  pad.innerHTML=PADLOCK.icon[shut?'shut':'open'];
  pad.title=shut?'Checked — tap to open it again':'Looks right — tap to shut it';
  document.querySelectorAll('#setupRail .step').forEach(b=>{
    b.classList.toggle('done', SETUP_SHUT[+b.dataset.s]);
    b.classList.toggle('locked', !setupLive(+b.dataset.s));
  });
  const left=setupStopsLive().filter(i=>!SETUP_SHUT[i]).length;
  /* with no container there is nothing to flip, and the pill says the true
     thing rather than counting to one */
  $('setupFlipLbl').textContent = !SETUP_HAS ? 'WAITING FOR A CONTAINER'
    : left ? (left+' BIT'+(left>1?'S':'')+' TO CHECK') : 'GOOD TO FLIP';
  $('setupFlipIco').innerHTML = PADLOCK.icon[left||!SETUP_HAS?'open':'shut'];
  $('setupFlip').classList.toggle('ready', SETUP_HAS && !left);
}

/* GOOD TO FLIP flips nothing. It names the word to change and where, and
   leaves the changing to a human in the folder — the same way landing a
   container has always been a deliberate act. */
function setupFlip(){
  if(!SETUP_HAS){ setupChat(STR.setup.locked); return; }
  if(setupStopsLive().some(i=>!SETUP_SHUT[i])){
    const i=setupStopsLive().find(x=>!SETUP_SHUT[x]);
    setupGo(i); setupChat(STR.setup.notyet(SETUP_STOPS[i].loz.toLowerCase()));
    return;
  }
  $('setupNote').classList.toggle('on');
}
