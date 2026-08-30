const { JSDOM } = require('jsdom');
const BASE='http://127.0.0.1:5055';
(async()=>{
  const html = await (await fetch(BASE+'/')).text();
  let cookie='';
  const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url: BASE+'/',
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
  d.getElementById('siWord').value='taniwha'; await w.sayWord(); await sleep(900);
  console.log('echo:', d.getElementById('echo').textContent, '| tiles:', [...d.querySelectorAll('#rooms .room')].map(r=>r.querySelector('.room-t').textContent).join(' / '));
  // prize draw
  await w.enterRoom('prize_draw'); await sleep(300);
  console.log('quiz stops:', d.getElementById('fdT0').textContent,'|', d.getElementById('fdT2').textContent, '| ghost tags:', d.getElementById('fdGhost').querySelectorAll('.fd-in').length);
  console.log('checklist cards:', d.querySelectorAll('#clCards .cl-card').length, 'rows:', d.querySelectorAll('#clCards .cl-row').length, 'first asks:', [...d.querySelectorAll('#clCards .cl-ask')].slice(0,3).map(e=>e.textContent).join(' | '));
  // fill via state, as the UI would
  const set=(id,v)=>{ E('CLS')[id].value=v; E('CLS')[id].ticked=true; };
  set('prize_type','movie'); set('prize_name','Practical Magic 2'); set('winners','5'); set('opens','2026-08-24'); set('closes','2026-09-06');
  w.clRender(); E('CLS').drawn.ticked=true; w.clRender();
  console.log('drawn derived:', E('CLS').drawn.value, '| form:', JSON.stringify(w.formData()));
  await w.refreshLegals(); await sleep(200);
  console.log('legals menu:', E('MENU').length, 'optional:', d.querySelectorAll('#clCards .cl-pill').length, '| ready:', w.detailReady(), '| door live:', d.getElementById('clDoor').classList.contains('live'));
  // fake a WRITER result and mount FIX IT
  w.eval('COPY=null; REACHED=1;');
  w.fxInit({copy:{subject:['Double, double, toil and a double pass','B option','C option'],headline:'Win one of {winners_word} double passes to {prize_name}',body:'The Owens sisters are back. Enter before {closes_day}.',why:{subject:'Playful front page',headline:'Plain about what you win',body:'Story then the ask'},wants:null},facts:E('FACTS'),context:{winners_word:'five',prize_name:'Practical Magic 2',closes_day:'Sunday'},flags:[]});
  await sleep(600);
  const fr=d.querySelector('#fxArt iframe');
  console.log('FXORDER:', E('FXORDER').join(','), '| pads:', d.querySelectorAll('#fxGutter .fx-pad').length, '| topic:', d.getElementById('fxTopic').textContent, '| wrap:', d.getElementById('fxWrapLbl').textContent);
  const D=E('FXDOC'); console.log('poured headline:', D&&D.querySelector('[data-module="headline"]').textContent, '| terms starts:', D&&D.querySelector('[data-module="terms"]').textContent.slice(0,40), '| chat:', d.querySelectorAll('#fxChat .fx-chatrow').length, 'drawer:', d.querySelectorAll('#fxChat .fx-opt').length);
  // the loop: tap a padlock → pencil, thread opens; tap again → kept, next opens
  w.fxPadTap('subject'); await sleep(100);
  console.log('focus:', E('FXFOCUS'), '| topic:', d.getElementById('fxTopic').textContent, '| chat:', d.querySelectorAll('#fxChat .fx-chatrow').length, 'drawer:', d.querySelectorAll('#fxChat .fx-opt').length, '| pad states:', [...d.querySelectorAll('#fxGutter .fx-pad')].map(b=>b.className.replace('fx-pad ','')).join(','), '| lifted:', D.querySelectorAll('.fx-sec.editing').length, '| wrap:', d.getElementById('fxWrapLbl').textContent);
  w.fxPickOption('subject',1); await sleep(100); console.log('after pick:', D.querySelector('[data-module="subject"]').textContent, '| drawer left:', d.querySelectorAll('#fxChat .fx-opt').length);
  w.fxPadTap('subject'); await sleep(600);
  console.log('after keep — focus:', E('FXFOCUS'), '| locks:', JSON.stringify(E('FXLOCK')), '| wrap:', d.getElementById('fxWrapLbl').textContent, '| pads:', [...d.querySelectorAll('#fxGutter .fx-pad')].map(b=>b.className.replace('fx-pad ','')).join(','));
  // a typed keep never leaves the browser
  d.getElementById('fxNote').value='yep'; await w.fxSend(); await sleep(600);
  console.log('after typed keep — focus:', E('FXFOCUS'), '| wrap:', d.getElementById('fxWrapLbl').textContent);
  // back to a locked one: thread remembered
  w.fxPadTap('subject'); await sleep(100);
  console.log('reopened subject — rows:', d.querySelectorAll('#fxChat .fx-chatrow').length, '| topic:', d.getElementById('fxTopic').textContent, '| headline now:', E('FXLOCK').headline);
  // wrap early takes you to the open bit
  w.fxWrapGo(); await sleep(100); console.log('wrap early → focus:', E('FXFOCUS'), '| wrap:', d.getElementById('fxWrapLbl').textContent);
  // one update — the lineup
  w.eval('COPY=null'); await w.enterRoom('one_update'); await sleep(300);
  console.log('OU tabs:', [...d.querySelectorAll('.fx-tabs .fx-loz')].map(x=>x.textContent).join('/'), '| ghost bar:', !!d.querySelector('#fdGhost .fd-gbar'), '| stories:', d.querySelectorAll('#clCards .cl-card.story').length, '| legals card:', !!d.querySelector('#clCards .cl-card.legals'));
  const st=E('CLR').story; const fill=(o,kv)=>Object.entries(kv).forEach(([k,v])=>{ o[k].value=v; o[k].ticked=true; });
  fill(st[0],{story_type:'prize',story_subject:'Win 500 Phone Dollars'}); fill(st[1],{story_type:'news',story_subject:'Satellite calls'}); fill(st[2],{story_type:'news',story_subject:'2G switch-off'});
  st[1].story_legals.value=['satellite']; w.clRender();
  const cards=d.querySelectorAll('#clCards .cl-card.story');
  console.log('OU pills on prize:', cards[0].querySelectorAll('.cl-pill').length, 'ticked:', cards[0].querySelectorAll('.cl-pill.on').length, '| news chips on:', cards[1].querySelectorAll('.cl-pill.on').length, '| ready:', w.detailReady(), '| story1:', JSON.stringify(w.formData().story[0]));
  await w.refreshLegals(); await sleep(200); console.log('OU menu:', E('MENU').length, '| facts story:', E('FACTS')&&E('FACTS').story&&E('FACTS').story[0].story_legals);
  w.fxInit({copy:{subject:['Toilets, and a draw','Headphones, and toilets'],preheader:'Win things',headline:'Be in to win.',"intro-copy":'Three things.',"signoff-copy":'Ngā mihi',cards:[{'card-title':'Win Phone Dollars','card-body':'One pair.','card-cta':'Enter now'},{'card-title':'Satellite','card-body':'Bear with us.','card-cta':'Find out more'},{'card-title':'2G','card-body':'Round two.','card-cta':'Learn more'}],why:{subject:'front page',card:'says what it is'},wants:null},facts:E('FACTS'),context:{},flags:[]});
  await sleep(700);
  const D2=E('FXDOC'); console.log('OU FXORDER:', E('FXORDER').length, 'terms in order:', E('FXORDER').includes('terms'), '| cards in doc:', D2.querySelectorAll('[data-module="card"]').length, '| legals module untouched:', D2.querySelector('[data-module="legals"]').textContent.includes('competition'), '| pads:', d.querySelectorAll('#fxGutter .fx-pad').length);
  console.log('errors:', errors);
})().catch(e=>{ console.log('SMOKE FAIL', e.stack); process.exit(1); });
