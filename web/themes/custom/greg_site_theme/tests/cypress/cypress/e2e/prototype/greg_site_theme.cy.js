const THEME_DIR = Cypress.env('themeDir') || '../../custom/cypress_test';

describe('GregSiteTheme theme generator', () => {
  beforeEach(() => {});

  before(function () {
    // Skip entire generator test suite in CI
    if (Cypress.env('skipGeneratorTests')) {
      cy.log(
        'Skipping generator tests in CI - testing greg_site_theme theme directly',
      );
      this.skip();
    }

    // Remove the theme from previous tests.
    cy.exec(`rm -rf ${THEME_DIR}`);
    // Ensure the generated theme does not exist.
    cy.readFile(`${THEME_DIR}/cypress_test.info.yml`).should('not.exist');

    cy.drush('config:set system.theme default olivero').then((result) => {
      cy.drush('cr');
    });

    // Use generatorCommand from env if available (CI), otherwise use default (local)
    const generatorCmd =
      Cypress.env('generatorCommand') ||
      'cd ../.. && php generator.php -n cypress_test -d "Cypress Test" -p themes/custom -a test && cd cypress_test';

    cy.exec(generatorCmd, {
      env: {},
      timeout: 120000,
      failOnNonZeroExit: true,
    }).then((result) => {
      // Ensure the generated theme was created.
      cy.readFile(`${THEME_DIR}/cypress_test.info.yml`).should(
        'contain',
        "name: 'Cypress Test'",
      );
      cy.readFile(`${THEME_DIR}/partials/_base.scss`).should(
        'contain',
        "$property-prefix: 'cyptst';",
      );

      // Ensure greg_site_theme specific folders were removed from the generated theme.
      cy.readFile(`${THEME_DIR}/.tugboat/config.yml`).should('not.exist');
      cy.readFile(`${THEME_DIR}/tests/cypress/package.json`).should(
        'not.exist',
      );

      // Install npm dependencies and build the theme.
      cy.exec(`cd ${THEME_DIR}/ && npm install && npm run build`, {
        timeout: 120000,
        failOnNonZeroExit: false,
      }).then((result) => {
        // Enable the test theme.
        cy.drush('theme:install cypress_test').then((result) => {
          cy.drush('config:set system.theme default cypresstest');
          cy.drush('cr');
        });
      });
    });
  });

  after(() => {});

  it.only('successfully runs gulp commands', () => {
    // Clean compiled assets.
    cy.exec(`cd ${THEME_DIR}/ && npm run clean`, {
      timeout: 120000,
    }).then((result) => {
      cy.readFile(`${THEME_DIR}/components/01-elements/wysiwyg.css`).should(
        'not.exist',
      );
      cy.readFile(
        `${THEME_DIR}/components/02-components/accordion/accordion.css`,
      ).should('not.exist');
      cy.readFile(
        `${THEME_DIR}/components/02-components/accordion/accordion.js`,
      ).should('not.exist');

      // Rebuild the theme.
      cy.exec(`cd ${THEME_DIR}/ && npm run build`, {
        timeout: 120000,
      });

      // Clear cache after rebuild.
      cy.drush('cr');

      cy.readFile(`${THEME_DIR}/components/00-base/colors.css`).should('exist');
      cy.readFile(`${THEME_DIR}/components/01-elements/wysiwyg.css`).should(
        'exist',
      );
      cy.readFile(
        `${THEME_DIR}/components/02-components/accordion/accordion.css`,
      ).should('exist');
      cy.readFile(
        `${THEME_DIR}/components/02-components/accordion/accordion.js`,
      ).should('exist');
    });
  });

  it('successfully enables the generated theme', () => {
    // Visit the homepage.
    cy.visit('/');
    // Ensure the Cypress Test theme is active by checking for the main content block.
    cy.get('#block-cypresstest-content').should('exist');
  });
});
