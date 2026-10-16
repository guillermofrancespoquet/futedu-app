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

test('imported reports go into the round that matches their date, and can save height and sex to the player data', async ({ page }) => {
  await openApp(page, { rounds: [{ id: 'rS', label: 'September 2026', closed: true, closed_on: '2026-09-30', created_at: '1' }, { id: 'r1', label: 'In progress', closed: false, created_at: '2' }] });
  const result = await page.evaluate(async () => {
    const rec = (name, date) => ({ label: name + '.png', text: '', parsed: { format: 'full', name, date, height_cm: 180, sex: 'Male', age: 19, values: { weight_kg: 70, body_fat_percent: 12 }, calculated: [], notes: [] } });
    const pr = reviewImport([rec('Alex Testa', '2026-09-02'), rec('Ben Prueba', '2026-10-10')]);
    await new Promise(r => setTimeout(r, 100));
    const picked = [...document.querySelectorAll('.imp-round')].map(s => s.value);
    document.querySelector('.imp-card[data-i="1"] .imp-date').value = '2026-09-05';
    document.querySelector('.imp-card[data-i="1"] .imp-date').dispatchEvent(new Event('change', { bubbles: true }));
    const afterDateChange = document.querySelector('.imp-card[data-i="1"] .imp-round').value;
    document.querySelector('.modal-ok').click();
    const out = await pr;
    return { picked, afterDateChange, rows: out.rows.map(r => [r.player_id, r.round_id]), profiles: out.profiles };
  });
  expect(result.picked).toEqual(['rS', 'r1']);           // September report -> September round, October report -> current round
  expect(result.afterDateChange).toBe('rS');              // changing the date re-picks the round
  expect(result.rows).toEqual([['alex-testa', 'rS'], ['ben-prueba', 'rS']]);
  expect(result.profiles['alex-testa']).toMatchObject({ height: 180, sex: 'Male', fixedDate: '2026-09-02' });
});

test('the player report stays on one A4 page even when the printer takes extra margin, with the footer at the bottom', async ({ page }) => {
  const id = 'alex-testa';
  const rounds = Array.from({ length: 8 }, (_, i) => ({ id: 'r' + i, label: i === 7 ? 'In progress' : 'Month ' + (i + 1), closed: i < 7, closed_on: '2026-0' + (i + 1) + '-28', created_at: '2026-0' + (i + 1) + '-01T00:00:00Z' }));
  const measurements = rounds.map((r, i) => ({ round_id: r.id, player_id: id, measured_on: '2026-0' + (i + 1) + '-05', body_fat_percent: 11 + i * 0.3, subcutaneous_fat_percent: 9, total_body_water_percent: 63, bmi: 22.5, fat_free_mass_kg: 60 + i, visceral_fat: 6, skeletal_muscle_mass_kg: 39, weight_kg: 68 + i }));
  const note = (n, t) => ({ id: 'n' + n, note: t, noted_on: '2026-09-1' + n });
  await openApp(page, { rounds, measurements, settings: { player_notes: { [id]: [note(1, 'Minor knee complaint, physio check done. Continue with the reduced load until the next review and keep an eye on hydration during long sessions.'), note(2, 'Allergic to tree nuts: confirmed by the family.'), note(3, 'Sleeps little before away games; talk to the family about the evening routine.')] } } });
  await page.setViewportSize({ width: 688, height: 1000 });   // A4 content width, so the fitting measures what the printer will lay out
  const html = await page.evaluate(i => fitPlayerReport(i, true), id);
  await page.evaluate(h => { document.getElementById('printArea').innerHTML = h; }, html);
  await page.addStyleTag({ content: '@media print { @page { size:A4; margin:20mm 14mm; } }' });   // a printer or phone that adds more margin than the 14 mm we ask for
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
});
