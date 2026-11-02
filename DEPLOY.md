# EduX — EC2 Deployment

Single-box deploy: **nginx serves the frontend and proxies `/v1` to the backend**, the
backend talks to the remote **RDS Postgres**. One command brings it all up.

```
Internet ─▶ nginx :80 ┬─ /      → SPA (static build)
                      └─ /v1     → api (uvicorn :8000) ─▶ RDS Postgres
                                                       └▶ redis (container)
```

---

## 1. Provision the EC2 instance

- **AMI:** Ubuntu 22.04 (or Amazon Linux 2023). **Size:** t3.small or larger.
- **Security group inbound:**
  - `22` SSH — your IP only
  - `80` HTTP — anywhere
  - `443` HTTPS — anywhere (if you add TLS)
  - Do **NOT** open `8000` or `5432` to the internet.

## 2. Allow EC2 → RDS

In the **RDS security group**, add an inbound rule: **Postgres 5432** from the
**EC2 instance's security group**. Without this the backend cannot start.

## 3. Install Docker (Ubuntu)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

## 4. Get the code

```bash
git clone https://github.com/medixo-ai/EduX.git
cd EduX
git checkout edux_beta_v1
```

## 5. Create the backend env file (on the server)

`backend/.env` is gitignored — create it from the example and set production values:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set at minimum:

```ini
APP_ENV=production
DEBUG=false
SECRET_KEY=<run: openssl rand -hex 32>
API_V1_PREFIX=/v1

# Point at your RDS instance
DATABASE_URL=postgresql+psycopg2://<user>:<pass>@<your-rds-endpoint>:5432/postgres
DB_SCHEMA=edux

# Same-origin frontend served by nginx
CORS_ORIGINS=http://<EC2_PUBLIC_IP>,https://<your-domain>

# External AI paper generation service
AI_PAPER_API_URL=http://18.60.0.133:8000
AI_PAPER_API_TIMEOUT=30

# Set to false once real users exist (true seeds demo data on first boot)
SEED_DEMO_USERS=false
```

> `REDIS_URL` is injected by docker-compose (`redis://redis:6379/0`) and does not
> need to be set here.

## 6. Build and start everything

```bash
docker compose up -d --build
```

First boot: the backend connects to RDS, ensures the `edux` schema, and (if
`SEED_DEMO_USERS=true`) seeds demo data.

## 7. Verify

```bash
# Backend booted?
docker compose logs -f api        # look for "app_started" / "schema_ready", Ctrl-C to exit

# Health through nginx (same as the browser will hit)
curl http://localhost/health
curl http://localhost/v1/health

# From your laptop
curl http://<EC2_PUBLIC_IP>/health
```

Open `http://<EC2_PUBLIC_IP>/` in a browser — the SPA loads and its API calls go to
`/v1` (same origin), proxied to the backend. No CORS, no hardcoded IP in the bundle.

## 8. Everyday operations

```bash
docker compose ps                 # status
docker compose logs -f api        # backend logs
docker compose logs -f frontend   # nginx logs
docker compose restart api        # restart backend only
docker compose down               # stop everything (keeps the redis volume)
```

## 9. Deploying updates

> **IMPORTANT — always `git pull` before rebuilding.** The container runs a
> *built image*, not the files on disk. Pushing to git or running
> `docker compose restart` / rebooting the EC2 box does **not** pick up new
> code — it reuses the old image. New commits only go live after you pull the
> branch **and** rebuild:

```bash
cd EduX
git pull origin edux_beta_v1      # REQUIRED: fetch the latest committed code
git log --oneline -1              # sanity-check you're on the expected commit
docker compose up -d --build      # rebuild changed images and restart
```

Skipping the `git pull` (or only restarting) means the running backend keeps
executing stale code — e.g. an old build with demo seeding still enabled could
repopulate dummy data into the shared RDS on its next boot.

> The frontend bakes `VITE_API_BASE_URL=/v1` at build time (from
> `frontend/.env.production`). Because it's a relative path, you never need to
> rebuild it just because the server IP or domain changes.

## 10. HTTPS (recommended)

Point a domain's **A record** at the EC2 public IP, then either:

- **Simplest:** run Certbot on the host and terminate TLS in a host-level nginx that
  proxies to the container's `:80`, **or**
- **AWS-native:** put an Application Load Balancer in front with an ACM certificate,
  forwarding `:443` → instance `:80`.

After enabling TLS, update `CORS_ORIGINS` in `backend/.env` to the `https://` origin
and `docker compose up -d` to apply.

---

## Notes / gotchas

- **Secrets:** `backend/.env` lives only on the server. Never commit it. For hardening,
  move `SECRET_KEY` and `DATABASE_URL` into AWS SSM Parameter Store / Secrets Manager.
- **Ports:** only `80` (and `443`) are published. `api:8000` and `redis:6379` stay on
  the internal docker network.
- **AI service** at `18.60.0.133:8000` is plain HTTP with no auth — ensure the EC2
  security group allows outbound to it, and lock that service down separately.
- **RDS reachability** is the most common first-boot failure — double-check the RDS SG
  allows the EC2 SG on 5432.
