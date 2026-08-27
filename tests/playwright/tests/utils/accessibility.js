/**
 * Accessibility Testing Utilities
 *
 * Provides axe-core powered accessibility scanning using @axe-core/playwright.
 * Tests against WCAG 2.1 AA standards plus best practices.
 *
 * Violation impact levels (axe-core):
 *  - critical  → HARD FAIL (e.g. missing form labels, images without alt text)
 *  - serious   → HARD FAIL (e.g. insufficient color contrast)
 *  - moderate  → WARN only (e.g. redundant role)
 *  - minor     → WARN only (e.g. region landmark)
 *
 * Report output per test:
 *  - Annotation        → summary count at top of test detail ("a11y PASS/FAIL | 3 violations...")
 *  - Soft assertions   → one per critical/serious violation, each named in the Errors list
 *  - HTML attachment   → styled violation cards with selector/HTML/fix per element
 *  - Screenshot        → viewport screenshot for visual context
 *  - JSON attachment   → raw axe results for programmatic use
 */

const { AxeBuilder } = require('@axe-core/playwright');
const { expect } = require('@playwright/test');

/**
 * Default axe scan options.
 * Tags map to WCAG 2.0 A/AA, WCAG 2.1 AA, and axe best-practice rules.
 *
 * Override per-URL by setting `axeOptions` in your visual_regression_urls.js entry:
 *   {
 *     "name": "contact",
 *     "url": "/contact",
 *     "a11y": true,
 *     "axeOptions": {
 *       "exclude": ["#hubspot-form-wrapper"],
 *       "disableRules": ["color-contrast"]
 *     }
 *   }
 */
const DEFAULT_AXE_OPTIONS = {
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  // Third-party widgets that cannot be remediated by this project
  exclude: [
    'iframe[title="reCAPTCHA"]',
    '.c-video iframe',
    'iframe[src*="youtube.com"]',
    'iframe[src*="youtube-nocookie.com"]',
    'iframe[title*="YouTube"]',
    'iframe[src*="recaptcha"]',
    '.grecaptcha-badge',
  ],
  disableRules: [],
};

/**
 * Merges per-URL axeOptions with defaults.
 *
 * @param {Object} [overrides={}]
 * @returns {Object}
 */
function mergeAxeOptions(overrides = {}) {
  return {
    tags: overrides.tags ?? DEFAULT_AXE_OPTIONS.tags,
    exclude: [...DEFAULT_AXE_OPTIONS.exclude, ...(overrides.exclude ?? [])],
    disableRules: [...DEFAULT_AXE_OPTIONS.disableRules, ...(overrides.disableRules ?? [])],
  };
}

/**
 * Builds a self-contained styled HTML report for the axe scan results.
 * Rendered inline in the Playwright HTML report under the test Attachments section.
 * Shows three sections: Violations (detail), Incomplete (needs review), Passes (full rule list).
 *
 * @param {import('axe-core').Result[]} violations
 * @param {string} pageUrl
 * @param {import('axe-core').Result[]} passes
 * @param {import('axe-core').Result[]} incomplete
 * @returns {string}
 */
