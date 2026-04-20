#!/usr/bin/env php
<?php
/**
 * Drupal Kickstart — paragraph recipe generator.
 *
 * Converts prototype SDC components into Drupal paragraph recipe scaffolds,
 * including Drupal config YAML files and Twig bridge templates.
 *
 * Usage: ddev generate-recipe <component-name|all> [--theme-name=NAME]
 */

declare(strict_types=1);

$autoload = '/var/www/html/vendor/autoload.php';
if (!file_exists($autoload)) {
  fwrite(STDERR, "Error: vendor/autoload.php not found. Run: ddev composer install\n");
  exit(1);
}
require $autoload;

use Symfony\Component\Yaml\Yaml;

// ─── Terminal styling ────────────────────────────────────────────────────────
define('BOLD',   "\033[1m");
define('GREEN',  "\033[0;32m");
define('YELLOW', "\033[0;33m");
define('CYAN',   "\033[0;36m");
define('RED',    "\033[0;31m");
define('RESET',  "\033[0m");

function hdr(string $msg): void  { echo "\n" . BOLD . CYAN . "==> {$msg}" . RESET . "\n"; }
function ok(string $msg): void   { echo "    " . GREEN . "✔" . RESET . " {$msg}\n"; }
function warn(string $msg): void { echo "    " . YELLOW . "⚠" . RESET . "  {$msg}\n"; }
function rev(string $msg): void  { echo "    " . YELLOW . BOLD . "REVIEW" . RESET . "  {$msg}\n"; }

// ─── Parse arguments ─────────────────────────────────────────────────────────
$componentArg = null;
$cliThemeName = null;
foreach (array_slice($argv, 1) as $a) {
  if (str_starts_with($a, '--theme-name=')) {
    $cliThemeName = substr($a, 13);
  }
  elseif (!str_starts_with($a, '--')) {
    $componentArg = $a;
  }
}

if (!$componentArg) {
  echo RED . "Usage: ddev generate-recipe <component-name|all> [--theme-name=NAME]\n" . RESET;
  echo "Examples:\n  ddev generate-recipe cta\n  ddev generate-recipe all\n";
  exit(1);
}

// ─── Environment ─────────────────────────────────────────────────────────────
$root        = '/var/www/html';
$envFile     = "{$root}/.kickstart.env";
$envVars     = file_exists($envFile) ? (parse_ini_file($envFile) ?: []) : [];
$themeName   = $cliThemeName ?? $envVars['DK_THEME_NAME'] ?? 'dk_start_theme';
$compBaseDir = "{$root}/web/themes/contrib/prototype/components/02-components";
$recipesDir  = "{$root}/recipes";
$templateDir = "{$root}/web/themes/custom/{$themeName}/templates/paragraph";

// ─── Skip list ───────────────────────────────────────────────────────────────
// Components that are structural/Drupal-generated/slot-only with no content to manage.
$skipList = [
  'accordion'    => 'Slot-only interactive widget — scaffold manually',
  'alert'        => 'System alerts (complex array prop, no paragraph mapping)',
  'back-to-top'  => 'Theme-only utility, no content props',
  'breadcrumbs'  => 'Drupal-generated block — no recipe needed',
  'button'       => 'Atomic UI element',
  'icon'         => 'Atomic UI element',
  'icon-label'   => 'Atomic UI element',
  'icons'        => 'Icon library — no content',
  'link'         => 'Atomic UI element',
  'menu'         => 'Drupal-generated menu block',
  'menu-tabs'    => 'Drupal-generated menu tabs',
  'page-title'   => 'Drupal-generated page title block',
  'pager'        => 'Drupal-generated pager',
  'search-bar'   => 'Functional search form',
  'spacer'       => 'Layout utility, no content props',
  'tabs-content' => 'Complex nested items array — scaffold manually',
];

// ─── Dispatch ────────────────────────────────────────────────────────────────
if ($componentArg === 'all') {
  $dirs  = glob("{$compBaseDir}/*", GLOB_ONLYDIR);
  $count = 0;
  foreach ($dirs as $dir) {
    processComponent(basename($dir), $compBaseDir, $recipesDir, $templateDir, $themeName, $skipList);
    $count++;
  }
  hdr("Done — processed {$count} components.");
}
else {
  processComponent($componentArg, $compBaseDir, $recipesDir, $templateDir, $themeName, $skipList);
}

