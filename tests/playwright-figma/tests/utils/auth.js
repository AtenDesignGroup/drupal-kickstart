// auth.js
const crypto = require('crypto');
const { executeDrush } = require('./drush');
const config = require('../../playwright.config');

const BASE_URL = config.use.baseURL;

/**
 * Validate that the specified roles exist in Drupal.
 *
 * @param {string[]} roles - Array of role machine names to validate
 * @throws {Error} - Throws if any role is invalid with drush output
 *
 * @example
 * validateRoles(['editor', 'content_manager']);
 */
async function validateRoles(roles) {
  const roleList = executeDrush('role:list --format=json', { format: 'json' });
  const validRoles = Object.keys(roleList);

  const invalidRoles = roles.filter(role => !validRoles.includes(role));

  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid role(s): ${invalidRoles.join(', ')}\n` +
      `Valid roles are: ${validRoles.join(', ')}`
    );
  }
}

/**
 * Get all user IDs that have the specified roles.
 *
 * @param {string[]} roles - Array of role machine names ('authenticated' is ignored in SQL query)
 * @returns {number[]} - Array of user IDs with matching roles
 *
 * @example
 * const uids = getUsersByRoles(['editor', 'team']);
 */
function getUsersByRoles(roles) {
  // Filter out 'authenticated' unless it's the ONLY role (in which case we want users with no additional roles)
  const dbRoles = roles.filter(role => role !== 'authenticated');

  let uids;

  // Special case: if only 'authenticated' role specified, find users with no roles in user__roles table
  if (dbRoles.length === 0 && roles.includes('authenticated')) {
    // Find active users who have no entries in user__roles table (only authenticated role)
    const sqlQuery = `SELECT ufd.uid FROM users_field_data ufd LEFT JOIN user__roles ur ON ufd.uid = ur.entity_id WHERE ufd.status = 1 AND ur.entity_id IS NULL AND ufd.uid > 0`;

    let uidsOutput;
    try {
      uidsOutput = executeDrush(`sql:query "${sqlQuery}"`);
    } catch (error) {
      return [];
    }

    uids = uidsOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && /^\d+$/.test(line));
  } else {
    // Normal case: query for users with the specified roles (ignoring authenticated)
    const roleConditions = dbRoles.map(role => `'${role}'`).join(', ');
    const sqlQuery = `SELECT ur.entity_id FROM user__roles ur INNER JOIN users_field_data ufd ON ur.entity_id = ufd.uid WHERE ur.roles_target_id IN (${roleConditions}) AND ufd.status = 1 GROUP BY ur.entity_id HAVING COUNT(DISTINCT ur.roles_target_id) = ${dbRoles.length}`;

    let uidsOutput;
    try {
      uidsOutput = executeDrush(`sql:query "${sqlQuery}"`);
    } catch (error) {
      return [];
    }

    uids = uidsOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && /^\d+$/.test(line));
  }

  // Return UIDs as array of numbers
  return uids.map(uid => parseInt(uid));
}

/**
 * Get a random user ID that has the exact set of specified roles.
 *
 * @param {string[]} roles - Array of role machine names (must match exactly)
 * @returns {number} - User ID
 * @throws {Error} - Throws if no users found with exact roles
 *
 * @example
 * const uid = await getRandomUserByRoles(['editor', 'authenticated']);
 */
async function getRandomUserByRoles(roles) {
  await validateRoles(roles);

  const uids = getUsersByRoles(roles);

  if (uids.length === 0) {
    throw new Error(
      `No users found with roles: ${roles.join(', ')}\n` +
      `Create a user with these roles or adjust the test configuration.`
    );
  }

  // Select random user ID
  const randomUid = uids[Math.floor(Math.random() * uids.length)];
  return randomUid;
}

/**
 * Create a temporary test user with specified roles.
 *
 * @param {string[]} roles - Array of role machine names to assign
 * @returns {number} - Created user ID
 * @throws {Error} - Throws if user creation fails
 *
 * @example
 * const uid = await createTestUser(['editor', 'authenticated']);
 */
async function createTestUser(roles) {
  await validateRoles(roles);

  // Generate unique username and secure password
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 9);
  const username = `pw_test_${timestamp}_${randomStr}`;
  const password = crypto.randomBytes(16).toString('hex');

  // Create the user with extended timeout for remote environments
  const createOutput = executeDrush(
    `user:create ${username} --password="${password}" --format=json`,
    { format: 'json', timeout: 60000 }
  );

  // Extract uid from output
  // Output format is {"uid": {...}} where the key is the UID
  const uidKey = Object.keys(createOutput)[0];
  const uid = parseInt(uidKey || createOutput[uidKey]?.uid);

  if (!uid) {
    throw new Error(`Failed to extract UID from user:create output: ${JSON.stringify(createOutput)}`);
  }

  // Assign roles with extended timeout
  for (const role of roles) {
    if (role !== 'authenticated') { // Skip authenticated as it's automatic
      executeDrush(`user:role:add ${role} ${username}`, { timeout: 60000 });
    }
  }

  console.log(`Created test user: ${username} (uid: ${uid}) with roles: ${roles.join(', ')}`);

  return uid;
}

/**
 * Generate a one-time login URL for the specified user.
 *
 * @param {number} uid - User ID
 * @returns {string} - One-time login URL
 * @throws {Error} - Throws if URL generation fails
 *
 * @example
 * const loginUrl = getOneTimeLoginUrl(1);
 */
function getOneTimeLoginUrl(uid) {
  const output = executeDrush(`uli --uid=${uid} --uri=${BASE_URL}`);

  // Extract URL from output (uli returns the URL directly)
  const url = output.trim();

  if (!url.startsWith('http')) {
    throw new Error(`Failed to generate one-time login URL. Output: ${output}`);
  }

  return url;
}

/**
 * Login as the specified user using a one-time login link.
 *
 * @param {Object} page - Playwright page object
 * @param {number} uid - User ID to login as
 * @throws {Error} - Throws if login fails
 *
 * @example
 * await loginAsUser(page, 1);
 */
async function loginAsUser(page, uid) {
  const loginUrl = getOneTimeLoginUrl(uid);

  console.log(`Logging in as user ${uid}`);

  // Navigate to one-time login URL
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

  console.log(`Successfully logged in as user ${uid}`);
}

/**
 * Delete a test user and their content.
 *
 * @param {number} uid - User ID to delete
 * @throws {Error} - Throws if deletion fails
 *
 * @example
 * await deleteTestUser(123);
 */
async function deleteTestUser(uid) {
  console.log(`Deleting test user ${uid}`);

  executeDrush(`user:cancel ${uid} --delete-content -y`);

  console.log(`Deleted test user ${uid}`);
}

module.exports = {
  validateRoles,
  getUsersByRoles,
  getRandomUserByRoles,
  createTestUser,
  getOneTimeLoginUrl,
  loginAsUser,
  deleteTestUser
};
