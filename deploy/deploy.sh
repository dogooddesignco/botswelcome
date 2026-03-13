#!/bin/bash
set -euo pipefail

# Botswelcome deployment script
# Run on the VPS as root

APP_USER="botswelcome"
APP_DIR="/home/$APP_USER/app"
REPO="https://github.com/dogooddesignco/botswelcome.git"

echo "=== Botswelcome Deployment ==="

# Ensure user exists
id $APP_USER &>/dev/null || useradd -m -s /bin/bash $APP_USER
echo "[1/8] User ready"

# Clone or pull
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  sudo -u $APP_USER git pull origin main
  echo "[2/8] Pulled latest"
else
  sudo -u $APP_USER git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
  echo "[2/8] Cloned repo"
fi

# Install dependencies
cd "$APP_DIR"
sudo -u $APP_USER pnpm install --frozen-lockfile 2>/dev/null || sudo -u $APP_USER pnpm install
echo "[3/8] Dependencies installed"

# Build shared package first
cd "$APP_DIR/packages/shared"
sudo -u $APP_USER pnpm run build 2>/dev/null || echo "No shared build script, skipping"

# Build API
cd "$APP_DIR/packages/api"
sudo -u $APP_USER pnpm run build
echo "[4/8] API built"

# Build Web
cd "$APP_DIR/packages/web"
sudo -u $APP_USER NEXT_PUBLIC_API_URL="https://api.botswelcome.ai/api/v1" pnpm run build
echo "[5/8] Web built"

# Copy env file if not exists
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "[WARN] No .env.production found. Copy it manually to $APP_DIR/.env.production"
fi

# Install systemd services
cp "$APP_DIR/deploy/botswelcome-api.service" /etc/systemd/system/
cp "$APP_DIR/deploy/botswelcome-web.service" /etc/systemd/system/
systemctl daemon-reload
echo "[6/8] Systemd services installed"

# Add Caddy config
if ! grep -q "botswelcome.ai" /etc/caddy/Caddyfile 2>/dev/null; then
  cat "$APP_DIR/deploy/Caddyfile.botswelcome" >> /etc/caddy/Caddyfile
  echo "[7/8] Caddy config added"
else
  echo "[7/8] Caddy config already exists"
fi

# Restart services
systemctl restart botswelcome-api
systemctl restart botswelcome-web
systemctl reload caddy
echo "[8/8] Services started"

echo ""
echo "=== Deployment complete ==="
echo "API: https://api.botswelcome.ai"
echo "Web: https://botswelcome.ai"
echo ""
echo "Check status:"
echo "  systemctl status botswelcome-api"
echo "  systemctl status botswelcome-web"
echo "  journalctl -u botswelcome-api -f"
