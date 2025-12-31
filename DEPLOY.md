# Production Deploy (Docker Hub + VM)

This project ships as three containers:
- Backend API: `sabrinator-backend`
- Nginx + Frontend static: `sabrinator-nginx`
- (Optional) Maintenance jobs: `sabrinator-maintenance`

Runtime data is persisted on the VM under `/srv/sabrinator/{images,processed,data}`.

## 1) Prerequisites
- Docker Engine + Compose v2 on your machine (for building/pushing) and on the VM (for running)
- Docker Hub account (replace `HUB_USER` everywhere; default in this repo is `eduardomirandaz`)

Install Docker + Compose on Ubuntu 24.04 (VM):
```
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

## 2) Build and Push Images (Local)

Set variables:
```
export HUB_USER="eduardomirandaz"
export VERSION="v1.0.1"
docker login -u "$HUB_USER"
```

Backend:
```
docker buildx create --name sabrinator-builder --use || docker buildx use sabrinator-builder
docker buildx inspect --bootstrap
docker buildx build --platform linux/amd64 \
  -t $HUB_USER/sabrinator-backend:$VERSION \
  -f backend/Dockerfile backend \
  --push
```

Frontend dist + Nginx (bundles `frontend/dist` and `nginx/nginx.prod.conf`):
```
docker run --rm -v "$PWD/frontend":/frontend -w /frontend node:22-alpine \
  sh -c "npm ci && VITE_BACKEND_URL=/api npm run build"

docker buildx build --platform linux/amd64 \
  -t $HUB_USER/sabrinator-nginx:$VERSION \
  -f deploy/nginx/Dockerfile . \
  --push
```

Optional Maintenance:
```
docker buildx build --platform linux/amd64 \
  -t $HUB_USER/sabrinator-maintenance:$VERSION \
  -f maintenance/Dockerfile maintenance \
  --push
```

## 3) Prepare the VM

Create runtime directories (persisted data):
```
sudo mkdir -p /srv/sabrinator/{images,processed,data}
```

Create a `.env` on the VM (do NOT commit secrets). Use `.env.example` as a template:
```
cp .env.example /srv/sabrinator/.env
nano /srv/sabrinator/.env
```

## 4) Run on the VM

Use the provided compose file `deploy/docker-compose.vm.yml` or write a minimal one in `/srv/sabrinator`. The provided file pins tags and maps volumes. It assumes:
- Backend service container name is `esp32_ingestion` (to match nginx upstream).

Run:
```
export VERSION="v1.0.1"
docker compose -f deploy/docker-compose.vm.yml --env-file /srv/sabrinator/.env up -d
```

Or if you copied a minimal compose to `/srv/sabrinator/docker-compose.yml`:
```
cd /srv/sabrinator
docker compose --env-file .env up -d
```

Verify:
```
curl -sSf https://<HOST>/healthz
curl -sSf http://<VM_IP>:5473/docs | head -n 3
```

## 4.1) Enable HTTPS via sslip.io (Let’s Encrypt)

Use a free hostname that resolves to your IP (no purchase required): `68-168-222-64.sslip.io`.

Steps on the VM:
```
# Stop nginx temporarily for standalone HTTP-01 challenge
docker compose -f deploy/docker-compose.vm.yml --env-file /srv/sabrinator/.env stop nginx

# Install certbot
sudo apt-get update && sudo apt-get install -y certbot

# Issue certificate for hostname (replace if you use nip.io)
sudo certbot certonly --standalone -d 68-168-222-64.sslip.io --agree-tos -m you@example.com --non-interactive

# Copy certs to mount point for the nginx container
sudo mkdir -p /srv/sabrinator/certs
sudo cp /etc/letsencrypt/live/68-168-222-64.sslip.io/fullchain.pem /srv/sabrinator/certs/
sudo cp /etc/letsencrypt/live/68-168-222-64.sslip.io/privkey.pem   /srv/sabrinator/certs/

# Start stack with HTTPS (compose already maps 443 and mounts certs)
docker compose -f deploy/docker-compose.vm.yml --env-file /srv/sabrinator/.env up -d nginx
```

Verify HTTPS:
```
curl -sSf https://68-168-222-64.sslip.io/healthz
```

Note: Renewal can be automated via a cron calling certbot with `--standalone` and re-copying into `/srv/sabrinator/certs`, then restarting nginx.

## 5) Uploading Images

Via nginx proxy (recommended):
```
curl -X POST https://<HOST>/api/upload -F "file=@/path/to/image.jpg"
```

Processed images: `/srv/sabrinator/processed` on the VM and served at `https://<HOST>/images/<filename>.jpg`.

## 6) Frontend Auth

- Log in at `https://<HOST>/login` using the admin creds from `.env`.
- The frontend hits the API at `/api` (baked via `VITE_BACKEND_URL=/api`).

## 6.1) Push Notifications (VAPID)

Set in `/srv/sabrinator/.env` and keep frontend `VITE_VAPID_PUBLIC_KEY` in sync:
```
VAPID_PUBLIC_KEY=...  # base64 URL-encoded public key
VAPID_PRIVATE_KEY=... # corresponding private key
VAPID_EMAIL=mailto:admin@example.com
```

Endpoints exposed:
- `POST /api/notifications/register-push-subscription`
- `DELETE /api/notifications/unregister-push-subscription`
- `POST /api/notifications/send-test`  (admin-only; sends to all subscriptions)

After HTTPS is live, test on mobile at `https://68-168-222-64.sslip.io/` by enabling notifications in Settings/Home and sending a test push.

## 7) Upgrades

- Rebuild/push new images with a new `VERSION` tag.
- Update the VM compose file tags or set `VERSION` env and restart:
```
docker compose -f deploy/docker-compose.vm.yml --env-file /srv/sabrinator/.env pull
docker compose -f deploy/docker-compose.vm.yml --env-file /srv/sabrinator/.env up -d
```

## 8) Troubleshooting

- Nginx restarting due to `host not found in upstream "esp32_ingestion"`:
  - Ensure the backend service container is named `esp32_ingestion` (compose sets `container_name`), or rebuild the nginx image to point to `http://ingestion:5473/`.
- 404 on `/healthz` at `:5473`: backend doesn’t expose it; use `/docs` or `/eggs/*` endpoints. Nginx exposes `/healthz`.
- Invalid image reference format: ensure image tag doesn’t contain spaces; prefer fixed tags like `v1.0.1`.

## 9) Security and Secrets

- Do not commit `.env` files. This repo ignores `.env` by default.
- Provide secrets (JWT, VAPID keys) only via environment files or secret managers.
- Data folders are host-mounted and persist on the VM for analysis.
