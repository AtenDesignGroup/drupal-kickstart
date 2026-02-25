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
  # Provide default for THEME_DESC if missing from an older .kickstart.env
  THEME_DESC="${THEME_DESC:-${PROJECT_NAME} Theme}"
  header "Resuming with saved configuration"
else
  header "Project Configuration"

  # Project name — default to current directory basename
  DEFAULT_NAME="${PROJECT_NAME:-$(basename "$PWD")}"
  prompt PROJECT_NAME "Project name" "$DEFAULT_NAME"

  # Theme name
  DEFAULT_THEME="${THEME_NAME:-${PROJECT_NAME}_theme}"
  prompt THEME_NAME "Theme name" "$DEFAULT_THEME"

  # Theme description (used by the prototype theme generator)
  DEFAULT_THEME_DESC="${THEME_DESC:-${PROJECT_NAME} Theme}"
  prompt THEME_DESC "Theme description" "$DEFAULT_THEME_DESC"

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
THEME_DESC="${THEME_DESC}"
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
echo -e "    ${BOLD}Theme desc      :${RESET} ${THEME_DESC}"
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
  --create-docroot \
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
# 11. SCAFFOLD DRUPAL PROJECT
# =============================================================================
header "Scaffolding Drupal 11 Project"

if [[ ! -f "${WEB_PATH}/index.php" ]]; then
  info "Running composer create-project in container..."
  # --no-install: create composer.json + composer.lock scaffold without vendor/
  # We rsync everything — no exclusions needed since there's no repo composer.json
  ddev exec bash -c "composer create-project 'drupal/recommended-project:^11' /tmp/dp --no-install --no-interaction"
  ddev exec bash -c "rsync -a /tmp/dp/ /var/www/html/"
  info "Drupal scaffold created"
else
  info "Drupal scaffold already present — skipping create-project"
fi

# =============================================================================
# 12. COMPOSER DEPENDENCIES
# =============================================================================
header "Installing Composer Dependencies"

# Drush
ddev composer require \
  "drush/drush:^13" \
  --no-interaction
info "drush/drush installed"

# Contrib packages
ddev composer require \
  "drupal/gin:^3.0" \
  "drupal/gin_login:^2.0" \
  "drupal/config_ignore:^3.0" \
  "drupal/pathauto:^1.0" \
  "drupal/redirect:^1.0" \
  "drupal/robotstxt:^1.0" \
  "drupal/menu_block:^1.0" \
  "drupal/csp:^1.0" \
  "drupal/metatag:^2.0" \
  "drupal/redis:^2.0@alpha" \
  --no-interaction
info "Contrib packages installed"

# Dev dependencies — use -W to allow transitive dependency upgrades
# drupal/core-dev requires phpunit which needs a newer sebastian/diff than
# what the contrib packages locked above; -W lets Composer resolve it cleanly.
ddev composer require --dev \
  "drupal/core-dev:^11" \
  --with-all-dependencies \
  --no-interaction
info "Dev dependencies installed"

# =============================================================================
# 13. REDIS SETTINGS
# =============================================================================
header "Configuring Redis Cache Settings"

SITES_DEFAULT="${WEB_PATH}/sites/default"
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
  info "Redis config written to ${SETTINGS_LOCAL}"
else
  warn "Redis config already present in ${SETTINGS_LOCAL} — skipped"
fi

# =============================================================================
# 14. SITE INSTALL
# =============================================================================
header "Installing Drupal"

STARTERKIT_CMD=".ddev/commands/web/aten-starterkit"
SITE_INSTALL_CMD=".ddev/commands/web/site-install"
if [[ -f "$STARTERKIT_CMD" ]]; then
  ddev aten-starterkit
  info "aten-starterkit complete"
elif [[ -f "$SITE_INSTALL_CMD" ]]; then
  SITE_NAME="${PROJECT_NAME}" ddev site-install
  info "Drupal installed via ddev site-install (admin/admin)"
else
  ddev drush site:install --yes \
    --site-name="${PROJECT_NAME}" \
    --account-name=admin \
    --account-pass=admin
  info "Drupal installed (admin/admin)"
fi

# =============================================================================
# 15. DRUPAL BASE RECIPE
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
# 16. PROTOTYPE THEME
# =============================================================================
header "Generating Custom Theme"

GENERATOR="vendor/drupal/prototype/generator.php"
ddev composer require 'drupal/prototype:^5.3' --no-interaction
info "drupal/prototype installed"

