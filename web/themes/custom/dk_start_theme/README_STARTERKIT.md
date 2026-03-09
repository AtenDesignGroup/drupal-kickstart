## Contents of this file

- [About](#about)
- [Requirements](#requirements)
- [Installation](#installation)
- [Use / Commands](#use--commands)
- [Configuration](#configuration)
- [Theme Structure](#theme-structure)
  - [`/`](#root-)
  - [`/components`](#components-components)
  - [`/config`](#drupal-configuration-config)
  - [`/images`](#images-images)
  - [`/partials`](#partials-partials)
  - [`/templates`](#templates-templates)
  - [`/vendor`](#vendor-vendor)
- [Styling Approach](#styling-approach)
  - [`px` vs `rem` vs `em`](#px-vs-rem-vs-em)
  - [Components](#components)
  - [Attributes](#attributes)
  - [Class Namespaces](#class-namespaces)
    - [`.c-` Component](#-c--component)
    - [`.l-` Layout](#-l--layout)
    - [`.u-` Utility](#-u--utility)
    - [`.t-` Theme](#-t--theme)
    - [`.js-`JavaScript Behavior](#-js--javascript-behavior)
    - [`is-, not-, has-, no-` State](#is--not--has--no--state)
  - [Custom Properties](#custom-properties)
  - [Colors](#colors)
  - [Spacing](#spacing)
  - [Typography](#typography)
- [SCSS Tools](#scss-tools)
- [CKEditor 5 Support](#ckeditor-5-support)
- [Menu Structure](#menu-structure)

## About

The files and directories of this theme are meant to use components as the
base philosophy for building websites.

All the build tools are set up in a way so that developers working on this
project are utilizing the same global assets and versions, file compilation is
easy to get started with and compilation itself is fast and efficient.

## Requirements

To use this theme you need to install & enable these modules in advance, if they
are not installed you are likely to run into a white screen of death (WOD).

- [Single Directory Components (sdc)](https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components) (Drupal Core 10.3 +)
- [Twig Field Value](https://www.drupal.org/project/twig_field_value) (2.x)
- [Twig Tweak](https://www.drupal.org/project/twig_tweak) (3.x)

This theme and its build tools require the following local development tools:

- [Node.js](https://nodejs.org/en/)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [NVM](https://github.com/nvm-sh/nvm/blob/master/README.md)

## Installation

1. Before installing any node modules, first be sure you are using the defined
   version of Node for this project. The following command requires the tool NVM
   Node package manager. If you do not have the recommended version of Node
   installed on your computer, NVM will prompt you to download and install the
   correct version -- `nvm use`
2. Once you are using the recommended version of Node, you may install all Node
   modules defined in the package.json file -- `npm install`
3. **Build assets**: Run `npm run build` to compile CSS and JavaScript from
   source files. This step is required before the theme will work correctly.
4. To correctly utilize Browsersync, copy the `.env-example` file and
   rename it `.env`. Within this file specify both your local website address
   and default browser.

### Developer Workflow for Source Changes

**Important**: Compiled CSS and JavaScript files are not committed to the
repository. They are built by GitLab CI for drupal.org releases.

When making changes to styles or scripts:

1. **During development**: Use `npm run watch` to automatically recompile on
   changes (includes BrowserSync for live reload)
2. **Source files only**: Make your changes in `components/**/src/` directories
   (`.scss` and `.js` files)
3. **Test locally**: Run `npm run build` to create production-ready assets
   for testing
4. **Commit source only**: Only commit source files in `components/**/src/`
   directories, never the compiled `.css` and `.js` files
5. **CI handles packaging**: GitLab CI automatically builds assets and includes
   them in theme releases

**Available Build Commands**:

- `npm run watch` - Development mode with file watching and BrowserSync
- `npm run build` - Production build with minification (use before testing)
- `npm run clean` - Remove all compiled CSS/JS files

**Git Workflow**:

- Node modules (`node_modules/`) are git-ignored
- Compiled assets (`components/**/*.css`, `components/**/*.js`) are git-ignored
- After pulling changes that modify `package.json` or `package-lock.json`, run
  `npm install`
- After pulling any changes, run `npm run build` to regenerate local assets

**TODO**: Consider implementing a git pre-commit hook to prevent accidentally
committing build files.

## Use / Commands

**Local Development**

In order to watch file changes and compile files during local development,
input the following command and allow both
Gulp and Webpack to watch for changes and/or additions to the libraries
directory. -- `npm run watch`

**Production**

When local development is finished and ready to be pushed to a remote
environment, build and minify all files, readying
all assets for production. In order to minify and optimize all files
and assets, run the following command.
-- `npm run build`

## Configuration

### Browser Support

This theme uses PostCSS and Babel to provide cross-browser support for newer
CSS and JS features. Both of these tools rely upon the following files for
configuration and settings.

- `.browserslistrc` - This file contains instructions to other modules like
  Babel & PostCSS on what browsers to support when transpiling frontend assets.
  Currently, DkStartTheme is supporting the last 4 versions (`last 4 versions`) of
  any browser that more than 0.5% of the population is using (`> .5%`) and still
  supported (`not dead`). See the [Browserlist documentation](#browserlist) for
  important information about keeping your browserlist up to date.

- `postcss.config.js` - This file contains all settings, overrides and extra
  plugins for the PostCSS module, including PostCSS Preset Env and PostCSS
  Inline SVG, as [detailed below]().

- `babel.config.js` - This file contains all settings, overrides and extra
  plugins for the Babel module, as well as settings for caching JavaScript
  in Babel.

#### Browserlist

To update your browserlist usage database: `npx update-browserslist-db@latest`

To see which browsers your build is supporting:

```
npx browserslist
```

### PostCSS Inline SVG

DkStartTheme now offers an easy way to inject inline SVG's into your CSS. In order
to take advantage of the PostCSS Inline SVG plugin, simple utilize the
predefined function from this plugin, with path the to the SVG and any inline
styles that you need to add.

- Example: `background-image: svg-load('image.svg');`
- Example: `mask-image: svg-load('icons/arrow.svg');`
- Example: `background-image: svg-load('image.svg', fill=#000000);`

The svg filename is relative to the directories defined in the `paths` option
for the `postCSSInlineSvg` plugin in the `postcss.config.js` file. The default
path is `/images` in this theme.

See the PostCSS Inline SVG [documentation](https://github.com/TrySound/postcss-inline-svg) for more information.

**Important**
The new PostCSS Inline SVG replaces the str.scss and svg.scss functionalities.
Since this is a breaking change, all references to the past functionalities with
inline SVGs will need to be updated to use the new inline SVG policy.

### Webpack

Webpack is used minimally by design. Webpack is used to compile and bundle all
the JavaScript the theme. The configuration for Webpack can be found in the
`webpack.config.js` file in the root of the theme.

### ESLint

ESLint is used to enforce consistent code quality and style standards for all
JavaScript files in the theme. During the build and watch processes, ESLint
automatically reviews all JavaScript files for code quality issues, reporting
warnings for problems like unused variables and console statements,
and throwing errors for issues like missing semicolons and missing const
declarations. The ESLint configuration can be found in the `eslint.config.js`
file in the root of the theme and includes support for Drupal global variables
such as `Drupal`, `drupalSettings`, `jQuery`, and other common libraries used
in the theme.

### Resources

- [PostCSS](https://github.com/postcss/postcss)
- [PostCSS Preset Env](https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env)
- [PostCSS Inline SVG](https://github.com/TrySound/postcss-inline-svg)
- [Babel](https://babeljs.io/)
- [Babel Preset Env](https://babeljs.io/docs/en/babel-preset-env)
- [Webpack](https://webpack.js.org/)
- [ESLint](https://eslint.org/)

## Theme Structure

The following is a brief overview of the theme's directory structure and the
purpose of each directory.

### Root: `/`

The root directory contains files related to the theme's definition. It also
configuration files related to build tools. See the [Configuration](#configuration)
section for more information on these files can be used to configure the
theme's build process.

### Components: `/components`

The components directory is where most the theme's custom styles and scripts
are stored. Despite its name, the `/components` folder contains more than just
components. This is due to a limitation in Drupal's SDC module which only
discovers components in a folder named `/components` and our desire for a
consistent place to find and author CSS and JS.

Each subfolder within the `/components` directory will be processed and compiled
by the theme's build tools. If you have JS or SCSS that needs to be compiled,
it should likely go in the appropriate directory within `/components`.
All `.scss` and `.js` located within a `**/src` directory will be compiled into
to corresponding `.css` and `.js` files one level up – adjacent to that
`**/src` directory.

### Drupal Configuration: `/config`

The `/config` directory contains default configuration files for the theme.
Drupal will automatically import these configuration files when the theme
is installed.

### Images: `/images`

Any `/image` directory is used to store any media assets required by the theme, including icons. SVG files placed within the `/images` directory can be encoded directly into a stylesheet using using the `svg-load` function provided by the PostCSS Inline SVG plugin. For more information and example usage see the [PostCSS Inline SVG](#postcss-inline-svg) section.

### Partials: `/partials`

The `/partials` directory contains SCSS partials that are used to define global
sass variables, functions, and mixins. These partials can be imported into any
other `.scss` file in the theme with the following syntax:

```scss
@use 'partials' as *;
```

---

**Important:**
The partials directory is typically loaded globally by individual components.
It is important that partial files only include variables, functions, and
mixins. They should never include any CSS rules or selectors that would be
output to the final CSS file. This will help prevent duplicate CSS rules and
selectors from being output to the final CSS file.

---

### Templates: `/templates`

The `/templates` directory contains Twig templates for the theme. This directory
is used to wire up Drupal with SDC and to override Drupal's default templates
and provide custom templates for the theme. The templates directory is
organized by template type and should follow the same structure as Drupal's
default templates directory.

### Vendor: `/vendor`

The `/vendor` directory is where third-party libraries and assets are stored.
This directory is **not processed** by the theme's build tools. It is intended
for libraries that are not meant to be compiled or bundled with the theme's
source code.

Third-party libraries should be placed in the `/vendor` directory and defined
as an independent library in the libraries.yml file. Any component or other
library must explicitly define the third-party library as a dependency in its
library definition. This will ensure proper load order and prevent conflicts
with other libraries.

Third-party libraries should be included as a global library and not installed
via npm. This will ensure that the library is not bundled with multiple
components. The only exception to this rule is when a library is not available
via a CDN or other external source or if you are 100% sure it will only be
bundled with one component.

## Styling Approach

This following sections describe the styling approach used in this theme.

### TL:DR

- [`rem` for font sizes and `px` for spacing and layout](#px-vs-rem-vs-em)
- [`SDC for components`](#components)
- [`Namespaced CSS classes`](#class-namespaces)
- [`Mobile-first styling`](#breakpoints)
- [`Custom Properties`](#custom-properties) for [colors](#colors), [spacing](#spacing), and [typography](#typography)
- [SVG for Icons](#icons)

### `px` vs `rem` vs `em`

This theme uses a mix of `px`, `rem`, and `em` units for styling. The general
rule of thumb is to use `rem` for font sizes and `px` for spacing and layout.
For more information, read [The Surprising Truth About Pixels and Accessibility](https://www.joshwcomeau.com/css/surprising-truth-about-pixels-and-accessibility/)
by Josh Comeau.

`em` units are used to size elements that should be directly related to the
font-size of their parent element – such as icons inline with text.

`line-height` should always be set in with unitless values.

### Components

Components are the building blocks of the theme. Each component is a
self-contained unit of markup, styles, and scripts that can be used to build
complex layouts and designs. Components can be simple (a single button or link)
or complex (a site header or mega menu).

- A component is **self-contained**. It _should not_ include selectors outside
  of its own namespace.
- A component has a [base component class](#c--component) which serves as its
  own internal namespace for its [sub-elements](#sub-elements) and [modifiers](#modifiers).
- A component sub-element may be the base component of a child component. This
  does save on some extra non-semantic divs but may also hinder composability.
  Use your judgement.
- A component is **transportable**. It _should_ look the same regardless of
  which page or layout it appears in.
- An HTML element should not contain more than one base component class.
- A component is often tightly coupled with the HTML structure it is applied to.
- A component’s appearance should be altered with the addition of modifier,
  theme or state classes.

#### Component Structure

The components in this theme leverage the SDC module. Components are organized
into directories within the `/components/02-components` directory. Each
component folder should contain:

- `*.component.yml` file that defines the component's name, description, and
  props.
- `*.twig` template file
- `src/*.scss` file (optional)
- `src/*.js` file (optional)
- `README.md` file that describes the component and how to use it. (optional)

Each component directory should have a `src` directory that contains the
component's SCSS and JS files. The SCSS and JS files in the `src` directory will
be compiled and bundled by the theme's build tools. The compiled CSS and JS
files will be output to the component's root directory.

#### Modifiers (a.k.a. Variants)

A component may have one or more modifiers that change the appearance or
behavior of the component. Modifiers are defined as classes that are added to
the component's root element. The classes must follow the
`.my-component--modifier` naming convention. Modifiers should be defined in the
component's SCSS file and should follow the BEM naming convention.

### Attributes

Each component should leverage the `attributes` variable in the Twig template to
pass classes and attributes to the component's root element. This allows the
component to be styled and modified by the parent element or other components
and is important for integration with various Drupal modules and authoring
tools. The `attributes` should be initialized at the top of each component's
Twig template and passed to the root element of the component.

```twig
{# components/02-components/my-component/my-component.twig #}
{% set attributes = create_attribute(attributes) %}

<div {{ attributes.addClass('my-component') }}>
  <!-- Component content goes here -->
</div>

```

### Class Namespaces

Namespacing CSS selectors help keep code organized and communicates intention
for future developers charged with maintaining the codebase in the future. The
following describes the namespaces used in this theme. You should follow these
as best you can.

> _Note:_ It’s inevitable that you will encounter situations that don’t fit
> nicely into these namespaces. In those cases, use your best judgement as to
> whether or not you should adhere to these or follow the conventions already
> laid
> out by previous developers on the project.

---

#### `.c-` Component

> ##### Guiding Principles
>
> - A component is self-contained. It _should not_ include selectors outside of
>   its own namespace.
> - A component has a base component class which serves as its own internal
>   namespace for its sub-elements and modifiers.
> - A component sub-element may be the base component of a child component.
>   This does save on some extra non-semantic divs but may also hinder
>   composability. Use your judgement.
> - A component is **transportable. **It _should_ look the same regardless of
>   which page or layout it appears in.
> - A component should not define its own outer margins. This should be handled
>   by layout classes and parent elements.
> - An HTML element should not contain more than one base component class.
> - A component is often coupled with the HTML structure it is applied to.
> - A component’s appearance should be altered with the addition of modifier,
>   theme or state classes.

Components are the workhorse classes in theme theme. Components can be simple or
complex. They are the most complex namespace since they often include
sub-elements and modifier classes. component classes usually have a pretty
close relationship to the HTML structure they get applied to. This makes them a
perfect fit for styling things such as _teasers_, _tabs_, _calls-to-action_,
_media_ elements etc.

Components follow a BEM-like syntax and can be found in the
`./components/02-components` directory.

##### Base Class

Each component should have a base class named `.c-component-name`. This sets
the internal namespace for the component.

```html
<button class="c-button">I'm a button</button>
```

Typically the base class is on the outermost element of the component. But
sometimes you need to add an additional wrapper class. In that case, the base
component may be nested 1 or even 2 levels deep. It’s rare, but it happens.

```html
<div class="c-button__wrapper">
  <button class="c-button">I'm a button in a wrapper</button>
</div>
```

##### Sub-elements

What makes the component namespace so useful is the classes applied to
sub-elements. By namespacing sub-elements under the base class, they can safely
be targeted with a single class without increasing specificity.

Sub-elements are distinguished by the double underscore `__` and follow the
`c-[base-class]__[sub-element]` naming convention.

```html
<button class="c-button">
  <svg class="c-button__icon">...</svg>
  <span class="c-button__text">I'm a button</span>
</button>
```

> _Note:_ There is no need to nest sub-elements when writing CSS selectors. The
> naming convention provides enough specificity to target sub-elements directly.

##### Modifiers

Component styles can be adjusted for different use cases using modifier classes.

These follow a similar convention as sub-elements, but with a double hyphen `--`
. The naming convention for modifiers is `c-[base-component]--[modifier]`.

```html
<button class="c-button c-button--blue">I'm a blue button</button>
<button class="c-button c-button--large">I'm a big'ole button</button>
<button class="c-button c-button--large c-button--blue">
  I'm a big'ole blue button
</button>
```

> _Note:_ components can also be modified by composing them with different
> layout or theme classes as seen below.

**Examples:**

Below is an example of `quote` component which contains an icon, text block and
person or author. The `c-quote__person` sub-element is wrapper that contains an
embedded `c-person` (not shown) component with its own styles.

Notice the CSS for the quote itself is quite simple. That’s because it is
composed with the `t-teal-black` theme class which handles colors, and the
`l-stack--tight` layout class which handles the spacing between elements.
More on _theme_ and _layout_ classes below.

![Test_Long-form_Content___Guttmacher_Institute.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/95ddddd2-fc2e-44b6-9db8-362f336cecda/Test_Long-form_Content___Guttmacher_Institute.png)

```twig
<article class="c-quote t-teal-black l-stack--tight">
  <svg class="c-quote__icon" xmlns="http://www.w3.org/2000/svg" width="48"
  height="35"><path d="M48 6.69c-7.327.744-10.938 4.46-10.407
  10.514h6.584v16.99H26.973V19.859C26.973 5.841 33.983.212 46.62
  0L48 6.69zm-26.973 0c-7.328.744-10.939 4.46-10.408
  10.514h6.585v16.99H0V19.859C0 5.841 7.009.212 19.646 0l1.38 6.69z"
  fill="currentcolor" fill-rule="nonzero"/></svg>
  <div class="c-quote__text">
    {{text}}
  </div>
  <div class="c-quote__person">
    {{ author }}
  </div>
</article>
```

```scss
.c-quote {
  background-color: var(--dk_start_theme-color-background);
  padding: var(--dk_start_theme-space-inset);
}

/* These don't need to be nested since they are namespaced with .c-quote__* */
.c-quote__icon {
  display: block;
}

.c-quote__icon * {
  fill: var(--dk_start_theme-color-accent);
}

.c-quote__text {
  font-size: 20px;

  p {
    font-size: inherit;
    font-style: italic;
    font-weight: var(--dk_start_theme-font-weight-bold);
    quotes: '' '\201d';
    text-indent: 0;

    &:first-of-type {
      position: relative;

      &:before {
        content: open-quote;
      }
    }

    &:last-of-type {
      &:after {
        content: close-quote;
        display: inline;
      }
    }

    p:last-child {
      display: inline;
    }
  }
}
```

---

#### `.l-` Layout

> 👉🏽 **Guiding Principles**
>
> - Layout classes deal with layout related CSS properties. These are primary
>   `margin`, `padding`, `width`, `height`, `position`, `flex-` and `grid-` etc.
> - Layout classes never effect stylistic properties like those related to font
>   or color. They should also never be used to target internal elements for
>   this purpose.
>
>   ```css
>   /** DO NOT do this */
>   .l-two-column h3 {
>     color: red;
>   }
>   ```
>
> - Layout classes are composable with components, other layout classes.
> - Layout classes should not freely cascade down. It’s important to make
>   liberal use of the direct descendent selector `>` to prevent layouts from
>   bleeding into child layouts.

Layout classes deal specifically with CSS properties that control the size and
positioning of child elements. It’s layout classes that dictate spacing between
and around arbitrary elements, as well as the direction in which content flows
across the screen.

Layout classes live somewhere between [utility](#u--utility) and
[component](#c--component) classes. They are similar to utilities in that they
should have a fairly narrow scope and are very composable. Unlike utility
classes however, layout classes often need to be more tightly coupled to the
HTML structure on which they are applied – since they deal mostly with child
elements.

For examples of composable layout classes, refer to https://every-layout.dev.

**Examples:**

```scss
/*
  The Stack layout controls the vertical spacing between child elements.
  See https://every-layout.dev/layouts/stack/ for more information.
*/
[class*='l-stack'] > * {
  margin-top: 0;
  margin-bottom: 0;
}

[class*='l-stack'] > * + * {
  margin-top: var(--space-gap-y);
}

.l-stack--ruled > * + * {
  padding-top: var(--space-gap-y);
  border-top: var(--border-size) var(--border-style) var(--color-border);
}

.l-stack--none > * + * {
  margin-top: 0;
}

.l-stack--minimal > * + * {
  margin-top: var(--space-gap-y-minimal, 12px);
}

.l-stack--tight > * + * {
  margin-top: var(--space-gap-y-tight, 15px);
}

.l-stack--compact > * + * {
  margin-top: var(--space-gap-y-compact, 30px);
}

.l-stack--normal > * + * {
  margin-top: var(--space-gap-y-normal, 48px);
}

.l-stack--loose > * + * {
  margin-top: var(--space-gap-y-loose, 60px);
}

.l-stack--sparse > * + * {
  margin-top: var(--space-gap-y-sparse, 90px);
}
```

### Layout Sub-elements

Since layout classes deal primarily in relationships between child and sibling
elements, it is common to have layout sub-elements in the same way components
can have sub-elements – often these are specific regions within a layout.
Sub-elements are identified with double underscores such as `.l__primary` and
`.l__column` .

Since different layouts can share commonly named sub-elements, it’s best
practice to use the `>` direct child selector when targeting the sub-elements.
The reason we might choose `.l-sidebar-after > .l__primary` over
`.l-sidebar-after__primary` is because layouts occupy a space somewhere between
component classes and utility classes. The direct child selector makes it easier
to change layouts by swapping out the topmost layout class in the HTML rather
than having to change all the sub-element classes as well.

**Examples:**

```css
/*
  The columns layout provides a method of switching between stacked regions
  and horizontal columns at a givin width threshold. This threshold is based
  on the containers width, not the screen's width making it ideal for nested
  layouts.
  See https://every-layout.dev/layouts/switcher/ for more information.
*/
[class*='l-columns'] {
  display: flex;
  gap: var(--columns-gap-y, 60px) var(--columns-gap-x, 60px);
  align-items: stretch;
  flex-wrap: wrap;
}

[class*='l-columns'] > * {
  flex-basis: calc((var(--columns-threshold, 800px) - 100%) * 999);
  flex-grow: var(--column-size, 1);
}

[class*='l-columns'] > .l__column {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
```

---

#### `.u-` Utility

> 👉🏽 **Guiding Principles**
>
> - A utility class is hyper-specific. It should do one thing & one thing only.
> - Utility classes often have a one-to-one relationship between the class and a
>   property (`.u-uppercase`). In some cases, they require setting multiple
>   closely related properties (`.u-clearfix`).
> - Utility classes can be applied anywhere and are composable with all other
>   classes.
> - Utility classes should take precedence over other classes. At a minimum they
>   should be loaded last, but may require going as far as adding `!important`
>   to their declaration.
> - Due to their hyper-specific nature, utility classes rarely need to be edited
>   once published.

Utility classes are composable hyper-specific classes that target specific
properties. They can be composed together in a similar way to inline styles.

In Drupal, utility classes are particularly useful in a few circumstances.

1. Alter the appearance of layouts, regions, paragraphs via “Custom CSS Class”
   fields. If you want to adjust the spacing between two layouts on a landing
   page, utility classes can make that easy to adjust in configuration.
2. Making small adjustments to specific instances element instances, that would
   otherwise be overkill to create a component modifier. For example, if you
   have a page template in which you want to change the page title to ALL CAPS,
   the
   `.u-uppercase` class makes that simple.
3. Hiding and showing elements in an accessible way. While not namespaced with
   `.u-`, [Drupal core provides](https://www.drupal.org/node/2022859) classes
   such as `.visually-hidden` and `.invisible` which can be applied to an
   element for a very specific effect. These are utility classes.

**Examples:**

```scss
/* Text Transforms */
.u-uppercase {
  text-transform: uppercase;
}

.u-lowercase {
  text-transform: lowercase;
}

.u-capitalize {
  text-transform: capitalize;
}

.u-normal-case {
  text-transform: none;
}

/* Set margins to 24px */
.u-m-24 {
  margin: 1.5rem;
}

/* Set margins on the y-axis to 24px */
.u-my-24 {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Set margins on the x-axis to 24px */
.u-mx-24 {
  margin-left: 1.5rem;
  margin-right: 1.5rem;
}
```

---

#### `.t-` Theme

> 👉🏽 **Guiding Principles**
>
> - Themes are composable with components, layouts and layout region classes.
> - Themes should cascade down. If a theme is applied to a region, all
>   components within that region should adhere to it.
> - Themes primarily operate on color schemes but could also be leveraged to
>   adjust typographic scales, spacing scales and font-family.
> - Theme classes should strive to only override CSS custom properties such as
>   `--color-text` and `--color-background` for example. This supports the
>   cascading principle above.
> - Themes should not affect layout. The rare exception would be a heavily
>   stylistic background or border treatment requiring specific padding or
>   `:before` and `:after` pseudo elements.

Theme classes act like a coat of paint for existing components. The difference
between a component’s modifier class and a theme class, is that `.t-` theme
classes are often meant to cascade down, altering the appearance of elements
within an entire region. They are also intended to be applied across a variety
of components and layouts.

**Examples:**

```scss
/* Add an off-white background and darken the text color for contrast */
.t-gray-white {
  --dk_start_theme-color-background: var(--dk_start_theme-color-gray-95);
  --dk_start_theme-color-background-hover: var(--dk_start_theme-color-gray-80);
  --dk_start_theme-color-text: var(--dk_start_theme-color-gray-30);
  --dk_start_theme-color-text-link: var(--dk_start_theme-color-orange-30);
  --dk_start_theme-color-border: var(--dk_start_theme-color-gray-70);
}

/* Add a skewed background shape to the container */
.t-skewed {
  padding-bottom: 72px;
  padding-top: 72px;
  position: relative;
  z-index: 1;

  &:after {
    /* This is meant to be composed with a color theme class */
    background-color: var(--dk_start_theme-color-background);
    content: '';
    display: block;
    height: 100%;
    position: absolute;
    top: 0;
    transform: skewY(1.5deg);
    width: 100%;
    z-index: -1;
  }
}
```

---

#### `.js-`JavaScript Behavior

> 👉🏽 **Guiding Principles**
>
> Javascript Behavior classes serve as targets for applying custom JS behavior.
> Never apply style to `.js-` class unless that style is required to make the
> functionality work.
>
> Javascript Behavior classes are used to target HTML elements from Javascript.
> They are not meant to be targeted as CSS selectors for styling unless the
> behavior specifically depends on that style.
>
> These classes can also be added from scripts to note that a behavior has been
> applied to an element.

The `.js-` namespace is used to target elements from JavaScript. This is useful
for adding event listeners, toggling state classes, or manipulating markup.

> _Note:_ In many cases, elements can be targeted by aria or data attributes.
> However, in cases where the element is not easily targeted by these
> attributes, the `.js-` class should be used.

**Examples:**

```html
<!-- A button element used to toggle the appearance of other elements. -->
<button class="js-toggle">...</button>

<!-- A teaser component with a block link behavior to make it clickable. -->
<article class="c-teaser js-block-link">...</article>
```

```scss
/* Letting the user know the element is clickable is part of the behavior */
.js-block-link:hover {
  cursor: pointer;
}
```

---

#### `.is-`, `.not-`, `.has-`, `.no-` State

> 👉🏽 **Guiding Principles**
>
> - State classes convey whether or not a condition exists.
> - State classes are composable with Components and Layouts.

> State classes can be used to conditionally style a layout or component based
> on whether or not some condition exists.

**Examples:**

```html
<!-- A quote component that may or may not have an associated image. -->
<div class="c-quote has-image">...</div>
<div class="c-quote no-image">...</div>

<!-- A menu component with an active marked. -->
<ul class="c-menu">
  <li class="c-menu__item is-active-trail">...</li>
  <li class="c-menu__item">...</li>
  <li class="c-menu__item">...</li>
</ul>
```

> _Note:_ The `has-` and `no-` prefixes have become less necessary as
> [browser support](https://caniuse.com/css-has) for the `:has` pseudo-class is
> adequate.

---

### Custom Properties

This theme makes heavy use of custom properties. Custom properties are
considered either **global** or **local** component level.

Global custom properties are defined at the `:root` level in
`./components/00-base/src/*.scss` files and are used to define global values
like colors, spacing scales, and [typographic scales](#typography). These custom
properties should use the appropriate theme [prefix](#prefix-variable) to avoid
conflicts with other themes or components.

Local custom properties are meant to be used within a specific component or
layout. These should be defined in `./components/02-components/**/src/*.scss`
files at the root `.c-*` component level. Local properties often leverage global
custom property values. Local custom properties should be prefixed with the
component name to avoid conflicts with other components or layouts.

For example, consider a notification component might have a different icon and
accent color based on urgency. The css for this component might look like.

```scss
[class*="c-notification"] {
  --notification-accent-color: #333;
  --notification-icon: #{svg-load('icons/info.svg')};
}

.notification__heading {
  ...
  color: var(--notification-accent-color);
  ...
}

.notification__icon {
  ...
  background-color: var(--notification-accent-color);
  mask-image: var(--notification-icon);
  ...
}

//
// Modifiers
//
.c-notification--success {
  --notification-accent-color: green;
  --notification-icon: #{svg-load('icons/success.svg')};
}

.c-notification--error {
  --notification-accent-color: red;
  --notification-icon: #{svg-load('icons/error.svg')};
}

.c-notification--warning {
  --notification-accent-color: yellow;
  --notification-icon: #{svg-load('icons/warning.svg')};
}
```

#### Prefix variable

All global custom properties – those defined on the :root - should be prefixed
with `--dk_start_theme` This $property-prefix variable must also be set in
`./partials/base.scss` to match to ensure all autogenerated properties have the
correct prefix.

---

**Note:**
SCSS variables are still preferable for static values – those that won't change
based on context such as breakpoint, user interaction or other dynamic factors –
such as brand colors.

---

### Breakpoints

This theme uses breakpoint mixins to handle responsive styles. Available
breakpoints are defined in the `$grid_breakpoints` variable in
`./partials/_breakpoints.scss`.

Example Usage = `@include bp-min(tablet) { ... }`\
Example Usage = `@include bp-max(desktop) { ... }`\
Example Usage = `@include bp-between(tablet, desktop) { ... }`

See [`partials/_breakpoints.scss`](./partials/_breakpoints.scss) for more
information on how to use these mixins.

### Colors

Color scales are defined in the `./components/00-base/src/colors.scss` file.
This file contains a set of custom properties that define the both theme and
semantic color palettes. These custom properties are used to define the color of
text, backgrounds, borders, and other elements in the theme.

Theme color properties represent specific colors and are named as such. For
example, `--dk_start_theme-color-blue-200` or `--dk_start_theme-color-orange-500`.

Color scales go from lightest (`100`) to darkest (`900`) with a `500` value for
a neutral color.

Semantic color properties represent the intended use of the color and are named
as such. For example, `--dk_start_theme-color-background` or
`--dk_start_theme-color-text`. Semantic colors can very depending on the context in
which they are used or the [theme classes](#t--theme) applied.

### Layout

Layouts in this theme are meant to be composable and reusable. Layouts are
defined as classes that control the size and positioning of child elements.
Layout classes are defined in the `./components/03-layouts/` folder. For more
information see the [layout CSS namespace](#l--layout) section.

### Icons

For more information and example usage see the
[PostCSS Inline SVG](#postcss-inline-svg) section.

### Spacing

Spacing deals with the "whitespace" between elements. There are two acceptable
approaches to spacing elements in this theme, each with their own strengths
and weaknesses.

The first is using the [Lobotomized Owl](https://alistapart.com/article/axiomatic-css-and-lobotomized-owls/) `> * + *` selector to apply spacing between
vertically flowing elements. This approach targets any direct descendant
elements that follow another element and applies a margin to the top of the
element. The benefit of this approach is it allows for targeted spacing
adjustments between specific elements, such as increased spacing above a
heading, or editorial adjustments by a content editor. Therefor, this approach
is most suited to regions where the contents is flexible or unpredictable. See
the [`.l-stack`](./components/03-layouts/stack/) layout class for an example of
this in action.

The second is using the `gap` property to apply spacing between elements. This
approach is best suited for when the elements being spaced and the spacing
between them are consistent, such as content lists, menu items, or grid layouts.
The benefit of this approach is that it is simple and concise and
easily controlled.

Spacing scales are defined in the `./components/00-base/src/spacing.scss` file.
This file contains settings to generate a set of custom properties that define
the spacing scale at different breakpoints for the theme. These values are
available in `px` and `rem` units depending on the context in which they
are used.

### Typography

Font size and line height values are based on a typographic scale in order to
provide consistent control of type sizes & vertical rhythm across screen sizes.

This scale is can adjusted in [./components/00-base/src/typography.scss](./components/00-base/src/typography.scss) defined as `$typographic-scale`. See that file for more information on how the scale is structured and manipulated.

The `$typographic-scale` is converted into a set of font-size and line-height
custom properties in the form of `--{prefix}-fs-{category}-{target-value}` and
`--{prefix}-lh-{category}-{target-value}`. The resulting font-size is set in rem
units and a default base font-size of 16px. line-heights are always set as
unitless values.

While it's possible to use these custom properties directly in special cases,
it's recommended to use the `type-scale` mixin to ensure appropriate
line-heights are set for the corresponding font-sizes. This will help maintain
design consistency throughout the project.

## SCSS Tools

There are several useful SCSS functions and mixins available to developers when
theming. All the documentation can be found in the respective files. Below is a
list of available functions and mixins with examples and where to find them in
the partials directory.

It is recommended to use modern SCSS standards for importing partials with
name-spacing, however, older standards are still available for
importing partials.

`@use 'partials' as *;` instead of `@import 'partials'`\
`@use '../partials/_breakpoints' as breakpoints` instead of
`@import '../partials/_breakpoints'`

**Background Image**\
`partials/_media.scss`

The `background-image` mixin is used to scale and position `<img>` elements as
if they were background images.

Example Usage = `@include background-image(center);`

**Calculations**\
`partials/_calculations.scss`

Example Usage = `width: percent(250, 1000);`\
Example Usage = `font-size: rem(24px);`

**Flex Grid**\
`partials/mixins/_layout.scss`

Example Usage = `@include flex-grid(3, 'li', 40px, 40px);`

**Full Width**\
`partials/mixins/_layout.scss`

Example Usage = `@include full-width();`

**Heading Sizes**\
`partials/mixins/_typography.scss`

Example Usage = `@include font-h2()`

**Responsive IFrame**\
`partials/mixins/_media.scss`

Example Usage = `@include responsive-iframe(16, 9);`

**Transitions**\
`partials/settings/_animations.scss`\
`partials/functions/_animations.scss`

Example Usage = `transition: transition(all, 0.6s, easeInOutQuad)`

**Z-Index**\
`partials/settings/_layout.scss`\
`partials/functions/_layout.scss`

Example Usage = `z-index: z-index(bottomless-pit);`

## CKEditor 5 Support

In order to provide content editors with a more accurate representation of the
front-end design, this theme provides a namespaced stylesheet that is scoped to
CKEditor 5 enabled textareas. This file can be found at
`/components/01-elements/src/wysiwyg.scss`. Any CSS selectors output by this
file will be prefixed with `.ck-content` to ensure that the styles are only
applied to the CKEditor 5 instance.

This functionality is provided by the [postcss-prefixwrap](https://github.com/dbtedman/postcss-prefixwrap) plugin, which can be configured in the `/postcss.config.js` file.

## Menu Structure

Since version 4.x, DkStartTheme ships with an accessible menu that works with
Drupal's default menu system out of the box. To utilize for the main menu there
are a few steps you will need to take:

By default the Main navigation menu provided by Drupal is used by DkStartTheme. To
add links simply navigate to structure -> menus & select the Main
navigation menu.

Add links by following the prompts provided for the fields. To add nested menus
you will need to ensure the top level item is a button, to do so type `<button>`
within the menu link field rather than a link.

This structure is intentional, buttons provide one action which is to open a
menu and not act as a link. This menu structure supports multiple levels of
menus with submenu buttons, so you can build out the menu using the standard
Drupal structure.

DkStartTheme takes the `menu--main.html.twig` file in `templates/menu` directory
and passes it to the `menu` component which is located in the `components`
directory. The `menu` component is built on the default Drupal menu structure
and supports multiple levels of menus, submenu, and buttons as well as optional
mobile toggle functionality.

Additional information regarding the menu component and its supporting files can
be seen in the `components/menu` folder as individual README files.
