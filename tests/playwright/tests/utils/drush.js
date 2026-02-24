// drush.js
const { execSync } = require('child_process');

/**
 * Execute a Drush command in the appropriate environment.
 *
 * Automatically detects whether running locally (DDEV) or in CI (Terminus)
 * and executes the command accordingly.
 *
 * @param {string} command - The drush command to execute (without 'drush' prefix)
 * @param {Object} options - Execution options
 * @param {number} [options.timeout=30000] - Timeout in milliseconds (default: 30s)
 * @param {string} [options.format] - Output format ('json' for JSON parsing)
 * @returns {string|Object} - Command output (string or parsed JSON if format='json')
 * @throws {Error} - Throws error with stderr output if command fails
 *
 * @example
 * // Execute simple command
 * const output = executeDrush('status');
 *
 * @example
 * // Execute command with JSON output
 * const users = executeDrush('user:information --uid=1', { format: 'json' });
 *
 * @example
 * // Execute command with custom timeout
 * const result = executeDrush('cache:rebuild', { timeout: 60000 });
 *
 * @example
 * // Use in other specs
 * const { executeDrush } = require('../utils/drush');
 * const status = executeDrush('status --format=json', { format: 'json' });
 */
function executeDrush(command, options = {}) {
  const { timeout = 30000, format } = options;

  // Determine environment
  const isCI = process.env.CI === 'true' || process.env.CI === '1';
  const pantheonSite = process.env.PANTHEON_SITE;
  const pantheonEnv = process.env.PANTHEON_ENV;

  // Build the full command
  let fullCommand;
  if (isCI) {
    fullCommand = `terminus drush ${pantheonSite}.${pantheonEnv} -- ${command}`;
  } else {
    fullCommand = `ddev drush ${command}`;
  }

  // Log the command being executed
  console.log(`Executing: ${fullCommand}`);

  try {
    // Execute the command
    const output = execSync(fullCommand, {
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });

    // Parse JSON if requested
    if (format === 'json') {
      // Extract JSON from output (Terminus adds messages like [success] before/after JSON)
      // Find the first line that starts with { (JSON object) or a [ that's followed by { or " (JSON array)
      const lines = output.split('\n');
      let jsonStartLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Look for line starting with { (JSON object start)
        if (trimmed.startsWith('{')) {
          jsonStartLine = i;
          break;
        }
        // Look for line starting with [ but NOT [word] (to avoid [success], [notice], etc.)
        if (trimmed.match(/^\[\s*[\{\"]/)) {
          jsonStartLine = i;
          break;
        }
      }

      if (jsonStartLine === -1) {
        throw new Error(`No valid JSON found in output: ${output}`);
      }

      // Get everything from the JSON start line onwards
      let jsonText = lines.slice(jsonStartLine).join('\n');

      // Remove any trailing [notice] or [error] messages after the JSON
      // Find the last } or ] and trim everything after it
      const lastBrace = jsonText.lastIndexOf('}');
      const lastBracket = jsonText.lastIndexOf(']');
      const lastJsonChar = Math.max(lastBrace, lastBracket);

      if (lastJsonChar !== -1) {
        jsonText = jsonText.substring(0, lastJsonChar + 1);
      }

      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON output: ${parseError.message}\nExtracted JSON: ${jsonText}\nFull output: ${output}`);
      }
    }

    return output.trim();
  } catch (error) {
    // Throw error with detailed information
    const stderr = error.stderr ? error.stderr.toString() : '';
    const stdout = error.stdout ? error.stdout.toString() : '';
    const errorType = error.killed ? 'TIMEOUT' : (error.code || 'UNKNOWN');

    throw new Error(
      `Drush command failed: ${fullCommand}\n` +
      `Error type: ${errorType}\n` +
      `Exit code: ${error.status}\n` +
      `Signal: ${error.signal || 'none'}\n` +
      `Stdout: ${stdout}\n` +
      `Stderr: ${stderr}\n` +
      `Original error: ${error.message}`
    );
  }
}

module.exports = {
  executeDrush
};
