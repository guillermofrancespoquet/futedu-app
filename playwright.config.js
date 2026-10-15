// Tests open index.html straight from disk with a mocked Supabase client: no backend, no network, no real data.
// Locally you can point to an installed Chromium with CHROMIUM_PATH=/path/to/chromium npm test
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: 'list',
  use: { launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} },
});
