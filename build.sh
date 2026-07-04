#!/usr/bin/env bash
# Package the Page Turner Chrome extension for the Web Store.
# Produces package-page-turner-{version}.zip containing only the files
# the extension needs at runtime (no tests, artwork or dev files).
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
if [ -z "$VERSION" ]; then
    echo "Could not read version from manifest.json" >&2
    exit 1
fi

ZIP="package-page-turner-${VERSION}.zip"

# Everything the packaged extension references:
# - manifest, content script + its CSS, background service worker
# - popup page
# - toolbar state icons (background.js), manifest icons, popup header icon
FILES=(
    manifest.json
    page-turner.js
    styles.css
    background.js
    popup/popup.html
    popup/popup.css
    popup/popup.js
    icons/inactive.png
    icons/back.png
    icons/next.png
    icons/both.png
    icons/back-c.png
    icons/next-c.png
    icons/both-c-back.png
    icons/both-c-next.png
    icons/icon16.png
    icons/icon32.png
    icons/icon48.png
    icons/icon128.png
)

for f in "${FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo "Missing required file: $f" >&2
        exit 1
    fi
done

rm -f "$ZIP"
zip -X "$ZIP" "${FILES[@]}"

echo "Created $ZIP"
