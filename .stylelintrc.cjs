module.exports = {
  extends: [
    'stylelint-config-standard-scss'
  ],
  rules: {
    // Major syntax issues only - disable formatting rules
    'scss/load-no-partial-leading-underscore': null,
    'scss/comment-no-empty': null,
    'property-no-vendor-prefix': null,
    'block-no-empty': null,
    'scss/at-mixin-pattern': null,
    'selector-pseudo-element-colon-notation': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'declaration-empty-line-before': null,
    'no-duplicate-selectors': null,
    'no-descending-specificity': null,
    'scss/double-slash-comment-empty-line-before': null,
    'scss/double-slash-comment-whitespace-inside': null,
    'scss/dollar-variable-colon-space-after': null,
    'scss/dollar-variable-empty-line-before': null,
    'shorthand-property-no-redundant-values': null,
    'color-hex-length': null,
    'color-function-notation': null,
    'alpha-value-notation': null,
    'scss/at-if-closing-brace-newline-after': null,
    'scss/at-if-closing-brace-space-after': null,
    'scss/at-else-empty-line-before': null,
    'scss/operator-no-newline-before': null,
    'scss/operator-no-unspaced': null,
    'scss/at-if-no-null': null,
    'scss/at-mixin-parentheses-space-before': null,
    'scss/at-rule-conditional-no-parentheses': null,
    'number-max-precision': null,
    'value-keyword-case': null,
    'font-family-no-duplicate-names': null,
    'length-zero-no-unit': null,
    'declaration-block-no-redundant-longhand-properties': null,
    
    // Keep only critical rules that catch real problems
    'selector-class-pattern': null,
    'declaration-no-important': null,
    'media-feature-range-notation': null,
    'scss/no-global-function-names': null,
    'scss/dollar-variable-pattern': null,
    
    // Allow flexible quote handling
    'selector-attribute-quotes': null,
    'font-family-name-quotes': null
  },
  ignoreFiles: [
    // Exclude Drupal core and contrib
    'web/core/**/*.css',
    'web/core/**/*.scss',
    'web/modules/contrib/**/*.css', 
    'web/modules/contrib/**/*.scss',
    'web/themes/contrib/**/*.css',
    'web/themes/contrib/**/*.scss',
    
    // Exclude build/compiled files and dependencies
    'node_modules/**/*.css',
    'node_modules/**/*.scss',
    '**/dist/**/*.css',
    '**/dist/**/*.scss',
    '**/build/**/*.css', 
    '**/build/**/*.scss',
    '**/compiled/**/*.css',
    '**/compiled/**/*.scss',
    
    // Exclude common build output directories
    '**/css/**/*.css',        // Compiled CSS from SCSS
    '**/assets/**/*.css',     // Built assets
    '**/public/**/*.css',     // Public build files
    '**/generated/**/*.css',  // Generated files
    
    // Exclude minified files
    '**/*.min.css',
    '**/*.min.scss'
  ]
};