// =============================================================================
// FUNCTIONS
// =============================================================================

function processComponent(
  string $name,
  string $compBaseDir,
  string $recipesDir,
  string $templateDir,
  string $themeName,
  array  $skipList
): void {
  // Skip list check.
  if (isset($skipList[$name])) {
    echo "    – {$name}: " . YELLOW . "skip" . RESET . " ({$skipList[$name]})\n";
    return;
  }

  $ymlFile = "{$compBaseDir}/{$name}/{$name}.component.yml";
  if (!file_exists($ymlFile)) {
    warn("No component YAML at {$ymlFile} — skipping '{$name}'");
    return;
  }

  $bundle    = str_replace('-', '_', $name);
  $recipeDir = "{$recipesDir}/formula-{$name}";
  $recipeYml = "{$recipeDir}/recipe.yml";

  if (file_exists($recipeYml)) {
    echo "    – {$name}: " . GREEN . "exists" . RESET . " (formula-{$name})\n";
    return;
  }

  hdr("Generating: {$name} → formula-{$name}");

  // Parse component YAML.
  $component = Yaml::parseFile($ymlFile);
  $props     = $component['props']['properties'] ?? [];
  $label     = $component['name'] ?? ucwords(str_replace(['-', '_'], ' ', $name));

  // Map props → fields (deduplicate shared storages).
  $fieldMappings = [];
  $seenFields    = [];
  foreach ($props as $propName => $propDef) {
    $m = mapPropToField($propName, (array) ($propDef ?? []));
    if (!empty($m['skip']) || empty($m['field'])) {
      continue;
    }
    // First prop wins when two props map to the same shared field.
    if (!empty($seenFields[$m['field']]) && empty($m['new_storage'])) {
      warn("'{$propName}' and '{$seenFields[$m['field']]}' both map to '{$m['field']}' — keeping first");
      continue;
    }
    $fieldMappings[$propName] = $m;
    $seenFields[$m['field']]  = $propName;
  }

  if (empty($fieldMappings)) {
    warn("No mappable props for '{$name}' — all props are theme-only; skipping");
    return;
  }

  // Feature flags.
  $needsMedia  = false;
  $needsText   = false;
  $needsLink   = false;
  $newStorages = [];
  foreach ($fieldMappings as $pn => $m) {
    if (!empty($m['is_media']))                 { $needsMedia = true; }
    if (($m['drupal_type'] ?? '') === 'text_long') { $needsText  = true; }
    if (($m['drupal_type'] ?? '') === 'link')   { $needsLink  = true; }
    if (!empty($m['new_storage']))              { $newStorages[$pn] = $m; }
  }

  // Create directories.
  $cfgDir = "{$recipeDir}/config";
  mkdir($cfgDir, 0755, true);
  if (!is_dir($templateDir)) {
    mkdir($templateDir, 0755, true);
  }

  // ── recipe.yml ──────────────────────────────────────────────────────────────
  file_put_contents($recipeYml, buildRecipeYml($label, $name, $themeName, $needsMedia));
  ok("recipe.yml");

  // ── paragraphs type ─────────────────────────────────────────────────────────
  file_put_contents(
    "{$cfgDir}/paragraphs.paragraphs_type.{$bundle}.yml",
    buildParagraphType($bundle, $label)
  );
  ok("paragraphs.paragraphs_type.{$bundle}.yml");

  // ── new field storages ───────────────────────────────────────────────────────
  foreach ($newStorages as $pn => $m) {
    $fn = $m['field'];
    file_put_contents(
      "{$cfgDir}/field.storage.paragraph.{$fn}.yml",
      buildFieldStorage($fn)
    );
    ok("field.storage.paragraph.{$fn}.yml  ← NEW STORAGE");
    rev("'{$fn}': verify cardinality (-1) and target_type (media) match your use case");
  }

  // ── field instances ──────────────────────────────────────────────────────────
  foreach ($fieldMappings as $pn => $m) {
    if (empty($m['field'])) {
      continue;
    }
    $fn  = $m['field'];
    $lbl = ucwords(str_replace('_', ' ', $pn));
    file_put_contents(
      "{$cfgDir}/field.field.paragraph.{$bundle}.{$fn}.yml",
      buildFieldInstance($bundle, $fn, $lbl, $m)
    );
    ok("field.field.paragraph.{$bundle}.{$fn}.yml");
  }

  // ── form display ─────────────────────────────────────────────────────────────
  file_put_contents(
    "{$cfgDir}/core.entity_form_display.paragraph.{$bundle}.default.yml",
    buildFormDisplay($bundle, $fieldMappings, $needsMedia, $needsLink, $needsText)
  );
  ok("core.entity_form_display.paragraph.{$bundle}.default.yml");

  // ── view display ─────────────────────────────────────────────────────────────
  file_put_contents(
    "{$cfgDir}/core.entity_view_display.paragraph.{$bundle}.default.yml",
    buildViewDisplay($bundle, $fieldMappings, $needsMedia, $needsLink, $needsText, $newStorages)
  );
  ok("core.entity_view_display.paragraph.{$bundle}.default.yml");

  // ── Twig bridge template ─────────────────────────────────────────────────────
  $twigOut = "{$templateDir}/paragraph--{$bundle}.html.twig";
  if (file_exists($twigOut)) {
    warn("Twig template already exists — skipping: paragraph--{$bundle}.html.twig");
  }
  else {
    file_put_contents($twigOut, buildTwigTemplate($bundle, $name, $themeName, $fieldMappings));
    ok("templates/paragraph/paragraph--{$bundle}.html.twig");
  }

  // Report review items.
  foreach ($fieldMappings as $pn => $m) {
    if (!empty($m['review']) && is_string($m['review'])) {
      rev("{$pn}: {$m['review']}");
    }
    elseif (!empty($m['reason'])) {
      rev($m['reason']);
    }
  }
}

