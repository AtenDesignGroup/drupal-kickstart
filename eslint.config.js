// @ts-check
const js = require('@eslint/js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  js.configs.recommended,
  {
    files: [
      'web/modules/custom/**/*.{js,jsx,ts,tsx}',
      'web/themes/custom/**/components/**/*.{js,jsx,ts,tsx}',
      'web/themes/custom/**/libraries/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Drupal globals
        Drupal: 'readonly',
        drupalSettings: 'readonly',
        drupalTranslations: 'readonly',
        jQuery: 'readonly',
        once: 'readonly',
        _: 'readonly',
        Backbone: 'readonly',
        Modernizr: 'readonly',
        CKEditor5: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-undef': 'error',
    },
  },
  {
    // Ignore non-custom files and build artifacts
    ignores: [
      'node_modules/**',
      'vendor/**',
      'web/core/**',
      'web/modules/contrib/**',
      'web/themes/contrib/**',
      'web/libraries/**',
      '**/dist/**',
      '**/build/**',
    ],
  },
];