if ddev exec test -f "/var/www/html/${GENERATOR}"; then
  ddev exec php "/var/www/html/${GENERATOR}" \
    -n "${THEME_NAME}" \
    -d "${THEME_DESC}" \
    -p "${WEB_PATH}/themes/custom" \
    -a short
  info "Theme '${THEME_NAME}' generated at ${THEME_PATH}"
  ddev drush pm:enable "${THEME_NAME}" -y
  info "Theme '${THEME_NAME}' enabled"
else
  warn "generator.php not found at ${GENERATOR} — theme generation skipped."
  warn "Run manually: ddev exec php /var/www/html/${GENERATOR} -n ${THEME_NAME} -d '${THEME_DESC}' -p ${WEB_PATH}/themes/custom -a short"
fi

ddev composer remove drupal/prototype --no-interaction
info "drupal/prototype removed from require"

# =============================================================================
# 17. PANTHEON (optional)
# =============================================================================
if [[ "$PANTHEON" == "yes" ]]; then
  header "Installing Pantheon"

  # -- Composer packages -------------------------------------------------------
  ddev composer require \
    'drupal/pantheon_advanced_page_cache:^2.3' \
    'pantheon-systems/drupal-integrations:^11' \
    'drupal/search_api_pantheon:^8.4' \
    'drupal/pantheon_secrets:^1.0' \
    --no-interaction
  info "Pantheon Composer packages installed"

  # drupal-integrations is a non-standard package — must be explicitly allowed
  ddev composer config extra.allowed-packages.pantheon-systems/drupal-integrations true
  info "pantheon-systems/drupal-integrations added to extra.allowed-packages"

  # -- Pantheon recipe ---------------------------------------------------------
  if [[ -d "recipes/drupal-pantheon" ]]; then
    if ddev drush status --field=bootstrap 2>/dev/null | grep -qi "successful"; then
      ddev drush recipe /var/www/html/recipes/drupal-pantheon
      info "Drupal Pantheon recipe applied"
      ddev drush cex -y
      info "Configuration exported"
    else
      warn "Drupal not bootstrapped — run 'ddev drush recipe /var/www/html/recipes/drupal-pantheon' manually."
    fi
  else
    warn "recipes/drupal-pantheon not found — skipping recipe."
  fi

  # -- pantheon.yml ------------------------------------------------------------
  if [[ ! -f "pantheon.yml" ]]; then
    cp assets/pantheon/pantheon.yml pantheon.yml
    sed -i.bak "s/^php_version:.*/php_version: ${PHP_VERSION}/" pantheon.yml \
      && rm -f pantheon.yml.bak
    info "pantheon.yml copied (PHP ${PHP_VERSION})"
  else
    warn "pantheon.yml already exists — skipped (verify php_version: ${PHP_VERSION})"
  fi

  # -- settings.platform.php --------------------------------------------------
  PLATFORM_SETTINGS="${WEB_PATH}/sites/default/settings.platform.php"
  if [[ ! -f "$PLATFORM_SETTINGS" ]]; then
    cp assets/pantheon/settings.platform.php "$PLATFORM_SETTINGS"
    info "settings.platform.php copied to ${WEB_PATH}/sites/default/"
  else
    warn "settings.platform.php already exists — skipped."
  fi

  # -- Quicksilver scripts ----------------------------------------------------
  QS_SRC="assets/pantheon/quicksilver/pantheon-drupal-quicksilver"
  QS_DEST="${WEB_PATH}/private/scripts/quicksilver"
  if [[ -d "$QS_SRC" ]]; then
    mkdir -p "$QS_DEST"
    cp -r "${QS_SRC}/." "$QS_DEST/"
    info "Quicksilver scripts copied to ${QS_DEST}"
  else
    warn "Quicksilver source not found at ${QS_SRC} — skipped."
  fi

  warn "Complete Pantheon environment linking must be done manually."
fi

# =============================================================================
# 18. DONE
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
echo -e "  1. Run ${BOLD}ddev drush en redis -y && ddev drush cr${RESET} to activate Redis caching"
if [[ "$PANTHEON" == "yes" ]]; then
  echo -e "  2. Complete Pantheon environment linking manually"
fi
if [[ "$SOLR" == "yes" ]]; then
  echo -e "  3. Add SOLR core config to ${BOLD}.ddev/solr/${RESET}"
fi
echo
echo -e "  ${CYAN}Settings saved in ${BOLD}${ENV_FILE}${RESET}${CYAN} — delete when no longer needed.${RESET}"
echo
