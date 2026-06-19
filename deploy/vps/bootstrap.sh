#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/suhconcept"
APP_DIR="$APP_ROOT/app"
REPO_URL="https://github.com/calebesaraiva/suhconcept.git"
SITE_NAME="suhconcept.com"

mkdir -p "$APP_ROOT"

if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git checkout main
git reset --hard origin/main

chmod +x deploy/vps/deploy.sh deploy/vps/sync.sh

docker compose -f docker-compose.prod.yml up -d --build

cp deploy/vps/suhconcept-auto-deploy.service /etc/systemd/system/suhconcept-auto-deploy.service
cp deploy/vps/suhconcept-auto-deploy.timer /etc/systemd/system/suhconcept-auto-deploy.timer
systemctl daemon-reload
systemctl enable --now suhconcept-auto-deploy.timer

systemctl stop nginx || true
certbot certonly --standalone -d suhconcept.com -d www.suhconcept.com --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring

cp deploy/nginx/suhconcept.com.conf /etc/nginx/sites-available/$SITE_NAME
ln -sfn /etc/nginx/sites-available/$SITE_NAME /etc/nginx/sites-enabled/$SITE_NAME

nginx -t
systemctl start nginx
systemctl reload nginx
systemctl enable nginx

systemctl restart suhconcept-auto-deploy.timer
docker compose -f docker-compose.prod.yml ps
