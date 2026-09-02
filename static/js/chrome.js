/* =====================================================================
   ROBOT — THE CHROME
   The engine's front-end furniture: the face, the line, the card, the
   stepper, THINKING, the padlock, the rail's rows, the icons. Shared by
   every room; never reskins; knows no room exists.

   The rule, for every function that wants to live here: if it mentions a
   disc, a face, a strip, a step, a card or a beat, it's chrome. If it
   mentions a stop, a fact, a module, a clause, a doc or a query, it's a
   room's, and it doesn't belong here. Chrome never names a room's element
   id and never reads a room's state — where it needs an element or an id,
   it takes one as an argument.

   Loads after strings.js and before the rooms. Names are the names the
   rooms already use; step 1 of the refactor moved code, not names.
   ===================================================================== */

/* ---------------- helpers ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* The server sends codes, never sentences. Whatever it said, e.message is
   the parachute line from strings.js; e.status and e.code are there for the
   paths that want to say something more specific. The client owns the voice. */
async function api(path, body){
  const r = await fetch(path, body ? {method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)} : {});
  const d = await r.json().catch(()=>null);
  if(!r.ok || !d){
    const e = new Error(STR.fell); e.status = r.status; e.code = (d && d.error) || '';
    console.warn('[robot]', path, r.status, e.code); throw e;
  }
  return d;
}

/* ================= THE FACE =================
   One face, one place. The engine's own mark — antenna, head, eyes, mouth —
   white on the red disc that wears it. Two faces: the plain one, and the
   error face (X eyes, the lamp gone out). Everything that shows a face draws
   from here, so the eyes and the lamp can never drift apart between copies.
   The .eye and .bulb classes are what THINKING animates. */
function BOT_FACE(kind){
  const eyes = kind==='err'
    ? '<path class="eye" d="M11 14l4 4M15 14l-4 4" stroke="#ED1C24" stroke-width="1.9" stroke-linecap="round"/>'
    + '<path class="eye" d="M19 14l4 4M23 14l-4 4" stroke="#ED1C24" stroke-width="1.9" stroke-linecap="round"/>'
    : '<circle class="eye" cx="13" cy="16" r="2.2" fill="#ED1C24"/><circle class="eye" cx="21" cy="16" r="2.2" fill="#ED1C24"/>';
  const bulb = kind==='err'
    ? '<circle class="bulb" cx="17" cy="3.5" r="1.8" fill="none" stroke="#fff" stroke-width="1.2"/>'
    : '<circle class="bulb" cx="17" cy="3.5" r="1.8" fill="#fff"/>';
  return '<svg viewBox="0 0 34 32" fill="none" aria-hidden="true">'
    + '<line x1="17" y1="4" x2="17" y2="8.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' + bulb
    + '<rect x="6" y="8" width="22" height="16" rx="5" fill="#fff"/>' + eyes
    + '<rect x="11" y="26" width="12" height="3.4" rx="1.7" fill="#fff"/></svg>';
}
const BOT_AV  = kind => `<span class="botdisc">${BOT_FACE(kind)}</span>`;
const FD_ROBOT = kind => `<div class="chat-cav">${BOT_AV(kind)}</div>`;
/* markup that wears a face declares it with data-face; filled once the DOM
   is there, because this file loads in the head, before the body exists */
function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
function faceFill(){ document.querySelectorAll('[data-face]').forEach(el=>{ el.innerHTML = BOT_FACE(el.dataset.face||''); }); }
ready(faceFill);

/* ================= ONE FAILURE SURFACE =================
   Twenty-odd ways to fail, one voice, two pieces of furniture. The robot
   says it, near the wound, wearing the error face. No modals, no X's.
   The stops are always the way out; the surface carries only the way
   forward. Every word is in strings.js. */

/* THE LINE — something failed, the room stands. Fades after 7s unless
   it's asking for something (stick), in which case it stays till acted on. */
function errLine(text, o={}){
  const el=document.createElement('div');
  el.className='fd-said err'+(o.cls?' '+o.cls:'');
  el.setAttribute('role','alert');
  el.innerHTML=`${BOT_AV('err')}<span class="fd-said-t">${esc(text)}</span>`;
  if(!o.stick) el._t=setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),300); }, 7000);
  return el;
}
/* one line per anchor — a fresh failure replaces the last one, never stacks */
function errAt(anchor, text, o={}){
  if(!anchor) return null;
  anchor.querySelectorAll(':scope > .fd-said.err').forEach(x=>{ clearTimeout(x._t); x.remove(); });
  const el=errLine(text,o);
  if(o.first) anchor.insertBefore(el, anchor.firstChild); else anchor.appendChild(el);
  return el;
}
function errClear(anchor){ if(anchor) anchor.querySelectorAll(':scope > .fd-said.err').forEach(x=>{ clearTimeout(x._t); x.remove(); }); }

