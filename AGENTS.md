# AGENTS.md: AI Agent Guide for Drupal Development with DDEV

**AI Agent Instructions**: This guide provides comprehensive instructions for AI coding agents working on Drupal projects using DDEV. Follow these guidelines for consistent, high-quality contributions. Human contributors should use README.md instead.

## Project Overview
- **Core Technology**: Drupal 11.x+ (verify via `composer show drupal/core`)
- **Development Environment**: DDEV (Docker-based development environment)
- **Key Components**: Custom modules, themes, configuration management, Composer dependencies
- **Environment**: PHP 8.3+, MySQL/MariaDB, Nginx (all managed by DDEV)
- **Development Tools**: Composer, Drush 13+, Git, DDEV CLI
- **Important**: All DDEV commands should be run from project root. Use `ddev exec` for Drupal-specific commands.

## Drupal 11 Key Changes & Requirements

These are the most critical Drupal 11-specific changes an AI agent must be aware of:

| Area | Drupal 10 | Drupal 11 |
|------|-----------|-----------|
| **PHP requirement** | 8.1+ | 8.3+ (minimum) |
| **Symfony** | 6.x | 7.x |
| **Plugin discovery** | Docblock annotations (`@Block`) | PHP 8 Attributes (`#[Block]`) — annotations deprecated |
| **Hooks (OOP)** | Procedural only in `.module` | `#[Hook]` attribute in classes (Drupal 11.1+) |
| **CKEditor** | CKEditor 4 removed, CKEditor 5 default | CKEditor 5 only |
| **Frontend theme** | Bartik removed, Olivero default | Olivero default |
| **Admin theme** | Seven removed, Claro default | Claro default |
| **Theme scaffolding** | Various approaches | Starterkit theme (`php core/scripts/drupal generate-theme`) |
| **Single Directory Components** | Experimental | Stable (SDC — `components/` directory per module/theme) |
| **Recipes** | Not available | Available (Drupal 10.3+/11) |
| **jQuery** | Present but reduced | Further reduced; avoid relying on it |

### Drupal 11 Deprecated / Removed
- `hook_menu_links_discovered_alter()` → use `hook_menu_links_discovered_alter()` or route subscribers
- Docblock annotation plugins (`@Block`, `@FieldFormatter`, etc.) — deprecated, removed in Drupal 12
- `drupal/core-recommended` now locks to Symfony 7
- `drupal-check` standalone tool → replaced by `phpstan/phpstan` with `mglaman/phpstan-drupal` extension
- `AssertLegacyTrait` test methods removed — use `$this->assertSession()` exclusively
- `seven` and `bartik` themes completely removed
- IE11 support fully dropped

### Drupal 11 Best Practices Summary
- Use PHP 8.3 features: readonly properties, named arguments, enums, fibers where appropriate
- Use PHP Attributes for all new plugins and hooks
- Use `#[Hook]` classes in `src/Hook/` for all new hook implementations
- Scaffold new themes with Starterkit: `ddev exec php core/scripts/drupal generate-theme my_theme`
- Use Single Directory Components (SDC) for reusable UI components
- Apply Recipes for sharable configuration bundles
- Use `phpstan` with the Drupal extension instead of `drupal-check`

## DDEV Quick Setup

### Prerequisites
```bash
# Install DDEV (macOS)
brew install ddev/ddev/ddev

# Or download from https://ddev.readthedocs.io/en/stable/users/installation/
# Verify installation
ddev --version
```

### Initialize DDEV Project
```bash
# Clone the repository
git clone <repository-url> my-drupal-project
cd my-drupal-project

# Initialize DDEV configuration
ddev config --project-type=drupal --docroot=web --php-version=8.3

# Start DDEV environment
ddev start

# Install Composer dependencies
ddev composer install

# Install Drupal
ddev exec drush site:install standard \
  --db-url=mysql://db:db@db/db \
  --account-name=admin \
  --account-pass=admin \
  --yes

# Enable development modules (kint is a sub-module of devel, not a separate project)
ddev exec drush pm:enable devel devel_generate webprofiler -y

# Clear caches
ddev exec drush cr

# Launch site in browser
ddev launch
```

