// playwright.config.js
require('dotenv').config();
const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'off',
    baseURL: process.env.BASE_URL,
  },

  // Projects = browser + device combinations
  // Each test runs in EVERY project (use --project flag to filter)
  projects: [
    {
      name: 'chrome-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'pixel-mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 15 Pro'],
      },
    },
  ],
};

module.exports = config;
