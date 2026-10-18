const puppeteer = require('puppeteer-core');
const fs = require('fs');
const URL = 'http://127.0.0.1:8765/index.html?test=1';
const SH = '/workspace/golge-postaci/shots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const page = await browser.newPage();
  await page.setViewport({width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:false});
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL, {waitUntil:'load'});
  await page.evaluate(() => { localStorage.clear(); __gp.resetSave(); });
  await sleep(800);
  await page.screenshot({path:SH + '01_menu.png'});
  const R = {};
  const st = () => page.evaluate(() => ({s:__gp.state, p:__gp.player, r:__gp.run}));
  // ---- start run, check hint & hold/release swing
  await page.click('#btnStart'); await sleep(400);
  await page.screenshot({path:SH + '02_run_start.png'});
  let s = await st(); R.started = s.s === 'play' && s.p.grounded;
  await page.mouse.move(200, 500); await page.mouse.down(); await sleep(350);
  s = await st(); R.ropeOnHold = s.p.roped;
  await page.screenshot({path:SH + '03_swing.png'});
  await sleep(250); await page.mouse.up(); await sleep(50);
  s = await st(); R.releasedFlying = !s.p.roped && !s.p.grounded;
  await page.screenshot({path:SH + '04_flight.png'});
  // ---- autoplayer: play until death, count landings
  async function autoplay(maxMs, shotAt) {
    const t0 = Date.now(); let held = false, shot = false, holdT = 0;
    while (Date.now() - t0 < maxMs) {
      const q = await page.evaluate(() => { const p = __gp.player, r = __gp.run; return {p, r, s:__gp.state}; });
      if (q.s !== 'play' || q.r.ended) break;
      const p = q.p;
      if (!held) {
        // hold when falling after an edge hop, or periodically from roof
        if ((!p.grounded && p.vy > -100) || (p.grounded && Math.random() < 0.08)) { await page.mouse.down(); held = true; holdT = Date.now(); }
      } else {
        if (p.roped && p.vx > 250 && p.vy < -80) { await page.mouse.up(); held = false; }
        else if (Date.now() - holdT > 2500) { await page.mouse.up(); held = false; }
        else if (p.grounded && !p.roped) { await page.mouse.up(); held = false; }
      }
      if (shotAt && !shot && Date.now() - t0 > shotAt) { await page.screenshot({path:SH + '05_midrun.png'}); shot = true; }
      await sleep(16);
    }
    if (held) await page.mouse.up();
    return page.evaluate(() => __gp.run);
  }
  let r1 = await autoplay(40000, 6000);
  R.autoRun1 = r1;
  // if still alive after autoplay, force a fall by doing nothing
  for (let i = 0; i < 200 && (await st()).s === 'play'; i++) await sleep(100);
  await sleep(500);
  s = await st(); R.fallEndsRun = s.s === 'over' && s.r.reason === 'fall';
  await page.screenshot({path:SH + '06_gameover.png'});
  const save1 = await page.evaluate(() => __gp.save);
  R.bestSaved = save1.best === r1.dist || save1.best >= r1.dist;
  // ---- delivery test: teleport before a mailbox and run into it
  const modalOpen = await page.evaluate(() => !document.getElementById('letterModal').classList.contains('hidden'));
  if (modalOpen) await page.click('#lmClose');
  await page.click('#btnRetry'); await sleep(300);
  await page.evaluate(() => { const m = __gp.nextMailbox(); __gp.placeBefore(m); });
  await sleep(900);
  s = await st(); R.deliveredLetters = s.r.letters; R.deliveredStamps = s.r.stamps;
  await page.screenshot({path:SH + '07_delivery.png'});
  await page.evaluate(() => { const m = __gp.nextMailbox(); __gp.placeBefore(m); }); await sleep(900);
  // pause & resume
  await page.click('#btnPause'); await sleep(200);
  R.paused = (await st()).s === 'pause';
  await page.screenshot({path:SH + '08_pause.png'});
  await page.click('#btnResume'); await sleep(100); R.resumed = (await st()).s === 'play';
  // dawn ending
  await page.evaluate(() => __gp.setNight(0.3)); await sleep(1800);
  s = await st(); R.dawnEnds = s.s === 'over' && s.r.reason === 'dawn';
  await sleep(700);
  await page.screenshot({path:SH + '09_over_letters.png'});
  if (await page.evaluate(() => !document.getElementById('letterModal').classList.contains('hidden'))) { await page.screenshot({path:SH + '10_letter_modal.png'}); await page.click('#lmClose'); }
  const save2 = await page.evaluate(() => __gp.save);
  R.lettersUnlocked = save2.letters; R.stampsTotal = save2.stamps;
  // ---- letters screen
  await page.click('#btnHome'); await sleep(200); await page.click('#btnLetters'); await sleep(300);
  await page.screenshot({path:SH + '11_letters.png'});
  await page.click('[data-back]'); await sleep(200);
  // ---- shop purchase persists across reload
  await page.evaluate(() => __gp.giveStamps(40)); await page.click('#btnShop'); await sleep(300);
  const before = await page.evaluate(() => __gp.save.stamps);
  await page.click('button[data-item="cape_kiremit"]'); await sleep(300);
  await page.screenshot({path:SH + '12_shop.png'});
  await page.reload({waitUntil:'load'}); await sleep(500);
  const save3 = await page.evaluate(() => __gp.save);
  R.shopPersist = save3.owned.includes('cape_kiremit') && save3.cape === 'cape_kiremit' && save3.stamps === before - 40;
  R.lettersPersist = save3.letters.length === save2.letters.length;
  // a few more autoplay runs for landing stats
  const runs = [];
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => { const b = document.getElementById('btnStart'); if (!b.closest('.hidden')) b.click(); else document.getElementById('btnRetry').click(); });
    await sleep(300);
    const rr = await autoplay(15000); runs.push(rr);
    for (let i = 0; i < 100 && (await st()).s === 'play'; i++) await sleep(100);
    await sleep(400);
    if (await page.evaluate(() => !document.getElementById('letterModal').classList.contains('hidden'))) await page.click('#lmClose');
  }
  R.autoRuns = runs.map(r => ({dist:r.dist, swings:r.swings, landed:r.landed, letters:r.letters, reason:r.reason}));
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