### Essential DDEV Commands
```bash
# Environment management
ddev start                # Start development environment
ddev stop                 # Stop environment
ddev restart              # Restart environment
ddev delete               # Delete environment (careful!)

# Database operations
ddev snapshot             # Create database snapshot
ddev restore-snapshot     # Restore database snapshot
ddev import-db            # Import database from file
ddev export-db            # Export database to file

# Development tools
ddev exec <command>       # Execute command in container
ddev ssh                  # SSH into web container
ddev logs                 # View container logs
ddev describe             # Show environment details
ddev launch               # Open site in browser
```

### DDEV Configuration
Create `.ddev/config.yaml` for project-specific settings:

```yaml
# .ddev/config.yaml
type: drupal11
docroot: web
php_version: "8.3"
webserver_type: nginx-fpm
router_http_port: "80"
router_https_port: "443"
xdebug_enabled: false
additional_hostnames: []
additional_fqdns: []

# Drupal-specific settings
disable_settings_management: false
web_environment:
  - DRUSH_OPTIONS_URI=https://my-drupal-project.ddev.site
```

## Code Style and Standards
Adhere to Drupal coding standards (PSR-12 with Drupal extensions). Use Coder and PHPCS for enforcement.

- **PHP**:
  - Indentation: 2 spaces (no tabs)
  - Line length: ≤ 80 characters
  - Naming: CamelCase classes/methods, snake_case variables/functions
  - Always use braces; prefer early returns
  - Full PHPDoc blocks with `@param`, `@return`, `@throws`
  - Use PHP 8.3 features: readonly properties, named arguments, enums, match expressions
  - Avoid `\Drupal::` static calls; prefer dependency injection in all new code

- **YAML**: 2-space indentation, lowercase keys
- **Twig**: `{{ }}` for output, `{% %}` for logic; always escape with `|e`

- **Linting**:
  ```bash
  ddev exec vendor/bin/phpcs --standard=Drupal --extensions=php,inc,module,install,info,yml src/
  ddev exec vendor/bin/phpcs --standard=DrupalPractice --extensions=php,inc,module,install,info,yml src/
  ddev exec vendor/bin/phpcs --standard=Drupal --fix src/
  ```

**Reject any code that fails Drupal Coder sniffs.**

## Drupal Development Patterns

### Services & Dependency Injection
- **Create services** in `modulename.services.yml` file for reusable logic
- **Use dependency injection** to inject services into controllers, forms, and plugins
- **Core services** like `@current_user`, `@entity_type.manager`, `@database` are available
- **Best practice**: Avoid static `\Drupal::` calls in favor of dependency injection
- **Service discovery**: Use `drush eval "print_r(\Drupal::getContainer()->getServiceIds());"` to see available services
- **Location**: Place service classes in `src/` directory with proper namespace

### Entity API & Queries
- **Entity loading**: Use `Entity::load($id)` for single entities or `entityTypeManager()->getStorage()` for multiple
- **Entity queries**: Use `\Drupal::entityQuery()` for database operations instead of raw SQL
- **Query conditions**: Chain multiple conditions with `->condition()`, `->sort()`, `->range()`
- **Entity creation**: Create entities with `Entity::create(['type' => 'bundle_name'])`
- **Field access**: Use entity field API instead of direct property access
- **Performance**: Use entity query cache tags and contexts for optimal caching

