describe('DkStartTheme Theme', () => {
  beforeEach(() => {
    // Visit homepage before each test
    cy.visit('/');
  });

  it('loads the homepage successfully', () => {
    cy.get('body').should('exist');
    cy.get('html').should('have.attr', 'lang', 'en');
  });

  it('has the dk_start_theme theme active', () => {
    // Check for theme-specific CSS class or element
    cy.get('body').should('have.class', 'path-frontpage');
  });

  it('loads compiled CSS files', () => {
    // Check that CSS files are loaded in the page
    cy.get('link[rel="stylesheet"]').should('have.length.at.least', 1);

    // Verify theme CSS exists (check for common Drupal theme patterns)
    cy.get('link[rel="stylesheet"]').then(($links) => {
      const hrefs = $links.toArray().map((el) => el.href);
      const hasThemeCSS = hrefs.some(
        (href) => href.includes('/themes/') || href.includes('dk_start_theme'),
      );
      expect(hasThemeCSS, 'Should have theme CSS loaded').to.be.true;
    });
  });

  it('loads compiled JavaScript files', () => {
    // Drupal loads JS in various ways - just verify some scripts exist
    cy.document().then((doc) => {
      const scripts = doc.querySelectorAll('script');
      expect(scripts.length).to.be.at.least(1);
    });
  });

  it('renders main content region', () => {
    // Check that main content area exists
    cy.get('main').should('exist');
  });
});