// ─── Prop → field mapping ────────────────────────────────────────────────────
function mapPropToField(string $name, array $def): array {
  $type = $def['type'] ?? 'string';

  // Skip theme-only / non-content props.
  static $skipProps = ['variant', 'id', 'icon', 'options', 'attributes', 'class', 'classes', 'type'];
  if (in_array($name, $skipProps, true)) {
    return ['skip' => true];
  }

  // Title / heading family → field_title (string).
  if ($type === 'string' && preg_match('/^(title|heading|credit|label|name|subtitle)$/', $name)) {
    return [
      'skip'             => false,
      'field'            => 'field_title',
      'new_storage'      => false,
      'drupal_type'      => 'string',
      'plain'            => true,
      'nomarkup'         => true,
      'formatter'        => 'string',
      'formatter_settings' => ['link_to_entity' => false],
      'widget'           => 'string_textfield',
      'widget_settings'  => ['size' => 60, 'placeholder' => ''],
      'module_deps'      => [],
    ];
  }

  // Caption → field_caption (text_long).
  if ($type === 'string' && $name === 'caption') {
    return [
      'skip'             => false,
      'field'            => 'field_caption',
      'new_storage'      => false,
      'drupal_type'      => 'text_long',
      'plain'            => false,
      'nomarkup'         => true,
      'formatter'        => 'text_default',
      'formatter_settings' => [],
      'widget'           => 'text_textarea',
      'widget_settings'  => ['rows' => 5, 'placeholder' => ''],
      'module_deps'      => ['text'],
    ];
  }

  // Formatted text family → field_formatted_text (text_long).
  if ($type === 'string' && preg_match('/^(text|body|content|description|summary|message)$/', $name)) {
    return [
      'skip'             => false,
      'field'            => 'field_formatted_text',
      'new_storage'      => false,
      'drupal_type'      => 'text_long',
      'plain'            => false,
      'nomarkup'         => true,
      'formatter'        => 'text_default',
      'formatter_settings' => [],
      'widget'           => 'text_textarea',
      'widget_settings'  => ['rows' => 5, 'placeholder' => ''],
      'module_deps'      => ['text'],
    ];
  }

  // Link → field_link.
  if ($type === 'object' && preg_match('/^(link|cta)$/', $name)) {
    $subkeys = array_keys($def['properties'] ?? []);
    $textKey = in_array('title', $subkeys, true) ? 'title' : ($subkeys[0] ?? 'title');
    $urlKey  = 'url';
    return [
      'skip'             => false,
      'field'            => 'field_link',
      'new_storage'      => false,
      'drupal_type'      => 'link',
      'plain'            => false,
      'nomarkup'         => true,
      'formatter'        => 'link',
      'formatter_settings' => [
        'trim_length' => 80,
        'url_only'    => false,
        'url_plain'   => false,
        'rel'         => '0',
        'target'      => '0',
      ],
      'widget'           => 'link_default',
      'widget_settings'  => ['placeholder_url' => '', 'placeholder_title' => ''],
      'module_deps'      => ['link'],
      'link_text_key'    => $textKey,
      'link_url_key'     => $urlKey,
      // No REVIEW emitted here: the Twig builder already remaps non-standard
      // keys (e.g. 'text' → _link.title) in the generated bridge template.
    ];
  }

  // Single media → field_media (entity_reference, cardinality 1).
  // Exception: if the prop description/title contains 'url' or 'embed', it is a
  // plain URL string (e.g. video embed src), not a Drupal media entity — map it
  // to field_formatted_text instead so editors store a URL value.
  if ($type === 'string' && preg_match('/^(media|image|photo|picture|thumbnail)$/', $name)) {
    $descLower = strtolower(($def['description'] ?? '') . ' ' . ($def['title'] ?? ''));
    $isEmbedUrl = (bool) preg_match('/\b(url|embed|src|youtube|vimeo)\b/', $descLower);
    if ($isEmbedUrl) {
      // Treat as a plain formatted-text field so editors can paste a URL.
      return [
        'skip'             => false,
        'field'            => 'field_formatted_text',
        'new_storage'      => false,
        'drupal_type'      => 'text_long',
        'plain'            => false,
        'nomarkup'         => true,
        'formatter'        => 'text_default',
        'formatter_settings' => [],
        'widget'           => 'text_textarea',
        'widget_settings'  => ['rows' => 3, 'placeholder' => ''],
        'module_deps'      => ['text'],
        'review'           => "Mapped '{$name}' (embed URL string) to field_formatted_text. If you prefer a remote_video media entity, change to field_media with target_bundle remote_video.",
      ];
    }
    return [
      'skip'             => false,
      'field'            => 'field_media',
      'new_storage'      => false,
      'drupal_type'      => 'entity_reference',
      'plain'            => false,
      'nomarkup'         => false,
      'is_media'         => true,
      'formatter'        => 'media_thumbnail',
      'formatter_settings' => ['image_style' => 'full_size', 'image_link' => ''],
      'widget'           => 'media_library_widget',
      'widget_settings'  => ['media_types' => []],
      'module_deps'      => ['media', 'media_library'],
    ];
  }

  // Multi-value / slides → new entity_reference storage (cardinality -1).
  if ($type === 'array' || preg_match('/^(slides|items|gallery|images|cards|entries)$/', $name)) {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'             => false,
      'field'            => $fn,
      'new_storage'      => true,
      'drupal_type'      => 'entity_reference',
      'plain'            => false,
      'nomarkup'         => false,
      'is_media'         => true,
      'cardinality'      => -1,
      'formatter'        => 'media_thumbnail',
      'formatter_settings' => ['image_style' => 'full_size', 'image_link' => ''],
      'widget'           => 'media_library_widget',
      'widget_settings'  => ['media_types' => []],
      'module_deps'      => ['media'],
      'review'           => true,
    ];
  }

  // Unknown type — flag for complete manual review.
  return [
    'skip'        => false,
    'field'       => 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name),
    'new_storage' => true,
    'review'      => true,
    'reason'      => "Unknown type '{$type}' for prop '{$name}' — select field type manually",
  ];
}

