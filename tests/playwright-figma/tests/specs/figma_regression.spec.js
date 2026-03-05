/**
 * Figma Regression Spec
 *
 * Compares live-site screenshots against Figma-exported PNG baselines.
 *
 * Baselines live in tests/figma-baselines/ and are committed to version
 * control. Refresh them with:
 *   npm run figma:pull
 *
 * This spec uses Playwright's native toHaveScreenshot() so the HTML report
 * includes the full slider / side-by-side / diff UI on failures.
 *
 * Run via playwright.config.js (snapshotPathTemplate points at
 * tests/figma-baselines/ with no platform suffix):
 *   npm test
 *
 * Tolerance defaults to 15% — Figma and browsers differ in font hinting,
 * sub-pixel AA, and P3 vs sRGB gamut. Tighten per entry once a component
 * matches the design closely.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const figmaConfig = require('../fixtures/figma_regression_config');
const { deleteTestUser } = require('../utils/auth');
const { setupAuthentication } = require('../utils/drupal-auth');

const BASE_URL = process.env.BASE_URL;

/** Default maximum proportion of mismatched pixels before the test fails. */
const DEFAULT_MAX_DIFF_PIXEL_RATIO = 0.15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate the CSS block used to mask dynamic elements before capture.
 * Masked elements are replaced with a solid neutral box so dates, avatars,
 * and other randomly-changing content don't produce false positives.
 *
 * @param {string[]} selectors - CSS selectors to mask.
 * @returns {string} - CSS string ready for page.addStyleTag().
 */
function buildMaskCss(selectors) {
  if (!selectors || selectors.length === 0) return '';
  const rule = selectors.join(', ');
  return `${rule} { color: transparent !important; background: #b4b4b4 !important; border-color: transparent !important; }
${rule} * { visibility: hidden !important; }`;
}

/**
 * Dismiss the Pantheon sandbox environment interstitial if present.
 * Pantheon shows a "This website is hosted in a sandbox environment" warning
 * page on non-live environments that blocks anonymous navigation until
 * the user clicks "Continue".
 *
 * @param {import('@playwright/test').Page} page
 */
async function dismissPantheonInterstitial(page) {
  const continueButton = page.getByRole('button', { name: 'Continue' });
  const isInterstitial = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);
  if (isInterstitial) {
    await continueButton.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Scroll the full page to trigger lazy-loaded images, then return to top.
 *
 * @param {import('@playwright/test').Page} page
 */
async function triggerLazyLoad(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 50);
    });
  });
  await page.waitForTimeout(500);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────
// Each page navigates once (in beforeAll) then captures each component as its
// own test() entry so the HTML report shows individual pass/fail per component.

for (const pageConfig of figmaConfig) {
  const pageViewport = pageConfig.viewport || { width: 1440, height: 900 };
  const pageMaxDiff = pageConfig.maxDiffPixelRatio ?? DEFAULT_MAX_DIFF_PIXEL_RATIO;
  const components = pageConfig.components || [];

  if (components.length === 0) continue;

  test.describe(`Figma: ${pageConfig.name}`, () => {
    /** @type {import('@playwright/test').Page} */
    let sharedPage;
    const createdUsers = [];

    test.beforeAll(async ({ browser }, testInfo) => {
      if (testInfo.project.name !== 'chrome-desktop') return;

      const context = await browser.newContext();
      sharedPage = await context.newPage();

      await sharedPage.setViewportSize(pageViewport);
      await setupAuthentication(sharedPage, pageConfig.drupalAuth, createdUsers);

      await sharedPage.goto(`${BASE_URL}${pageConfig.url}`, { waitUntil: 'load', timeout: 30000 });
      await sharedPage.waitForLoadState('domcontentloaded');
      await dismissPantheonInterstitial(sharedPage);

      await sharedPage.addStyleTag({ path: './tests/fixtures/vrt-overrides.css' });

      if (pageConfig.waitForSelector) {
        await sharedPage.locator(pageConfig.waitForSelector).waitFor({ state: 'attached', timeout: 10000 });
      }

      await triggerLazyLoad(sharedPage);
    });

    test.afterAll(async () => {
      for (const uid of createdUsers) {
        try { await deleteTestUser(uid); } catch (e) {
          console.error(`[figma-vrt] Failed to delete test user ${uid}: ${e.message}`);
        }
      }
      if (sharedPage) await sharedPage.context().close();
    });

    for (const component of components) {
      const {
        name: componentName,
        selector,
        masks,
        waitForSelector,
        viewport: componentViewport,
        maxDiffPixelRatio = pageMaxDiff,
      } = component;

      const baselineName = `${pageConfig.name}--${componentName}`;
      const resolvedViewport = componentViewport
        ? { ...pageViewport, ...componentViewport }
        : null;

      test(componentName, async ({}, testInfo) => {
        if (testInfo.project.name !== 'chrome-desktop') {
          test.skip();
          return;
        }

        // beforeAll skipped for non-chrome-desktop workers
        if (!sharedPage) { test.skip(); return; }

        // Verify baseline exists
        const baselinePath = path.join(__dirname, '../figma-baselines', `${baselineName}.png`);
        if (!fs.existsSync(baselinePath)) {
          throw new Error(
            `Figma baseline not found: tests/figma-baselines/${baselineName}.png\n` +
            `  Run 'npm run figma:pull' to download it from Figma, then commit the PNG.`
          );
        }

        if (resolvedViewport) {
          await sharedPage.setViewportSize(resolvedViewport);
        }

        const maskCss = buildMaskCss(masks);
        if (maskCss) {
          await sharedPage.addStyleTag({ content: maskCss });
        }

        if (waitForSelector) {
          await sharedPage.locator(waitForSelector).waitFor({ state: 'attached', timeout: 10000 });
        }

        const screenshotOptions = { animations: 'disabled', maxDiffPixelRatio };

        if (selector) {
          const locator = sharedPage.locator(selector);
          try {
            await locator.waitFor({ state: 'attached', timeout: 10000 });
          } catch {
            const available = await sharedPage.evaluate(() => {
              const ids = [...document.querySelectorAll('[id]')].map((el) => `#${el.id}`);
              const tags = [...document.querySelectorAll('header, nav, main, footer, [class]')]
                .slice(0, 20)
                .map((el) => {
                  const cls = el.className && typeof el.className === 'string'
                    ? '.' + el.className.trim().split(/\s+/).join('.')
                    : '';
                  return `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}>`;
                });
              return { ids: [...new Set(ids)], tags: [...new Set(tags)] };
            });
            throw new Error([
              `Selector "${selector}" not found on ${sharedPage.url()} (component: ${baselineName})`,
              `  IDs in DOM: ${available.ids.join('  ') || '(none)'}`,
              `  Elements sample: ${available.tags.join('  ')}`,
            ].join('\n'));
          }
          await expect(locator).toHaveScreenshot(`${baselineName}.png`, screenshotOptions);
        } else {
          await expect(sharedPage).toHaveScreenshot(`${baselineName}.png`, {
            ...screenshotOptions,
            fullPage: true,
          });
        }
      });
    }
  });
}