/* THE CARD — a whole pane failed to arrive. Renders in the page flow, in
   the space the missing thing should occupy. TRY AGAIN retries; a second
   consecutive failure on the same card is structural, not a blip: the
   beacon fires, the card reads BUNG, and its button just acknowledges the
   news and kills the card — and whatever the room asked to go with it
   (meta.onGone). The counter resets on room entry, not on retry. */
const CARD_FAILS={};
function cardReset(room){ CARD_FAILS[room]=0; }
function errCard(room, retry, what, meta){
  CARD_FAILS[room]=(CARD_FAILS[room]||0)+1;
  const stop = CARD_FAILS[room]>=2;
  const w = stop ? STR.card.stop : STR.card[room];
  const el=document.createElement('div'); el.className='errcard'+(stop?' stop':'');
  el.setAttribute('role','alert');
  el.innerHTML=`<span class="botdisc">${BOT_FACE('err')}</span><div class="errcard-h">${esc(w.head)}</div>
    <div class="errcard-p">${esc(w.line)}</div><button class="errcard-go">${esc(w.go)}</button>`;
  const go=el.querySelector('.errcard-go');
  if(stop){
    beacon(what, room, meta);                       // the email goes before the card claims it
    go.onclick=()=>{ el.remove(); if(meta && meta.onGone) meta.onGone(); };
  } else {
    go.onclick=()=>{ el.remove(); retry(); };
  }
  return el;
}
/* the beacon: one POST, the server logs it and emails Hunch (throttled
   server-side, so an outage isn't fifty emails). Fire and forget — if this
   fails too, the server log is the witness and there's nothing to press. */
function beacon(what, room, meta){
  const m=meta||{};
  api('/api/bung',{what, room, container:m.container||'', run:m.run||''}).catch(()=>{});
}

/* ---------------- THE ENGINE'S ICONS ----------------
   Ticks and pencils, as the rooms draw them today. Three ticks and two
   pencils is more than one device needs — they're here under their old
   names so nothing moves on screen; folding them is a later, visible pass. */
const CL_CHECK  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const CL_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3"/><path d="M13.5 6.5l3 3"/></svg>';
const FI_TICK='<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------------- THE PADLOCK ----------------
   One device, two rooms: the gutter in FIX IT, the sections in LOCK THE
   DEETS. The icons, the words and the journey live here and nowhere else,
   so the two rooms can't quietly drift apart.

     open   --tap-->  edit (the pencil)  --tap-->  locked
     locked --tap-->  edit                                 (reopen)

   Tap open or shut and you get the pencil; tap the pencil and it keeps.
   Leave any other way and it shuts behind you — leaving locks. `fixed` is
   a fourth state, not a step on the journey: it can't be opened, it
   deflects.

   The open shackle stands clear of the body and springs up and away. It
   used to sit down on the body with one leg missing, which read as very
   nearly shut — the one state that most needs to be unmistakable. */
const PADLOCK = {
  icon: {
    open:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V6a5 5 0 0 1 9.6-1.9"/></svg>',
    shut:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M13 8l3 3"/></svg>'
  },
  say: {open:'Open — tap to have a look', edit:'Tweaking — tap to keep it',
        locked:'Locked — tap to reopen', fixed:'From the brief'},
  /* the state's face: the pencil while you're in it, the shackle otherwise */
  face: st => st==='edit' ? PADLOCK.icon.edit
             : (st==='open' ? PADLOCK.icon.open : PADLOCK.icon.shut),
  /* the journey itself. The room supplies its own three verbs; the rule
     about which one a tap means belongs here. */
  tap(st, on){
    if(st==='fixed') return on.deflect && on.deflect();
    return st==='edit' ? on.keep() : on.open();
  }
};

/* ---------------- THE STEPPER ----------------
   Three panes, three steps, one furthest-reached. go() can't skip ahead;
   reach() unlocks as it goes. The panes and steps are the chrome's own. */
let REACHED = 0;                 // furthest step unlocked
function unlock(){
  document.querySelectorAll('.step').forEach(s=>{
    s.classList.toggle('locked', +s.dataset.s > REACHED);
  });
}

