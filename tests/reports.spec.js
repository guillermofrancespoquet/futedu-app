// Reading of Arboleaf reports: the text rules and the check-box reader. The OCR itself needs the browser libraries and real report
// images (which hold health data of minors), so it is checked by hand, never with files in this repository.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

// what the reader produces for a simplified (under-18) screenshot with the phone set to Spanish: decimal commas
const SIMPLE = ['Test Player', '02/09/2026', '2', '68,3x,', 'Sufficient', '68,3kg', 'Sufficient', 'Weight', '11,1%', '%', 'Sufficient', 'Body Fat', '22,3', 'BMI', 'Sufficient', 'BMI',
  '1682kcal', 'Sufficient', 'BMR', '60, 7kg', 'Ay', 'Sufficient', 'Fat-free Body Weight', '9,5%', 'Sufficient', 'Subcutaneous Fat Percentage', '64,2%', 'Sufficient', 'Body Water', 'Normal', 'Body Type', '18', 'Insufficient', 'Metabolic Age'].join('\n');

test('simplified report with decimal commas keeps the decimals', async ({ page }) => {
  await openApp(page);
  const p = await page.evaluate(t => parseBioText(t), SIMPLE);
  expect(p.format).toBe('summary');
  expect(p.name).toBe('Test Player');
  expect(p.date).toBe('2026-09-02');
  expect(p.values).toMatchObject({ weight_kg: 68.3, body_fat_percent: 11.1, bmi: 22.3, bmr: 1682, fat_free_mass_kg: 60.7, subcutaneous_fat_percent: 9.5, total_body_water_percent: 64.2 });
});

test('full report header: name, height, age, sex and date (even with a stray character after the height)', async ({ page }) => {
  await openApp(page);
  const p = await page.evaluate(t => parseBioText(t), 'Gender:Male\n\n02/09/2026 11:30\n\nID:Test Player\n\nHeight:169¢cm\n\nAge:22\n\nBody Composition Analysis');
  expect(p).toMatchObject({ format: 'full', name: 'Test Player', height_cm: 169, age: 22, sex: 'Male', date: '2026-09-02' });
});

test('player matching tolerates a small spelling difference but not an ambiguous one', async ({ page }) => {
  await openApp(page);
  const m = n => page.evaluate(n => { const id = matchPlayer(n); const p = roster.find(x => x.id === id); return p ? p.name : null; }, n);
  expect(await m('Carla Ejemplo')).toBe('Carla Ejemplo');
  expect(await m('Karla Ejemplo')).toBe('Carla Ejemplo');       // one letter different
  expect(await m('Ben Prueba')).toBe('Ben Prueba');
  expect(await m('Completely Different')).toBeNull();
});

test('muscle-balance check boxes: the ticked one is found', async ({ page }) => {
  await openApp(page);
  // draws three blue boxes like the report does (geometry as fractions of the area) with a tick in box n
  const read = n => page.evaluate(n => {
    const W = 468, H = 83, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgb(50,150,230)'; ctx.lineWidth = 3;
    [21, 165, 312].forEach((x, i) => {
      ctx.strokeRect(x + 1.5, 18.5, 25, 25);
      if (i === n) { ctx.beginPath(); ctx.moveTo(x + 6, 31); ctx.lineTo(x + 12, 38); ctx.lineTo(x + 23, 24); ctx.stroke(); }
    });
    return readBalanceRow(c, [0, 0, 1, 1]);
  }, n);
  expect(await read(0)).toBe('balanced');
  expect(await read(1)).toBe('slight');
  expect(await read(2)).toBe('severe');
  expect(await read(-1)).toBeNull();
});