// =============================================================================
// YAML BUILDERS
// These match the exact formatting of the existing recipe config files.
// =============================================================================

function buildRecipeYml(string $label, string $compName, string $themeName, bool $needsMedia): string {
  $mediaLine = $needsMedia ? "\n  - formula-media        # provides image media type" : '';
  return <<<YML
  name: '🦄 🌈  Formula: {$label}'
  description: 'Provides a {$label} paragraph type wired to the {$themeName} SDC {$compName} component.'
  type: 'Paragraphs'

  recipes:
    - formula-paragraphs{$mediaLine}

  config:
    strict: false
  YML . "\n";
}

function buildParagraphType(string $bundle, string $label): string {
  return <<<YML
  langcode: en
  status: true
  dependencies: {  }
  id: {$bundle}
  label: '{$label}'
  icon_uuid: null
  icon_default: null
  description: ''
  behavior_plugins: {  }
  YML . "\n";
}

function buildFieldStorage(string $fieldName): string {
  return <<<YML
  langcode: en
  status: true
  dependencies:
    module:
      - media
      - paragraphs
  id: paragraph.{$fieldName}
  field_name: {$fieldName}
  entity_type: paragraph
  type: entity_reference
  settings:
    target_type: media
  module: core
  locked: false
  cardinality: -1
  translatable: true
  indexes: {  }
  persist_with_no_fields: false
  custom_storage: false
  YML . "\n";
}