function go(n){
  if(n>REACHED) return;                       // can't skip ahead
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',+p.dataset.p===n));
  document.querySelectorAll('.step').forEach(s=>{const i=+s.dataset.s;
    s.classList.toggle('on',i===n); s.classList.toggle('done',i<n);});
  window.scrollTo({top:0,behavior:'smooth'});
}
function reach(n){ if(n>REACHED){REACHED=n; unlock();} go(n); }

/* ---------------- THINKING ----------------
   The beat while the WRITER runs. The lines are the robot's own, so they
   live here in the engine and never in a container's config.md. Sequential,
   looping if the wait outlasts the list. No meter, no dots, no ellipsis —
   status is an event, not a percentage. */
const THINK_LINES = [
  'Working it out',
  'Reading the brief',
  'Doing my thing',
  'Sharpening my pencil',
  'Spelling the long words',
  'Shuffling the commas',
  'Losing the adjectives',
  'Trying not to rhyme',
  'Arguing with myself',
  "Crossing the T's",
  'Catching a rainbow',
];
const THINK_HOLD = 2600;    // how long a line sits before the next one lands
const THINK_MIN  = 1000;    // armCraft often wins the race; don't let it flash
let THINK_T = null, THINK_I = 0;

/* The beads: one per line, so the row *is* the line list and every bead is
   an event landing — not a percentage. One pass through the lines is about
   a standard writing time, which is what paces it.

   The last bead is the robot finishing, and the timer never lights it. The
   row cannot claim to be done before the draft is. Outlast the list and the
   lines loop while the beads hold at one short, which is the honest thing
   for them to do — it says still going, not nearly there.

   Tuning is one number: if real waits run long or short, THINK_HOLD moves
   and the whole row moves with it. */
function thinkBeads(){
  const el = $('thinkBeads'); if(!el) return;
  if(el.children.length !== THINK_LINES.length)
    el.innerHTML = THINK_LINES.map(() => '<b></b>').join('');
  const lit = Math.min(THINK_I, THINK_LINES.length - 1);
  [...el.children].forEach((b, n) => b.classList.toggle('on', n < lit));
}

function thinkLine(){
  const say = $('thinkSay'); if(!say) return;
  /* sweep any straggler first, and back the animationend removal with a
     timer: under prefers-reduced-motion the animation never runs, so the
     event never fires and the outgoing faces would pile up unseen. */
  say.querySelectorAll('.out').forEach(o => o.remove());
  const old = say.querySelector('.in');
  if(old){ old.className = 'out';
    const go = () => old.remove();
    old.addEventListener('animationend', go, {once:true});
    setTimeout(go, 600); }
  const s = document.createElement('span');
  s.className = 'in';
  s.textContent = THINK_LINES[THINK_I % THINK_LINES.length];
  THINK_I++;
  say.appendChild(s);
  thinkBeads();
}

/* Panes off, the beat on. The rail isn't touched — reach(1) hasn't run, so
   FIX IT stays unlit exactly as the brief asks. Returns the start time. */
function thinkStart(){
  const el = $('thinking'); if(!el) return 0;
  THINK_I = 0; $('thinkSay').innerHTML = '';
  document.querySelectorAll('#room .pane').forEach(p => p.classList.remove('on'));
  el.hidden = false;
  thinkLine();
  THINK_T = setInterval(thinkLine, THINK_HOLD);
  return Date.now();
}

/* Cut straight out when the draft lands — no "done" beat, no waiting for the
   current line to finish. The only floor is THINK_MIN, so a draft that was
   already sitting there doesn't strobe the screen on its way past. */
async function thinkEnd(started){
  if(!started) return;
  const left = THINK_MIN - (Date.now() - started);
  if(left > 0) await new Promise(r => setTimeout(r, left));
  clearInterval(THINK_T); THINK_T = null;
  const el = $('thinking'); if(el) el.hidden = true;
}

/* thinking: the face does it — one behaviour from the pool per wait,
   never the same twice running, and a 1.2s floor so a quick answer
   still reads as the robot reading. The bubble stays empty. */
const THINK_POOL=['eyeroll','rollboth','rock','blink']; let THINK_LAST='';
/* The first wait of a session is always the spin. Every later wait is read
   against an expectation the first one taught, so the first has to be the
   least ambiguous motion there is — and a full rotation is the loading
   gesture everyone already knows. Variety afterwards. */
