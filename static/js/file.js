/* =====================================================================
   ROBOT — FILE IT
   The takeaway counter: the fillings, WRAP IT, the files. Reads BRIEF and
   ASSET, nothing else.
   ===================================================================== */

/* ---------------- 3 FILE IT ----------------
   The tiles come from the server (container + run decide grey); the
   tick is the detail list's tick; WRAP IT builds only what's ticked and
   the robot says it once. Nothing per-container here. */
const FILE_ICON={
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 14h5M10 17h5"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 15h6M10 18h4"/></svg>',
  pics:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20 15l-4.5-4.5L8 18"/></svg>',
  code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>'};
let FILE_LAST=null;                                   // the last wrap, so a re-press is a re-build
async function toReview(){ return toFileIt(); }     // FIX IT's WRAP IT UP still calls this
async function toFileIt(retry){
  if(!retry) cardReset('grid');
  reach(2); fileUnwrap(); robotLineClear($('fileBar'));
  $('fileTiles').innerHTML='<div class="load" style="color:#fff"><div class="spin"></div>Checking the menu…</div>';
  try{
    const d=await api('/api/fillings',{container:CID, run:RUN});
    $('fileTiles').innerHTML=d.tiles.map(t=>`<button class="tile ${t.on?'on':'off'}" data-id="${esc(t.id)}" onclick="fileFlip(this)" aria-pressed="${t.on}">
      <span class="tick" aria-hidden="true">${TICK}</span>
      <span class="tile-i">${FILE_ICON[t.id]||''}</span>
      <span class="tile-t">${esc(t.title)}</span>
      <span class="tile-d">${esc(t.line)}</span></button>`).join('');
    fileArm();
  }catch(e){ $('fileTiles').innerHTML=''; $('fileTiles').appendChild(robotCard('grid', ()=>toFileIt(true), 'fillings', {container:CID, run:RUN})); fileArm(); }
}
function fileFlip(t){ if(t.classList.contains('off')) return; t.classList.toggle('on'); t.setAttribute('aria-pressed',t.classList.contains('on')); fileArm(); }
function fileArm(){ $('fileWrap').classList.toggle('live', document.querySelectorAll('#fileTiles .tile.on').length>0); }
async function fileWrap(){
  const w=$('fileWrap'); if(!w.classList.contains('live')) return;
  const take=[...document.querySelectorAll('#fileTiles .tile.on')].map(t=>t.dataset.id);
  w.classList.remove('live'); w.textContent='WRAPPING…';
  try{
    const d=await api('/api/wrap',{container:CID, run:RUN, form:BRIEF.details.facts, chosen:BRIEF.details.chosen,
      copy:fixFinalCopy(), take, tweaks:ASSET.tweaks.length});
    const row=(f,all)=>`<div class="file${all?' all':''}"><div class="file-i">${esc(all?'ZIP':f.id.toUpperCase())}</div>
      <div><div class="file-n">${esc(f.name)}</div><div class="file-d">${esc(f.line)}</div></div>
      <a class="file-go" href="${esc(f.url)}" download>${all?'Take the lot':'Take it'}</a></div>`;
    $('fileFiles').innerHTML=(d.all?row(d.all,true):'')+d.files.map(f=>row(f)).join('');
    $('fileTiles').classList.add('wrapped'); $('fileBar').style.display='none'; $('fileDone').classList.add('on');
    $('fileDone').scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(e){ robotLineAt($('fileBar'), STR.file.wrap, {cls:'onred', stick:true}); }
  w.textContent='WRAP IT'; fileArm();
}
function fileUnwrap(){ $('fileDone').classList.remove('on'); $('fileBar').style.display=''; $('fileTiles').classList.remove('wrapped'); }
