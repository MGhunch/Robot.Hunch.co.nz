const { chromium } = require('playwright');
const fs = require('fs');
/* smoke_errors.js — the error-surface harness (v033), kept as the
   regression test for the front-end refactor. Signs in, enters a
   container, forces every error state and screenshots twenty views.

   Run it before a change and after; pixel-diff the two folders. Any
   difference is a bug in the move, not a design decision.

     ROBOT_WORDS="hunch:Michael" python3 app.py          # port 5000, no API key needed
     BASE=http://localhost:5000 OUT=shots-before node smoke_errors.js
     ... make the change ...
     BASE=http://localhost:5000 OUT=shots-after  node smoke_errors.js

   Needs playwright and a Chromium. The word is 'hunch' so the testing
   container shows; the model paths fail for real without a key, which
   is the point. */
const OUT = process.env.OUT || 'shots'; fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5000';

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  const shot = async (name, sel, full) => {
    if (sel) { const el = await p.$(sel); if (el) { await el.screenshot({ path: `${OUT}/${name}.png` }); return; } }
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!full });
  };

  // ---- 1. THE DOOR: the guess ladder ----
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.click('#siGo'); await p.waitForTimeout(400);
  await shot('01-door-empty', '#signin');
  for (let i = 0; i < 3; i++) {
    await p.fill('#siWord', 'nope' + i); await p.click('#siGo'); await p.waitForTimeout(500);
    await shot(`02-door-wrong-${i + 1}`, '#signin');
  }
  await p.route('**/api/auth/word', r => r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"braked"}' }));
  await p.fill('#siWord', 'x'); await p.click('#siGo'); await p.waitForTimeout(500);
  await shot('03-door-braked', '#signin');
  await p.unroute('**/api/auth/word');

  // ---- 2. THE DOORWAY: containers won't list ----
  await p.route('**/api/containers', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
  await p.fill('#siWord', 'hunch'); await p.click('#siGo'); await p.waitForTimeout(1200);
  await shot('04-doorway-list-fail', '#door');
  await p.unroute('**/api/containers');

  // ---- 3. THE DOORWAY: a tile won't open ----
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  if (!(await p.$('#rooms .room'))) { await p.fill('#siWord', 'hunch'); await p.click('#siGo'); await p.waitForTimeout(1200); }
  await p.route('**/api/container/*', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
  await p.click('#rooms .room'); await p.waitForTimeout(500);
  await shot('05-doorway-tile-fail', '#door');
  await p.unroute('**/api/container/*');

  // ---- into the room for real ----
  await p.click('#rooms .room'); await p.waitForTimeout(1500);

  // ---- 4. FEED IT: the dead doc, the search died ----
  await p.evaluate(() => {
    FD_DOCS.push({ name: 'brief.xlsx', text: '', bad: true, why: STR.feed.read.format }); fdDocsDraw();
  });
  await p.waitForTimeout(300);
  await shot('06-feed-dead-doc', '.fd-stage[data-i="0"]');
  await p.evaluate(() => { fdDoor('search'); fdSay(0, STR.feed.search_died, true); });
  await p.waitForTimeout(400);
  await shot('07-feed-search-died', '.fd-stage[data-i="0"]');
  await p.evaluate(() => { fdSay(0, STR.feed.plan_empty); });
  await p.waitForTimeout(300);
  await shot('08-feed-plan-empty', '.fd-stage[data-i="0"]');

  // ---- 5. FEED IT: the feeder fell over (line in the bounce rail) ----
  await p.evaluate(() => { acc(1); fdSay(1, STR.feed.feeder); });
  await p.waitForTimeout(400);
  await shot('09-feed-feeder-fell', '.fd-stage[data-i="1"]');

  // ---- 6. LOCK THE DEETS: terms won't fetch / not yet ----
  await p.evaluate(() => { acc(2); TERMS_BUSY = true; clRender(); });
  await p.waitForTimeout(300);
  await shot('10-deets-terms-wait', '.fd-stage[data-i="2"]');
  await p.evaluate(() => { TERMS_BUSY = false; TERMS_FAILED = true; MENU = []; clRender(); });
  await p.waitForTimeout(700);   // the line's fade-in is 280ms; give it room so the shot is stable
  await shot('11-deets-terms-fail', '.fd-stage[data-i="2"]');

  // ---- 7. FIX IT: the plate card, then the full stop, then the rocket ----
  await p.evaluate(() => {
    REACHED = 2; unlock(); go(1);
    document.querySelector('.fx-tabs').innerHTML = '<span class="fx-loz">Prize draw email</span>';
    $('fxArt').innerHTML = ''; $('fxArt').appendChild(errCard('plate', () => {}, 'copy', {container:CID, run:RUN, onGone:()=>{ const t=document.querySelector('.fx-tabs'); if(t) t.innerHTML=''; }}));
  });
  await p.waitForTimeout(400);
  await shot('12-fix-plate-card', '.fixstage');
  await p.click('.errcard-go'); await p.waitForTimeout(200);
  await p.evaluate(() => { $('fxArt').appendChild(errCard('plate', () => {}, 'copy', {container:CID, run:RUN, onGone:()=>{ const t=document.querySelector('.fx-tabs'); if(t) t.innerHTML=''; }})); });
  await p.waitForTimeout(600);
  await shot('13-fix-plate-stop', '.fixstage');
  await p.click('.errcard-go'); await p.waitForTimeout(400);
  await shot('14-fix-plate-after-rocket', '.fixstage');

  // ---- 8. FIX IT: the rail's error turn ----
  await p.evaluate(() => {
    fxSay('Like this?', 'robot', true);
    fxErr(STR.fix.tweak_fail); fxErr(STR.fix.locked); fxSay(esc(STR.fix.flag) + 'the date moved', 'robot', false);
  });
  await p.waitForTimeout(400);
  await shot('15-fix-rail-errors', '.fx-rail');

  // ---- 9. FILE IT: the grid card, the stop, the wrap line ----
  await p.evaluate(() => { cardReset('grid'); go(2); $('fiTiles').innerHTML = ''; $('fiTiles').appendChild(errCard('grid', () => {}, 'fillings', {container:CID, run:RUN})); });
  await p.waitForTimeout(400);
  await shot('16-file-grid-card', '.filestage');
  await p.click('.errcard-go'); await p.waitForTimeout(200);
  await p.evaluate(() => { $('fiTiles').appendChild(errCard('grid', () => {}, 'fillings', {container:CID, run:RUN})); });
  await p.waitForTimeout(600);
  await shot('17-file-grid-stop', '.filestage');
  await p.click('.errcard-go'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    $('fiTiles').innerHTML = '<button class="tile on"><span class="cl-tick"></span><span class="tile-i"></span><span class="tile-t">COPY DOC</span><span class="tile-d">The words, laid out.</span></button>';
    errAt($('fiBar'), STR.file.wrap, { cls: 'onred', stick: true });
  });
  await p.waitForTimeout(400);
  await shot('18-file-wrap-fail', null, true);

  // ---- 10. the plain face still works: WRAPPED ----
  await p.evaluate(() => { errClear($('fiBar')); $('fiDone').classList.add('on'); });
  await p.waitForTimeout(300);
  await shot('19-file-wrapped-face', '.fi-say');

  // ---- 11. THINKING face still animates (a frame) ----
  await p.evaluate(() => { go(1); $('fxChat').innerHTML = ''; fxThink(); });
  await p.waitForTimeout(600);
  await shot('20-fix-think-face', '.fx-rail');

  console.log(errors.length ? errors.join('\n') : 'no page errors');
  await b.close();
})();
