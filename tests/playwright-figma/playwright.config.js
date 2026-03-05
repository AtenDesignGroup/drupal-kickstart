// playwright.config.js
//
// Playwright configuration for Figma regression testing.
//
// Key settings:
// - testMatch: only picks up figma_regression.spec.js
// - snapshotPathTemplate: points directly at tests/figma-baselines/{name}.png
//   No {projectName} or {platform} suffix — Figma-exported PNGs are the same
//   regardless of OS, so the same baseline works on macOS (local) and Linux (CI)
// - Single project: chrome-desktop (Figma frames target a specific viewport)
//
// Usage:
//   npm test                — compare live site vs Figma baselines
//   npm run figma:pull      — refresh baselines from Figma before running
//   npm run test:report     — open the HTML report with slider/diff UI
require('dotenv').config({ quiet: true });
const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  testMatch: ['**/figma_regression.spec.js'],

  // Snapshot files resolve to tests/figma-baselines/{name}.png —
  // exactly where figma-pull.js saves them.
  snapshotPathTemplate: '{testDir}/figma-baselines/{arg}{ext}',

  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'off',
    baseURL: process.env.BASE_URL,
  },
  projects: [
    {
      name: 'chrome-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
};

module.exports = config;
