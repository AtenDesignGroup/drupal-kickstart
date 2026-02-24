// drupal.js
const { executeDrush } = require('./drush');

/**
 * Clear all Drupal caches.
 *
 * @param {Object} options - Options to pass to executeDrush
 * @returns {string} - Command output
 *
 * @example
 * // Use in any test spec
 * const { clearCache } = require('../utils/drupal');
 *
 * test('should display updated content after cache clear', async ({ page }) => {
 *   // Make some changes
 *   await clearCache();
 *   // Verify changes are visible
 * });
 */
function clearCache(options = {}) {
  return executeDrush('cache:rebuild', options);
}

/**
 * Run Drupal cron.
 *
 * @param {Object} options - Options to pass to executeDrush
 * @returns {string} - Command output
 *
 * @example
 * const { runCron } = require('../utils/drupal');
 *
 * test('should process queue items', async ({ page }) => {
 *   await runCron();
 *   // Verify cron tasks completed
 * });
 */
function runCron(options = {}) {
  return executeDrush('cron', options);
}

/**
 * Import Drupal configuration from sync directory.
 *
 * @param {Object} options - Options to pass to executeDrush
 * @returns {string} - Command output
 *
 * @example
 * const { importConfig } = require('../utils/drupal');
 *
 * test.beforeAll(async () => {
 *   // Ensure clean config state before tests
 *   await importConfig();
 * });
 */
function importConfig(options = {}) {
  return executeDrush('config:import -y', options);
}

/**
 * Export Drupal configuration to sync directory.
 *
 * @param {Object} options - Options to pass to executeDrush
 * @returns {string} - Command output
 *
 * @example
 * const { exportConfig } = require('../utils/drupal');
 *
 * test('should export config changes', async ({ page }) => {
 *   // Make config changes via UI
 *   await exportConfig();
 *   // Verify config files updated
 * });
 */
function exportConfig(options = {}) {
  return executeDrush('config:export -y', options);
}

module.exports = {
  clearCache,
  runCron,
  importConfig,
  exportConfig
};
