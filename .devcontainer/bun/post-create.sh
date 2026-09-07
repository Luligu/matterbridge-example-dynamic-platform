#!/usr/bin/env bash

# .devcontainer/bun/post-create.sh v.2.1.0

# This script runs after the Dev Container is created to set up the dev container environment.

set -euo pipefail

echo "Welcome to Matterbridge Plugin Dev Container (post-create.sh)"
DISTRO=$(awk -F= '/^PRETTY_NAME=/{gsub(/"/, "", $2); print $2}' /etc/os-release)
CODENAME=$(awk -F= '/^VERSION_CODENAME=/{print $2}' /etc/os-release)
echo "Distro: $DISTRO ($CODENAME)"
echo "User: $(whoami)"
echo "Hostname: $(hostname)"
echo "Architecture: $(uname -m)"
echo "Kernel Version: $(uname -r)"
echo "Uptime: $(uptime -p || echo 'unavailable')"
echo "Date: $(date)"
echo "Bun version: $(bun -v)"
echo "Bun global cache: ${HOME}/.bun/install/cache"
echo ""

# Ensure required directories exist and are owned by the current user
workspace_paths=("$PWD/node_modules" "$PWD/apps/frontend/node_modules" "$PWD/.cache")
home_paths=("$HOME/Matterbridge" "$HOME/.matterbridge" "$HOME/.mattercert" "$HOME/.claude" "$HOME/.codex" "$HOME/.agents" "$HOME/.bash-cache" "$HOME/.npm" "$HOME/.bun" "$HOME/.bun/install/cache" "$HOME/.vscode-server/extensions")

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "1.post-create - Creating directories..."
sudo mkdir -p "${workspace_paths[@]}" "${home_paths[@]}" # Create directories if they don't exist

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "2.post-create - Setting permissions..."
# Only chown paths that are not already owned by the current user. The image pre-creates the
# home paths, so fresh volumes are seeded correctly and this is a no-op; the workspace volumes
# still need it on first create, but they are empty then, so the recursion is instant.
for path in . "${workspace_paths[@]}" "${home_paths[@]}"; do
  if [ "$(stat -c %u "$path")" != "$(id -u)" ]; then
    sudo chown -R "$(id -u):$(id -g)" "$path" # Transfer ownership to the current user
  fi
done

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "3.post-create - Building Matterbridge..."
# Change dev to main to install the stable branch.
bash .devcontainer/bun/install-matterbridge.sh dev

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "4.post-create - Installing the plugin dependencies..."
[ -f package-lock.json ] && mv package-lock.json package-lock.json.bak || true
bun install
[ -f package-lock.json.bak ] && mv package-lock.json.bak package-lock.json || true

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "5.post-create - Linking Matterbridge..."
if ! bun link matterbridge; then
	echo "Retrying link with elevated permissions..."
	sudo bun link matterbridge
	sudo chown -R bun:bun ./node_modules
fi

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "6.post-create - Building the plugin..."
bun run build

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "7.post-create - Checking for the plugin frontend..."
if [ -f apps/frontend/package.json ]; then
	echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "7.post-create - Building the plugin frontend..."
	cd apps/frontend
	[ -f package-lock.json ] && mv package-lock.json package-lock.json.bak || true
	bun install && bun run build
	[ -f package-lock.json.bak ] && mv package-lock.json.bak package-lock.json || true
	cd ../..
fi

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "8.post-create - Adding the plugin to Matterbridge..."
bun run add

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "9.post-create - Checking for outdated packages..."
bun outdated || true

echo $'\033[36m'"[$(date '+%Y-%m-%d %H:%M:%S')]"$'\033[0m' "10.post-create - Post create setup completed!"
