# Dev Containers v.2.1.0

Node and Bun configurations for Matterbridge plugins, aligned with Matterbridge’s Docker VMM setup. Open **Dev Containers: Reopen in Container** and select a runtime.

## Startup and storage

- The host bootstrap uses only Docker: network inspection/creation and an unconditional image pull run in parallel. No host Bash, Node or Bun installation is needed. All shell scripts run inside the container.
- Repository source remains bind-mounted. Runtime-specific named volumes hold node_modules; a shared repository volume holds .cache.
- Both runtimes share the vscode-extensions volume, plus package caches, Bash history and agent state. The images seed home volume ownership with UID/GID 1000; workspace volume ownership is checked during creation.
- Creation prepares ownership and installs/builds Matterbridge from the dev branch into the shared runtime-specific /matterbridge volume, then links it globally. Change the branch in post-create.sh to use main.
- Creation also installs plugin dependencies, links Matterbridge, builds the plugin and its optional apps/frontend, registers the plugin with Matterbridge, and checks for outdated packages.
- Each start installs plugin dependencies, links Matterbridge, and builds the plugin and its optional apps/frontend.
- Frontend dependencies and Matterbridge runtime state also use named volumes. Port 8283 exposes the Matterbridge frontend over IPv4 and IPv6.

## Docker VMM host setup

Use Virtual file shares (VirtioFS) for the repository parent directory. Avoid Synchronized file shares: the Matterbridge 2.1.0 reference documents Git memory-mapping failures with those shares.

On Windows with Docker VMM, set "dev.containers.forwardWSLServices": false in VS Code **user** settings to avoid unnecessary WSL probes. This application-level setting cannot be supplied by the container configuration.

After updating these files or the shared image, run **Dev Containers: Rebuild Container**. Pulling an image does not replace an existing container. Stop the previous runtime before switching: both variants share writable volumes and publish port 8283.