function buildFieldInstance(string $bundle, string $fieldName, string $label, array $m): string {
  $drupalType = $m['drupal_type'] ?? 'string';
  $lines      = [];

  $lines[] = 'langcode: en';
  $lines[] = 'status: true';
  $lines[] = 'dependencies:';
  $lines[] = '  config:';
  if (!empty($m['new_storage'])) {
    $lines[] = "    - field.storage.paragraph.{$fieldName}";
  }
  else {
    $lines[] = "    - field.storage.paragraph.{$fieldName}";
  }
  // Media fields need a reference to the media type.
  if (!empty($m['is_media'])) {
    $lines[] = '    - media.type.image';
  }
  $lines[] = "    - paragraphs.paragraphs_type.{$bundle}";

  // Module deps.
  $moduleDeps = $m['module_deps'] ?? [];
  if (!empty($m['is_media'])) {
    $moduleDeps = array_unique(array_merge($moduleDeps, ['media']));
  }
  if (!empty($moduleDeps)) {
    $lines[] = '  module:';
    foreach ($moduleDeps as $mod) {
      $lines[] = "    - {$mod}";
    }
  }

  $lines[] = "id: paragraph.{$bundle}.{$fieldName}";
  $lines[] = "field_name: {$fieldName}";
  $lines[] = 'entity_type: paragraph';
  $lines[] = "bundle: {$bundle}";
  $lines[] = "label: '{$label}'";
  $lines[] = "description: ''";
  $lines[] = 'required: false';
  $lines[] = 'translatable: false';
  $lines[] = 'default_value: {  }';
  $lines[] = "default_value_callback: ''";

  // Field-type-specific settings.
  if ($drupalType === 'string') {
    $lines[] = 'settings: {  }';
    $lines[] = 'field_type: string';
  }
  elseif ($drupalType === 'text_long') {
    $lines[] = 'settings:';
    $lines[] = '  allowed_formats:';
    $lines[] = '    - basic_html';
    $lines[] = '    - full_html';
    $lines[] = 'field_type: text_long';
  }
  elseif ($drupalType === 'link') {
    $lines[] = 'settings:';
    $lines[] = '  title: 2';
    $lines[] = '  link_type: 17';
    $lines[] = 'field_type: link';
  }
  elseif ($drupalType === 'entity_reference') {
    $lines[] = 'settings:';
    $lines[] = "  handler: 'default:media'";
    $lines[] = '  handler_settings:';
    $lines[] = '    target_bundles:';
    $lines[] = '      image: image';
    $lines[] = '    sort:';
    $lines[] = '      field: _none';
    $lines[] = '      direction: ASC';
    $lines[] = '    auto_create: false';
    $lines[] = '    auto_create_bundle: image';
    $lines[] = 'field_type: entity_reference';
  }
  else {
    $lines[] = 'settings: {  }';
    $lines[] = "field_type: {$drupalType}";
  }

  return implode("\n", $lines) . "\n";
}

