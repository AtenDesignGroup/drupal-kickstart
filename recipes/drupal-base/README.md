## Base Recipe

This recipe is designed to do the following:

- Install certain parts of Standard install profile that we want
- Disable core modules we don't want
- Set specific contributed module configuration
- Provide a starting point for Drupal ready to develop features for without
  wasting too much time on the post-install ceremony.

## Installing

- Start with a Drupal 10 site.
- Install the 'Minimal' profile.
- Apply the recipe

The recipe can be applied with PHP in Drupal 10.3+.

Execute this command from the web root:

```shell
php core/scripts/drupal recipe recipes/contrib/drupal-base
```

Or by using `ddev exec`

```shell
ddev exec -d /var/www/html/docroot php core/scripts/drupal recipe recipes/contrib/drupal-base
```

If all goes well, you should see the following output:

```shell
 [OK] Drupal Base applied successfully
```

Clear the cache after the recipe is applied. When going back to the site,
all the recipe configuration and customization has been applied.
