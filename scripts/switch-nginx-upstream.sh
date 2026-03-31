#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <legacy|blue|green|5000|5001|5002>"
  exit 1
fi

LEGACY_PORT="${LEGACY_PORT:-5000}"
BLUE_PORT="${BLUE_PORT:-5001}"
GREEN_PORT="${GREEN_PORT:-5002}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/nginx/conf.d/vkurse-upstream.conf}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-sudo nginx -s reload}"

case "$TARGET" in
  legacy|5000) TARGET_PORT="$LEGACY_PORT" ;;
  blue|5001) TARGET_PORT="$BLUE_PORT" ;;
  green|5002) TARGET_PORT="$GREEN_PORT" ;;
  *)
    echo "Unknown target: $TARGET"
    exit 1
    ;;
esac

tmp_file="$(mktemp)"
cat > "$tmp_file" <<EOF
upstream coursenexus_backend {
    server 127.0.0.1:${TARGET_PORT};
    keepalive 64;
}
EOF

sudo install -m 0644 "$tmp_file" "$UPSTREAM_FILE"
rm -f "$tmp_file"
eval "$NGINX_RELOAD_CMD"

echo "Nginx upstream switched to 127.0.0.1:${TARGET_PORT}"
