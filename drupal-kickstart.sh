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
  THEME_PATH="${WEB_PATH}/themes/custom/${THEME_NAME}"
  header "Resuming with saved configuration"
else
  header "Project Configuration"

  # Project name — default to current directory basename
  DEFAULT_NAME="${PROJECT_NAME:-$(basename "$PWD")}"
  prompt PROJECT_NAME "Project name" "$DEFAULT_NAME"

  # Theme name
  DEFAULT_THEME="${THEME_NAME:-${PROJECT_NAME}_theme}"
  prompt THEME_NAME "Theme name" "$DEFAULT_THEME"

  # Web path (docroot)
  DEFAULT_WEB="${WEB_PATH:-web}"
  prompt WEB_PATH "Web path (docroot)" "$DEFAULT_WEB"

  # Derived theme path (not prompted)
  THEME_PATH="${WEB_PATH}/themes/custom/${THEME_NAME}"

  # Pantheon
  DEFAULT_PANTHEON="${PANTHEON:-no}"
  prompt_yn PANTHEON "Install Pantheon modules?" "$DEFAULT_PANTHEON"

  # SOLR
  DEFAULT_SOLR="${SOLR:-no}"
  prompt_yn SOLR "Enable SOLR?" "$DEFAULT_SOLR"

  # JIRA shortname
  DEFAULT_JIRA="${JIRA_SHORT:-}"
  prompt JIRA_SHORT "JIRA project shortname (e.g. GRE for GRE-123:)" "$DEFAULT_JIRA"

  # PHP version
  DEFAULT_PHP="${PHP_VERSION:-8.3}"
  prompt PHP_VERSION "PHP version" "$DEFAULT_PHP"

  # Node version
  DEFAULT_NODE="${NODE_VERSION:-22}"
  prompt NODE_VERSION "Node version" "$DEFAULT_NODE"
fi

# =============================================================================
# 3. PERSIST VALUES TO .kickstart.env (skipped on resume — file already exists)
# =============================================================================
if [[ "$RESUME" != "yes" ]]; then
  cat > "$ENV_FILE" <<EOF
# Drupal Kickstart — saved configuration
# Generated: $(date)
PROJECT_NAME="${PROJECT_NAME}"
THEME_NAME="${THEME_NAME}"
WEB_PATH="${WEB_PATH}"
PANTHEON="${PANTHEON}"
SOLR="${SOLR}"
JIRA_SHORT="${JIRA_SHORT}"
PHP_VERSION="${PHP_VERSION}"
NODE_VERSION="${NODE_VERSION}"
EOF

  add_to_gitignore ".kickstart.env"
  info "Values saved to ${ENV_FILE} (added to .gitignore)"
fi

# =============================================================================
# 4. REVIEW + CONFIRM
# =============================================================================
header "Review — Please Confirm Your Settings"
echo
echo -e "    ${BOLD}Project name    :${RESET} ${PROJECT_NAME}"
echo -e "    ${BOLD}Web path        :${RESET} ${WEB_PATH}"
echo -e "    ${BOLD}Theme name      :${RESET} ${THEME_NAME}"
echo -e "    ${BOLD}Theme path      :${RESET} ${THEME_PATH}"
echo -e "    ${BOLD}PHP version     :${RESET} ${PHP_VERSION}"
echo -e "    ${BOLD}Node version    :${RESET} ${NODE_VERSION}"
echo -e "    ${BOLD}Pantheon        :${RESET} ${PANTHEON}"
echo -e "    ${BOLD}SOLR            :${RESET} ${SOLR}"
if [[ -n "$JIRA_SHORT" ]]; then
  echo -e "    ${BOLD}Commit prefix   :${RESET} ${JIRA_SHORT}-123: (example)"
else
  echo -e "    ${BOLD}Commit prefix   :${RESET} ${YELLOW}(none entered — grumphp.yml will not be updated)${RESET}"
