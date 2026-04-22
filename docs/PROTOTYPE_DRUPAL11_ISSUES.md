# Drupal 11 & Prototype Starterkit: SDC Compatibility Issues & Solutions

## Overview

The `drupal/prototype` starterkit (v5.3+) has compatibility issues with **Drupal 11's strict Single Directory Component (SDC) validation**. This document explains the root causes and solutions.

---

## Root Cause

Drupal 11 introduced **strict type validation in the SDC ComponentValidator**. When a component is rendered, the validator:

1. Checks each prop value against the schema defined in `component.yml`
2. **Rejects `null` values for bare types** like `type: string`, `type: array`, `type: object`
3. Requires explicit null-safety: `type: ['string', 'null']` for optional fields

The prototype components were designed with **optional fields using bare types**, which fails validation in Drupal 11 when those fields are empty (evaluate to `null`).

---

## Affected Components

The following prototype components have validation errors in Drupal 11:

| Component | Issue | Symptoms |
|-----------|-------|----------|
| **CTA** | `link` object props (`title`, `url`) are bare types; optional link fields pass `{}` when empty | `InvalidComponentException: NULL value found, but a string is required` |
| **Pullquote** | `text` and `credit` are bare strings; optional fields can be null | Same as above |
| **Slideshow** | `heading` is bare string; `slides` is bare array; fallback fields can be null | Same as above |
| **Teaser** | `title`, `media`, `body` and nested `link` props are bare types; optional fields can be null | Same as above |
| **Video** | `title`, `media`, `caption` are bare strings; can be null | Same as above |

---

## Example: Teaser Component Error

**Schema (before fix):**
```yaml
props:
  type: object
  required:
    - title
  properties:
    title:
      type: 'string'              # ✗ Bare type — rejects null
    media:
      type: string                # ✗ Bare type — rejects null
    link:
      type: 'object'              # ✗ Bare type — rejects null
      properties:
        text:
          type: string            # ✗ Child prop is bare string
        url:
          type: string            # ✗ Child prop is bare string
```

**When used in a paragraph bridge template passing empty link:**
```twig
{{ include('theme:teaser', {
  title: content.field_title|render|striptags|trim,
  media: content.field_media,
  link: _link ? {...} : {},              {# ✗ Empty {} fails validation #}
  body: content.field_formatted_text
}) }}
```

**Error:**
```
InvalidComponentException: [theme:teaser/link.title] NULL value found, but a string is required
```

---

## Solutions Implemented

### 1. **Schema: Use Null-Safe Union Types**

Convert bare types to explicit null-safety:

```yaml
# ✓ Correct for Drupal 11
properties:
  title:
    type: ['string', 'null']      # Union type — accepts null
  media:
    type: ['string', 'null']
  link:
    type: ['object', 'null']      # Optional object
    properties:
      text:
        type: ['string', 'null']  # Child props nullable
      url:
        type: ['string', 'null']
```

### 2. **Remove `required` Arrays**

Bare `type: string` cannot validate null even with optional fields. Remove all `required: [...]` declarations:

```yaml
# ✗ Before
props:
  type: object
  required:
    - title
  properties:
    title:
      type: string

# ✓ After
props:
  type: object
  # No 'required' array
  properties:
    title:
      type: ['string', 'null']
```

### 3. **Twig Templates: Use Conditional Merges**

Never pass empty objects `{}` for optional props. Use conditional merges to **omit the prop entirely** when it has no data:

```twig
# ✗ Fails validation — empty object passed
{{ include('theme:teaser', {
  link: _link ? {...} : {}
}) }}

# ✓ Correct — prop omitted when empty
{%- set _props = {
  title: content.field_title|render|striptags|trim,
  media: content.field_media,
  body: content.field_formatted_text
} -%}
{%- if _link -%}
  {%- set _props = _props|merge({link: {text: _link.title, url: _link.url.toString}}) -%}
{%- endif -%}
{{ include('theme:teaser', _props) }}
```

---

## Applied Fixes

All fixes have been applied across the project:

### Custom Theme Components
- **Location:** `web/themes/custom/dk_start_theme/components/02-components/*/`
- **Status:** ✅ All 5 components updated with null-safe schemas
- **Files:**
  - `cta/cta.component.yml`
  - `pullquote/pullquote.component.yml`
  - `slideshow/slideshow.component.yml`
  - `teaser/teaser.component.yml`
  - `video/video.component.yml`

### Paragraph Bridge Templates
- **Location:** `web/themes/custom/dk_start_theme/templates/paragraph/`
- **Status:** ✅ All templates use conditional merges for optional props
- **Files:**
  - `paragraph--cta.html.twig`
  - `paragraph--pullquote.html.twig`
  - `paragraph--slideshow.html.twig`
  - `paragraph--teaser.html.twig`
  - `paragraph--video.html.twig`

### Prototype Patch
- **Location:** `patches/prototype-sdc-null-safety.patch`
- **Status:** ✅ Patch registered in `composer.patches.json`
- **Applies to:** `drupal/prototype:^5.3`
- **Effect:** Auto-applies fixes to contrib prototype when installed via Composer
- **Applied via:** `cweagans/composer-patches` plugin (required dependency)

