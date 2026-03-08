#!/usr/bin/env bash
# Pack openclaw as .tgz and optionally install it globally.
#
# Usage:
#   ./scripts/macos/pack-install.sh                  # Interactive (prompts for install/delete)
#   ./scripts/macos/pack-install.sh --pack-only      # Build + pack, skip install
#   ./scripts/macos/pack-install.sh --install        # Build + pack + install (no prompt)
#   ./scripts/macos/pack-install.sh --install --clean # Build + pack + install + delete tgz
#   ./scripts/macos/pack-install.sh --skip-build     # Pack only (assumes already built)

set -euo pipefail

# ── Parse flags ──────────────────────────────────────────────────────────────
PACK_ONLY=false
INSTALL=false
CLEAN=false
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --pack-only)  PACK_ONLY=true ;;
    --install)    INSTALL=true ;;
    --clean)      CLEAN=true ;;
    --skip-build) SKIP_BUILD=true ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--pack-only] [--install] [--clean] [--skip-build]" >&2
      exit 1
      ;;
  esac
done

# ── Resolve repo root (three levels up from this script) ─────────────────────
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# ── Build ────────────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  printf '\n\033[36m=== Building... ===\033[0m\n'
  pnpm build
  pnpm ui:build
else
  printf '\n\033[33m=== Skipping build (--skip-build) ===\033[0m\n'
fi

# ── Pack (skip prepack since we already built) ───────────────────────────────
printf '\n\033[36m=== Packing... ===\033[0m\n'
npm_config_ignore_scripts=true pnpm pack

# ── Locate the generated .tgz ───────────────────────────────────────────────
PKG_NAME="$(python3 -c "import json; d=json.load(open('package.json')); print(d['name'])")"
PKG_VERSION="$(python3 -c "import json; d=json.load(open('package.json')); print(d['version'])")"
TGZ="$ROOT/${PKG_NAME}-${PKG_VERSION}.tgz"

if [ ! -f "$TGZ" ]; then
  echo "Expected $TGZ but file not found" >&2
  exit 1
fi
printf '\n\033[32mPackage created: %s\033[0m\n' "$TGZ"

# ── Install decision ────────────────────────────────────────────────────────
if [ "$PACK_ONLY" = true ]; then
  printf '\033[90mPack only mode. Package at: %s\033[0m\n' "$TGZ"
  printf '\033[90mYou can install later with: npm install -g %s\033[0m\n' "$TGZ"
  exit 0
fi

SHOULD_INSTALL=false
if [ "$INSTALL" = true ]; then
  SHOULD_INSTALL=true
else
  printf '\nInstall globally? (Y/n) '
  read -r ANSWER
  case "$ANSWER" in
    [nN]*) ;;
    *)     SHOULD_INSTALL=true ;;
  esac
fi

if [ "$SHOULD_INSTALL" = false ]; then
  printf '\033[90mSkipped install. Package at: %s\033[0m\n' "$TGZ"
  printf '\033[90mYou can install later with: npm install -g %s\033[0m\n' "$TGZ"
  exit 0
fi

printf '\n\033[36m=== Installing globally... ===\033[0m\n'
npm install -g "$TGZ"
printf '\033[32mInstalled successfully!\033[0m\n'

# ── Delete decision ─────────────────────────────────────────────────────────
SHOULD_DELETE=false
if [ "$CLEAN" = true ]; then
  SHOULD_DELETE=true
elif [ "$INSTALL" = false ]; then
  printf '\nDelete %s-%s.tgz? (y/N) ' "$PKG_NAME" "$PKG_VERSION"
  read -r ANSWER
  case "$ANSWER" in
    [yY]*) SHOULD_DELETE=true ;;
  esac
fi

if [ "$SHOULD_DELETE" = true ]; then
  rm -f "$TGZ"
  printf '\033[33mDeleted.\033[0m\n'
else
  printf '\033[90mKept at: %s\033[0m\n' "$TGZ"
  printf '\033[90mYou can reinstall later with: npm install -g %s\033[0m\n' "$TGZ"
fi