fi
echo -e "    ${BOLD}Site URL        :${RESET} https://${PROJECT_NAME}.test"
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
  --project-name="${PROJECT_NAME}" \
  --project-type=drupal11 \
  --docroot="${WEB_PATH}" \
  --php-version="${PHP_VERSION}" \
  --project-tld=test

info "DDEV configured (docroot: ${WEB_PATH}, PHP: ${PHP_VERSION})"

# =============================================================================
# 6. PATCH .ddev/config.yml
# =============================================================================
header "Patching .ddev/config.yml"

DDEV_CONFIG=".ddev/config.yml"

# Append nodejs_version if not already present
if ! grep -q "^nodejs_version:" "$DDEV_CONFIG"; then
  echo "nodejs_version: \"${NODE_VERSION}\"" >> "$DDEV_CONFIG"
  info "Added nodejs_version: ${NODE_VERSION}"
fi

# Append web_environment block if not already present
if ! grep -q "^web_environment:" "$DDEV_CONFIG"; then
  cat >> "$DDEV_CONFIG" <<EOF

web_environment:
  - APP_ENVIRONMENT=local
  - DRUSH_OPTIONS_URI=https://${PROJECT_NAME}.test
  - THEME_PATH=${THEME_PATH}
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
if [[ "$SOLR" == "yes" ]]; then
  header "Installing SOLR DDEV Addon"
  ddev add-on get ddev/ddev-solr
  info "SOLR DDEV addon installed"
  warn "TODO: Place your SOLR core config in .ddev/solr/ — see https://github.com/ddev/ddev-solr"
fi

# =============================================================================
# 9. UPDATE grumphp.yml COMMIT MATCHER
# =============================================================================
if [[ -n "$JIRA_SHORT" ]] && [[ -f "grumphp.yml" ]]; then
  header "Updating grumphp.yml Commit Matcher"
  sed -i.bak "s/JIRA-\\\\d+/${JIRA_SHORT}-\\\\d+/g" grumphp.yml && rm -f grumphp.yml.bak
  info "grumphp.yml matcher updated to ${JIRA_SHORT}-\\d+"
fi

# =============================================================================
# 10. DDEV START
# =============================================================================
header "Starting DDEV"
ddev start
info "DDEV started — ${PROJECT_NAME}.test"

# =============================================================================
# 11. COMPOSER INSTALL
# =============================================================================
header "Installing Drupal 11 Dependencies"

# If the user chose a docroot other than 'web', update composer.json scaffold
# and installer-paths to use the correct directory before running install.
if [[ "$WEB_PATH" != "web" ]]; then
  sed -i.bak "s|\"web/\"|\"${WEB_PATH}/\"|g; s|\"web/core\"|\"${WEB_PATH}/core\"|g; s|\"web/libraries|\"${WEB_PATH}/libraries|g; s|\"web/modules|\"${WEB_PATH}/modules|g; s|\"web/profiles|\"${WEB_PATH}/profiles|g; s|\"web/themes|\"${WEB_PATH}/themes|g" composer.json && rm -f composer.json.bak
  info "composer.json scaffold paths updated to ${WEB_PATH}/"
fi

ddev composer install --no-interaction
info "Drupal 11 dependencies installed"

# =============================================================================
# 12. REDIS DRUPAL MODULE + settings.local.php
# =============================================================================
header "Setting Up Redis Drupal Caching"

# drupal/redis is already declared in composer.json and installed by step 11.
# No separate require needed — just configure settings.local.php.

# Ensure sites/default path exists
SITES_DEFAULT="${WEB_PATH}/sites/default"
mkdir -p "$SITES_DEFAULT"

SETTINGS_LOCAL="${SITES_DEFAULT}/settings.local.php"

# Create settings.local.php if it doesn't exist
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

# Append Redis config block if not already present
if ! grep -q "redis.connection" "$SETTINGS_LOCAL"; then
  cat >> "$SETTINGS_LOCAL" <<'REDIS_BLOCK'

