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
  console.log('legals menu:', E('MENU').length, 'optional:', d.querySelectorAll('#clCards .cl-clause').length, '| ready:', w.detailReady(), '| door live:', d.getElementById('clDoor').classList.contains('live'));
  // fake a WRITER result and mount FIX IT
  w.eval('COPY=null; REACHED=1;');
  w.fxInit({copy:{subject:['Double, double, toil and a double pass','B option','C option'],headline:'Win one of {winners_word} double passes to {prize_name}',body:'The Owens sisters are back. Enter before {closes_day}.',why:{subject:'Playful front page',headline:'Plain about what you win',body:'Story then the ask'},wants:null},facts:E('FACTS'),context:{winners_word:'five',prize_name:'Practical Magic 2',closes_day:'Sunday'},flags:[]});
  await sleep(600);
  const fr=d.querySelector('#fxArt iframe');
  console.log('FXORDER:', E('FXORDER').join(','), '| pads:', d.querySelectorAll('#fxGutter .fx-pad').length, '| topic:', d.getElementById('fxTopic').textContent, '| cap:', d.getElementById('fxCap').textContent);
  const D=E('FXDOC'); console.log('poured headline:', D&&D.querySelector('[data-module="headline"]').textContent, '| terms starts:', D&&D.querySelector('[data-module="terms"]').textContent.slice(0,40), '| chat:', d.querySelectorAll('#fxChat .fx-chatrow').length, 'drawer:', d.querySelectorAll('#fxChat .fx-opt').length);
  w.fxPickOption('subject',1); await sleep(100); console.log('after pick:', D.querySelector('[data-module="subject"]').textContent);
  // one update
  w.eval('COPY=null'); await w.enterRoom('one_update'); await sleep(300);
  console.log('OU checklist cards:', d.querySelectorAll('#clCards .cl-card').length, 'add btn:', !!d.querySelector('.cl-add'), '| ghost cards:', d.querySelectorAll('#fdGhost .fd-gcard').length, 'strips:', d.querySelectorAll('#fdGhost .fd-gstrip').length, 'more:', d.querySelector('#fdGhost .fd-gmore')&&d.querySelector('#fdGhost .fd-gmore').textContent);
  E('CLR').card[0].card_type.value='prize'; w.clRender();
  console.log('OU card1 rows after type=prize:', d.querySelectorAll('#clCards .cl-card')[1].querySelectorAll('.cl-row').length, 'tag:', d.querySelector('#clCards .cl-tag').textContent);

  const S=id=>{ E('CLS')[id].value= id==='card_count'?'3':'Q3'; E('CLS')[id].ticked=true; };
  ['issue','thread','next','card_count'].forEach(S);
  const c=E('CLR').card; const fill=(o,kv)=>Object.entries(kv).forEach(([k,v])=>{ o[k].value=v; o[k].ticked=true; });
  fill(c[0],{card_type:'prize',card_subject:'Headphones',card_cta:'Enter now',card_url:'#'}); w.clRender();
  fill(c[0],{prize_name:'Sony WH-1000XM6',prize_count:'1',closes:'2026-09-06',terms_url:'#'});
  fill(c[1],{card_type:'news',card_subject:'Toilets',card_cta:'Find out more',card_url:'#'});
  fill(c[2],{card_type:'product',card_subject:'Refurb',card_cta:'Learn more',card_url:'#'}); w.clRender();
  console.log('OU ready:', w.detailReady(), '| form card1:', JSON.stringify(w.formData().card[0]));
  await w.refreshLegals(); await sleep(200); console.log('OU menu:', E('MENU').length, 'facts card:', E('FACTS')&&E('FACTS').card&&E('FACTS').card[0].closes_day);
  w.fxInit({copy:{subject:['Toilets, and a draw','Headphones, and toilets'],preheader:'Win things',headline:'Be in to win.',"intro-copy":'Three things.',"signoff-copy":'Ngā mihi',cards:[{'card-title':'Win Sony headphones','card-body':'One pair.','card-cta':'Enter now'},{'card-title':'Toilets','card-body':'Bear with us.','card-cta':'Find out more'},{'card-title':'Refurb','card-body':'Round two.','card-cta':'Learn more'}],why:{subject:'front page',card:'says what it is'},wants:null},facts:E('FACTS'),context:{},flags:[]});
  await sleep(700);
  const D2=E('FXDOC'); console.log('OU FXORDER:', E('FXORDER').length, E('FXORDER').slice(0,8).join(','), '| cards in doc:', D2.querySelectorAll('[data-module="card"]').length, '| card2 title:', D2.querySelector('[data-card="2"] [data-module="card-title"]').textContent, '| subj B:', D2.querySelector('[data-variant="B"]').textContent, '| pads:', d.querySelectorAll('#fxGutter .fx-pad').length, '| cap:', d.getElementById('fxCap').textContent);
  console.log('errors:', errors);
})().catch(e=>{ console.log('SMOKE FAIL', e.stack); process.exit(1); });
