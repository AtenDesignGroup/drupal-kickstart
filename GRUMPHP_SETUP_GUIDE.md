# GrumPHP Code Quality Setup Guide

This is a guide for installing and using Code Quality tools with GrumPHP. GrumPHP adds a pre-commit hook to git that forces code quality checks before code is allowed to be commited. You will be faced with an angry gnome to correct you code changes. By correcting your code you can make the gnome happy. 

## Overview

This guide will help you set up a comprehensive code quality system that automatically checks:
- **PHPCodesniffer** - Drupal coding standards for PHP [repo](https://github.com/PHPCSStandards/PHP_CodeSniffer/)
- **PHPStan** - PHP code analyzer for bugs and file behavior. *NOTE: We aren't using this with GrumPHP but included in the guide because it's used widely in PHP development.* [phpstan](https://phpstan.org/)
- **Eslint** - Code quality and consistency for Javascript [eslint](https://eslint.org/)
- **Stylelint** - CSS/SCSS styling standards [stylelint](https://stylelint.io/)
- **Git** - Commit message validation

All tools integrate with **GrumPHP** to run automatically on every commit via git hooks.

## Prerequisites

- **Drupal 9/10/11** project with Composer
- **Git** repository initialized
- **Node.js 18+** (use `nvm` for version management)
- Command line access to your project

## Step 1: Install PHP Quality Tools

Add GrumPHP and PHP analysis tools to your project:

```bash
composer require --dev squizlabs/php_codesniffer
composer require --dev phpro/grumphp-shim
 # (Optional) not used in GrumPHP code checks.
composer require --dev mglaman/phpstan-drupal
# Install the same version Drupal core as rest of your project.
composer require --dev drupal/core-dev 
```

**What these do:**
- `phpro/grumphp` - Git hook manager and task runner
- `drupal/coder` - Drupal coding standards for PHP CodeSniffer
- `phpstan/phpstan` - Static analysis to catch PHP bugs

## Step 2: Install JavaScript and CSS Quality Tools

Initialize npm (if not already done) and install frontend quality tools:

```bash
# Initialize npm if package.json doesn't exist
npm init -y

# Install frontend quality tools
npm install --save-dev eslint @eslint/js
npm install --save-dev stylelint stylelint-config-standard-scss
npm install --save-dev lint-staged
```

**What these do:**
- `eslint` - JavaScript linter and formatter
- `stylelint` - CSS/SCSS linter and formatter
- `lint-staged` - Run tools only on staged files

## Step 3: Create Configuration Files

Create these configuration files in your project root:

### `grumphp.yml`

```yaml
grumphp:
  testsuites:
    git_commit_msg:
      tasks:
        - git_commit_message

    git_pre_commit:
      tasks:
        - phpcs
        - phpstan
        - composer
        - eslint
        - stylelint

  tasks:
    # Refer to phpcs.xml
    phpcs:
    # Refer to phpstan.neon
    phpstan:
      memory_limit: 512M
    # https://github.com/phpro/grumphp/blob/v2.x/doc/tasks/phpstan.md
    composer:
      file: ./composer.json
      strict: false
      no_check_all: true
      no_check_lock: false
      no_check_publish: false
      with_dependencies: false
    # https://github.com/phpro/grumphp/blob/v2.x/doc/tasks/phpcsfixer.md
    phpcsfixer:
      triggered_by: ['php']
    # ESLint for JavaScript linting
    eslint:
      bin: node_modules/.bin/eslint
      triggered_by: ['js', 'jsx', 'ts', 'tsx']
      whitelist_patterns:
        - /^web\/modules\/custom\/.*\.(js|jsx|ts|tsx)$/
        - /^web\/themes\/custom\/.*\/components\/.*\.(js|jsx|ts|tsx)$/
        - /^web\/themes\/custom\/.*\/libraries\/.*\.(js|jsx|ts|tsx)$/
      config: eslint.config.js
    # Stylelint for CSS/SCSS linting
    stylelint:
      bin: node_modules/.bin/stylelint
      triggered_by: ['css', 'scss', 'sass']
      whitelist_patterns:
        - /^web\/modules\/custom\/.*\.(css|scss|sass)$/
        - /^web\/themes\/custom\/.*\.(css|scss|sass)$/
      config: .stylelintrc.cjs
    # https://github.com/phpro/grumphp/blob/v2.x/doc/tasks/git_commit_message.md
    git_commit_message:
      allow_empty_message: false
      enforce_capitalized_subject: true
      enforce_no_subject_punctuations: false
      enforce_no_subject_trailing_period: true
      enforce_single_lined_subject: true
      type_scope_conventions: []
      max_body_width: 0
      max_subject_width: 0
      matchers:
        Must contain JIRA issue number: /(JIRA-\d+|GitHub Actions Build)/
      case_insensitive: true
      multiline: true
      additional_modifiers: ''
```

### `phpstan.neon` (Optional)

```neon
includes:
	- vendor/phpstan/phpstan/conf/bleedingEdge.neon

parameters:
	level: 1
	customRulesetUsed: true
	reportUnmatchedIgnoredErrors: false
	memoryLimitFile: 512M
	ignoreErrors:
	  - "#iterable type#"
	  - "#^Unsafe usage of new static#"
	  - "#Form extends @internal class#"
	  - "#^Class .* extends @internal class#"
	  - "#^Plugin definitions cannot be altered.#"
	  - '#Missing cache backend declaration for performance.#'
	  - '#Plugin manager has cache backend specified but does not declare cache tags.#'
	  - "#Drupal calls should be avoided in classes, use dependency injection instead#"
	excludePaths:
	  - */.*.php
	  - */core/*
	  - */sites/*
	  - */settings*.php
	  - */node_modules/*
	  - */themes/contrib/*
	  - */modules/contrib/*
	  - */profiles/contrib/*
	  - */bower_components/*
	  - */tests/fixtures/*.php
	  - */default.settings*.php
	  - */tests/Drupal/Tests/Listeners/Legacy/*
	paths:
		- web
```

### `eslint.config.js`

```javascript
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        Drupal: 'readonly',
        drupalSettings: 'readonly',
        jQuery: 'readonly',
        $: 'readonly',
        once: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        google: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        markerIcon: 'writable',
        countMarker: 'writable'
      }
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  {
    files: ['web/modules/custom/**/*.js'],
    languageOptions: {
      sourceType: 'script'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'vendor/**',
      'web/core/**',
      'web/libraries/**',
      'web/modules/contrib/**',
      'web/themes/contrib/**',
      '**/build/**',
      '**/gulp-tasks/**',
      '**/gulpfile.js',
      '**/config.js',
      '**/*.min.js',
      '**/*.bundle.js'
    ]
  }
];
```

### `.stylelintrc.cjs`

```javascript
module.exports = {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // Reduce strictness for Drupal compatibility
    'declaration-no-important': null,
    'selector-class-pattern': null,
    'selector-id-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'scss/at-mixin-pattern': null,
    'scss/at-function-pattern': null,
    'scss/dollar-variable-pattern': null,
    'scss/percent-placeholder-pattern': null,
    
    // Drupal-specific adjustments
    'color-hex-length': 'long',
    'declaration-block-trailing-semicolon': 'always',
    'indentation': 2,
    'max-line-length': 120,
    'no-descending-specificity': null,
    'scss/at-import-partial-extension': null
  },
  ignoreFiles: [
    '**/node_modules/**',
    '**/vendor/**',
    '**/build/**',
    '**/dist/**',
    '**/libraries/**',
    'web/core/**',
    'web/sites/default/files/**'
  ]
};
```

### `.stylelintignore`

```
# Dependencies
node_modules/
vendor/

# Build files
build/
dist/
*.min.css
*.min.scss

# Drupal core and contrib
web/core/
web/modules/contrib/
web/themes/contrib/
web/profiles/contrib/
web/libraries/

# Generated files
web/sites/default/files/
```

### `.nvmrc`

```
lts/hydrogen
```

### Update `package.json` Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint web/modules/custom web/themes/custom",
    "lint:fix": "eslint web/modules/custom web/themes/custom --fix",
    "lint:staged-files": "git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(js|jsx)$' | xargs -r npx eslint",
    "lint:css": "stylelint 'web/{modules,themes}/custom/**/*.{css,scss,sass}'",
    "lint:css:fix": "stylelint 'web/{modules,themes}/custom/**/*.{css,scss,sass}' --fix",
    "lint:css:staged-files": "git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(css|scss|sass)$' | xargs -r npx stylelint",
    "quality-check": "npm run lint && npm run lint:css",
    "quality-check:fix": "npm run lint:fix && npm run lint:css:fix",
    "quality-check:staged": "npm run lint:staged-files && npm run lint:css:staged-files",
    "grumphp": "vendor/bin/grumphp run --testsuite=git_pre_commit",
    "grumphp:commit-msg": "vendor/bin/grumphp run --testsuite=git_commit_msg"
  }
}
```

## Step 4: Initialize GrumPHP

Set up the git hooks:

```bash
# Initialize GrumPHP git hooks
vendor/bin/grumphp git:init

# Verify installation
vendor/bin/grumphp --version
```

## Step 5: Node.js Version Management

Ensure consistent Node.js version across your team:

```bash
# Install and use the correct Node.js version
nvm install --lts
nvm use

# Verify versions
node --version  # Should be 18+
npm --version   # Should be 8+
```

## Step 6: Test Your Setup

### Test Individual Tools

```bash
# Test PHP tools
vendor/bin/phpcs web/modules/custom/
vendor/bin/phpstan analyse

# Test JavaScript tools
npm run lint
npm run lint:css

# Test GrumPHP integration
vendor/bin/grumphp run --testsuite=git_pre_commit
```

### Test Git Integration

Create a test commit to verify the hooks work:

```bash
# Stage some files
git add .

# Try to commit (this will trigger GrumPHP)
git commit -m "Test commit WS-123"
```

You should see GrumPHP run all quality checks automatically.

## Step 7: Customize for Your Project

### Update Project-Specific Settings

1. **Commit Message Pattern** - Update the JIRA pattern in `grumphp.yml`:
   ```yaml
   matchers:
     - '/^.*(YOUR-PROJECT)-\d+.*$/'
   ```

2. **File Paths** - Adjust whitelist patterns if your custom code is in different locations

3. **Quality Levels** - Increase PHPStan level in `phpstan.neon` as your code improves:
   ```neon
   parameters:
     level: 2  # Start with 1, gradually increase to 8
   ```

### Optional: Create Custom Scripts

Add project-specific npm scripts for common workflows:

```json
{
  "scripts": {
    "quality-check:mymodule": "npm run lint web/modules/custom/mymodule && npm run lint:css web/modules/custom/mymodule"
  }
}
```

## Step 8: Team Onboarding

### Documentation for Team Members

Create a `.github/` or `docs/` folder with:
- Copy of this setup guide
- Developer workflow documentation
- Troubleshooting guide

### New Developer Setup

Team members should run:
```bash
composer install
npm install
nvm use
vendor/bin/grumphp git:init
```

## Using the Tools in Daily Development

### Composer Scripts (Recommended Approach)

Instead of using `/vendor/bin/` paths directly, use the convenient composer scripts defined in `composer.json`:

```bash
# Run all quality checks (same as GrumPHP pre-commit checks)
composer grumphp

# Check PHP code
composer phpcs web/modules/custom/mymodule/

# Check and fix PHP code
composer phpcsfixer web/modules/custom/mymodule/
composer phpcsfixer:dry-run web/modules/custom/mymodule/  # Preview first

# Check JavaScript
composer eslint web/modules/custom/mymodule/js/ --config=eslint.config.js

# Auto-fix JavaScript
composer eslint:fix web/modules/custom/mymodule/js/

# Check CSS/SCSS
composer stylelint web/modules/custom/mymodule/css/ --config=.stylelintrc.cjs

# Auto-fix CSS/SCSS
composer stylelint:fix web/modules/custom/mymodule/css/
```

### Demo Module for Training

A complete demo module is included at `web/modules/custom/demo_module/` that contains:
- Intentional code violations for each type of check
- Corrected versions showing best practices
- A comprehensive README with examples

**To explore the demo:**
```bash
# Read the demo README
cat web/modules/custom/demo_module/README.md

# Run checks on demo files to see violations
composer phpcs web/modules/custom/demo_module/src/ExampleService.php
composer eslint web/modules/custom/demo_module/js/demo-violations.js
composer stylelint web/modules/custom/demo_module/css/demo-violations.scss

# Compare with the corrected versions
cat web/modules/custom/demo_module/src/ExampleServiceFixed.php
cat web/modules/custom/demo_module/js/demo-fixed.js
```

### Reference: All Composer Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `composer grumphp` | `./vendor/bin/grumphp run` | Run all GrumPHP pre-commit checks |
| `composer grumphp:pre-commit` | `./vendor/bin/grumphp git:pre-commit` | Manual pre-commit hook execution |
| `composer phpcs` | `./vendor/bin/phpcs` | PHP CodeSniffer (Drupal standards) |
| `composer phpcbf` | `./vendor/bin/phpcbf` | PHP Code Beautifier (basic fixes) |
| `composer phpcsfixer` | `./vendor/bin/php-cs-fixer fix` | PHP CS Fixer (comprehensive fixes) |
| `composer phpcsfixer:dry-run` | `./vendor/bin/php-cs-fixer fix --dry-run --diff` | Preview PHP CS Fixer changes |
| `composer eslint` | `./node_modules/.bin/eslint` | ESLint for JavaScript |
| `composer eslint:fix` | `./node_modules/.bin/eslint --fix` | ESLint with auto-fix |
| `composer stylelint` | `./node_modules/.bin/stylelint` | Stylelint for CSS/SCSS |
| `composer stylelint:fix` | `./node_modules/.bin/stylelint --fix` | Stylelint with auto-fix |

## Troubleshooting Common Setup Issues

### Issue: GrumPHP hooks not working
**Solution:**
```bash
# Reinitialize hooks
vendor/bin/grumphp git:deinit
vendor/bin/grumphp git:init
```

### Issue: Node.js version conflicts
**Solution:**
```bash
# Use project-specific Node.js version
nvm install
nvm use
```

### Issue: Tools not found
**Solution:**
```bash
# Ensure all dependencies are installed
composer install
npm install

# Check tool paths
which eslint
which stylelint
```

### Issue: Permission errors
**Solution:**
```bash
# Make sure git hooks are executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
```

## Maintenance

### Regular Updates

Keep tools updated for security and new features:

```bash
# Update PHP tools
composer update --dev

# Update Node.js tools
npm update --save-dev

# Check for outdated packages
npm outdated
```

### Adding New Rules

1. Update configuration files
2. Run tests on existing code
3. Fix issues or adjust rules
4. Commit changes

## Benefits You'll See

✅ **Consistent Code Quality** - All team members follow the same standards
✅ **Early Bug Detection** - Catch issues before they reach production  
✅ **Automated Enforcement** - No manual quality check processes needed
✅ **Improved Maintainability** - Cleaner, more readable codebase
✅ **Team Productivity** - Less time spent on code review nitpicks

---

> **Next Steps:** After setup, refer to the `DEVELOPER_WORKFLOW.md` guide for daily usage and troubleshooting tips.
