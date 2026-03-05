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
  if [[ "${CI:-}" == "true" ]]; then
    # shellcheck source=.kickstart.env
    source "$ENV_FILE"
    RESUME="yes"
    info "CI mode — loaded saved values from ${ENV_FILE} automatically."
  else
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
fi

# =============================================================================
# 2. PROMPT COLLECTION (skipped when resuming)
# =============================================================================
if [[ "$RESUME" == "yes" ]]; then
  # Derive theme path from loaded values — no prompts needed
  DK_THEME_PATH="web/themes/custom/${DK_THEME_NAME}"
  DK_THEME_DESC="${DK_THEME_DESC:-Custom theme for ${DK_DDEV_NAME}}"
  header "Resuming with saved configuration"
else
  header "Project Configuration"

  # Project name — default to current directory basename
  DEFAULT_NAME="${DK_DDEV_NAME:-$(basename "$PWD")}"
  prompt DK_DDEV_NAME "Project name" "$DEFAULT_NAME"
  # Theme name — sanitize helper: lowercase, spaces/hyphens→underscore, strip
  # non-alphanumeric, strip leading digits/underscores (Drupal machine name rules).
  sanitize_machine_name() {
    echo "$1" \
      | tr '[:upper:]' '[:lower:]' \
      | tr -s '[:space:]-' '_' \
      | tr -cd '[:alnum:]_' \
      | sed 's/^[0-9_]*//; s/_*$//'
  }
  DEFAULT_THEME="$(sanitize_machine_name "${DK_THEME_NAME:-${DK_DDEV_NAME}_theme}")"
  prompt DK_THEME_NAME "Theme name" "$DEFAULT_THEME"
  # Sanitize whatever the user typed as well
  DK_THEME_NAME="$(sanitize_machine_name "$DK_THEME_NAME")"

  # Theme description — auto-derived, not prompted
  DK_THEME_DESC="Custom theme for ${DK_DDEV_NAME}"

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
  DK_DRUPAL_ADMIN_USERNAME="admin"
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

if [[ "${CI:-}" == "true" ]]; then
  info "CI mode — auto-confirming."
else
  read -r -p "$(echo -e "  ${BOLD}Proceed?${RESET} [${CYAN}Y/n${RESET}]: ")" _proceed
  _proceed="${_proceed:-Y}"
  if [[ ! "$_proceed" =~ ^[Yy] ]]; then
    echo -e "\n${YELLOW}Cancelled.${RESET} Your settings are preserved in ${ENV_FILE}."
    exit 0
  fi
fi

# =============================================================================
# 5. DDEV INIT
# =============================================================================
header "Initializing DDEV"
ddev config \
  --project-name="${DK_DDEV_NAME}" \
  --project-type=drupal11 \
  --docroot=web \
  --php-version="${DK_PHP_VERSION}"

info "DDEV configured (docroot: web, PHP: ${DK_PHP_VERSION})"

# =============================================================================
# 6. PATCH .ddev/config.yaml
# =============================================================================
header "Patching .ddev/config.yaml"

DDEV_CONFIG=".ddev/config.yaml"

# Insert nodejs_version after corepack_enable if not already present
if ! grep -q "^nodejs_version:" "$DDEV_CONFIG"; then
  awk "/^corepack_enable:/{print; print \"nodejs_version: \\\"${DK_NODE_VERSION}\\\"\"; next}1" "$DDEV_CONFIG" > "${DDEV_CONFIG}.tmp" && mv "${DDEV_CONFIG}.tmp" "$DDEV_CONFIG"
  info "Added nodejs_version: ${DK_NODE_VERSION}"
fi

# Replace the empty web_environment: [] placeholder DDEV generates with our values
if grep -q "^web_environment: \[\]" "$DDEV_CONFIG"; then
  sed -i.bak "s|^web_environment: \[\]|web_environment:\n  - APP_ENVIRONMENT=local\n  - DRUSH_OPTIONS_URI=https://${DK_DDEV_NAME}.ddev.site\n  - THEME_PATH=${DK_THEME_PATH}|" "$DDEV_CONFIG" && rm -f "${DDEV_CONFIG}.bak"
  info "Populated web_environment block"
elif ! grep -q "^web_environment:" "$DDEV_CONFIG"; then
  cat >> "$DDEV_CONFIG" <<EOF

web_environment:
  - APP_ENVIRONMENT=local
  - DRUSH_OPTIONS_URI=https://${DK_DDEV_NAME}.ddev.site
  - THEME_PATH=${DK_THEME_PATH}
EOF
  info "Added web_environment block"
fi

# Prevent DDEV from auto-generating settings.ddev.php — we provide our own copy.
if ! grep -q "^disable_settings_management:" "$DDEV_CONFIG"; then
  awk '/^nodejs_version:/{print; print "disable_settings_management: true"; next}1' "$DDEV_CONFIG" > "${DDEV_CONFIG}.tmp" && mv "${DDEV_CONFIG}.tmp" "$DDEV_CONFIG"
  info "Disabled DDEV settings management (using custom settings.ddev.php)"
fi

# =============================================================================
# 7. SOLR (optional)
# =============================================================================
if [[ "$DK_USES_SOLR" == "yes" ]]; then
  header "Installing SOLR DDEV Addon"
  ddev add-on get ddev/ddev-solr
  info "SOLR DDEV addon installed"
fi

