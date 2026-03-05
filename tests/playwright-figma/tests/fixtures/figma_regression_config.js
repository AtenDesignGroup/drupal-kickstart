/**
 * Figma Regression Config — Active Configuration
 *
 * Add your project's Figma node IDs and site URLs here.
 * See figma_regression_config.example.js for full documentation.
 *
 * ─── Quick start ─────────────────────────────────────────────────────────────
 * 1. Copy a node ID: open Figma → right-click frame → Copy link → extract ?node-id=
 * 2. Copy the file key: figma.com/design/{FILE_KEY}/…
 * 3. Set FIGMA_FILE_KEY (and optionally FIGMA_ACCESS_TOKEN) in .env
 * 4. Run `npm run figma:pull` to download baselines from Figma
 * 5. Commit the downloaded PNGs in tests/figma-baselines/
 * 6. Run `npm test` to compare the live site against those baselines
 */

module.exports = [
  {
    name: 'homepage',
    url: '/',
    viewport: { width: 1620, height: 900 },
    maxDiffPixelRatio: 0.01,
    components: [
      {
        name: 'full',
        figma: { nodeId: '17597-2204' },
        selector: 'body',
        viewport: { height: 7444 },
      },
      {
        name: 'navigation',
        figma: { nodeId: '17597-2206' },
        selector: '#site-header',
        viewport: { height: 186 },
      },
      {
        name: 'hero',
        figma: { nodeId: '17597-2207' },
        selector: 'header.p-homepage__header',
        viewport: { height: 1034 },
      },
    ],
  },
];
