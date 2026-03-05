/**
 * Figma Regression Config — Example / Reference
 *
 * Copy this file to figma_regression_config.js and populate with your own
 * Figma nodes and site URLs.  The active config is tracked in git;
 * review and commit baseline PNGs after running `npm run figma:pull`.
 *
 * ─── Quick start ─────────────────────────────────────────────────────────────
 * 1. Run `npm run figma:pull` to download Figma baselines
 * 2. Commit the PNGs in tests/figma-baselines/
 * 3. Run `npm test` to compare the live site against those baselines
 *
 * ─── Figma reference formats ─────────────────────────────────────────────────
 * Option A — Figma copy-link URL (recommended, easiest):
 *   Right-click any Figma frame → Copy link → paste the full URL as the figma value.
 *   The file key and node ID are extracted automatically.
 *   figma: 'https://www.figma.com/design/FILEKEY/Name?node-id=123-456'
 *
 * Option B — plain object (if you only have the node ID):
 *   figma: { nodeId: '123-456' }          uses FIGMA_FILE_KEY env var for the file
 *   figma: { nodeId: '123-456', fileKey: 'FILEKEY' }  explicit per-component file
 *
 * ─── Baseline filenames ──────────────────────────────────────────────────────
 * Baselines are saved as {page.name}--{component.name}.png
 * e.g. page name "homepage", component name "hero"  →  homepage--hero.png
 *
 * ─── fileKey resolution order ────────────────────────────────────────────────
 * 1. Parsed from the URL string (Option A)
 * 2. figma.fileKey on the component object
 * 3. FIGMA_FILE_KEY environment variable  ← safest for local dev / CI
 *
 * ─── Viewport inheritance ────────────────────────────────────────────────────
 * viewport on a component merges onto the page viewport — partial overrides work:
 *   page.viewport       { width: 1440, height: 900 }
 *   component.viewport  { height: 186 }               ← only height changes
 *   resolved            { width: 1440, height: 186 }
 *
 * ─── Shape ───────────────────────────────────────────────────────────────────
 * module.exports = [
 *   {
 *     name: string                Required. Prefix used in all baseline filenames.
 *     url: string                 Required. Site URL path, e.g. "/" or "/about".
 *     viewport: { width, height } Optional page-level viewport.
 *     maxDiffPixelRatio: number   Optional page-level tolerance.
 *     drupalAuth: object          Optional. Same shape as visual_regression_urls.js.
 *     waitForSelector: string     Optional. Wait for element before any capture.
 *     components: [
 *       {
 *         name: string            Required. Short slug; combined with page.name for filename.
 *         figma: string|object    Required. Copy-link URL or { nodeId, fileKey?, scale? }.
 *         selector: string        Optional. Clips capture to this CSS selector.
 *         viewport: { ... }       Optional component-level override (merged onto page).
 *         masks: string[]         Optional. Selectors hidden before capture.
 *         maxDiffPixelRatio: n    Optional component-level override.
 *         waitForSelector: str    Optional. Wait for element before this capture.
 *       },
 *     ],
 *   },
 * ]
 */

module.exports = [
  // ── Homepage ──────────────────────────────────────────────────────────────
  {
    name: 'homepage',
    url: '/',
    viewport: { width: 1440, height: 900 },
    maxDiffPixelRatio: 0.15,
    // waitForSelector: '.main-content',
    components: [
      // Full-page desktop — no selector = full page screenshot
      {
        name: 'full',
        // Copy-link URL (recommended): paste directly from Figma → Copy link
        figma: 'https://www.figma.com/design/FILEKEY/My-Design?node-id=1-1',
      },

      // Hero component — clip to selector, mask rotating text
      {
        name: 'hero',
        figma: 'https://www.figma.com/design/FILEKEY/My-Design?node-id=2-10',
        selector: '.hero',
        masks: ['.hero__rotating-text'],
        maxDiffPixelRatio: 0.10,
        waitForSelector: '.hero',
      },

      // Navigation bar — height-only viewport override (width inherited from page)
      {
        name: 'navigation',
        // Plain object form: nodeId only, fileKey comes from FIGMA_FILE_KEY env var
        figma: { nodeId: '3-5' },
        selector: '#site-header',
        viewport: { height: 186 },
      },

      // Mobile viewport — full override of width and height
      {
        name: 'mobile',
        figma: { nodeId: '1-2' },
        viewport: { width: 390, height: 844 },
      },
    ],
  },

  // ── Blog ────────────────────────────────────────────────────────────────
  {
    name: 'blog',
    url: '/blog',
    viewport: { width: 1440, height: 900 },
    components: [
      {
        name: 'card',
        figma: 'https://www.figma.com/design/FILEKEY/My-Design?node-id=3-20',
        selector: '.card:first-child',
        masks: ['.card__date', '.card__author-avatar'],
        maxDiffPixelRatio: 0.08,
        waitForSelector: '.card',
      },
    ],
  },

  // ── Authenticated page ──────────────────────────────────────────────────
  {
    name: 'admin',
    url: '/admin/content',
    viewport: { width: 1440, height: 900 },
    drupalAuth: { uid: 1 },
    components: [
      {
        name: 'content-list',
        figma: { nodeId: '4-20' },
        // Admin UI uses system fonts — loosen tolerance
        maxDiffPixelRatio: 0.20,
      },
    ],
  },
];