### Plugin System
- **Plugin types**: Blocks, field formatters, field widgets, menu links, and more
- **Plugin discovery**: Drupal 11 uses **PHP 8 Attributes** (`#[Block]`, `#[FieldFormatter]`, etc.) instead of docblock annotations, which are deprecated
- **Plugin configuration**: Define plugin ID, label, and other metadata via attribute arguments: `#[Block(id: 'my_block', label: new TranslatableMarkup('My Block'))]`
- **Migration from annotations**: Replace `@Block(id = "my_block", ...)` in docblocks with `#[Block(id: 'my_block', ...)]` above the class declaration
- **Plugin base classes**: Extend appropriate base classes (`BlockBase`, `FormatterBase`, etc.)
- **Plugin placement**: Place plugins in `src/Plugin/Type/` directory structure
- **Derivative plugins**: Use for creating multiple plugins from one definition
- **Namespace**: Attributes live in `Drupal\Component\Plugin\Attribute` and `Drupal\Core\Block\Attribute` etc.
- **Best practice**: All new plugins should use PHP attributes; annotated plugins still work in Drupal 11 but will be removed in Drupal 12

### Hooks
- **Hook implementation (classic)**: Implement hooks as procedural functions in `modulename.module` — still fully supported
- **Hook implementation (OOP — Drupal 11.1+)**: Implement hooks as class methods using the `#[Hook]` PHP attribute; Drupal auto-discovers them
  ```php
  use Drupal\Core\Hook\Attribute\Hook;

  class MyModuleHooks {
    #[Hook('form_alter')]
    public function formAlter(array &$form, FormStateInterface $form_state, string $form_id): void {
      // Logic here.
    }
  }
  ```
- **Hook class placement**: Place hook classes in `src/Hook/` directory (e.g., `src/Hook/MyModuleHooks.php`)
- **Hook ordering**: Use `#[Hook('hook_name', order: OrderBefore::class)]` or `#[HookAfter]` for precise ordering across modules
- **Hook naming**: Follow pattern `hook_modulename_action()` for custom hooks
- **Hook parameters**: Use type hints and proper parameter documentation
- **Core hooks**: Common hooks include `hook_form_alter()`, `hook_theme()`, `hook_entity_presave()`
- **Hook order**: Hooks fire in module weight order (lowest first) unless overridden with ordering attributes
- **Best practice**: Prefer OOP hooks for new code — they support constructor injection and are easier to unit test; keep procedural hooks in `.module` for legacy compatibility only

### Forms API
- **Form classes**: Extend `FormBase` for simple forms or `ConfigFormBase` for configuration forms
- **Form structure**: Use render array structure with `#type`, `#title`, `#description` properties
- **Form validation**: Implement `validateForm()` method for custom validation
- **Form submission**: Implement `submitForm()` method for processing form data
- **Form elements**: Use proper form element types (textfield, select, checkbox, etc.)
- **AJAX forms**: Add `#ajax` property to form elements for dynamic behavior
- **Form caching**: Forms are automatically cached with CSRF protection

### Routes & Controllers
- **Routing file**: Define routes in `modulename.routing.yml` with path, defaults, and requirements
- **Controllers**: Create controller classes extending `ControllerBase` in `src/Controller/`
- **Route parameters**: Use `{parameter}` placeholders in paths and inject into controller methods
- **Access control**: Implement `_permission`, `_role`, or custom access callbacks
- **Route naming**: Use `modulename.action` naming convention for clarity
- **Controller injection**: Use constructor injection for dependencies
- **Return values**: Return render arrays or Symfony Response objects (Symfony 7 in Drupal 11)
- **Response types**: Use `CacheableResponse` or `CacheableJsonResponse` for cacheable responses
- **Access checking**: Prefer `AccessResult::allowedIfHasPermission()` over simple boolean checks

## Security & Performance Guidelines

### Security Requirements
- **Always sanitize user input**: Use `#plain_text` for untrusted content
- **CSRF protection**: Include `#token` for forms with side effects
- **Permissions**: Implement proper access checks and route requirements
- **SQL Injection**: Use Entity Query or proper parameter binding
- **XSS Prevention**: Always use `|e` filter in Twig, `#markup` for trusted HTML only
- **File uploads**: Validate MIME type and file extensions; never trust the client-supplied name
- **Dependency audit**: Run `ddev exec composer audit` regularly to catch known CVEs
- **Private files**: Store sensitive uploads in the private file system, not public
- **Config split**: Never commit secrets to the config sync directory; use environment variables

