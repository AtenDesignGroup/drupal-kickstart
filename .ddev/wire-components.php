#!/usr/bin/env php
<?php
/**
 * Drupal Kickstart — component wiring tool.
 *
 * Converts ALL prototype SDC components into either:
 *   1. Drupal paragraph recipe scaffolds + Twig bridge templates (content
 *      components: accordion, alert, cta, pullquote, slideshow, spacer,
 *      tabs-content, teaser, video), or
 *   2. Themed Twig template overrides wiring Drupal core templates (block,
 *      navigation, menu) to their prototype SDC equivalents (back-to-top,
 *      breadcrumbs, menu, menu-tabs, page-title, pager, search-bar).
 *
 * Usage: ddev wire-components <component-name|all> [--theme-name=NAME]
 *
 * Examples:
 *   ddev wire-components all
 *   ddev wire-components accordion
 *   ddev wire-components page-title
 *   ddev wire-components back-to-top
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
$componentArg  = null;
$cliThemeName  = null;
$onlyTheme     = false;
$onlyParagraph = false;
foreach (array_slice($argv, 1) as $a) {
  if (str_starts_with($a, '--theme-name=')) {
    $cliThemeName = substr($a, 13);
  }
  elseif ($a === '--only-theme') {
    $onlyTheme = true;
  }
  elseif ($a === '--only-paragraphs') {
    $onlyParagraph = true;
  }
  elseif (!str_starts_with($a, '--')) {
    $componentArg = $a;
  }
}

if (!$componentArg) {
  echo RED . "Usage: ddev wire-components <component-name|all> [--theme-name=NAME] [--only-theme] [--only-paragraphs]\n" . RESET;
  echo "Examples:\n";
  echo "  ddev wire-components all                   # paragraphs + theme templates\n";
  echo "  ddev wire-components all --only-paragraphs # paragraph recipes + Twig bridges only\n";
  echo "  ddev wire-components all --only-theme      # theme-level templates only\n";
  echo "  ddev wire-components accordion             # single paragraph component\n";
  echo "  ddev wire-components page-title            # single theme-level template\n";
  echo "  ddev wire-components back-to-top           # inject into page.html.twig\n";
  exit(1);
}

// ─── Environment ─────────────────────────────────────────────────────────────
$root        = '/var/www/html';
$envFile     = "{$root}/.kickstart.env";
$envVars     = file_exists($envFile) ? (parse_ini_file($envFile) ?: []) : [];
$themeName   = $cliThemeName ?? $envVars['DK_THEME_NAME'] ?? 'dk_start_theme';
$compBaseDir       = "{$root}/web/themes/contrib/prototype/components/02-components";
$recipesDir        = "{$root}/recipes";
$templateDir       = "{$root}/web/themes/custom/{$themeName}/templates/paragraph";
$themeTemplateRoot = "{$root}/web/themes/custom/{$themeName}/templates";

// ─── Skip list ───────────────────────────────────────────────────────────────
// Skips components from paragraph recipe generation only.
// Components listed here that Drupal renders via core theme hooks (block,
// navigation, menu) are wired instead via $themeTemplateMap below.
// Purely atomic elements (button, icon, link) have no standalone Drupal
// template hook and are excluded from all wiring.
$skipList = [
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
];

// ─── Component-specific review notes ────────────────────────────────────────
// Extra REVIEW notices emitted after a component is scaffolded.
$componentReviews = [
  'alert' => [
    "The 'type' prop (alert severity level) is required by the component but was skipped as theme-only. Add a list (select) field or pass a fixed value from preprocess if editors must choose the alert level.",
    "The 'alerts' prop is an array of plain strings, not media entities. The scaffolded field_alerts entity_reference field should be replaced with a multi-value plain text or text_long field.",
  ],
];

// ─── Companion item components ───────────────────────────────────────────────
// Components that use {% block %} / embed patterns and require a parent
// paragraph + child item paragraph pair.
//
// 'parent_field'  — entity_reference_revisions field on the parent bundle
//                   pointing to the child bundle.
// 'item_bundle'   — child paragraph bundle machine name.
// 'item_label'    — human label for the child bundle.
// 'item_fields'   — list of {field, label, drupal_type} for the child. These
//                   map directly to existing shared storages (field_title,
//                   field_formatted_text) so no new storage is needed.
// 'embed_props'   — prop name → content variable expression used in the
//                   embed's `with` clause (passed as string, printed verbatim).
// 'embed_blocks'  — block name → content variable expression rendered inside
//                   the block body.
$companionItems = [
  'accordion' => [
    'parent_field' => 'field_accordion_items',
    'item_bundle'  => 'accordion_item',
    'item_label'   => 'Accordion Item',
    'item_fields'  => [
      ['field' => 'field_title',          'label' => 'Heading',  'drupal_type' => 'string'],
      ['field' => 'field_formatted_text', 'label' => 'Content',  'drupal_type' => 'text_long'],
    ],
    'embed_props'  => [
      'id'      => 'paragraph.id()',
      'heading' => "content.field_title|render|striptags|trim",
    ],
    'embed_blocks' => [
      'content' => 'content.field_formatted_text',
    ],
  ],
  'tabs-content' => [
    'parent_field'   => 'field_tab_items',
    'item_bundle'    => 'tabs_content_item',
    'item_label'     => 'Tabs Content Item',
    'item_fields'    => [
      ['field' => 'field_title',          'label' => 'Tab Title',  'drupal_type' => 'string'],
      ['field' => 'field_formatted_text', 'label' => 'Tab Content','drupal_type' => 'text_long'],
    ],
    // tabs-content uses include() with an items array prop — not embed.
    // The parent template builds the items array from child paragraph fields
    // and passes it directly. Set 'include_items_prop' to generate that logic.
    'include_items_prop' => [
      'component'    => 'tabs-content',
      'items_prop'   => 'items',
      'item_id'      => 'paragraph.id()',
      'item_title'   => "content.field_title|render|striptags|trim",
      'item_content' => "content.field_formatted_text|render",
    ],
  ],
];

// ─── Theme-level template map ────────────────────────────────────────────────
// Maps non-paragraph components to Drupal theme template files.
// These produce NO paragraph recipes — they wire Drupal's theme layer
// (block, navigation, menu) directly to prototype SDC components.
//
// strategies:
//   detect_existing  — file managed manually; report wiring state only.
//   review_existing  — file exists but needs manual intervention; emit REVIEW.
//   include_static   — generate with static props (no Drupal context needed).
//   include_rendered — generate with content-driven props (Drupal vars used).
//
// 'twig_dir'    — subdirectory under templates/
// 'twig_file'   — filename without .html.twig; use {theme} as placeholder.
// 'props'       — prop name → Twig expression (include_* strategies only).
// 'note'        — informational note printed for detect_existing.
// 'review_note' — reason text printed as REVIEW for review_existing/generated.
$themeTemplateMap = [

  // ── Already wired — detect and report ──────────────────────────────────────

  'alert' => [
    'strategy'  => 'detect_existing',
    'twig_dir'  => 'messages',
    'twig_file' => 'status-messages',
    'note'      => 'Wired to {theme}:alert in messages/status-messages.html.twig.',
  ],

  'breadcrumbs' => [
    'strategy'  => 'detect_existing',
    'twig_dir'  => 'navigation',
    'twig_file' => 'breadcrumb',
    'note'      => 'Wired to {theme}:breadcrumbs in navigation/breadcrumb.html.twig.',
  ],

  'menu-tabs' => [
    'strategy'  => 'detect_existing',
    'twig_dir'  => 'block',
    'twig_file' => 'block--local-tasks-block',
    'note'      => 'Wired to {theme}:menu-tabs in block/block--local-tasks-block.html.twig.',
  ],

  'pager' => [
    'strategy'  => 'detect_existing',
    'twig_dir'  => 'navigation',
    'twig_file' => 'pager',
    'note'      => 'Wired to {theme}:pager in navigation/pager.html.twig.',
  ],

  'search-bar' => [
    'strategy'  => 'detect_existing',
    'twig_dir'  => 'block',
    'twig_file' => 'block--{theme}-search',
    'note'      => 'Wired to {theme}:search-bar in block/block--{theme}-search.html.twig.',
  ],

  // ── Exists but needs developer review before auto-wiring ───────────────────

  'menu' => [
    'strategy'    => 'review_existing',
    'twig_dir'    => 'menu',
    'twig_file'   => 'menu',
    'review_note' => "menu/menu.html.twig uses a Drupal self-import macro — a valid fallback for all menus. "
      . "To wire all menus through the SDC instead, replace content with: "
      . "{{ include('{theme}:menu') }}  (the prototype:menu SDC manages its own recursion). "
      . "Verify it handles all menu depths and active trails before switching.",
  ],

  // ── Generate if missing ─────────────────────────────────────────────────────

  'back-to-top' => [
    'strategy'    => 'page_include',
    'twig_dir'    => 'page',
    'twig_file'   => 'page',
    'note'        => 'back-to-top has no Drupal block plugin. It is included directly in page.html.twig after the footer block.',
  ],

  'page-title' => [
    'strategy'  => 'include_rendered',
    'twig_dir'  => 'page',
    'twig_file' => 'page-title',
    'props'     => [
      'title'      => 'title',
      'attributes' => 'attributes',
    ],
  ],

];

// ─── Dispatch ────────────────────────────────────────────────────────────────
if ($componentArg === 'all') {
  if (!$onlyTheme) {
    $dirs  = glob("{$compBaseDir}/*", GLOB_ONLYDIR);
    $count = 0;
    foreach ($dirs as $dir) {
      processComponent(
        basename($dir),
        $compBaseDir,
        $recipesDir,
        $templateDir,
        $themeName,
        $skipList,
        $companionItems,
        $componentReviews
      );
      $count++;
    }
    hdr("Done — processed {$count} paragraph components.");
  }

  if (!$onlyParagraph) {
    hdr("Wiring theme-level templates...");
    foreach ($themeTemplateMap as $name => $config) {
      processThemeTemplate($name, $config, $themeTemplateRoot, $themeName);
    }
  }
}
else {
  if (isset($themeTemplateMap[$componentArg])) {
    processThemeTemplate(
      $componentArg,
      $themeTemplateMap[$componentArg],
      $themeTemplateRoot,
      $themeName
    );
  }
  else {
    processComponent(
      $componentArg,
      $compBaseDir,
      $recipesDir,
      $templateDir,
      $themeName,
      $skipList,
      $companionItems,
      $componentReviews
    );
  }
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
  array  $skipList,
  array  $companionItems,
  array  $componentReviews
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

  // ── Companion-item components (embed-based, 2-part paragraph) ───────────
  // These use {% block %} in their Twig and cannot be wired via include().
  // The parent paragraph is a plain wrapper; the child item does the embed.
  if (isset($companionItems[$name])) {
    $companion  = $companionItems[$name];
    $bundle      = str_replace('-', '_', $name);
    $recipeDir   = "{$recipesDir}/formula-{$name}";
    $recipeYml   = "{$recipeDir}/recipe.yml";
    $twigOut     = "{$templateDir}/paragraph--{$name}.html.twig";  // hyphens — Drupal template naming convention
    $itemSlugTwig = str_replace('_', '-', $companion['item_bundle']);
    $itemTwigOut = "{$templateDir}/paragraph--{$itemSlugTwig}.html.twig";

    $exists = file_exists($recipeYml) && file_exists($twigOut) && file_exists($itemTwigOut);
    if ($exists) {
      echo "    – {$name}: " . GREEN . "exists" . RESET . " (formula-{$name} + formula-{$companion['item_bundle']})\n";
      return;
    }

    hdr("Generating companion pair: {$name} → formula-{$name} + formula-{$companion['item_bundle']}");

    // Generate/update companion item recipe first.
    processCompanionItem($companion, $recipesDir, $templateDir, $themeName, $name);

    // Parent recipe — recipe.yml + field storage + field instance + displays.
    if (!file_exists($recipeYml)) {
      $cfgDir     = "{$recipeDir}/config";
      $itemSlug   = str_replace('_', '-', $companion['item_bundle']);
      $parentField = $companion['parent_field'];
      $itemBundle  = $companion['item_bundle'];
      $label       = ucwords(str_replace(['-', '_'], ' ', $name));
      mkdir($cfgDir, 0755, true);

      // recipe.yml.
      file_put_contents($recipeYml, <<<YML
      name: '🦄 🌈  Formula: {$label}'
      description: 'Provides a {$label} paragraph type (container + {$itemBundle} child) wired to the {$themeName} SDC {$name} component.'
      type: 'Paragraphs'

      recipes:
        - formula-paragraphs
        - formula-{$itemSlug}  # must be applied first to create the {$itemBundle} bundle

      config:
        strict: false
      YML . "\n");
      ok("formula-{$name}/recipe.yml");

      // field.storage (entity_reference_revisions).
      file_put_contents("{$cfgDir}/field.storage.paragraph.{$parentField}.yml", <<<YML
      langcode: en
      status: true
      dependencies:
        module:
          - entity_reference_revisions
          - paragraphs
      id: paragraph.{$parentField}
      field_name: {$parentField}
      entity_type: paragraph
      type: entity_reference_revisions
      settings:
        target_type: paragraph
      module: entity_reference_revisions
      locked: false
      cardinality: -1
      translatable: true
      indexes: {  }
      persist_with_no_fields: false
      custom_storage: false
      YML . "\n");
      ok("field.storage.paragraph.{$parentField}.yml");

      // field.field instance.
      $fieldLbl = ucwords(str_replace('_', ' ', $parentField));
      file_put_contents("{$cfgDir}/field.field.paragraph.{$bundle}.{$parentField}.yml", <<<YML
      langcode: en
      status: true
      dependencies:
        config:
          - field.storage.paragraph.{$parentField}
          - paragraphs.paragraphs_type.{$bundle}
          - paragraphs.paragraphs_type.{$itemBundle}
        module:
          - entity_reference_revisions
          - paragraphs
      id: paragraph.{$bundle}.{$parentField}
      field_name: {$parentField}
      entity_type: paragraph
      bundle: {$bundle}
      label: '{$fieldLbl}'
      description: ''
      required: false
      translatable: false
      default_value: {  }
      default_value_callback: ''
      settings:
        handler: 'default:paragraph'
        handler_settings:
          target_bundles:
            {$itemBundle}: {$itemBundle}
          target_bundles_drag_drop:
            {$itemBundle}:
              enabled: true
              weight: 0
          negate: 0
      field_type: entity_reference_revisions
      YML . "\n");
      ok("field.field.paragraph.{$bundle}.{$parentField}.yml");

      // paragraphs type.
      file_put_contents("{$cfgDir}/paragraphs.paragraphs_type.{$bundle}.yml", <<<YML
      langcode: en
      status: true
      dependencies: {  }
      id: {$bundle}
      label: '{$label}'
      icon_uuid: null
      icon_default: null
      description: ''
      behavior_plugins: {  }
      YML . "\n");
      ok("paragraphs.paragraphs_type.{$bundle}.yml");

      // Form display.
      $itemLabelHuman = ucwords(str_replace('_', ' ', $itemBundle));
      file_put_contents("{$cfgDir}/core.entity_form_display.paragraph.{$bundle}.default.yml", <<<YML
      langcode: en
      status: true
      dependencies:
        config:
          - field.field.paragraph.{$bundle}.{$parentField}
          - paragraphs.paragraphs_type.{$bundle}
        module:
          - entity_reference_revisions
          - paragraphs
      id: paragraph.{$bundle}.default
      targetEntityType: paragraph
      bundle: {$bundle}
      mode: default
      content:
        {$parentField}:
          type: paragraphs
          weight: 0
          region: content
          settings:
            title: '{$itemLabelHuman}'
            title_plural: '{$itemLabelHuman}s'
            edit_mode: open
            add_mode: dropdown
            form_display_mode: default
            default_paragraph_type: {$itemBundle}
          third_party_settings: {  }
      hidden:
        created: true
        status: true
      YML . "\n");
      ok("core.entity_form_display.paragraph.{$bundle}.default.yml");

      // View display.
      file_put_contents("{$cfgDir}/core.entity_view_display.paragraph.{$bundle}.default.yml", <<<YML
      langcode: en
      status: true
      dependencies:
        config:
          - field.field.paragraph.{$bundle}.{$parentField}
          - paragraphs.paragraphs_type.{$bundle}
        module:
          - entity_reference_revisions
          - paragraphs
      id: paragraph.{$bundle}.default
      targetEntityType: paragraph
      bundle: {$bundle}
      mode: default
      content:
        {$parentField}:
          type: entity_reference_revisions_entity_view
          label: hidden
          settings:
            view_mode: default
          third_party_settings: {  }
          weight: 0
          region: content
      hidden:
        search_api_excerpt: true
      YML . "\n");
      ok("core.entity_view_display.paragraph.{$bundle}.default.yml");
    }

    // Parent wrapper Twig — just renders the child paragraph reference field
    // (for embed-based components). For include_items_prop components,
    // processCompanionItem() already wrote the parent Twig.
    if (!file_exists($twigOut) && empty($companion['include_items_prop'])) {
      $parentField = $companion['parent_field'];
      file_put_contents($twigOut, "{{- content.{$parentField} -}}\n");
      ok("templates/paragraph/paragraph--{$bundle}.html.twig  (wrapper → renders item children)");
    }

    // Report component-level notes.
    foreach ($componentReviews[$name] ?? [] as $note) {
      rev($note);
    }
    return;
  }

  $bundle    = str_replace('-', '_', $name);
  $recipeDir = "{$recipesDir}/formula-{$name}";
  $recipeYml = "{$recipeDir}/recipe.yml";
  $twigOut   = "{$templateDir}/paragraph--{$name}.html.twig";  // hyphens — Drupal template naming convention

  $recipeExists = file_exists($recipeYml);

  // If both recipe and Twig template already exist, nothing left to do.
  if ($recipeExists && file_exists($twigOut)) {
    echo "    – {$name}: " . GREEN . "exists" . RESET . " (formula-{$name})\n";
    return;
  }

  if ($recipeExists) {
    hdr("Twig template missing for: {$name} — generating");
  }
  else {
    hdr("Generating: {$name} → formula-{$name}");
  }

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
    if (!empty($m['is_media']))                   { $needsMedia = true; }
    if (($m['drupal_type'] ?? '') === 'text_long') { $needsText  = true; }
    if (($m['drupal_type'] ?? '') === 'link')      { $needsLink  = true; }
    if (!empty($m['new_storage']))                { $newStorages[$pn] = $m; }
  }

  // Create directories.
  $cfgDir = "{$recipeDir}/config";
  if (!$recipeExists) {
    mkdir($cfgDir, 0755, true);
  }
  if (!is_dir($templateDir)) {
    mkdir($templateDir, 0755, true);
  }

  if (!$recipeExists) {
    // ── recipe.yml ────────────────────────────────────────────────────────────
    file_put_contents($recipeYml, buildRecipeYml($label, $name, $themeName, $needsMedia));
    ok("recipe.yml");

    // ── paragraphs type ───────────────────────────────────────────────────────
    file_put_contents(
      "{$cfgDir}/paragraphs.paragraphs_type.{$bundle}.yml",
      buildParagraphType($bundle, $label)
    );
    ok("paragraphs.paragraphs_type.{$bundle}.yml");

    // ── new field storages ────────────────────────────────────────────────────
    foreach ($newStorages as $pn => $m) {
      $fn = $m['field'];
      file_put_contents(
        "{$cfgDir}/field.storage.paragraph.{$fn}.yml",
        buildFieldStorage($fn, $m['drupal_type'] ?? 'entity_reference')
      );
      ok("field.storage.paragraph.{$fn}.yml  ← NEW STORAGE");
      rev("'{$fn}': verify cardinality and storage type match your use case");
    }

    // ── field instances ───────────────────────────────────────────────────────
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

    // ── form display ──────────────────────────────────────────────────────────
    file_put_contents(
      "{$cfgDir}/core.entity_form_display.paragraph.{$bundle}.default.yml",
      buildFormDisplay($bundle, $fieldMappings, $needsMedia, $needsLink, $needsText)
    );
    ok("core.entity_form_display.paragraph.{$bundle}.default.yml");

    // ── view display ──────────────────────────────────────────────────────────
    file_put_contents(
      "{$cfgDir}/core.entity_view_display.paragraph.{$bundle}.default.yml",
      buildViewDisplay($bundle, $fieldMappings, $needsMedia, $needsLink, $needsText, $newStorages)
    );
    ok("core.entity_view_display.paragraph.{$bundle}.default.yml");
  }

  // ── Twig bridge template ──────────────────────────────────────────────────
  if (file_exists($twigOut)) {
    warn("Twig template already exists — skipping: paragraph--{$bundle}.html.twig");
  }
  else {
    file_put_contents(
      $twigOut,
      buildTwigTemplate($bundle, $name, $themeName, $fieldMappings)
    );
    ok("templates/paragraph/paragraph--{$bundle}.html.twig");
  }

  // Report prop-level review items.
  foreach ($fieldMappings as $pn => $m) {
    if (!empty($m['review']) && is_string($m['review'])) {
      rev("{$pn}: {$m['review']}");
    }
    elseif (!empty($m['reason'])) {
      rev($m['reason']);
    }
  }

  // Report component-level review items.
  foreach ($componentReviews[$name] ?? [] as $note) {
    rev($note);
  }
}

// ─── Companion item scaffold ─────────────────────────────────────────────────
// Generates the child paragraph recipe + Twig embed template for components
// that use {% block %} and require a parent/child paragraph pair.
function processCompanionItem(
  array  $companion,
  string $recipesDir,
  string $templateDir,
  string $themeName,
  string $parentCompName
): void {
  $itemBundle  = $companion['item_bundle'];
  $itemLabel   = $companion['item_label'];
  $itemSlug    = str_replace('_', '-', $itemBundle);  // hyphens for recipe dir and Twig filename
  $recipeDir   = "{$recipesDir}/formula-{$itemSlug}";
  $recipeYml   = "{$recipeDir}/recipe.yml";
  $twigOut     = "{$templateDir}/paragraph--{$itemSlug}.html.twig";  // hyphens — Drupal template naming convention
  $cfgDir      = "{$recipeDir}/config";

  if (!file_exists($recipeYml)) {
    mkdir($cfgDir, 0755, true);

    // recipe.yml.
    $itemLabelClean = str_replace('_', ' ', $itemLabel);
    file_put_contents($recipeYml, <<<YML
    name: '🦄 🌈  Formula: {$itemLabelClean}'
    description: 'Child paragraph for the {$parentCompName} component. Rendered via embed of the {$themeName} SDC {$parentCompName} component.'
    type: 'Paragraphs'

    recipes:
      - formula-paragraphs

    config:
      strict: false
    YML . "\n");
    ok("formula-{$itemSlug}/recipe.yml");

    // paragraphs type.
    $bundleYml  = <<<YML
    langcode: en
    status: true
    dependencies: {  }
    id: {$itemBundle}
    label: '{$itemLabel}'
    icon_uuid: null
    icon_default: null
    description: ''
    behavior_plugins: {  }
    YML . "\n";
    file_put_contents("{$cfgDir}/paragraphs.paragraphs_type.{$itemBundle}.yml", $bundleYml);
    ok("paragraphs.paragraphs_type.{$itemBundle}.yml");

    // Field instances (shared storages — no new field.storage.* needed).
    $formContent  = [];
    $viewContent  = [];
    $formDeps   = [];
    $viewDeps   = [];
    $weight       = 0;
    foreach ($companion['item_fields'] as $f) {
      $fn    = $f['field'];
      $lbl   = $f['label'];
      $dtype = $f['drupal_type'];

      // Field instance.
      $instLines = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        "    - field.storage.paragraph.{$fn}",
        "    - paragraphs.paragraphs_type.{$itemBundle}",
      ];
      if ($dtype === 'text_long') {
        $instLines[] = '  module:';
        $instLines[] = '    - text';
      }
      $instLines = array_merge($instLines, [
        "id: paragraph.{$itemBundle}.{$fn}",
        "field_name: {$fn}",
        'entity_type: paragraph',
        "bundle: {$itemBundle}",
        "label: '{$lbl}'",
        "description: ''",
        'required: false',
        'translatable: false',
        'default_value: {  }',
        "default_value_callback: ''",
      ]);
      if ($dtype === 'string') {
        $instLines[] = 'settings: {  }';
        $instLines[] = 'field_type: string';
      }
      elseif ($dtype === 'text_long') {
        $instLines[] = 'settings:';
        $instLines[] = '  allowed_formats:';
        $instLines[] = '    - basic_html';
        $instLines[] = '    - full_html';
        $instLines[] = 'field_type: text_long';
      }
      file_put_contents(
        "{$cfgDir}/field.field.paragraph.{$itemBundle}.{$fn}.yml",
        implode("\n", $instLines) . "\n"
      );
      ok("field.field.paragraph.{$itemBundle}.{$fn}.yml");

      $formDeps[] = "    - field.field.paragraph.{$itemBundle}.{$fn}";
      $viewDeps[] = "    - field.field.paragraph.{$itemBundle}.{$fn}";

      // Form widget.
      $widget = ($dtype === 'text_long') ? 'text_textarea' : 'string_textfield';
      $wSettings = ($dtype === 'text_long') ? "      rows: 5\n      placeholder: ''" : "      size: 60\n      placeholder: ''";
      $formContent[] = "  {$fn}:\n    type: {$widget}\n    weight: {$weight}\n    region: content\n    settings:\n{$wSettings}\n    third_party_settings: {  }";

      // View formatter.
      $formatter = ($dtype === 'text_long') ? 'text_default' : 'string';
      $viewContent[] = "  {$fn}:\n    type: {$formatter}\n    label: hidden\n    settings: {  }\n    third_party_settings:\n      nomarkup:\n        enabled: true\n        separator: '|'\n        referenced_entity: ''\n    weight: {$weight}\n    region: content";

      $weight++;
    }

    // Form display.
    $formDepsStr = implode("\n", $formDeps);
    $formBodyStr = implode("\n", $formContent);
    $formModules = '';
    foreach ($companion['item_fields'] as $f) {
      if ($f['drupal_type'] === 'text_long') { $formModules = "  module:\n    - text"; break; }
    }
    file_put_contents("{$cfgDir}/core.entity_form_display.paragraph.{$itemBundle}.default.yml", <<<YML
    langcode: en
    status: true
    dependencies:
      config:
    {$formDepsStr}
        - paragraphs.paragraphs_type.{$itemBundle}
    {$formModules}
    id: paragraph.{$itemBundle}.default
    targetEntityType: paragraph
    bundle: {$itemBundle}
    mode: default
    content:
    {$formBodyStr}
    hidden:
      created: true
      status: true
    YML . "\n");
    ok("core.entity_form_display.paragraph.{$itemBundle}.default.yml");

    // View display.
    $viewDepsStr  = implode("\n", $viewDeps);
    $viewBodyStr  = implode("\n", $viewContent);
    file_put_contents("{$cfgDir}/core.entity_view_display.paragraph.{$itemBundle}.default.yml", <<<YML
    langcode: en
    status: true
    dependencies:
      config:
    {$viewDepsStr}
        - paragraphs.paragraphs_type.{$itemBundle}
      module:
        - nomarkup
    id: paragraph.{$itemBundle}.default
    targetEntityType: paragraph
    bundle: {$itemBundle}
    mode: default
    content:
    {$viewBodyStr}
    hidden:
      search_api_excerpt: true
    YML . "\n");
    ok("core.entity_view_display.paragraph.{$itemBundle}.default.yml");
  }

  // Twig embed OR include-with-items-array template for the item paragraph.
  if (!file_exists($twigOut)) {
    if (!is_dir($templateDir)) {
      mkdir($templateDir, 0755, true);
    }

    if (!empty($companion['include_items_prop'])) {
      // include()-based parent: build items array from child paragraph fields,
      // then include the SDC component with the items prop.
      $ip          = $companion['include_items_prop'];
      $compName    = $ip['component'];
      $itemsProp   = $ip['items_prop'];
      $parentField = $companion['parent_field'];
      $twigContent = <<<TWIG
      {%- set {$itemsProp} = [] -%}
      {%- for item in paragraph.{$parentField} -%}
        {%- set child = item.entity -%}
        {%- set {$itemsProp} = {$itemsProp}|merge([{
          id:      'tab-' ~ paragraph.id() ~ '-' ~ loop.index0,
          title:   child.field_title.value,
          content: child.field_formatted_text.processed,
        }]) -%}
      {%- endfor -%}

      {{- include('{$themeName}:{$compName}', {
        {$itemsProp}: {$itemsProp},
        'data-tabs-breakpoint': 768,
      }) -}}
      TWIG . "\n";
      // This template is the PARENT wrapper — write using hyphenated parent name.
      $parentTwigOut  = dirname($twigOut) . "/paragraph--{$parentCompName}.html.twig";
      file_put_contents($parentTwigOut, $twigContent);
      ok("templates/paragraph/paragraph--{$parentCompName}.html.twig  (include → {$themeName}:{$compName} items array)");
      // Item template for the child paragraph is a plain pass-through — the
      // parent builds the items array from the child's raw fields.
      file_put_contents($twigOut, "{# Item paragraph — rendered and consumed by paragraph--{$parentCompName}.html.twig. #}\n");
      ok("templates/paragraph/paragraph--{$itemSlug}.html.twig  (child pass-through)");
    }
    else {
      // embed-based item template.
      $embedProps = [];
      foreach ($companion['embed_props'] as $prop => $expr) {
        $embedProps[] = "  {$prop}: {$expr},";
      }
      $embedPropsStr = implode("\n", $embedProps);

      $embedBlocks = '';
      foreach ($companion['embed_blocks'] as $blockName => $contentExpr) {
        $embedBlocks .= "  {%- block {$blockName} -%}\n    {{- {$contentExpr} -}}\n  {%- endblock -%}\n";
      }

      file_put_contents($twigOut, <<<TWIG
      {%- embed '{$themeName}:{$parentCompName}' with {
      {$embedPropsStr}
      } only -%}
      {$embedBlocks}{%- endembed -%}
      TWIG . "\n");
      ok("templates/paragraph/paragraph--{$itemSlug}.html.twig  (embed → {$themeName}:{$parentCompName})");
    }
  }
}

// ─── Theme-level template wiring ─────────────────────────────────────────────
// Wires non-paragraph Drupal theme templates (block, navigation, menu) to
// their prototype SDC counterparts. Unlike processComponent(), this never
// creates paragraph recipes — it only manages theme template files.
function processThemeTemplate(
  string $name,
  array  $config,
  string $themeTemplateRoot,
  string $themeName
): void {
  $strategy         = $config['strategy'];
  // Block template file names follow Drupal's convention: ALL underscores
  // in theme hook suggestions are converted to hyphens. The {theme} placeholder
  // in twig_file is always expanded to the hyphenated form (dk-test-theme),
  // while the SDC namespace reference inside Twig files keeps underscores
  // (dk_test_theme:component-name).
  $themeNameHyphen  = str_replace('_', '-', $themeName);
  $twigFile         = str_replace('{theme}', $themeNameHyphen, $config['twig_file']);
  $twigPath         = "{$themeTemplateRoot}/{$config['twig_dir']}/{$twigFile}.html.twig";
  $relPath          = "{$config['twig_dir']}/{$twigFile}.html.twig";

  // Helper: check whether the file already wires this component.
  $isWired = static function (string $path, string $theme, string $comp): bool {
    return file_exists($path)
      && str_contains((string) file_get_contents($path), "{$theme}:{$comp}");
  };

  if ($strategy === 'detect_existing') {
    if (!file_exists($twigPath)) {
      warn("{$name}: {$relPath} not found — create manually.");
      return;
    }
    if ($isWired($twigPath, $themeName, $name)) {
      echo "    – {$name}: " . GREEN . "exists + wired" . RESET . " ({$relPath})\n";
    }
    else {
      rev("{$name}: {$relPath} exists but {$themeName}:{$name} wiring not detected — verify manually.");
    }
    return;
  }

  // page_include — back-to-top lives directly in page.html.twig, not a block
  // template. Requires both the component include AND an id="top" anchor at
  // the top of the layout container so the link target resolves correctly.
  if ($strategy === 'page_include') {
    if (!file_exists($twigPath)) {
      warn("{$name}: {$relPath} not found — cannot inject.");
      return;
    }
    $content    = (string) file_get_contents($twigPath);
    $hasInclude = str_contains($content, "{$themeName}:{$name}");
    $hasAnchor  = str_contains($content, 'id="top"');

    if ($hasInclude && $hasAnchor) {
      echo "    – {$name}: " . GREEN . "exists + wired" . RESET . " ({$relPath})\n";
      return;
    }
    if ($hasInclude && !$hasAnchor) {
      rev("{$name}: {$relPath} includes {$themeName}:{$name} but is missing the id=\"top\" anchor — add <div id=\"top\" tabindex=\"-1\"></div> as the first child of the layout container.");
      return;
    }

    // Neither present — inject both into page.html.twig.
    // 1. id="top" anchor as first child of the layout container div.
    $content = preg_replace(
      '/(<div\b[^>]*\blayout-container\b[^>]*>)/',
      "$1\n  <div id=\"top\" tabindex=\"-1\"></div>",
      $content,
      1
    );

    // 2. back-to-top include before the final closing </div> of the file.
    $include     = "\n  {{- include('{$themeName}:{$name}', {\n    text: 'Back to top'|t,\n  }, with_context=false) -}}\n";
    $lastDivPos  = strrpos($content, '</div>');
    if ($lastDivPos !== false) {
      $content = substr($content, 0, $lastDivPos) . $include . substr($content, $lastDivPos);
    }

    file_put_contents($twigPath, $content);
    ok("{$relPath}  (injected {$themeName}:{$name} include + id=\"top\" anchor)");
    return;
  }

  if ($strategy === 'review_existing') {
    if (!file_exists($twigPath)) {
      warn("{$name}: {$relPath} not found.");
      return;
    }
    if ($isWired($twigPath, $themeName, $name)) {
      echo "    – {$name}: " . GREEN . "exists + wired" . RESET . " ({$relPath})\n";
    }
    else {
      $note = str_replace(['{theme}', '{theme_hyphen}'], [$themeName, $themeNameHyphen], $config['review_note'] ?? "{$relPath} exists but NOT wired to {$themeName}:{$name}.");
      rev("{$name}: {$note}");
    }
    return;
  }

  // include_static, include_rendered — generate the template if missing.
  if (file_exists($twigPath)) {
    if ($isWired($twigPath, $themeName, $name)) {
      echo "    – {$name}: " . GREEN . "exists + wired" . RESET . " ({$relPath})\n";
    }
    else {
      warn("{$name}: {$relPath} exists but NOT wired to {$themeName}:{$name} — skipping to avoid overwrite.");
    }
    return;
  }

  $dir = dirname($twigPath);
  if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
  }

  file_put_contents($twigPath, buildThemeTwig($name, $strategy, $config, $themeName));
  ok("{$relPath}");

  if (!empty($config['review_note'])) {
    $resolvedNote = str_replace(['{theme}', '{theme_hyphen}'], [$themeName, $themeNameHyphen], $config['review_note']);
    rev("{$name}: {$resolvedNote}");
  }
}

// ─── Prop → field mapping ────────────────────────────────────────────────────
function mapPropToField(string $name, array $def): array {
  $type = $def['type'] ?? 'string';

  // Handle Drupal 11 null-safe type unions: ['string', 'null'] → extract first element.
  if (is_array($type)) {
    $type = reset($type);
  }

  // Skip theme-only / non-content props.
  static $skipProps = ['id', 'icon', 'options', 'attributes', 'class', 'classes'];
  if (in_array($name, $skipProps, true)) {
    return ['skip' => true];
  }

  // 'variant' and 'type' with an enum → list_string field (editorial choice).
  // Without an enum they are theme-only presentational strings — skip them.
  if (in_array($name, ['variant', 'type'], true)) {
    $enum = $def['enum'] ?? [];
    if (empty($enum)) {
      return ['skip' => true];
    }
    $fn = 'field_' . $name;
    $allowedValues = [];
    foreach ($enum as $v) {
      $allowedValues[] = "    - value: {$v}\n      label: " . ucfirst($v);
    }
    return [
      'skip'               => false,
      'field'              => $fn,
      'new_storage'        => true,
      'drupal_type'        => 'list_string',
      'plain'              => true,
      'nomarkup'           => false,
      'formatter'          => 'list_default',
      'formatter_settings' => [],
      'widget'             => 'options_select',
      'widget_settings'    => [],
      'module_deps'        => ['options'],
      'allowed_values'     => $allowedValues,
      'review'             => "list_string field with enum values — defaults to first value if empty.",
    ];
  }

  // Title / heading family → field_title (string).
  if ($type === 'string' && preg_match('/^(title|heading|credit|label|name|subtitle)$/', $name)) {
    return [
      'skip'               => false,
      'field'              => 'field_title',
      'new_storage'        => false,
      'drupal_type'        => 'string',
      'plain'              => true,
      'nomarkup'           => true,
      'formatter'          => 'string',
      'formatter_settings' => ['link_to_entity' => false],
      'widget'             => 'string_textfield',
      'widget_settings'    => ['size' => 60, 'placeholder' => ''],
      'module_deps'        => [],
    ];
  }

  // Caption → field_caption (text_long).
  if ($type === 'string' && $name === 'caption') {
    return [
      'skip'               => false,
      'field'              => 'field_caption',
      'new_storage'        => false,
      'drupal_type'        => 'text_long',
      'plain'              => false,
      'nomarkup'           => true,
      'formatter'          => 'text_default',
      'formatter_settings' => [],
      'widget'             => 'text_textarea',
      'widget_settings'    => ['rows' => 5, 'placeholder' => ''],
      'module_deps'        => ['text'],
    ];
  }

  // Formatted text family → field_formatted_text (text_long).
  if ($type === 'string' && preg_match('/^(text|body|content|description|summary|message)$/', $name)) {
    return [
      'skip'               => false,
      'field'              => 'field_formatted_text',
      'new_storage'        => false,
      'drupal_type'        => 'text_long',
      'plain'              => false,
      'nomarkup'           => true,
      'formatter'          => 'text_default',
      'formatter_settings' => [],
      'widget'             => 'text_textarea',
      'widget_settings'    => ['rows' => 5, 'placeholder' => ''],
      'module_deps'        => ['text'],
    ];
  }

  // Size/spacing strings → plain string field (CSS modifier value).
  if ($type === 'string' && preg_match('/(^|_)(size|spacing|height|width)$/', $name)) {
    $fn = 'field_' . $name;
    return [
      'skip'            => false,
      'field'           => $fn,
      'new_storage'     => true,
      'drupal_type'     => 'string',
      'plain'           => false,
      'raw_value'       => true,
      'nomarkup'        => false,
      'formatter'       => 'string',
      'widget'          => 'string_textfield',
      'widget_settings' => ['size' => 60, 'placeholder' => ''],
      'module_deps'     => [],
      'review'          => "Consider replacing {$fn} with a list_string field with predefined CSS modifier values (e.g. sm, md, lg, xl).",
    ];
  }

  // Prefix/suffix decorators → new string field storage.
  // Matches prop names ending in _prefix, _suffix, _unit, or _symbol.
  if ($type === 'string' && preg_match('/(^|_)(prefix|suffix|unit|symbol)$/', $name)) {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'               => false,
      'field'              => $fn,
      'new_storage'        => true,
      'drupal_type'        => 'string',
      'plain'              => true,
      'nomarkup'           => true,
      'formatter'          => 'string',
      'formatter_settings' => ['link_to_entity' => false],
      'widget'             => 'string_textfield',
      'widget_settings'    => ['size' => 60, 'placeholder' => ''],
      'module_deps'        => [],
    ];
  }

  // Integer / numeric value → new integer field storage.
  // Matches type 'integer' or 'number' (extracted from null-safe unions).
  if ($type === 'integer' || $type === 'number') {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'               => false,
      'field'              => $fn,
      'new_storage'        => true,
      'drupal_type'        => 'integer',
      'plain'              => false,
      'raw_value'          => true,
      'nomarkup'           => false,
      'formatter'          => 'number_integer',
      'formatter_settings' => [],
      'widget'             => 'number',
      'widget_settings'    => ['placeholder' => ''],
      'module_deps'        => [],
    ];
  }

  // Boolean → checkbox field.
  if ($type === 'boolean') {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'            => false,
      'field'           => $fn,
      'new_storage'     => true,
      'drupal_type'     => 'boolean',
      'plain'           => false,
      'raw_value'       => true,
      'nomarkup'        => false,
      'formatter'       => 'boolean',
      'widget'          => 'boolean_checkbox',
      'widget_settings' => ['display_label' => true],
      'module_deps'     => [],
    ];
  }

  // Link → field_link.
  if ($type === 'object' && preg_match('/^(link|cta)$/', $name)) {
    $subkeys = array_keys($def['properties'] ?? []);
    $textKey = in_array('title', $subkeys, true) ? 'title' : ($subkeys[0] ?? 'title');
    $urlKey  = 'url';
    return [
      'skip'               => false,
      'field'              => 'field_link',
      'new_storage'        => false,
      'drupal_type'        => 'link',
      'plain'              => false,
      'nomarkup'           => true,
      'formatter'          => 'link',
      'formatter_settings' => [
        'trim_length' => 80,
        'url_only'    => false,
        'url_plain'   => false,
        'rel'         => '0',
        'target'      => '0',
      ],
      'widget'             => 'link_default',
      'widget_settings'    => ['placeholder_url' => '', 'placeholder_title' => ''],
      'module_deps'        => ['link'],
      'link_text_key'      => $textKey,
      'link_url_key'       => $urlKey,
    ];
  }

  // Single media → field_media (entity_reference, cardinality 1).
  // Exception: if the prop description/title contains 'url' or 'embed', it is a
  // plain URL string (e.g. video embed src), not a Drupal media entity — map to
  // field_formatted_text so editors store a URL value.
  if ($type === 'string' && preg_match('/^(media|image|photo|picture|thumbnail)$/', $name)) {
    $descLower  = strtolower(($def['description'] ?? '') . ' ' . ($def['title'] ?? ''));
    $isEmbedUrl = (bool) preg_match('/\b(url|embed|src|youtube|vimeo)\b/', $descLower);
    if ($isEmbedUrl) {
      return [
        'skip'               => false,
        'field'              => 'field_formatted_text',
        'new_storage'        => false,
        'drupal_type'        => 'text_long',
        'plain'              => false,
        'raw_value'          => true,  // URL string — use paragraph.field.value not content.field
        'nomarkup'           => true,
        'formatter'          => 'text_default',
        'formatter_settings' => [],
        'widget'             => 'text_textarea',
        'widget_settings'    => ['rows' => 3, 'placeholder' => ''],
        'module_deps'        => ['text'],
        'review'             => "Mapped '{$name}' (embed URL string) to field_formatted_text. If you prefer a remote_video media entity, change to field_media with target_bundle remote_video.",
      ];
    }
    return [
      'skip'               => false,
      'field'              => 'field_media',
      'new_storage'        => false,
      'drupal_type'        => 'entity_reference',
      'plain'              => false,
      'nomarkup'           => false,
      'is_media'           => true,
      'formatter'          => 'media_thumbnail',
      'formatter_settings' => ['image_style' => 'full_size', 'image_link' => ''],
      'widget'             => 'media_library_widget',
      'widget_settings'    => ['media_types' => []],
      'module_deps'        => ['media', 'media_library'],
    ];
  }

  // Plain-string array props (e.g. alerts, messages) → text_long, cardinality -1.
  // These carry string content, not media entities.
  if (preg_match('/^(alerts|messages)$/', $name)) {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'               => false,
      'field'              => $fn,
      'new_storage'        => true,
      'drupal_type'        => 'text_long',
      'plain'              => false,
      'nomarkup'           => true,
      'cardinality'        => -1,
      'formatter'          => 'text_default',
      'formatter_settings' => [],
      'widget'             => 'text_textarea',
      'widget_settings'    => ['rows' => 3, 'placeholder' => ''],
      'module_deps'        => ['text'],
      'review'             => "Multi-value text_long field — one entry per message. Verify cardinality and allowed formats.",
    ];
  }

  // Multi-value media/visual arrays → new entity_reference storage (cardinality -1).
  if ($type === 'array' || preg_match('/^(slides|items|gallery|images|cards|entries)$/', $name)) {
    $fn = 'field_' . preg_replace('/[^a-z0-9_]/', '_', $name);
    return [
      'skip'               => false,
      'field'              => $fn,
      'new_storage'        => true,
      'drupal_type'        => 'entity_reference',
      'plain'              => false,
      'nomarkup'           => false,
      'is_media'           => true,
      'cardinality'        => -1,
      'formatter'          => 'media_thumbnail',
      'formatter_settings' => ['image_style' => 'full_size', 'image_link' => ''],
      'widget'             => 'media_library_widget',
      'widget_settings'    => ['media_types' => []],
      'module_deps'        => ['media'],
      'review'             => true,
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

function buildFieldStorage(string $fieldName, string $drupalType = 'entity_reference'): string {
  if ($drupalType === 'integer') {
    return <<<YML
langcode: en
status: true
dependencies:
  module:
    - paragraphs
id: paragraph.{$fieldName}
field_name: {$fieldName}
entity_type: paragraph
type: integer
settings:
  unsigned: false
  size: normal
module: core
locked: false
cardinality: 1
translatable: true
indexes: {  }
persist_with_no_fields: false
custom_storage: false
YML . "\n";
  }

  if ($drupalType === 'boolean') {
    return <<<YML
langcode: en
status: true
dependencies:
  module:
    - paragraphs
id: paragraph.{$fieldName}
field_name: {$fieldName}
entity_type: paragraph
type: boolean
settings:
  on_label: 'On'
  off_label: 'Off'
module: core
locked: false
cardinality: 1
translatable: true
indexes: {  }
persist_with_no_fields: false
custom_storage: false
YML . "\n";
  }

  if ($drupalType === 'string') {
    return <<<YML
langcode: en
status: true
dependencies:
  module:
    - paragraphs
id: paragraph.{$fieldName}
field_name: {$fieldName}
entity_type: paragraph
type: string
settings:
  max_length: 255
  case_sensitive: false
  is_ascii: false
module: core
locked: false
cardinality: 1
translatable: true
indexes: {  }
persist_with_no_fields: false
custom_storage: false
YML . "\n";
  }

  // Default: entity_reference (media).
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
  $lines[] = "    - field.storage.paragraph.{$fieldName}";
  if (!empty($m['is_media'])) {
    $lines[] = '    - media.type.image';
  }
  $lines[] = "    - paragraphs.paragraphs_type.{$bundle}";

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

  if ($drupalType === 'string') {
    $lines[] = 'settings: {  }';
    $lines[] = 'field_type: string';
  }
  elseif ($drupalType === 'integer') {
    $lines[] = 'settings: {  }';
    $lines[] = 'field_type: integer';
  }
  elseif ($drupalType === 'boolean') {
    $lines[] = 'settings: {  }';
    $lines[] = 'field_type: boolean';
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
  $lines   = [];
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
  $lines       = [];
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
  $preamble          = [];
  $includeProps      = [];
  $conditionalMerges = [];

  foreach ($fieldMappings as $propName => $m) {
    if (empty($m['field'])) { continue; }
    $fn         = $m['field'];
    $isPlain    = !empty($m['plain']);
    $drupalType = $m['drupal_type'] ?? 'string';
    $isMulti    = !empty($m['new_storage']) && !empty($m['is_media']);
    $isSingle   = empty($m['new_storage']) && !empty($m['is_media']);
    $isRawValue = !empty($m['raw_value']);

    if ($drupalType === 'boolean') {
      $includeProps[] = "  {$propName}: paragraph.{$fn}.value == 1";
    }
    elseif ($drupalType === 'link') {
      $textKey = $m['link_text_key'] ?? 'title';
      $preamble[] = "{# Link: read directly from render array. #}";
      $preamble[] = "{%- set _{$propName} = content.{$fn}[0] is defined ? content.{$fn}[0] : null -%}";
      $conditionalMerges[] = "{%- if _{$propName} -%}\n  {%- set _props = _props|merge({{$propName}: {{$textKey}: _{$propName}['#title'], url: _{$propName}['#url'].toString()}}) -%}\n{%- endif -%}";
    }
    elseif ($isMulti) {
      $preamble[] = "{# Build {$propName} array — iterate numeric deltas of multi-value media field. #}";
      $preamble[] = "{%- set {$propName}_items = [] -%}";
      $preamble[] = "{%- for delta, item in content.{$fn} -%}";
      $preamble[] = "  {%- if delta|slice(0, 1) != '#' -%}";
      $preamble[] = "    {%- set {$propName}_items = {$propName}_items|merge([{attributes: {}, content: item|render}]) -%}";
      $preamble[] = "  {%- endif -%}";
      $preamble[] = "{%- endfor -%}";
      $includeProps[] = "  {$propName}: {$propName}_items";
    }
    elseif ($isSingle) {
      $includeProps[] = "  {$propName}: content.{$fn}";
    }
    elseif ($isRawValue) {
      $includeProps[] = "  {$propName}: paragraph.{$fn}.value";
    }
    elseif ($isPlain) {
      $includeProps[] = "  {$propName}: content.{$fn}|render|striptags|trim";
    }
    else {
      $includeProps[] = "  {$propName}: content.{$fn}";
    }
  }

  $out = '';
  if (!empty($preamble)) {
    $out .= implode("\n", $preamble) . "\n\n";
  }

  $propsStr = implode(",\n", $includeProps);

  if (!empty($conditionalMerges)) {
    $out .= "{%- set _props = {\n{$propsStr}\n} -%}\n";
    $out .= implode("\n", $conditionalMerges) . "\n\n";
    $out .= "{{- include('{$themeName}:{$compName}', _props) -}}\n";
  }
  else {
    $componentDefaults = [
      'slideshow' => "  options: {\n    type: 'slide',\n    perPage: 1,\n    pagination: true,\n    autoplay: false,\n  }",
    ];
    if (isset($componentDefaults[$compName])) {
      $propsStr .= ",\n" . $componentDefaults[$compName];
    }
    $out .= "{{- include('{$themeName}:{$compName}', {\n{$propsStr}\n}) -}}\n";
  }

  return $out;
}

// ─── Theme-level Twig template builder ───────────────────────────────────────
// Generates content for theme template files created by processThemeTemplate().
function buildThemeTwig(
  string $name,
  string $strategy,
  array  $config,
  string $themeName
): string {
  $props = $config['props'] ?? [];

  if (in_array($strategy, ['include_static', 'include_rendered'], true)) {
    $propLines = [];
    foreach ($props as $propName => $propExpr) {
      $propLines[] = "  {$propName}: {$propExpr}";
    }
    $propsStr    = !empty($propLines) ? "\n" . implode(",\n", $propLines) . ",\n" : '';
    $withContext = ($strategy === 'include_static') ? ', with_context=false' : '';
    return "{{- include('{$themeName}:{$name}', {{$propsStr}}{$withContext}) -}}\n";
  }

  if ($strategy === 'include_passthrough') {
    return "{{- include('{$themeName}:{$name}') -}}\n";
  }

  return "{# TODO: wire to {$themeName}:{$name} #}\n";
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
