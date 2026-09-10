#!/usr/bin/env bash
#
# backupSpace.sh
#
# Snapshots everything in the Storyblok space that a content migration can
# damage: story content, the component schema, presets, datasources and
# languages. Written to backup/<timestamp>/ so repeated runs never overwrite
# each other.
#
# Stories are pulled with the official CLI rather than a bespoke dump, because
# `storyblok stories push` can then restore them - a hand-rolled JSON dump
# gives you the data back but no way to put it in.
#
# Usage:
#   npm run backup-space
#
# Requires NEXT_STORYBLOK_SPACE_ID (from .env.local) and a logged-in CLI:
#   npx storyblok login
#
set -euo pipefail

SPACE="${NEXT_STORYBLOK_SPACE_ID:?NEXT_STORYBLOK_SPACE_ID is not set}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DEST="backup/$STAMP"

mkdir -p "$DEST"
echo "backing up space $SPACE -> $DEST"

echo "  stories…"
npx storyblok stories pull --space "$SPACE" --path "$DEST/stories"

echo "  components + presets…"
npx storyblok components pull --space "$SPACE" --path "$DEST/components"

echo "  datasources… (if this space has none, expect a ~90s wait - see below)"
# Wrapped in `timeout` because of an upstream CLI bug: when a space has no
# datasources, `datasources pull` returns early without stopping its spinner
# (unlike `languages pull`, which calls spinner.failed() first). The spinner's
# animation timer then keeps the Node event loop alive and the process never
# exits. `|| echo` cannot help - a process that never exits never returns a
# non-zero code. The fetch itself has already completed at that point, so
# tripping the timeout here means "no datasources", not "lost data".
if timeout -k 5 90 npx storyblok datasources pull --space "$SPACE" --path "$DEST/datasources"; then
  :
elif [ $? -eq 124 ]; then
  echo "    (none - CLI hung on empty result, see comment in this script)"
else
  echo "    (none)"
fi

echo "  languages…"
npx storyblok languages pull --space "$SPACE" --path "$DEST/languages" || echo "    (none)"

# A count is the cheapest possible integrity check: it turns "the command
# exited 0" into "there are actually N stories on disk".
COUNT="$(find "$DEST/stories" -name '*.json' 2>/dev/null | wc -l | tr -d ' ')"
echo
echo "done: $COUNT story file(s) in $DEST"
[ "$COUNT" -gt 0 ] || { echo "✖ no stories were written - do NOT rely on this backup" >&2; exit 1; }

cat <<RESTORE

To restore stories into space $SPACE:
  npx storyblok stories push --space $SPACE --path $DEST/stories
Add --publish to restore them as published.
Preview first with --dry-run.
RESTORE
