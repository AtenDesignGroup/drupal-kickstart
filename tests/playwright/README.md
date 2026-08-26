## Automated Testing

Automated tests live in `tests/playwright/` and use [Playwright](https://playwright.dev/). Tests are organized into four project types, each targeting a different testing concern. The `e2e`, `vrt`, and `a11y` projects are disabled when `BASE_URL` points to production (`livedomain.com`); the `live` project is enabled only on production.

### Test Types

| Type | Folder | Description |
|------|--------|-------------|
| **e2e** | `tests/playwright/tests/e2e/` | Functional end-to-end tests. Run against DDEV or a Pantheon multidev. |
| **vrt** | `tests/playwright/tests/vrt/` | Visual regression tests. Compared against stored baseline screenshots. |
| **a11y** | `tests/playwright/tests/a11y/` | Accessibility audits using `@axe-core/playwright`. |
| **live** | `tests/playwright/tests/live/` | Read-only smoke tests safe to run against production. |

Add new spec files inside the appropriate subfolder. The Playwright project config routes specs by folder name, so placement determines which project runs them.

Shared utilities (Drupal login, drush helpers, VRT helpers, accessibility helpers) live in `tests/playwright/tests/utils/`.

### Installation

From the root of the project, run:

```bash
ddev test:install
```

This runs `npm install` inside `tests/playwright/` and installs Playwright's browser binaries.

### Configuration

Copy `tests/playwright/.env.example` to `tests/playwright/.env` and fill in values for your environment:

```bash
cp tests/playwright/.env.example tests/playwright/.env
```

Key variables:

| Variable | Where set | Description |
|----------|-----------|-------------|
| `BASE_URL` | `.env` | The site URL to test against. Defaults to `https://dk-start.ddev.site/` locally. |
| `AUTH_USERNAME` | `.env` / CI secrets | HTTP Basic Auth username. Required for locked Pantheon environments (e.g. `beta-test`). |
| `AUTH_PASSWORD` | `.env` / CI secrets | HTTP Basic Auth password. Required for locked Pantheon environments (e.g. `beta-test`). |
| `PANTHEON_SITE` | `.env` | Pantheon site machine name. Required for drush-based test helpers. |
| `PANTHEON_ENV` | `.env` | Pantheon environment name (e.g. `dev`, `test`, or a multidev name). |

### DDEV Commands

All Playwright commands are available via DDEV from any directory in the project:

| Command | Description |
|---------|-------------|
| `ddev test:install` | Install npm dependencies and Playwright browser binaries. |
| `ddev test:e2e` | Run functional end-to-end tests against the local DDEV site. |
| `ddev test:vrt` | Run visual regression tests, comparing against stored baselines. Defaults to `https://dk-start.ddev.site/`. |
| `ddev test:vrt:baseline` | Capture new VRT baseline screenshots. Defaults to `https://dk-start.ddev.site/`. |
| `ddev test:a11y` | Run accessibility audits against the local DDEV site. |
| `ddev test:live` | Run smoke tests against `https://dk-start.gov` (production, read-only). |
| `ddev test:report` | Open the HTML report from the last test run. |

All commands accept additional Playwright flags via pass-through arguments. For example:

```bash
# Run VRT baseline for a single browser project
ddev test:vrt:baseline --project=vrt-chrome-desktop

# Run a specific e2e spec file
ddev test:e2e tests/e2e/homepage.spec.ts

# Run VRT baseline tests against the test environment
BASE_URL=https://test-dk-start.pantheonsite.io/ AUTH_USERNAME=dk-start AUTH_PASSWORD=dk-start ddev test:vrt:baseline

# Run VRT against a specific multidev environment
BASE_URL=https://proj-123.dk-start.gov/ ddev test:vrt
```

### GitHub Actions Workflows

Four workflows run Playwright tests in CI. All use the shared reusable workflow from `CORaleigh/aten-actions`.

| Workflow | Trigger | Tests |
|----------|---------|-------|
| `playwright-e2e.yml` | PR to `main`/`release`, post-deploy, `workflow_dispatch` | e2e functional tests against the multidev URL |
| `playwright-a11y.yml` | PR to `main`/`release`, post-deploy, `workflow_dispatch` | Accessibility audits against the multidev URL |
| `playwright-vrt.yml` | PR to `main`/`release`, weekly schedule, `workflow_dispatch` | VRT comparison (test mode) or baseline capture (baseline mode) |
| `playwright-live.yml` | `workflow_dispatch` only | Smoke tests against `https://dk-start.gov` |

The multidev deploy workflow (`pantheon-deploy-multidev.yml`) also calls the `e2e`, `a11y`, and `vrt` workflows in parallel after each feature branch deploy.

### VRT Workflow

Visual regression tests compare screenshots against stored baselines. Baselines are **not committed to the repository** — they are managed as GitHub Actions artifacts by the `playwright-vrt.yml` workflow.

#### CI Baseline Management

Baselines are stored as the `playwright-snapshots-release` artifact and are automatically refreshed on a weekly schedule. To manually trigger a baseline refresh in CI:

1. Go to **Actions → Run Playwright Tests** in GitHub.
2. Click **Run workflow** and select `mode: baseline`.
3. Optionally check **Refresh the Pantheon environment** to sync the `beta-test` database from live before capturing.

The `playwright` (test) job downloads the stored artifact and diffs against it. If a PR introduces unexpected visual changes, the workflow will fail.

#### Updating Baselines After Intentional Visual Changes

When a feature intentionally changes the appearance of the site, baselines must be refreshed in CI after the feature is deployed to `beta-test`:

1. Deploy your changes to the `beta-test` Pantheon environment.
2. Trigger a baseline refresh via **Actions → Run Playwright Tests → Run workflow → mode: baseline**.
3. Once the workflow completes, subsequent VRT runs will compare against the new baselines.

#### Local VRT

You can capture and compare snapshots locally for debugging. Local snapshots are written to `tests/playwright/tests/vrt/specs/visual_regression.spec.js-snapshots/` and are not used by CI.

```bash
# Capture local baselines
ddev test:vrt:baseline

# Compare against local baselines
ddev test:vrt

# Capture baselines for a single browser project
ddev test:vrt:baseline --project=vrt-chrome-desktop
```

Available VRT projects: `vrt-chrome-desktop`, `vrt-safari-desktop`, `vrt-firefox-desktop`, `vrt-iphone-modern`, `vrt-galaxy-modern`, `vrt-firefox-mobile`.

> **Note:** `test-dk-start.pantheonsite.io/` is HTTP-locked. Set `AUTH_USERNAME` and `AUTH_PASSWORD` in your `.env` file before running VRT commands against it.