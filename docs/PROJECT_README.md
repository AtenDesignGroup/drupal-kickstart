# PROJECT NAME

- Production URL: https://atendesigngroup.com/
- Aten Shortname: PROJECTCODE

## Project Setup

See `docs` for details on project setup, including:

- Drupal Kickstart
- Grumphp

## Overview

Description of project intention & goals.

## People & Roles in Project

**Aten**

- Jack Reacher (Project Manager)
- James Bond (Tech Lead)
- Jason Bourne (Developer)

## Communication

- Slack: #client-PROJECTCODE
- JIRA: https://atendesign.atlassian.net/jira/software/projects/PROJECTCODE/

## Code Repository

- Host: Pantheon/Platform.sh/Acquia
- Repo Name: Project Name
- Development URL: https://example.com/
- Repo URL: https://example.com/
- Default Branch: `master`
- Owner: Aten/Client

## Hosting

**Production**

- **Provider:** Pantheon/Platform.sh/Acquia
- **Owner:** Aten/Client

## Automated Testing

No testing:

- This project does not currently have automated testing configured.

Has testing:

- This project has automated testing configured.
- Type of testing: Cypress (https://www.cypress.io/)
- Location to READ.ME: `web/...`

## Theme Information

- Base Theme: Prototype
- Custom Theme: `THEME_NAME`
- Location to READ.ME: `web/themes/custom/THEME_NAME/README.md`

## Development Workflow

When adding new features to the project, you'll need to create a feature branch, which is commonly named after the Jira ticket number (e.g., JIRA-XXX). You will commit all your code changes to this feature branch and push the branch to the code repository. Once the ticket is ready for QA, it should be merged into the `main` branch, which will then be deployed to the development instance on the hosting platform.

Assign the Jira ticket to a QA team member, provide the link to the development environment, and include instructions on what needs to be tested. Additionally, please ensure that you set up the environment with dummy data to verify that it's functioning correctly before involving the QA team.

## Deployment

When code is pushed to GitHub, an automated process using GitHub Actions deploys the site to the development environment on Pantheon. Production deployments are still conducted manually and must follow the Pantheon workflow, as they need to go through Test and then Live. When working on an isolated feature that you want to test independently, you can create a feature branch using the following naming convention for your branch (feature/[JIRA-ISSUE]). When you push the feature branch to GitHub, it will create a Multi-dev environment based on that code; the development database will be used when creating the Multi-dev environment.

## Local Development

The Drupal project was configured to support DDev out of the box. Developers can quickly begin setting up their local environment by following the instructions below. Please ensure that you've installed [DDev](https://ddev.com/get-started/).

First, let's start by installing the project's composer packages:

```
composer install
```

Now, you'll need to start up the local instance:

```
ddev start
```

Now, you'll need to import the development database to the local environment:

```
ddev import-db local.database.sql.gz
```

Drush aliases are also available. To sync the DB from any Pantheon environment to your local run:

```
ddev drush sql-sync @lapl.[ENVIRONMENT_ID] @self
```

If you get an error around pubkeys, run `ddev auth ssh` and try again.

1. Get your Pantheon.io machine token:
  a. Login to your Pantheon Dashboard, and [Generate a Machine Token](https://pantheon.io/docs/machine-tokens/) for ddev to use.
  b. Add the API token to the `web_environment` section in your global ddev configuration at ~/.ddev/global_config.yaml
  ```
  yaml
    web_environment:
      - TERMINUS_MACHINE_TOKEN=abcdeyourtoken
  ```
2. `ddev pull pantheon`
3. You can append `--skip-files` or `--skip-db` to the `ddev pull pantheon` command to skip files or database import respectively.


## Theme Development

Powered by some of the latest and greatest tools, this package streamlines theme development.

Install the required npm packages:

```
ddev theme-install
```

That's it for installs! You can start developing by running:

```
ddev theme-watch
```

To compile your build files, stop watching and run:

```
ddev theme-build
```

## Component Wiring (wire-components)

### What It Does

`wire-components` is a DDEV scaffold tool that converts Prototype SDC components
into Drupal paragraph types. For each eligible component it generates:

- A **Drupal Recipe** (`recipes/formula-<component>/`) containing the paragraph
  bundle definition, field storages, field instances, and form/view display config
- A **Twig bridge template**
  (`web/themes/custom/THEME_NAME/templates/paragraph/paragraph--<component>.html.twig`)
  that passes Drupal field values into the SDC component via `include()` or
  `embed()`

The result is a fully wired paragraph type that editors can add to a page and
that renders through the Prototype SDC component without any manual config.

### When to Use It

Run `wire-components` when:

- A new Prototype component has been added and you need a matching paragraph type
- You are setting up a new project from scratch and want to scaffold all
  paragraph types at once
- A Twig bridge template is missing for an existing recipe

### Usage

```bash
# Wire all eligible components at once
ddev wire-components all

# Wire a single component
ddev wire-components cta
ddev wire-components teaser
ddev wire-components accordion

# Override the custom theme name (defaults to DK_THEME_NAME in .kickstart.env,
# then falls back to dk_start_theme)
ddev wire-components all --theme-name=my_theme
```

After running, apply any newly generated recipes:

```bash
ddev exec drush recipe recipes/formula-<component-name>
ddev exec drush cr
```

### Which Components Are Wired — and Why

`wire-components` iterates every directory inside
`web/themes/contrib/prototype/components/02-components/` and applies three
filters:

**1. Hard skip list** — Components that should never become paragraph types are
excluded unconditionally:

| Component | Reason |
|-----------|--------|
| `button`, `icon`, `icon-label`, `link` | Atomic UI elements — sub-parts of other components |
| `breadcrumbs`, `menu`, `menu-tabs`, `page-title`, `pager` | Drupal core generates these automatically |
| `back-to-top`, `spacer`, `search-bar` | Layout/utility — no editorial content |

**2. Prop filtering** — Each component's `.component.yml` props are inspected.
Props named `id`, `icon`, `options`, `attributes`, `class`, or `classes` are
always skipped as theme-only. If `variant` or `type` props lack an `enum`, they
are also skipped. If every prop of a component is filtered out, the entire
component is skipped with a warning.

**3. Companion-item detection** — Components whose Twig uses `{% block %}` /
`embed` patterns (currently `accordion` and `tabs-content`) cannot be wired with
a single `include()`. These are scaffolded as a **parent + child paragraph pair**:
the parent holds an `entity_reference_revisions` field pointing to child items,
and the child item template does the actual `embed` into the Prototype component.

### Prop-to-Field Mapping

The script maps each component prop to a shared Drupal field storage using these
rules:

| Prop name pattern | Mapped Drupal field | Field type |
|---|---|---|
| `title`, `heading`, `label`, `subtitle` | `field_title` | `string` |
| `text`, `body`, `content`, `description` | `field_formatted_text` | `text_long` |
| `caption` | `field_caption` | `text_long` |
| `link`, `cta` (object) | `field_link` | `link` |
| `media`, `image`, `photo`, `thumbnail` | `field_media` | `entity_reference` → media |
| `variant`/`type` with enum values | `field_variant` / `field_type` | `list_string` |
| `alerts`, `messages` (array of strings) | `field_alerts` / `field_messages` | `text_long` (multi-value) |
| `slides`, `items`, `gallery` (arrays) | `field_<propname>` | `entity_reference` → media (multi) |

When two props from the same component map to the same shared field, the first
one wins and a warning is emitted. All mappings that need manual review are
printed with a `REVIEW` marker at the end of the run.

### Idempotency

The script is safe to re-run. If both the recipe directory and the Twig template
already exist for a component, it prints `exists` and moves on. If only one is
missing, it generates the missing piece.

### REVIEW Markers

After scaffolding, the tool prints `REVIEW` notices for anything that needs
human attention — for example, `list_string` enum fields, multi-value media arrays,
or embed-URL props mapped to `field_formatted_text`. Address these before
applying the recipe.
