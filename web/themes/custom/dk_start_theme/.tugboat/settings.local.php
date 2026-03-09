<?php

/**
 * @file
 * Tugboat local settings.
 */

$databases['default']['default'] = [
  'database' => 'tugboat',
  'username' => 'tugboat',
  'password' => 'tugboat',
  'prefix' => '',
  'host' => 'mysql',
  'port' => '3306',
  'namespace' => 'Drupal\\Core\\Database\\Driver\\mysql',
  'driver' => 'mysql',
];
// Use the TUGBOAT_REPO_ID to generate a hash salt for Tugboat sites.
$settings['hash_salt'] = hash('sha256', getenv('TUGBOAT_REPO_ID'));
$settings['extension_discovery_scan_tests'] = TRUE;
