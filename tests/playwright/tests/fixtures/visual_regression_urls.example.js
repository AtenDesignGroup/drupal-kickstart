/**
 * Visual Regression URLs Configuration
 *
 * All URL entries must be objects with required 'url' and 'name' properties.
 *
 * IMPORTANT: Tests now run using Playwright projects (chrome-desktop, pixel-mobile, iphone).
 * Each test automatically runs in ALL projects. Use --project flag to filter:
 *   npm run test:baseline -- --project="chrome-desktop"
 *   npm run test:compare -- --project="pixel-mobile"
 *
 * Required format:
 *    {
 *      "url": "/path/to/page",     // Required: URL path to test
 *      "name": "page-identifier",  // Required: Used in screenshot filenames
 *
 *      // PROJECTS (Optional)
 *      // Limit test to specific projects. Defaults to all projects if omitted.
 *      // Project names must match those defined in playwright.config.js
 *      "projects": ["chrome-desktop"],  // Only run on desktop Chrome
 *
 *      // SCREENSHOT OPTIONS (Optional)
 *      // Override default screenshot options. Supports all Playwright toHaveScreenshot() options.
 *      // See: https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1
 *      "screenshotOptions": {
 *        "maxDiffPixelRatio": 0.05,  // Allow 5% pixel difference (default: 0.02)
 *        "fullPage": false,           // Don't capture full scrollable page (default: true)
 *        "animations": "disabled"     // Disable animations (default)
 *      },
 *
 *      // WAIT FOR SELECTOR (Optional)
 *      // Wait for a specific element to be attached to DOM before capturing screenshots.
 *      // Useful for AJAX-loaded content or dynamic pages.
 *      "waitForSelector": ".main-content",
 *
 *      // ELEMENT SCREENSHOTS (Optional)
 *      // Capture specific page elements instead of full page.
 *      // Each screenshot requires explicit 'name' for filename generation.
 *      // Filenames organized by project: {project}/{name}-{element}.png
 *      // Example: chrome-desktop/about-header.png, pixel-mobile/about-header.png
 *      "screenshots": [
 *        {
 *          "selector": ".site-header",
 *          "name": "header"
 *        },
 *        {
 *          "selector": ".main-content",
 *          "name": "content",
 *          "options": {
 *            "maxDiffPixelRatio": 0.01  // Per-screenshot option override
 *          }
 *        }
 *      ],
 *
 *      // DRUPAL AUTHENTICATION (Optional)
 *      // Drupal-specific authentication via drush. Three modes:
 *      "drupalAuth": {
 *        // Mode 1: Login as specific user ID
 *        "uid": 1  // Admin user
 *
 *        // Mode 2: Login as random user with exact role match
 *        // "roles": ["authenticated", "editor"]
 *
 *        // Mode 3: Create temporary test user with roles (cleaned up after test)
 *        // "roles": ["authenticated", "content_manager"],
 *        // "createUser": true
 *      }
 *    }
 *
 * EXAMPLES:
 *
 * // Simple page (object format required)
 * {
 *   "url": "/",
 *   "name": "homepage"
 * }
 *
 * // Login as admin user (desktop only - admin UI not responsive)
 * {
 *   "url": "/admin/content",
 *   "name": "content-admin",
 *   "projects": ["chrome-desktop"],
 *   "drupalAuth": { "uid": 1 }
 * }
 *
 * // Custom threshold (runs in all projects: chrome-desktop, pixel-mobile, iphone)
 * {
 *   "url": "/contact",
 *   "name": "contact-page",
 *   "screenshotOptions": { "maxDiffPixelRatio": 0.03 }
 * }
 *
 * // Element-specific screenshots
 * {
 *   "url": "/",
 *   "name": "homepage",
 *   "screenshots": [
 *     { "selector": ".hero", "name": "hero" },
 *     { "selector": ".footer", "name": "footer" }
 *   ]
 * }
 *
 * // Login as random user with exact role match
 * {
 *   "url": "/node/add/article",
 *   "name": "article-create",
 *   "drupalAuth": { "roles": ["authenticated", "editor"] }
 * }
 *
 * // Create temporary test user
 * {
 *   "url": "/user/profile",
 *   "name": "user-profile",
 *   "drupalAuth": {
 *     "roles": ["authenticated", "content_manager"],
 *     "createUser": true
 *   }
 * }
 *
 * // Combined example: All features
 * {
 *   "url": "/admin/structure",
 *   "name": "structure-admin",
 *   "waitForSelector": ".toolbar",
 *   "screenshotOptions": { "maxDiffPixelRatio": 0.04 },
 *   "screenshots": [
 *     { "selector": ".toolbar", "name": "toolbar" },
 *     { "selector": ".main-content", "name": "content" }
 *   ],
 *   "drupalAuth": { "uid": 1 }
 * }
 *
 * // AJAX-loaded content example
 * {
 *   "url": "/admin/content",
 *   "name": "content-admin-filters",
 *   "waitForSelector": ".views-filters",  // Wait for Views filters to load
 *   "screenshots": [
 *     { "selector": ".views-filters", "name": "filters" },
 *     { "selector": ".view-content", "name": "content" }
 *   ],
 *   "drupalAuth": { "uid": 1 }
 * }
 *
 * NOTES:
 * - All entries require 'url' and 'name' properties (object format only)
 * - Screenshots organized by project: {project}/{name}.png or {project}/{name}-{element}.png
 * - Projects defined in playwright.config.js: chrome-desktop, pixel-mobile, iphone
 * - Each test runs in ALL projects by default (use 'projects' property to limit specific URLs)
 * - Use --project flag for CLI filtering: npx playwright test --project="chrome-desktop"
 * - screenshotOptions accepts any Playwright toHaveScreenshot() parameter
 * - screenshots array requires explicit 'name' property for each element
 * - Mixing full page and element screenshots requires separate URL entries
 * - waitForSelector waits for element to be attached before capturing any screenshots
 * - Element screenshots wait briefly for each element (5s timeout)
 * - Roles must match exactly (same roles, same count)
 * - Invalid roles will fail with helpful error message
 * - Created users are automatically cleaned up after test
 * - Parallel execution safe with unique usernames
 */