// Redis caching — provided by ddev/ddev-redis addon.
// Run `ddev drush en redis -y && ddev drush cr` after Drupal install to activate.
if (!defined('MAINTENANCE_MODE')) {
  $settings['redis.connection']['interface'] = 'PhpRedis';
  $settings['redis.connection']['host'] = 'redis';
  $settings['cache']['default'] = 'cache.backend.redis';
  $settings['container_yamls'][] = DRUPAL_ROOT . '/modules/contrib/redis/example.services.yml';
}
REDIS_BLOCK
  info "Redis config block appended to ${SETTINGS_LOCAL}"
else
  warn "Redis config already present in ${SETTINGS_LOCAL} — skipped"
fi

# =============================================================================
# 13. PANTHEON (optional)
# =============================================================================
if [[ "$PANTHEON" == "yes" ]]; then
  header "Installing Pantheon Modules"
  ddev composer require drupal/pantheon_advanced_page_cache --no-interaction
  info "drupal/pantheon_advanced_page_cache installed"
  warn "Additional Pantheon setup (Live/Dev environment linking) must be done manually."
fi

# =============================================================================
# 14. ATEN STARTERKIT
# =============================================================================
header "Running Aten Starterkit"

STARTERKIT_CMD=".ddev/commands/web/aten-starterkit"
if [[ -f "$STARTERKIT_CMD" ]]; then
  ddev aten-starterkit
  info "aten-starterkit complete"
else
  warn "ddev aten-starterkit command not found at ${STARTERKIT_CMD}."
  warn "Falling back to a standard Drupal site install..."
  ddev drush site:install --yes \
    --site-name="${PROJECT_NAME}" \
    --account-name=admin \
    --account-pass=admin
  info "Drupal installed via drush site:install (admin/admin)"
fi

# =============================================================================
# 15. DRUPAL BASE RECIPE
# =============================================================================
header "Applying Drupal Base Recipe"

# Verify Drupal is bootstrapped (i.e. site:install ran successfully) before
# attempting the recipe — drush recipe requires a working database connection.
if ! ddev drush status --field=bootstrap 2>/dev/null | grep -qi "successful"; then
  warn "Drupal is not bootstrapped — skipping recipe."
  warn "Run 'ddev drush site:install' then 'ddev drush recipe /var/www/html/recipes/drupal-base' manually."
elif [[ ! -d "recipes/drupal-base" ]]; then
  warn "recipes/drupal-base not found — skipping."
  warn "Run 'ddev drush recipe /var/www/html/recipes/drupal-base' manually when ready."
else
  # Apply the recipe — container path /var/www/html maps to the project root
  ddev drush recipe /var/www/html/recipes/drupal-base
  info "Drupal Base recipe applied"

  # Export config after recipe so it's committed to the repo
  ddev drush cex -y
  info "Config exported to sync directory"
fi

# =============================================================================
# 16. DONE
# =============================================================================
echo
echo -e "${GREEN}${BOLD}============================================================${RESET}"
echo -e "${GREEN}${BOLD}  Drupal Kickstart Complete!${RESET}"
echo -e "${GREEN}${BOLD}============================================================${RESET}"
echo
echo -e "  ${BOLD}Site URL        :${RESET} https://${PROJECT_NAME}.test"
echo -e "  ${BOLD}Theme path      :${RESET} ${THEME_PATH}"
if [[ -n "$JIRA_SHORT" ]]; then
  echo -e "  ${BOLD}Commit format   :${RESET} ${JIRA_SHORT}-123: My commit message"
fi
echo
echo -e "  ${YELLOW}${BOLD}Next steps:${RESET}"
echo -e "  1. Run ${BOLD}ddev drush en redis -y && ddev drush cr${RESET} after Drupal install"
if [[ "$PANTHEON" == "yes" ]]; then
  echo -e "  2. Complete Pantheon environment linking manually"
fi
if [[ "$SOLR" == "yes" ]]; then
  echo -e "  3. Add SOLR core config to ${BOLD}.ddev/solr/${RESET}"
fi
echo
echo -e "  ${CYAN}Settings saved in ${BOLD}${ENV_FILE}${RESET}${CYAN} — delete when no longer needed.${RESET}"
echo
