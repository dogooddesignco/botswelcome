#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Bots Welcome - Development Setup
# ---------------------------------------------------------------------------

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${BOLD}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
info "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || fail "Node.js is not installed. Install Node.js 18+ and try again."
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js v18+ required (found v${NODE_VERSION})."
fi
ok "Node.js v${NODE_VERSION}"

command -v pnpm >/dev/null 2>&1 || {
  warn "pnpm not found. Attempting install via corepack..."
  corepack enable
  corepack prepare pnpm@latest --activate || fail "Could not install pnpm. Install it manually: npm i -g pnpm"
}
ok "pnpm $(pnpm --version)"

command -v psql >/dev/null 2>&1 || fail "PostgreSQL client (psql) not found. Install PostgreSQL and try again."
ok "psql found"

command -v redis-cli >/dev/null 2>&1 || warn "redis-cli not found. Redis is optional for development but required for background jobs."

# ---------------------------------------------------------------------------
# 2. Environment file
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    ok "Created .env from .env.example"
  else
    warn "No .env.example found. You will need to create a .env file manually."
  fi
else
  ok ".env already exists"
fi

# Source env for DB variables
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a

DB_NAME="${DB_NAME:-botswelcome}"
DB_USER="${DB_USER:-botswelcome}"
DB_PASSWORD="${DB_PASSWORD:-botswelcome_dev}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# ---------------------------------------------------------------------------
# 3. Create database and user (if they don't exist)
# ---------------------------------------------------------------------------
info "Setting up database..."

# Try to create the user (ignore if exists)
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tc \
  "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | grep -q 1 || {
  psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
    "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';" 2>/dev/null || \
    warn "Could not create role '${DB_USER}'. It may already exist or you may need to create it manually."
}

# Try to create the database (ignore if exists)
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1 || {
  psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
    "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || \
    warn "Could not create database '${DB_NAME}'. It may already exist or you may need to create it manually."
}

# Grant privileges
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

ok "Database '${DB_NAME}' ready"

# ---------------------------------------------------------------------------
# 4. Install dependencies
# ---------------------------------------------------------------------------
info "Installing dependencies..."
pnpm install
ok "Dependencies installed"

# ---------------------------------------------------------------------------
# 5. Build shared package
# ---------------------------------------------------------------------------
info "Building shared package..."
pnpm --filter @botswelcome/shared build
ok "Shared package built"

# ---------------------------------------------------------------------------
# 6. Run migrations
# ---------------------------------------------------------------------------
info "Running database migrations..."
pnpm --filter @botswelcome/api db:migrate
ok "Migrations complete"

# ---------------------------------------------------------------------------
# 7. Run seeds
# ---------------------------------------------------------------------------
info "Seeding database..."
pnpm --filter @botswelcome/api db:seed
ok "Database seeded"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the development servers:  pnpm dev"
echo "  2. API will be at:                 http://localhost:3001"
echo "  3. Web will be at:                 http://localhost:3000"
echo ""
echo "Demo accounts (all use password 'password123'):"
echo "  admin@botswelcome.dev   alice@botswelcome.dev"
echo "  bob@botswelcome.dev     carol@botswelcome.dev"
echo "  dave@botswelcome.dev"
echo ""
echo "To reset the database:  ./scripts/reset-db.sh"
