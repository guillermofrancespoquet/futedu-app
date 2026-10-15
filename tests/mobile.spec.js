const { test, expect } = require('@playwright/test');
const { PLAYER_IDS: [alex], assessment, profile, openApp, go } = require('./helpers');

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const data = () => ({ settings: { anthro_profiles: { [alex]: profile('2008-01-01') }, anthro_assessments: { [alex]: [assessment('2026-09-10')] }, anthro_round: { start: '2026-09-01' } } });
const VIEWS = ['dashboard', 'summary', 'compare', 'anthro', `anthro/${alex}`, 'recipes', 'settings', `player/${alex}`];

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
