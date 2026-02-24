// Visual Regression Testing Spec
const { test } = require('@playwright/test');
const config = require('../../playwright.config');
const visualRegressionUrls = require('../fixtures/visual_regression_urls.js');
const { deleteTestUser } = require('../utils/auth');
const { normalizeUrlEntry, captureScreenshots } = require('../utils/vrt');
const { setupAuthentication } = require('../utils/drupal-auth');

const BASE_URL = config.use.baseURL;

for (const entry of visualRegressionUrls) {
  const testConfig = normalizeUrlEntry(entry);
  const { url, name, screenshotOptions, screenshots, drupalAuth, waitForSelector, projects } = testConfig;

  test.describe(`Visual regression for ${url}`, () => {
    // Track created users for cleanup
    const createdUsers = [];

    // Cleanup created users after each test
    test.afterEach(async () => {
      for (const uid of createdUsers) {
        try {
          await deleteTestUser(uid);
        } catch (error) {
          console.error(`Failed to delete test user ${uid}:`, error.message);
        }
      }
      createdUsers.length = 0; // Clear the array
    });

    test(`should match baseline for ${url}`, async ({ page }, testInfo) => {
      // Skip if this project is not in the allowed projects list
      if (projects && !projects.includes(testInfo.project.name)) {
        test.skip();
      }

      // Authenticate once (if needed)
      await setupAuthentication(page, drupalAuth, createdUsers);

      // Navigate to page once
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'load', timeout: 30000 });
      await page.addStyleTag({ path: './tests/fixtures/vrt-overrides.css' });
      await page.waitForLoadState('domcontentloaded');

      // Wait for custom selector if specified (useful for AJAX-loaded content)
      if (waitForSelector) {
        await page.locator(waitForSelector).waitFor({ state: 'attached' });
      }

      // Capture screenshots (full page or element-specific)
      // Playwright runs this test once per project (chrome-desktop, pixel-mobile, iphone)
      await captureScreenshots(page, name, testInfo.project.name, screenshotOptions, screenshots);
    });
  });
}
