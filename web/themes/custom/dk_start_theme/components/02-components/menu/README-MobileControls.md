# Mobile Menu Controls

This JavaScript module is responsible for enhancing the mobile navigation
experience. It specifically targets menus with a `data-mobile` attribute,
allowing for distinct mobile menu behaviors across different menus on the same
page.

## Features

- **Selective Activation:** Only affects menus marked with the `data-mobile`
  attribute, enabling tailored behavior for each menu.
- **Dynamic Menu Management:** Provides functions for opening and closing
  mobile menus, including managing focus and resetting the state of dropdown
  sub-menus for improved usability and accessibility.
- **Integration with Drupal Behaviors:** Designed to integrate seamlessly with
  Drupal's behavior system, ensuring compatibility and easy deployment within
  Drupal themes.

## How It Works

1. **Initialization:** The script is automatically initialized by Drupal
   behaviors and targets menus with the `.c-menu[data-mobile]` selector within
   the given context.
2. **Functionality:**
   - **Close Mobile Menu (`closeMobile`):** Closes the mobile menu, manages
     focus back to the appropriate element, and resets dropdown sub-menus to
     their initial state.
   - **Mobile Menu Control (`mobileControl`):** Handles the logic for toggling
     the mobile menu's visibility.

## Usage

Include this script in your Drupal theme to enhance mobile navigation. Ensure
that your menus are marked with the `data-mobile` attribute to take advantage
of the mobile-specific controls provided by this module.
