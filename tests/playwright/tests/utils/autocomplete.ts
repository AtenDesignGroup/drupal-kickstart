import type { Locator } from '@playwright/test';

export interface SelectAutocompleteOptions {
  /** Milliseconds between each keypress. Default: 100 */
  typeDelay?: number;
  /** Timeout in ms to wait for the suggestion list. Default: 15000 */
  timeout?: number;
  /**
   * When true, concurrently awaits a Drupal entity_reference_autocomplete
   * XHR response while typing. Use for fields backed by remote entity data
   * where the network round-trip triggers the dropdown.
   */
  waitForEntityRef?: boolean;
}

/**
 * Type into a Drupal jQuery UI autocomplete field and click a matching suggestion.
 *
 * - Scrolls the input into view and focuses it so jQuery registers the widget.
 * - Uses `pressSequentially` (real key events) to trigger the autocomplete.
 * - Waits for the `ul.ui-autocomplete` dropdown containing `pickText` to become
 *   visible, then clicks the first matching `li.ui-menu-item`.
 *
 * @param input      - Locator for the autocomplete text input.
 * @param searchText - Text to type, triggering the autocomplete search.
 * @param pickText   - Suggestion to match and click. Defaults to a
 *                     case-insensitive regex built from `searchText`.
 * @param options    - Optional overrides.
 *
 * @example
 * // Basic usage — picks first suggestion matching /security/i
 * await selectAutocomplete(page.locator('#my-field'), 'security');
 *
 * @example
 * // Different search vs pick text (type 'cat', select 'Fair Housing Act')
 * await selectAutocomplete(page.locator('#my-field'), 'cat', /fair housing/i);
 *
 * @example
 * // Entity reference field backed by a remote AJAX source
 * await selectAutocomplete(page.locator('#my-field'), 'beaver', /beaver/i, {
 *   waitForEntityRef: true,
 *   typeDelay: 50,
 *   timeout: 5000,
 * });
 */
export async function selectAutocomplete(
  input: Locator,
  searchText: string,
  pickText: string | RegExp = new RegExp(searchText, 'i'),
  options: SelectAutocompleteOptions = {},
): Promise<void> {
  const { typeDelay = 100, timeout = 15000, waitForEntityRef = false } = options;
  const page = input.page();

  await input.scrollIntoViewIfNeeded();
  await input.focus();

  if (waitForEntityRef) {
    await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/entity_reference_autocomplete/') && r.status() === 200,
      ),
      input.pressSequentially(searchText, { delay: typeDelay }),
    ]);
  } else {
    await input.pressSequentially(searchText, { delay: typeDelay });
  }

  // jQuery UI hides stale menus with display:none but leaves them in the DOM.
  // Filtering with :visible ensures we only match the active open menu,
  // avoiding strict mode violations when multiple ul.ui-autocomplete exist.
  const menu = page.locator('ul.ui-autocomplete:visible').filter({ hasText: pickText });
  await menu.waitFor({ state: 'visible', timeout });
  await menu.locator('li.ui-menu-item').filter({ hasText: pickText }).first().click();
}
