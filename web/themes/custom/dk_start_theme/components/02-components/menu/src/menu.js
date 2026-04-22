import { Menubar } from '@jldust/accessible-menu';

((Drupal, once) => {
  /**
   * Initializes an accessible menu component using the @jldust/accessible-menu package.
   *
   * The function takes a menu wrapper element and configures the npm package
   * with data attributes from the Twig template while maintaining current CSS structure.
   *
   * @param {HTMLElement} wrapper - The menu wrapper element containing the menu structure
   */
  const initAccessibleMenu = async (wrapper) => {
    // Extract configuration from data attributes set by Twig template
    const mobileBreakpoint = parseInt(
      wrapper.getAttribute('data-breakpoint') || '768',
    );
    const mobileControlAttribute = wrapper.getAttribute('data-mobile');
    const mobileControlId = mobileControlAttribute
      ? mobileControlAttribute.replace('#', '')
      : null;

    // Configure the menubar with current CSS classes to avoid style changes
    const menuConfig = {
      menuSelector: '.c-menu',
      buttonClass: 'menu__button',
      linkClass: 'menu__link',
      itemClass: 'menu__item',
      mobileBreakpoint: mobileBreakpoint,
    };

    // Add mobile control ID if specified in data-mobile attribute.
    if (mobileControlId) {
      menuConfig.mobileControlId = mobileControlId;
    }

    try {
      // Initialize the menubar for this specific menu container.
      const menu = new Menubar(menuConfig);
      await menu.init();
    } catch (error) {
      console.warn('Failed to initialize accessible menu:', error);
    }
  };

  Drupal.behaviors.menuControl = {
    attach(context) {
      const menus = once('menuControl', '.c-menu', context);

      menus.forEach((menuContainer) => {
        initAccessibleMenu(menuContainer);
      });
    },
  };
})(Drupal, once);
