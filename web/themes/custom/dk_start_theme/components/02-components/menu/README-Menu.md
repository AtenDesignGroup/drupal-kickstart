# Menu Component

This Menu Component is a JavaScript module designed to enhance the navigation
experience for all users, including those using assistive technologies. This
component focuses on improving the accessibility of menu links within a
navigation menu, providing keyboard navigation support and managing focus among
menu items. By default this component supports basic menus leveraging the Drupal
menu system.

## Features

- **Keyboard Navigation:** Supports arrow keys, tab, and escape key interactions
  within the menu, allowing users to navigate through menu items using their
  keyboard.
- **Focus Management:** Ensures that focus is managed correctly within the menu,
  enhancing usability for keyboard and screen reader users.
- **Drupal Integration:** Designed to integrate with Drupal behaviors, making it
  easy to include and initialize as part of any Drupal theme.

## Classes

### MenuLink Class (Base)

The `MenuLink` class serves as the base class for the component, attaching
essential functions to menu links. It is designed to handle basic keyboard
navigation and focus management.

#### Features:

- **Keyboard Navigation:** Implements basic keyboard navigation within the menu
  using arrow keys.
- **Focus Management:** Manages focus within the menu, ensuring a smooth
  navigation experience for keyboard users.

### MenuButton Class (Extends MenuLink)

The `MenuButton` class extends the `MenuLink` class, adding functionality
specific to menu buttons that control the `aria-expanded` of dropdown menus.

#### Features:

- **Dropdown Control:** Handles the opening and closing of dropdown menus,
  including managing the state of the dropdown button (e.g., `aria-expanded`
  attribute). Note: Styles actually dictate the visibility of menus not this
  functionality.
- **Enhanced Keyboard Support:** Adds support for handling space and enter keys
  to toggle the visibility of dropdown menus.

## How It Works

1. **Initialization:** The script is initialized through Drupal's behavior
   system, targeting elements with the `.c-menu` class within the provided
   context.
2. **Class Instantiation:** For each menu link, an instance of the `MenuLink` or
   `MenuButton` class is created, depending on whether the element controls a
   dropdown menu.
3. **Keyboard and Focus Management:** The instantiated classes manage keyboard
   interactions and focus within the menu, improving accessibility.
4. **Nested Menus:** Nested menus must have a `data-depth` attribute, their
   controller leverage the assigned aria-controls and that attribute to
   determine menus controls and keyboard support.

## Usage

To use this component, ensure that your menu elements have the appropriate
classes.

- `data-depth` on wrapper for dropdown menus is expected and required for the
  open/close effect.
- `.c-menu` for the menu container
- `menu__item` for wrapper elements on links, default is a `li` element.
- `menu__link` on `a` tags and `buttons`

This component is designed to work out-of-the-box with minimal configuration
unless specific structural changes need to be made for the menu.
