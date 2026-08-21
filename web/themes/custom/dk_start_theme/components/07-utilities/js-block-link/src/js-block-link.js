/**
 * @file
 * Enhances block elements with the `.js--block-link` class and relevant data attributes
 * to behave as clickable links.
 *
 * This behavior allows users to click anywhere on a block to navigate to a URL
 * specified in the `data-href` attribute, while ensuring that internal `<a>` links
 * still function normally. It also respects command/ctrl-click for opening in a new tab.
 */

((Drupal, once) => {
  /**
   * Handles clicks on elements with the `.js--block-link` class.
   *
   * If the clicked element (or its closest parent) contains `data-href`,
   * the browser navigates to that URL. The function respects:
   * - Internal `<a>` links (which function as normal).
   * - Command/ctrl-click behavior for opening links in a new tab.
   * - The `data-target="_blank"` attribute for forcing new tab behavior.
   *
   * @param {MouseEvent} event - The click event.
   */
  function handleBlockLinkClick(event) {
    const blockLinkElement = event.target.closest('.js--block-link');
    if (!blockLinkElement) return;

    // Allow internal <a> links to function as normal.
    if (event.target.tagName === 'A') return;

    const href = blockLinkElement.getAttribute('data-href');
    const dataTarget = blockLinkElement.getAttribute('data-target');

    if ((event.metaKey && href) || dataTarget === '_blank') {
      window.open(href, '_blank');
    } else if (href) {
      window.location.href = href;
    }
  }

  Drupal.behaviors.blockLink = {
    attach() {
      once('blockLink', 'body').forEach((element) => {
        element.addEventListener('click', handleBlockLinkClick);
      });
    },
  };
})(Drupal, once);
