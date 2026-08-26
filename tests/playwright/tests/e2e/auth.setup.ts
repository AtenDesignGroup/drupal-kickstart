import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

declare const require: any;
const { createTestUser, loginAsUser } = require('../utils/auth');

const AUTH_DIR = path.join(__dirname, '../../.auth');
const USERS_FILE = path.join(AUTH_DIR, 'users.json');

const ROLES = [
  { role: 'content_editor', file: path.join(AUTH_DIR, 'content-editor.json') },
  { role: 'administrator', file: path.join(AUTH_DIR, 'administrator.json') },
] as const;

/**
 * Create one Drupal user per role, log each in via a one-time login link, and
 * save their browser storage state to .auth/<role>.json for reuse across tests.
 * UIDs are written to .auth/users.json so auth.teardown.ts can delete them.
 */
setup('create and authenticate test users', async ({ browser }) => {
  // Creating users via drush + navigating OTL pages can take well over 30 s.
  setup.setTimeout(120_000);

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const httpCredentials = process.env.AUTH_USERNAME
    ? { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD ?? '' }
    : undefined;

  const uids: Record<string, number> = {};

  for (const { role, file } of ROLES) {
    const uid = await createTestUser([role]);
    uids[role] = uid;

    // Each user gets a fresh context to avoid session conflicts between roles.
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      ...(httpCredentials && { httpCredentials }),
    });
    const page = await context.newPage();

    await loginAsUser(page, uid);
    await context.storageState({ path: file });
    await context.close();
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(uids, null, 2));
});
