import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:     './e2e/tests',
  fullyParallel: true,
  forbidOnly:  !!process.env.CI,
  retries:     process.env.CI ? 2 : 0,
  workers:     process.env.CI ? 1 : undefined,
  reporter:    [['html', { outputFolder: 'e2e/report' }], ['list']],
  timeout:     30_000,
  expect:      { timeout: 8_000 },

  use: {
    baseURL:        process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace:          'on-first-retry',
    screenshot:     'only-on-failure',
    video:          'on-first-retry',
    actionTimeout:  8_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // Setup — creates test user and seeds data once
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name:         'chromium',
      use:          { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name:         'firefox',
      use:          { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name:         'mobile-chrome',
      use:          { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],

  // Start the Vite dev server before tests
  webServer: [
    {
      command:            'npm run dev',
      url:                'http://localhost:5173',
      reuseExistingServer:!process.env.CI,
      timeout:            60_000,
    },
    {
      command:            'npm --prefix ../ledger-backend run dev',
      url:                'http://localhost:3001/health',
      reuseExistingServer:!process.env.CI,
      timeout:            30_000,
    },
  ],
});
