const { test, expect } = require('@playwright/test');
const { PLAYER_IDS: [alex, ben, carla, dani], assessment, profile, openApp, go, stored } = require('./helpers');

const base = () => ({ settings: {
  anthro_profiles: { [alex]: profile('2010-01-01'), [ben]: profile('2005-06-01'), [carla]: profile('2009-03-01'), [dani]: profile('2009-03-01') },
  anthro_assessments: { [alex]: [assessment('2025-10-05', 0), assessment('2026-03-10', 1), assessment('2026-10-05', 2)], [ben]: [assessment('2026-03-12', 1)] },
  anthro_round: { start: '2026-09-01' },
} });

test('round status: done / pending, filter, counters', async ({ page }) => {
  await openApp(page, base());
  await go(page, 'anthro');
  await expect(page.locator('#anKpis .kpi').first()).toContainText('1 / 4');
  await expect(page.locator('#anTable tr.an-row')).toHaveCount(4);
  await page.click('#anFilter [data-f=pending]');
  await expect(page.locator('#anTable tr.an-row')).toHaveCount(3);
  await page.click('#anFilter [data-f=done]');
  await expect(page.locator('#anTable tr.an-row')).toHaveCount(1);
});

test('new assessment: live preview, Enter moves on, save and next pending player', async ({ page }) => {
  await openApp(page, base());
  await go(page, 'anthro');
  await page.click('#anFilter [data-f=pending]');
  await page.locator('#anTable [data-new]').first().click();
  for (const v of [72, 8, 8, 8, 8, 8, 6, 28, 30, 52, 36]) { await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); }
  await expect(page.locator('#asPreview')).toContainText('11 / 11');
  await expect(page.locator('#asPreview')).toContainText('Σ6 skinfolds');
  await page.click('.modal-ok[data-next="1"]');
  await expect(page.locator('.as-player strong')).not.toHaveText('Ben Prueba');   // moved on to another pending player
  await page.click('.modal-cancel');
  const saved = await stored(page, 'anthro_assessments');
  expect(Object.values(saved).flat().length).toBe(5);
});

test('player page has evolution charts and shows the substantial-change wording', async ({ page }) => {
  await openApp(page, base());
  await go(page, `anthro/${alex}`);
  await expect(page.locator('#view-anthrop .chart-box')).toHaveCount(3);
  await expect(page.locator('#view-anthrop .chart-box').first().locator('.ch-dot')).toHaveCount(3);
  await expect(page.locator('#view-anthrop')).toContainText(/substantial change/i);
});

test('starting a new round keeps the old one in the history', async ({ page }) => {
  await openApp(page, base());
  await go(page, 'anthro');
  await page.click('#anRoundNew');
  await page.fill('#nrStart', '2026-08-01');
  await page.click('.modal-ok');
  await expect(page.locator('#nrNote')).toContainText('after');
  await page.fill('#nrName', 'Semester 1');
  await page.fill('#nrStart', '2026-10-10');
  await page.click('.modal-ok');
  await expect(page.locator('#anHistory')).toContainText('Semester 1');
  expect(await stored(page, 'anthro_round')).toEqual({ start: '2026-10-10', history: [{ name: 'Semester 1', start: '2026-09-01' }] });
});

test('age-group filter uses the shared date of birth', async ({ page }) => {
  await openApp(page, base());
  await go(page, 'anthro');
  await page.selectOption('#anAge', 'U18');
  await expect(page.locator('#anTable tr.an-row .attn-name')).toHaveText(['Alex Testa', 'Carla Ejemplo', 'Dani Muestra']);
  await page.selectOption('#anAge', 'U23');
  await expect(page.locator('#anTable tr.an-row .attn-name')).toHaveText(['Ben Prueba']);
});

test('reports are one A4 page', async ({ page }) => {
  await openApp(page, base());
  const pages = async html => {
    await page.evaluate(h => { document.getElementById('printArea').innerHTML = h; }, html);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  };
  expect(await pages(await page.evaluate(id => anthroReportHtml(id, anList(id).slice(-1)[0].id), alex))).toBe(1);
  expect(await pages(await page.evaluate(() => anRoundReportHtml()))).toBe(1);
  expect(await pages(await page.evaluate(() => anPendingHtml()))).toBe(1);
});

test('the anthropometry player report fits one A4 page even with extra printer margin', async ({ page }) => {
  const dates = ['2024-10-05', '2025-03-10', '2025-10-05', '2026-03-10', '2026-10-05'];
  await openApp(page, { settings: { anthro_profiles: { [alex]: profile('2010-01-01') }, anthro_assessments: { [alex]: dates.map((d, i) => assessment(d, i)) } } });
  await page.setViewportSize({ width: 688, height: 1000 });   // A4 content width, as in the bioimpedance report test
  const html = await page.evaluate(([i, a]) => fitAnthroReport(i, a), [alex, 'a2026-10-05']);
  await page.evaluate(h => { document.getElementById('printArea').innerHTML = h; }, html);
  await page.addStyleTag({ content: '@media print { @page { size:A4; margin:20mm 14mm; } }' });
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
});

test('a previous anthropometry round can be renamed', async ({ page }) => {
  const d = base();
  d.settings.anthro_round = { start: '2026-09-01', history: [{ name: 'Round of March', start: '2026-03-01' }] };
  await openApp(page, d);
  await go(page, 'anthro');
  await page.locator('[data-an-round-rename="2026-03-01"]').click();
  await page.fill('.modal-box input', 'Spring 2026');
  await page.click('.modal-ok');
  await expect(page.locator('#anHistory')).toContainText('Spring 2026');
  expect((await stored(page, 'anthro_round')).history[0].name).toBe('Spring 2026');
});
