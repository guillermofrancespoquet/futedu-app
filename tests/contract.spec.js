const { test, expect } = require('@playwright/test');
const { openApp, go, stored } = require('./helpers');

// made-up schedule: driving 09:30-10:30 and 13:30-14:30 Mon-Fri, plus Monday and Friday 11:30-12:30
const slot = (id, day, start, end, type = 'driving') => ({ id, day, start, end, type });
const SCHED = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d, i) => slot('s' + i, d, '09:30', '10:30'))
  .concat(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d, i) => slot('a' + i, d, '13:30', '14:30')))
  .concat([slot('m1', 'Monday', '11:30', '12:30'), slot('m2', 'Friday', '11:30', '12:30')]);
const data = (extra = {}) => ({ settings: { contract: { summary: { rate: 10, fixed: 240 }, schedule: SCHED, ...extra } } });

test('Contract sits in the Admin group and the page opens', async ({ page }) => {
  await openApp(page, data());
  await page.click('.nav-item[data-view="contract"]');
  await expect(page.locator('#view-contract')).toBeVisible();
  await expect(page.locator('.nav-item.active')).toHaveText(/Contract/);
  await expect(page.locator('#contractRoot')).toContainText('not legal advice');
});

test('expected driving hours come from the schedule and the days off', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'contract');
  await page.fill('#ctMonth', '2026-11');
  await page.dispatchEvent('#ctMonth', 'change');
  await expect(page.locator('#contractRoot')).toContainText('Expected driving this month: 51 h');   // 21 weekdays x 2 h, plus 5 Mondays and 4 Fridays
  await page.fill('#ctOff', '2026-11-02, 2026-11-03');
  await page.dispatchEvent('#ctOff', 'change');
  await expect(page.locator('#contractRoot')).toContainText('Expected driving this month: 46 h');
  expect((await stored(page, 'contract')).months['2026-11'].off).toEqual(['2026-11-02', '2026-11-03']);
});

test('checklist answers and summary are saved in the settings table', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'contract');
  await page.selectOption('[data-ct-check="trial"]', 'ask');
  await page.fill('[data-ct-note="trial"]', 'Which length?');
  await page.dispatchEvent('[data-ct-note="trial"]', 'change');
  await page.fill('#ct_employer', 'Test Club');
  await page.dispatchEvent('#ct_employer', 'change');
  const c = await stored(page, 'contract');
  expect(c.checklist.trial).toEqual({ status: 'ask', note: 'Which length?' });
  expect(c.summary.employer).toBe('Test Club');
  expect(c.schedule).toHaveLength(12);
  await expect(page.locator('#contractRoot .section-label', { hasText: 'Review checklist' })).toContainText('to ask or negotiate');
});

test('key dates show a countdown and a Dashboard banner when close', async ({ page }) => {
  const soon = new Date(new Date('2026-10-15T10:00:00').getTime() + 5 * 86400000).toISOString().slice(0, 10);
  await openApp(page, data({ keyDates: [{ id: 'k1', label: 'End of trial', date: soon, note: '' }] }));
  await expect(page.locator('#dashBanners')).toContainText('End of trial');
  await page.click('#dashBanners [data-goto-contract]');
  await expect(page.locator('#view-contract')).toBeVisible();
  await expect(page.locator('[data-ct-row="k1"]')).toContainText('5 d');
});

test('slots and documents can be added and removed', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'contract');
  await page.click('#ctAddDoc');
  await expect(page.locator('[data-ct-f="docs"][data-f="name"]')).toHaveCount(1);
  await page.click('[data-ct-del="docs"]');
  await expect(page.locator('[data-ct-f="docs"][data-f="name"]')).toHaveCount(0);
  await page.click('[data-ct-del="schedule"] >> nth=0');
  expect((await stored(page, 'contract')).schedule).toHaveLength(11);
});
