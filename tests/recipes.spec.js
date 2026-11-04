const { test, expect } = require('@playwright/test');
const { openApp, go } = require('./helpers');

const f = (slug, kind, label, name) => ({ name, kind, kindLabel: label, label, path: `library/recipes/${slug}/${name}` });
const LIB = {
  sessions: [{ name: 'kickoff.md', kind: 'session', kindLabel: 'Session guide', label: 'Kickoff session', path: 'library/sessions/kickoff.md' }],
  recipes: [
    { slug: 'oats', title: 'Overnight Oats: Pre-Workout Breakfast', session: 1, status: 'cooked', files: [f('oats', 'card', 'Recipe card', 'oats.pdf'), f('oats', 'session', 'Session guide', 'oats-session.md')] },
    { slug: 'granola', title: 'Granola: Batch Snack', session: 2, status: 'cooked', files: [f('granola', 'card', 'Recipe card', 'granola.pdf')] },
    { slug: 'bark', title: 'Frozen Yogurt Bark: Snack', session: 5, status: 'next', files: [f('bark', 'card', 'Recipe card', 'bark.pdf')] },
    { slug: 'bowl', title: 'Chickpea Bowl: Lunch', session: null, status: 'idea', files: [f('bowl', 'card', 'Recipe card', 'bowl.pdf')] },
  ],
};
const setup = async page => {
  await openApp(page, {});
  await page.evaluate(lib => {
    rcData = lib;
    window.__saved = [];
    const real = window.fetch;
    window.fetch = (u, o) => String(u).startsWith('library/') && !String(u).endsWith('index.json') ? Promise.resolve(new Response(new Blob(['%PDF-1.4 test'], { type: String(u).endsWith('.md') ? 'text/markdown' : 'application/pdf' }))) : real(u, o);
  }, LIB);
  await go(page, 'recipes');
};

test('recipes appear in workshop order, grouped by status, with a filter', async ({ page }) => {
  await setup(page);
  expect(await page.locator('#rcBody .rc-head-sec').allTextContents()).toEqual(['General sessions', 'Coming up1', 'Cooked in the workshops2', 'Not cooked yet1']);
  expect(await page.locator('#rcBody .rc-card h2').allTextContents()).toEqual(['Frozen Yogurt Bark', 'Overnight Oats', 'Granola', 'Chickpea Bowl']);   // coming up, then cooked in session order, then ideas
  await expect(page.locator('.rc-badge').first()).toHaveText('Session 5');
  await expect(page.locator('.rc-status.next')).toHaveText('Next up');
  await page.click('#rcFilter [data-f="cooked"]');
  expect(await page.locator('#rcBody .rc-card h2').allTextContents()).toEqual(['Overnight Oats', 'Granola']);
  await page.click('#rcFilter [data-f="ideas"]');
  expect(await page.locator('#rcBody .rc-card h2').allTextContents()).toEqual(['Chickpea Bowl']);
  await page.click('#rcFilter [data-f="all"]');
  await page.fill('#rcSearch', 'granola');
  expect(await page.locator('#rcBody .rc-card h2').allTextContents()).toEqual(['Granola']);
});

test('Download saves the file (a normal download on a computer)', async ({ page }) => {
  await setup(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.rc-file', { hasText: 'Recipe card' }).first().locator('[data-save]').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('Download goes through the share sheet (Save to Files) and the page does not overflow', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => {
      navigator.canShare = () => true;
      navigator.share = async data => { window.__saved.push(data.files[0].name + ':' + data.files[0].type); };
    });
    await page.locator('.rc-file', { hasText: 'Recipe card' }).first().locator('[data-save]').click();
    await expect.poll(() => page.evaluate(() => window.__saved)).toEqual(['bark.pdf:application/pdf']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // cancelling the share sheet is not an error
    await page.evaluate(() => { navigator.share = async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; }; });
    await page.locator('.rc-file', { hasText: 'Recipe card' }).first().locator('[data-save]').click();
    await expect(page.locator('.toast.error, .toast.err')).toHaveCount(0);
  });
});

test('the session guide opens in a reader with a working Download .md', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => { window.fetch = () => Promise.resolve(new Response('# Title\n\nHello **world**', { headers: { 'content-type': 'text/markdown' } })); });
  await page.locator('[data-guide]').first().click();
  await expect(page.locator('.md h1')).toHaveText('Title');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-save-md]')]);
  expect(dl.suggestedFilename()).toMatch(/\.md$/);
});
