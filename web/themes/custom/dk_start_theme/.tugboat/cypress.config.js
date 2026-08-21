const { defineConfig } = require('cypress');
module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Tugboat environment Drush command.
      // "drushCommand": "tugboat shell 64b6b6ca7dc1ba41453f9185 command=\"/var/www/drupal/vendor/bin/drush $COMMAND\""
      // Local environment Drush command.
      drushCommand: 'drush $COMMAND',
    },
    // Tugboat environment URL.
    // baseUrl: 'https://2-1-x-eukeksk3u2ly80ggc7tond0hnujwtdkf.tugboatqa.com'
    // Local environment URL.
    baseUrl: 'http://localhost',
    video: false,
  },
});
