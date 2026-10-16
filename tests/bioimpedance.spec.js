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

test('a measurement can be deleted from the player page', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, `player/${alex}`);
  await page.click('[data-del-reading="rS"]');
  await page.click('.modal-ok');
  await expect.poll(() => rows(page, 'rS')).toEqual([]);
  expect(await rows(page, 'r1')).toEqual([[carla, 9.9, 3, 70]]);   // other players and rounds are untouched
  await expect(page.locator('#view-player')).toContainText('No measurements yet');
});

test('a measurement can be edited and moved to another round from the player page', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, `player/${alex}`);
  await page.click('[data-edit-reading="rS"]');
  await page.fill('[data-k="visceral_fat"]', '8');
  await page.fill('[data-k="skeletal_muscle_mass_kg"]', '48.1');
  await page.click('.modal-ok');
  await expect.poll(() => rows(page, 'rS')).toEqual([[alex, 13, 8, 86]]);
  // move it to the current round
  await page.click('[data-edit-reading="rS"]');
  await page.selectOption('#erRound', 'r1');
  await page.click('.modal-ok');
  await expect.poll(() => rows(page, 'rS')).toEqual([]);
  expect((await rows(page, 'r1')).map(r => r[0]).sort()).toEqual([alex, carla].sort());
});

test('latest line says when the current round has no measurement yet, and flags a reading filed in the wrong round', async ({ page }) => {
  const d = twoRounds();
  d.rounds[1].created_at = '2026-10-01T00:00:00Z';
  d.rounds[0].created_at = '2026-09-01T00:00:00Z';
  d.measurements.push({ round_id: 'r1', player_id: ben, measured_on: '2026-09-03', body_fat_percent: 12 });   // a September report saved in the October round
  await openApp(page, d);
  await go(page, `player/${alex}`);
  await expect(page.locator('#view-player .sub')).toContainText('not measured in');
  await go(page, `player/${ben}`);
  await expect(page.locator('#view-player .sub')).toContainText('check round');
});

test('rounds are shown oldest to newest with the open round last, whatever order they come from the database in', async ({ page }) => {
  const d = twoRounds();
  d.rounds = [{ id: 'r1', label: 'In progress', closed: false, created_at: '2026-08-01T00:00:00Z' }, { id: 'rS', label: 'September 2026', closed: true, closed_on: '2026-09-30', created_at: '2026-09-01T00:00:00Z' }];   // the open round was created first
  d.measurements = [reading('rS', alex), reading('r1', alex, { measured_on: '2026-10-12', body_fat_percent: 14 })];
  await openApp(page, d);
  await go(page, `player/${alex}`);
  expect(await page.evaluate(id => seriesFor(id).map(x => x.label), alex)).toEqual(['September 2026', 'Current']);
  await expect(page.locator('#view-player .sub')).toContainText('Latest: Current');
  await expect(page.locator('#view-player .kpi').first()).toContainText('vs September 2026');   // compared with the previous round, not the other way round
  const first = await page.locator('#view-player table tr').nth(1).textContent();
  expect(first).toContain('Current');                                                              // history table: newest first
});

test('restore from a JSON backup adds what is missing and never deletes or overwrites by default', async ({ page }) => {
  await openApp(page, { ...twoRounds(), settings: { player_notes: { [alex]: [{ id: 'n1', text: 'kept' }] } } });
  await go(page, 'settings');
  const backup = {
    meta: { app: 'futedu-tracker', exported_on: '2026-10-01', counts: {} },
    players: [{ id: 'old-kid', name: 'Eli Antiguo', active: true }],
    rounds: [{ id: 'rS', label: 'September 2026', closed: true, closed_on: '2026-09-30', created_at: '1' }],
    measurements: [reading('rS', alex, { weight_kg: 99 }), reading('rS', ben)],
    settings: [{ key: 'player_notes', value: { [ben]: [{ id: 'n2', text: 'restored' }] } }, { key: 'anthro_profiles', value: { [ben]: { dob: '2008-01-01' } } }],
  };
  const file = csvFile(JSON.stringify(backup)).replace(/\.csv$/, '.json');
  require('fs').writeFileSync(file, JSON.stringify(backup));
  await page.setInputFiles('#restoreFile', file);
  await expect(page.locator('.modal-box p')).toContainText('Backup from 2026-10-01');
  await page.click('.modal-ok');
  await expect.poll(() => page.evaluate(() => window.__T.players.some(p => p.name === 'Eli Antiguo'))).toBe(true);
  expect(await rows(page, 'rS')).toEqual([[alex, 13, null, 86], [ben, 13, null, 86]]);   // alex untouched (86, not 99), ben added
  const notes = await stored(page, 'player_notes');
  expect(Object.keys(notes).sort()).toEqual([alex, ben].sort());
  expect(notes[alex][0].text).toBe('kept');
  expect((await stored(page, 'anthro_profiles'))[ben].dob).toBe('2008-01-01');
});

test('restore refuses a file that is not a FUTEDU backup', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, 'settings');
  const f = csvFile('{"hello":1}').replace(/\.csv$/, '.json');
  require('fs').writeFileSync(f, '{"hello":1}');
  await page.setInputFiles('#restoreFile', f);
  await expect(page.locator('.modal-box')).toHaveCount(0);
  await expect(page.locator('#toast, .toast').first()).toContainText('FUTEDU backup');
});

test('clicking a player name (card, avatar or quick entry) opens the player page', async ({ page }) => {
  await openApp(page, twoRounds());
  await go(page, 'summary');
  await expect(page.locator('#playerList button', { hasText: /^Profile$/ })).toHaveCount(0);
  await page.locator('#playerList .name-link', { hasText: 'Alex Testa' }).click();
  await expect(page.locator('#view-player')).toBeVisible();
  await go(page, 'summary');
  await page.locator('#playerList .avatar.profile').first().click();
  await expect(page.locator('#view-player')).toBeVisible();
  await go(page, 'summary');
  await page.click('#modeSeg button[data-mode="table"]');
  await page.locator('#quickEntry .name-link', { hasText: 'Ben Prueba' }).click();
  await expect(page.locator('#view-player')).toBeVisible();
});
