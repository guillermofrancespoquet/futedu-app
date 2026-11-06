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

test('payslip text is read into period end, gross and net (made-up figures)', async ({ page }) => {
  await openApp(page, {});
  await go(page, 'contract');
  await expect(page.locator('#ctImportPay')).toBeVisible();
  const lines = [
    'EMPRESA N.I.F. INSCRIPCIÓN S.S.', 'TEST SL', 'PERIODO DÍAS',
    '01 de septiembre a 30 de septiembre de 2026 30',
    'REMUNERACIÓN PRORRATA BASE C.C. BASE C.P. BASE I.R.P.F. DEVENGADO DEDUCCIONES',
    '1.086,23 1.086,23 1.086,23 1.086,23 1.086,23 107,33',
    'LÍQUIDO A PERCIBIR', '978,90'];
  const r = await page.evaluate(l => parsePayslipLines(l), lines);
  expect(r).toEqual({ date: '2026-09-30', concept: 'Payslip September 2026', gross: 1086.23, net: 978.9 });
  const part = await page.evaluate(() => parsePayslipLines(['26 de agosto a 31 de agosto de 2026 6']));
  expect(part).toMatchObject({ date: '2026-08-31', gross: null, net: null });
});