### Recipe Dependency
- **Location:** `recipes/formula-foundational/composer.json`
- **Status:** ✅ Now requires `cweagans/composer-patches:^1.7`
- **Effect:** Ensures patches plugin is available when recipes are applied

### Generator Script Fix
- **Location:** `.ddev/generate-recipe.php`
- **Status:** ✅ Updated `mapPropToField()` to handle null-safe type unions
- **Effect:** Generator correctly parses `type: ['string', 'null']` instead of failing with "Array to string conversion" warnings

---

## Future Theme Generation

When generating a new theme with `ddev setup-prototype`:

```bash
ddev setup-prototype --theme-name=my_theme --generate-recipes
```

The generated Twig templates will automatically:
- Use conditional merges for optional link props
- Properly format string/array fields
- Be compatible with Drupal 11's strict SDC validation

**The patch ensures prototype components are fixed automatically during installation.**

---

## Testing Verification

To verify the fixes work:

```bash
# Clear caches
ddev exec drush cr

# Load a page with a paragraph using affected components
# In the browser: /node/ADD or admin content pages

# Watch for: No InvalidComponentException errors
# Log check: ddev exec drush watchdog:show

# Verify rendered output displays correctly
```

---

## Drupal 11 SDC Validation Reference

Drupal 11's ComponentValidator enforces these rules:

| Rule | Drupal 11 Enforced | Example |
|------|:-----------------:|---------|
| Bare type must not be null | ✅ Yes | `type: string` rejects `null` |
| Union type accepts null | ✅ Yes | `type: ['string', 'null']` accepts `null` |
| Optional object props (nested) | ✅ Yes | Nested props inherit parent's nullability |
| Empty objects `{}` for optional | ❌ No | Pass nothing (`null`) instead |

**Key principle:** *In Drupal 11, silence the validator by making undefined fields truly absent from the prop object, not present with empty values.*

---

## Related Resources

- [Drupal 11 SDC Documentation](https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components)
- [PHP 8 Type Union Syntax](https://www.php.net/manual/en/language.types.declarations.php#language.types.declarations.union)
- [YAML Type Syntax](https://yaml.org/type/null.html)
- [ComponentValidator Source](https://git.drupalcode.org/project/drupal/-/blob/11.x/core/lib/Drupal/Component/Plugin/Schema/ComponentValidator.php)

---

## Additional Prototype Bugs

### `slideshow.twig`: `'type': loop` resolves to null

**File:** `web/themes/contrib/prototype/components/02-components/slideshow/slideshow.twig`

**Bug:** The default Splide options object in `slideshow.twig` uses `loop` as an unquoted value:

```twig
{% set default_options = {
  ...
  'type': loop,   {# ✗ 'loop' is a Twig variable only defined inside {% for %} loops #}
} %}
```

Outside of a `{% for %}` block, `loop` is undefined and resolves to `null`. This produces `data-splide="{"type":null}"` in the HTML, which causes Splide to fail initialization (visible as `splide--null` CSS class and disabled arrows).

**Workaround:** Always pass `type` explicitly in the `options` prop from the paragraph bridge template:

```twig
{{- include('dk_start_theme:slideshow', {
  slides: slides_items,
  options: {
    type: 'slide',
    perPage: 1,
  }
}) -}}
```

**Upstream fix needed:** The `slideshow.twig` default should be `'type': 'loop'` (quoted string), not the bare word `loop`.

---

### `Starterkit.php`: Class name casing breaks `postProcess()` on Linux

**File:** `web/themes/contrib/prototype/src/Starterkit.php`

**Bug:** Drupal's `GenerateTheme` command looks for class `Drupal\prototype\StarterKit` (capital K). Prototype's file is named `Starterkit.php` (lowercase k). On Linux (case-sensitive filesystem, e.g. inside DDEV), PSR-4 autoloading cannot find the class, `postProcess()` is silently skipped, and the generated theme retains the `tests/` directory.

**Consequence:** `tests/modules/prototype_slideshow_test/templates/paragraph--slideshow.html.twig` is left inside the generated theme directory. Drupal's `drupal_find_theme_templates()` recursively scans the entire theme directory and the test template shadows the real `templates/paragraph/paragraph--slideshow.html.twig` (test template sorts after templates/ alphabetically, so it wins).

**Patch:** `patches/prototype-starterkit-class-name-change.patch`
- Rename `src/Starterkit.php` → `src/StarterKit.php`
- Update class declaration: `final class StarterKit implements StarterKitInterface`
- Update `prototype.starterkit.yml` ignore entry: `/src/StarterKit.php`
- Fix ignore pattern for tests directory: `/tests/**` (bare `/tests` matches no files via Symfony Finder's glob resolver)

---

## Questions?

If you encounter similar issues with other prototype components, apply:

1. **Schema:** Convert `type: X` to `type: ['X', 'null']`
2. **Template:** Use conditional merges for optional complex props
3. **Validation:** Test with `ddev exec drush cr` and check watchdog logs
