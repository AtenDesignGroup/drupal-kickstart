cd ${DOCROOT}/themes/contrib/prototype/tests/cypress
npm run cy:run -- --config baseUrl=$TUGBOAT_DEFAULT_SERVICE_URL --spec "./cypress/e2e/prototype/**/*" --env drushCommand="$DRUPAL_COMPOSER_ROOT/vendor/bin/drush \$COMMAND"
