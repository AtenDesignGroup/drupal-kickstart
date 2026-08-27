import { test as base, type Page } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.join(__dirname, '../../.auth');

export const CONTENT_EDITOR_FILE = path.join(AUTH_DIR, 'content-editor.json');
export const ADMIN_FILE = path.join(AUTH_DIR, 'administrator.json');

type AuthFixtures = {
  /** Page authenticated as a content editor. */
  contentEditorPage: Page;
  /** Page authenticated as an administrator. */
  administratorPage: Page;
  /** Unauthenticated browsing context. */
  anonPage: Page;
};

function sharedContextOptions(baseURL: string | undefined) {
  const httpCredentials = process.env.AUTH_USERNAME
    ? { username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD ?? '' }
    : undefined;

  return {
    baseURL,
    ignoreHTTPSErrors: true,
    ...(httpCredentials && { httpCredentials }),
  };
}

export const test = base.extend<AuthFixtures>({
  contentEditorPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      storageState: CONTENT_EDITOR_FILE,
      ...sharedContextOptions(baseURL),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  administratorPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      storageState: ADMIN_FILE,
      ...sharedContextOptions(baseURL),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  anonPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      ...sharedContextOptions(baseURL),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
