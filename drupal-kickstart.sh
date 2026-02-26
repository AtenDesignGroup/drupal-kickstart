#!/usr/bin/env bash
# =============================================================================
# Drupal DDEV Kickstart
# Run this script from inside an empty new project directory.
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# Colors / styling
# -----------------------------------------------------------------------------
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
RESET="\033[0m"

# -----------------------------------------------------------------------------
# Error trap
# -----------------------------------------------------------------------------
trap 'echo -e "\n${RED}${BOLD}Build failed.${RESET} Your settings were saved to ${BOLD}.kickstart.env${RESET} — fix the issue and re-run the script to resume." >&2' ERR

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
header() {
  echo -e "\n${BOLD}${CYAN}==> $1${RESET}"
}

info() {
  echo -e "    ${GREEN}✔${RESET} $1"
}

warn() {
  echo -e "    ${YELLOW}⚠${RESET}  $1"
}

prompt() {
  # prompt <var_name> <question> <default>
  local var_name="$1"
  local question="$2"
  local default="$3"
  local input

  if [[ -n "$default" ]]; then
    read -r -p "$(echo -e "  ${BOLD}${question}${RESET} [${CYAN}${default}${RESET}]: ")" input
  else
    read -r -p "$(echo -e "  ${BOLD}${question}${RESET}: ")" input
  fi

  printf -v "$var_name" '%s' "${input:-$default}"
}

prompt_yn() {
  # prompt_yn <var_name> <question> <default: yes|no>
  local var_name="$1"
  local question="$2"
  local default="$3"
  local hint
  if [[ "$default" == "yes" ]]; then hint="Y/n"; else hint="y/N"; fi
  local input

  read -r -p "$(echo -e "  ${BOLD}${question}${RESET} [${CYAN}${hint}${RESET}]: ")" input
  input="${input:-$default}"

  if [[ "$input" =~ ^[Yy] ]]; then
    printf -v "$var_name" '%s' "yes"
  else
    printf -v "$var_name" '%s' "no"
  fi
}

add_to_gitignore() {
  local entry="$1"
  local file=".gitignore"
  if [[ ! -f "$file" ]]; then
    echo "$entry" > "$file"
  elif ! grep -qxF "$entry" "$file"; then
    echo "$entry" >> "$file"
  fi
}

# Compare two semver strings: returns 0 if $1 >= $2
version_gte() {
  # Strip leading 'v'
  local a="${1#v}" b="${2#v}"
  printf '%s\n%s\n' "$b" "$a" | sort -V -C
}

# =============================================================================
# 0. PREFLIGHT CHECKS
# =============================================================================
header "Preflight Checks"

if ! command -v ddev &>/dev/null; then
  echo -e "  ${RED}${BOLD}Error:${RESET} ddev is not installed or not on PATH."
  echo -e "  Install it with: ${BOLD}brew install ddev${RESET}"
  exit 1
fi

