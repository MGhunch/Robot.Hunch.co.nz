const { JSDOM } = require('jsdom');
const BASE='http://127.0.0.1:5055';
(async()=>{
  const html = await (await fetch(BASE+'/')).text();
  let cookie='';
  const dom = new JSDOM(html, { runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, url: BASE+'/',
    beforeParse(w){
      w.fetch = async (path, opts)=>{
        const r = await fetch(BASE+path, Object.assign({}, opts, {headers:Object.assign({}, (opts||{}).headers||{}, cookie?{cookie}:{})}));
        const sc=r.headers.get('set-cookie'); if(sc) cookie=sc.split(';')[0];
        return r; };
      w.alert = m=>console.log('ALERT', m);
      w.crypto = { randomUUID:()=>'run-'+Date.now() };
      w.requestAnimationFrame = f=>setTimeout(f,0);
      w.HTMLElement.prototype.showPicker=()=>{};
    }});
  const w=dom.window, d=w.document; const E=s=>w.eval(s); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const errors=[]; w.addEventListener('error', e=>errors.push(e.message));
  await sleep(500);
  d.getElementById('doorWord').value='taniwha'; await w.sayWord(); await sleep(900);
  console.log('echo:', d.getElementById('echo').textContent, '| tiles:', [...d.querySelectorAll('#doorTiles .door-tile')].map(r=>r.querySelector('.door-tile-t').textContent).join(' / '));
  // prize draw
  await w.enterRoom('prize_draw'); await sleep(300);
  console.log('quiz stops:', d.getElementById('feedT0').textContent,'|', d.getElementById('feedT2').textContent, '| ghost tags:', d.getElementById('feedGhost').querySelectorAll('.ghost-in').length);
  console.log('checklist cards:', d.querySelectorAll('#deetsCards .deets-card').length, 'rows:', d.querySelectorAll('#deetsCards .deets-row').length, 'first asks:', [...d.querySelectorAll('#deetsCards .deets-ask')].slice(0,3).map(e=>e.textContent).join(' | '));
  // fill via state, as the UI would
  const set=(id,v)=>{ E('DEETS_ROWS')[id].value=v; E('DEETS_ROWS')[id].ticked=true; };
  set('prize_type','movie'); set('prize_name','Practical Magic 2'); set('winners','5'); set('opens','2026-08-24'); set('closes','2026-09-06');
  w.deetsRender(); E('DEETS_ROWS').drawn.ticked=true; w.deetsRender();
  console.log('drawn derived:', E('DEETS_ROWS').drawn.value, '| form:', JSON.stringify(w.formData()));
  await w.refreshLegals(); await sleep(200);
  console.log('legals menu:', E('TERMS_MENU').length, 'optional:', d.querySelectorAll('#deetsCards .deets-pill').length, '| ready:', w.detailReady(), '| door live:', d.getElementById('deetsDoor').classList.contains('live'));
  // fake a WRITER result and mount FIX IT
  w.eval('ASSET=null; REACHED=1;');
  // v035: the handover is a signed brief plus the WRITER's result and the engine's menu
  w.briefSign(); console.log('brief:', Object.keys(E('BRIEF')).join(','), '| signed:', E('BRIEF').signed, '| v:', E('BRIEF').v, '| facts:', Object.keys(E('BRIEF').details.facts).length, 'chosen:', E('BRIEF').details.chosen.length, '| sorted keys:', Object.keys(E('BRIEF').sorted).join(','));
  w.fixInit({copy:{subject:['Double, double, toil and a double pass','B option','C option'],headline:'Win one of {winners_word} double passes to {prize_name}',body:'The Owens sisters are back. Enter before {closes_day}.',why:{subject:'Playful front page',headline:'Plain about what you win',body:'Story then the ask'},wants:null},facts:{},context:{winners_word:'five',prize_name:'Practical Magic 2',closes_day:'Sunday'},flags:[]}, {menu:E('TERMS_MENU')});
  await sleep(600);
  console.log('asset:', Object.keys(E('ASSET')).join(','), '| brief_v matches:', E('ASSET').brief_v===E('BRIEF').v, '| menu:', E('ASSET').menu.length, '| tweaks:', E('ASSET').tweaks.length);
  const fr=d.querySelector('#fixArt iframe');
  console.log('FIX_ORDER:', E('FIX_ORDER').join(','), '| pads:', d.querySelectorAll('#fixGutter .fix-pad').length, '| topic:', d.getElementById('fixTopic').textContent, '| wrap:', d.getElementById('fixWrapLbl').textContent);
  const D=E('FIX_DOC'); console.log('poured headline:', D&&D.querySelector('[data-module="headline"]').textContent, '| terms starts:', D&&D.querySelector('[data-module="terms"]').textContent.slice(0,40), '| chat:', d.querySelectorAll('#fixChat .chat-row').length, 'drawer:', d.querySelectorAll('#fixChat .chat-opt').length);
  // the loop: tap a padlock → pencil, thread opens; tap again → kept, next opens
  w.fixPadTap('subject'); await sleep(100);
  console.log('focus:', E('FIX_FOCUS'), '| topic:', d.getElementById('fixTopic').textContent, '| chat:', d.querySelectorAll('#fixChat .chat-row').length, 'drawer:', d.querySelectorAll('#fixChat .chat-opt').length, '| pad states:', [...d.querySelectorAll('#fixGutter .fix-pad')].map(b=>b.className.replace('fix-pad ','')).join(','), '| lifted:', D.querySelectorAll('.fix-sec.editing').length, '| wrap:', d.getElementById('fixWrapLbl').textContent);
  w.fixPickOption('subject',1); await sleep(100); console.log('after pick:', D.querySelector('[data-module="subject"]').textContent, '| drawer left:', d.querySelectorAll('#fixChat .chat-opt').length);
  w.fixPadTap('subject'); await sleep(600);
  console.log('after keep — focus:', E('FIX_FOCUS'), '| locks:', JSON.stringify(E('ASSET').locks), '| wrap:', d.getElementById('fixWrapLbl').textContent, '| pads:', [...d.querySelectorAll('#fixGutter .fix-pad')].map(b=>b.className.replace('fix-pad ','')).join(','));
  // a typed keep never leaves the browser
  d.getElementById('fixNote').value='yep'; await w.fixSend(); await sleep(600);
  console.log('after typed keep — focus:', E('FIX_FOCUS'), '| wrap:', d.getElementById('fixWrapLbl').textContent);
  console.log('asset tweaks after drawer pick:', E('ASSET').tweaks.length, '| pick:', E('ASSET').pick, '| final copy subject:', w.fixFinalCopy().subject);
  // change a fact: the brief moves on, the asset is stale, FIX IT goes — same as it always did
  E('DEETS_ROWS').winners.value='6'; w.dirty(); await sleep(50);
  console.log('after a fact change — asset:', E('ASSET'), '| reached:', E('REACHED'), '| brief v moved:', w.briefBuild().v!==E('BRIEF').v);
  w.eval('REACHED=1;'); w.briefSign(); w.fixInit({copy:{subject:['A','B','C'],headline:'H',body:'B',why:{},wants:null},facts:{},context:{},flags:[]}, {menu:E('TERMS_MENU')}); await sleep(300);
  // back to a locked one: thread remembered
  w.fixPadTap('subject'); await sleep(100);
  console.log('reopened subject — rows:', d.querySelectorAll('#fixChat .chat-row').length, '| topic:', d.getElementById('fixTopic').textContent, '| headline now:', E('ASSET').locks.headline);
  // wrap early takes you to the open bit
  w.fixWrapGo(); await sleep(100); console.log('wrap early → focus:', E('FIX_FOCUS'), '| wrap:', d.getElementById('fixWrapLbl').textContent);
  // one update — the lineup
  w.eval('ASSET=null'); await w.enterRoom('one_update'); await sleep(300);
  console.log('OU tabs:', [...d.querySelectorAll('.fix-tabs .fix-loz')].map(x=>x.textContent).join('/'), '| ghost bar:', !!d.querySelector('#feedGhost .ghost-bar'), '| stories:', d.querySelectorAll('#deetsCards .deets-card.story').length, '| legals card:', !!d.querySelector('#deetsCards .deets-card.legals'));
  const st=E('DEETS_REPEATS').story; const fill=(o,kv)=>Object.entries(kv).forEach(([k,v])=>{ o[k].value=v; o[k].ticked=true; });
  fill(st[0],{story_type:'prize',story_subject:'Win 500 Phone Dollars'}); fill(st[1],{story_type:'news',story_subject:'Satellite calls'}); fill(st[2],{story_type:'news',story_subject:'2G switch-off'});
  st[1].story_legals.value=['satellite']; w.deetsRender();
  const cards=d.querySelectorAll('#deetsCards .deets-card.story');
  console.log('OU pills on prize:', cards[0].querySelectorAll('.deets-pill').length, 'ticked:', cards[0].querySelectorAll('.deets-pill.on').length, '| news chips on:', cards[1].querySelectorAll('.deets-pill.on').length, '| ready:', w.detailReady(), '| story1:', JSON.stringify(w.formData().story[0]));
  await w.refreshLegals(); await sleep(200); console.log('OU menu:', E('TERMS_MENU').length);
  w.briefSign(); w.fixInit({copy:{subject:['Toilets, and a draw','Headphones, and toilets'],preheader:'Win things',headline:'Be in to win.',"intro-copy":'Three things.',"signoff-copy":'Ngā mihi',cards:[{'card-title':'Win Phone Dollars','card-body':'One pair.','card-cta':'Enter now'},{'card-title':'Satellite','card-body':'Bear with us.','card-cta':'Find out more'},{'card-title':'2G','card-body':'Round two.','card-cta':'Learn more'}],why:{subject:'front page',card:'says what it is'},wants:null},facts:{},context:{},flags:[]}, {menu:E('TERMS_MENU')});
  await sleep(700);
  const D2=E('FIX_DOC'); console.log('OU FIX_ORDER:', E('FIX_ORDER').length, 'terms in order:', E('FIX_ORDER').includes('terms'), '| cards in doc:', D2.querySelectorAll('[data-module="card"]').length, '| legals module untouched:', D2.querySelector('[data-module="legals"]').textContent.includes('competition'), '| pads:', d.querySelectorAll('#fixGutter .fix-pad').length);
  console.log('errors:', errors);
})().catch(e=>{ console.log('SMOKE FAIL', e.stack); process.exit(1); });
