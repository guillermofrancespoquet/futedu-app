// Shared test setup: opens index.html from disk with a mocked Supabase client and made-up players.
// Never put real names or measurements in the tests: this repository is public.
const path = require('path');
const { pathToFileURL } = require('url');

const NAMES = ['Alex Testa', 'Ben Prueba', 'Carla Ejemplo', 'Dani Muestra'];
const ID = n => n.toLowerCase().replace(/ /g, '-');
const PLAYER_IDS = NAMES.map(ID);

// one assessment with plausible readings; k shifts the numbers a little so successive assessments differ
const assessment = (date, k = 0) => ({
  id: 'a' + date, date,
  raw: { mass: [70 + k], sf_triceps: [8 - k / 2], sf_subscapular: [8], sf_supraspinal: [8], sf_abdominal: [8], sf_thigh: [8], sf_calf: [6],
    gr_armRelaxed: [28], gr_armFlexed: [30], gr_thigh: [52], gr_calf: [36] },
  fixed: { height: 175, sitting: 90, span: 178 },
});
const profile = (dob, extra = {}) => ({ dob, sex: 'Male', ethnicity: 'Caucasian', height: 175, sitting: 90, span: 178, ...extra });

// data = { settings: {key: value}, measurements: [...], rounds: [...] }
async function openApp(page, data = {}, opts = {}) {
  const T = {
    players: NAMES.map(n => ({ id: ID(n), name: n, active: true, health_note: null })),
    rounds: data.rounds || [{ id: 'r1', label: 'In progress', closed: false, created_at: '1' }],
    measurements: data.measurements || [],
    settings: Object.entries(data.settings || {}).map(([key, value]) => ({ key, value })),
  };
  await page.addInitScript(T => {
    window.__T = T;
    const q = t => {
      const o = { _eq: {}, _del: false,
        then: f => {
          if (o._del) { if (t === 'measurements') T.measurements = T.measurements.filter(m => !Object.entries(o._eq).every(([c, v]) => m[c] === v)); return f({ data: null, error: null }); }
          if (o._patch && t === 'rounds') { T.rounds.filter(x => Object.entries(o._eq).every(([c, v]) => x[c] === v)).forEach(x => Object.assign(x, o._patch)); return f({ data: null, error: null }); }
          return f({ data: (t === 'settings' && o._eq.key) ? T.settings.filter(x => x.key === o._eq.key) : (T[t] || []), error: null });
        },
        eq: (c, v) => { o._eq[c] = v; return o; }, like: () => o, order: () => o, select: () => o, insert: () => o, update: p => { o._patch = p; return o; }, single: () => o,
        delete: () => { o._del = true; return o; },
        upsert: r => {
          (Array.isArray(r) ? r : [r]).forEach(x => {
            if (t === 'settings') { const i = T.settings.findIndex(y => y.key === x.key); if (i >= 0) T.settings[i] = x; else T.settings.push(x); }
            else if (t === 'players' || t === 'rounds') { const i = T[t].findIndex(y => y.id === x.id); if (i >= 0) T[t][i] = { ...T[t][i], ...x }; else T[t].push(x); }
            else if (t === 'measurements') { const i = T.measurements.findIndex(y => y.round_id === x.round_id && y.player_id === x.player_id); if (i >= 0) T.measurements[i] = { ...T.measurements[i], ...x }; else T.measurements.push(x); }
          });
          return o;
        } };
      return o;
    };
    window.supabase = { createClient: () => ({ from: q, auth: { getSession: async () => ({ data: { session: { user: { email: 'test@example.com' } } } }), signOut: async () => {} } }) };
  }, T);
  // the real Supabase client is a CDN script: serve an empty one so the mock above stays in place
  await page.route('**/@supabase/supabase-js@**', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.clock.setFixedTime(new Date(opts.now || '2026-10-15T10:00:00'));
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
  await page.waitForFunction(() => typeof navigate === 'function' && document.querySelector('#app') && !document.querySelector('#app').classList.contains('hidden'));
}
const go = (page, route) => page.evaluate(r => navigate(r), route);
const stored = (page, key) => page.evaluate(k => { const r = window.__T.settings.find(s => s.key === k); return r ? r.value : undefined; }, key);

module.exports = { NAMES, ID, PLAYER_IDS, assessment, profile, openApp, go, stored };
