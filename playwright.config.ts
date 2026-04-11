import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname);
const e2ePort = 3101;
const e2eDbPath = path.join(repoRoot, '.tmp', 'playwright', 'signalstack.db');
const chromiumAppPath = '/Applications/Chromium.app/Contents/MacOS/Chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry',
    headless: true,
    launchOptions: fs.existsSync(chromiumAppPath)
      ? {
          executablePath: chromiumAppPath,
        }
      : undefined,
  },
  webServer: {
    command: `cd "${repoRoot}" && ./node_modules/.bin/next start -p ${e2ePort}`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      SIGNALSTACK_DB_PATH: e2eDbPath,
      SIGNALSTACK_MOCK_QUOTES: '1',
    },
  },
});
