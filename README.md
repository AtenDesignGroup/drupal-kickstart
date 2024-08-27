# Aten Drupal Kickstart Documentation

Starter repo for a Drupal website.

## Development Workflow

Projects built using this starter project make a number of assumptions. First
that the project codebase is hosted on Github. This allows leveraging of
Github Actions for deployments to various remote hosting environments.

For all projects in active development, Pantheon hosting is assumed at least to
start. This allows developers to leverage Pantheon's free sandbox and multidev
environments. Additional hosting providers can be configured by updating Github
Actions deployment scripts.

Branches prefixed with `feature/` will get a new multidev environment created
when a new PR is opened against the `main` branch. Sequential pushes to that
branch will update the multidev environment. Closing the PR will destroy the
multidev environment.

## Patches

Composer based websites should use the [composer-patches](https://github.com/cweagans/composer-patches)
plugin. This allows for patches to be applied every time `composer install` is
ran. To keep things clean, all patches should live in an external
`composer.patches.json` file and *not* within the main `composer.json` file.

Best practice should be that patches are contributed back to their associated
Drupal project and referenced by with the issue number. For example:

```
"drupal/core": {
  "#12345: Short description...": "https://www.drupal.org/path/to/file.patch",
}
```

In rare cases where a local patch is needed, keep the `.patch` or `.diff` file
in the repo's `/patches` folder.

## Scaffold Development Instructions

To add or update packages to this base install, pass the `--no-update` flag into
the `composer require` or `composer update` commands. This will ensure no
`package.json` file is created and dependencies are not installed.

There a series of scripts for testing updates to the installer:

* `composer test:ak-installer`: Runs a test install. Places files on the Desktop.
* `composer cleanup:ak-installer`: Removes the installed directory. Gets ran before new installs.
