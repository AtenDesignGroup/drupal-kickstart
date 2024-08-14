# Aten Drupal Kickstart

Starter repo for a Drupal website.

## Documentation

### Patches

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