DDEV_VERSION=$(ddev version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
DDEV_MIN="v1.24.10"

if ! version_gte "${DDEV_VERSION}" "${DDEV_MIN}"; then
  echo -e "  ${RED}${BOLD}Error:${RESET} Your DDEV version ${BOLD}${DDEV_VERSION}${RESET} does not meet the minimum required ${BOLD}${DDEV_MIN}${RESET}."
  echo -e "  ddev/ddev-redis v2.x requires DDEV >= ${DDEV_MIN}."
  echo -e "  Upgrade with: ${BOLD}brew upgrade ddev${RESET}  (or your package manager of choice)"
  exit 1
fi

info "DDEV ${DDEV_VERSION} detected (meets >= ${DDEV_MIN})"

# =============================================================================
# 1. RESUME CHECK — load .kickstart.env if it exists
# =============================================================================
ENV_FILE=".kickstart.env"
RESUME="no"

if [[ -f "$ENV_FILE" ]]; then
  echo -e "\n${YELLOW}${BOLD}Found saved values from a previous run (${ENV_FILE}).${RESET}"
  read -r -p "$(echo -e "  ${BOLD}Resume from those values?${RESET} [${CYAN}Y/n${RESET}]: ")" _resume_input
  _resume_input="${_resume_input:-Y}"
  if [[ "$_resume_input" =~ ^[Yy] ]]; then
    # shellcheck source=.kickstart.env
    source "$ENV_FILE"
    RESUME="yes"
    info "Loaded saved values — skipping prompts."
  else
    info "Starting fresh — saved values will be overwritten after prompts."
  fi
fi

# =============================================================================
# 2. PROMPT COLLECTION (skipped when resuming)
# =============================================================================
if [[ "$RESUME" == "yes" ]]; then
  # Derive theme path from loaded values — no prompts needed
  DK_THEME_PATH="web/themes/custom/${DK_THEME_NAME}"
  # Provide default for DK_THEME_DESC if missing from an older .kickstart.env
  DK_THEME_DESC="${DK_THEME_DESC:-${DK_DDEV_NAME} Theme}"
  header "Resuming with saved configuration"
else
  header "Project Configuration"

  # Project name — default to current directory basename
  DEFAULT_NAME="${DK_DDEV_NAME:-$(basename "$PWD")}"
  prompt DK_DDEV_NAME "Project name" "$DEFAULT_NAME"

  # Theme name
  DEFAULT_THEME="${DK_THEME_NAME:-${DK_DDEV_NAME}_theme}"
  prompt DK_THEME_NAME "Theme name" "$DEFAULT_THEME"

  # Theme description (used by the prototype theme generator)
  DEFAULT_THEME_DESC="${DK_THEME_DESC:-${DK_DDEV_NAME} Theme}"
  prompt DK_THEME_DESC "Theme description" "$DEFAULT_THEME_DESC"

  # Derived theme path (not prompted)
  DK_THEME_PATH="web/themes/custom/${DK_THEME_NAME}"

  # Pantheon
  DEFAULT_PANTHEON="${DK_USES_PANTHEON:-no}"
  prompt_yn DK_USES_PANTHEON "Install Pantheon modules?" "$DEFAULT_PANTHEON"

  # SOLR
  DEFAULT_SOLR="${DK_USES_SOLR:-no}"
  prompt_yn DK_USES_SOLR "Enable SOLR?" "$DEFAULT_SOLR"

  # Commit prefix
  DEFAULT_COMMIT="${DK_COMMIT_PREFIX:-}"
  prompt DK_COMMIT_PREFIX "Commit prefix (e.g. GRE for GRE-123:)" "$DEFAULT_COMMIT"

  # PHP version
  DEFAULT_PHP="${DK_PHP_VERSION:-8.3}"
  prompt DK_PHP_VERSION "PHP version" "$DEFAULT_PHP"

  # Node version
  DEFAULT_NODE="${DK_NODE_VERSION:-22}"
  prompt DK_NODE_VERSION "Node version" "$DEFAULT_NODE"
fi

# =============================================================================
# 3. PERSIST VALUES TO .kickstart.env (skipped on resume — file already exists)
# =============================================================================
if [[ "$RESUME" != "yes" ]]; then
  cat > "$ENV_FILE" <<EOF
# Drupal Kickstart — saved configuration
# Generated: $(date)
DK_DDEV_NAME="${DK_DDEV_NAME}"
DK_THEME_NAME="${DK_THEME_NAME}"
DK_THEME_DESC="${DK_THEME_DESC}"
DK_USES_PANTHEON="${DK_USES_PANTHEON}"
DK_USES_SOLR="${DK_USES_SOLR}"
DK_COMMIT_PREFIX="${DK_COMMIT_PREFIX}"
DK_PHP_VERSION="${DK_PHP_VERSION}"
DK_NODE_VERSION="${DK_NODE_VERSION}"
EOF

  add_to_gitignore ".kickstart.env"
  info "Values saved to ${ENV_FILE} (added to .gitignore)"

  # Generate secure secrets and write to .env
  DK_DRUPAL_HASH_SALT=$(openssl rand -base64 48 | tr -d '=+/' | head -c 64)
  DK_DRUPAL_ADMIN_USERNAME="administrator"
  DK_DRUPAL_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')

  cat > ".env" <<EOF
# Drupal Kickstart — secrets
# Generated: $(date)
# ⚠ Do NOT commit this file.
DK_DRUPAL_HASH_SALT="${DK_DRUPAL_HASH_SALT}"
DK_DRUPAL_ADMIN_USERNAME="${DK_DRUPAL_ADMIN_USERNAME}"
DK_DRUPAL_ADMIN_PASSWORD="${DK_DRUPAL_ADMIN_PASSWORD}"
EOF

  add_to_gitignore ".env"
  info "Secrets written to .env (added to .gitignore)"
fi

# =============================================================================
# 4. REVIEW + CONFIRM
# =============================================================================
header "Review — Please Confirm Your Settings"
echo
echo -e "    ${BOLD}Project name    :${RESET} ${DK_DDEV_NAME}"
echo -e "    ${BOLD}Theme name      :${RESET} ${DK_THEME_NAME}"
echo -e "    ${BOLD}Theme desc      :${RESET} ${DK_THEME_DESC}"
echo -e "    ${BOLD}Theme path      :${RESET} ${DK_THEME_PATH}"
echo -e "    ${BOLD}PHP version     :${RESET} ${DK_PHP_VERSION}"
echo -e "    ${BOLD}Node version    :${RESET} ${DK_NODE_VERSION}"
echo -e "    ${BOLD}Pantheon        :${RESET} ${DK_USES_PANTHEON}"
echo -e "    ${BOLD}SOLR            :${RESET} ${DK_USES_SOLR}"
if [[ -n "$DK_COMMIT_PREFIX" ]]; then
  echo -e "    ${BOLD}Commit prefix   :${RESET} ${DK_COMMIT_PREFIX}-123: (example)"
else
  echo -e "    ${BOLD}Commit prefix   :${RESET} ${YELLOW}(none entered — grumphp.yml will not be updated)${RESET}"
fi
echo -e "    ${BOLD}Site URL        :${RESET} https://${DK_DDEV_NAME}.ddev.site"
echo

read -r -p "$(echo -e "  ${BOLD}Proceed?${RESET} [${CYAN}Y/n${RESET}]: ")" _proceed
_proceed="${_proceed:-Y}"
if [[ ! "$_proceed" =~ ^[Yy] ]]; then
  echo -e "\n${YELLOW}Cancelled.${RESET} Your settings are preserved in ${ENV_FILE}."
  exit 0
fi

# =============================================================================
# 5. DDEV INIT
# =============================================================================
header "Initializing DDEV"
ddev config \
  --project-name="${DK_DDEV_NAME}" \
  --project-type=drupal11 \
  --docroot=web \
  --php-version="${DK_PHP_VERSION}" \
  --create-docroot

info "DDEV configured (docroot: web, PHP: ${DK_PHP_VERSION})"

# =============================================================================
# 6. PATCH .ddev/config.yml
# =============================================================================
header "Patching .ddev/config.yml"

DDEV_CONFIG=".ddev/config.yml"

# Append nodejs_version if not already present
if ! grep -q "^nodejs_version:" "$DDEV_CONFIG"; then
  echo "nodejs_version: \"${DK_NODE_VERSION}\"" >> "$DDEV_CONFIG"
  info "Added nodejs_version: ${DK_NODE_VERSION}"
fi

# Append web_environment block if not already present
if ! grep -q "^web_environment:" "$DDEV_CONFIG"; then
  cat >> "$DDEV_CONFIG" <<EOF

web_environment:
  - APP_ENVIRONMENT=local
  - DRUSH_OPTIONS_URI=https://${DK_DDEV_NAME}.ddev.site
  - THEME_PATH=${DK_THEME_PATH}
EOF
  info "Added web_environment block"
fi

# =============================================================================
# 7. REDIS DDEV ADDON
# =============================================================================
header "Installing Redis DDEV Addon"
if version_gte "${DDEV_VERSION}" "${DDEV_MIN}"; then
  ddev add-on get ddev/ddev-redis
  info "Redis DDEV addon installed"
else
  warn "Skipping Redis addon — DDEV ${DDEV_VERSION} < ${DDEV_MIN}. Upgrade DDEV and run 'ddev add-on get ddev/ddev-redis' manually."
fi

# =============================================================================
# 8. SOLR (optional)
# =============================================================================
if [[ "$DK_USES_SOLR" == "yes" ]]; then
  header "Installing SOLR DDEV Addon"
  ddev add-on get ddev/ddev-solr
  info "SOLR DDEV addon installed"
  warn "TODO: Place your SOLR core config in .ddev/solr/ — see https://github.com/ddev/ddev-solr"
fi

# =============================================================================
# 9. TOKEN SUBSTITUTION
# Replace DK_* placeholders in grumphp.yml and all recipe/asset YAML files.
# Uses | as sed delimiter to safely handle DK_THEME_PATH containing slashes.
# =============================================================================
header "Applying token substitution"

# Build the list of YAML files to process (recipes/, assets/, grumphp.yml)
TOKEN_FILES=()
while IFS= read -r f; do
  TOKEN_FILES+=("$f")
done < <(find recipes assets grumphp.yml -type f -name "*.yml" 2>/dev/null)

for f in "${TOKEN_FILES[@]}"; do
  sed -i.bak \
    -e "s|DK_DDEV_NAME|${DK_DDEV_NAME}|g" \
    -e "s|DK_THEME_NAME|${DK_THEME_NAME}|g" \
    -e "s|DK_THEME_DESC|${DK_THEME_DESC}|g" \
    -e "s|DK_THEME_PATH|${DK_THEME_PATH}|g" \
    -e "s|DK_PHP_VERSION|${DK_PHP_VERSION}|g" \
    -e "s|DK_COMMIT_PREFIX|${DK_COMMIT_PREFIX:-PROJ}|g" \
    "$f" && rm -f "${f}.bak"
done

info "Tokens replaced in ${#TOKEN_FILES[@]} files"

# =============================================================================
# 10. DDEV START
# =============================================================================
header "Starting DDEV"
ddev start
info "DDEV started — ${DK_DDEV_NAME}.ddev.site"

# =============================================================================
# 11. SCAFFOLD DRUPAL PROJECT
# =============================================================================
header "Scaffolding Drupal 11 Project"

if [[ ! -f "web/index.php" ]]; then
  info "Running composer create-project in container..."
  ddev exec bash -c "rm -rf /tmp/dp && composer create-project 'drupal/recommended-project:^11' /tmp/dp --no-interaction"
  ddev exec bash -c "rsync -a /tmp/dp/ /var/www/html/"
  info "Drupal scaffold created"
else
  info "Drupal scaffold already present — skipping create-project"
fi

# =============================================================================
# 12. COMPOSER DEPENDENCIES
# =============================================================================
header "Installing Composer Dependencies"

# Apply project composer standards (platform, plugins, scaffold, patches, scripts)
ddev setup-composer

# Set minimum-stability to dev so the local path repo (drupal-base) is resolvable.
# prefer-stable ensures all other packages still resolve to stable releases.
ddev composer config minimum-stability dev
ddev composer config prefer-stable true
info "Composer stability configured (dev + prefer-stable)"

# Register the local drupal-base recipe as a path repository so Composer can
# resolve its composer.json dependencies (gin, metatag, redis, pathauto, etc.)
ddev composer config repositories.drupal-base \
  '{"type":"path","url":"recipes/drupal-base","options":{"symlink":false}}'

# Requiring the recipe pulls in all packages declared in recipes/drupal-base/composer.json
ddev composer require \
  "atendesigngroup/drupal-base:@dev" \
  --no-interaction
info "Drupal Base recipe packages installed"

# Drush — a tooling dep, not part of the recipe
ddev composer require \
  "drush/drush:^13" \
  --no-interaction
info "drush/drush installed"

# Dev dependencies — -W allows transitive upgrades (phpunit needs newer sebastian/diff)
ddev composer require --dev \
  "drupal/core-dev:^11" \
  --with-all-dependencies \
  --no-interaction
info "Dev dependencies installed"

# =============================================================================
# 13. REDIS SETTINGS
# =============================================================================
header "Configuring Redis Cache Settings"

SITES_DEFAULT="web/sites/default"
mkdir -p "$SITES_DEFAULT"

SETTINGS_LOCAL="${SITES_DEFAULT}/settings.local.php"

if [[ ! -f "$SETTINGS_LOCAL" ]]; then
  cat > "$SETTINGS_LOCAL" <<'SETTINGS_HEADER'
<?php

/**
 * @file
 * Local development settings.
 */

SETTINGS_HEADER
  info "Created ${SETTINGS_LOCAL}"
fi

if ! grep -q "redis.connection" "$SETTINGS_LOCAL"; then
  cat >> "$SETTINGS_LOCAL" <<REDIS_BLOCK

// Redis caching — provided by ddev/ddev-redis addon.
// Run \`ddev drush en redis -y && ddev drush cr\` after Drupal install to activate.
if (!defined('MAINTENANCE_MODE')) {
  \$settings['redis.connection']['interface'] = 'PhpRedis';
  \$settings['redis.connection']['host'] = 'redis';
  \$settings['cache']['default'] = 'cache.backend.redis';
  \$settings['container_yamls'][] = DRUPAL_ROOT . '/modules/contrib/redis/example.services.yml';
}
REDIS_BLOCK
  info "Redis config written to ${SETTINGS_LOCAL}"
else
  warn "Redis config already present in ${SETTINGS_LOCAL} — skipped"
fi

# Hash salt — injected directly since settings.local.php is gitignored
if ! grep -q "hash_salt" "$SETTINGS_LOCAL"; then
  [[ -f ".env" ]] && source ".env"
  cat >> "$SETTINGS_LOCAL" <<SALT_BLOCK

// Hash salt — generated by Drupal Kickstart.
\$settings['hash_salt'] = '${DK_DRUPAL_HASH_SALT}';
SALT_BLOCK
  info "Hash salt written to ${SETTINGS_LOCAL}"
fi

# =============================================================================
# 14. SITE INSTALL
# =============================================================================
header "Installing Drupal"

# Source .env to get admin credentials
[[ -f ".env" ]] && source ".env"
ADMIN_USER="${DK_DRUPAL_ADMIN_USERNAME:-administrator}"
ADMIN_PASS="${DK_DRUPAL_ADMIN_PASSWORD:-admin}"

STARTERKIT_CMD=".ddev/commands/web/aten-starterkit"
SITE_INSTALL_CMD=".ddev/commands/web/site-install"
if [[ -f "$STARTERKIT_CMD" ]]; then
  ddev aten-starterkit
  info "aten-starterkit complete"
elif [[ -f "$SITE_INSTALL_CMD" ]]; then
  SITE_NAME="${DK_DDEV_NAME}" ACCOUNT_NAME="${ADMIN_USER}" ACCOUNT_PASS="${ADMIN_PASS}" ddev site-install
  info "Drupal installed via ddev site-install"
else
  ddev drush site:install --yes \
    --site-name="${DK_DDEV_NAME}" \
    --account-name="${ADMIN_USER}" \
    --account-pass="${ADMIN_PASS}"
  info "Drupal installed"
fi

# =============================================================================
# 15. PROTOTYPE THEME
# =============================================================================
header "Generating Custom Theme"

GENERATOR="vendor/drupal/prototype/generator.php"
ddev composer require 'drupal/prototype:^5.3' --no-interaction
info "drupal/prototype installed"

if ddev exec test -f "/var/www/html/${GENERATOR}"; then
  ddev exec php "/var/www/html/${GENERATOR}" \
    -n "${DK_THEME_NAME}" \
    -d "${DK_THEME_DESC}" \
    -p "web/themes/custom" \
    -a short
  info "Theme '${DK_THEME_NAME}' generated at ${DK_THEME_PATH}"
  ddev drush pm:enable "${DK_THEME_NAME}" -y
  info "Theme '${DK_THEME_NAME}' enabled"
else
  warn "generator.php not found at ${GENERATOR} — theme generation skipped."
  warn "Run manually: ddev exec php /var/www/html/${GENERATOR} -n ${DK_THEME_NAME} -d '${DK_THEME_DESC}' -p web/themes/custom -a short"
fi

ddev composer remove drupal/prototype --no-interaction
info "drupal/prototype removed from require"

# =============================================================================
# 16. DRUPAL BASE RECIPE
# =============================================================================
header "Applying Drupal Base Recipe"

if ! ddev drush status --field=bootstrap 2>/dev/null | grep -qi "successful"; then
  warn "Drupal is not bootstrapped — skipping recipe."
  warn "Run 'ddev drush recipe /var/www/html/recipes/drupal-base' manually."
elif [[ ! -d "recipes/drupal-base" ]]; then
  warn "recipes/drupal-base not found — skipping."
else
  ddev drush recipe /var/www/html/recipes/drupal-base
  info "Drupal Base recipe applied"
  ddev drush cex -y
  info "Configuration exported"
fi

# =============================================================================
# 17. PANTHEON (optional)
# =============================================================================
if [[ "$DK_USES_PANTHEON" == "yes" ]]; then
  ddev setup-pantheon --php-version="${DK_PHP_VERSION}"
fi

# =============================================================================
# 18. DONE
# =============================================================================
echo
echo -e "${GREEN}${BOLD}============================================================${RESET}"
echo -e "${GREEN}${BOLD}  Drupal Kickstart Complete!${RESET}"
echo -e "${GREEN}${BOLD}============================================================${RESET}"
echo
echo -e "  ${BOLD}Site URL        :${RESET} https://${DK_DDEV_NAME}.ddev.site"
echo -e "  ${BOLD}Theme path      :${RESET} ${DK_THEME_PATH}"
if [[ -n "$DK_COMMIT_PREFIX" ]]; then
  echo -e "  ${BOLD}Commit format   :${RESET} ${DK_COMMIT_PREFIX}-123: My commit message"
fi
echo
echo -e "  ${YELLOW}${BOLD}Next steps:${RESET}"
echo -e "  1. Run ${BOLD}ddev drush en redis -y && ddev drush cr${RESET} to activate Redis caching"
if [[ "$DK_USES_PANTHEON" == "yes" ]]; then
  echo -e "  2. Complete Pantheon environment linking manually"
fi
if [[ "$DK_USES_SOLR" == "yes" ]]; then
  echo -e "  3. Add SOLR core config to ${BOLD}.ddev/solr/${RESET}"
fi
echo
echo -e "  ${CYAN}Settings saved in ${BOLD}${ENV_FILE}${RESET}${CYAN} — delete when no longer needed.${RESET}"
echo
