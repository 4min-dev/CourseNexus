#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/nexus/CourseNexus}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
LEGACY_PORT="${LEGACY_PORT:-5000}"
BLUE_PORT="${BLUE_PORT:-5001}"
GREEN_PORT="${GREEN_PORT:-5002}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/nginx/conf.d/vkurse-upstream.conf}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-sudo nginx -s reload}"
MAX_HEALTH_ATTEMPTS="${MAX_HEALTH_ATTEMPTS:-30}"
HEALTH_RETRY_SLEEP_SEC="${HEALTH_RETRY_SLEEP_SEC:-2}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"
STOP_OLD_AFTER_SWITCH="${STOP_OLD_AFTER_SWITCH:-1}"
SWITCH_NGINX="${SWITCH_NGINX:-1}"

cd "$PROJECT_DIR"

if [[ "$SKIP_GIT_PULL" != "1" ]]; then
  git pull --ff-only
fi

get_active_color() {
  if [[ -f "$UPSTREAM_FILE" ]]; then
    if grep -q "127.0.0.1:${LEGACY_PORT}" "$UPSTREAM_FILE"; then
      echo "legacy"
      return
    fi
    if grep -q "127.0.0.1:${BLUE_PORT}" "$UPSTREAM_FILE"; then
      echo "blue"
      return
    fi
    if grep -q "127.0.0.1:${GREEN_PORT}" "$UPSTREAM_FILE"; then
      echo "green"
      return
    fi
  fi
  if curl -fsS "http://127.0.0.1:${LEGACY_PORT}${HEALTH_PATH}" >/dev/null 2>&1; then
    echo "legacy"
    return
  fi
  echo "unknown"
}

wait_for_healthy() {
  local container_name="$1"
  local attempt=1

  while (( attempt <= MAX_HEALTH_ATTEMPTS )); do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$container_name" 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      echo "Container $container_name is healthy"
      return 0
    fi

    echo "Waiting for $container_name health... attempt $attempt/$MAX_HEALTH_ATTEMPTS (status=$status)"
    sleep "$HEALTH_RETRY_SLEEP_SEC"
    ((attempt++))
  done

  echo "ERROR: container $container_name did not become healthy in time"
  docker logs --tail 120 "$container_name" || true
  return 1
}

write_upstream() {
  local target_port="$1"
  local tmp_file
  tmp_file="$(mktemp)"

  cat > "$tmp_file" <<EOF
upstream coursenexus_backend {
    server 127.0.0.1:${target_port};
    keepalive 64;
}
EOF

  sudo install -m 0644 "$tmp_file" "$UPSTREAM_FILE"
  rm -f "$tmp_file"
}

ACTIVE_COLOR="$(get_active_color)"
if [[ "$ACTIVE_COLOR" == "blue" ]]; then
  INACTIVE_COLOR="green"
  TARGET_PORT="$GREEN_PORT"
elif [[ "$ACTIVE_COLOR" == "green" ]]; then
  INACTIVE_COLOR="blue"
  TARGET_PORT="$BLUE_PORT"
else
  INACTIVE_COLOR="blue"
  TARGET_PORT="$BLUE_PORT"
fi

TARGET_SERVICE="app_${INACTIVE_COLOR}"
TARGET_CONTAINER="coursenexus_app_${INACTIVE_COLOR}"

echo "Active color: $ACTIVE_COLOR"
echo "Deploying to: $INACTIVE_COLOR ($TARGET_SERVICE -> 127.0.0.1:$TARGET_PORT)"

docker compose -f "$COMPOSE_FILE" build "$TARGET_SERVICE"
docker compose -f "$COMPOSE_FILE" up -d "$TARGET_SERVICE"

wait_for_healthy "$TARGET_CONTAINER"

# Extra HTTP probe through published local port before switching nginx.
curl -fsS "http://127.0.0.1:${TARGET_PORT}${HEALTH_PATH}" >/dev/null

if [[ "$SWITCH_NGINX" == "1" ]]; then
  write_upstream "$TARGET_PORT"
  eval "$NGINX_RELOAD_CMD"
  echo "Switched nginx upstream to $INACTIVE_COLOR ($TARGET_PORT)"
else
  echo "SWITCH_NGINX=0 -> skipped nginx switch"
fi

if [[ "$SWITCH_NGINX" == "1" && "$STOP_OLD_AFTER_SWITCH" == "1" ]]; then
  if [[ "$ACTIVE_COLOR" == "blue" || "$ACTIVE_COLOR" == "green" ]]; then
    OLD_SERVICE="app_${ACTIVE_COLOR}"
    echo "Stopping old service: $OLD_SERVICE"
    docker compose -f "$COMPOSE_FILE" stop "$OLD_SERVICE" || true
  fi
fi

echo "Deployment completed successfully."
