#!/usr/bin/env bash
# One-way sync of the webos app shape into template/.
# Usage: scripts/sync-template.sh [path-to-vectojs-webos-repo]
# Idempotent: placeholders/markers are applied in-place by apply-placeholders.ts.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
SOURCE="${1:-${WEBOS_SOURCE:-$ROOT/../webos}}"
TARGET="$ROOT/template"

if [[ ! -d "$SOURCE/src" ]]; then
	echo "error: webos source not found at $SOURCE (pass its path or set WEBOS_SOURCE)" >&2
	exit 1
fi

rm -rf "$TARGET"
mkdir -p "$TARGET"

# The app shape: sources, tests, html, tooling, scripts.
cp -R "$SOURCE/src" "$TARGET/src"
cp -R "$SOURCE/test" "$TARGET/test"
cp -R "$SOURCE/public" "$TARGET/public"
cp "$SOURCE/index.html" "$TARGET/index.html"
cp "$SOURCE/vite.config.ts" "$TARGET/vite.config.ts"
cp "$SOURCE/tsconfig.json" "$TARGET/tsconfig.json"
cp "$SOURCE/bunfig.toml" "$TARGET/bunfig.toml"
mkdir -p "$TARGET/scripts"
cp "$SOURCE/scripts/deploy-pages.sh" "$TARGET/scripts/deploy-pages.sh"
cp "$SOURCE/.oxfmtrc.json" "$TARGET/.oxfmtrc.json"
cp "$SOURCE/.oxlintrc.json" "$TARGET/.oxlintrc.json"
cp "$SOURCE/biome.json" "$TARGET/biome.json"
cp "$SOURCE/lefthook.yml" "$TARGET/lefthook.yml"
cp "$SOURCE/commitlint.config.mjs" "$TARGET/commitlint.config.mjs"
cp "$SOURCE/.markdownlint-cli2.jsonc" "$TARGET/.markdownlint-cli2.jsonc"
cp "$SOURCE/.gitignore" "$TARGET/.gitignore"
cp "$SOURCE/LICENSE" "$TARGET/LICENSE"
cp "$SOURCE/CODE_OF_CONDUCT.md" "$TARGET/CODE_OF_CONDUCT.md"
cp "$SOURCE/SECURITY.md" "$TARGET/SECURITY.md"
cp "$SOURCE/CHANGELOG.md" "$TARGET/CHANGELOG.md"

# Generator-owned files (never copied from webos).
mkdir -p "$TARGET/.github/workflows"
cp "$ROOT/template-owned/package.json" "$TARGET/package.json"
cp "$ROOT/template-owned/README.md" "$TARGET/README.md"
cp "$ROOT/template-owned/ci.yml" "$TARGET/.github/workflows/ci.yml"

bun "$ROOT/scripts/apply-placeholders.ts" "$TARGET"

echo "template synced from $SOURCE into $TARGET"
