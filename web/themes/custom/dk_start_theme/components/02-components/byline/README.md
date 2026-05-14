# Byline

**Status:** Stable <br/>
**Group:** Components <br/>
**Component ID:** `dk_start_theme:byline`

## Overview

The Byline component is a Single Directory Component (SDC) for displaying
editorial metadata such as authorship, created dates, and updated dates.
It supports both prop-driven defaults and slot overrides so Drupal or other
consumers can supply custom author/date markup when needed.

## Props

| Name            | Type                | Required | Description |
| --------------- | ------------------- | -------- | ----------- |
| `authors_label` | string\|null        | No       | Optional label displayed before the author list |
| `authors`       | array\|null         | No       | Optional array of author objects for default rendering |
| `created_label` | string\|null        | No       | Optional label displayed before the created date |
| `created_date`  | string\|null        | No       | Optional created or published date text |
| `updated_label` | string\|null        | No       | Optional label displayed before the updated date |
| `updated_date`  | string\|null        | No       | Optional updated date text |

Each `authors` item may contain:

| Key   | Type         | Description |
| ----- | ------------ | ----------- |
| name  | string\|null | Author name |
| url   | string\|null | Optional author profile URL |

## Slots

| Name            | Description |
| --------------- | ----------- |
| `authors_block` | Replaces the default author list output |
| `dates_block`   | Replaces the default created/updated dates output |

## Usage

### Default byline

```twig
{% include 'dk_start_theme:byline' with {
  authors_label: 'By',
  authors: [
    {
      name: 'Magdalena Abakanowicz',
      url: '/profiles/magdalena-abakanowicz',
    },
  ],
  created_label: 'Created',
  created_date: 'March 27, 2024 at 10:00 AM PST',
  updated_label: 'Updated',
  updated_date: 'April 2, 2024 at 8:30 AM PST',
} only %}
```

### Override the author output

```twig
{% embed 'dk_start_theme:byline' with {
  created_label: 'Published',
  created_date: 'March 27, 2024 at 10:00 AM PST',
} only %}
  {% block authors_block %}
    <div class="c-byline__authors">
      <span class="c-byline__authors-label">Contributors</span>
      <ul class="c-byline__authors-list">
        <li class="c-byline__authors-item"><a href="#">Magdalena Abakanowicz</a></li>
        <li class="c-byline__authors-item"><a href="#">Wassily Kandinsky</a></li>
      </ul>
    </div>
  {% endblock %}
{% endembed %}
```

## HTML Structure

```html
<div class="c-byline">
  <div class="c-byline__authors">
    <span class="c-byline__authors-label">By</span>
    <ul class="c-byline__authors-list">
      <li class="c-byline__authors-item"><a href="/profiles/example">Example Author</a></li>
    </ul>
  </div>
  <div class="c-byline__dates">
    <ul class="c-byline__dates-list">
      <li class="c-byline__date-item c-byline__date-item--created">
        <span class="c-byline__date-label">Created</span>
        <span class="c-byline__date-value">March 27, 2024 at 10:00 AM PST</span>
      </li>
      <li class="c-byline__date-item c-byline__date-item--updated">
        <span class="c-byline__date-label">Updated</span>
        <span class="c-byline__date-value">April 2, 2024 at 8:30 AM PST</span>
      </li>
    </ul>
  </div>
</div>
```

## Accessibility

- **Editorial metadata:** Groups authorship and date information into one
  consistent metadata region.
- **Flexible override points:** Named slots allow consuming templates to
  preserve semantic and formatter decisions when integrating with Drupal.
- **Linked authors:** When author URLs are supplied, links should have clear
  and descriptive text using the visible author name.