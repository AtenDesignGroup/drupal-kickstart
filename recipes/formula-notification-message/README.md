# formula-notification-message

Recipe to install the [Notification Message](https://www.drupal.org/project/notification_message) module for Drupal.

Installs the module and the default **Global** notification message type.

## After applying this recipe

The block must be placed manually because block placement config is theme-specific:

1. Go to **Structure → Block layout** (`/admin/structure/block`).
2. In the **Alert** region, click **Place block**.
3. Find **Notification messages** and click **Place block**.
4. Configure:
   - **Message Type**: select `Global` (or any other types you have created).
   - **Display Mode**: `Default`.
   - **Label display**: hide or show as preferred.
5. Save the block.

## Theme wiring

Two template overrides wire the module to the `prototype:alert` SDC component.

### 1. Block template — suppress the label

`web/themes/custom/dk_start_theme/templates/block/block--notification-message.html.twig`

Drupal's default block template renders a visible `<h2>` label around the block title. This override suppresses it and passes the block content straight through to the entity template below:

```twig
{{ title_prefix }}
{{ title_suffix }}
{{ content }}
```

`title_prefix` and `title_suffix` are kept so Drupal's contextual links (edit pencil) still appear for admins.

### 2. Entity template — map to the alert SDC

`web/themes/custom/dk_start_theme/templates/notification-message/notification-message.html.twig`

This is where the wiring happens. The module's preprocess function (`template_preprocess_notification_message` in `notification_message.theme`) exposes these variables:

| Variable | Type | Description |
|---|---|---|
| `message` | entity | The `NotificationMessage` entity object. |
| `bundle` | string | The notification type machine name (e.g. `global`). |
| `content` | array | Rendered entity fields. `content.message` is the body text. |
| `notification_dismiss.show` | bool | Whether the dismiss button is enabled on this type. |
| `notification_dismiss.button_text` | string | Label for the close button. |
| `is_message_entity` | bool | `TRUE` on the entity's canonical page — hides the dismiss button there. |

**Why the outer `.message` wrapper is required**

The module ships JavaScript (`notification.dismiss.js`) that handles cookie-based dismiss. It expects this DOM structure:

```html
<div class="message" data-message-id="[id]">
  ...
  <a class="message__close">...</a>  ← must be a direct child
</div>
```

The JS uses `$(this).parent()` from the close button to read `data-message-id`. Removing the wrapper or moving the close button outside of it breaks dismiss.

**Bundle → alert `type` prop mapping**

The `alert` SDC uses a `type` prop to drive its CSS modifier class (`c-alert--status`, `c-alert--warning`, `c-alert--error`). Notification message bundle names do not match these values by default:

```twig
{%- set alert_type = bundle == 'global' ? 'status' : bundle|clean_class -%}
```

- `global` (the default bundle) maps to `status` — the neutral informational style.
- Any other bundle name passes through directly via `clean_class`. Admins can create bundles named `warning` or `error` and automatically receive the matching alert styles without any template changes.

**Alert SDC props used**

```twig
include('dk_start_theme:alert', {
  type:    alert_type,          {# string: drives c-alert--{type} CSS class #}
  heading: message.label(),     {# string: entity admin label, rendered as visually-hidden <h2> #}
  alerts:  [content.message],   {# array: one item — the rendered text_long message field #}
}, with_context = false)
```

- `alerts` is an array even for a single message because the SDC branches on `alerts|length > 1` to decide between `<p>` and `<ul>` output.
- `with_context = false` isolates the SDC from the entity template's variable scope, preventing accidental prop leakage.
- `heading` uses `message.label()` (the entity object method) rather than `content.label` (the rendered field) to get a plain string — the SDC passes it to `aria-label` and wraps it in a `visually-hidden` heading.

## Replicating this pattern for another contrib module

To wire a different contrib module entity to an SDC component in this theme:

1. **Identify the theme hook** — enable Twig debug and look for `THEME HOOK:` in the HTML source when the entity renders. This gives you the template filename.
2. **Identify available variables** — read the module's `template_preprocess_*` function (usually in `modulename.module` or a `*.theme` file) to see what variables are exposed.
3. **Create the entity template override** in `web/themes/custom/dk_start_theme/templates/{entity-type}/{hook-name}.html.twig`. Map entity variables to SDC props using `include('{theme}:{component}', {...}, with_context = false)`.
4. **Create the block template override** in `web/themes/custom/dk_start_theme/templates/block/block--{block-plugin-id}.html.twig` if the entity is rendered inside a block. The filename uses the block plugin ID with underscores converted to hyphens.
5. **Check for JavaScript dependencies** — if the module ships JS that targets specific CSS classes or `data-*` attributes, those must be preserved in the outer wrapper of the entity template.
6. **Clear caches** — `ddev drush cr`.

## Managing notification messages

- **Create/edit messages**: **Content → Notification Messages** (`/admin/content/notification-message`).
- **Manage types**: **Structure → Notification Message Types** (`/admin/structure/notification-message-type`).
