/**
 * Visual Regression Testing (VRT) Utilities
 *
 * CMS-agnostic helper functions for screenshot capture, configuration,
 * and viewport management in Playwright visual regression tests.
 */

const { expect } = require('@playwright/test');

/**
 * Maximum height for a single page screenshot.
 *
 * Kept below browser image-dimension limits to provide a safe clipping
 * threshold for exceptionally tall pages.
 */
const MAX_SCREENSHOT_HEIGHT = 32_000;

/**
 * Default screenshot options for visual regression tests.
 * These can be overridden globally via screenshotOptions or per-screenshot via screenshots[].options
 */
const DEFAULT_SCREENSHOT_OPTIONS = {
  fullPage: true,
  animations: 'disabled',
  maxDiffPixelRatio: 0.02
};

/**
 * Build Playwright locator masks from selector strings.
 *
 * @param {Object} page - Playwright page object
 * @param {string[]} [maskSelectors=[]] - CSS selectors to mask during screenshot assertions
 * @returns {import('@playwright/test').Locator[]|undefined}
 */
function buildMaskLocators(page, maskSelectors = []) {
  if (!Array.isArray(maskSelectors) || maskSelectors.length === 0) {
    return undefined;
  }

  return maskSelectors.map((selector) => page.locator(selector));
}

/**
 * Apply clipping if page height exceeds maximum screenshot height.
 * Maintains full width while limiting height to prevent screenshot errors.
 *
 * @param {Object} page - Playwright page object
 * @param {Object} options - Screenshot options to potentially modify
 * @returns {Promise<Object>} - Modified options with clip if necessary
 *
 * @example
 * const options = await applyClipIfNeeded(page, { fullPage: true })
 * // If page is 40000px tall: { fullPage: false, clip: { x: 0, y: 0, width: 1920, height: 32000 } }
 * // If page is 2000px tall: { fullPage: true } (unchanged)
 */
async function applyClipIfNeeded(page, options) {
  // Only apply clipping if fullPage is enabled
  if (!options.fullPage) {
    return options;
  }

  // Get page dimensions
  const dimensions = await page.evaluate(() => ({
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
    ),
  }));

  // If height exceeds maximum, apply clipping
  if (dimensions.height > MAX_SCREENSHOT_HEIGHT) {
    console.log(`[VRT] Page height (${dimensions.height}px) exceeds maximum. Clipping to ${MAX_SCREENSHOT_HEIGHT}px.`);
    return {
      ...options,
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: MAX_SCREENSHOT_HEIGHT
      }
    };
  }

  return options;
}


/**
 * Merge user-provided screenshot options with defaults.
 * Performs shallow merge to allow partial overrides.
 *
 * @param {Object} [overrides={}] - User-provided screenshot options
 * @returns {Object} - Merged screenshot options
 *
 * @example
 * mergeScreenshotOptions({ maxDiffPixelRatio: 0.05 })
 * // Returns: { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.05 }
 */
function mergeScreenshotOptions(overrides = {}) {
  return { ...DEFAULT_SCREENSHOT_OPTIONS, ...overrides };
}

/**
 * Normalize URL entry to object format.
 * Validates that required 'url' and 'name' properties exist.
 *
 * @param {Object} entry - Config object with url and name
 * @param {string} entry.url - Required: URL path to test
 * @param {string} entry.name - Required: Name for screenshot files
 * @returns {Object} - Validated config object
 * @throws {Error} - If url or name property is missing
 *
 * @example
 * normalizeUrlEntry({ url: "/about", name: "about-page" })
 * // Returns: { url: "/about", name: "about-page" }
 *
 * normalizeUrlEntry({ url: "/contact", name: "contact", viewports: ["mobile"] })
 * // Returns: { url: "/contact", name: "contact", viewports: ["mobile"] }
 */
function normalizeUrlEntry(entry) {
  if (typeof entry === 'string') {
    throw new Error(
      `URL config must be an object with 'url' and 'name' properties. ` +
      `Got string: "${entry}". ` +
      `Use: { url: "${entry}", name: "..." }`
    );
  }

  if (!entry.url) {
    throw new Error(
      `URL config requires 'url' property. ` +
      `Got config: ${JSON.stringify(entry)}`
    );
  }

  if (!entry.name) {
    throw new Error(
      `URL config requires 'name' property for screenshot filenames. ` +
      `Got config: ${JSON.stringify(entry)}`
    );
  }

  return entry;
}

/**
 * Generate screenshot filename from name, project, and optional element name.
 *
 * @param {string} name - Page name for screenshot
 * @param {string} projectName - Project name (e.g., 'chrome-desktop', 'pixel-mobile', 'iphone')
 * @param {string} [screenshotName] - Optional screenshot name for element captures
 * @returns {string} - Generated filename
 *
 * @example
 * getScreenshotFilename("about-page", "chrome-desktop")
 * // Returns: "about-page.png"
 *
 * getScreenshotFilename("about-page", "iphone", "header")
 * // Returns: "about-page-header.png"
 *
 * getScreenshotFilename("homepage", "pixel-mobile")
 * // Returns: "homepage.png"
 */
