# Menu ARIA Controls

This JavaScript module enhances the accessibility of menus by dynamically
attaching ARIA (Accessible Rich Internet Applications) attributes and data
controls to menu items. It is designed to work seamlessly with Drupal's
behavior system, ensuring that ARIA attributes are correctly applied to menu
items for improved screen reader support and keyboard navigation.

## Features

- **Dynamic ARIA Attribute Assignment:** Automatically assigns `aria-haspopup`,
  `aria-controls`, and `aria-label` attributes to menu buttons to indicate the
  presence of submenus and their relationship to parent menu items.
- **Submenu Identification:** Utilizes a data attribute (`data-plugin-id`) on
  each button/span to generate unique IDs for submenus, facilitating the linkage
  between the button and its corresponding submenu.
- **Enhanced Screen Reader Support:** By correctly adding these ARIA attributes,
  this makes navigation through menus more intuitive for users relying on
  assistive technologies.

## How It Works

1. **Initialization:** The script is initialized through Drupal behaviors,
   targeting elements with the `.c-menu` class within the provided context.
2. **Control Attachment:**
   - **Buttons:** Finds all buttons with the class `menu__link` within the menu
     and attaches ARIA controls that allow them to
     toggle menus open/closed.
   - **Spans:** Supporting megamenus that have menu titles rather than buttons
     by default this finds all spans with the class `menu__link` within the menu
     and attaches data-menu-controls. Spans can not control menus open/closed
     since they can not be interacted with, those submenus are always open.
3. **Attribute Assignment:**
   - **ID Assignment:** Each submenu is assigned a unique ID in the format
     `panel-{id}`.
   - **ARIA Controls:** The `aria-controls` attribute is set on the button to
     link it to the submenu.
   - **ARIA Label:** The `aria-label` attribute is set on the button based on
     its text content.
   - **Data Controls:** The `data-menu-controls` attribute is set on the
     button/span for relationship linkage.

## Usage

This module is automatically attached to Drupal behaviors and requires no
additional initialization.

### Example

If you are not leveraging spans but instead have changed them to be other
non-interactive elements such as headers,
you would update the JavaScript to ensure the correct elements are being
attached.

```javascript
// Find menu headers for megamenu items
const headers = menu.querySelectorAll(':scope h2.menu__link');
```
