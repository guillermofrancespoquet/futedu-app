const { test, expect } = require('@playwright/test');
const { PLAYER_IDS: [alex], assessment, profile, openApp, go } = require('./helpers');

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const data = () => ({ settings: { anthro_profiles: { [alex]: profile('2008-01-01') }, anthro_assessments: { [alex]: [assessment('2026-09-10')] }, anthro_round: { start: '2026-09-01' }, contract: { schedule: [{ id: 's1', day: 'Monday', start: '09:30', end: '10:30', type: 'driving' }], docs: [{ id: 'd1', name: 'Contract (signed copy)', where: 'Private repo futedu/admin/contract/', url: 'https://example.com/a/very/long/link/to/a/document.pdf' }] } } });
const VIEWS = ['dashboard', 'summary', 'compare', 'anthro', `anthro/${alex}`, 'recipes', 'players', 'contract', 'settings', `player/${alex}`];

test('no horizontal overflow in any view', async ({ page }) => {
  await openApp(page, data());
  for (const v of VIEWS) {
    await go(page, v);
    await page.waitForTimeout(150);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(wide, v).toBeLessThanOrEqual(0);
  }
});

test('the scale is fixed and fields are 16 px so phones never zoom in', async ({ page }) => {
  await openApp(page, data());
  expect(await page.evaluate(() => document.querySelector('meta[name=viewport]').content)).toMatch(/maximum-scale=1.*user-scalable=no/);
  for (const v of ['summary', 'anthro', 'settings']) {
    await go(page, v);
    const small = await page.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter(e => e.offsetParent !== null && !['checkbox', 'radio', 'file'].includes(e.type) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.className));
    expect(small, v).toEqual([]);
  }
  await go(page, 'anthro');
  await page.locator('#anTable [data-new]').first().click();
  const small = await page.evaluate(() => [...document.querySelectorAll('.modal-overlay input, .modal-overlay select')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id));
  expect(small).toEqual([]);
});

test('Compare rounds stays inside the screen and its card on a narrow phone, even with a very long player name', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  const rounds = [{ id: 'rS', label: 'September 2026', closed: true, closed_on: '2026-09-30', created_at: '1' }, { id: 'r1', label: 'In progress', closed: false, created_at: '2' }];
  const m = (r, bf) => ({ round_id: r, player_id: alex, measured_on: '2026-09-10', body_fat_percent: bf, weight_kg: 70 });
  await openApp(page, { rounds, measurements: [m('rS', 13), m('r1', 12.4)] });
  await page.evaluate(() => { roster[0].name = 'Zyan Kenichi Kaleihali’aakamu Ha-Ahu'; });
  await go(page, 'compare');
  await expect(page.locator('#cmpTable table')).toBeVisible();
  const r = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, card: document.querySelector('#cmpTable').getBoundingClientRect().right, table: document.querySelector('#cmpTable table').getBoundingClientRect().right }));
  expect(r.page).toBeLessThanOrEqual(0);
  expect(r.table).toBeLessThanOrEqual(r.card);
});

// a real touch swipe through the browser's input pipeline
async function swipe(page, x0, x1, y = 400, y1 = y) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 8, y: y + (y1 - y) * i / 8 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(350);
}

test('swipe right from the left edge opens the menu, swipe left closes it; other gestures do nothing', async ({ page }) => {
  await openApp(page, data());
  const open = () => page.evaluate(() => document.getElementById('sidebar').classList.contains('open'));
  await swipe(page, 4, 40);              // too short
  expect(await open()).toBe(false);
  await swipe(page, 150, 330);           // does not start at the edge
  expect(await open()).toBe(false);
  await swipe(page, 4, 40, 300, 560);    // mostly vertical: it is a scroll
  expect(await open()).toBe(false);
  await swipe(page, 4, 230);             // the real one
  expect(await open()).toBe(true);
  await expect(page.locator('#scrim')).toHaveClass(/open/);
  await swipe(page, 240, 205);           // short drag left: stays open
  expect(await open()).toBe(true);
  await swipe(page, 250, 20);            // swipe left closes
  expect(await open()).toBe(false);
  await expect(page.locator('#scrim')).not.toHaveClass(/open/);
  expect(await page.evaluate(() => document.getElementById('sidebar').style.transform)).toBe('');   // no leftover inline position
});
