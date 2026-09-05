/* SET UP's container room, drawn for real.
   Signs in as Hunch, opens the container, and looks at what is on screen:
   the stand-in copy poured into the artefact, the deets card filled, the
   waiting room and the strays in the chat, and the compose box live.
   The robot's own call needs a key that lives in Railway, so this stops at
   the point where a sentence would be sent. */
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
      w.CSS = { escape: s=>String(s).replace(/[^\w-]/g,'\\$&') };
      w.HTMLElement.prototype.showPicker=()=>{};
    }});
  const w=dom.window, d=w.document; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const errors=[]; w.addEventListener('error', e=>errors.push(e.message));
  const fails=[];
  const ok=(label,got,want)=>{ const good = want===undefined ? !!got : JSON.stringify(got)===JSON.stringify(want);
    console.log((good?'  ok  ':'FAIL  ')+label+' -> '+JSON.stringify(got)); if(!good) fails.push(label); };

  await sleep(500);
  d.getElementById('doorWord').value='taniwha'; await w.sayWord(); await sleep(900);

  /* a draft left behind by an earlier run would make every check below
     about the wrong folder — start from what has landed, every time */
  await w.fetch('/api/setup/discard',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({kind:'containers', id:'prize_draw'})}).catch(()=>{});

  w.enterSetup(); await sleep(600);
  ok('the room is open', !d.getElementById('setupHome').hidden, true);
  ok('containers listed', d.querySelectorAll('#homeContainers .home-row').length>0, true);

  w.setupOpen('containers','prize_draw'); await sleep(900);
  ok('the folder is open', d.getElementById('setupHed').textContent, 'THE CONTAINER');
  ok('the chat is the rail, not the shelves', d.getElementById('setupChatCard').hidden, false);
  ok('no shelves on a container', d.getElementById('setupShelves').hidden, true);
  ok('the compose box is live', d.getElementById('setupNote2').disabled, false);

  const chat=d.getElementById('setupChat').textContent;
  ok('it opens with the verdict', /clean|problem/i.test(chat), true);
  ok('and names what it wears that the brand does not declare', /Bebas Neue/.test(chat), true);

  /* the deets card, filled */
  w.setupGo('deets'); await sleep(400);
  const deets=d.getElementById('setupDeets').textContent;
  ok('the deets card has answers in it', deets.replace(/TBC/g,'').trim().length>60, true);

  /* THE POUR. jsdom doesn't render an iframe's srcdoc, so the real
     function is handed a real document built from the same html — which
     tests the pour rather than the browser. Two containers, because the
     rule has two halves: dress what is blank, step over what is not. */
  w.setupGo('output'); await sleep(400);
  const pourInto = html => {
    const inner = new JSDOM(html).window.document;
    w.setupPour({ contentDocument: inner });
    return inner;
  };
  let doc = pourInto(w.eval('SETUP_DATA.html'));
  const head = doc.querySelector('[data-module="headline"]');
  ok('real copy was left alone', /Practical Magic/.test(head.textContent), true);
  ok('and nothing was poured over it', head.dataset.standin===undefined, true);
  const hero = doc.querySelector('[data-module="hero"]');
  ok('a dressed image slot is left alone too', hero.dataset.standin===undefined, true);

  /* now the same html with its copy stripped out — a container as somebody
     setting one up would actually meet it */
  const bare = w.eval('SETUP_DATA.html').replace(/(<(\w+)([^>]*data-module="(headline|body|subject)"[^>]*)>)[^<]*/g, '$1');
  doc = pourInto(bare);
  const h2 = doc.querySelector('[data-module="headline"]');
  ok('an empty slot gets a stand-in', h2.dataset.standin, 'latin');
  ok('and it is latin', /lorem|ipsum|dolor|labore|veniam|irure|praesent|officia|occaecat|nisi|aute|minim/i.test(h2.textContent), true);
  const subj = doc.querySelector('[data-module="subject"]');
  ok('cut to the length the spec allows', subj.textContent.length<=45, true);

  /* the real-artefact case: the tag IS the image, with a live URL on it.
     Nothing may be painted over that. */
  const withImg = bare.replace(/<div class="hero" data-module="hero">[^<]*<\/div>/,
    '<img class="hero" data-module="hero" src="https://mcusercontent.com/x/issue113-hero.png">');
  doc = pourInto(withImg);
  const img = doc.querySelector('[data-module="hero"]');
  ok('a real image is left alone', img.getAttribute('src'), 'https://mcusercontent.com/x/issue113-hero.png');
  ok('and gets no grey box over it', img.dataset.standin===undefined, true);

  /* ---- THE PREVIEW LOOP (v049) ----
     "say the thing -> IT CHANGES -> I confirm." The proposal is applied to
     the artefact before you answer, so KEEP IT means you looked at it. This
     is the check that was missing: v047 proved the FILE changed and never
     once proved the PICTURE did. */
  const face = () => (w.eval('SETUP_DATA.html').match(/--display:[^;]*/)||[''])[0];
  const wore = face();
  ok('starts on the undeclared face', /Bebas/.test(wore), true);

  const prop = {park:false, op:'css', file:'container.html',
    args:{selector:':root', decls:[{prop:'--display', value:"'Euclid Circular A',Arial,sans-serif"}]},
    before:"'Bebas Neue','Arial Narrow',sans-serif", after:"'Euclid Circular A',Arial,sans-serif",
    label:':root · --display', say:'Swapped it.'};
  /* the preview the server would have computed, fetched the same way */
  const pv = await (await w.fetch('/api/setup/open/containers/prize_draw')).json();
  prop.preview = {html: pv.html.replace(/--display:[^;]*/, "--display:'Euclid Circular A',Arial,sans-serif")};

  w.setupProposal(prop); await sleep(300);
  ok('the artefact changed before you answered', /Euclid/.test(face()), true);
  ok('and the card knows you can see it', !!d.querySelector('#setupChat .setup-prop.live'), true);
  ok('so the button says keep', (d.querySelector('#setupChat .setup-yes')||{}).textContent, 'KEEP IT');
  ok('nothing is on disk yet', w.eval('SETUP_DATA.state'), 'live');

  w.setupReject(); await sleep(300);
  ok('putting it back restores the artefact', face(), wore);

  /* and the silent bin, which is what actually bit him */
  w.setupProposal(prop); await sleep(300);
  ok('previewing again', /Euclid/.test(face()), true);
  d.getElementById('setupNote2').value='something else entirely';
  w.setupAsk(); await sleep(400);
  ok('carrying on puts it back rather than binning it', face(), wore);
  ok('and says so', /carried on/.test(d.getElementById('setupChat').textContent), true);

  /* AND THE BRAND ROOM UNTOUCHED. v046's split is the thing this build was
     most able to break: brands are fields and shelves, containers are a
     picture and a chat, and one column can only have one occupant. */
  w.setupHome(); await sleep(500);
  w.setupOpen('brands','one_nz'); await sleep(800);
  ok('a brand still gets its shelves', d.getElementById('setupShelves').hidden, false);
  ok('and no chat', d.getElementById('setupChatCard').hidden, true);
  ok('shelf pills drawn', d.querySelectorAll('#setupShelves .setup-pill').length>0, true);

  console.log('errors:', errors);
  console.log(fails.length ? 'SETUP ROOM FAIL: '+fails.join(', ') : 'SETUP ROOM PASS');
  process.exit(fails.length||errors.length ? 1 : 0);
})().catch(e=>{ console.log('SETUP ROOM FAIL', e); process.exit(1); });