### Performance Best Practices
- **Render caching**: Always add `#cache` array to render arrays with appropriate `tags` and `contexts`
- **Cache tags**: Use entity-based tags like `['node:123']` or list-based tags like `['node_list']`
- **Cache contexts**: Apply user-specific contexts like `['user.roles']` for personalized content
- **Lazy loading**: Use `#lazy_builder` for expensive operations that can be loaded separately
- **Placeholder strategy**: Set `#create_placeholder: TRUE` for lazy builders to improve initial page load
- **Cache max-age**: Set appropriate `max-age` values based on content freshness requirements
- **Avoid premature optimization**: Profile first, then optimize based on actual bottlenecks
- **Database queries**: Use entity queries instead of raw SQL for better caching and security
- **Entity loading**: Load multiple entities at once when possible for better performance
- **Single Directory Components (SDC)**: Use SDC for reusable UI components — they are cache-aware and composable
- **Asset libraries**: Declare JS/CSS in `modulename.libraries.yml` and attach with `#attached`; never use `drupal_add_js()`
- **Big pipe**: Ensure Big Pipe module is enabled for streaming placeholder replacement on authenticated pages

### Caching Strategies
- **Render cache**: Cache complex markup with proper tags/contexts
- **Dynamic page cache**: Configure for anonymous users
- **Internal page cache**: Enable for authenticated users
- **Entity cache**: Leverage core entity caching
- **Redis/Memcache**: Configure for distributed caching

## DDEV Development Workflow

### Project Structure
- **Modules** → `web/modules/custom/<module_name>`
- **Themes** → `web/themes/custom/<theme_name>`
- **Configuration** → Export with `ddev exec drush config:export`
- **Profiles** → `web/profiles/custom/<profile_name>`

### Essential Development Commands
```bash
# Cache management (run inside DDEV)
ddev exec drush cr                    # Clear all caches
ddev exec drush cache:rebuild         # Alternative cache clear

# Configuration management
ddev exec drush config:export         # Export configuration
ddev exec drush config:import         # Import configuration

# Database operations
ddev snapshot                         # Create snapshot before changes
ddev exec drush updatedb              # Run database updates
```

### Debugging in DDEV

#### Core Debugging & Information Commands
| Command                          | Purpose                                                                 | Why it's useful for debugging                                      |
|----------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------|
| `ddev exec drush status`         | Shows Drupal root, site path, database connection, Drush version, etc. | Quickly verify that DDEV is pointing to the correct site and DB is connected. |
| `ddev exec drush core-status`    | Same as above but more detailed in newer versions.                      |                                                                    |
| `ddev exec drush watchdog:show`  | Lists recent log messages (dblog entries).                              | Primary command to read the Drupal error/log messages without going to /admin/reports/dblog. Supports filters: `--severity=Error`, `--type=php`, etc. |
| `ddev exec drush watchdog:delete all` | Clears the watchdog log.                                                | Useful when logs become huge and slow down watchdog operations. |
| `ddev exec drush sql:query "SELECT * FROM watchdog ORDER BY wid DESC LIMIT 50"` | Direct SQL access to logs when the database is very large.             | Faster than watchdog:show on sites with millions of log entries. |

