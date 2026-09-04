/* =====================================================================
   ROBOT — SET UP CHECK
   The fifth room, and the only one no client ever sees. A container is
   built somewhere else and arrives as a zip of two folders. Before it
   lands you want to look at it — so drop it here and the engine draws it
   three ways:

     1 MOCK UP   the bones, the ghost off the html's tags
     2 DEETS     the checklist, empty, as the client first meets it
     3 OUTPUT    the artefact itself

   All three are drawn by the same code the client will meet — the chrome's
   GHOST, deets.js's card, the container's own html — because a check
   rendered by different code checks nothing.

   Nothing here writes. The drop sits in scratch on the server; brands/ and
   containers/ never move. Checking is looking, not landing.
   ===================================================================== */

let SETUP_STOP=0, SETUP_SHUT={0:false,1:false,2:false}, SETUP_SAID=[];

const SETUP_STOPS = [
  {loz:'The bones',       tag:'Does this look right?',
   hint:'The ghost, off the html’s tags — the same drawing FEED IT shows.'},
  {loz:'The deets, empty', tag:'Everything covered?',
   hint:'The checklist as the client first meets it. Nothing filled: the shape is the check.'},
  {loz:'The artefact',    tag:'Pixel perfect?',
   hint:'container.html, as it leaves the building.'},
];

/* the menu's fifth door, and it shows to everyone. Hunch walks through to
   the room; a client gets the honest version of what's behind it, which is
   a conversation with us — container design is the thing we sell, not a
   thing the tool does. */
menuAdd('SET UP', ()=>{ menuToggle(); enterSetup(); }, {hunch:true, otherwise:()=>menuOpen('setup-ask')});

/* ---------------- the room ---------------- */

function setupInit(){
  SETUP_STOP=0; SETUP_SHUT={0:false,1:false,2:false}; SETUP_SAID=[];
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
  CONT=d; CID='';
  $('setupDrop').hidden=true;
  $('setupStage').hidden=false;

  const t=d.tile||{};
  $('setupTile').innerHTML = esc(t.name||d.showing||'') +
    ' <span>· '+esc(t.brand||'')+' · '+esc(d.showing||'')+'</span>';
  const st=$('setupStatus'); st.textContent=(d.status||'').toUpperCase()||'—';
  st.classList.toggle('live', d.status==='live');

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

  setupChat(null, d);
  setupGo(0);
  setupPaint();
}

/* ---------------- the chat ----------------
   One turn on arrival: clean, or the problems named. No model behind it
   yet — every word here is the validator's, in the robot's mouth. The
   composer says so rather than pretending. */
function setupChat(line, d){
  const box=$('setupChat');
  if(d){
    SETUP_SAID=[];
    const probs=d.problems||[];
    const found=(d.found||{}).containers||[];
    SETUP_SAID.push(RAIL.robot(probs.length
      ? esc(STR.setup.bounced(probs.length))
      : esc(STR.setup.clean), true));
    if(probs.length) SETUP_SAID.push(RAIL.robot('<ul class="setup-probs">'+
      probs.map(p=>`<li>${esc(p)}</li>`).join('')+'</ul>'));
    if(found.length>1) SETUP_SAID.push(RAIL.robot(esc(STR.setup.several(found))));
  }
  if(line) SETUP_SAID.push(RAIL.robot(esc(line)));
  box.innerHTML=SETUP_SAID.join('');
  /* the arrival turn stays at the top — the headline ("3 problems") is the
     part you need, and a long list shouldn't push it out of sight. A line
     added later scrolls, because that one is the new thing. */
  box.scrollTop = line ? box.scrollHeight : 0;
}

/* ---------------- the three stops ---------------- */

function setupGo(i){
  SETUP_STOP=i;
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('on', +b.dataset.s===i));
  document.querySelectorAll('#setupStage .setup-pane').forEach(p=>p.classList.toggle('on', +p.dataset.p===i));
  $('setupLoz').textContent=SETUP_STOPS[i].loz;
  $('setupTag').textContent=SETUP_STOPS[i].tag;
  $('setupHint').textContent=SETUP_STOPS[i].hint;
  setupPaint();
}

/* the padlock means what it means everywhere else: shut is settled. It is
   this stop's, and only this stop's. */
function setupPadTap(){ SETUP_SHUT[SETUP_STOP]=!SETUP_SHUT[SETUP_STOP]; setupPaint(); }

function setupPaint(){
  const shut=SETUP_SHUT[SETUP_STOP];
  const pad=$('setupPad');
  pad.classList.toggle('locked', shut);
  pad.innerHTML=PADLOCK.icon[shut?'shut':'open'];
  pad.title=shut?'Checked — tap to open it again':'Looks right — tap to shut it';
  document.querySelectorAll('#setupRail .step').forEach(b=>b.classList.toggle('done', SETUP_SHUT[+b.dataset.s]));
  const left=[0,1,2].filter(i=>!SETUP_SHUT[i]).length;
  $('setupFlipLbl').textContent = left ? (left+' BIT'+(left>1?'S':'')+' TO CHECK') : 'GOOD TO FLIP';
  $('setupFlipIco').innerHTML = PADLOCK.icon[left?'open':'shut'];
  $('setupFlip').classList.toggle('ready', !left);
}

/* GOOD TO FLIP flips nothing. It names the word to change and where, and
   leaves the changing to a human in the folder — the same way landing a
   container has always been a deliberate act. */
function setupFlip(){
  if([0,1,2].some(i=>!SETUP_SHUT[i])){
    const i=[0,1,2].find(x=>!SETUP_SHUT[x]);
    setupGo(i); setupChat(STR.setup.notyet(SETUP_STOPS[i].loz.toLowerCase()));
    return;
  }
  $('setupNote').classList.toggle('on');
}
