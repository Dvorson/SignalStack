import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname);
const e2eDbPath = path.join(repoRoot, '.tmp', 'e2e', 'signalstack.db');
const chromiumAppPath = '/Applications/Chromium.app/Contents/MacOS/Chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    headless: true,
    launchOptions: fs.existsSync(chromiumAppPath)
      ? {
          executablePath: chromiumAppPath,
        }
      : undefined,
  },
  webServer: {
    command: `cd "${repoRoot}" && ./node_modules/.bin/next start -p 3100`,
    cwd: repoRoot,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SIGNALSTACK_DB_PATH: e2eDbPath,
      SIGNALSTACK_MOCK_QUOTES: '1',
    },
  },
});