// Current configuration
module.exports = [
  {
    "url": "/",
    "name": "homepage"
  },
  {
    "url": "/work",
    "name": "work"
  },
  {
    "url": "/services",
    "name": "services"
  },
  {
    "url": "/about",
    "name": "about"
  },
  {
    "url": "/blog",
    "name": "blog"
  },
  {
    "url": "/contact",
    "name": "contact"
  }
];

// Example with mixed authentication and features
/*
module.exports = [
  {
    "url": "/",
    "name": "homepage"
  },
  {
    "url": "/work",
    "name": "work"
  },
  {
    "url": "/admin/content",
    "name": "content-admin",
    "waitForSelector": ".views-filters",
    "drupalAuth": { "uid": 1 }
  },
  {
    "url": "/node/add/article",
    "name": "article-create",
    "drupalAuth": { "roles": ["authenticated", "editor"] }
  },
  {
    "url": "/admin/content",
    "name": "content-admin-desktop",
    "viewports": ["desktop"],
    "waitForSelector": ".view-content",
    "drupalAuth": {
      "roles": ["authenticated", "editor", "designer"],
      "createUser": true
    }
  },
  {
    "url": "/",
    "name": "homepage-mobile",
    "viewports": ["mobile"],
    "screenshotOptions": { "maxDiffPixelRatio": 0.05 },
    "screenshots": [
      { "selector": ".hero-banner", "name": "hero" },
      { "selector": ".featured-work", "name": "work" }
    ]
  },
  {
    "url": "/admin/content",
    "name": "content-admin-elements",
    "waitForSelector": ".views-filters",
    "screenshots": [
      { "selector": ".views-filters", "name": "filters" },
      { "selector": ".view-content", "name": "content" }
    ],
    "drupalAuth": { "uid": 1 }
  }
];
*/
