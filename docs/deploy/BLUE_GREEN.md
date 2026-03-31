# Blue/Green Deploy (parallel + soft cutover)

## What is included

- `docker-compose.prod.yml`:
  - `app_blue` on `127.0.0.1:5001`
  - `app_green` on `127.0.0.1:5002`
  - подключение к уже существующей docker-сети и текущей БД
- `scripts/deploy-bluegreen.sh`:
  - `git pull --ff-only`
  - build/start inactive color
  - wait for container health
  - optional switch nginx upstream (`SWITCH_NGINX=0|1`)
  - optional stop old color
- `scripts/switch-nginx-upstream.sh`:
  - manual switch/rollback: `legacy|blue|green`
- `server/index.ts`:
  - `/healthz` endpoint for health checks
- `.github/workflows/deploy.yml`:
  - optional CI trigger via SSH

## One command deploy (normal)

```bash
cd /home/nexus/CourseNexus && ./scripts/deploy-bluegreen.sh
```

## Migration with current production in parallel (recommended)

Goal: keep current app on `:5000` serving users, run new app in parallel on `:5001/:5002`, then switch traffic softly.

1. **Start blue without switching traffic**
```bash
cd /home/nexus/CourseNexus
SWITCH_NGINX=0 STOP_OLD_AFTER_SWITCH=0 ./scripts/deploy-bluegreen.sh
```

2. **Smoke check new app internally**
```bash
curl -fsS http://127.0.0.1:5001/healthz
```

3. **Soft cutover to blue**
```bash
./scripts/switch-nginx-upstream.sh blue
```

4. **Rollback if needed (seconds)**
```bash
./scripts/switch-nginx-upstream.sh legacy
```

After stable period, legacy container on `:5000` can be stopped manually.

## Required nginx layout

1. Main site config must proxy to upstream `coursenexus_backend`.
2. Upstream must be in separate file:
   - `/etc/nginx/conf.d/vkurse-upstream.conf`
3. For migration, initial upstream should point to legacy `5000`.
4. Deploy/switch scripts rewrite this file to `5001/5002` and run nginx reload.

Use `docs/deploy/nginx-vkurse-bluegreen.conf` as a reference for the vhost config.

## Required sudoers (non-interactive deploy)

`deploy-bluegreen.sh` uses:

- `sudo install -m 0644 ... /etc/nginx/conf.d/vkurse-upstream.conf`
- `sudo nginx -s reload`

For passwordless deploy, allow only these commands for deploy user in sudoers.

## Notes

- Keep DB migrations backward-compatible to avoid app/db version mismatch during switch.
- `docker-compose.prod.yml` expects external network `${EXISTING_DOCKER_NETWORK}` (default `coursenexus_default`).
- If you do not want CI auto-deploy, remove `.github/workflows/deploy.yml` and use manual SSH command.
