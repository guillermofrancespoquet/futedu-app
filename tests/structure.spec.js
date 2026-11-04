const { test, expect } = require('@playwright/test');
const { PLAYER_IDS: [alex, ben], profile, openApp, go } = require('./helpers');

const data = () => ({ settings: { anthro_profiles: { [alex]: profile('2010-03-01', { height: 176 }) }, player_tags: { [alex]: ['U17'] } } });

test('the sidebar is grouped and Compare comes after Anthropometry', async ({ page }) => {
  await openApp(page, data());
  expect(await page.locator('.sidebar .nav > *').allTextContents().then(a => a.map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean)))
    .toEqual(['Overview', 'Dashboard', 'Measurements', 'Bioimpedance 4', 'Anthropometry', 'Compare', 'Library', 'Recipes', 'Admin', 'Players', 'Settings']);
  await expect(page.locator('.brand-sub')).toHaveText('Nutrition');
  await page.click('.nav-item[data-view="players"]');
  await expect(page.locator('#view-players')).toBeVisible();
  await expect(page.locator('.nav-item.active')).toHaveText(/Players/);
});

test('Players page: shared data, search, add, and the admin actions live there', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'players');
  await expect(page.locator('#plTable tr')).toHaveCount(5);   // header + 4 players
  const row = page.locator('#plTable tr', { hasText: 'Alex Testa' });
  await expect(row).toContainText('176 cm');
  await expect(row).toContainText('U17');
  await page.fill('#plSearch', 'carla');
  await expect(page.locator('#plTable tr')).toHaveCount(2);
  await page.fill('#plSearch', '');
  await page.fill('#newPlayerName', 'Eli Nuevo');
  await page.click('#addPlayerBtn');
  await expect(page.locator('#plTable tr', { hasText: 'Eli Nuevo' })).toHaveCount(1);
  await page.locator('#plTable tr', { hasText: 'Eli Nuevo' }).locator('.name-link').click();
  await expect(page.locator('#view-player')).toBeVisible();
  await go(page, 'summary');
  await expect(page.locator('#playerList .rename, #playerList .remove')).toHaveCount(0);   // cards no longer carry admin buttons
});

test('secondary actions sit in a More menu that opens, runs the action and closes', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'summary');
  const menu = page.locator('#view-summary .more-menu');
  await expect(menu).toBeHidden();
  await page.click('#view-summary .more-btn');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Reset check-ins');
  await expect(menu).toContainText('Archive round');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.click('#view-summary .more-btn');
  await page.click('body', { position: { x: 5, y: 5 } });
  await expect(menu).toBeHidden();
  await go(page, 'anthro');
  await page.click('#view-anthro .more-btn');
  await expect(page.locator('#view-anthro .more-menu')).toContainText('Pending list');
  await expect(page.locator('#view-anthro .more-menu')).toContainText('Import past assessments');
});

test('Settings is ordered in labelled sections', async ({ page }) => {
  await openApp(page, data());
  await go(page, 'settings');
  expect(await page.locator('#view-settings .section-label').allTextContents()).toEqual(['Targets', 'Rounds', 'Import', 'Backup and restore', 'This device']);
});

test('sidebar: collapses to icons and remembers it, and finds a player by name', async ({ page }) => {
  await openApp(page, data());
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('#app')).not.toHaveClass(/collapsed/);
  await page.click('#collapseBtn');
  await expect(page.locator('#app')).toHaveClass(/collapsed/);
  expect(await page.evaluate(() => localStorage.getItem('futedu_sidebar_collapsed'))).toBe('1');
  await page.hover('.nav-item[data-view="anthro"]');
  await expect(page.locator('.nav-tip')).toHaveText('Anthropometry');
  await page.click('#collapseBtn');
  await expect(page.locator('#app')).not.toHaveClass(/collapsed/);
  await page.fill('#sideSearch', 'ben');
  await expect(page.locator('#sideResults button')).toHaveText(['Ben Prueba']);
  await page.press('#sideSearch', 'Enter');
  await expect(page.locator('#view-player')).toBeVisible();
  await expect(page.locator('#sideSearch')).toHaveValue('');
});

test('account row in the sidebar opens a menu: email, backup status, Settings, backup and Sign out', async ({ page }) => {
  await openApp(page, data());
  await page.setViewportSize({ width: 1280, height: 800 });
  const menu = page.locator('#userMenu');
  await expect(menu).toBeHidden();
  await page.click('#userBtn');
  await expect(menu).toBeVisible();
  await expect(page.locator('#umEmail')).toHaveText('test@example.com');
  await expect(page.locator('#umBackup')).toContainText('No backup from this device yet');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.click('#userBtn');
  await page.click('.um-item[data-um="settings"]');
  await expect(page.locator('#view-settings')).toBeVisible();
  await expect(menu).toBeHidden();
  await page.click('#userBtn');
  await page.click('body', { position: { x: 600, y: 300 } });
  await expect(menu).toBeHidden();
  // the backup item runs the same export as Settings, and the status then says today
  await page.click('#userBtn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.um-item[data-um="backup"]')]);
  expect(dl.suggestedFilename()).toMatch(/^futedu-backup-.*\.json$/);
  await page.click('#userBtn');
  await expect(page.locator('#umBackup')).toContainText('Last backup: today');
  // sign out
  await page.click('#logoutBtn');
  await expect(page.locator('#app')).toBeHidden();
});