function buildFormDisplay(
  string $bundle,
  array  $fieldMappings,
  bool   $needsMedia,
  bool   $needsLink,
  bool   $needsText
): string {
  $lines = [];
  $lines[] = 'langcode: en';
  $lines[] = 'status: true';
  $lines[] = 'dependencies:';
  $lines[] = '  config:';
  foreach ($fieldMappings as $pn => $m) {
    if (empty($m['field'])) { continue; }
    $lines[] = "    - field.field.paragraph.{$bundle}.{$m['field']}";
  }
  $lines[] = "    - paragraphs.paragraphs_type.{$bundle}";

  $modDeps = [];
  if ($needsText)  { $modDeps[] = 'text'; }
  if ($needsLink)  { $modDeps[] = 'link'; }
  if ($needsMedia) { $modDeps[] = 'media'; }
  if (!empty($modDeps)) {
    $lines[] = '  module:';
    foreach ($modDeps as $mod) { $lines[] = "    - {$mod}"; }
  }

  $lines[] = "id: paragraph.{$bundle}.default";
  $lines[] = 'targetEntityType: paragraph';
  $lines[] = "bundle: {$bundle}";
  $lines[] = 'mode: default';
  $lines[] = 'content:';

  $weight = 0;
  foreach ($fieldMappings as $pn => $m) {
    if (empty($m['field'])) { continue; }
    $fn = $m['field'];
    $wt = $m['widget'] ?? 'string_textfield';
    $ws = $m['widget_settings'] ?? [];
    $lines[] = "  {$fn}:";
    $lines[] = "    type: {$wt}";
    $lines[] = "    weight: {$weight}";
    $lines[] = '    region: content';
    if (empty($ws)) {
      $lines[] = '    settings: {  }';
    }
    else {
      $lines[] = '    settings:';
      foreach ($ws as $k => $v) {
        $vStr = settingValue($v);
        $lines[] = "      {$k}: {$vStr}";
      }
    }
    $lines[] = '    third_party_settings: {  }';
    $weight++;
  }

  $lines[] = 'hidden:';
  $lines[] = '  created: true';
  $lines[] = '  status: true';

  return implode("\n", $lines) . "\n";
}

function buildViewDisplay(
  string $bundle,
  array  $fieldMappings,
  bool   $needsMedia,
  bool   $needsLink,
  bool   $needsText,
  array  $newStorages
): string {
  $lines   = [];
  $hasNomarkup = false;
  foreach ($fieldMappings as $m) {
    if (!empty($m['nomarkup'])) { $hasNomarkup = true; break; }
  }

  $lines[] = 'langcode: en';
  $lines[] = 'status: true';
  $lines[] = 'dependencies:';
  $lines[] = '  config:';
  foreach ($fieldMappings as $pn => $m) {
    if (empty($m['field'])) { continue; }
    $lines[] = "    - field.field.paragraph.{$bundle}.{$m['field']}";
  }
  // image.style.full_size needed when using media_thumbnail formatter.
  if ($needsMedia) {
    $lines[] = '    - image.style.full_size';
  }
  $lines[] = "    - paragraphs.paragraphs_type.{$bundle}";

  $modDeps = [];
  if ($hasNomarkup) { $modDeps[] = 'nomarkup'; }
  if ($needsText)   { $modDeps[] = 'text'; }
  if ($needsLink)   { $modDeps[] = 'link'; }
  if ($needsMedia)  { $modDeps[] = 'media'; }
  if (!empty($modDeps)) {
    $lines[] = '  module:';
    foreach ($modDeps as $mod) { $lines[] = "    - {$mod}"; }
  }

  $lines[] = "id: paragraph.{$bundle}.default";
  $lines[] = 'targetEntityType: paragraph';
  $lines[] = "bundle: {$bundle}";
  $lines[] = 'mode: default';
  $lines[] = 'content:';

  $weight = 0;
  foreach ($fieldMappings as $pn => $m) {
    if (empty($m['field'])) { continue; }
    $fn       = $m['field'];
    $fmtr     = $m['formatter'] ?? 'string';
    $fmtrSet  = $m['formatter_settings'] ?? [];
    $nomarkup = !empty($m['nomarkup']);

    $lines[] = "  {$fn}:";
    $lines[] = "    type: {$fmtr}";
    $lines[] = '    label: hidden';
    if (empty($fmtrSet)) {
      $lines[] = '    settings: {  }';
    }
    else {
      $lines[] = '    settings:';
      foreach ($fmtrSet as $k => $v) {
        $vStr = settingValue($v);
        $lines[] = "      {$k}: {$vStr}";
      }
    }
    if ($nomarkup) {
      $lines[] = '    third_party_settings:';
      $lines[] = '      nomarkup:';
      $lines[] = '        enabled: true';
      $lines[] = "        separator: '|'";
      $lines[] = "        referenced_entity: ''";
    }
    else {
      $lines[] = '    third_party_settings: {  }';
    }
    $lines[] = "    weight: {$weight}";
    $lines[] = '    region: content';
    $weight++;
  }

  $lines[] = 'hidden:';
  $lines[] = '  search_api_excerpt: true';

  return implode("\n", $lines) . "\n";
}

