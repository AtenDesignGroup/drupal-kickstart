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
