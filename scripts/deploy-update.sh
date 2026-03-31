#!/usr/bin/env bash
set -euo pipefail

# One-command zero-downtime deploy wrapper.
# Default behavior is rollback-friendly:
# - updates inactive color
# - switches nginx to the new color
# - keeps previous color running

PROJECT_DIR="${PROJECT_DIR:-/home/nexus/CourseNexus_next}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/nginx/conf.d/vkurse-upstream.conf}"
LEGACY_PORT="${LEGACY_PORT:-5000}"
BLUE_PORT="${BLUE_PORT:-5001}"
GREEN_PORT="${GREEN_PORT:-5002}"
NO_GIT_PULL="${NO_GIT_PULL:-0}"
STOP_OLD="${STOP_OLD:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-bluegreen.sh"

if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  echo "ERROR: deploy script not found or not executable: $DEPLOY_SCRIPT"
  exit 1
fi

get_active_target() {
  if [[ -f "$UPSTREAM_FILE" ]]; then
    if grep -q "127.0.0.1:${BLUE_PORT}" "$UPSTREAM_FILE"; then
      echo "blue"
      return
    fi
    if grep -q "127.0.0.1:${GREEN_PORT}" "$UPSTREAM_FILE"; then
      echo "green"
      return
    fi
    if grep -q "127.0.0.1:${LEGACY_PORT}" "$UPSTREAM_FILE"; then
      echo "legacy"
      return
    fi
  fi
  echo "unknown"
}

ACTIVE_BEFORE="$(get_active_target)"
echo "Active target before deploy: ${ACTIVE_BEFORE}"
echo "Project directory: ${PROJECT_DIR}"

if [[ "$NO_GIT_PULL" == "1" ]]; then
  SKIP_GIT_PULL_VALUE="1"
else
  SKIP_GIT_PULL_VALUE="0"
fi

if [[ "$STOP_OLD" == "1" ]]; then
  STOP_OLD_VALUE="1"
else
  STOP_OLD_VALUE="0"
fi

PROJECT_DIR="$PROJECT_DIR" \
COMPOSE_FILE="$COMPOSE_FILE" \
UPSTREAM_FILE="$UPSTREAM_FILE" \
LEGACY_PORT="$LEGACY_PORT" \
BLUE_PORT="$BLUE_PORT" \
GREEN_PORT="$GREEN_PORT" \
SKIP_GIT_PULL="$SKIP_GIT_PULL_VALUE" \
STOP_OLD_AFTER_SWITCH="$STOP_OLD_VALUE" \
SWITCH_NGINX="1" \
"$DEPLOY_SCRIPT"

ACTIVE_AFTER="$(get_active_target)"
echo "Active target after deploy: ${ACTIVE_AFTER}"

if [[ "$ACTIVE_BEFORE" != "unknown" ]]; then
  echo "Rollback target (if needed): ${ACTIVE_BEFORE}"
  echo "Rollback command:"
  echo "  ./scripts/switch-nginx-upstream.sh ${ACTIVE_BEFORE}"
fi

echo "Done."
