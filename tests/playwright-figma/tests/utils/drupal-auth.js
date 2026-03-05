/**
 * Drupal Authentication Utilities for Visual Regression Testing
 *
 * Handles Drupal-specific authentication for VRT tests including:
 * - Login as specific user ID
 * - Login as random user with exact role match
 * - Create temporary test users with roles
 */

const { loginAsUser, createTestUser, getRandomUserByRoles } = require('./auth');

/**
 * Setup authentication for a test page.
 * Supports three Drupal authentication modes:
 * 1. Specific UID: Login as specific user ID
 * 2. Roles (exact match): Login as random existing user with exact roles
 * 3. Create User: Create temporary user with specified roles
 *
 * @param {Object} page - Playwright page object
 * @param {Object} [drupalAuthConfig] - Drupal authentication configuration
 * @param {number} [drupalAuthConfig.uid] - Specific user ID to login as
 * @param {string[]} [drupalAuthConfig.roles] - Array of roles for user lookup/creation
 * @param {boolean} [drupalAuthConfig.createUser] - Whether to create temporary user
 * @param {number[]} createdUsers - Array to track created user IDs for cleanup
 * @returns {Promise<void>}
 *
 * @example
 * // Login as admin (user 1)
 * await setupAuthentication(page, { uid: 1 }, createdUsers)
 *
 * @example
 * // Login as random user with exact role match
 * await setupAuthentication(page, { roles: ["authenticated", "editor"] }, createdUsers)
 *
 * @example
 * // Create temporary test user with roles
 * await setupAuthentication(page, { roles: ["authenticated", "content_manager"], createUser: true }, createdUsers)
 *
 * @example
 * // Skip authentication (anonymous)
 * await setupAuthentication(page, null, createdUsers)
 */
async function setupAuthentication(page, drupalAuthConfig, createdUsers) {
  // Skip authentication if no config provided
  if (!drupalAuthConfig) {
    return;
  }

  const { uid, roles, createUser } = drupalAuthConfig;

  // Skip if no auth properties specified
  if (!uid && !roles) {
    return;
  }

  let authenticateUid;

  if (uid) {
    // Mode 1: Login as specific user ID
    authenticateUid = uid;
  } else if (createUser && roles) {
    // Mode 2: Create temporary user with specified roles
    authenticateUid = await createTestUser(roles);
    createdUsers.push(authenticateUid);
  } else if (roles) {
    // Mode 3: Login as random user with exact role match
    authenticateUid = await getRandomUserByRoles(roles);
  }

  if (authenticateUid) {
    await loginAsUser(page, authenticateUid);
  }
}

module.exports = {
  setupAuthentication
};
