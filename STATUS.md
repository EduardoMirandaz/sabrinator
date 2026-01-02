# Project Status & Recovery Checklist

Date: 2025-12-30

Host: `68.168.222.64` · HTTPS host: `68-168-222-64.sslip.io`
VM runtime path: `/srv/sabrinator`

## Summary
- Goal: PWA over HTTPS with push notifications; frontend should call the backend via `/api` (through Nginx), no `http://localhost:5473` anywhere in production.
- Current issue: All services down on the VM; ports 80/443 are refusing connections. We fixed SSH and can access the VM. Need to bring Nginx up with proper certs and ensure images/tags are pulled.

## Done (Repo & Config)
- [x] Frontend API base defaults to `/api` (`frontend/src/services/api.ts`).
- [x] Runtime guard in frontend to avoid `localhost`/`http` when running on HTTPS/non-localhost.
- [x] Service Worker cache version bumped to invalidate stale assets.
- [x] Docs updated to use HTTPS (`README.md`, `DEPLOY.md`).
- [x] Web Push backend endpoints added and router wired (register/unregister/send-test).
- [x] Backend Dockerfile no longer bakes secrets (use `.env`/compose envs).
- [x] Nginx production image serves static from `frontend/dist` and proxies `/api` to `esp32_ingestion:5473`.
- [x] VM compose example prepared with 443 exposed and certs mounted.
  

## Doing (VM Recovery & Deploy)
- [ ] Confirm provider firewall allows inbound TCP `22, 80, 443`.
- [ ] Ensure VM firewall (`ufw`/nftables) allows `80/443` and SSH `22`.
- [ ] Verify TLS certs exist at `/srv/sabrinator/certs/fullchain.pem` and `/srv/sabrinator/certs/privkey.pem` (sslip.io).
- [ ] Pull Docker Hub images with consistent tags; start services via compose.
- [ ] Verify Nginx logs, test `healthz`, clear SW cache, confirm frontend calls `https://<HOST>/api/...` (no `localhost`).

## Recommended Compose (VM)
Use Docker Hub images with separate tags to avoid missing images:

```yaml
version: "3.9"
services:
  ingestion:
    image: eduardomirandaz/sabrinator-backend:${BACKEND_VERSION}
    container_name: esp32_ingestion
    environment:
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ADMIN_NAME=${ADMIN_NAME}
      - ADMIN_PHONE=${ADMIN_PHONE}
      - JWT_SECRET=${JWT_SECRET}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_EMAIL=${VAPID_EMAIL}
    volumes:
      - /srv/sabrinator/images:/backend/images
      - /srv/sabrinator/processed:/backend/processed
      - /srv/sabrinator/data:/backend/data
    ports:
      - "5473:5473"
    restart: unless-stopped

  nginx:
    image: eduardomirandaz/sabrinator-nginx:${NGINX_VERSION}
    container_name: sabrinator_proxy
    depends_on:
      - ingestion
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /srv/sabrinator/certs:/etc/nginx/certs:ro
    restart: unless-stopped

  maintenance:
    image: eduardomirandaz/sabrinator-maintenance:${MAINT_VERSION}
    container_name: sabrinator_maintenance
    depends_on:
      - ingestion
    environment:
      - RAW_MAX_IMAGES=${RAW_MAX_IMAGES:-100}
      - PROCESSED_MAX_GB=${PROCESSED_MAX_GB:-150}
      - STORAGE_CAP_GB=${STORAGE_CAP_GB:-200}
      - STORAGE_WARN_GB=${STORAGE_WARN_GB:-180}
      - RETENTION_MIN_AGE_SEC=${RETENTION_MIN_AGE_SEC:-30}
      - RAW_DIR=/backend/images
      - PROCESSED_DIR=/backend/processed
      - DATA_DIR=/backend/data
      - LOG_DIR=/backend/data
    volumes:
      - /srv/sabrinator/images:/backend/images
      - /srv/sabrinator/processed:/backend/processed
      - /srv/sabrinator/data:/backend/data
      - /srv/sabrinator/crontab/crontab:/crontab:ro
    restart: unless-stopped
```

`.env` entries (VM):
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
ADMIN_NAME=Admin
ADMIN_PHONE=+55 11 99999-9999
JWT_SECRET=changemejwt
VAPID_PUBLIC_KEY=REPLACE_ME
VAPID_PRIVATE_KEY=REPLACE_ME
VAPID_EMAIL=mailto:you@example.com
NGINX_VERSION=v1.0.4
BACKEND_VERSION=v1.0.1
MAINT_VERSION=v1.0.1
```

## TLS (sslip.io)
If certs are missing:
```bash
docker compose -f docker-compose.yml --env-file .env stop nginx
apt-get update && apt-get install -y certbot
certbot certonly --standalone -d 68-168-222-64.sslip.io --agree-tos -m you@example.com --non-interactive
cp /etc/letsencrypt/live/68-168-222-64.sslip.io/fullchain.pem /srv/sabrinator/certs/
cp /etc/letsencrypt/live/68-168-222-64.sslip.io/privkey.pem   /srv/sabrinator/certs/
docker compose -f docker-compose.yml --env-file .env up -d nginx
```

## Recovery Commands (VM)
```bash
# Pull and start services
cd /srv/sabrinator
docker compose -f docker-compose.yml --env-file .env pull
docker compose -f docker-compose.yml --env-file .env up -d

# Check listeners and logs
ss -tulpen | egrep ':80|:443|:5473' || true
docker ps
docker logs sabrinator_proxy --tail=200

# Health checks
curl -sSf http://68.168.222.64/healthz || true
curl -vk https://68-168-222-64.sslip.io/healthz || true
```

## Client-side Refresh
- Clear service worker/cache (DevTools → Application → Clear storage → Clear site data) and reload.
- Confirm Network calls use `https://68-168-222-64.sslip.io/api/...` for `/auth/login`, `/admin/invites`, `/eggs/history`.

## Notes
- Frontend defaults to `/api` and includes a runtime guard to avoid `localhost` under HTTPS.
- If Docker Hub pull fails for backend/maintenance at `v1.0.4`, use the last working tag (e.g., `v1.0.1`) and only bump Nginx to `v1.0.4`.
- Provider and VM firewalls must both allow inbound `22, 80, 443`.
