# GitHub Actions Workflows Configuration

This directory contains GitHub Actions workflows for deploying and managing a Drupal site on Pantheon. This guide documents the required secrets and variables for each workflow.

## ⚠️ Enabling Workflows

**All workflow files in this directory are currently disabled** using the `.disabled` file extension. GitHub Actions only processes files ending in `.yml` or `.yaml`.

**To enable a workflow:**
1. Remove the `.disabled` extension from the file name
   ```bash
   mv workflow-name.yml.disabled workflow-name.yml
   ```
2. Ensure all required secrets and variables are configured (see below)
3. Commit and push the renamed file
4. The workflow will now be active

**To disable a workflow:**
1. Add the `.disabled` extension to the file name
   ```bash
   mv workflow-name.yml workflow-name.yml.disabled
   ```
2. Commit and push the change

---

## Repository Configuration

### Required Secrets

Secrets are encrypted environment variables that you create in your repository settings (`Settings > Secrets and variables > Actions > Secrets`).

| Secret Name | Description | Used By |
|------------|-------------|-------.disabled

**Purpose:** Deploys code to Pantheon development environment when changes are pushed to the `main` branch.

**Status:** Currently disabled. Remove `.disabled` extension to activateup`, `pantheon-deploy-multidev`, `pantheon-multidev-cleanup`, `pantheon-playwright-vrt` |
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token for posting notifications to Slack channels | `pantheon-deploy-multidev` (optional in `pantheon-deploy-development`) |
| `GHPAC_TOKEN` | GitHub Personal Access Token with repo permissions for workflow operations | `pantheon-playwright-vrt` |

### Required Variables

Variables are non-sensitive configuration values that you create in your repository settings (`Settings > Secrets and variables > Actions > Variables`).

| Variable Name | Description | Example Value | Used By |
|--------------|-------------|---------------|---------|
| `PANTHEON_SITE` | Your Pantheon site machine name | `my-drupal-site` | All workflows |
| `PANTHEON_GIT_REMOTE` | Git remote URL for your Pantheon repository | `ssh://codeserver.dev.xxx@codeserver.dev.xxx.drush.in:2222/~/repository.git` | `pantheon-deploy-development`, `pantheon-deploy-multidev` |
| `PHP_VERSION` | PHP version to use for builds and deployments | `8.3` | `pantheon-daily-backup`, `pantheon-deploy-development`, `pantheon-deploy-multidev` |
| `THEME_PATH` | Path to the theme directory relative to repository root | `web/themes/custom/my_theme` | `pantheon-deploy-development`, `pantheon-deploy-multidev` |
| `PANTHEON_MULTIDEV_CLONE_ENV` | Source Pantheon environment to clone when creating new multidev environments | `dev` or `test` | `pantheon-deploy-multidev`, `pantheon-playwright-vrt` |
| `SLACK_CHANNEL` | Slack channel ID for deployment notifications | `C0123456789` | `pantheon-deploy-multidev` (optional in `pantheon-deploy-development`) |
| `PLAYWRIGHT_BASELINE_URL` | Baseline URL for Playwright visual regression tests | `https://www.example.com` | `pantheon-playwright-vrt` |

## Workflow-Specific Configuration

### pantheon-deploy-development.yml

**Purpose:** Deploys code to Pantheon development environment when changes are pushed to the `main` branch.

**Triggers:** Push to `main` branch

**Required Configuration:**
- Secrets: `SSH_PRIVATE_KEY`
- Variables: `THEME_PATH`, `PANTHEON_GIT_REMOTE`, `PHP_VERSION`

**Optional Configuration:**
- Secrets: `SLACK_BOT_TOKEN` (for Slack notifications - currently commented out)
- Variables: `SLACK_CHANNEL`, `PANTHEON_SITE` (for Slack notifications - currently commented out)

---.disabled

**Purpose:** Creates and deploys to Pantheon multidev environments when pull requests are opened/updated for branches starting with `feature/`.

**Status:** Currently disabled. Remove `.disabled` extension to activate

**Purpose:** Creates and deploys to Pantheon multidev environments when pull requests are opened/updated for branches starting with `feature/`.

