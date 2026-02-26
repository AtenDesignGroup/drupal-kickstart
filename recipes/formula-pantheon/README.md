# formula-pantheon

Recipe for Pantheon platform integration and optimization.

## Modules Included

This recipe installs and configures modules optimized for the Pantheon hosting platform:

- **Pantheon Advanced Page Cache** - Advanced caching integration with Pantheon's Global CDN
- **Redis** - Object cache backend using Redis on Pantheon
- **Pantheon Search API** - Integration with Pantheon's native Solr search service
- **Pantheon Secrets** - Secure management of secrets via Pantheon's Secrets API

## Requirements

- Composer packages:
  - `drupal/pantheon_advanced_page_cache:^2.3`
  - `drupal/redis:^1.11`
  - `pantheon-systems/drupal-integrations:^11`
  - `drupal/search_api_pantheon:^8.4`
  - `drupal/pantheon_secrets:^1.0`

## Usage

This recipe is designed to be used on sites hosted on the Pantheon platform to enable optimal performance and integration with Pantheon services.
