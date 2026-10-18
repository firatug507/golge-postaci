const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox']});
  const page = await browser.newPage();
  await page.setViewport({width:390, height:844, deviceScaleFactor:1, isMobile:true});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html?test=1'); await sleep(500);
  await page.evaluate(() => __gp.resetSave());
  const out = [];
  for (const mode of ['good', 'good', 'sloppy', 'sloppy', 'sloppy', 'novice']) {
    await page.evaluate(() => { const b = document.getElementById('btnStart'); if (!document.getElementById('menu').classList.contains('hidden')) b.click(); else document.getElementById('btnRetry').click(); document.getElementById('letterModal').classList.add('hidden'); });
    await sleep(300);
    const t0 = Date.now(); let held = false, tH = 0, relAt = 0, waitUntil = 0;
    while (Date.now() - t0 < 75000) {
      const q = await page.evaluate(() => ({p:__gp.player, r:__gp.run, s:__gp.state}));
      if (q.s !== 'play' || q.r.ended) break;
      const p = q.p, now = Date.now();
      if (!held) {
        if (now > waitUntil && ((!p.grounded && p.vy > -100) || (p.grounded && Math.random() < 0.05))) {
          await page.mouse.down(); held = true; tH = now;
          relAt = mode === 'sloppy' ? now + 300 + Math.random() * 900 : mode === 'novice' ? now + 200 + Math.random() * 1600 : 0;
        }
      } else {
        const rel = mode === 'good' ? (p.roped && p.vx > 250 && p.vy < -80) : (now > relAt);
        if (rel || now - tH > 2500 || (p.grounded && !p.roped)) { await page.mouse.up(); held = false; waitUntil = now + (mode === 'good' ? 0 : Math.random() * (mode === 'novice' ? 600 : 250)); }
      }
      await sleep(16);
    }
    if (held) await page.mouse.up();
    const r = await page.evaluate(() => __gp.run);
    out.push({mode, secs:+((Date.now() - t0) / 1000).toFixed(1), dist:r.dist, swings:r.swings, landed:r.landed, letters:r.letters, stamps:r.stamps, ended:r.ended});
    for (let i = 0; i < 100 && (await page.evaluate(() => __gp.state)) === 'play'; i++) await sleep(100);
    await sleep(300);
  }
  console.log(JSON.stringify(out)); console.log('save', JSON.stringify(await page.evaluate(() => __gp.save))); console.log('errs', errs);
  await browser.close();
})();
