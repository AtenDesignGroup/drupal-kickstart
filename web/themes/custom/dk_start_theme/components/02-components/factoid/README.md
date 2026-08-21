# Factoid

**Status:** Stable <br/>
**Group:** Components <br/>
**Component ID:** `dk_start_theme:factoid`

## Overview

The Factoid component is a Single Directory Component (SDC) for displaying
an optional icon with a prominent fact string and supporting label.
Common uses include sponsored research totals, facility counts, and
other concise impact metrics.

## Props

| Name         | Type                | Required | Description                                            |
| ------------ | ------------------- | -------- | ------------------------------------------------------ |
| `fact_icon`  | array\|string\|null | No       | Optional icon render array (Drupal) or string (stories) |
| `fact`       | string              | No       | Primary fact value (e.g. `$1.98B`, `30+`)             |
| `fact_label` | string              | No       | Supporting label for the fact                          |

## Usage

### Basic fact callout

```twig
{% include 'dk_start_theme:factoid' with {
  fact: '$1.98B',
  fact_label: 'Sponsored Research',
} only %}
```

### With optional icon

```twig
{% include 'dk_start_theme:factoid' with {
  fact_icon: '🎓',
  fact: '30+',
  fact_label: 'Shared Instrumentation Facilities',
} only %}
```

## HTML Structure

```html
<div class="c-factoid">
  <div class="c-factoid__icon">
    <!-- Optional icon markup or media render output -->
  </div>
  <div class="c-factoid__fact">$1.98B</div>
  <div class="c-factoid__label">Sponsored Research</div>
</div>
```

## Accessibility

- **Semantic markup:** Uses `<div>` with BEM class names for concise fact
  card presentation.
- **Heading hierarchy:** `c-factoid__label` is intentionally a `<div>`
  (not a heading element) so consuming templates can control heading
  level via surrounding markup. Wrap in an `<h2>` or `<h3>` as needed.
- **Decorative icon:** If the icon is decorative, ensure media alt text is
  empty and/or hide icon markup from assistive tech at the field formatter
  level.
