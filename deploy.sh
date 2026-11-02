#!/usr/bin/env bash
# ============================================================================
#  EduX — One-Command Production Deploy (EC2)
# ============================================================================
#  Usage:
#    ./deploy.sh              Pull latest code, rebuild & restart both services
#    ./deploy.sh --no-pull    Skip git pull (rebuild from current working tree)
#    ./deploy.sh --backend    Rebuild & restart backend only
#    ./deploy.sh --frontend   Rebuild & restart frontend only
#    ./deploy.sh --status     Show current container status & health
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
BRANCH="edux_beta_v1"
COMPOSE_FILE="docker-compose.yml"
HEALTH_URL="http://localhost/health"
API_HEALTH_URL="http://localhost/health"
HEALTH_TIMEOUT=60        # seconds to wait for health check
HEALTH_INTERVAL=3        # seconds between health pings

# ── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

# ── Helpers ────────────────────────────────────────────────────────────────
log()   { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn ]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL!]${NC} $*"; exit 1; }

# ── Navigate to project root (same dir as this script) ─────────────────────
cd "$(dirname "$(readlink -f "$0")")"

# ── Parse arguments ────────────────────────────────────────────────────────
DO_PULL=true
SERVICE=""

for arg in "$@"; do
    case "$arg" in
        --no-pull)   DO_PULL=false ;;
        --backend)   SERVICE="api" ;;
        --frontend)  SERVICE="frontend" ;;
        --status)
            echo ""
            echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
            echo -e "${BOLD}  EduX Container Status${NC}"
            echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
            docker compose -f "$COMPOSE_FILE" ps
            echo ""
            echo -e "${BOLD}  Recent Logs (last 5 lines per service):${NC}"
            echo -e "${BOLD}────────────────────────────────────────────────────────────${NC}"
            docker compose -f "$COMPOSE_FILE" logs --tail=5
            echo ""
            exit 0
            ;;
        --help|-h)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (none)       Pull latest code, rebuild & restart all services"
            echo "  --no-pull    Skip git pull, rebuild from current working tree"
            echo "  --backend    Rebuild & restart backend (api) only"
            echo "  --frontend   Rebuild & restart frontend (nginx) only"
            echo "  --status     Show current container status and recent logs"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            fail "Unknown option: $arg (use --help for usage)"
            ;;
    esac
done

# ── Pre-flight checks ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  EduX Production Deploy${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo ""

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not installed."

if [ ! -f "$COMPOSE_FILE" ]; then
    fail "docker-compose.yml not found in $(pwd). Are you in the project root?"
fi

if [ ! -f "backend/.env" ]; then
    warn "backend/.env is missing! The API container may fail to start."
    warn "Copy backend/.env.example to backend/.env and fill in production values."
fi

# ── Step 1: Git Pull ──────────────────────────────────────────────────────
if [ "$DO_PULL" = true ]; then
    log "Pulling latest code from origin/${BRANCH}..."

    # Stash any local changes to avoid merge conflicts
    if ! git diff --quiet 2>/dev/null; then
        warn "Unstaged local changes detected. Stashing them..."
        git stash push -m "deploy-autostash-$(date +%Y%m%d-%H%M%S)"
    fi

    git pull origin "$BRANCH" || fail "git pull failed. Resolve conflicts and retry."
    COMMIT=$(git log --oneline -1)
    ok "Now at: ${COMMIT}"
else
    warn "Skipping git pull (--no-pull). Building from current working tree."
    COMMIT=$(git log --oneline -1 2>/dev/null || echo "unknown")
fi

echo ""

# ── Step 2: Show what's currently running ──────────────────────────────────
log "Current container state:"
docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || true
echo ""

# ── Step 3: Build & Restart ───────────────────────────────────────────────
if [ -n "$SERVICE" ]; then
    log "Rebuilding and restarting service: ${SERVICE}..."
    docker compose -f "$COMPOSE_FILE" up -d --build "$SERVICE"
else
    log "Rebuilding and restarting ALL services..."
    docker compose -f "$COMPOSE_FILE" up -d --build
fi

ok "Containers launched."
echo ""

# ── Step 4: Wait for Health ───────────────────────────────────────────────
log "Waiting for services to become healthy (timeout: ${HEALTH_TIMEOUT}s)..."

elapsed=0
backend_healthy=false
frontend_healthy=false

while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
    # Check backend health via nginx proxy
    if [ "$frontend_healthy" = false ]; then
        if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
            frontend_healthy=true
            ok "Frontend (nginx) is responding."
        fi
    fi

    if [ "$backend_healthy" = false ]; then
        if curl -sf "$API_HEALTH_URL" >/dev/null 2>&1; then
            backend_healthy=true
            ok "Backend API is healthy."
        fi
    fi

    if [ "$frontend_healthy" = true ] && [ "$backend_healthy" = true ]; then
        break
    fi

    sleep $HEALTH_INTERVAL
    elapsed=$((elapsed + HEALTH_INTERVAL))
    printf "  ⏳ %ds / %ds ...\r" "$elapsed" "$HEALTH_TIMEOUT"
done

echo ""

# ── Step 5: Final Report ──────────────────────────────────────────────────
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Deploy Complete${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"

if [ "$frontend_healthy" = true ] && [ "$backend_healthy" = true ]; then
    echo -e "  Status:     ${GREEN}✔ All services healthy${NC}"
else
    [ "$frontend_healthy" = false ] && echo -e "  Frontend:   ${RED}✘ Not responding${NC}"
    [ "$backend_healthy" = false ]  && echo -e "  Backend:    ${RED}✘ Not responding${NC}"
    echo ""
    warn "Some services are not healthy yet. Check logs:"
    echo "    docker compose logs -f api"
    echo "    docker compose logs -f frontend"
fi

echo -e "  Commit:     ${COMMIT}"
echo -e "  Frontend:   http://localhost"
echo -e "  API Docs:   http://localhost/docs"
echo -e "  API Health: http://localhost/v1/health"
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo ""
