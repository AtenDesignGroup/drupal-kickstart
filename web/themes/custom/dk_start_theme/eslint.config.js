import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';

export default defineConfig([
  {
    ignores: [
      'dist/',
      'node_modules/',
      'build/',
      'vendor/',
      'web/',
      '.tugboat/',
      'tests/cypress/',
      // Ignore compiled JavaScript files in component directories
      'components/**/!(src)/*.js',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        Drupal: 'readonly',
        once: 'readonly',
        drupalSettings: 'readonly',
        drupalTranslations: 'readonly',
        jQuery: 'readonly',
        _: 'readonly',
        Cookies: 'readonly',
        Backbone: 'readonly',
        Modernizr: 'readonly',
        loadjs: 'readonly',
        Shepherd: 'readonly',
        Sortable: 'readonly',
        CKEditor5: 'readonly',
        tabbable: 'readonly',
        slugify: 'readonly',
        bodyScrollLock: 'readonly',
      },
    },
    plugins: {
      js,
    },
    extends: ['js/recommended'],
    rules: {
      semi: ['error', 'always'],
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-console': 'off', // Allow console in build scripts
      'no-useless-escape': 'off', // Allow escapes in postcss config
    },
  },
  // Relax rules for build configuration files
  {
    files: [
      'gulpfile.js',
      'webpack.config.js',
      'postcss.config.js',
      '*.config.js',
    ],
    rules: {
      'no-unused-vars': 'off', // Config files often import for types/plugins
    },
  },
]);
