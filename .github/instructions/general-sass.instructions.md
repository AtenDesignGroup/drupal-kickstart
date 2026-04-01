---
applyTo: "*.scss"
---
# General SCSS Standards

## Core Guidelines
- Use `@use` and `@forward` for importing SCSS files
- DO NOT use the `@extend` directive
- DO NOT use the `@import` directive
- Always use CSS logical properties and values (e.g., `inline-size` instead of `width`, `margin-inline` instead of `margin-left`/`margin-right`, `padding-block` instead of `padding-top`/`padding-bottom`).

## Compiling
- DDEV provides commands for working withe theme assets:
-- `ddev theme-build`: One time build of theme assets.
-- `ddev theme-watch`: Starts a watcher for theme assets.
- ALWAYS opt to use the DDEV commands over local npm/npx commands.

## Nesting
- Keep nesting to minimum.
- use `&` for native nesting compatibility.
- Only nest descendant and psuedo selectors.
- Write full selectors.
- DO NOT use `&--` or `&__` to concatenate selectors.
- DO NOT group selectors inside media or container queries. Nest queries within selectors.
- Use a mobile-first approach. Write base styles for small screens, then layer on overrides for larger sizes.
- Always use the theme's breakpoint mixins instead of writing raw `@media` queries. Available mixins:
  - `@include bp-min(tablet) {}` — applies at and above the given breakpoint
  - `@include bp-max(tablet) {}` — applies below the given breakpoint
  - `@include bp-between(sm-tablet, desktop) {}` — applies between two breakpoints
  - `@include bp-only(tablet) {}` — applies only within a single breakpoint range
- Breakpoint names are defined per project in the theme's `_breakpoints.scss`. Always check that file for the available named breakpoints before using a mixin.

```scss
// Do this...
.c-item {
  display: block;

  @include bp-min(tablet) {
    display: flex;
  }
}

// Not this...
.c-item {
  display: block;

  @media (min-width: 768px) {
    display: flex;
  }
}
```

```scss
// Do this...
.c-item__element1 {
  @container () {}
}
.c-item__element2 {
  @container () {}
}

// Not this...
@container () {
  .c-item__element1 {}
  .c-item__element2 {}
}
```

- Group element selectors by modifier. Place modifier selectors with their child elements together.

```scss
// Do this...
.c-item--modifier {
  .c-item__element1 {}
  .c-item__element2 {}
}

// Not this...
.c-item__element1 {
  .c-item--modifier & {}
}
.c-item__element2 {
  .c-item--modifier & {}
}
```

## Custom Properties
- Always prefix custom properties with the theme's machine name.
- Custom properties should be defined in `:root {}` by default.

```scss
// Do this...
:root {
  --mytheme-color-primary: #000;
  --mytheme-spacing-md: 1rem;
}

// Not this...
:root {
  --color-primary: #000;
  --spacing-md: 1rem;
}
```

- Component-scoped custom properties should still be defined in `:root {}`, within that component's Sass file. Prefix them with both the theme name and component name.

```scss
// In _c-item.scss
:root {
  --mytheme-c-item-gap: 1rem;
  --mytheme-c-item-color: #000;
}

.c-item {
  gap: var(--mytheme-c-item-gap);
  color: var(--mytheme-c-item-color);
}
```

## Property Order
- Order style properties alphabetically.
- Within a selector, group in this order: custom properties, then Sass `@include`s, then style properties.
- This grouping applies to **value-outputting mixins** — mixins that render a single declaration or a fixed set of properties (e.g., a typography or visually-hidden mixin).
- **Block-content mixins** (mixins that accept `@content`, like breakpoint mixins) are exempt from this grouping. Place them after all standard style properties, at the end of the selector.

```scss
.c-item__element {
  // Custom properties.
  --item-element-prop: foo;

  // Value-outputting includes.
  @include visually-hidden();

  // Style properties (alphabetical).
  color: red;
  display: block;
  margin: 0;

  // Block-content includes (e.g. breakpoints) go last.
  @include bp-min(tablet) {
    display: flex;
  }
}
```
