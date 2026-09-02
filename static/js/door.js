/* =====================================================================
   ROBOT — THE DOOR
   The magic word and its guess ladder; the doorway with one tile per
   container. Ends at enterRoom() in sandwich.js — the door's exit.
   ===================================================================== */

/* ---------------- the door ----------------
   The guess ladder walks on the status the server sends — 403 is a wrong
   word, 429 is the brake — never on its words. Resets on a right one. */
let DOOR_MISSES=0;
function siNote(line){
  const note=$('siNote'); note.className='si-note bad'; note.innerHTML='';
  note.appendChild(errLine(line,{stick:true, cls:'onred'}));
}
async function sayWord(){
  const note=$('siNote'), go=$('siGo'), w=$('siWord').value.trim();
  if(!w){ siNote(STR.door.empty); return; }
  go.disabled=true; note.className='si-note'; note.textContent=STR.door.checking;
  try{
    const d = await api('/api/auth/word',{word:w});
    DOOR_MISSES=0;
    go.classList.add('open');                       // the padlock pops
    setTimeout(()=>signedIn(d), 430);
  }
  catch(e){
    let line;
    if(e.status===429) line=STR.door.braked;
    else if(e.status===403){ line=STR.door.wrong[Math.min(DOOR_MISSES, STR.door.wrong.length-1)]; DOOR_MISSES++; }
    else if(e.status===400) line=STR.door.empty;
    else line=STR.fell;
    siNote(line);
    $('siWord').value=''; $('siWord').focus(); go.disabled=false;
  }
}
/* The echo: the door said HELLO, the tool says it back with your name on it.
   The type fits itself to the name — capped at 62px so SUZ lands big, not
   billboard, and stepped down only as far as a long name forces it. */
function fitEcho(){
  const e=$('echo'); if(!e.textContent) return;
  const target=$('door').clientWidth-48;
  let size=62;
  e.style.fontSize=size+'px';
  while(e.scrollWidth>target && size>28){ size-=2; e.style.fontSize=size+'px'; }
}
window.addEventListener('resize', fitEcho);

function signedIn(d){
  $('signin').style.display='none';
  $('bub').classList.add('gone');
  $('bub').closest('.greet').classList.add('settled');
  $('sando').classList.add('on');
  const first=(d.name||'').split(' ')[0];
  $('echo').textContent = (first && first!=='there')
    ? `HELLO ${first.toUpperCase()}` : 'HELLO YOU';
  fitEcho();
  $('echo').classList.add('on');
  $('q').classList.add('on');
  $('who').textContent = d.tenant || '';
  HUNCH = !!d.hunch;
  doorway();
}
(async()=>{ try{ const d=await api('/api/auth/me'); if(d.authed) signedIn(d); }catch(e){} })();

/* THE DOORWAY — one tile per container folder, grouped by brand. The brand
   name only shows when there's more than one to tell apart. Testing tiles
   arrive for Hunch logins only, badged in ink. One tile means the second
   slot says YOUR NEXT PROJECT, as the site plan promised. */
let HUNCH=false, TILES=[];
async function doorway(){
  const box=$('rooms'); box.innerHTML='';
  let d;
  try{ d = await api('/api/containers'); }
  catch(e){ errAt(box, STR.doorway.list, {cls:'onred', stick:true}); box.style.display='flex'; return; }
  TILES=d.tiles||[];
  const brands=[...new Set(TILES.map(t=>t.brand))];
  brands.forEach(b=>{
    if(brands.length>1){
      const h=document.createElement('div'); h.className='brand-h';
      h.textContent=((d.brands[b]||{}).name||b).toUpperCase(); box.appendChild(h);
    }
    TILES.filter(t=>t.brand===b).forEach(t=>{
      const el=document.createElement('button');
      el.className='room'+(t.status==='testing'?' testing':'');
      el.innerHTML=`<div><div class="room-t">${esc(t.name).toUpperCase()}${t.status==='testing'?'<span class="badge">Testing</span>':''}</div>
        <div class="room-d">${esc(t.line||t.purpose.split('. ')[0])}</div></div><div class="room-go">&rarr;</div>`;
      el.onclick=()=>enterRoom(t.id, el);
      box.appendChild(el);
    });
  });
  if(TILES.length<2){
    box.insertAdjacentHTML('beforeend',`<div class="room soon"><div><div class="room-t">YOUR NEXT PROJECT</div><div class="room-d">Coming soon</div></div><div class="room-go">&rarr;</div></div>`);
  }
  box.style.display='flex';
}
