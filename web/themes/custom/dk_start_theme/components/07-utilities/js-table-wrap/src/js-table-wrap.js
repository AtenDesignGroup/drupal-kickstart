/**
 * @file
 * Utilities - Table Wrap
 */

/**
 * A utility class to wrap a table element with a `div` element for further styling
 * or functionality.
 */
class TableWrap {
  constructor(element) {
    this.element = element;
    this.mount();
  }

  /**
   * Mounts the table element by wrapping it in a newly created `div` element with the class
   * `js-table-wrapper`. The wrapper is inserted into the DOM before the current element and the
   * current element is appended as a child of the wrapper.
   *
   * @return {void} Does not return any value.
   */
  mount() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('js-table-wrapper');
    this.element.before(wrapper);
    wrapper.appendChild(this.element);
  }
}

((Drupal, once) => {
  Drupal.behaviors.tableWrap = {
    attach(context) {
      const tables = once('dk_start_theme-table', 'table', context);
      tables.forEach((table) => new TableWrap(table));
    },
  };
})(Drupal, once);
