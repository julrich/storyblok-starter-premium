#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# purge-history.sh — Strip dead files and old LFS blobs from git history
# =============================================================================
#
# Removes ~432 MB of historical bloat:
#   - Dead lockfiles: package-lock.json (85 MB), yarn.lock (33 MB)
#   - Old snapshot PNGs now in LFS (187 MB)
#   - Old static assets now in LFS: png/jpg/gif/mp4 (97 MB)
#   - Old generated JSON now in LFS (31 MB)
#
# Keeps: SVGs, fonts, metadata files in static/ (they're not in LFS)
#
# USAGE:
#   1. Commit and push all work on your branch
#   2. Run: bash scripts/purge-history.sh
#   3. Verify the result, then force-push: git push --force-with-lease
#   4. All other contributors must re-clone or:
#        git fetch --all && git reset --hard origin/<branch>
#
# PREREQUISITES:
#   pip install git-filter-repo
#
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Pre-flight checks -------------------------------------------------------

if ! command -v git-filter-repo &>/dev/null; then
  echo -e "${RED}ERROR: git-filter-repo not found.${NC}"
  echo "Install with: pip install git-filter-repo"
  exit 1
fi

# Must be run from repo root
if [[ ! -d .git ]]; then
  echo -e "${RED}ERROR: Run this script from the repository root.${NC}"
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo -e "${RED}ERROR: You have uncommitted changes. Commit or stash them first.${NC}"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "${YELLOW}=== Git History Purge ===${NC}"
echo ""
echo "Branch:  ${BRANCH}"
echo ""
echo "This will REWRITE all commit history to remove:"
echo "  - package-lock.json (all occurrences)"
echo "  - yarn.lock (all occurrences)"
echo "  - packages/design-system/__snapshots__/**/*.png"
echo "  - packages/design-system/static/**/*.{png,jpg,gif,mp4}"
echo "  - **/components-schema.json"
echo "  - **/components-presets.json"
echo "  - **/components.123456.json"
echo "  - **/presets.123456.json"
echo ""
echo -e "${RED}WARNING: This rewrites ALL commit SHAs. You must force-push after.${NC}"
echo ""
read -rp "Continue? (y/N) " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# --- Build paths file ---------------------------------------------------------

PATHS_FILE=$(mktemp)
cat > "${PATHS_FILE}" <<'EOF'
glob:**/package-lock.json
glob:**/yarn.lock
glob:packages/design-system/__snapshots__/**/*.png
glob:packages/design-system/static/**/*.png
glob:packages/design-system/static/**/*.jpg
glob:packages/design-system/static/**/*.gif
glob:packages/design-system/static/**/*.mp4
glob:**/components-schema.json
glob:**/components-presets.json
glob:**/components.123456.json
glob:**/presets.123456.json
EOF

echo ""
echo -e "${GREEN}Paths to strip:${NC}"
cat "${PATHS_FILE}"
echo ""

# --- Measure before -----------------------------------------------------------

BEFORE=$(git count-objects -vH 2>/dev/null | grep 'size-pack' | awk '{print $2, $3}')
echo "Pack size before: ${BEFORE}"
echo ""

# --- Run filter-repo ----------------------------------------------------------

echo -e "${YELLOW}Running git filter-repo...${NC}"
git filter-repo --invert-paths --paths-from-file "${PATHS_FILE}" --force

# --- Measure after ------------------------------------------------------------

AFTER=$(git count-objects -vH 2>/dev/null | grep 'size-pack' | awk '{print $2, $3}')
echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "Pack size before: ${BEFORE}"
echo "Pack size after:  ${AFTER}"
echo ""

# --- Clean up -----------------------------------------------------------------

rm -f "${PATHS_FILE}"

echo "Next steps:"
echo "  1. Verify the repo looks correct (git log, check files exist)"
echo "  2. Re-add the remote if filter-repo removed it:"
echo "       git remote add origin git@github.com:kickstartDS/storyblok-starter-premium.git"
echo "  3. Force-push:"
echo "       git push --force-with-lease origin ${BRANCH}"
echo "  4. If purging main too, repeat for that branch"
echo "  5. All contributors must re-clone or:"
echo "       git fetch --all && git reset --hard origin/<branch>"