**Triggers:** Pull requests to `main` branch (only for branches starting with `feature/`)

**Required Configuration:**
- Secrets: `SSH_PRIVATE_KEY`, `PANTHEON_MACHINE_TOKEN`, `SLACK_BOT_TOKEN`
- Variables: `THEME_PATH`, `PANTHEON_GIT_REMOTE`, `PHP_VERSION`, `PANTHEON_SITE`, `PANTHEON_MULTIDEV_CLONE_ENV`, `SLACK_CHANNEL`

---

##Status:** Currently disabled. Remove `.disabled` extension to activate.

**Triggers:** Pull request closed (merged or not)d.

**Triggers:** Pull request closed (merged or not)

**Status:** Currently disabled (`.disabled` extension). Remove `.disabled` to activate.

**Required Configuration:**
- Secrets: `SSH_PRIVATE_KEY`, `PANTHEON_MACHINE_TOKEN`
- Variables: `PANTHEON_SITE`

---

### pantheon-daily-backup.yml.disabled

**Status:** Currently disabled. Remove `.disabled` extension to activate.

**Triggers:** 
- Scheduled (daily at 2:00 AM UTC)
- Manual trigger via workflow_dispatch

**Status:** Currently disabled (`.disabled` extension). Remove `.disabled` to activate.

**Required Configuration:**
- Secrets: `SSH_PRIVATE_KEY`, `PANTHEON_MACHINE_TOKEN`
- Variables: `PHP_VERSION`, `PANTHEON_SITE`

---

### pantheon-playwright-vrt.yml.disabled

**Purpose:** Runs Playwright visual regression tests against Pantheon environments.

**Status:** Currently disabled. Remove `.disabled` extension to activate.

**Triggers:**
- Manual trigger via workflow_dispatch (test or baseline mode)
- Scheduled weekly baseline refresh (Mondays at 2:00 AM UTC)

**Required Configuration:**
- Secrets: `PANTHEON_MACHINE_TOKEN`, `SSH_PRIVATE_KEY`, `GHPAC_TOKEN`
- Variables: `PANTHEON_SITE`, `PANTHEON_MULTIDEV_CLONE_ENV`, `PLAYWRIGHT_BASELINE_URL`

## Setup Instructions

### 1. Create Secrets

1. Navigate to your repository on GitHub
2. Go to `Settings > Secrets and variables > Actions`
3. Click `New repository secret`
4. Add each required secret with its corresponding value

### 2. Create Variables

1. Navigate to your repository on GitHub
2. Go to `Settings > Secrets and variables > Actions > Variables tab`
3. Click `New repository variable`
4. Add each required variable with its corresponding value

### 3. Enable Workflows

All workflows are currently disabled. To enable a workflow, see the **Enabling Workflows** section at the top of this document.

## How to Obtain Required Credentials

### SSH_PRIVATE_KEY
Generate an SSH key pair and add the public key to your Pantheon account:
```bash
ssh-keygen -t ed25519 -C "github-actions@your-project.com" -f pantheon_deploy_key
```
Add the public key (`pantheon_deploy_key.pub`) to your Pantheon account, then add the private key contents as the secret.

### PANTHEON_MACHINE_TOKEN
1. Log in to your Pantheon dashboard
2. Go to Account Settings > Machine Tokens
3. Create a new machine token
4. Copy the token and add it as a secret

### SLACK_BOT_TOKEN
1. Create a Slack App at https://api.slack.com/apps
2. Add the `chat:write` OAuth scope
3. Install the app to your workspace
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

### GHPAC_TOKEN
1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token with `repo` scope
3. Copy the token and add it as a secret

## Troubleshooting

- **Workflow not running:** Check that the file has a `.yml` or `.yaml` extension (not `.disabled`)
- **Authentication errors:** Verify that secrets are correctly set and haven't expired
- **Pantheon deployment failures:** Ensure `PANTHEON_GIT_REMOTE` is correct and SSH key is properly configured
- **Multidev creation fails:** Check that your Pantheon plan supports multidev environments

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Pantheon Terminus Documentation](https://pantheon.io/docs/terminus)
- [Aten Actions Repository](https://github.com/AtenDesignGroup/aten-actions)