#### Cache Debugging
| Command                          | Purpose                                                                 |
|----------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush cache:rebuild`  | Rebuilds all caches (equivalent to "drush cc all" in D7).              |
| `ddev exec drush cr`             | Alternative cache rebuild command.                                      |
| `ddev exec drush cache:get <bin>:<cid>` | Retrieve a specific cache item (e.g., `ddev exec drush cache:get config:core.extension`). |
| `ddev exec drush cache:clear <bin>` | Clear only one cache bin (render, config, discovery, etc.).            |

#### Configuration Debugging
| Command                                      | Purpose                                                                 |
|----------------------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush config:get <name>`          | Show a single configuration value (e.g., `ddev exec drush config:get system.site`). |
| `ddev exec drush config:set <name> <key> <value>` | Temporarily change a config value without using the UI.                 |
| `ddev exec drush config:export`              | Export active config to sync directory.                                 |
| `ddev exec drush config:import`              | Import config – very useful to test if config issues cause errors.      |
| `ddev exec drush config:delete <name>`       | Remove a config object (helps when orphaned config causes fatal errors).|

#### Module/Theming Debugging
| Command                                | Purpose                                                                 |
|----------------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush pm:list --type=module --status=enabled` | List enabled modules.                                                  |
| `ddev exec drush pm:enable <module>`   | Enable a module.                                                       |
| `ddev exec drush pm:uninstall <module>` | Fully uninstall a module (removes config and data).                    |
| `ddev exec drush pm:uninstall` without arguments → interactive mode is excellent for disabling suspected problematic modules quickly. |
| `ddev exec drush theme:debug` (Drupal 10+) | Lists all theme suggestions for a given route or render array.         |

#### Database & Entity Debugging
| Command                                      | Purpose                                                                 |
|----------------------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush sql:connect`                | Outputs the CLI command to connect to the DB (useful for manual queries). |
| `ddev exec drush sql:query`                  | Run arbitrary SQL.                                                      |
| `ddev exec drush entity:info`                | Show entity type definitions (useful when entity schema errors occur). |
| `ddev exec drush php`                        | Opens an interactive PHP shell with Drupal bootstrapped (like `ddev exec drush php:eval`). |
| `ddev exec drush php:eval "code"`            | Execute arbitrary PHP code in Drupal context (great for quick debugging). Example: `ddev exec drush php:eval "dpm(\Drupal::state()->get('system.cron_last'));"` (with Devel) |

#### Development & Error Reproduction
| Command                                | Purpose                                                                 |
|----------------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush php:eval "var_dump(function_exists('my_problematic_function'));"` | Quick test if a function exists or what it returns.                     |
| `ddev exec drush state:edit` / `ddev exec drush state:get/set/delete` | Inspect or override Drupal state values (often used by broken modules).|
| `ddev exec drush variable:get/set/delete` (D7 only) | Legacy equivalent of state commands.                                    |
| `ddev exec drush twig:debug`           | Turn Twig debugging on/off and verify template suggestions.            |
| `ddev exec drush eval`                 | Same as above (alias of php:eval).                                      |

#### Performance & Query Debugging
| Command                                | Purpose                                                                 |
|----------------------------------------|-------------------------------------------------------------------------|
| `ddev exec drush sql:query --db-prefix` | See queries with table prefixes expanded (helps reading raw SQL).      |
| Enable Devel + `ddev exec drush kint` or `ddev exec drush dpm()` in code → instant output in terminal. |

#### DDEV-Specific Debugging
```bash
# Enable Xdebug debugging
# Add to .ddev/config.yaml:
# xdebug_enabled: true

# DDEV container debugging
ddev logs -f web                       # Follow web container logs
ddev logs -f db                        # Follow database container logs
ddev describe                          # Show environment details and status

# Access PHP error logs
ddev exec tail -f /var/log/apache2/error.log

# Debugging functions (use with devel module)
ddev exec php -r "kint(\Drupal::config('system.site')->get());"

# Database connection debugging
ddev exec drush sql:connect            # Test database connection
ddev describe                          # Check environment status
```

### Performance Profiling in DDEV
```bash
# Performance analysis
ddev exec drush cr                     # Rebuild caches
ddev exec drush sql:query "EXPLAIN ANALYZE SELECT ..."  # Query analysis
ddev exec drush site:status           # System status check

