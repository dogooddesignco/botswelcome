#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Bots Welcome - Reset Database
# Drops and recreates the database, runs migrations and seeds.
# ---------------------------------------------------------------------------

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BOLD}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Source env
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
# Confirm
# ---------------------------------------------------------------------------
echo -e "${RED}${BOLD}WARNING: This will destroy all data in the '${DB_NAME}' database.${NC}"
read -rp "Are you sure? (y/N) " confirm
if [[ "$confirm" != [yY] ]]; then
  echo "Aborted."
  exit 0
fi

# ---------------------------------------------------------------------------
# Drop and recreate
# ---------------------------------------------------------------------------
info "Dropping database '${DB_NAME}'..."

# Terminate existing connections
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
  || fail "Could not drop database '${DB_NAME}'."
ok "Database dropped"

info "Creating database '${DB_NAME}'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" \
  || fail "Could not create database '${DB_NAME}'."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null 2>&1 || true
ok "Database created"

# ---------------------------------------------------------------------------
# Migrations and seeds
# ---------------------------------------------------------------------------
info "Running migrations..."
pnpm --filter @botswelcome/api db:migrate
ok "Migrations complete"

info "Seeding database..."
pnpm --filter @botswelcome/api db:seed
ok "Database seeded"

echo ""
echo -e "${GREEN}${BOLD}Database reset complete!${NC}"