function thinkFace(){ let p;
  if(!THINK_LAST){ p='rollboth'; }
  else { do{ p=THINK_POOL[Math.floor(Math.random()*THINK_POOL.length)]; }while(p===THINK_LAST); }
  THINK_LAST=p;
  return `<span class="botdisc think ${p}">${BOT_FACE()}</span>`; }

/* ---------------- THE RAIL'S ROWS ----------------
   One grammar for every chat rail: the robot's turn, the human's, the
   error turn, the thinking turn. A row is a string; the room decides where
   it goes (a rail, a thread) and keeps that state itself. */
const RAIL = {
  robot: (html, withAv) => `<div class="chat-row"><div class="chat-cav ${withAv?'':'ghost'}">${BOT_AV()}</div><div class="chat-msg">${html}</div></div>`,
  me:    html => `<div class="chat-row me"><div class="chat-msg">${html}</div></div>`,
  err:   text => `<div class="chat-row"><div class="chat-cav">${BOT_AV('err')}</div><div class="fd-said err nodisc" role="alert"><span class="fd-said-t">${esc(text)}</span></div></div>`,
  think: () => `<div class="chat-cav">${thinkFace()}</div>`,
};

/* ---------------- THE SHELL'S MENU ----------------
   The burger, ABOUT and the FAQs — on every room, so it's furniture. Waits
   for the DOM because this file loads in the head. */
/* ── the hamburger: ABOUT + FAQS ── */
const HM_FAQS = [
  ["How can I be sure the robot won't go off on one?",
   "You're in the driver's seat at every turn. You feed it. You fix stuff. You press go on the finished outputs. Human in every loop."],
  ["Who's on the block if it all goes wrong?",
   "Everyone, really. But ultimately the human in the loop is checking all the detail. The robot is just a robot at the end of the day."],
  ["Isn't robot copy pretty average?",
   "Straight from the machine, it can be. But great context and a smart prompt can get your robot to pretty damn good most days."],
  ["How can I be sure it sounds like us?",
   "That's all in the set up and the prompt. Your tone of voice, your best examples, your rules. So your robot should sound more like you than you do."],
  ["What's a container and why does it matter?",
   "Literally, it's the thing you put content in. The structure, the design, the word lengths, all that stuff. A smart container is the difference between consistent work and robots painting with beige."],
  ["How does the robot learn?",
   "The robot catches all your tweaks and writes them down in its robot notebook. Every now and then we check this list and use it to refine your prompts."],
  ["Will the robot spill my secrets?",
   "Nope. Robot Sandwich runs on Anthropic's API. And there's clear rules that prevent the robots from grabbing stuff and running away. Your copy is yours. Stays yours. No worries."],
  ["Why would Hunch give this away?",
   "It's the easy bit. The fun work is solving the problems and designing smart solutions. Besides, you're already using robots to write stuff. Might as well make them good ones."]
];
ready(function(){
  const list = $('faqList');
  HM_FAQS.forEach(([q,a],i)=>{
    const d=document.createElement('div');
    d.className='faq'+(i===0?' open':'');
    d.innerHTML=`<button class="faq-q" aria-expanded="${i===0}">${q}
        <svg class="faq-chev" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 6.5 L9 12 L15 6.5"/></svg>
      </button><div class="faq-a"><p>${a}</p></div>`;
    d.querySelector('.faq-q').onclick=()=>{
      const was=d.classList.contains('open');
      list.querySelectorAll('.faq').forEach(f=>{f.classList.remove('open');
        f.querySelector('.faq-q').setAttribute('aria-expanded','false')});
      if(!was){d.classList.add('open');
        d.querySelector('.faq-q').setAttribute('aria-expanded','true')}
    };
    list.appendChild(d);
  });
});
function hmMenu(){
  const on=$('hmMenuBox').classList.toggle('on');
  $('burger').classList.toggle('x',on);
  $('burger').setAttribute('aria-expanded',on);
}
function hmOpen(id){ hmMenu(); $('hm-'+id).classList.add('on'); }
function hmClose(id){ $('hm-'+id).classList.remove('on'); }
ready(()=>document.querySelectorAll('.hm-shade').forEach(s=>{
  s.addEventListener('click',e=>{ if(e.target===s) s.classList.remove('on'); });
}));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.hm-shade.on').forEach(s=>s.classList.remove('on'));
    if($('hmMenuBox').classList.contains('on')) hmMenu();
  }
});
document.addEventListener('click',e=>{
  const m=$('hmMenuBox'),b=$('burger');
  if(m.classList.contains('on') && !m.contains(e.target) && !b.contains(e.target)) hmMenu();
});