# Use Webprofiler module for detailed profiling
# Access at https://my-drupal-project.ddev.site/admin/config/development/devel/webprofiler
```

### Version Control Workflow
- **Commit messages**: Format `[#123456] Brief descriptive title`
- **Branch from**: `develop` branch for features
- **Atomic commits**: One logical change per commit
- **Before pushing**: Run linting and tests

## Testing & Quality Assurance

### PHPUnit Testing Framework
Aim for ≥ 80% code coverage. Drupal provides multiple test types:

```bash
# Run all tests with coverage
ddev exec vendor/bin/phpunit -v --coverage-html coverage/

# Run specific test suites
ddev exec vendor/bin/phpunit --testsuite unit          # Unit tests (fast)
ddev exec vendor/bin/phpunit --testsuite kernel         # Kernel tests
ddev exec vendor/bin/phpunit --testsuite functional     # Functional tests (slower)
ddev exec vendor/bin/phpunit --testsuite javascript     # JavaScript tests

# Run specific tests
ddev exec vendor/bin/phpunit --filter MyModuleUnitTest
ddev exec vendor/bin/phpunit web/modules/custom/my_module/tests/src/Unit/

# Run with custom configuration
SIMPLETEST_DB=sqlite://localhost/tmp.sqlite ddev exec vendor/bin/phpunit
```

### Test Types and Examples

#### Unit Tests (fastest)
- **Purpose**: Test individual classes and methods in isolation
- **Base class**: Extend `UnitTestCase` from `Drupal\Tests\UnitTestCase`
- **Speed**: Fastest test type, no Drupal bootstrap required
- **Isolation**: Test one piece of functionality at a time
- **Dependencies**: Mock external dependencies and services
- **Location**: Place in `tests/src/Unit/` directory
- **Use cases**: Service logic calculations, utility functions, data transformations
- **Best practices**: Keep tests small, focused, and deterministic

#### Kernel Tests (with database)
- **Purpose**: Test Drupal interactions with minimal Drupal environment
- **Base class**: Extend `KernelTestBase` from `Drupal\KernelTests\KernelTestBase`
- **Environment**: Partial Drupal bootstrap with in-memory database
- **Modules**: Declare required modules in `$modules` static property
- **Database**: Uses SQLite in-memory database for speed
- **Location**: Place in `tests/src/Kernel/` directory
- **Use cases**: Entity CRUD operations, configuration validation, service registration
- **Setup**: Install modules and configuration in `setUp()` method

#### Functional Tests (with browser)
- **Purpose**: Test complete user interactions through browser simulation
- **Base class**: Extend `BrowserTestBase` from `Drupal\Tests\BrowserTestBase`
- **Environment**: Full Drupal bootstrap with real browser
- **Speed**: Slowest test type, full page loads required
- **Theme**: Set `$defaultTheme` property (usually 'stark' or 'claro')
- **Location**: Place in `tests/src/Functional/` directory
- **Use cases**: Form submissions, page access, user permissions, JavaScript interactions
- **Browser simulation**: Uses `symfony/browser-kit` (Mink/BrowserKitDriver); Goutte was removed
- **Assertions**: Use `$this->assertSession()` for web assertions; `AssertLegacyTrait` methods are removed in Drupal 11

### Code Quality Tools in DDEV
```bash
# Static analysis (add to composer require)
ddev exec vendor/bin/phpstan analyse                      # PHPStan analysis (with mglaman/phpstan-drupal)
ddev exec vendor/bin/psalm                               # Psalm analysis

# Security scanning
# Note: drupal-check is superseded by phpstan with mglaman/phpstan-drupal
ddev exec composer require --dev phpstan/phpstan mglaman/phpstan-drupal phpstan/phpstan-deprecation-rules
ddev exec vendor/bin/phpstan analyse web/modules/custom  # Deprecation & static analysis
ddev exec composer audit                                 # Check for security advisories

# Accessibility testing
ddev exec vendor/bin/phpunit --group accessibility       # Accessibility tests
```

### JavaScript Testing
```bash
# Install JavaScript dependencies
ddev exec npm install

# Run JavaScript tests
ddev exec npm run test                                   # Jest tests
ddev exec npm run test:a11y                             # Accessibility tests
```

### Before Submitting Code
```bash
# Quality checklist
ddev exec vendor/bin/phpcs --standard=Drupal .                   # Code style
ddev exec vendor/bin/phpcs --standard=DrupalPractice .           # Practice violations
ddev exec vendor/bin/phpstan analyse web/modules/custom          # Deprecations & static analysis
ddev exec vendor/bin/phpunit                                     # Run tests
ddev exec composer audit                                         # Check security advisories
ddev exec drush cr                                               # Clear caches
ddev exec drush updatedb                                         # Run database updates
ddev exec drush config:export                                    # Verify config is exported
```

## DDEV-Specific Troubleshooting

### Common DDEV Issues
```bash
# DDEV won't start
ddev poweroff && ddev start

# Port conflicts
# Edit .ddev/config.yaml to change ports
router_http_port: "8080"
router_https_port: "8443"

# Memory issues
# Increase PHP memory in .ddev/php/php.ini
memory_limit = 512M

# Composer memory issues
ddev exec php -d memory_limit=-1 /usr/local/bin/composer install

# Database connection issues
ddev describe    # Check environment status
ddev exec drush sql:connect  # Test database connection
```

### Performance Issues in DDEV
```bash
# Identify slow queries
ddev exec drush sql:query "SELECT * FROM watchdog WHERE type = 'php' ORDER BY wid DESC LIMIT 10"

# Check cache settings
ddev exec drush config:get system.performance

# Enable performance modules
ddev exec drush pm:enable memcache redis -y
```

### Module/Theme Development Issues in DDEV
```bash
ddev exec drush cr

# Service not found
ddev exec drush config:get core.extension

# Twig template not loading
ddev exec drush cr

# Cron issues
ddev exec drush cron
ddev exec drush watchdog:show --type=cron
```

### Testing Issues in DDEV
```bash
# PHPUnit configuration problems
# Ensure phpunit.xml.dist exists and is configured
cp web/core/phpunit.xml.dist phpunit.xml

# Database setup for testing
# Edit phpunit.xml for SIMPLETEST_DB and SIMPLETEST_BASE_URL
SIMPLETEST_DB=mysql://db:db@db/db_test
SIMPLETEST_BASE_URL=http://my-drupal-project.ddev.site

# Browser tests failing
# Install Selenium or ChromeDriver
# Ensure test environment variables are set
```

## Advanced Development Patterns

### Batch API for Long Operations
- **Purpose**: Process large datasets without PHP timeout issues
- **Use cases**: Data migration, bulk updates, file processing, API calls
- **Batch structure**: Create associative array with title, operations, and finished callback
- **Operations**: Array of callable methods and their arguments
- **Progress tracking**: Automatically shows progress bar to users
- **Error handling**: Implement proper exception handling in batch operations
- **User experience**: Provides real-time feedback during long operations
- **Memory management**: Processes data in chunks to prevent memory exhaustion

### Queue API for Background Processing
- **Purpose**: Process tasks in the background without blocking user interaction
- **Queue factory (preferred)**: Inject `queue` service via DI: `\Drupal\Core\Queue\QueueFactory`
- **Queue creation**: Use `$queue_factory->get('queue_name')` (inject service, avoid static `\Drupal::queue()`)
- **Item addition**: Use `createItem()` to add tasks to the queue
- **Processing**: Claim items with `claimItem()` and delete with `deleteItem()`
- **Cron integration**: Process queue items during cron runs for regular background tasks
- **Reliability**: Failed items can be released back to the queue
- **Worker plugins**: Create `QueueWorker` plugins using `#[QueueWorker]` attribute (Drupal 11) instead of `@QueueWorker` annotation
- **Logging**: Implement proper logging for queue processing monitoring
- **Performance**: Process multiple items per cron run for efficiency

### AJAX Forms
- **Trigger elements**: Add `#ajax` property to form elements (select, checkbox, button)
- **Callback method**: Reference callback method using `::methodName` syntax
- **Wrapper element**: Specify target element ID for AJAX response replacement
- **Response format**: Return form element or render array from callback
- **Event types**: Use 'change', 'click', 'blur' events as needed
- **Progress indicator**: Automatically shows loading indicator during AJAX requests
- **Error handling**: Implement try-catch blocks in AJAX callbacks
- **Form state**: Use `$form_state->getTriggeringElement()` to identify trigger
- **Multiple triggers**: Can have multiple AJAX elements in same form
- **Dynamic forms**: Update form options, show/hide fields based on user input

### Single Directory Components (SDC)
- **Purpose**: Self-contained, reusable UI components introduced as stable in Drupal 11
- **Location**: Place components in `modules/custom/my_module/components/` or `themes/custom/my_theme/components/`
- **Structure**: Each component lives in its own subdirectory containing a `.component.yml`, Twig template, and optional CSS/JS
- **Component definition** (`my-button/my-button.component.yml`):
  ```yaml
  $schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json
  name: My Button
  description: A reusable button component.
  props:
    type: object
    properties:
      label:
        type: string
        title: Button label
  ```
- **Usage in Twig**: `{{ include('my_module:my-button', { label: 'Click me' }) }}`
- **Asset attachment**: JS and CSS declared in the component YAML are auto-attached when the component renders
- **Best practice**: Prefer SDC over standalone Twig templates for UI patterns that recur across the site

### Recipes
- **Purpose**: Shareable, reusable bundles of modules, configuration, and content
- **Applying a recipe**: `ddev exec drush recipe web/recipes/my-recipe`
- **Recipe structure**: `recipe.yml` defines type, description, modules to install, config actions
- **Config actions**: Apply, create, or modify config during recipe application
- **Idempotency**: Recipes are designed to be safe to re-apply
- **Custom recipes**: Create at `web/recipes/my-recipe/recipe.yml`
- **Best practice**: Use recipes instead of install profiles for distributable configuration sets

### Starterkit Theme
- **Purpose**: Official Drupal 11 mechanism for scaffolding custom themes without post-install modification
- **Generate**: `ddev exec php core/scripts/drupal generate-theme my_theme`
- **Result**: A fully self-contained theme in `web/themes/custom/my_theme/`
- **Assets**: Includes base styles, libraries.yml, and a populated `my_theme.info.yml`
- **Best practice**: Always use Starterkit for new themes; do not subtheme Olivero or Claro directly

## Additional Resources

### DDEV Documentation
- **DDEV Official Docs**: https://ddev.readthedocs.io
- **DDEV Quick Start**: https://ddev.readthedocs.io/en/stable/users/quickstart/
- **DDEV Drupal Guide**: https://ddev.readthedocs.io/en/stable/users/topics/drupal/

### Drupal Documentation
- **Drupal API**: https://api.drupal.org
- **Developer Guide**: https://www.drupal.org/docs/develop
- **Coding Standards**: https://www.drupal.org/docs/develop/standards
- **Security Best Practices**: https://www.drupal.org/docs/develop/security
- **Drupal 11 Release Notes**: https://www.drupal.org/project/drupal/releases/11.0.0
- **Drupal 11 Change Records**: https://www.drupal.org/list-changes/drupal/published?to_branch=11.x
- **PHP Attributes for Plugins**: https://www.drupal.org/node/3395575
- **OOP Hooks (#[Hook])**: https://www.drupal.org/node/3489587
- **Single Directory Components**: https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components
- **Recipes**: https://www.drupal.org/docs/extending-drupal/drupal-recipes
