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
      name: 'e2e-setup',
      testMatch: '**/e2e/auth.setup.ts',
      teardown: 'e2e-teardown',
    },
    {
      name: 'e2e-teardown',
      testMatch: '**/e2e/auth.teardown.ts',
    },
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.spec.*',
      dependencies: ['e2e-setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'a11y',
      testMatch: '**/a11y/**/*.spec.*',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    { 
      name: 'vrt-chrome-desktop',            
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Desktop Chrome'] } 
    },
    { 
      name: 'vrt-edge-desktop',              
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Desktop Edge'] } 
    },
    { 
      name: 'vrt-safari-desktop',            
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Desktop Safari'] } 
    },
    { 
      name: 'vrt-firefox-desktop',           
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Desktop Firefox'] } 
    },
    { 
      name: 'vrt-iphone-modern',             
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['iPhone 16'] } 
    },
    { 
      name: 'vrt-galaxy-modern',             
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Galaxy S24'],
      viewport: { width: 360, height: 11463 },
      fullPage: false
      } 
    },
    { 
      name: 'vrt-ipad-modern-portrait',      
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['iPad (gen 11)'] } 
    },
    { 
      name: 'vrt-ipad-modern-landscape',     
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['iPad (gen 11) landscape'] } 
    },
    { 
      name: 'vrt-galaxy-noteish-portrait',   
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Galaxy S9+'] } 
    },
    { 
      name: 'vrt-galaxy-noteish-landscape',  
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Galaxy S9+ landscape'] } 
    },
    { 
      name: 'vrt-kindle-fire',               
      testMatch: '**/vrt/**/*.spec.*', 
      use: { ...devices['Kindle Fire HDX'] } 
    }
  ],
};

module.exports = config;
