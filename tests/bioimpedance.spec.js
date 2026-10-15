const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { PLAYER_IDS: [alex, ben, carla], profile, openApp, go, stored } = require('./helpers');

const reading = (round, id, extra = {}) => ({ round_id: round, player_id: id, measured_on: '2026-09-02', body_fat_percent: 13, weight_kg: 86, visceral_fat: null, skeletal_muscle_mass_kg: null, ...extra });
const twoRounds = () => ({
  rounds: [{ id: 'rS', label: 'September 2026', closed: true, closed_on: '2026-09-30', created_at: '1' }, { id: 'r1', label: 'In progress', closed: false, created_at: '2' }],
  measurements: [reading('rS', alex), reading('r1', carla, { measured_on: '2026-10-10', body_fat_percent: 9.9, visceral_fat: 3, skeletal_muscle_mass_kg: 40, weight_kg: 70 })],
});
const csvFile = text => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'futedu-')), 'import.csv'); fs.writeFileSync(f, text); return f; };
const CSV = 'player,date,body_fat_percent,visceral_fat,skeletal_muscle_mass_kg,weight_kg,balance_upper\n'
  + `${alex},2026-09-02,13.6,8,48.1,86.25,slight\n${ben},2026-09-03,12.2,6,38.9,68.6,slight\nnobody,2026-09-03,1,1,1,1,\n`;
const rows = (page, round) => page.evaluate(r => window.__T.measurements.filter(m => m.round_id === r).map(m => [m.player_id, m.body_fat_percent, m.visceral_fat, m.weight_kg]), round);

test('CSV import into a previous round only fills empty values and leaves the current round alone', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, 'settings');
  await page.setInputFiles('#csvFile', csvFile(CSV));
  await expect(page.locator('.modal-box p')).toContainText('2 player(s) found');
  await page.selectOption('#itRound', 'rS');
  await page.click('.modal-ok');
  await expect.poll(() => rows(page, 'rS')).toEqual([[alex, 13, 8, 86], [ben, 12.2, 6, 68.6]]);   // stored 13 and 86 kept, missing values added
  expect(await rows(page, 'r1')).toEqual([[carla, 9.9, 3, 70]]);
});

test('CSV import without "only fill empty" overwrites', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, 'settings');
  await page.setInputFiles('#csvFile', csvFile(CSV));
  await page.selectOption('#itRound', 'rS');
  await page.uncheck('#itFill');
  await page.click('.modal-ok');
  await expect.poll(() => rows(page, 'rS')).toEqual([[alex, 13.6, 8, 86.25], [ben, 12.2, 6, 68.6]]);
});

test('player data is shared with anthropometry and edits keep the rest of the profile', async ({ page }) => {
  await openApp(page, { ...twoRounds(), settings: { anthro_profiles: { [alex]: profile('2008-02-14') } } });
  await go(page, `player/${alex}`);
  await expect(page.locator('#pfData').locator('xpath=ancestor::div[contains(@class,"card")]')).toContainText('February 14, 2008');
  await page.click('#pfData');
  await page.fill('#sdHeight', '176');
  await page.click('.modal-ok');
  await expect.poll(async () => (await stored(page, 'anthro_profiles'))[alex]).toMatchObject({ dob: '2008-02-14', ethnicity: 'Caucasian', sitting: 90, height: 176 });
  // a player without a profile can get one from bioimpedance, and anthropometry shows it
  await go(page, `player/${ben}`);
  await page.click('#pfData');
  await page.fill('#sdDob', '2008-05-20');
  await page.selectOption('#sdSex', 'Male');
  await page.click('.modal-ok');
  await go(page, `anthro/${ben}`);
  await expect(page.locator('#view-anthrop .sub')).toContainText('Born May 20, 2008');
});

test('age-group filter in the bioimpedance list', async ({ page }) => {
  await openApp(page, { ...twoRounds(), settings: { anthro_profiles: { [alex]: profile('2010-03-01'), [ben]: profile('2006-06-01') } } });
  await go(page, 'summary');
  await page.selectOption('#ageSel', 'U18');
  await expect(page.locator('#playerList .player-name')).toHaveText(['Alex Testa']);
  await page.selectOption('#ageSel', 'nodob');
  await expect(page.locator('#playerList .player-name')).toHaveText(['Carla Ejemplo', 'Dani Muestra']);
});

test('full backup counts everything saved', async ({ page }) => {
  await openApp(page, { ...twoRounds(), settings: { anthro_assessments: { [alex]: [{ id: 'x', date: '2026-03-10', raw: {}, fixed: {} }] }, anthro_profiles: { [alex]: profile('2008-01-01') } } });
  await go(page, 'settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportHistoryBtn')]);
  expect(dl.suggestedFilename()).toMatch(/^futedu-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  expect(data.meta.counts).toMatchObject({ players: 4, measurements: 2, anthropometry_assessments: 1, anthropometry_profiles: 1 });
});
