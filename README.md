# Sabrinator

Sabrinator is a simple egg counter and event tracker with:
- YOLO-based image inference in a FastAPI backend
- PWA frontend served via Nginx
- JSON-based persistence for users, invites, subscriptions, and egg history

Processed images and logs are stored on disk to keep analysis easy until we migrate to a database.

## Repository Structure
- `backend/` — FastAPI app, YOLO inference, routes and services
- `frontend/` — Vite + React app (built to static `dist/`)
- `nginx/` — Production Nginx config
- `deploy/` — VM-focused compose and Nginx Dockerfile for bundled static
- `maintenance/` — Optional cron-based retention and storage usage jobs
- `DEPLOY.md` — Full production deploy guide (Docker Hub + VM)

## Deployment
For end-to-end instructions (build & push images, VM setup, compose run, troubleshooting), see:

- `DEPLOY.md`

Quick summary:
1. Build/push images to Docker Hub under your user (e.g., `eduardomirandaz`).
2. On the VM, create `/srv/sabrinator/{images,processed,data}` and a `.env` file (use `.env.example` as a template).
3. Run `docker compose` with `deploy/docker-compose.vm.yml` or a minimal compose in `/srv/sabrinator` mapping those volumes.

## Local Run (Production-style)
You can run a local production-like stack using `docker-compose.prod.yml`:
```
# From repo root
docker compose -f docker-compose.prod.yml up -d
curl -sSf http://localhost:8080/healthz
```
This serves the frontend from Nginx on `:8080` and proxies backend on `/api`.

## Environment Variables
Do not commit secrets. Use `.env.example` as a template.

Key variables:
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_PHONE`
- `JWT_SECRET` — backend auth secret
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — web push
- Optional maintenance tuning: `RAW_MAX_IMAGES`, `PROCESSED_MAX_GB`, `STORAGE_CAP_GB`, `STORAGE_WARN_GB`, `RETENTION_MIN_AGE_SEC`

## Data Persistence
The VM mounts host directories into containers:
- `/srv/sabrinator/images` → `/backend/images` (raw uploads)
- `/srv/sabrinator/processed` → `/backend/processed` (processed images + `egg_changes.json`)
- `/srv/sabrinator/data` → `/backend/data` (users, invites, subscriptions)

## Uploading Images
- Via Nginx proxy (recommended): `POST https://<HOST>/api/upload` (multipart `file=@...`)
- Direct to backend (optional): `POST http://<VM_IP>:5473/upload`

Processed images are served at `https://<HOST>/images/<filename>.jpg`.

## Notes
- Nginx upstream expects backend container to be reachable as `esp32_ingestion` (container name or alias). Alternatively, rebuild Nginx to point to `http://ingestion:5473/`.
- Frontend is built with `VITE_BACKEND_URL=/api` so browser calls go through Nginx.