# =============================================================================
# 8. TOKEN SUBSTITUTION
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
# 9. DDEV START
# =============================================================================
header "Starting DDEV"
ddev start
info "DDEV started — ${DK_DDEV_NAME}.ddev.site"

# =============================================================================
# 10. SCAFFOLD DRUPAL PROJECT
# =============================================================================
header "Scaffolding Drupal 11 Project"

if [[ ! -f "web/index.php" ]]; then
  info "Running composer create-project in container..."
  # Set platform.php before create-project so Composer resolves against the configured PHP version
  # from the start rather than using the container's detected version.
  ddev exec bash -c "rm -rf /tmp/dp && composer create-project 'drupal/recommended-project:^11.2' /tmp/dp --no-interaction"
  ddev exec bash -c "rsync -a /tmp/dp/ /var/www/html/"
  ddev composer config platform.php ${DK_PHP_VERSION}
  info "Drupal scaffold created (11.2.x, platform.php ${DK_PHP_VERSION})"
else
  info "Drupal scaffold already present — skipping create-project"
fi

# =============================================================================
# 11. COMPOSER DEPENDENCIES
# =============================================================================
header "Installing Composer Dependencies"

# Apply project composer standards (platform, plugins, scaffold, patches, scripts).
# Also installs drush/drush and drupal/core-dev as standard tooling deps.
ddev setup-composer

# Set minimum-stability to dev so the local path repo (formula-foundational) is resolvable.
# prefer-stable ensures all other packages still resolve to stable releases.
ddev composer config minimum-stability dev
ddev composer config prefer-stable true
info "Composer stability configured (dev + prefer-stable)"

# =============================================================================
# 12. SETTINGS FILES
# =============================================================================
header "Configuring Settings Files"

# Ensure hash salt is available (sourced from .env on resume runs)
[[ -z "${DK_DRUPAL_HASH_SALT:-}" ]] && [[ -f ".env" ]] && source ".env"

# Copy assets/settings.ddev.php (with hash salt), patch settings.php include,
# and create a minimal settings.ddev.php stub.
ddev exec bash /var/www/html/.ddev/commands/web/setup-settings \
  --hash-salt="${DK_DRUPAL_HASH_SALT}"

# =============================================================================
# 13. SITE INSTALL
# =============================================================================
header "Installing Drupal"

# Source .env to get admin credentials
[[ -f ".env" ]] && source ".env"
ADMIN_USER="${DK_DRUPAL_ADMIN_USERNAME:-administrator}"
ADMIN_PASS="${DK_DRUPAL_ADMIN_PASSWORD:-admin}"

# Ensure config/sync exists before install so Drupal uses it rather than
# generating a random hash-suffixed directory.
mkdir -p config/sync
info "Config sync directory ensured (config/sync)"

SITE_NAME="${DK_DDEV_NAME}" ACCOUNT_NAME="${ADMIN_USER}" ACCOUNT_PASS="${ADMIN_PASS}" ddev site-install minimal
info "Drupal installed via ddev site-install (minimal profile)"

# drush site:install rewrites settings.php, removing the settings.ddev.php
# include. Re-run setup-settings to restore it.
ddev exec bash /var/www/html/.ddev/commands/web/setup-settings \
  --hash-salt="${DK_DRUPAL_HASH_SALT}"
info "settings.php include restored after site install"

# =============================================================================
# 14. PROTOTYPE THEME
# =============================================================================
header "Generating Custom Theme"

# Only generate the theme files here — activation is deferred to §15 so that
# the theme's module dependencies (twig_field_value, twig_tweak) are installed
# by the foundational recipe before drush theme:install runs.
ddev setup-prototype \
  --theme-name="${DK_THEME_NAME}" \
  --theme-desc="${DK_THEME_DESC}" \
  --generate-only

# =============================================================================
# 15. DRUPAL BASE RECIPE
# =============================================================================
header "Applying Drupal Base Recipe"
ddev recipe formula-foundational
# Uninstall the Stark theme, which is enabled by default in the minimal profile.
ddev drush theme:uninstall stark
# Allow installation of optional recipes (skipped in CI)
if [[ "${CI:-}" != "true" ]]; then
  ddev recipe
fi

# =============================================================================
# 16. SOLR POST-INSTALL (optional)
# Must run after Drupal is installed and modules are available.
# =============================================================================
if [[ "$DK_USES_SOLR" == "yes" ]]; then
  header "Configuring Solr"

  # Installs Composer deps, applies formula-solr recipe, configures
  # settings.ddev.php, generates and extracts the Solr configset, then
  # restarts DDEV so the Solr container picks up the new schema.
  ddev solr-init
fi

# =============================================================================
# 17. PANTHEON (optional) -- Eventually abstract Redis.
# =============================================================================
if [[ "$DK_USES_PANTHEON" == "yes" ]]; then
  header "Installing Redis DDEV Addon"
  ddev add-on get ddev/ddev-redis
  ddev restart
  info "Redis DDEV addon installed"

  # Redis PHP settings are written inside setup-pantheon, AFTER the redis
  # module is installed by the formula-pantheon recipe. Writing them here
  # (before the recipe runs) causes Drush to fail with
  # "non-existent service cache.backend.redis" on bootstrap.
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
if [[ "$DK_USES_PANTHEON" == "yes" ]]; then
  echo -e "  1. Complete Pantheon environment linking manually"
fi
echo
echo -e "  ${CYAN}Settings saved in ${BOLD}${ENV_FILE}${RESET}${CYAN} — delete when no longer needed.${RESET}"
echo
