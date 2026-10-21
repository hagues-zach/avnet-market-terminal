// Baseline screenshots of every page at 1440px and 1280px, plus console errors and
// sideways overflow per page. Pages scroll inside <main>, so each shot uses a viewport
// as tall as the page. Open the session from the repo root (paths resolve from there),
// with the kit dev server on port 3012:
//   playwright-cli -s=base open http://localhost:3012/start
//   playwright-cli -s=base run-code --filename=scripts/baseline-screenshots.js
// Writes docs/design/baseline/<route>-<width>.png. Add new routes to the list.
async page => {
  const routes = ['/start','/news','/overview','/cycle','/signals','/learn','/learn/sic-mosfets','/network','/network/avnet','/earnings','/competitive','/line-cards','/performance','/market-share','/tam','/supply-chain','/design-pipeline','/customers','/tools/qbr','/tools/deck','/tools/leads','/forecast','/tools/mapping','/copilot','/export','/data-hookups','/design-kit'];
  const out = [];
  for (const r of routes) {
    const errs = [];
    const onErr = e => errs.push(String(e.message || e).slice(0,140));
    const onCon = m => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push(m.text().slice(0,140)); };
    page.on('pageerror', onErr); page.on('console', onCon);
    let status = 0;
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      const res = await page.goto('http://localhost:3012' + r, { waitUntil: 'load', timeout: 120000 });
      status = res ? res.status() : 0;
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const name = r === '/' ? 'root' : r.slice(1).replace(/\//g, '-');
      for (const w of [1440, 1280]) {
        await page.setViewportSize({ width: w, height: 900 });
        const h = await page.evaluate(() => Math.min((document.querySelector('main')?.scrollHeight || 900) + 48, 12000));
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(400);
        await page.screenshot({ path: 'docs/design/baseline/' + name + '-' + w + '.png' });
      }
      const overflow = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0).length);
      out.push({ r, status, errs: errs.length, firstErr: errs[0] || '', overflow });
    } catch (e) { out.push({ r, status, fail: String(e.message).slice(0,120) }); }
    page.off('pageerror', onErr); page.off('console', onCon);
  }
  return JSON.stringify(out);
}
