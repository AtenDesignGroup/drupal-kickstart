import { test as teardown } from '@playwright/test';
import path from 'path';
import fs from 'fs';

declare const require: any;
const { deleteTestUser } = require('../utils/auth');

const USERS_FILE = path.join(__dirname, '../../.auth/users.json');

/**
 * Delete the Drupal users created by auth.setup.ts and remove the UIDs file.
 * Runs automatically after all dependent projects have finished.
 */
teardown('delete test users', async () => {
  if (!fs.existsSync(USERS_FILE)) {
    console.log('No users file found — skipping teardown.');
    return;
  }

  const uids: Record<string, number> = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));

  for (const [role, uid] of Object.entries(uids)) {
    console.log(`Deleting test user for role: ${role} (uid: ${uid})`);
    await deleteTestUser(uid);
  }

  fs.rmSync(USERS_FILE);
});