// ─── Twig bridge template ────────────────────────────────────────────────────
function buildTwigTemplate(
  string $bundle,
  string $compName,
  string $themeName,
  array  $fieldMappings
): string {
  $preamble     = [];
  $includeProps = [];

  foreach ($fieldMappings as $propName => $m) {
    if (empty($m['field'])) { continue; }
    $fn        = $m['field'];
    $isPlain   = !empty($m['plain']);
    $drupalType = $m['drupal_type'] ?? 'string';
    $isMulti   = !empty($m['new_storage']) && !empty($m['is_media']);
    $isSingle  = empty($m['new_storage']) && !empty($m['is_media']);

    if ($drupalType === 'link') {
      // Extract raw link values via twig_field_value.
      $textKey  = $m['link_text_key'] ?? 'title';
      $urlKey   = $m['link_url_key']  ?? 'url';
      $preamble[] = "{# Link: extract raw values (requires twig_field_value module). #}";
      $preamble[] = "{%- set _{$propName}_items = content.{$fn}|field_value -%}";
      $preamble[] = "{%- set _{$propName} = _{$propName}_items is not empty ? _{$propName}_items|first : null -%}";
      if ($textKey !== 'title') {
        // Component uses non-standard key (e.g. 'text' instead of 'title').
        $preamble[] = "{#  ⚠ REVIEW: component uses '{$textKey}' for link text; field_link stores 'title'. #}";
        $includeProps[] = "  {$propName}: _{$propName} ? {{$textKey}: _{$propName}.title, {$urlKey}: _{$propName}.url.toString} : {}";
      }
      else {
        $includeProps[] = "  {$propName}: _{$propName} ? {title: _{$propName}.title, {$urlKey}: _{$propName}.url.toString} : {}";
      }
    }
    elseif ($isMulti) {
      // Multi-value media: iterate numeric delta keys.
      $preamble[] = "{# Build {$propName} array — iterate numeric deltas of multi-value media field. #}";
      $preamble[] = "{%- set {$propName}_items = [] -%}";
      $preamble[] = "{%- for delta, item in content.{$fn} if delta matches '/^\\\\d+$/' -%}";
      $preamble[] = "  {%- set {$propName}_items = {$propName}_items|merge([{attributes: create_attribute(), content: item}]) -%}";
      $preamble[] = "{%- endfor -%}";
      $includeProps[] = "  {$propName}: {$propName}_items";
    }
    elseif ($isSingle) {
      // Single media: pass as render array.
      $includeProps[] = "  {$propName}: content.{$fn}";
    }
    elseif ($isPlain) {
      // Plain string: strip nomarkup debug markup.
      $includeProps[] = "  {$propName}: content.{$fn}|render|striptags|trim";
    }
    else {
      // Formatted HTML: pass render array directly.
      $includeProps[] = "  {$propName}: content.{$fn}";
    }
  }

  $out = '';
  if (!empty($preamble)) {
    $out .= implode("\n", $preamble) . "\n\n";
  }
  $propsStr = implode(",\n", $includeProps);
  $out .= "{{- include('{$themeName}:{$compName}', {\n{$propsStr}\n}) -}}\n";

  return $out;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Serialize a scalar for inline YAML output. */
function settingValue(mixed $v): string {
  if (is_bool($v))   { return $v ? 'true' : 'false'; }
  if ($v === '')     { return "''"; }
  if (is_int($v) || is_float($v)) { return (string) $v; }
  if (is_array($v) && empty($v)) { return '{  }'; }
  return (string) $v;
}