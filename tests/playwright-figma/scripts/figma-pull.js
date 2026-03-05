#!/usr/bin/env node
/**
 * figma-pull.js
 *
 * Fetches Figma frame/component images for every entry in
 * figma_regression_config.js and saves them to tests/figma-baselines/.
 *
 * These PNG files are the "design source of truth" for the Figma regression
 * spec and should be committed to version control.  Run this script whenever
 * the Figma designs change, review the diffs in Git, and commit the updates.
 *
 * Usage
 * ─────
 *   npm run figma:pull               # pull all entries
 *   npm run figma:pull -- --name homepage--hero  # pull one component by name
 *   npm run figma:pull -- --page /              # pull all components on a page
 *   npm run figma:pull -- --dry-run             # show what would be fetched, no writes
 *
 * Required environment variables (in tests/playwright-figma/.env)
 * ──────────────────────────────────────────────────────────────────────────
 *   FIGMA_ACCESS_TOKEN   Personal access token (Figma → Settings → Security)
 *   FIGMA_FILE_KEY       Default Figma file key (can be overridden per entry)
 */

'use strict';

require('dotenv').config({ quiet: true });

const path = require('path');
const fs = require('fs');
const { fetchFigmaImages, normalizeNodeId, parseFigmaUrl } = require('../tests/utils/figma');

const BASELINE_DIR = path.join(__dirname, '../tests/figma-baselines');
const CONFIG_PATH = path.join(__dirname, '../tests/fixtures/figma_regression_config.js');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const filterName = (() => {
  const idx = args.indexOf('--name');
  return idx !== -1 ? args[idx + 1] : null;
})();
const filterPage = (() => {
  const idx = args.indexOf('--page');
  return idx !== -1 ? args[idx + 1] : null;
})();
const dryRun = args.includes('--dry-run');

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Validate environment
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error(
      '\n[figma-pull] ERROR: FIGMA_ACCESS_TOKEN is not set.\n' +
      '  Add it to tests/playwright-figma/.env:\n' +
      '    FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxxxxx\n'
    );
    process.exit(1);
  }

  // Load config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `\n[figma-pull] ERROR: Config not found at ${CONFIG_PATH}\n` +
      '  Copy figma_regression_config.example.js → figma_regression_config.js\n'
    );
    process.exit(1);
  }

  const config = require(CONFIG_PATH);

  if (!config.length) {
    console.log('[figma-pull] Config is empty — nothing to pull.');
    process.exit(0);
  }

  // ─── Flatten pages → components into a single list ────────────────────────
  // Baseline name: {page.name}--{component.name}  e.g. "homepage--hero"
  const flatEntries = [];
  for (const page of config) {
    for (const component of page.components || []) {
      flatEntries.push({
        name: `${page.name}--${component.name}`,
        pageUrl: page.url,
        figmaRef: component.figma,
      });
    }
  }

  // Apply --name and --page filters
  let entries = flatEntries;
  if (filterName) {
    entries = entries.filter((e) => e.name === filterName);
    if (entries.length === 0) {
      console.error(`[figma-pull] ERROR: No component found with name "${filterName}".`);
      process.exit(1);
    }
  }
  if (filterPage) {
    entries = entries.filter((e) => e.pageUrl === filterPage);
    if (entries.length === 0) {
      console.error(`[figma-pull] ERROR: No components found for page "${filterPage}".`);
      process.exit(1);
    }
  }

  // Ensure baseline directory exists
  if (!dryRun) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
  }

  // ─── Resolve figma references → pullable entries ──────────────────────────
  let pulled = 0;
  let skipped = 0;
  let failed = 0;

  const pullable = [];
  for (const entry of entries) {
    const { name, figmaRef } = entry;
    if (!figmaRef) {
      console.log(`[figma-pull] SKIP  "${name}" — no figma field`);
      skipped++;
      continue;
    }

    let parsed;
    try {
      parsed = parseFigmaUrl(figmaRef);
    } catch (err) {
      console.error(`[figma-pull] ERROR "${name}" — ${err.message}`);
      failed++;
      continue;
    }

    // fileKey fallback chain: URL → figma.fileKey → FIGMA_FILE_KEY env var
    const fileKey = parsed.fileKey || process.env.FIGMA_FILE_KEY;
    if (!fileKey) {
      console.error(
        `[figma-pull] ERROR "${name}" — no fileKey.\n` +
        '  Options: use a Figma copy-link URL, add figma.fileKey to the entry,\n' +
        '  add figma: { fileKey } at config top-level, or set FIGMA_FILE_KEY in .env.'
      );
      failed++;
      continue;
    }
    pullable.push({ name, fileKey, nodeId: parsed.nodeId, scale: parsed.scale || 1 });
  }

  if (dryRun) {
    for (const e of pullable) {
      console.log(
        `[figma-pull] DRY   "${e.name}"  (file: ${e.fileKey}, node: ${e.nodeId}, scale: ${e.scale}×)`
      );
    }
    skipped += pullable.length;
  } else {
    // Group by fileKey — each file needs only 1–2 API calls regardless of entry count
    const byFileKey = new Map();
    for (const e of pullable) {
      if (!byFileKey.has(e.fileKey)) byFileKey.set(e.fileKey, []);
      byFileKey.get(e.fileKey).push(e);
    }

    for (const [fileKey, group] of byFileKey) {
      const nodeIds = group.map((e) => e.nodeId);
      // Use the scale from the first entry in the group (all must match per batch)
      const scale = group[0].scale;
      console.log(`[figma-pull] Fetching ${nodeIds.length} node(s) from file ${fileKey}…`);

      let buffers;
      try {
        buffers = await fetchFigmaImages(fileKey, nodeIds, { token, scale });
      } catch (err) {
        const is429 = err.message.includes('429');
        console.error(`[figma-pull] FAIL  file "${fileKey}" — ${err.message}`);
        if (is429) {
          console.error(
            '\n  ⚠  Figma rate limit hit. The Images API has a strict hourly quota.\n' +
            '  Wait ~1 hour and run `npm run figma:pull` again.\n' +
            '  Tip: use `npm run figma:pull -- --name <entry>` to pull a single\n' +
            '  entry and avoid re-fetching baselines that already succeeded.\n'
          );
        }
        failed += group.length;
        continue;
      }

      for (const entry of group) {
        const buffer = buffers.get(normalizeNodeId(entry.nodeId));
        if (!buffer) {
          console.error(`[figma-pull] FAIL  "${entry.name}" — node not returned by API`);
          failed++;
          continue;
        }
        const outPath = path.join(BASELINE_DIR, `${entry.name}.png`);
        fs.writeFileSync(outPath, buffer);
        console.log(`[figma-pull] SAVED "${entry.name}.png"  (${(buffer.length / 1024).toFixed(1)} KB)`);
        pulled++;
      }
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(
    `\n[figma-pull] Done.  ` +
    `Pulled: ${pulled}  Skipped: ${skipped}  Failed: ${failed}\n`
  );

  if (!dryRun && pulled > 0) {
    console.log(
      `  Baselines saved to: tests/figma-baselines/\n` +
      `  Review the PNGs, then commit any changes before running the spec.\n` +
      `  Run the spec: npm test\n`
    );
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[figma-pull] Unexpected error:', err);
  process.exit(1);
});
