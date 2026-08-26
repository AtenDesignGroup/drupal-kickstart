import { test, expect } from './fixtures';

test.describe('Content Type - Basic Page', () => {
  test('Create page', async ({ administratorPage }) => {
    await administratorPage.goto('/node/add/page');

    // Fill in the news article title and body
    await administratorPage.locator('#edit-title-0-value').fill('Your Text');

    await administratorPage.getByLabel('Revision log message').scrollIntoViewIfNeeded();
    await administratorPage.getByLabel('Revision log message').fill('Created a test page for visual regression testing.');
    await administratorPage.getByLabel('Revision log message').press('Tab');
    await administratorPage.getByLabel('Revision log message').press('Enter');


    await administratorPage.locator('#gin-sticky-edit-submit').waitFor({ state: 'visible' });
    await administratorPage.locator('#gin-sticky-edit-submit').click();

    // Save navigates to the node view URL; wait for it to confirm the article was created.
    await administratorPage.waitForURL(/\/node\/\d+$/);
    await expect(administratorPage).toHaveTitle(/Your Text/);
    
  });
});