function buildHtmlReport(violations, pageUrl, passes, incomplete) {
  const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const impactColor = { critical: '#c62828', serious: '#e65100', moderate: '#f57f17', minor: '#1565c0' };
  const impactBg    = { critical: '#ffebee', serious: '#fff3e0', moderate: '#fffde7', minor: '#e3f2fd' };

  const counts = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious:  violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor:    violations.filter((v) => v.impact === 'minor').length,
  };

  const badge = (label, color, count) =>
    count > 0
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;color:#fff;background:${color};margin-right:6px">${count} ${label}</span>`
      : '';

  // ── Violations ────────────────────────────────────────────────────────────
  const violationCards = violations.map((v) => {
    const rows = v.nodes.map((node) => {
      const target  = esc(Array.isArray(node.target) ? node.target.join(' > ') : String(node.target));
      const html    = esc(node.html || '');
      const summary = esc(node.failureSummary || '').replace(/\n/g, '<br>');
      return `<tr>
        <td style="padding:8px 10px;font-family:monospace;font-size:12px;color:#1a237e;vertical-align:top;border-bottom:1px solid #eee">${target}</td>
        <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#555;vertical-align:top;border-bottom:1px solid #eee;word-break:break-all">${html}</td>
        <td style="padding:8px 10px;font-size:12px;color:#333;vertical-align:top;border-bottom:1px solid #eee">${summary}</td>
      </tr>`;
    }).join('');

    return `<div style="border:1px solid ${impactColor[v.impact]};border-radius:6px;margin-bottom:14px;overflow:hidden">
      <div style="background:${impactBg[v.impact]};padding:10px 14px;border-bottom:1px solid ${impactColor[v.impact]}">
        <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:${impactColor[v.impact]};margin-right:8px;text-transform:uppercase">${esc(v.impact)}</span>
        <strong style="font-size:14px">${esc(v.id)}</strong>
        <span style="font-size:13px;color:#555;margin-left:6px">&#8212; ${esc(v.description)}</span>
        <br><a href="${esc(v.helpUrl)}" style="font-size:12px;color:#1565c0" target="_blank">${esc(v.helpUrl)}</a>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#fafafa">
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">Selector</th>
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">HTML</th>
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">How to Fix</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  // ── Incomplete ─────────────────────────────────────────────────────────────
  // Incomplete rules couldn't be determined automatically — manual review needed.
  const incompleteCards = incomplete.map((v) => {
    const rows = v.nodes.map((node) => {
      const target  = esc(Array.isArray(node.target) ? node.target.join(' > ') : String(node.target));
      const html    = esc(node.html || '');
      const message = (node.any || []).map((c) => esc(c.message)).filter(Boolean).join('<br>') ||
                      esc(node.failureSummary || '').replace(/\n/g, '<br>');
      return `<tr>
        <td style="padding:8px 10px;font-family:monospace;font-size:12px;color:#4a148c;vertical-align:top;border-bottom:1px solid #eee">${target}</td>
        <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#555;vertical-align:top;border-bottom:1px solid #eee;word-break:break-all">${html}</td>
        <td style="padding:8px 10px;font-size:12px;color:#333;vertical-align:top;border-bottom:1px solid #eee">${message}</td>
      </tr>`;
    }).join('');

    return `<div style="border:1px solid #ab47bc;border-radius:6px;margin-bottom:14px;overflow:hidden">
      <div style="background:#f3e5f5;padding:10px 14px;border-bottom:1px solid #ab47bc">
        <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:#7b1fa2;margin-right:8px">INCOMPLETE</span>
        <strong style="font-size:14px">${esc(v.id)}</strong>
        <span style="font-size:13px;color:#555;margin-left:6px">&#8212; ${esc(v.description)}</span>
        <br><a href="${esc(v.helpUrl)}" style="font-size:12px;color:#1565c0" target="_blank">${esc(v.helpUrl)}</a>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#fafafa">
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">Selector</th>
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">HTML</th>
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee">Why it needs review</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  // ── Passes ─────────────────────────────────────────────────────────────────
  // Compact table — one row per rule. Collapsible so it doesn't dominate the report.
  const passRows = passes.map((p) => {
    const tags = (p.tags || []).filter((t) => t.startsWith('wcag') || t === 'best-practice')
      .map((t) => `<code style="font-size:10px;background:#e8f5e9;color:#1b5e20;padding:1px 5px;border-radius:3px;margin-right:3px">${t}</code>`)
      .join('');
    return `<tr>
      <td style="padding:6px 10px;font-family:monospace;font-size:12px;color:#1b5e20;white-space:nowrap;border-bottom:1px solid #f5f5f5">${esc(p.id)}</td>
      <td style="padding:6px 10px;font-size:12px;color:#333;border-bottom:1px solid #f5f5f5">${esc(p.description)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5">${tags}</td>
    </tr>`;
  }).join('');

  const passesSection = passes.length > 0 ? `
  <details open style="margin-top:20px">
    <summary style="cursor:pointer;font-size:15px;font-weight:600;padding:10px 0;border-top:2px solid #eee;list-style:none;display:flex;align-items:center">
      <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:#2e7d32;margin-right:8px">${passes.length}</span>
      Rules Passed &#9650;
    </summary>
    <div style="overflow-x:auto;margin-top:8px">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f1f8e9">
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#555;border-bottom:2px solid #dcedc8;white-space:nowrap">Rule ID</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#555;border-bottom:2px solid #dcedc8">Description</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#555;border-bottom:2px solid #dcedc8">WCAG Tags</th>
        </tr></thead>
        <tbody>${passRows}</tbody>
      </table>
    </div>
  </details>` : '';

  const noViolations = violations.length === 0
    ? `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:14px;color:#1b5e20;font-weight:500">No accessibility violations found.</div>`
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Accessibility Report</title></head>
<body style="font-family:system-ui,sans-serif;margin:0;padding:16px;color:#333;font-size:14px;line-height:1.5">
  <h1 style="font-size:18px;margin:0 0 4px">Accessibility Report</h1>
  <div style="color:#666;font-size:13px;margin-bottom:12px;word-break:break-all">${pageUrl}</div>
  <div style="margin-bottom:16px">
    ${badge('passed', '#2e7d32', passes.length)}
    ${badge('critical', impactColor.critical, counts.critical)}
    ${badge('serious', impactColor.serious, counts.serious)}
    ${badge('moderate', impactColor.moderate, counts.moderate)}
    ${badge('minor', impactColor.minor, counts.minor)}
    ${incomplete.length > 0 ? badge('incomplete', '#7b1fa2', incomplete.length) : ''}
  </div>
  ${noViolations}
  ${violations.length > 0 ? `<h2 style="font-size:15px;margin:0 0 10px;border-bottom:2px solid #eee;padding-bottom:6px">Violations (${violations.length})</h2>${violationCards}` : ''}
  ${incomplete.length > 0 ? `<h2 style="font-size:15px;margin:16px 0 10px;border-bottom:2px solid #eee;padding-bottom:6px">Needs Manual Review (${incomplete.length})</h2><p style="font-size:12px;color:#666;margin:0 0 10px">Axe could not automatically determine whether these elements pass or fail. Manual review is required.</p>${incompleteCards}` : ''}
  ${passesSection}
</body></html>`;
}

/**
 * Runs an axe accessibility scan on the current page.
 *
 * Attaches to the test result:
 *  - Annotation with pass/fail summary (top of test detail)
 *  - Viewport screenshot for visual context
 *  - Styled HTML report with per-violation cards (renders inline in Playwright report)
 *  - Raw axe-results.json for programmatic use / archiving
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {Object} [axeOptions={}] Per-URL option overrides
 * @returns {Promise<import('axe-core').Result[]>} Array of violations
 */
async function runAxeScan(page, testInfo, axeOptions = {}) {
  const options = mergeAxeOptions(axeOptions);

  let builder = new AxeBuilder({ page }).withTags(options.tags);

  for (const selector of options.exclude) {
    builder = builder.exclude(selector);
  }

  if (options.disableRules.length > 0) {
    builder = builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();
  const { violations, passes, incomplete } = results;

  const counts = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious:  violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor:    violations.filter((v) => v.impact === 'minor').length,
  };

  // Annotation — appears at the top of the test detail page before the errors list
  testInfo.annotations.push({
    type: violations.length === 0 ? 'a11y PASS' : 'a11y FAIL',
    description:
      violations.length === 0
        ? `No violations. ${passes.length} rules passed.`
        : `${violations.length} violation(s) — ${counts.critical} critical, ${counts.serious} serious, ${counts.moderate} moderate, ${counts.minor} minor`,
  });

  // Viewport screenshot for visual context
  const screenshot = await page.screenshot({ fullPage: false });
  await testInfo.attach('screenshot.png', { body: screenshot, contentType: 'image/png' });

  // Styled HTML report — renders inline in the Playwright HTML report
  await testInfo.attach('accessibility-report.html', {
    body: buildHtmlReport(violations, page.url(), passes, incomplete),
    contentType: 'text/html',
  });

  // Raw JSON for programmatic use / archiving
  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  return violations;
}

/**
 * Asserts page accessibility based on violation impact level.
 *
 * Uses soft assertions — one per critical/serious violation — so each failing
 * rule appears as a separately named error entry in the Playwright HTML report.
 * The label shows impact, rule ID, description, element count, and help URL.
 * Moderate/minor violations are logged to the console only (test still passes).
 *
 * Call this after runAxeScan() with the returned violations array.
 *
 * @param {import('axe-core').Result[]} violations
 * @param {string} [pageName] Optional page name for clearer console output
 */
function assertAccessibility(violations, pageName = '') {
  const failures = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const warnings = violations.filter((v) => v.impact === 'moderate' || v.impact === 'minor');

  // One soft assertion per critical/serious violation.
  // Each shows up as a separate named entry in the Playwright HTML report "Errors" section:
  //   [CRITICAL] color-contrast — Ensures contrast ratio... (3 elements affected)
  //   Help: https://dequeuniversity.com/...
  //   Expected: 0  Received: 3
  for (const violation of failures) {
    const label =
      `[${violation.impact.toUpperCase()}] ${violation.id} — ${violation.description}` +
      ` (${violation.nodes.length} element${violation.nodes.length === 1 ? '' : 's'} affected)` +
      `\nHelp: ${violation.helpUrl}`;

    expect.soft(violation.nodes.length, label).toBe(0);
  }

  // Log moderate/minor to console (do not fail the test)
  if (warnings.length > 0) {
    const label = pageName ? ` on "${pageName}"` : '';
    console.warn(`\n  ${warnings.length} moderate/minor warning(s)${label} (not failing):`);
    for (const v of warnings) {
      console.warn(`  [${v.impact.toUpperCase()}] ${v.id} — ${v.description}\n  Help: ${v.helpUrl}`);
    }
  }
}

module.exports = {
  DEFAULT_AXE_OPTIONS,
  mergeAxeOptions,
  runAxeScan,
  assertAccessibility,
};
