// Accessibility Testing Spec
// Runs axe-core WCAG 2.1 AA scans on URLs flagged with `a11y: true` in the fixture.
// Runs on vrt-chrome-desktop only — axe analyzes the DOM/ARIA tree, not visuals,
// so running on multiple browser/device projects adds no value.
const { test } = require('@playwright/test');
const visualRegressionUrls = require('../vrt/fixtures/visual_regression_urls.js');
const { runAxeScan, assertAccessibility } = require('../utils/accessibility');

const BASE_URL = process.env.BASE_URL;

// Filter to only URLs explicitly opted in to accessibility testing
const accessibilityUrls = visualRegressionUrls.filter((entry) => entry.a11y === true);

for (const entry of accessibilityUrls) {
  const { url, name, axeOptions = {} } = entry;

  test.describe(`Accessibility for ${name} (${url})`, () => {
    test(`should have no critical or serious violations for ${name}`, async ({ page }, testInfo) => {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');

      const violations = await runAxeScan(page, testInfo, axeOptions);
      assertAccessibility(violations, name);
    });
  });
}
