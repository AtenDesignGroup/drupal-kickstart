---
applyTo: "**/modules/custom/**/*.js,**/themes/custom/**/*.js"
---
# Drupal JavaScript Standards

## Core Guidelines
- Use IIFE to avoid global scope pollution
- Follow functional programming principles
- Avoid jQuery/$(). Use native DOM methods
- Use `const`/`readonly` for immutability
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Follow `web/core/.eslint.json` rules

## DOM Selection
- Use `once` to prevent redundant binding
- Prefer `data-*` and `aria-*` attributes over classes
- Use `.js-` prefix for class selectors
- Avoid IDs. Use `[data-drupal-selector="name"]` or `[id^="prefix-"]`
- If needed, use `document.getElementById()` for stable IDs

## Naming
- Use descriptive camelCase names (`formElement` not `el`)
- Name DOM elements by purpose (`buttonElement`, `inputElement`)
- Event handlers: `onEventName`, `onAction` or `onEventNewState` (e.g., `onClick`, `onToggle`, `onOpen`)
- Functions that return booleans or filter: `isConditionMet` or `hasState` (e.g., `isValid`, `hasImage`)
- Functions that return elements: `getElementName` (e.g., `getFormElement`, `getButton`)
- Functions that make a request: `fetchDataType` (e.g., `fetchUser`, `fetchUsers`)
- Functions that sort: `byPropertyDirection` (e.g., `byNameAsc`, `byDateDesc`)

## Drupal Behaviors
- Use `context` for AJAX compatibility
- Use `drupalSettings` for PHP→JS data
- Keep `attach`/`detach` methods focused
- Always implement `detach` for cleanup
- Use `once('key', selector, context)` inside `attach` to prevent duplicate binding on AJAX re-renders
- In `detach`, use `once.remove('key', selector, context)` to reverse `once` registration
- The `detach` method receives a `trigger` argument (`'unload'`, `'serialize'`, `'move'`); guard on `trigger === 'unload'` for teardown work that should only run when the element is removed

```javascript
(($, Drupal, once) => {
  Drupal.behaviors.myBehavior = {
    attach(context, settings) {
      once('my-behavior', '.js-my-element', context).forEach((element) => {
        element.addEventListener('click', onToggle);
      });
    },

    detach(context, settings, trigger) {
      if (trigger !== 'unload') return;

      once.remove('my-behavior', '.js-my-element', context).forEach((element) => {
        element.removeEventListener('click', onToggle);
      });
    },
  };

  /**
   * Handles the toggle click event.
   *
   * @param {MouseEvent} event
   */
  function onToggle(event) {
    // ...
  }
})(jQuery, Drupal, once);
```

## Classes
- Use ES6 classes for reusable components that require state
- Use one class per file
- If a class is not reusable, use a function instead
- If a class deals with an element, add the class instance as a property on that element (e.g. `new TableOfContents(navElement)` should result in `navElement.tableOfContents = this;`)

## Return Values
- Functions that accept elements as parameters should return the element for chaining

## Translation
- Wrap strings in `Drupal.t()`
- Use `Drupal.formatPlural()` for plurals

## Documentation
- Use JSDoc for ALL functions
- Use `//` for inline comments, `/** */` for blocks
- Remove unused code instead of commenting it out

## User Messages
- Use the Drupal Messages API for user feedback
- Types: `status`, `warning`, `error`
- Follow accessibility practices
- Clear outdated messages

```javascript
const messages = new Drupal.Message();

// Add a message
messages.add(Drupal.t('Success'), { type: 'status' });

// Clear messages of a specific type
messages.clear('status');

// Clear all messages
messages.clear();
```