function getScreenshotFilename(name, projectName, screenshotName) {
  const parts = [name];

  if (screenshotName) {
    parts.push(screenshotName);
  }

  // Note: projectName not included in filename since Playwright organizes
  // screenshots by project in separate folders (e.g., chrome-desktop/homepage.png)

  return `${parts.join('-')}.png`;
}

/**
 * Capture screenshots for a page.
 * Supports both full-page screenshots and multiple element-specific screenshots.
 *
 * @param {Object} page - Playwright page object
 * @param {string} name - Page name for filename generation (required)
 * @param {string} projectName - Project name from testInfo.project.name (e.g., 'chrome-desktop')
 * @param {Object} [globalScreenshotOptions={}] - Global screenshot options for all captures
 * @param {Array<Object>} [screenshotsConfig] - Array of screenshot configurations
 * @param {string} screenshotsConfig[].selector - CSS selector for element to capture
 * @param {string} screenshotsConfig[].name - Name for screenshot (required, used in filename)
 * @param {Object} [screenshotsConfig[].options] - Per-screenshot option overrides
 * @returns {Promise<void>}
 * @throws {Error} - If screenshot config is missing required 'name' property
 *
 * @example
 * // Full page screenshot (default)
 * await captureScreenshots(page, "about-page", "chrome-desktop")
 *
 * // Multiple element screenshots
 * await captureScreenshots(page, "about-page", "iphone", {}, [
 *   { selector: ".header", name: "header" },
 *   { selector: ".footer", name: "footer", options: { maxDiffPixelRatio: 0.01 } }
 * ])
 *
 * // Global options with element screenshots
 * await captureScreenshots(page, "contact", "pixel-mobile", { maxDiffPixelRatio: 0.05 }, [
 *   { selector: ".nav", name: "nav" }
 * ])
 */
async function captureScreenshots(
  page,
  name,
  projectName,
  globalScreenshotOptions = {},
  screenshotsConfig,
  maskSelectors = []
) {
  const baseOptions = mergeScreenshotOptions(globalScreenshotOptions);
  const mask = buildMaskLocators(page, maskSelectors);

  // Trigger lazy-loaded images by scrolling through the page
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
          window.scrollTo(0, 0); // Scroll back to top
          resolve();
        }
      }, 50);
    });
  });

  // Return to top for deterministic full-page snapshots.
  await page.evaluate(() => window.scrollTo(0, 0));

  // Wait for pending images to either load/error (or timeout) before snapshot.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = img.onerror = () => resolve(null);
          }))
      ),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ])
  );

  // Brief settle wait for post-load animations / async content.
  await page.waitForTimeout(1000);

  // If no screenshots config provided, capture full page
  if (!screenshotsConfig || screenshotsConfig.length === 0) {
    const filename = getScreenshotFilename(name, projectName);
    await expect(page).toHaveScreenshot(filename, {
      ...baseOptions,
      ...(mask ? { mask } : {}),
    });
    return;
  }

  // Capture each configured screenshot
  for (const screenshotConfig of screenshotsConfig) {
    const { selector, name: elementName, options = {} } = screenshotConfig;

    // Validate required name property
    if (!elementName) {
      throw new Error(
        `Screenshot config requires explicit 'name' property. ` +
        `Got config: ${JSON.stringify(screenshotConfig)}`
      );
    }

    console.log(`[VRT] Waiting for element: ${selector}`);

    // Wait for element to be attached to DOM
    // Using 'attached' instead of 'visible' since element might be off-screen or hidden
    // but still needs to be captured for screenshots
    // Shorter timeout since waitForSelector in spec file already waited for content
    try {
      await page.locator(selector).waitFor({ state: 'attached', timeout: 5000 });
      console.log(`[VRT] Found element: ${selector}`);
    } catch (error) {
      // Provide helpful debugging information
      const elementCount = await page.locator(selector).count();
      console.error(`[VRT] Failed to find element: ${selector}`);
      console.error(`[VRT] Element count: ${elementCount}`);
      console.error(`[VRT] Current URL: ${page.url()}`);

      // Try to find similar elements for debugging
      const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
      console.error(`[VRT] Page content sample: ${bodyHTML}...`);

      throw new Error(
        `Element "${selector}" not found within 5s. ` +
        `Element count: ${elementCount}. ` +
        `Current URL: ${page.url()}. ` +
        `Original error: ${error.message}`
      );
    }
    // Merge global and per-screenshot options
    const mergedOptions = {
      ...baseOptions,
      ...options,
      ...(mask ? { mask } : {}),
    };

    // Generate filename and capture screenshot
    const filename = getScreenshotFilename(name, projectName, elementName);
    await expect(page.locator(selector)).toHaveScreenshot(filename, mergedOptions);
  }
}

module.exports = {
  MAX_SCREENSHOT_HEIGHT,
  DEFAULT_SCREENSHOT_OPTIONS,
  buildMaskLocators,
  mergeScreenshotOptions,
  applyClipIfNeeded,
  normalizeUrlEntry,
  getScreenshotFilename,
  captureScreenshots
};
