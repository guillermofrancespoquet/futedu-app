const { test, expect } = require('@playwright/test');
const { openApp, go, stored } = require('./helpers');

test('Contract sits in the Admin group and opens', async ({ page }) => {
  await openApp(page, {});
  await page.click('.nav-item[data-view="contract"]');
  await expect(page.locator('#view-contract')).toBeVisible();
  await expect(page.locator('.nav-item.active')).toHaveText(/Contract/);
});

test('contracts can be added, edited and removed', async ({ page }) => {
  await openApp(page, {});
  await go(page, 'contract');
  await page.click('#ctAddContract');
  await page.fill('[data-ct-f="contracts"][data-f="hours"]', '12');
  await page.dispatchEvent('[data-ct-f="contracts"][data-f="hours"]', 'change');
  expect((await stored(page, 'contract')).contracts[0]).toMatchObject({ employer: 'FUTEDU', hours: '12' });
  await page.click('[data-ct-del="contracts"]');
  await expect(page.locator('[data-ct-f="contracts"][data-f="hours"]')).toHaveCount(0);
});

test('payments received are logged and totalled', async ({ page }) => {
  await openApp(page, { settings: { contract: { payments: [{ id: 'p1', date: '2026-10-31', concept: 'Test payslip', gross: 83.23, net: 76.17 }] } } });
  await go(page, 'contract');
  await expect(page.locator('#contractRoot')).toContainText('Total received: 76.17 € net');
  await page.click('#ctAddPay');
  await page.locator('[data-ct-f="payments"][data-f="net"]').last().fill("10");
  await page.locator('[data-ct-f="payments"][data-f="net"]').last().dispatchEvent('change');
  await expect(page.locator('#contractRoot')).toContainText('Total received: 86.17 € net');
});
