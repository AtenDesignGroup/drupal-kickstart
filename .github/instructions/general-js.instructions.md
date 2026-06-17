---
applyTo: "**/themes/custom/**/*.js"
---
# General JavaScript Standards

## Core Guidelines
- Follow functional programming principles
- Avoid jQuery/$(). Use native DOM methods
- Use `const`/`readonly` for immutability
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## DOM Selection
- Prefer `data-*` and `aria-*` attributes over classes
- Use `.js-` prefix for class selectors
- If needed, use `document.getElementById()` for stable IDs

## Naming
- Use descriptive camelCase names (`formElement` not `el`)
- Name DOM elements by purpose (`buttonElement`, `inputElement`)
- Event handlers: `onEventName`, `onAction` or `onEventNewState` (e.g., `onClick`, `onToggle`, `onOpen`)
- Functions that return booleans or filter: `isConditionMet` or `hasState` (e.g., `isValid`, `hasImage`)
- Functions that return elements: `getElementName` (e.g., `getFormElement`, `getButton`)
- Functions that make a request: `fetchDataType` (e.g., `fetchUser`, `fetchUsers`)
- Functions that sort: `byPropertyDirection` (e.g., `byNameAsc`, `byDateDesc`)

## Classes
- Use ES6 classes for reusable components that require state
- Use one class per file
- If a class is not reusable, use a function instead
- If a class deals with an element, add the class instance as a property on that element (e.g. `new TableOfContents(navElement)` should result in `navElement.tableOfContents = this;`)

## Return Values
- Functions that accept elements as parameters should return the element for chaining

## Documentation
- Use JSDoc for ALL functions
- Use `//` for inline comments, `/** */` for blocks
- Remove unused code instead of commenting it out
